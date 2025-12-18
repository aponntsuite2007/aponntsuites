/**
 * ============================================================================
 * COMPANY EMAIL ROUTES - Gestión de Email Bidireccional por Empresa
 * ============================================================================
 *
 * Endpoints para configurar y gestionar IMAP/SMTP bidireccional de empresas.
 *
 * BASE URL: /api/company-email/*
 *
 * @version 1.0
 * @date 2025-12-17
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const CompanyEmailPollerService = require('../services/CompanyEmailPollerService');

/**
 * ============================================================================
 * CONFIGURACIÓN IMAP
 * ============================================================================
 */

/**
 * POST /api/company-email/imap/configure
 * Configura IMAP para una empresa
 */
router.post('/imap/configure', async (req, res) => {
    try {
        const { company_id, imap_config } = req.body;

        if (!company_id || !imap_config) {
            return res.status(400).json({
                success: false,
                error: 'company_id e imap_config son requeridos'
            });
        }

        const result = await CompanyEmailPollerService.configureCompanyImap(company_id, imap_config);

        return res.status(200).json({
            success: true,
            message: 'Configuración IMAP guardada y verificada',
            ...result
        });

    } catch (error) {
        console.error('❌ [IMAP-CONFIG] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/company-email/imap/test
 * Prueba conexión IMAP
 */
router.post('/imap/test', async (req, res) => {
    try {
        const { host, port, user, password, secure } = req.body;

        if (!host || !user || !password) {
            return res.status(400).json({
                success: false,
                error: 'host, user y password son requeridos'
            });
        }

        const result = await CompanyEmailPollerService.testImapConnection({
            host,
            port: port || 993,
            user,
            password,
            secure: secure !== false
        });

        return res.status(200).json({
            success: result.success,
            message: result.success ? 'Conexión IMAP exitosa' : 'Error de conexión',
            error: result.error
        });

    } catch (error) {
        console.error('❌ [IMAP-TEST] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/company-email/imap/config/:companyId
 * Obtiene configuración IMAP de una empresa
 */
router.get('/imap/config/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        const [config] = await sequelize.query(`
            SELECT
                cec.id,
                cec.company_id,
                c.name as company_name,
                cec.smtp_host,
                cec.smtp_port,
                cec.smtp_user,
                cec.smtp_from_email,
                cec.smtp_from_name,
                cec.imap_host,
                cec.imap_port,
                cec.imap_user,
                cec.imap_folder,
                cec.imap_secure,
                cec.imap_enabled,
                cec.bidirectional_enabled,
                cec.poll_interval_seconds,
                cec.imap_last_poll,
                cec.imap_last_uid,
                cec.is_active,
                cec.is_validated,
                cec.error_count,
                cec.last_error
            FROM company_email_config cec
            JOIN companies c ON cec.company_id = c.company_id
            WHERE cec.company_id = :companyId
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Configuración no encontrada'
            });
        }

        return res.status(200).json({
            success: true,
            config
        });

    } catch (error) {
        console.error('❌ [IMAP-GET-CONFIG] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/company-email/imap/toggle/:companyId
 * Activa/desactiva bidireccional para una empresa
 */
router.put('/imap/toggle/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { bidirectional_enabled } = req.body;

        await sequelize.query(`
            UPDATE company_email_config
            SET
                bidirectional_enabled = :enabled,
                imap_enabled = :enabled,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :companyId
        `, {
            replacements: {
                companyId,
                enabled: bidirectional_enabled
            },
            type: QueryTypes.UPDATE
        });

        return res.status(200).json({
            success: true,
            message: `Sistema bidireccional ${bidirectional_enabled ? 'activado' : 'desactivado'}`
        });

    } catch (error) {
        console.error('❌ [IMAP-TOGGLE] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * POLLING
 * ============================================================================
 */

/**
 * POST /api/company-email/poll/:companyId
 * Fuerza polling inmediato de una empresa
 */
router.post('/poll/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        const result = await CompanyEmailPollerService.forcePolling(parseInt(companyId));

        return res.status(200).json({
            success: true,
            message: `Polling completado: ${result.processed} mensajes procesados`,
            ...result
        });

    } catch (error) {
        console.error('❌ [FORCE-POLL] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/company-email/poll-all
 * Fuerza polling de todas las empresas
 */
router.post('/poll-all', async (req, res) => {
    try {
        // Ejecutar en background
        CompanyEmailPollerService.pollAllCompanies().catch(err => {
            console.error('❌ [POLL-ALL] Error en background:', err);
        });

        return res.status(200).json({
            success: true,
            message: 'Polling iniciado para todas las empresas'
        });

    } catch (error) {
        console.error('❌ [POLL-ALL] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * ESTADÍSTICAS
 * ============================================================================
 */

/**
 * GET /api/company-email/stats
 * Obtiene estadísticas de polling de todas las empresas
 */
router.get('/stats', async (req, res) => {
    try {
        const { company_id } = req.query;

        const stats = await CompanyEmailPollerService.getPollingStats(
            company_id ? parseInt(company_id) : null
        );

        return res.status(200).json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [POLLING-STATS] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/company-email/inbox-history/:companyId
 * Historial de emails procesados del inbox de una empresa
 */
router.get('/inbox-history/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const emails = await sequelize.query(`
            SELECT
                cip.*,
                eil.subject as inbound_subject,
                eil.from_email as inbound_from,
                eil.processing_status as inbound_status
            FROM company_inbox_processed cip
            LEFT JOIN email_inbound_log eil ON cip.linked_inbound_id = eil.id
            WHERE cip.company_id = :companyId
            ORDER BY cip.processed_at DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements: {
                companyId,
                limit: parseInt(limit),
                offset: parseInt(offset)
            },
            type: QueryTypes.SELECT
        });

        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total FROM company_inbox_processed
            WHERE company_id = :companyId
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return res.status(200).json({
            success: true,
            emails,
            total: parseInt(countResult.total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('❌ [INBOX-HISTORY] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/company-email/threads/:companyId
 * Hilos de email activos de una empresa
 */
router.get('/threads/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const threads = await sequelize.query(`
            SELECT
                etm.thread_id,
                etm.notification_id,
                etm.outbound_message_id,
                etm.created_at,
                etm.reply_count,
                etm.last_reply_at,
                n.title as notification_title,
                n.message as notification_message
            FROM email_thread_mapping etm
            LEFT JOIN notifications n ON etm.notification_id = n.id
            WHERE etm.company_id = :companyId
            ORDER BY COALESCE(etm.last_reply_at, etm.created_at) DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements: {
                companyId,
                limit: parseInt(limit),
                offset: parseInt(offset)
            },
            type: QueryTypes.SELECT
        });

        return res.status(200).json({
            success: true,
            threads
        });

    } catch (error) {
        console.error('❌ [THREADS] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * VISTA GLOBAL (para Aponnt)
 * ============================================================================
 */

/**
 * GET /api/company-email/global/companies-with-imap
 * Lista todas las empresas con IMAP habilitado
 */
router.get('/global/companies-with-imap', async (req, res) => {
    try {
        const companies = await sequelize.query(`
            SELECT * FROM v_companies_with_imap
            ORDER BY company_name
        `, {
            type: QueryTypes.SELECT
        });

        return res.status(200).json({
            success: true,
            companies,
            total: companies.length
        });

    } catch (error) {
        console.error('❌ [GLOBAL-IMAP] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/company-email/global/stats
 * Estadísticas globales de email bidireccional
 */
router.get('/global/stats', async (req, res) => {
    try {
        const [globalStats] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM company_email_config WHERE bidirectional_enabled = true) as companies_with_bidirectional,
                (SELECT COUNT(*) FROM email_inbound_log WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as inbound_24h,
                (SELECT COUNT(*) FROM email_inbound_log WHERE processing_status = 'LINKED') as linked_replies,
                (SELECT COUNT(*) FROM email_thread_mapping) as active_threads,
                (SELECT COUNT(*) FROM company_inbox_processed WHERE processed_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as imap_processed_24h
        `, {
            type: QueryTypes.SELECT
        });

        return res.status(200).json({
            success: true,
            stats: globalStats
        });

    } catch (error) {
        console.error('❌ [GLOBAL-STATS] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
