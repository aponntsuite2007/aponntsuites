/**
 * EMAIL ROUTES - API REST para gestión del sistema de emails
 *
 * Endpoints:
 * - POST /api/email/config/validate - Validar config SMTP
 * - POST /api/email/config/company - Configurar email empresa
 * - GET /api/email/config/company/:companyId - Obtener config empresa
 * - PUT /api/email/config/company/:companyId - Actualizar config
 * - POST /api/email/send - Enviar email inmediato
 * - POST /api/email/queue - Encolar email
 * - GET /api/email/logs - Historial de emails
 * - GET /api/email/stats - Estadísticas
 * - GET /api/email/worker/status - Estado del worker
 *
 * @version 1.0.0
 * @date 2025-10-28
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const nodemailer = require('nodemailer');
const emailWorker = require('../workers/EmailWorker');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Verificar autenticación - Decodifica JWT si no está en req.user
 */
const requireAuth = (req, res, next) => {
    // Si ya hay req.user (middleware global lo puso), continuar
    if (req.user) {
        return next();
    }

    // Intentar decodificar token manualmente
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.replace('Bearer ', '');
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, secret);

        req.user = decoded;
        next();
    } catch (error) {
        console.error('[EmailRoutes] Error verificando token:', error.message);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

/**
 * Verificar que sea admin
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }
    next();
};

// ============================================================================
// ENDPOINTS: CONFIGURACIÓN SMTP
// ============================================================================

/**
 * GET /api/email/company-email-config
 * Obtener configuraciones de email de la empresa del usuario actual
 * (Usado por company-email-process.js)
 */
router.get('/company-email-config', requireAuth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'No se pudo determinar la empresa del usuario'
            });
        }

        const [configs] = await sequelize.query(`
            SELECT
                id,
                company_id,
                institutional_email,
                display_name,
                smtp_host,
                smtp_port,
                smtp_user,
                is_verified,
                is_active,
                daily_limit,
                monthly_limit,
                emails_sent_today,
                emails_sent_month,
                created_at,
                updated_at
            FROM email_configurations
            WHERE company_id = $1
            ORDER BY created_at DESC
        `, {
            bind: [companyId]
        });

        res.json({
            success: true,
            count: configs.length,
            configs: configs
        });

    } catch (error) {
        console.error('[EmailRoutes] Error obteniendo configs de empresa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/email/config/validate
 * Validar configuración SMTP enviando email de prueba
 */
router.post('/config/validate', requireAuth, async (req, res) => {
    try {
        const {
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_password,
            from_email,
            display_name,
            test_recipient_email
        } = req.body;

        // Validar campos requeridos
        if (!smtp_host || !smtp_port || !smtp_user || !smtp_password || !from_email) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos'
            });
        }

        // Crear transporter
        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: parseInt(smtp_port),
            secure: parseInt(smtp_port) === 465,
            auth: {
                user: smtp_user,
                pass: smtp_password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verificar conexión
        await transporter.verify();

        // Enviar email de prueba si se especificó destinatario
        let testResult = null;
        if (test_recipient_email) {
            const info = await transporter.sendMail({
                from: `"${display_name || 'Test'}" <${from_email}>`,
                to: test_recipient_email,
                subject: '✅ Prueba de Configuración SMTP - Aponnt',
                html: `
                    <h2>Configuración SMTP Exitosa</h2>
                    <p>Este es un email de prueba para verificar que la configuración SMTP está funcionando correctamente.</p>
                    <hr>
                    <p><strong>Servidor:</strong> ${smtp_host}:${smtp_port}</p>
                    <p><strong>Usuario:</strong> ${smtp_user}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
                `,
                text: `Configuración SMTP Exitosa\n\nEste es un email de prueba.\n\nServidor: ${smtp_host}:${smtp_port}\nUsuario: ${smtp_user}\nFecha: ${new Date().toLocaleString('es-AR')}`
            });

            testResult = {
                messageId: info.messageId,
                response: info.response
            };
        }

        res.json({
            success: true,
            message: 'Configuración SMTP válida',
            testEmailSent: !!test_recipient_email,
            testResult
        });

    } catch (error) {
        console.error('[EmailRoutes] Error validando SMTP:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            details: 'Verifique los datos de configuración SMTP'
        });
    }
});

/**
 * POST /api/email/config/company
 * Configurar email institucional de empresa (requiere validación SMTP)
 */
