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

// Configurar multer para subida de PDFs de facturas
const invoicePdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const companyId = req.params.companyId || 'general';
    const uploadPath = path.join(__dirname, `../../uploads/invoices/${companyId}`);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const invoiceNumber = req.invoiceNumber || `INV-${Date.now()}`;
    cb(null, `${invoiceNumber}.pdf`);
  }
});

const uploadInvoicePdf = multer({
  storage: invoicePdfStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos PDF'));
  }
});

// ==============================================
// 📄 INTEGRACIÓN DMS - SSOT DOCUMENTAL
// ==============================================
const registerReceiptInDMS = async (req, file, companyId, invoiceId, userId) => {
    try {
        const dmsService = req.app.get('dmsIntegrationService');
        if (!dmsService) {
            console.warn('⚠️ [INVOICING-DMS] DMSIntegrationService no disponible');
            return null;
        }

        const result = await dmsService.registerDocument({
            module: 'invoicing',
            documentType: 'INV_RECEIPT',
            companyId,
            employeeId: userId,
            createdById: userId,
            sourceEntityType: 'invoice-payment',
            sourceEntityId: invoiceId,
            file: {
                buffer: fs.readFileSync(file.path),
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size
            },
            title: `Payment Receipt - Invoice ${invoiceId}`,
            description: `Comprobante de pago para factura ${invoiceId}`,
            metadata: {
                invoiceId,
                originalPath: file.path,
                uploadRoute: req.originalUrl
            }
        });

        console.log(`📄 [DMS-INVOICING] Recibo registrado: ${result.document?.id}`);
        return result;
    } catch (error) {
        console.error('❌ [DMS-INVOICING] Error registrando recibo:', error.message);
        return null;
    }
};

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

    // ✅ Registrar recibo en DMS (SSOT)
    let dmsResult = null;
    if (req.file) {
        dmsResult = await registerReceiptInDMS(
            req, req.file, parseInt(company_id), parseInt(invoice_id), req.user.user_id
        );
    }

    return res.status(201).json({
        ...result,
        dms: dmsResult ? { documentId: dmsResult.document?.id } : null
    });

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

// =============================================
// INVOICE PDF & EMAIL - Gestión de PDFs y Envío
// =============================================

/**
 * POST /api/invoicing/invoices/:id/upload-pdf
 * Sube el PDF de una factura
 */
