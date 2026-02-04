/**
 * trackingRoutes.js
 * Rutas para tracking de emails (pixel de apertura, clicks, bounces)
 *
 * Endpoints públicos (sin autenticación) para registrar eventos de email
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * GET /api/tracking/email/:trackingId/pixel.gif
 * Pixel de tracking 1x1 transparente
 * Se inserta en el HTML del email y se carga cuando el destinatario abre el email
 */
router.get('/email/:trackingId/pixel.gif', async (req, res) => {
    const { trackingId } = req.params;

    try {
        // Actualizar opened_at en email_logs si es la primera vez que se abre
        await sequelize.query(`
            UPDATE email_logs
            SET
                opened_at = COALESCE(opened_at, NOW()),
                status = CASE
                    WHEN status = 'sent' THEN 'opened'
                    ELSE status
                END,
                updated_at = NOW()
            WHERE tracking_id = :trackingId
              AND opened_at IS NULL
        `, {
            replacements: { trackingId },
            type: QueryTypes.UPDATE
        });

        console.log(`📧 [TRACKING] Email abierto - Tracking ID: ${trackingId}`);

        // Retornar GIF 1x1 transparente
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );

        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.send(pixel);

    } catch (error) {
        console.error('❌ [TRACKING] Error al registrar apertura de email:', error);

        // Retornar pixel de todas formas para no romper el email
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );
        res.set('Content-Type', 'image/gif');
        res.send(pixel);
    }
});

/**
 * GET /api/tracking/email/:trackingId/click
 * Registra click en link del email
 * Query params: url (URL de destino)
 */
router.get('/email/:trackingId/click', async (req, res) => {
    const { trackingId } = req.params;
    const { url } = req.query;

    try {
        // Actualizar clicked_at en email_logs
        await sequelize.query(`
            UPDATE email_logs
            SET
                clicked_at = COALESCE(clicked_at, NOW()),
                status = 'clicked',
                updated_at = NOW()
            WHERE tracking_id = :trackingId
        `, {
            replacements: { trackingId },
            type: QueryTypes.UPDATE
        });

        console.log(`📧 [TRACKING] Link clickeado - Tracking ID: ${trackingId}, URL: ${url}`);

        // Redirigir a la URL de destino
        if (url) {
            res.redirect(url);
        } else {
            res.status(400).json({ error: 'URL de destino no especificada' });
        }

    } catch (error) {
        console.error('❌ [TRACKING] Error al registrar click:', error);

        // Redirigir de todas formas si hay URL
        if (url) {
            res.redirect(url);
        } else {
            res.status(500).json({ error: 'Error al registrar click' });
        }
    }
});

/**
 * POST /api/tracking/email/:trackingId/bounce
 * Registra bounce (rebote) del email
 * Body: { reason, bounce_type }
 */
router.post('/email/:trackingId/bounce', async (req, res) => {
    const { trackingId } = req.params;
    const { reason, bounce_type } = req.body;

    try {
        await sequelize.query(`
            UPDATE email_logs
            SET
                bounced_at = NOW(),
                status = 'bounced',
                metadata = COALESCE(metadata, '{}'::jsonb) ||
                           jsonb_build_object('bounce_reason', :reason, 'bounce_type', :bounceType),
                updated_at = NOW()
            WHERE tracking_id = :trackingId
        `, {
            replacements: {
                trackingId,
                reason: reason || 'Unknown',
                bounceType: bounce_type || 'hard'
            },
            type: QueryTypes.UPDATE
        });

        console.log(`📧 [TRACKING] Email rebotado - Tracking ID: ${trackingId}, Reason: ${reason}`);

        res.json({ success: true });

    } catch (error) {
        console.error('❌ [TRACKING] Error al registrar bounce:', error);
        res.status(500).json({ error: 'Error al registrar bounce' });
    }
});

/**
 * GET /api/tracking/email/:trackingId/status
 * Obtiene el estado actual del email (para debugging)
 */
router.get('/email/:trackingId/status', async (req, res) => {
    const { trackingId } = req.params;

    try {
        const [email] = await sequelize.query(`
            SELECT
                tracking_id,
                recipient_email,
                subject,
                status,
                sent_at,
                delivered_at,
                opened_at,
                clicked_at,
                bounced_at,
                created_at
            FROM email_logs
            WHERE tracking_id = :trackingId
        `, {
            replacements: { trackingId },
            type: QueryTypes.SELECT
        });

        if (!email) {
            return res.status(404).json({ error: 'Email no encontrado' });
        }

        res.json(email);

    } catch (error) {
        console.error('❌ [TRACKING] Error al obtener estado:', error);
        res.status(500).json({ error: 'Error al obtener estado' });
    }
});

module.exports = router;
