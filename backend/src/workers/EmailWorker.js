/**
 * EMAIL WORKER - Procesamiento Asíncrono de Cola de Emails
 *
 * Responsabilidades:
 * - Procesa emails en cola (status='queued')
 * - Envía emails usando configuraciones SMTP
 * - Actualiza estados (sent, failed, bounced)
 * - Implementa retry logic con backoff exponencial
 * - Respeta límites diarios/mensuales por empresa
 * - Logging completo y métricas
 *
 * @version 1.0.0
 * @date 2025-10-28
 */

const nodemailer = require('nodemailer');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

class EmailWorker {
    constructor() {
        this.isRunning = false;
        this.processInterval = 5000; // 5 segundos
        this.batchSize = 10; // Procesar 10 emails por batch
        this.maxRetries = 3;
        this.retryDelays = [60000, 300000, 900000]; // 1min, 5min, 15min
        this.transportCache = new Map(); // Cache de transporters SMTP

        console.log('📧 [EmailWorker] Inicializado');
    }

    /**
     * Iniciar el worker
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️  [EmailWorker] Ya está corriendo');
            return;
        }

        this.isRunning = true;
        console.log('🚀 [EmailWorker] Iniciando procesamiento de cola...');
        this._processLoop();
    }

    /**
     * Detener el worker
     */
    stop() {
        this.isRunning = false;
        console.log('🛑 [EmailWorker] Deteniendo procesamiento...');
    }

    /**
     * Loop principal de procesamiento
     */
    async _processLoop() {
        while (this.isRunning) {
            try {
                await this._processBatch();
            } catch (error) {
                console.error('❌ [EmailWorker] Error en batch:', error.message);
            }

            // Esperar antes del siguiente batch
            await this._sleep(this.processInterval);
        }
    }

