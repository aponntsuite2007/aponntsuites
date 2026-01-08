/**
 * notificationBillingRoutes.js
 *
 * API REST para gestión de tarifación y facturación de canales de notificación
 * Exclusivo para administradores de Aponnt
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const NotificationBillingService = require('../services/NotificationBillingService');

// Middleware para verificar rol de administrador Aponnt
const isAponntAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado. Solo administradores de Aponnt'
    });
  }
  next();
};

/**
 * GET /api/notifications/billing/dashboard
 * Dashboard general de facturación (para Aponnt)
 */
router.get('/dashboard', auth, isAponntAdmin, async (req, res) => {
  try {
    const { year, month } = req.query;

    // Totales de Aponnt (lo que Aponnt paga a Twilio/Firebase)
    const aponntTotals = await NotificationBillingService.getAponntTotals(
      year ? parseInt(year) : null,
      month ? parseInt(month) : null
    );

    // Resumen por empresa (lo que Aponnt factura a empresas)
    const companiesSummary = await NotificationBillingService.getMonthlyBillingSummary(
      year ? parseInt(year) : null,
      month ? parseInt(month) : null
    );

    // Calcular totales para facturar
    const totalToInvoice = companiesSummary.reduce((sum, c) => sum + c.totalCost, 0);
    const totalInvoiced = companiesSummary.filter(c => c.isInvoiced).reduce((sum, c) => sum + c.totalCost, 0);
    const totalPending = totalToInvoice - totalInvoiced;

    res.json({
      success: true,
      data: {
        aponnt: {
          totalSent: aponntTotals.totalSent,
          totalCost: aponntTotals.totalCost,
          totalCompanies: aponntTotals.totalCompanies,
          byChannel: aponntTotals.byChannel
        },
        billing: {
          totalToInvoice,
          totalInvoiced,
          totalPending,
          companies: companiesSummary
        },
        profit: {
          revenue: totalToInvoice,
          cost: aponntTotals.totalCost,
          profit: totalToInvoice - aponntTotals.totalCost,
          margin: aponntTotals.totalCost > 0
            ? ((totalToInvoice - aponntTotals.totalCost) / totalToInvoice * 100).toFixed(2)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error en dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/billing/company/:companyId
 * Facturación de una empresa específica
 */
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { year, month } = req.query;

    // Verificar que admin pueda ver cualquier empresa, empresa solo la suya
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      if (req.user.company_id !== parseInt(companyId)) {
        return res.status(403).json({
          success: false,
          error: 'Solo puedes ver tu propia facturación'
        });
      }
    }

    // Obtener consumo mensual
    const usage = await NotificationBillingService.getMonthlyUsage(
      parseInt(companyId),
      year ? parseInt(year) : null,
      month ? parseInt(month) : null
    );

    // Obtener pricing configurado
    const pricing = await NotificationBillingService.getCompanyPricing(parseInt(companyId));

    res.json({
      success: true,
      data: {
        companyId: parseInt(companyId),
        period: {
          year: year || new Date().getFullYear(),
          month: month || (new Date().getMonth() + 1)
        },
        usage,
        pricing,
        total: usage.reduce((sum, u) => sum + u.totalCost, 0)
      }
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error en company billing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/billing/company/:companyId/log
 * Log detallado de billing de una empresa
 */
router.get('/company/:companyId/log', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { year, month, channel, limit = 100, offset = 0 } = req.query;

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      if (req.user.company_id !== parseInt(companyId)) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado'
        });
      }
    }

    const log = await NotificationBillingService.getBillingLog(parseInt(companyId), {
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
      channel,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: log,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: log.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error en billing log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/billing/pricing
 * Configurar tarifa para una empresa/canal
 * Solo admin Aponnt
 */
router.post('/pricing', auth, isAponntAdmin, async (req, res) => {
  try {
    const {
      companyId,
      channel,
      pricePerUnit,
      monthlyQuota,
      isEnabled = true
    } = req.body;

    // Validaciones
    if (!companyId || !channel || pricePerUnit === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: companyId, channel, pricePerUnit'
      });
    }

    if (!['sms', 'whatsapp', 'push', 'email'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'Canal inválido. Debe ser: sms, whatsapp, push, email'
      });
    }

    const success = await NotificationBillingService.setCompanyPricing(
      parseInt(companyId),
      channel,
      parseFloat(pricePerUnit),
      monthlyQuota ? parseInt(monthlyQuota) : null,
      isEnabled
    );

    res.json({
      success,
      message: success
        ? `Tarifa configurada: ${channel} a $${pricePerUnit}/unidad`
        : 'Error configurando tarifa'
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error configurando pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/billing/pricing/:companyId
 * Obtener tarifas de una empresa
 */
router.get('/pricing/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Verificar permisos
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      if (req.user.company_id !== parseInt(companyId)) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado'
        });
      }
    }

    const pricing = await NotificationBillingService.getCompanyPricing(parseInt(companyId));

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error obteniendo pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/billing/suspend
 * Suspender canal para una empresa
 * Solo admin Aponnt
 */
router.post('/suspend', auth, isAponntAdmin, async (req, res) => {
  try {
    const {
      companyId,
      channel,
      reason = 'non_payment'
    } = req.body;

    if (!companyId || !channel) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: companyId, channel'
      });
    }

    const success = await NotificationBillingService.suspendChannel(
      parseInt(companyId),
      channel,
      reason,
      req.user.id
    );

    res.json({
      success,
      message: success
        ? `Canal ${channel} suspendido para empresa ${companyId}`
        : 'Error suspendiendo canal'
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error suspendiendo canal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/billing/enable
 * Habilitar canal para una empresa
 * Solo admin Aponnt
 */
router.post('/enable', auth, isAponntAdmin, async (req, res) => {
  try {
    const {
      companyId,
      channel
    } = req.body;

    if (!companyId || !channel) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: companyId, channel'
      });
    }

    const success = await NotificationBillingService.enableChannel(
      parseInt(companyId),
      channel
    );

    res.json({
      success,
      message: success
        ? `Canal ${channel} habilitado para empresa ${companyId}`
        : 'Error habilitando canal'
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error habilitando canal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/billing/mark-invoiced
 * Marcar período como facturado
 * Solo admin Aponnt
 */
router.post('/mark-invoiced', auth, isAponntAdmin, async (req, res) => {
  try {
    const {
      companyId,
      year,
      month,
      invoiceId
    } = req.body;

    if (!companyId || !year || !month || !invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: companyId, year, month, invoiceId'
      });
    }

    const success = await NotificationBillingService.markAsInvoiced(
      parseInt(companyId),
      parseInt(year),
      parseInt(month),
      invoiceId
    );

    res.json({
      success,
      message: success
        ? `Período ${year}-${month} marcado como facturado (${invoiceId})`
        : 'Error marcando como facturado'
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error marcando como facturado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/billing/stats
 * Estadísticas generales de billing (para charts)
 * Solo admin Aponnt
 */
router.get('/stats', auth, isAponntAdmin, async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const currentDate = new Date();
    const stats = [];

    // Obtener últimos N meses
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const totals = await NotificationBillingService.getAponntTotals(year, month);
      const companiesSummary = await NotificationBillingService.getMonthlyBillingSummary(year, month);

      const revenue = companiesSummary.reduce((sum, c) => sum + c.totalCost, 0);

      stats.push({
        year,
        month,
        label: `${year}-${month.toString().padStart(2, '0')}`,
        totalSent: totals.totalSent,
        totalCost: totals.totalCost,
        revenue,
        profit: revenue - totals.totalCost,
        companies: totals.totalCompanies,
        byChannel: totals.byChannel
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ [BILLING-API] Error en stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
