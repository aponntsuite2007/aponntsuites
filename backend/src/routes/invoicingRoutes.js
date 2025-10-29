/**
 * ROUTES: Invoicing System
 *
 * Endpoints para el sistema de facturación, pagos y comisiones.
 * Incluye funcionalidad crítica de activación de empresas.
 */

const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const CommissionCalculationService = require('../services/CommissionCalculationService');
const { sequelize } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de recibos
const storage = multer.diskStorage({
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

const upload = multer({
  storage,
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

// =============================================
// PAYMENTS - Registro de Pagos
// =============================================

/**
 * POST /api/invoicing/payments
 * Registra un pago y ejecuta todo el flujo:
 * - Marca factura como paid
 * - Genera comisiones
 * - Activa empresa si está pendiente_aprobacion
 */
router.post('/payments', upload.single('receipt'), async (req, res) => {
  try {
    console.log('\n📥 [API] POST /api/invoicing/payments - Recibido');

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
    console.error('❌ [API] Error en POST /payments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error registrando pago'
    });
  }
});

/**
 * GET /api/invoicing/payments/:companyId
 * Obtiene historial de pagos de una empresa
 */
router.get('/payments/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const payments = await PaymentService.getCompanyPaymentHistory(parseInt(companyId));

    return res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('❌ [API] Error en GET /payments/:companyId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/invoicing/payments/details/:paymentId
 * Obtiene detalles de un pago específico
 */
router.get('/payments/details/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await PaymentService.getPaymentDetails(parseInt(paymentId));

    return res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('❌ [API] Error en GET /payments/details/:paymentId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// =============================================
// INVOICES - Facturas
// =============================================

/**
 * GET /api/invoicing/invoices
 * Lista todas las facturas (con filtros opcionales)
 */
router.get('/invoices', async (req, res) => {
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
    console.error('❌ [API] Error en GET /invoices:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/invoicing/invoices/:id
 * Obtiene detalles de una factura específica
 */
router.get('/invoices/:id', async (req, res) => {
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
    console.error('❌ [API] Error en GET /invoices/:id:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// =============================================
// COMMISSIONS - Comisiones
// =============================================

/**
 * GET /api/invoicing/commissions/partner/:partnerId
 * Obtiene comisiones de un partner específico
 */
router.get('/commissions/partner/:partnerId', async (req, res) => {
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
    console.error('❌ [API] Error en GET /commissions/partner/:partnerId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/invoicing/commissions/period/:year/:month
 * Obtiene resumen de comisiones por período
 */
router.get('/commissions/period/:year/:month', async (req, res) => {
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
    console.error('❌ [API] Error en GET /commissions/period/:year/:month:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/invoicing/commissions/:id/mark-paid
 * Marca una comisión como pagada
 */
router.put('/commissions/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await CommissionCalculationService.markCommissionsAsPaid([parseInt(id)]);

    return res.json({
      success: true,
      updated,
      message: 'Comisión marcada como pagada'
    });
  } catch (error) {
    console.error('❌ [API] Error en PUT /commissions/:id/mark-paid:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/invoicing/commissions/pending/:partnerId
 * Obtiene resumen de comisiones pendientes de un partner
 */
router.get('/commissions/pending/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;

    const pending = await CommissionCalculationService.getPartnerPendingCommissions(parseInt(partnerId));

    return res.json({
      success: true,
      partner_id: parseInt(partnerId),
      pending
    });
  } catch (error) {
    console.error('❌ [API] Error en GET /commissions/pending/:partnerId:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