    /**
     * Procesar un batch de emails
     */
    async _processBatch() {
        const transaction = await sequelize.transaction();

        try {
            // 1. Obtener emails pendientes (LOCK para evitar procesamiento duplicado)
            const [emails] = await sequelize.query(`
                SELECT
                    eq.id,
                    eq.sender_id,
                    eq.sender_type,
                    eq.recipient_email,
                    eq.recipient_name,
                    eq.subject,
                    eq.body_html,
                    eq.body_text,
                    eq.attachments,
                    eq.priority,
                    eq.retry_count,
                    eq.metadata,
                    eq.notification_id,
                    -- Config SMTP
                    CASE
                        WHEN eq.sender_type = 'aponnt' THEN (
                            SELECT row_to_json(aec) FROM aponnt_email_config aec
                            WHERE aec.is_active = true LIMIT 1
                        )
                        WHEN eq.sender_type = 'company' THEN (
                            SELECT row_to_json(ec) FROM email_configurations ec
                            WHERE ec.company_id = eq.sender_id::INTEGER
                            AND ec.is_active = true AND ec.is_verified = true
                            LIMIT 1
                        )
                    END as smtp_config
                FROM email_queue eq
                WHERE eq.status = 'queued'
                AND (eq.scheduled_at IS NULL OR eq.scheduled_at <= NOW())
                ORDER BY
                    CASE eq.priority
                        WHEN 'high' THEN 1
                        WHEN 'normal' THEN 2
                        WHEN 'low' THEN 3
                    END,
                    eq.created_at ASC
                LIMIT $1
                FOR UPDATE SKIP LOCKED
            `, {
                bind: [this.batchSize],
                transaction
            });

            if (emails.length === 0) {
                await transaction.commit();
                return;
            }

            console.log(`📬 [EmailWorker] Procesando ${emails.length} emails...`);

            // 2. Procesar cada email
            for (const email of emails) {
                try {
                    await this._processEmail(email, transaction);
                } catch (error) {
                    console.error(`❌ [EmailWorker] Error procesando email ${email.id}:`, error.message);
                    await this._handleEmailError(email, error, transaction);
                }
            }

            await transaction.commit();

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Procesar un email individual
     */
    async _processEmail(email, transaction) {
        // 1. Verificar que tenga config SMTP
        if (!email.smtp_config) {
            throw new Error('No hay configuración SMTP disponible');
        }

        const config = email.smtp_config;

        // 2. Verificar límites (solo para empresas)
        if (email.sender_type === 'company') {
            const canSend = await this._checkLimits(email.sender_id, transaction);
            if (!canSend) {
                throw new Error('Límite diario/mensual excedido');
            }
        }

        // 3. Obtener o crear transporter
        const transporter = await this._getTransporter(config);

        // 4. Preparar email
        const mailOptions = {
            from: `"${config.display_name || config.from_name}" <${config.from_email || config.institutional_email}>`,
            to: email.recipient_name
                ? `"${email.recipient_name}" <${email.recipient_email}>`
                : email.recipient_email,
            subject: email.subject,
            html: email.body_html,
            text: email.body_text,
            attachments: email.attachments ? JSON.parse(email.attachments) : []
        };

        // 5. Enviar
        console.log(`📤 [EmailWorker] Enviando email a ${email.recipient_email}...`);
        const info = await transporter.sendMail(mailOptions);

        // 6. Actualizar estado
        await sequelize.query(`
            UPDATE email_queue
            SET status = 'sent',
                sent_at = NOW(),
                smtp_message_id = $1,
                metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
            WHERE id = $3
        `, {
            bind: [
                info.messageId,
                JSON.stringify({ response: info.response }),
                email.id
            ],
            transaction
        });

        // 7. Registrar en email_logs
        await sequelize.query(`
            INSERT INTO email_logs (
                sender_id, sender_type, recipient_email, recipient_name,
                subject, status, sent_at, smtp_message_id,
                notification_id, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, 'sent', NOW(), $6, $7, $8, NOW())
        `, {
            bind: [
                email.sender_id,
                email.sender_type,
                email.recipient_email,
                email.recipient_name,
                email.subject,
                info.messageId,
                email.notification_id,
                JSON.stringify({ queue_id: email.id })
            ],
            transaction
        });

        // 8. Incrementar contadores (solo empresas)
        if (email.sender_type === 'company') {
            await sequelize.query(`
                UPDATE email_configurations
                SET emails_sent_today = emails_sent_today + 1,
                    emails_sent_month = emails_sent_month + 1,
                    last_email_sent_at = NOW()
                WHERE company_id = $1
            `, {
                bind: [email.sender_id],
                transaction
            });
        }

        console.log(`✅ [EmailWorker] Email ${email.id} enviado exitosamente`);
    }

    /**
     * Manejar error en envío de email
     */
    async _handleEmailError(email, error, transaction) {
        const retryCount = email.retry_count + 1;
        const maxRetries = this.maxRetries;

        // Si aún hay intentos disponibles, reprogramar
        if (retryCount < maxRetries) {
            const delayMs = this.retryDelays[retryCount - 1] || 900000; // default 15min
            const scheduledAt = new Date(Date.now() + delayMs);

            await sequelize.query(`
                UPDATE email_queue
                SET status = 'queued',
                    retry_count = $1,
                    last_error = $2,
                    scheduled_at = $3,
                    metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
                WHERE id = $5
            `, {
                bind: [
                    retryCount,
                    error.message,
                    scheduledAt,
                    JSON.stringify({
                        retry_scheduled_at: scheduledAt.toISOString(),
                        error_at: new Date().toISOString()
                    }),
                    email.id
                ],
                transaction
            });

            console.log(`🔄 [EmailWorker] Email ${email.id} reprogramado (intento ${retryCount}/${maxRetries})`);

        } else {
            // Máximo de intentos alcanzado, marcar como failed
            await sequelize.query(`
                UPDATE email_queue
                SET status = 'failed',
                    last_error = $1,
                    failed_at = NOW()
                WHERE id = $2
            `, {
                bind: [error.message, email.id],
                transaction
            });

            // Registrar en email_logs
            await sequelize.query(`
                INSERT INTO email_logs (
                    sender_id, sender_type, recipient_email, recipient_name,
                    subject, status, error_message, notification_id,
                    metadata, created_at
                ) VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7, $8, NOW())
            `, {
                bind: [
                    email.sender_id,
                    email.sender_type,
                    email.recipient_email,
                    email.recipient_name,
                    email.subject,
                    error.message,
                    email.notification_id,
                    JSON.stringify({ queue_id: email.id, retries: retryCount })
                ],
                transaction
            });

            console.log(`❌ [EmailWorker] Email ${email.id} marcado como failed después de ${retryCount} intentos`);
        }
    }

    /**
     * Verificar límites de envío
     */
    async _checkLimits(companyId, transaction) {
        const [result] = await sequelize.query(`
            SELECT
                emails_sent_today,
                daily_limit,
                emails_sent_month,
                monthly_limit
            FROM email_configurations
            WHERE company_id = $1
        `, {
            bind: [companyId],
            transaction
        });

        if (result.length === 0) return false;

        const { emails_sent_today, daily_limit, emails_sent_month, monthly_limit } = result[0];

        if (emails_sent_today >= daily_limit) {
            console.warn(`⚠️  [EmailWorker] Empresa ${companyId} alcanzó límite diario`);
            return false;
        }

        if (emails_sent_month >= monthly_limit) {
            console.warn(`⚠️  [EmailWorker] Empresa ${companyId} alcanzó límite mensual`);
            return false;
        }

        return true;
    }

    /**
     * Obtener transporter SMTP (con cache)
     */
    async _getTransporter(config) {
        const cacheKey = this._getConfigHash(config);

        // Verificar cache
        if (this.transportCache.has(cacheKey)) {
            return this.transportCache.get(cacheKey);
        }

        // Crear nuevo transporter
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_port === 465,
            auth: {
                user: config.smtp_user,
                pass: this._decryptPassword(config.smtp_password)
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verificar conexión
        await transporter.verify();

        // Guardar en cache
        this.transportCache.set(cacheKey, transporter);

        return transporter;
    }

    /**
     * Generar hash de config para cache
     */
    _getConfigHash(config) {
        const str = `${config.smtp_host}:${config.smtp_port}:${config.smtp_user}`;
        return crypto.createHash('md5').update(str).digest('hex');
    }

    /**
     * Desencriptar password SMTP
     */
    _decryptPassword(encryptedPassword) {
        // TODO: Implementar desencriptación real
        // Por ahora retornar tal cual (asume que está en plain text en BD)
        return encryptedPassword;
    }

    /**
     * Sleep helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtener estadísticas del worker
     */
    async getStats() {
        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'queued') as queued,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) FILTER (WHERE status = 'sent') as avg_send_time_seconds
            FROM email_queue
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `);

        return {
            isRunning: this.isRunning,
            processInterval: this.processInterval,
            batchSize: this.batchSize,
            last24h: stats[0]
        };
    }
}

// Exportar instancia única (singleton)
const emailWorker = new EmailWorker();

module.exports = emailWorker;
