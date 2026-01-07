/**
 * ============================================================================
 * NOTIFICATION ANALYTICS ROUTES
 * ============================================================================
 *
 * API REST para analytics y métricas del sistema de notificaciones
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * GET /api/notifications/analytics/overview
 * Vista general de métricas
 */
router.get('/overview', async (req, res) => {
    try {
        const { companyId, days = 30 } = req.query;

        const whereCompany = companyId ? 'AND company_id = :companyId' : '';

        const overview = await sequelize.query(`
            SELECT
                COUNT(*)::INTEGER as total_notifications,
                COUNT(*) FILTER (WHERE read_at IS NOT NULL)::INTEGER as total_read,
                COUNT(*) FILTER (WHERE read_at IS NULL)::INTEGER as total_unread,
                COUNT(*) FILTER (WHERE requires_action = TRUE)::INTEGER as total_requiring_action,
                COUNT(*) FILTER (WHERE action_status = 'completed')::INTEGER as total_actions_completed,
                COUNT(*) FILTER (WHERE sla_breached = TRUE)::INTEGER as total_sla_breached,
                ROUND(AVG(EXTRACT(EPOCH FROM (read_at - created_at))/60), 2) as avg_read_time_minutes,
                COUNT(DISTINCT recipient_id)::INTEGER as unique_recipients
            FROM unified_notifications
            WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
              AND deleted_at IS NULL
              ${whereCompany}
        `, {
            replacements: { companyId, days },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: overview[0],
            period: `${days} days`
        });
    } catch (error) {
        console.error('Error obteniendo overview:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/notifications/analytics/by-channel
 * Métricas por canal
 */
router.get('/by-channel', async (req, res) => {
    try {
        const { companyId, days = 30 } = req.query;

        const byChannel = await sequelize.query(`
            SELECT
                channel,
                COUNT(*)::INTEGER as total_sent,
                COUNT(*) FILTER (WHERE delivered_at IS NOT NULL)::INTEGER as total_delivered,
                COUNT(*) FILTER (WHERE response_at IS NOT NULL)::INTEGER as total_responded,
                ROUND((COUNT(*) FILTER (WHERE delivered_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as delivery_rate
            FROM notification_log
            WHERE sent_at >= NOW() - MAKE_INTERVAL(days => :days)
              ${companyId ? 'AND company_id = :companyId' : ''}
            GROUP BY channel
            ORDER BY total_sent DESC
        `, {
            replacements: { companyId, days },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: byChannel,
            period: `${days} days`
        });
    } catch (error) {
        console.error('Error obteniendo métricas por canal:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/notifications/analytics/by-module
 * Métricas por módulo
 */
router.get('/by-module', async (req, res) => {
    try {
        const { companyId, days = 30 } = req.query;

        const whereCompany = companyId ? 'AND company_id = :companyId' : '';

        const byModule = await sequelize.query(`
            SELECT
                module,
                COUNT(*)::INTEGER as total_notifications,
                COUNT(*) FILTER (WHERE read_at IS NOT NULL)::INTEGER as total_read,
                COUNT(*) FILTER (WHERE priority = 'urgent')::INTEGER as total_urgent,
                ROUND(AVG(EXTRACT(EPOCH FROM (read_at - created_at))/60), 2) as avg_read_time_minutes
            FROM unified_notifications
            WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
              AND deleted_at IS NULL
              ${whereCompany}
            GROUP BY module
            ORDER BY total_notifications DESC
        `, {
            replacements: { companyId, days },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: byModule,
            period: `${days} days`
        });
    } catch (error) {
        console.error('Error obteniendo métricas por módulo:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/notifications/analytics/timeline
 * Timeline de notificaciones (por día/hora)
 */
router.get('/timeline', async (req, res) => {
    try {
        const { companyId, days = 30, groupBy = 'day' } = req.query;

        const whereCompany = companyId ? 'AND company_id = :companyId' : '';
        const truncFunction = groupBy === 'hour' ? 'hour' : 'day';

        const timeline = await sequelize.query(`
            SELECT
                DATE_TRUNC(:truncFunction, created_at) as period,
                COUNT(*)::INTEGER as total_notifications,
                COUNT(*) FILTER (WHERE read_at IS NOT NULL)::INTEGER as total_read,
                COUNT(*) FILTER (WHERE priority IN ('urgent', 'high'))::INTEGER as total_high_priority
            FROM unified_notifications
            WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
              AND deleted_at IS NULL
              ${whereCompany}
            GROUP BY period
            ORDER BY period ASC
        `, {
            replacements: { companyId, days, truncFunction },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: timeline,
            period: `${days} days`,
            groupBy
        });
    } catch (error) {
        console.error('Error obteniendo timeline:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/notifications/analytics/sla-performance
 * Performance de SLA
 */
router.get('/sla-performance', async (req, res) => {
    try {
        const { companyId, days = 30 } = req.query;

        const whereCompany = companyId ? 'AND company_id = :companyId' : '';

        const slaPerformance = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE sla_hours IS NOT NULL)::INTEGER as total_with_sla,
                COUNT(*) FILTER (WHERE sla_breached = TRUE)::INTEGER as total_breached,
                COUNT(*) FILTER (WHERE sla_breached = FALSE AND sla_hours IS NOT NULL)::INTEGER as total_met,
                ROUND((COUNT(*) FILTER (WHERE sla_breached = FALSE AND sla_hours IS NOT NULL)::DECIMAL /
                       NULLIF(COUNT(*) FILTER (WHERE sla_hours IS NOT NULL), 0) * 100), 2) as compliance_rate,
                ROUND(AVG(EXTRACT(EPOCH FROM (action_taken_at - created_at))/3600), 2) as avg_completion_hours
            FROM unified_notifications
            WHERE created_at >= NOW() - MAKE_INTERVAL(days => :days)
              AND requires_action = TRUE
              AND deleted_at IS NULL
              ${whereCompany}
        `, {
            replacements: { companyId, days },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: slaPerformance[0],
            period: `${days} days`
        });
    } catch (error) {
        console.error('Error obteniendo SLA performance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/notifications/analytics/top-recipients
 * Top usuarios que más reciben notificaciones
 */
router.get('/top-recipients', async (req, res) => {
    try {
        const { companyId, days = 30, limit = 10 } = req.query;

        const whereCompany = companyId ? 'AND un.company_id = :companyId' : '';

        const topRecipients = await sequelize.query(`
            SELECT
                un.recipient_id,
                u.name as user_name,
                u.email as user_email,
                COUNT(*)::INTEGER as total_notifications,
                COUNT(*) FILTER (WHERE un.read_at IS NOT NULL)::INTEGER as total_read,
                ROUND((COUNT(*) FILTER (WHERE un.read_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 2) as read_rate
            FROM unified_notifications un
            LEFT JOIN users u ON u.id = un.recipient_id
            WHERE un.created_at >= NOW() - INTERVAL ':days days'
              AND un.deleted_at IS NULL
              ${whereCompany}
            GROUP BY un.recipient_id, u.name, u.email
            ORDER BY total_notifications DESC
            LIMIT :limit
        `, {
            replacements: { companyId, days, limit },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: topRecipients,
            period: `${days} days`,
            limit
        });
    } catch (error) {
        console.error('Error obteniendo top recipients:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
