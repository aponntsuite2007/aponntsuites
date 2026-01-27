/**
 * ROUTES: Quotes (Presupuestos)
 *
 * Endpoints REST para gestión de presupuestos con trials
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QuoteManagementService = require('../services/QuoteManagementService');
const { auth: authMiddleware } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Middleware para verificar token de staff (Aponnt admin panel)
 */
const verifyStaffToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') ||
                      req.cookies?.aponnt_token_staff;

        if (!token) {
            return res.status(401).json({ success: false, error: 'No autorizado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');

        req.staff = {
            id: decoded.staff_id || decoded.staffId,
            email: decoded.email,
            full_name: decoded.full_name || decoded.name,
            role: decoded.role_code || decoded.role,
            area: decoded.area,
            level: decoded.level
        };

        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Token inválido' });
    }
};

/**
 * GET /api/quotes
 * Obtiene TODOS los presupuestos (para panel administrativo Aponnt)
 * Query params: status, search, limit, offset
 */
router.get('/', verifyStaffToken, async (req, res) => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;

    let whereClause = '1=1';
    const replacements = {};

    if (status) {
      whereClause += ' AND q.status = :status';
      replacements.status = status;
    }

    if (search) {
      whereClause += ' AND (q.quote_number ILIKE :search OR c.name ILIKE :search)';
      replacements.search = `%${search}%`;
    }

    const quotes = await sequelize.query(`
      SELECT
        q.*,
        c.name as company_name,
        c.contact_email as company_email
      FROM quotes q
      LEFT JOIN companies c ON q.company_id = c.company_id
      WHERE ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { ...replacements, limit: parseInt(limit), offset: parseInt(offset) },
      type: QueryTypes.SELECT
    });

    const countResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM quotes q
      LEFT JOIN companies c ON q.company_id = c.company_id
      WHERE ${whereClause}
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      quotes,
      count: quotes.length,
      total: parseInt(countResult[0]?.total || 0)
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo presupuestos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/company/:companyId
 * Obtiene todos los presupuestos de una empresa
 */
router.get('/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, seller_id } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (seller_id) filters.seller_id = seller_id;

    const quotes = await QuoteManagementService.getCompanyQuotes(companyId, filters);

    res.json({
      success: true,
      quotes,
      count: quotes.length
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo presupuestos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/company/:companyId/active
 * Obtiene el presupuesto activo de una empresa
 */
router.get('/company/:companyId/active', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;

    const quote = await QuoteManagementService.getActiveQuote(companyId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'No hay presupuesto activo para esta empresa'
      });
    }

    res.json({
      success: true,
      quote
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo presupuesto activo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes
 * Crea un nuevo presupuesto
 *
 * Body:
 * {
 *   company_id: number,
 *   seller_id: number,
 *   modules_data: [{module_key, module_name, price, quantity}],
 *   notes: string (optional),
 *   terms_and_conditions: string (optional),
 *   created_by: number (optional)
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const result = await QuoteManagementService.createQuote(req.body);

    res.status(201).json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error creando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/send
 * Envía un presupuesto al cliente (draft → sent)
 */
router.post('/:id/send', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const result = await QuoteManagementService.sendQuote(id, userId);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error enviando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/accept
 * Cliente acepta el presupuesto (inicia trial o activa directamente)
 */
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const options = req.body || {};

    const result = await QuoteManagementService.acceptQuote(id, options);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error aceptando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/reject
 * Cliente rechaza el presupuesto
 *
 * Body:
 * {
 *   reason: string (optional)
 * }
 */
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await QuoteManagementService.rejectQuote(id, reason);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error rechazando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/activate
 * Activa un presupuesto (post-trial)
 */
router.post('/:id/activate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await QuoteManagementService.activateQuote(id);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error activando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/quotes/seller/:sellerId/stats
 * Obtiene estadísticas de presupuestos por vendedor
 *
 * Query params:
 *   - date_from: YYYY-MM-DD
 *   - date_to: YYYY-MM-DD
 */
router.get('/seller/:sellerId/stats', authMiddleware, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { date_from, date_to } = req.query;

    const dateRange = {};
    if (date_from) dateRange.date_from = date_from;
    if (date_to) dateRange.date_to = date_to;

    const stats = await QuoteManagementService.getSellerStats(sellerId, dateRange);

    res.json({
      success: true,
      seller_id: sellerId,
      stats
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINTS ADICIONALES PARA CIRCUITO COMPLETO
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/quotes/:id/send-email
 * Envía el presupuesto por email al cliente
 */
router.post('/:id/send-email', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { to_email, message } = req.body;

    // Obtener el quote con datos de empresa
    const { sequelize, Company } = require('../config/database');
    const { QueryTypes } = require('sequelize');

    const quotes = await sequelize.query(
      `SELECT q.*, c.name as company_name, c.contact_email as company_email
       FROM quotes q
       JOIN companies c ON q.company_id = c.company_id
       WHERE q.id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const quote = quotes[0];
    const recipientEmail = to_email || quote.company_email;

    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'No hay email de destino' });
    }

    // Generar token público para el cliente
    const jwt = require('jsonwebtoken');
    const publicToken = jwt.sign(
      { quote_id: quote.id, quote_number: quote.quote_number },
      process.env.JWT_SECRET || 'aponnt-secret-key',
      { expiresIn: '30d' }
    );

    // Construir URL pública
    const baseUrl = process.env.BASE_URL || 'http://localhost:9998';
    const publicUrl = `${baseUrl}/presupuesto/${publicToken}`;

    // Generar HTML del email
    const modulesData = quote.modules_data || [];
    const modulesHtml = modulesData.map(m =>
      `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${m.module_name}</td>
       <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">USD $${m.price}/mes</td></tr>`
    ).join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">APONNT 360°</h1>
          <p style="color: white; margin: 5px 0 0 0;">Presupuesto ${quote.quote_number}</p>
        </div>

        <div style="padding: 20px;">
          <p>Estimado/a,</p>
          <p>Le enviamos el presupuesto solicitado para <strong>${quote.company_name}</strong>.</p>

          ${message ? `<p style="background: #f0f0f0; padding: 15px; border-radius: 8px;">${message}</p>` : ''}

          <h3 style="color: #f59e0b;">Módulos incluidos</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${modulesHtml}
            <tr style="background: #f59e0b; color: white;">
              <td style="padding: 12px; font-weight: bold;">TOTAL MENSUAL</td>
              <td style="padding: 12px; text-align: right; font-weight: bold;">USD $${quote.total_amount}/mes</td>
            </tr>
          </table>

          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #2e7d32; margin: 0;"><strong>🎁 Trial de 30 días 100% bonificado</strong></p>
            <p style="color: #2e7d32; margin: 5px 0 0 0; font-size: 14px;">Pruebe todos los módulos sin compromiso</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${publicUrl}"
               style="background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ✅ Ver y Aceptar Presupuesto
            </a>
          </div>

          <p style="color: #666; font-size: 12px;">
            Este presupuesto es válido por 30 días. Si tiene consultas, responda a este email.
          </p>
        </div>
      </div>
    `;

    // Enviar email
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"APONNT" <noreply@aponnt.com>',
        to: recipientEmail,
        subject: `Presupuesto ${quote.quote_number} - APONNT 360°`,
        html: emailHtml
      });

      // Marcar como enviado
      await QuoteManagementService.sendQuote(id, req.user?.id);

      res.json({
        success: true,
        message: `Presupuesto enviado a ${recipientEmail}`,
        public_url: publicUrl
      });

    } catch (emailError) {
      console.error('❌ [QUOTES] Error enviando email:', emailError.message);
      res.status(500).json({
        success: false,
        error: 'Error enviando email: ' + emailError.message,
        public_url: publicUrl // Aún devolvemos la URL para copia manual
      });
    }

  } catch (error) {
    console.error('❌ [QUOTES API] Error enviando email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/:id/pdf
 * Genera PDF del presupuesto
 */
router.get('/:id/pdf', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');
    const PDFDocument = require('pdfkit');

    // Obtener datos del quote
    const quotes = await sequelize.query(
      `SELECT q.*, c.name as company_name, c.contact_email, c.tax_id, c.contact_phone, c.address
       FROM quotes q
       JOIN companies c ON q.company_id = c.company_id
       WHERE q.id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const quote = quotes[0];
    const modulesData = quote.modules_data || [];

    // Crear PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Presupuesto-${quote.quote_number}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#f59e0b').text('APONNT 360°', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Sistema de Gestión Empresarial', { align: 'center' });
    doc.moveDown();

    // Título
    doc.fontSize(18).fillColor('#000').text(`PRESUPUESTO ${quote.quote_number}`, { align: 'center' });
    doc.moveDown();

    // Datos del cliente
    doc.fontSize(12).fillColor('#000');
    doc.text(`Cliente: ${quote.company_name}`);
    if (quote.tax_id) doc.text(`CUIT: ${quote.tax_id}`);
    if (quote.contact_email) doc.text(`Email: ${quote.contact_email}`);
    if (quote.contact_phone) doc.text(`Teléfono: ${quote.contact_phone}`);
    doc.moveDown();

    // Fecha
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`);
    doc.text(`Válido hasta: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-AR') : '30 días'}`);
    doc.moveDown();

    // Módulos
    doc.fontSize(14).fillColor('#f59e0b').text('MÓDULOS INCLUIDOS', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#000');
    modulesData.forEach((mod, i) => {
      doc.text(`${i + 1}. ${mod.module_name}`, { continued: true });
      doc.text(`  USD $${mod.price}/mes`, { align: 'right' });
    });

    doc.moveDown();
    doc.fontSize(14).fillColor('#f59e0b').text('─'.repeat(50));
    doc.fontSize(16).fillColor('#000').text(`TOTAL MENSUAL: USD $${quote.total_amount}/mes`, { align: 'right' });

    // Trial
    if (quote.has_trial) {
      doc.moveDown();
      doc.fontSize(12).fillColor('#22c55e');
      doc.text('🎁 TRIAL DE 30 DÍAS - 100% BONIFICADO', { align: 'center' });
      doc.fontSize(10).text('Pruebe todos los módulos sin compromiso', { align: 'center' });
    }

    // Notas
    if (quote.notes) {
      doc.moveDown();
      doc.fontSize(10).fillColor('#666').text('Notas:', { underline: true });
      doc.text(quote.notes);
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999');
    doc.text('Este presupuesto no constituye factura. Precios en USD.', { align: 'center' });
    doc.text('APONNT - Sistema de Asistencia Biométrico', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('❌ [QUOTES API] Error generando PDF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/public/:token
 * Vista pública del presupuesto (sin auth)
 */
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const jwt = require('jsonwebtoken');

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }

    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');

    // Obtener quote
    const quotes = await sequelize.query(
      `SELECT q.*, c.name as company_name, c.contact_email
       FROM quotes q
       JOIN companies c ON q.company_id = c.company_id
       WHERE q.id = :id`,
      { replacements: { id: decoded.quote_id }, type: QueryTypes.SELECT }
    );

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const quote = quotes[0];

    res.json({
      success: true,
      quote: {
        quote_number: quote.quote_number,
        company_name: quote.company_name,
        modules_data: quote.modules_data,
        total_amount: quote.total_amount,
        status: quote.status,
        has_trial: quote.has_trial,
        valid_until: quote.valid_until,
        sent_date: quote.sent_date,
        can_accept: ['draft', 'sent'].includes(quote.status)
      }
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error vista pública:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/public/:token/accept
 * Cliente acepta el presupuesto (sin auth)
 */
router.post('/public/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const jwt = require('jsonwebtoken');

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }

    const result = await QuoteManagementService.acceptQuote(decoded.quote_id);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error aceptando (público):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/public/:token/reject
 * Cliente rechaza el presupuesto (sin auth)
 */
router.post('/public/:token/reject', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;
    const jwt = require('jsonwebtoken');

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }

    const result = await QuoteManagementService.rejectQuote(decoded.quote_id, reason);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error rechazando (público):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
