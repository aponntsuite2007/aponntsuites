/**
 * ADMIN NOTIFICATIONS ROUTES - Bandeja de Notificaciones para Panel Administrativo
 *
 * API para gestionar notificaciones desde el panel admin de Aponnt:
 * - Ver notificaciones de todas las empresas (superadmin)
 * - Ver notificaciones de empresas asignadas (staff)
 * - Filtrado por empresa, estado, prioridad
 * - Estadísticas globales
 *
 * @version 1.0
 * @date 2026-02-02
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const { auth } = require('../middleware/auth');

// Aplicar autenticación - solo staff Aponnt puede acceder
router.use(auth);

// Middleware para verificar que es staff de Aponnt
const requireAponntStaff = (req, res, next) => {
    if (!req.user.is_aponnt_staff && !req.user.is_staff) {
        return res.status(403).json({
            success: false,
            error: 'Acceso denegado. Solo staff de Aponnt puede acceder.'
        });
    }
    next();
};

router.use(requireAponntStaff);

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/notifications
 * Lista notificaciones con filtros
 * Query params: company_id, status, priority, limit, offset, search
 */
router.get('/', async (req, res) => {
    try {
        const {
            company_id,
            status = 'all',
            priority = 'all',
            limit = 50,
            offset = 0,
            search = ''
        } = req.query;

        let whereClause = '1=1';
        const replacements = {};

        // Filtrar por empresa si se especifica
        if (company_id) {
            whereClause += ' AND ng.company_id = :company_id';
            replacements.company_id = parseInt(company_id);
        }

        // Filtrar por estado
        if (status !== 'all') {
            whereClause += ' AND ng.status = :status';
            replacements.status = status;
        }

        // Filtrar por prioridad
        if (priority !== 'all') {
            whereClause += ' AND ng.priority = :priority';
            replacements.priority = priority;
        }

        // Búsqueda en subject
        if (search) {
            whereClause += ' AND (ng.subject ILIKE :search OR c.name ILIKE :search)';
            replacements.search = `%${search}%`;
        }

        const query = `
            SELECT
                ng.id,
                ng.group_type,
                ng.initiator_type,
                ng.initiator_id,
                ng.subject,
                ng.status,
                ng.priority,
                ng.created_at,
                ng.metadata,
                ng.company_id,
                c.name as company_name,
                c.slug as company_slug,
                COUNT(nm.id) as message_count,
                MAX(nm.created_at) as last_message_at,
                (
                    SELECT content
                    FROM notification_messages
                    WHERE group_id = ng.id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) as last_message,
                (
                    SELECT COUNT(*)
                    FROM notification_messages
                    WHERE group_id = ng.id
                    AND read_at IS NULL
                ) as unread_count
            FROM notification_groups ng
            LEFT JOIN companies c ON c.company_id = ng.company_id
            LEFT JOIN notification_messages nm ON nm.group_id = ng.id
            WHERE ${whereClause}
            GROUP BY ng.id, c.name, c.slug
            ORDER BY MAX(nm.created_at) DESC NULLS LAST, ng.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        replacements.limit = parseInt(limit);
        replacements.offset = parseInt(offset);

        const [groups] = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Contar total
        const [countResult] = await sequelize.query(`
            SELECT COUNT(DISTINCT ng.id) as total
            FROM notification_groups ng
            LEFT JOIN companies c ON c.company_id = ng.company_id
            WHERE ${whereClause}
        `, { replacements });

        res.json({
            success: true,
            data: {
                groups: groups || [],
                total: parseInt(countResult[0]?.total || 0),
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: (parseInt(offset) + parseInt(limit)) < parseInt(countResult[0]?.total || 0)
            }
        });

    } catch (error) {
        console.error('❌ [ADMIN-NOTIFICATIONS] Error listing:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/notifications/stats
 * Estadísticas globales o por empresa
 * Query params: company_id (opcional)
 */
router.get('/stats', async (req, res) => {
    try {
        const { company_id } = req.query;

        let whereClause = '1=1';
        const replacements = {};

        if (company_id) {
            whereClause += ' AND ng.company_id = :company_id';
            replacements.company_id = parseInt(company_id);
        }

        // Stats de grupos
        const [groupStats] = await sequelize.query(`
            SELECT
                COUNT(*) as total_groups,
                COUNT(*) FILTER (WHERE status = 'open') as open_groups,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_groups,
                COUNT(*) FILTER (WHERE status = 'closed') as closed_groups,
                COUNT(*) FILTER (WHERE priority = 'critical' OR priority = 'urgent') as urgent_groups,
                COUNT(*) FILTER (WHERE priority = 'high') as high_priority_groups,
                COUNT(DISTINCT company_id) as companies_with_notifications
            FROM notification_groups ng
            WHERE ${whereClause}
        `, { replacements });

        // Stats de mensajes
        const [messageStats] = await sequelize.query(`
            SELECT
                COUNT(*) as total_messages,
                COUNT(*) FILTER (WHERE read_at IS NULL) as unread_messages,
                COUNT(*) FILTER (WHERE requires_response = true AND responded_at IS NULL) as pending_responses,
                COUNT(*) FILTER (WHERE deadline_at IS NOT NULL AND deadline_at < NOW() AND responded_at IS NULL) as overdue_messages
            FROM notification_messages nm
            JOIN notification_groups ng ON ng.id = nm.group_id
            WHERE ${whereClause}
        `, { replacements });

        // Stats por tipo de grupo
        const [byType] = await sequelize.query(`
            SELECT
                group_type,
                COUNT(*) as count
            FROM notification_groups ng
            WHERE ${whereClause}
            GROUP BY group_type
            ORDER BY count DESC
            LIMIT 10
        `, { replacements });

        // Stats por empresa (top 10)
        const [byCompany] = await sequelize.query(`
            SELECT
                c.company_id,
                c.name as company_name,
                COUNT(ng.id) as notification_count,
                COUNT(*) FILTER (WHERE ng.status = 'open') as open_count
            FROM notification_groups ng
            JOIN companies c ON c.company_id = ng.company_id
            WHERE ${whereClause}
            GROUP BY c.company_id, c.name
            ORDER BY notification_count DESC
            LIMIT 10
        `, { replacements });

        res.json({
            success: true,
            stats: {
                groups: groupStats[0] || {},
                messages: messageStats[0] || {},
                by_type: byType || [],
                by_company: byCompany || []
            }
        });

    } catch (error) {
        console.error('❌ [ADMIN-NOTIFICATIONS] Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/notifications/:id
 * Detalle de una notificación con todos sus mensajes
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener grupo
        const [groups] = await sequelize.query(`
            SELECT
                ng.*,
                c.name as company_name,
                c.slug as company_slug
            FROM notification_groups ng
            LEFT JOIN companies c ON c.company_id = ng.company_id
            WHERE ng.id = :id
        `, {
            replacements: { id: parseInt(id) },
            type: QueryTypes.SELECT
        });

        if (!groups || groups.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notificación no encontrada'
            });
        }

        // Obtener mensajes
        const [messages] = await sequelize.query(`
            SELECT
                id,
                sequence_number,
                sender_type,
                sender_id,
                sender_name,
                recipient_type,
                recipient_id,
                recipient_name,
                message_type,
                subject,
                content,
                created_at,
                deadline_at,
                requires_response,
                delivered_at,
                read_at,
                responded_at,
                channels,
                attachments
            FROM notification_messages
            WHERE group_id = :id
            ORDER BY sequence_number ASC
        `, {
            replacements: { id: parseInt(id) },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            notification: {
                group: groups[0],
                messages: messages || []
            }
        });

    } catch (error) {
        console.error('❌ [ADMIN-NOTIFICATIONS] Error getting detail:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/notifications/email-tracking
 * Resumen de tracking de emails
 * Query params: company_id, date_from, date_to
 */
router.get('/email-tracking/summary', async (req, res) => {
    try {
        const { company_id, date_from, date_to } = req.query;

        let whereClause = '1=1';
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

        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) as total_emails,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
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
            WHERE ${whereClause}
        `, { replacements });

        // Por estado en timeline (últimos 7 días)
        const [timeline] = await sequelize.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
                COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened
            FROM email_logs
            WHERE created_at >= NOW() - INTERVAL '7 days'
            ${company_id ? 'AND sender_id = :company_id' : ''}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, { replacements });

        res.json({
            success: true,
            tracking: {
                stats: stats[0] || {},
                timeline: timeline || []
            }
        });

    } catch (error) {
        console.error('❌ [ADMIN-NOTIFICATIONS] Error getting email tracking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/notifications/companies
 * Lista de empresas con contador de notificaciones
 */
router.get('/companies/list', async (req, res) => {
    try {
        const [companies] = await sequelize.query(`
            SELECT
                c.company_id,
                c.name,
                c.slug,
                c.is_active,
                COUNT(ng.id) as total_notifications,
                COUNT(ng.id) FILTER (WHERE ng.status = 'open') as open_notifications,
                COUNT(nm.id) FILTER (WHERE nm.read_at IS NULL) as unread_messages
            FROM companies c
            LEFT JOIN notification_groups ng ON ng.company_id = c.company_id
            LEFT JOIN notification_messages nm ON nm.group_id = ng.id
            WHERE c.is_active = true
            GROUP BY c.company_id, c.name, c.slug, c.is_active
            ORDER BY total_notifications DESC
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            companies: companies || []
        });

    } catch (error) {
        console.error('❌ [ADMIN-NOTIFICATIONS] Error listing companies:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
