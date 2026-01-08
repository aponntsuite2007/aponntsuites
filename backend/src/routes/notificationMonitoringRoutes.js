/**
 * API para Dashboard de Monitoreo y Analytics de Notificaciones
 *
 * Endpoints:
 * - GET /api/notifications/monitoring/stats - Estadísticas generales
 * - GET /api/notifications/monitoring/by-channel - Métricas por canal
 * - GET /api/notifications/monitoring/by-module - Métricas por módulo
 * - GET /api/notifications/monitoring/timeline - Timeline de envíos
 * - GET /api/notifications/monitoring/engagement - Tasas de apertura/lectura
 * - GET /api/notifications/monitoring/recent - Notificaciones recientes
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const { auth } = require('../middleware/auth');

/**
 * GET /api/notifications/monitoring/stats
 * Estadísticas generales del sistema de notificaciones
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { period = '7d' } = req.query; // 7d, 30d, 90d, all

    const dateFilter = period !== 'all' ? `
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${period.replace('d', ' days')}'
    ` : '';

    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        ROUND(AVG(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100, 2) as delivery_rate,
        ROUND(AVG(CASE WHEN status = 'read' THEN 1 ELSE 0 END) * 100, 2) as read_rate,
        COUNT(DISTINCT recipient_id) as unique_recipients,
        COUNT(DISTINCT module) as active_modules
      FROM notifications
      WHERE company_id = :companyId
        ${dateFilter}
    `, {
      replacements: { companyId },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      period,
      data: {
        total: parseInt(stats.total_notifications) || 0,
        delivered: parseInt(stats.delivered) || 0,
        read: parseInt(stats.read_count) || 0,
        failed: parseInt(stats.failed) || 0,
        pending: parseInt(stats.pending) || 0,
        delivery_rate: parseFloat(stats.delivery_rate) || 0,
        read_rate: parseFloat(stats.read_rate) || 0,
        unique_recipients: parseInt(stats.unique_recipients) || 0,
        active_modules: parseInt(stats.active_modules) || 0
      }
    });
  } catch (error) {
    console.error('❌ [MONITORING] Error en stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/monitoring/by-channel
 * Métricas por canal (email, SMS, push, etc.)
 */
router.get('/by-channel', auth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { period = '7d' } = req.query;

    const dateFilter = period !== 'all' ? `
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${period.replace('d', ' days')}'
    ` : '';

    const metrics = await sequelize.query(`
      SELECT
        unnest(channels) as channel,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        ROUND(AVG(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100, 2) as success_rate
      FROM notifications
      WHERE company_id = :companyId
        ${dateFilter}
      GROUP BY channel
      ORDER BY total DESC
    `, {
      replacements: { companyId },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      period,
      data: metrics.map(m => ({
        channel: m.channel,
        total: parseInt(m.total),
        delivered: parseInt(m.delivered),
        failed: parseInt(m.failed),
        success_rate: parseFloat(m.success_rate)
      }))
    });
  } catch (error) {
    console.error('❌ [MONITORING] Error en by-channel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/monitoring/by-module
 * Métricas por módulo (vacation, attendance, etc.)
 */
router.get('/by-module', auth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { period = '7d' } = req.query;

    const dateFilter = period !== 'all' ? `
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${period.replace('d', ' days')}'
    ` : '';

    const metrics = await sequelize.query(`
      SELECT
        module,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
        ROUND(AVG(CASE WHEN status = 'read' THEN 1 ELSE 0 END) * 100, 2) as read_rate
      FROM notifications
      WHERE company_id = :companyId
        ${dateFilter}
      GROUP BY module
      ORDER BY total DESC
    `, {
      replacements: { companyId },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      period,
      data: metrics.map(m => ({
        module: m.module,
        total: parseInt(m.total),
        delivered: parseInt(m.delivered),
        read: parseInt(m.read_count),
        read_rate: parseFloat(m.read_rate)
      }))
    });
  } catch (error) {
    console.error('❌ [MONITORING] Error en by-module:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/monitoring/timeline
 * Timeline de envíos (por día)
 */
router.get('/timeline', auth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { period = '7d' } = req.query;

    const days = parseInt(period.replace('d', ''));

    const timeline = await sequelize.query(`
      WITH dates AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date as date
      )
      SELECT
        d.date,
        COALESCE(COUNT(n.id), 0) as total,
        COALESCE(COUNT(CASE WHEN n.status = 'delivered' THEN 1 END), 0) as delivered,
        COALESCE(COUNT(CASE WHEN n.status = 'read' THEN 1 END), 0) as read_count
      FROM dates d
      LEFT JOIN notifications n
        ON DATE(n.created_at) = d.date
        AND n.company_id = :companyId
      GROUP BY d.date
      ORDER BY d.date
    `, {
      replacements: { companyId },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      period,
      data: timeline.map(t => ({
        date: t.date,
        total: parseInt(t.total),
        delivered: parseInt(t.delivered),
        read: parseInt(t.read_count)
      }))
    });
  } catch (error) {
    console.error('❌ [MONITORING] Error en timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/monitoring/engagement
 * Métricas de engagement (tasas de apertura, tiempo de lectura, etc.)
 */
router.get('/engagement', auth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { period = '7d' } = req.query;

    const dateFilter = period !== 'all' ? `
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${period.replace('d', ' days')}'
    ` : '';

    const [engagement] = await sequelize.query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as opened,
        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as clicked,
        ROUND(AVG(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100, 2) as delivery_rate,
        ROUND(AVG(CASE WHEN status = 'read' THEN 1 ELSE 0 END) * 100, 2) as open_rate,
        ROUND(AVG(
          CASE
            WHEN read_at IS NOT NULL AND created_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (read_at - created_at)) / 3600
          END
        ), 2) as avg_time_to_read_hours
      FROM notifications
      WHERE company_id = :companyId
        ${dateFilter}
    `, {
      replacements: { companyId },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      period,
      data: {
        total_sent: parseInt(engagement.total_sent) || 0,
        delivered: parseInt(engagement.delivered) || 0,
        opened: parseInt(engagement.opened) || 0,
        clicked: parseInt(engagement.clicked) || 0,
        delivery_rate: parseFloat(engagement.delivery_rate) || 0,
        open_rate: parseFloat(engagement.open_rate) || 0,
        avg_time_to_read_hours: parseFloat(engagement.avg_time_to_read_hours) || 0
      }
    });
  } catch (error) {
    console.error('❌ [MONITORING] Error en engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/monitoring/recent
 * Notificaciones recientes (últimas 50)
 */
router.get('/recent', auth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await sequelize.query(`
      SELECT
        id,
        module,
        title,
        message,
        status,
        priority,
        channels,
        created_at,
        read_at,
        recipient_id,
        conversation_thread_id
      FROM notifications
      WHERE company_id = :companyId
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: {
        companyId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      type: QueryTypes.SELECT
    });

    const [{ total }] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM notifications
      WHERE company_id = :companyId
    `, {
      replacements: { companyId },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(total)
      }
    });
  } catch (error) {
    console.error('❌ [MONITORING] Error en recent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