router.post('/invoices/:id/upload-pdf', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Obtener datos de la factura primero
    const [invoice] = await sequelize.query(
      `SELECT i.*, c.company_id as cid FROM invoices i
       JOIN companies c ON c.company_id = i.company_id
       WHERE i.id = :invoiceId`,
      { replacements: { invoiceId: parseInt(id) }, type: sequelize.QueryTypes.SELECT }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Guardar datos para multer
    req.params.companyId = invoice.company_id;
    req.invoiceNumber = invoice.invoice_number;

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}, uploadInvoicePdf.single('invoice_pdf'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió archivo PDF' });
    }

    const userId = req.user?.user_id || null;
    const relativePath = `uploads/invoices/${req.params.companyId}/${req.file.filename}`;

    // Actualizar factura con ruta del PDF
    await sequelize.query(
      `UPDATE invoices SET
        invoice_pdf_path = :pdfPath,
        invoice_pdf_uploaded_at = NOW(),
        invoice_pdf_uploaded_by = :userId,
        updated_at = NOW()
       WHERE id = :invoiceId`,
      {
        replacements: {
          pdfPath: relativePath,
          userId,
          invoiceId: parseInt(id)
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // Registrar en DMS si está disponible
    let dmsResult = null;
    try {
      const dmsService = req.app.get('dmsIntegrationService');
      if (dmsService) {
        dmsResult = await dmsService.registerDocument({
          module: 'invoicing',
          documentType: 'INV_INVOICE_PDF',
          companyId: parseInt(req.params.companyId),
          employeeId: userId,
          createdById: userId,
          sourceEntityType: 'invoice',
          sourceEntityId: id,
          file: {
            buffer: fs.readFileSync(req.file.path),
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          },
          title: `Factura ${req.invoiceNumber}`,
          description: `PDF de factura ${req.invoiceNumber}`,
          metadata: { invoiceId: id, invoiceNumber: req.invoiceNumber }
        });
      }
    } catch (dmsError) {
      console.warn('⚠️ [INVOICE-PDF] DMS no disponible:', dmsError.message);
    }

    console.log(`✅ [INVOICE-PDF] PDF subido: ${relativePath}`);

    return res.json({
      success: true,
      message: 'PDF de factura subido exitosamente',
      pdf_path: relativePath,
      dms_document_id: dmsResult?.document?.id || null
    });

  } catch (error) {
    console.error('❌ [API] Error en POST /invoices/:id/upload-pdf:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/invoicing/invoices/:id/send-email
 * Envía la factura por email al cliente
 */
router.post('/invoices/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      to_email,      // Email destino (opcional, usa contact_email de company si no se especifica)
      subject,       // Asunto personalizado (opcional)
      body,          // Cuerpo del mensaje (opcional)
      cc_emails      // CC adicionales (opcional)
    } = req.body;

    // Obtener factura con datos de empresa
    const [invoice] = await sequelize.query(
      `SELECT i.*, c.name as company_name, c.contact_email, c.email as company_email
       FROM invoices i
       JOIN companies c ON c.company_id = i.company_id
       WHERE i.id = :invoiceId`,
      { replacements: { invoiceId: parseInt(id) }, type: sequelize.QueryTypes.SELECT }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Verificar que tiene PDF
    if (!invoice.invoice_pdf_path) {
      return res.status(400).json({
        success: false,
        message: 'La factura no tiene PDF adjunto. Suba el PDF primero.'
      });
    }

    // Determinar email destino
    const destinationEmail = to_email || invoice.contact_email || invoice.company_email;
    if (!destinationEmail) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró email de destino. Especifique to_email.'
      });
    }

    // Construir asunto y cuerpo
    const emailSubject = subject || `Factura ${invoice.invoice_number} - Sistema Biométrico`;
    const emailBody = body || `
Estimado cliente,

Adjuntamos la factura ${invoice.invoice_number} correspondiente a los servicios del Sistema Biométrico Enterprise.

Detalles:
- Número de factura: ${invoice.invoice_number}
- Monto: ${invoice.currency || 'USD'} ${parseFloat(invoice.total_amount).toFixed(2)}
- Vencimiento: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('es-AR') : 'Ver factura'}

Por favor, no dude en contactarnos si tiene alguna consulta.

Saludos cordiales,
Equipo de Facturación
Sistema Biométrico Enterprise
    `.trim();

    // Incrementar intentos de envío
    await sequelize.query(
      `UPDATE invoices SET send_attempts = COALESCE(send_attempts, 0) + 1, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: parseInt(id) }, type: sequelize.QueryTypes.UPDATE }
    );

    // Intentar envío con NotificationUnifiedService
    let sendResult = { success: false };
    try {
      const notificationService = req.app.get('notificationUnifiedService');

      if (notificationService) {
        const pdfFullPath = path.join(__dirname, '../..', invoice.invoice_pdf_path);

        sendResult = await notificationService.sendEmail({
          to: destinationEmail,
          cc: cc_emails ? cc_emails.split(',').map(e => e.trim()) : [],
          subject: emailSubject,
          html: emailBody.replace(/\n/g, '<br>'),
          text: emailBody,
          attachments: [{
            filename: `${invoice.invoice_number}.pdf`,
            path: pdfFullPath
          }]
        });
      } else {
        // Fallback: marcar como enviado aunque no haya servicio (para testing)
        console.warn('⚠️ [INVOICE-EMAIL] NotificationUnifiedService no disponible, marcando como enviado');
        sendResult = { success: true, fallback: true };
      }
    } catch (sendError) {
      console.error('❌ [INVOICE-EMAIL] Error enviando:', sendError.message);

      // Guardar error
      await sequelize.query(
        `UPDATE invoices SET last_send_error = :error, updated_at = NOW() WHERE id = :id`,
        { replacements: { error: sendError.message, id: parseInt(id) }, type: sequelize.QueryTypes.UPDATE }
      );

      return res.status(500).json({
        success: false,
        message: 'Error enviando email: ' + sendError.message
      });
    }

    // Actualizar factura con datos de envío
    const userId = req.user?.user_id || null;
    await sequelize.query(
      `UPDATE invoices SET
        sent_at = NOW(),
        sent_to_email = :toEmail,
        sent_by = :userId,
        email_subject = :subject,
        email_body = :body,
        last_send_error = NULL,
        updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          toEmail: destinationEmail,
          userId,
          subject: emailSubject,
          body: emailBody,
          id: parseInt(id)
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    console.log(`✅ [INVOICE-EMAIL] Factura ${invoice.invoice_number} enviada a ${destinationEmail}`);

    return res.json({
      success: true,
      message: `Factura enviada exitosamente a ${destinationEmail}`,
      sent_to: destinationEmail,
      sent_at: new Date().toISOString(),
      invoice_number: invoice.invoice_number,
      fallback_mode: sendResult.fallback || false
    });

  } catch (error) {
    console.error('❌ [API] Error en POST /invoices/:id/send-email:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/invoicing/invoices/:id/pdf
 * Descarga el PDF de una factura
 */
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const [invoice] = await sequelize.query(
      'SELECT invoice_pdf_path, invoice_number FROM invoices WHERE id = :id',
      { replacements: { id: parseInt(id) }, type: sequelize.QueryTypes.SELECT }
    );

    if (!invoice || !invoice.invoice_pdf_path) {
      return res.status(404).json({ success: false, message: 'PDF no encontrado' });
    }

    const pdfPath = path.join(__dirname, '../..', invoice.invoice_pdf_path);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, message: 'Archivo PDF no existe' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ [API] Error en GET /invoices/:id/pdf:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
