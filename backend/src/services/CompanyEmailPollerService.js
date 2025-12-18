/**
 * ============================================================================
 * COMPANY EMAIL POLLER SERVICE
 * ============================================================================
 *
 * Servicio para polling de inboxes IMAP de empresas.
 * Lee emails entrantes y los procesa como respuestas a notificaciones.
 *
 * Flujo:
 * 1. Obtener empresas con IMAP habilitado
 * 2. Conectar a cada inbox via IMAP
 * 3. Leer mensajes nuevos (desde último UID)
 * 4. Procesar cada mensaje via InboundEmailService
 * 5. Actualizar último UID procesado
 *
 * @version 1.0
 * @date 2025-12-17
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const InboundEmailService = require('./InboundEmailService');

class CompanyEmailPollerService {
    constructor() {
        this.isPolling = false;
        this.pollInterval = null;
        this.DEFAULT_POLL_INTERVAL = 60000; // 60 segundos
    }

    /**
     * Inicia el polling periódico de todos los inboxes de empresas
     */
    startPolling(intervalMs = null) {
        if (this.pollInterval) {
            console.log('⚠️ [IMAP-POLLER] Ya hay un polling activo');
            return;
        }

        const interval = intervalMs || this.DEFAULT_POLL_INTERVAL;
        console.log(`📬 [IMAP-POLLER] Iniciando polling cada ${interval / 1000}s`);

        // Ejecutar inmediatamente la primera vez
        this.pollAllCompanies();

        // Luego cada intervalo
        this.pollInterval = setInterval(() => {
            this.pollAllCompanies();
        }, interval);
    }

    /**
     * Detiene el polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log('🛑 [IMAP-POLLER] Polling detenido');
        }
    }

    /**
     * Obtiene empresas que necesitan polling
     */
    async getCompaniesNeedingPoll() {
        try {
            const companies = await sequelize.query(
                'SELECT * FROM get_companies_needing_poll()',
                { type: QueryTypes.SELECT }
            );
            return companies;
        } catch (error) {
            console.error('❌ [IMAP-POLLER] Error obteniendo empresas:', error.message);
            return [];
        }
    }

    /**
     * Hace polling de todas las empresas habilitadas
     */
    async pollAllCompanies() {
        if (this.isPolling) {
            console.log('⏳ [IMAP-POLLER] Ya hay un poll en progreso, saltando...');
            return;
        }

        this.isPolling = true;
        console.log('📬 [IMAP-POLLER] Iniciando ciclo de polling...');

        try {
            const companies = await this.getCompaniesNeedingPoll();

            if (companies.length === 0) {
                console.log('📬 [IMAP-POLLER] No hay empresas que necesiten polling');
                return;
            }

            console.log(`📬 [IMAP-POLLER] Procesando ${companies.length} empresas`);

            for (const company of companies) {
                try {
                    await this.pollCompanyInbox(company);
                } catch (error) {
                    console.error(`❌ [IMAP-POLLER] Error en ${company.company_name}:`, error.message);
                    await this.updatePollStatus(company.config_id, null, error.message);
                }
            }

        } catch (error) {
            console.error('❌ [IMAP-POLLER] Error en ciclo de polling:', error);
        } finally {
            this.isPolling = false;
        }
    }

    /**
     * Hace polling del inbox de una empresa específica
     */
    async pollCompanyInbox(companyConfig) {
        const {
            config_id,
            company_id,
            company_name,
            imap_host,
            imap_port,
            imap_user,
            imap_password,
            imap_secure,
            imap_folder,
            imap_last_uid,
            smtp_from_email
        } = companyConfig;

        console.log(`📧 [IMAP-POLLER] Conectando a ${company_name} (${imap_host})`);

        return new Promise((resolve, reject) => {
            const imapConfig = {
                user: imap_user,
                password: imap_password,
                host: imap_host,
                port: imap_port || 993,
                tls: imap_secure !== false,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 30000,
                connTimeout: 30000
            };

            const imap = new Imap(imapConfig);
            let lastProcessedUid = imap_last_uid || 0;
            let messagesProcessed = 0;

            imap.once('ready', () => {
                console.log(`✅ [IMAP-POLLER] Conectado a ${company_name}`);

                imap.openBox(imap_folder || 'INBOX', false, (err, box) => {
                    if (err) {
                        imap.end();
                        return reject(err);
                    }

                    // Buscar mensajes nuevos (UID mayor al último procesado)
                    const searchCriteria = imap_last_uid > 0
                        ? [['UID', `${imap_last_uid + 1}:*`]]
                        : ['ALL'];

                    imap.search(searchCriteria, (searchErr, results) => {
                        if (searchErr) {
                            imap.end();
                            return reject(searchErr);
                        }

                        // Filtrar UIDs ya procesados
                        const newUids = results.filter(uid => uid > imap_last_uid);

                        if (newUids.length === 0) {
                            console.log(`📧 [IMAP-POLLER] ${company_name}: No hay mensajes nuevos`);
                            imap.end();
                            return resolve({ processed: 0 });
                        }

                        console.log(`📧 [IMAP-POLLER] ${company_name}: ${newUids.length} mensajes nuevos`);

                        const fetch = imap.fetch(newUids, {
                            bodies: '',
                            struct: true
                        });

                        const messagePromises = [];

                        fetch.on('message', (msg, seqno) => {
                            let uid = 0;

                            msg.on('attributes', (attrs) => {
                                uid = attrs.uid;
                            });

                            msg.on('body', (stream) => {
                                const chunks = [];

                                stream.on('data', (chunk) => {
                                    chunks.push(chunk);
                                });

                                stream.on('end', () => {
                                    const buffer = Buffer.concat(chunks);
                                    const messagePromise = this.processMessage(
                                        buffer,
                                        uid,
                                        company_id,
                                        company_name,
                                        smtp_from_email
                                    ).then(() => {
                                        messagesProcessed++;
                                        if (uid > lastProcessedUid) {
                                            lastProcessedUid = uid;
                                        }
                                    }).catch(err => {
                                        console.error(`❌ [IMAP-POLLER] Error procesando mensaje ${uid}:`, err.message);
                                    });

                                    messagePromises.push(messagePromise);
                                });
                            });
                        });

                        fetch.once('error', (fetchErr) => {
                            console.error(`❌ [IMAP-POLLER] Error en fetch:`, fetchErr);
                        });

                        fetch.once('end', async () => {
                            // Esperar a que todos los mensajes se procesen
                            await Promise.all(messagePromises);

                            // Actualizar último UID procesado
                            await this.updatePollStatus(config_id, lastProcessedUid, null);

                            console.log(`✅ [IMAP-POLLER] ${company_name}: ${messagesProcessed} mensajes procesados`);

                            imap.end();
                            resolve({ processed: messagesProcessed, lastUid: lastProcessedUid });
                        });
                    });
                });
            });

            imap.once('error', (err) => {
                console.error(`❌ [IMAP-POLLER] Error IMAP ${company_name}:`, err.message);
                reject(err);
            });

            imap.once('end', () => {
                console.log(`📧 [IMAP-POLLER] Desconectado de ${company_name}`);
            });

            imap.connect();
        });
    }

    /**
     * Procesa un mensaje individual
     */
    async processMessage(buffer, uid, companyId, companyName, companyEmail) {
        try {
            // Parsear el email
            const parsed = await simpleParser(buffer);

            console.log(`📧 [IMAP-POLLER] Procesando: "${parsed.subject}" de ${parsed.from?.text}`);

            // Verificar si ya fue procesado
            const existing = await sequelize.query(`
                SELECT id FROM company_inbox_processed
                WHERE company_id = :companyId AND message_uid = :uid
            `, {
                replacements: { companyId, uid },
                type: QueryTypes.SELECT
            });

            if (existing.length > 0) {
                console.log(`⏭️ [IMAP-POLLER] Mensaje ${uid} ya procesado, saltando...`);
                return;
            }

            // Preparar datos para InboundEmailService
            const emailData = {
                messageId: parsed.messageId,
                inReplyTo: parsed.inReplyTo,
                references: parsed.references,
                from: parsed.from?.value?.[0]?.address || '',
                fromName: parsed.from?.value?.[0]?.name || '',
                to: companyEmail,
                subject: parsed.subject || '',
                text: parsed.text || '',
                html: parsed.html || '',
                date: parsed.date,
                attachments: parsed.attachments?.map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size
                })) || []
            };

            // Procesar via InboundEmailService
            const result = await InboundEmailService.processInboundEmail(emailData, 'imap');

            // Registrar en company_inbox_processed
            await sequelize.query(`
                INSERT INTO company_inbox_processed (
                    company_id, message_uid, message_id, from_email,
                    subject, received_at, processed_at, processing_status,
                    linked_inbound_id
                ) VALUES (
                    :companyId, :uid, :messageId, :fromEmail,
                    :subject, :receivedAt, CURRENT_TIMESTAMP, :status,
                    :inboundId
                )
            `, {
                replacements: {
                    companyId,
                    uid,
                    messageId: parsed.messageId || null,
                    fromEmail: emailData.from,
                    subject: (parsed.subject || '').substring(0, 1000),
                    receivedAt: parsed.date || new Date(),
                    status: result.action !== 'ignored' ? 'PROCESSED' : 'IGNORED',
                    inboundId: result.inboundId || null
                },
                type: QueryTypes.INSERT
            });

            console.log(`✅ [IMAP-POLLER] Mensaje ${uid} procesado: ${result.action}`);

        } catch (error) {
            console.error(`❌ [IMAP-POLLER] Error procesando mensaje ${uid}:`, error);

            // Registrar error
            await sequelize.query(`
                INSERT INTO company_inbox_processed (
                    company_id, message_uid, processed_at,
                    processing_status, error_message
                ) VALUES (
                    :companyId, :uid, CURRENT_TIMESTAMP,
                    'ERROR', :errorMessage
                )
                ON CONFLICT (company_id, message_uid) DO NOTHING
            `, {
                replacements: {
                    companyId,
                    uid,
                    errorMessage: error.message
                },
                type: QueryTypes.INSERT
            });

            throw error;
        }
    }

    /**
     * Actualiza el estado del último poll
     */
    async updatePollStatus(configId, lastUid, errorMessage) {
        try {
            await sequelize.query(
                'SELECT update_imap_poll_status(:configId, :lastUid, :error)',
                {
                    replacements: {
                        configId,
                        lastUid,
                        error: errorMessage
                    },
                    type: QueryTypes.SELECT
                }
            );
        } catch (error) {
            console.error('❌ [IMAP-POLLER] Error actualizando estado:', error.message);
        }
    }

    /**
     * Configura IMAP para una empresa
     */
    async configureCompanyImap(companyId, imapConfig) {
        const {
            imap_host,
            imap_port = 993,
            imap_user,
            imap_password,
            imap_secure = true,
            imap_folder = 'INBOX',
            bidirectional_enabled = true
        } = imapConfig;

        // Verificar conexión antes de guardar
        const testResult = await this.testImapConnection({
            host: imap_host,
            port: imap_port,
            user: imap_user,
            password: imap_password,
            secure: imap_secure
        });

        if (!testResult.success) {
            throw new Error(`Error de conexión IMAP: ${testResult.error}`);
        }

        // Guardar/actualizar configuración
        const [existing] = await sequelize.query(`
            SELECT id FROM company_email_config WHERE company_id = :companyId
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        if (existing) {
            await sequelize.query(`
                UPDATE company_email_config SET
                    imap_host = :imap_host,
                    imap_port = :imap_port,
                    imap_user = :imap_user,
                    imap_password = :imap_password,
                    imap_secure = :imap_secure,
                    imap_folder = :imap_folder,
                    imap_enabled = true,
                    bidirectional_enabled = :bidirectional_enabled,
                    is_validated = true,
                    validated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = :companyId
            `, {
                replacements: {
                    companyId,
                    imap_host,
                    imap_port,
                    imap_user,
                    imap_password,
                    imap_secure,
                    imap_folder,
                    bidirectional_enabled
                },
                type: QueryTypes.UPDATE
            });
        } else {
            throw new Error('Primero debe configurar SMTP para la empresa');
        }

        return {
            success: true,
            message: 'Configuración IMAP guardada y verificada'
        };
    }

    /**
     * Prueba conexión IMAP
     */
    async testImapConnection(config) {
        return new Promise((resolve) => {
            const imap = new Imap({
                user: config.user,
                password: config.password,
                host: config.host,
                port: config.port || 993,
                tls: config.secure !== false,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 15000,
                connTimeout: 15000
            });

            const timeout = setTimeout(() => {
                imap.destroy();
                resolve({ success: false, error: 'Timeout de conexión' });
            }, 20000);

            imap.once('ready', () => {
                clearTimeout(timeout);
                imap.end();
                resolve({ success: true });
            });

            imap.once('error', (err) => {
                clearTimeout(timeout);
                resolve({ success: false, error: err.message });
            });

            imap.connect();
        });
    }

    /**
     * Obtiene estadísticas de polling
     */
    async getPollingStats(companyId = null) {
        try {
            let query = `
                SELECT
                    cec.company_id,
                    c.name as company_name,
                    cec.imap_host,
                    cec.imap_enabled,
                    cec.bidirectional_enabled,
                    cec.imap_last_poll,
                    cec.imap_last_uid,
                    cec.error_count,
                    cec.last_error,
                    (
                        SELECT COUNT(*) FROM company_inbox_processed cip
                        WHERE cip.company_id = cec.company_id
                    ) as total_processed,
                    (
                        SELECT COUNT(*) FROM company_inbox_processed cip
                        WHERE cip.company_id = cec.company_id
                        AND cip.processed_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
                    ) as processed_24h
                FROM company_email_config cec
                JOIN companies c ON cec.company_id = c.company_id
                WHERE cec.imap_enabled = true
            `;

            const replacements = {};

            if (companyId) {
                query += ' AND cec.company_id = :companyId';
                replacements.companyId = companyId;
            }

            query += ' ORDER BY cec.imap_last_poll DESC NULLS LAST';

            const stats = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });

            return stats;

        } catch (error) {
            console.error('❌ [IMAP-POLLER] Error obteniendo stats:', error);
            throw error;
        }
    }

    /**
     * Forzar polling de una empresa específica
     */
    async forcePolling(companyId) {
        const [company] = await sequelize.query(`
            SELECT
                cec.id as config_id,
                cec.company_id,
                c.name as company_name,
                cec.imap_host,
                cec.imap_port,
                cec.imap_user,
                cec.imap_password,
                cec.imap_secure,
                cec.imap_folder,
                cec.imap_last_uid,
                cec.smtp_from_email
            FROM company_email_config cec
            JOIN companies c ON cec.company_id = c.company_id
            WHERE cec.company_id = :companyId
              AND cec.imap_enabled = true
              AND cec.bidirectional_enabled = true
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        if (!company) {
            throw new Error('Empresa no tiene IMAP bidireccional habilitado');
        }

        return await this.pollCompanyInbox(company);
    }
}

// Singleton
module.exports = new CompanyEmailPollerService();
