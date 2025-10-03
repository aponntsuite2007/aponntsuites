const express = require('express');
const router = express.Router();
const vendorAutomationService = require('../services/vendorAutomationService');
const notificationService = require('../services/notificationService');
const vendorMetricsService = require('../services/vendorMetricsService');
const vendorReferralService = require('../services/vendorReferralService');
const { VendorRating, SupportPackageAuction, VendorCommission, User, Company } = require('../config/database');
const { Op } = require('sequelize');

// Middleware de autenticación (simplificado para desarrollo)
const authMiddleware = (req, res, next) => {
  // TODO: Implementar autenticación real
  next();
};

// Obtener estado del sistema de automatización
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const status = vendorAutomationService.getSystemStatus();

    // Obtener estadísticas adicionales
    const [
      totalAuctions,
      activeAuctions,
      lowRatings,
      totalVendors
    ] = await Promise.all([
      SupportPackageAuction.count(),
      SupportPackageAuction.count({ where: { status: 'in_auction' } }),
      VendorRating.count({ where: { rating: { [Op.lt]: 2.0 }, is_active: true } }),
      User.count({ where: { role: 'vendor', isActive: true } })
    ]);

    res.json({
      success: true,
      systemStatus: status,
      statistics: {
        totalAuctions,
        activeAuctions,
        lowRatings,
        totalVendors
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado del sistema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ejecutar verificación manual completa
router.post('/check', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Ejecutando verificación manual completa');
    await vendorAutomationService.performFullCheck();

    res.json({
      success: true,
      message: 'Verificación completa ejecutada exitosamente',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error en verificación manual:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Configurar parámetros del sistema
router.put('/config', authMiddleware, async (req, res) => {
  try {
    const { checkInterval, criticalRatingThreshold } = req.body;

    const config = {};
    if (checkInterval) config.checkInterval = checkInterval;
    if (criticalRatingThreshold) config.criticalRatingThreshold = criticalRatingThreshold;

    vendorAutomationService.updateSystemConfiguration(config);

    res.json({
      success: true,
      message: 'Configuración actualizada',
      config: vendorAutomationService.getSystemStatus()
    });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener lista de subastas activas
router.get('/auctions', authMiddleware, async (req, res) => {
  try {
    const auctions = await SupportPackageAuction.findAll({
      include: [
        { model: Company, as: 'company' },
        { model: User, as: 'originalVendor' },
        { model: User, as: 'newVendor' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      auctions: auctions.map(auction => ({
        id: auction.id,
        company: auction.company?.name,
        originalVendor: auction.originalVendor ? `${auction.originalVendor.first_name} ${auction.originalVendor.last_name}` : null,
        newVendor: auction.newVendor ? `${auction.newVendor.first_name} ${auction.newVendor.last_name}` : null,
        status: auction.status,
        originalRating: auction.originalRating,
        monthlyCommissionValue: auction.monthlyCommissionValue,
        auctionStartDate: auction.auctionStartDate,
        auctionEndDate: auction.auctionEndDate,
        bidsCount: auction.auctionBids?.length || 0,
        eligibleVendorsCount: auction.eligibleVendors?.length || 0,
        winnerReason: auction.winnerReason
      }))
    });
  } catch (error) {
    console.error('Error obteniendo subastas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener detalles de una subasta específica
router.get('/auctions/:id', authMiddleware, async (req, res) => {
  try {
    const auction = await SupportPackageAuction.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company' },
        { model: User, as: 'originalVendor' },
        { model: User, as: 'newVendor' }
      ]
    });

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Subasta no encontrada'
      });
    }

    res.json({
      success: true,
      auction: {
        ...auction.toJSON(),
        bids: auction.auctionBids || [],
        eligibleVendors: auction.eligibleVendors || []
      }
    });
  } catch (error) {
    console.error('Error obteniendo detalles de subasta:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Agregar oferta a subasta (endpoint para vendedores)
router.post('/auctions/:id/bid', authMiddleware, async (req, res) => {
  try {
    const { vendorId, proposedCommission, notes } = req.body;

    if (!vendorId || !proposedCommission) {
      return res.status(400).json({
        success: false,
        error: 'vendorId y proposedCommission son requeridos'
      });
    }

    const result = await vendorAutomationService.addBidToAuction(
      req.params.id,
      vendorId,
      proposedCommission,
      notes || ''
    );

    res.json(result);
  } catch (error) {
    console.error('Error agregando oferta:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Forzar selección de ganador
router.post('/auctions/:id/select-winner', authMiddleware, async (req, res) => {
  try {
    const auction = await SupportPackageAuction.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company' },
        { model: User, as: 'originalVendor' }
      ]
    });

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Subasta no encontrada'
      });
    }

    if (auction.status !== 'in_auction') {
      return res.status(400).json({
        success: false,
        error: 'La subasta no está activa'
      });
    }

    await vendorAutomationService.selectAuctionWinner(auction);

    res.json({
      success: true,
      message: 'Ganador seleccionado exitosamente'
    });
  } catch (error) {
    console.error('Error seleccionando ganador:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener calificaciones bajas
router.get('/low-ratings', authMiddleware, async (req, res) => {
  try {
    const lowRatings = await VendorRating.findAll({
      where: {
        rating: { [Op.lt]: 2.5 },
        is_active: true
      },
      include: [
        { model: User, as: 'vendor' },
        { model: Company, as: 'company' }
      ],
      order: [['rating', 'ASC']]
    });

    res.json({
      success: true,
      lowRatings: lowRatings.map(rating => ({
        id: rating.id,
        vendor: `${rating.vendor.first_name} ${rating.vendor.last_name}`,
        company: rating.company.name,
        rating: rating.rating,
        responseTimeScore: rating.responseTimeScore,
        resolutionQualityScore: rating.resolutionQualityScore,
        customerSatisfactionScore: rating.customerSatisfactionScore,
        isUnderReview: rating.is_under_review,
        reviewStartDate: rating.reviewStartDate,
        lastUpdated: rating.lastUpdated
      }))
    });
  } catch (error) {
    console.error('Error obteniendo calificaciones bajas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enviar notificación manual
router.post('/notify', authMiddleware, async (req, res) => {
  try {
    const { type, vendorId, companyId, data } = req.body;

    if (!type || !vendorId) {
      return res.status(400).json({
        success: false,
        error: 'type y vendorId son requeridos'
      });
    }

    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendedor no encontrado'
      });
    }

    let result;
    switch (type) {
      case 'rating_drop':
        const company = await Company.findByPk(companyId);
        const rating = await VendorRating.findOne({
          where: { vendorId, companyId }
        });
        result = await notificationService.notifyVendorRatingDrop(vendor, company, rating);
        break;

      case 'commission_change':
        result = await notificationService.notifyCommissionChange(vendor, data, data.changeType);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Tipo de notificación no válido'
        });
    }

    res.json({
      success: true,
      notificationResult: result,
      message: 'Notificación enviada'
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener vendedores elegibles para subasta
router.get('/eligible-vendors', authMiddleware, async (req, res) => {
  try {
    const eligibleVendors = await vendorAutomationService.getEligibleVendors();

    res.json({
      success: true,
      eligibleVendors: eligibleVendors.map(vendor => ({
        id: vendor.id,
        name: `${vendor.first_name} ${vendor.last_name}`,
        email: vendor.email,
        phone: vendor.phone,
        globalRating: vendor.globalRating,
        acceptsAuctions: vendor.acceptsAuctions,
        acceptsSupportPackages: vendor.acceptsSupportPackages
      }))
    });
  } catch (error) {
    console.error('Error obteniendo vendedores elegibles:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Dashboard de métricas
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const [
      totalVendors,
      activeVendors,
      totalAuctions,
      activeAuctions,
      completedAuctions,
      lowRatingsCount,
      avgGlobalRating,
      recentAuctions
    ] = await Promise.all([
      User.count({ where: { role: 'vendor' } }),
      User.count({ where: { role: 'vendor', isActive: true } }),
      SupportPackageAuction.count(),
      SupportPackageAuction.count({ where: { status: 'in_auction' } }),
      SupportPackageAuction.count({ where: { status: 'assigned' } }),
      VendorRating.count({ where: { rating: { [Op.lt]: 2.0 }, is_active: true } }),
      VendorRating.findOne({
        attributes: [[require('sequelize').fn('AVG', require('sequelize').col('rating')), 'avgRating']],
        where: { isActive: true }
      }),
      SupportPackageAuction.findAll({
        include: [
          { model: Company, as: 'company' },
          { model: User, as: 'originalVendor' }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      })
    ]);

    res.json({
      success: true,
      dashboard: {
        vendors: {
          total: totalVendors,
          active: activeVendors,
          avgGlobalRating: parseFloat(avgGlobalRating?.dataValues?.avgRating || 0).toFixed(2)
        },
        auctions: {
          total: totalAuctions,
          active: activeAuctions,
          completed: completedAuctions
        },
        alerts: {
          lowRatings: lowRatingsCount
        },
        recentActivity: recentAuctions.map(auction => ({
          id: auction.id,
          company: auction.company?.name,
          vendor: auction.originalVendor ? `${auction.originalVendor.first_name} ${auction.originalVendor.last_name}` : null,
          status: auction.status,
          createdAt: auction.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener métricas de todos los vendedores
router.get('/vendors-metrics', authMiddleware, async (req, res) => {
  try {
    const vendorsMetrics = await vendorMetricsService.getAllVendorsMetrics();

    res.json({
      success: true,
      vendorsMetrics,
      total: vendorsMetrics.length
    });
  } catch (error) {
    console.error('Error obteniendo métricas de vendedores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener métricas detalladas de un vendedor específico
router.get('/vendors/:id/metrics', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const metrics = await vendorMetricsService.getVendorCompleteMetrics(vendorId);

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas del vendedor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Recalcular métricas de un vendedor
router.post('/vendors/:id/recalculate', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const success = await vendorMetricsService.recalculateVendorMetrics(vendorId);

    res.json({
      success,
      message: success ? 'Métricas recalculadas exitosamente' : 'Error recalculando métricas'
    });
  } catch (error) {
    console.error('Error recalculando métricas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Recalcular métricas de todos los vendedores
router.post('/vendors/recalculate-all', authMiddleware, async (req, res) => {
  try {
    const results = await vendorMetricsService.recalculateAllVendorsMetrics();

    res.json({
      success: true,
      message: 'Recálculo masivo iniciado',
      results
    });
  } catch (error) {
    console.error('Error recalculando todas las métricas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// === ENDPOINTS PARA GESTIÓN DE REFERIDOS ===

// Crear referido
router.post('/referrals', authMiddleware, async (req, res) => {
  try {
    const { referrerId, referredId, commissionPercentage } = req.body;

    if (!referrerId || !referredId) {
      return res.status(400).json({
        success: false,
        error: 'referrerId y referredId son requeridos'
      });
    }

    const referral = await vendorReferralService.createReferral(
      referrerId,
      referredId,
      commissionPercentage
    );

    res.json({
      success: true,
      referral,
      message: 'Referido creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando referido:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener árbol de referidos de un vendedor
router.get('/vendors/:id/referral-tree', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const maxDepth = parseInt(req.query.depth) || 3;

    const tree = await vendorReferralService.getReferralTree(vendorId, maxDepth);

    res.json({
      success: true,
      vendorId,
      tree,
      maxDepth
    });
  } catch (error) {
    console.error('Error obteniendo árbol de referidos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas de referidos
router.get('/vendors/:id/referral-stats', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const stats = await vendorReferralService.getReferralStats(vendorId);

    res.json({
      success: true,
      vendorId,
      stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de referidos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Procesar comisiones de referido mensualmente
router.post('/referrals/process-monthly', authMiddleware, async (req, res) => {
  try {
    const results = await vendorReferralService.processMonthlyReferralCommissions();

    res.json({
      success: true,
      message: 'Comisiones de referido procesadas',
      results
    });
  } catch (error) {
    console.error('Error procesando comisiones mensuales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener resumen de rendimiento del sistema
router.get('/system-performance', authMiddleware, async (req, res) => {
  try {
    const summary = await vendorMetricsService.getSystemPerformanceSummary();

    res.json({
      success: true,
      performance: summary
    });
  } catch (error) {
    console.error('Error obteniendo resumen de rendimiento:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;