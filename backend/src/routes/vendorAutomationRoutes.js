const express = require('express');
const router = express.Router();
const vendorAutomationService = require('../services/vendorAutomationService');
const notificationService = require('../services/notificationService');
const vendorMetricsService = require('../services/vendorMetricsService');
const vendorReferralService = require('../services/vendorReferralService');
const { VendorRating, SupportPackageAuction, VendorCommission, User, Company } = require('../config/database');
const { Op } = require('sequelize');
const multer = require('multer');

// Configurar multer para uploads
const upload = multer({ dest: 'uploads/' });

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

// =============================================
// PAYMENT & INVOICING - Sistema de Facturación
// =============================================

const PaymentService = require('../services/PaymentService');
const CommissionCalculationService = require('../services/CommissionCalculationService');
const { sequelize } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de recibos
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/receipts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, JPG o PNG'));
    }
  }
});

/**
 * POST /payments
 * Registra un pago y ejecuta todo el flujo:
 * - Marca factura como paid
 * - Genera comisiones (venta, soporte, líder)
 * - Activa empresa si está pendiente_aprobacion
 */
router.post('/payments', authMiddleware, receiptUpload.single('receipt'), async (req, res) => {
  try {
    console.log('\n📥 [VENDOR AUTOMATION] POST /payments - Recibido');

    const {
      invoice_id,
      company_id,
      amount,
      currency,
      payment_method,
      payment_reference,
      payment_date,
      notes
    } = req.body;

    // Validaciones
    if (!invoice_id || !company_id || !amount || !payment_date) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: invoice_id, company_id, amount, payment_date'
      });
    }

    // Verificar que req.user existe (middleware de auth)
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const paymentData = {
      invoice_id: parseInt(invoice_id),
      company_id: parseInt(company_id),
      amount: parseFloat(amount),
      currency: currency || 'USD',
      payment_method: payment_method || null,
      payment_reference: payment_reference || null,
      payment_date,
      notes: notes || null,
      registered_by: req.user.user_id,
      receipt_file_path: req.file ? req.file.path : null,
      receipt_file_name: req.file ? req.file.filename : null
    };

    const result = await PaymentService.registerPayment(paymentData);

    return res.status(201).json(result);

  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en POST /payments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error registrando pago'
    });
  }
});

/**
 * GET /payments/:companyId
 * Obtiene historial de pagos de una empresa
 */
router.get('/payments/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const payments = await PaymentService.getCompanyPaymentHistory(parseInt(companyId));

    return res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en GET /payments/:companyId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /payments/details/:paymentId
 * Obtiene detalles de un pago específico
 */
router.get('/payments/details/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await PaymentService.getPaymentDetails(parseInt(paymentId));

    return res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en GET /payments/details/:paymentId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /invoices
 * Lista todas las facturas (con filtros opcionales)
 */
router.get('/invoices', authMiddleware, async (req, res) => {
  try {
    const { company_id, status, year, month } = req.query;

    let whereClause = '';
    const replacements = {};

    if (company_id) {
      whereClause += ' WHERE company_id = :companyId';
      replacements.companyId = parseInt(company_id);
    }

    if (status) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ' status = :status';
      replacements.status = status;
    }

    if (year && month) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ' billing_period_year = :year AND billing_period_month = :month';
      replacements.year = parseInt(year);
      replacements.month = parseInt(month);
    }

    const invoices = await sequelize.query(
      `SELECT
        i.*,
        c.name as company_name,
        c.slug as company_slug,
        c.status as company_status
      FROM invoices i
      INNER JOIN companies c ON c.company_id = i.company_id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT 100`,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      count: invoices.length,
      invoices
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en GET /invoices:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /invoices/:id
 * Obtiene detalles de una factura específica
 */
router.get('/invoices/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [invoice] = await sequelize.query(
      `SELECT
        i.*,
        c.name as company_name,
        c.slug as company_slug,
        c.contact_email,
        c.status as company_status
      FROM invoices i
      INNER JOIN companies c ON c.company_id = i.company_id
      WHERE i.id = :invoiceId`,
      {
        replacements: { invoiceId: parseInt(id) },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Obtener items de la factura
    const items = await sequelize.query(
      'SELECT * FROM invoice_items WHERE invoice_id = :invoiceId ORDER BY id',
      {
        replacements: { invoiceId: parseInt(id) },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Obtener pagos relacionados
    const payments = await sequelize.query(
      'SELECT * FROM payments WHERE invoice_id = :invoiceId ORDER BY payment_date DESC',
      {
        replacements: { invoiceId: parseInt(id) },
        type: sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      invoice: {
        ...invoice,
        items,
        payments
      }
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en GET /invoices/:id:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /commissions/partner/:partnerId
 * Obtiene comisiones de un partner específico
 */
router.get('/commissions/partner/:partnerId', authMiddleware, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status } = req.query;

    let whereClause = 'WHERE partner_id = :partnerId';
    const replacements = { partnerId: parseInt(partnerId) };

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    const commissions = await sequelize.query(
      `SELECT
        c.*,
        i.invoice_number,
        i.billing_period_month,
        i.billing_period_year,
        comp.name as company_name
      FROM commissions c
      INNER JOIN invoices i ON i.id = c.invoice_id
      INNER JOIN companies comp ON comp.company_id = c.company_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT 100`,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      count: commissions.length,
      commissions
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en GET /commissions/partner/:partnerId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /commissions/period/:year/:month
 * Obtiene resumen de comisiones por período
 */
router.get('/commissions/period/:year/:month', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.params;

    const summary = await CommissionCalculationService.getCommissionsSummaryByPeriod(
      parseInt(year),
      parseInt(month)
    );

    return res.json({
      success: true,
      period: `${year}-${month.padStart(2, '0')}`,
      summary
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en GET /commissions/period/:year/:month:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /commissions/:id/mark-paid
 * Marca una comisión como pagada
 */
router.put('/commissions/:id/mark-paid', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await CommissionCalculationService.markCommissionsAsPaid([parseInt(id)]);

    return res.json({
      success: true,
      updated,
      message: 'Comisión marcada como pagada'
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en PUT /commissions/:id/mark-paid:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /commissions/pending/:partnerId
 * Obtiene resumen de comisiones pendientes de un partner
 */
router.get('/commissions/pending/:partnerId', authMiddleware, async (req, res) => {
  try {
    const { partnerId } = req.params;

    const pending = await CommissionCalculationService.getPartnerPendingCommissions(parseInt(partnerId));

    return res.json({
      success: true,
      partner_id: parseInt(partnerId),
      pending
    });
  } catch (error) {
    console.error('❌ [VENDOR AUTOMATION] Error en GET /commissions/pending/:partnerId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;