/**
 * EMAIL TRACKING ROUTES - Pixel de Tracking y Click Tracking
 *
 * Endpoints para tracking de emails:
 * - Tracking pixel (apertura)
 * - Click tracking (enlaces)
 * - Estado de tracking por notificación
 *
 * @version 1.0
 * @date 2026-02-02
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

/**
 * GET /api/email/track/:trackingId/open
 * Tracking pixel endpoint - registra apertura del email
 * Returns: 1x1 transparent GIF
 */
router.get('/track/:trackingId/open', async (req, res) => {
    const { trackingId } = req.params;

    try {
        console.log(`📧 [EMAIL-TRACKING] Open pixel requested: ${trackingId}`);

        // Actualizar email_logs si el email no fue abierto antes
        const updateResult = await sequelize.query(`
            UPDATE email_logs
            SET
                opened_at = COALESCE(opened_at, NOW()),
                status = CASE
                    WHEN status IN ('pending', 'sent') THEN 'opened'
                    ELSE status
                END,
                updated_at = NOW()
            WHERE tracking_id = :trackingId
              AND opened_at IS NULL
            RETURNING id, recipient_email, opened_at
        `, {
            replacements: { trackingId },
            type: QueryTypes.SELECT
        });

        if (updateResult && updateResult.length > 0) {
            console.log(`✅ [EMAIL-TRACKING] Email opened: ${updateResult[0].recipient_email}`);
        }

        // Siempre devolver el pixel (incluso si no encontró el tracking)
        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': TRACKING_PIXEL.length,
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.send(TRACKING_PIXEL);

    } catch (error) {
        console.error(`❌ [EMAIL-TRACKING] Error tracking open:`, error.message);
        // Siempre devolver el pixel para no romper el email
        res.set('Content-Type', 'image/gif');
        res.send(TRACKING_PIXEL);
    }
});

/**
 * GET /api/email/track/:trackingId/click
 * Click tracking endpoint - registra click y redirige
 * Query param: url (URL de destino)
 */
router.get('/track/:trackingId/click', async (req, res) => {
    const { trackingId } = req.params;
    const { url } = req.query;

    try {
        console.log(`📧 [EMAIL-TRACKING] Click tracked: ${trackingId} -> ${url}`);

        // Actualizar email_logs
        await sequelize.query(`
            UPDATE email_logs
            SET
                clicked_at = COALESCE(clicked_at, NOW()),
                opened_at = COALESCE(opened_at, NOW()),
                status = 'clicked',
                updated_at = NOW()
            WHERE tracking_id = :trackingId
        `, {
            replacements: { trackingId },
            type: QueryTypes.UPDATE
        });

        // Redirigir a la URL de destino
        if (url) {
            // Validar URL para evitar open redirect
            try {
                const urlObj = new URL(url);
                // Solo permitir http/https
                if (['http:', 'https:'].includes(urlObj.protocol)) {
                    return res.redirect(302, url);
                }
            } catch (e) {
                console.warn(`⚠️ [EMAIL-TRACKING] Invalid redirect URL: ${url}`);
            }
        }

        // Fallback: página de confirmación
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Link Tracked</title></head>
            <body>
                <p>Click registered. If you're not redirected, <a href="${url || '/'}">click here</a>.</p>
            </body>
            </html>
        `);

    } catch (error) {
        console.error(`❌ [EMAIL-TRACKING] Error tracking click:`, error.message);
        // Aún así intentar redirigir
        if (url) {
            return res.redirect(302, url);
        }
        res.status(500).send('Error tracking click');
    }
});

/**
 * GET /api/email/tracking/:notificationId
 * Obtener estado de tracking de emails de una notificación
 * Requires: auth
 */
router.get('/tracking/:notificationId', async (req, res) => {
    const { notificationId } = req.params;

    try {
        const logs = await sequelize.query(`
            SELECT
                id,
                recipient_email,
                recipient_name,
                subject,
                status,
                sent_at,
                delivered_at,
                opened_at,
                clicked_at,
                bounced_at,
                tracking_id,
                error_message,
                retry_count,
                created_at
            FROM email_logs
            WHERE notification_id = :notificationId
            ORDER BY created_at DESC
        `, {
            replacements: { notificationId },
            type: QueryTypes.SELECT
        });

        // Calcular resumen
        const summary = {
            total: logs.length,
            pending: logs.filter(l => l.status === 'pending').length,
            sent: logs.filter(l => l.status === 'sent').length,
            opened: logs.filter(l => l.status === 'opened' || l.opened_at).length,
            clicked: logs.filter(l => l.status === 'clicked' || l.clicked_at).length,
            bounced: logs.filter(l => l.status === 'bounced').length,
            failed: logs.filter(l => l.status === 'failed').length
        };

        res.json({
            success: true,
            notification_id: notificationId,
            summary,
            emails: logs
        });

    } catch (error) {
        console.error(`❌ [EMAIL-TRACKING] Error getting tracking status:`, error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/email/tracking/stats
 * Estadísticas globales de tracking
 * Query params: company_id, date_from, date_to
 */
router.get('/stats', async (req, res) => {
    const { company_id, date_from, date_to } = req.query;

    try {
        let whereClause = 'WHERE 1=1';
        const replacements = {};

        if (company_id) {
            whereClause += ' AND sender_id = :company_id';
            replacements.company_id = company_id;
        }

        if (date_from) {
            whereClause += ' AND created_at >= :date_from';
            replacements.date_from = date_from;
        }

        if (date_to) {
            whereClause += ' AND created_at <= :date_to';
            replacements.date_to = date_to;
        }

        const stats = await sequelize.query(`
            SELECT
                COUNT(*) as total_emails,
                COUNT(*) FILTER (WHERE status = 'sent' OR sent_at IS NOT NULL) as sent,
                COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
                COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
                COUNT(*) FILTER (WHERE bounced_at IS NOT NULL OR status = 'bounced') as bounced,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                ROUND(
                    COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::numeric /
                    NULLIF(COUNT(*) FILTER (WHERE sent_at IS NOT NULL), 0) * 100,
                    2
                ) as open_rate,
                ROUND(
                    COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric /
                    NULLIF(COUNT(*) FILTER (WHERE opened_at IS NOT NULL), 0) * 100,
                    2
                ) as click_rate
            FROM email_logs
            ${whereClause}
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            stats: stats[0] || {
                total_emails: 0,
                sent: 0,
                opened: 0,
                clicked: 0,
                bounced: 0,
                failed: 0,
                open_rate: 0,
                click_rate: 0
            }
        });

    } catch (error) {
        console.error(`❌ [EMAIL-TRACKING] Error getting stats:`, error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