router.post('/config/company', requireAuth, requireAdmin, async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            company_id,
            institutional_email,
            display_name,
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_password,
            daily_limit,
            monthly_limit
        } = req.body;

        // Validar campos
        if (!company_id || !institutional_email || !smtp_host || !smtp_port || !smtp_user || !smtp_password) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos'
            });
        }

        // Verificar que la empresa existe
        const [company] = await sequelize.query(
            'SELECT company_id FROM companies WHERE company_id = $1',
            { bind: [company_id], transaction }
        );

        if (company.length === 0) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Empresa no encontrada'
            });
        }

        // Validar SMTP
        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: parseInt(smtp_port),
            secure: parseInt(smtp_port) === 465,
            auth: { user: smtp_user, pass: smtp_password },
            tls: { rejectUnauthorized: false }
        });

        await transporter.verify();

        // Insertar o actualizar configuración
        await sequelize.query(`
            INSERT INTO email_configurations (
                company_id, institutional_email, display_name,
                smtp_host, smtp_port, smtp_user, smtp_password,
                is_verified, is_active, verified_at,
                daily_limit, monthly_limit, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, NOW(), $8, $9, NOW())
            ON CONFLICT (company_id) DO UPDATE SET
                institutional_email = EXCLUDED.institutional_email,
                display_name = EXCLUDED.display_name,
                smtp_host = EXCLUDED.smtp_host,
                smtp_port = EXCLUDED.smtp_port,
                smtp_user = EXCLUDED.smtp_user,
                smtp_password = EXCLUDED.smtp_password,
                is_verified = true,
                verified_at = NOW(),
                daily_limit = EXCLUDED.daily_limit,
                monthly_limit = EXCLUDED.monthly_limit,
                updated_at = NOW()
        `, {
            bind: [
                company_id,
                institutional_email,
                display_name || institutional_email,
                smtp_host,
                smtp_port,
                smtp_user,
                smtp_password, // TODO: Encriptar
                daily_limit || 500,
                monthly_limit || 10000
            ],
            transaction
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Configuración de email guardada exitosamente'
        });

    } catch (error) {
        await transaction.rollback();
        console.error('[EmailRoutes] Error configurando empresa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/email/config/company/:companyId
 * Obtener configuración de email de empresa
 */
// TODO: Restaurar requireAuth después de debug
router.get('/config/company/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        const [config] = await sequelize.query(`
            SELECT
                company_id,
                institutional_email,
                display_name,
                smtp_host,
                smtp_port,
                smtp_user,
                -- NO retornar password
                is_verified,
                is_active,
                daily_limit,
                monthly_limit,
                emails_sent_today,
                emails_sent_month,
                last_email_sent_at,
                verified_at,
                created_at,
                updated_at
            FROM email_configurations
            WHERE company_id = $1
        `, {
            bind: [companyId]
        });

        if (config.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No hay configuración de email para esta empresa'
            });
        }

        res.json({
            success: true,
            data: config[0]
        });

    } catch (error) {
        console.error('[EmailRoutes] Error obteniendo config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// ENDPOINTS: ENVÍO DE EMAILS
// ============================================================================

/**
 * POST /api/email/queue
 * Encolar email para envío asíncrono
 */
router.post('/queue', requireAuth, async (req, res) => {
    try {
        const {
            sender_id,
            sender_type, // 'aponnt' | 'company' | 'employee'
            recipient_email,
            recipient_name,
            subject,
            body_html,
            body_text,
            priority, // 'high' | 'normal' | 'low'
            notification_id,
            scheduled_at
        } = req.body;

        // Validar campos
        if (!sender_id || !sender_type || !recipient_email || !subject || (!body_html && !body_text)) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos'
            });
        }

        // Insertar en cola
        const [result] = await sequelize.query(`
            INSERT INTO email_queue (
                sender_id, sender_type, recipient_email, recipient_name,
                subject, body_html, body_text, priority, status,
                notification_id, scheduled_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued', $9, $10, NOW())
            RETURNING id
        `, {
            bind: [
                sender_id,
                sender_type,
                recipient_email,
                recipient_name,
                subject,
                body_html,
                body_text,
                priority || 'normal',
                notification_id,
                scheduled_at
            ]
        });

        res.json({
            success: true,
            message: 'Email encolado exitosamente',
            queue_id: result[0].id
        });

    } catch (error) {
        console.error('[EmailRoutes] Error encolando email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// ENDPOINTS: LOGS Y ESTADÍSTICAS
// ============================================================================

/**
 * GET /api/email/logs
 * Obtener historial de emails enviados
 */
router.get('/logs', requireAuth, async (req, res) => {
    try {
        const {
            company_id,
            sender_type,
            status,
            limit = 50,
            offset = 0
        } = req.query;

        let whereClause = [];
        let bindings = [];
        let bindIndex = 1;

        if (company_id) {
            whereClause.push(`sender_id::TEXT = $${bindIndex}`);
            bindings.push(company_id);
            bindIndex++;
        }

        if (sender_type) {
            whereClause.push(`sender_type = $${bindIndex}`);
            bindings.push(sender_type);
            bindIndex++;
        }

        if (status) {
            whereClause.push(`status = $${bindIndex}`);
            bindings.push(status);
            bindIndex++;
        }

        const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        const [logs] = await sequelize.query(`
            SELECT
                id,
                sender_id,
                sender_type,
                recipient_email,
                recipient_name,
                subject,
                status,
                sent_at,
                opened_at,
                clicked_at,
                error_message,
                notification_id,
                created_at
            FROM email_logs
            ${whereSQL}
            ORDER BY created_at DESC
            LIMIT $${bindIndex} OFFSET $${bindIndex + 1}
        `, {
            bind: [...bindings, parseInt(limit), parseInt(offset)]
        });

        // Count total
        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM email_logs
            ${whereSQL}
        `, {
            bind: bindings
        });

        res.json({
            success: true,
            data: logs,
            pagination: {
                total: parseInt(countResult[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        console.error('[EmailRoutes] Error obteniendo logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/email/stats
 * Estadísticas de emails
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { company_id } = req.query;

        let whereClause = company_id ? `WHERE sender_id::TEXT = '${company_id}' AND sender_type = 'company'` : '';

        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
                COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
                COUNT(*) FILTER (WHERE status = 'bounced') as total_bounced,
                COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as total_opened,
                COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as total_clicked,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30d
            FROM email_logs
            ${whereClause}
        `);

        res.json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('[EmailRoutes] Error obteniendo stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/email/worker/status
 * Estado del worker de emails
 */
router.get('/worker/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await emailWorker.getStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('[EmailRoutes] Error obteniendo estado worker:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
