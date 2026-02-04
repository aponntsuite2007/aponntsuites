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
const NCE = require('../services/NotificationCentralExchange');

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

    if (req.query.lead_id) {
      whereClause += ' AND q.lead_id = :lead_id';
      replacements.lead_id = parseInt(req.query.lead_id);
    }

    if (search) {
      whereClause += ' AND (q.quote_number ILIKE :search OR c.name ILIKE :search)';
      replacements.search = `%${search}%`;
    }

    const quotes = await sequelize.query(`
      SELECT
        q.*,
        c.name as company_name,
        c.contact_email as company_email,
        c.legal_name as company_legal_name,
        c.tax_id as company_tax_id,
        c.address as company_address,
        c.city as company_city,
        c.province as company_province,
        c.country as company_country,
        c.phone as company_phone,
        c.metadata as company_metadata,
        c.is_active as company_is_active,
        c.status as company_status
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
 * GET /api/quotes/pipeline-stats
 * Estadísticas agrupadas por status para funnel visual
 */
router.get('/pipeline-stats', verifyStaffToken, async (req, res) => {
  try {
    const stats = await sequelize.query(`
      SELECT
        status,
        COUNT(*)::int as count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)::numeric, 1) as avg_days
      FROM quotes
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'draft' THEN 1 WHEN 'sent' THEN 2 WHEN 'in_trial' THEN 3
          WHEN 'accepted' THEN 4 WHEN 'active' THEN 5 WHEN 'rejected' THEN 6
          ELSE 7
        END
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ [QUOTES API] Error pipeline-stats:', error);
    res.status(500).json({ success: false, error: error.message });
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
 * POST /api/quotes/:id/revert-to-sent
 * Revierte un presupuesto a estado "sent" (solo managers/admin)
 * Body: { reason: string }
 */
router.post('/:id/revert-to-sent', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const staffRole = req.staff?.role;
    const staffId = req.staff?.id;

    // Solo managers y admins pueden revertir (level <= 1 = gerente o superior)
    const staffLevel = req.staff?.level;
    if (staffLevel === undefined || staffLevel === null || staffLevel > 1) {
      return res.status(403).json({
        success: false,
        error: 'Solo gerentes y administradores pueden revertir presupuestos'
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar una razón (mínimo 5 caracteres)'
      });
    }

    const result = await QuoteManagementService.revertToSent(id, staffId, reason.trim());

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error revirtiendo presupuesto:', error);
    res.status(error.message.includes('No se puede revertir') ? 409 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/quotes/:id/change-status
 * Cambia el estado de un presupuesto manualmente
 * Body: { new_status: string }
 */
router.post('/:id/change-status', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_status } = req.body;
    const staffId = req.staff?.id;

    const validStatuses = ['draft', 'sent', 'in_trial', 'accepted', 'active', 'rejected'];
    if (!new_status || !validStatuses.includes(new_status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido. Valores permitidos: ' + validStatuses.join(', ')
      });
    }

    // Get current quote
    const [quote] = await sequelize.query(
      `SELECT id, status, status_history FROM quotes WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const oldStatus = quote.status;
    const history = quote.status_history || [];
    history.push({
      from: oldStatus,
      to: new_status,
      changed_by: staffId,
      changed_at: new Date().toISOString(),
      reason: 'Cambio manual de estado'
    });

    // Update status
    await sequelize.query(`
      UPDATE quotes
      SET status = :new_status,
          status_history = :history,
          accepted_date = CASE WHEN :new_status = 'accepted' AND accepted_date IS NULL THEN NOW() ELSE accepted_date END,
          updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: { id, new_status, history: JSON.stringify(history) },
      type: QueryTypes.UPDATE
    });

    console.log(`✅ [QUOTES] Estado cambiado: ${id} ${oldStatus} → ${new_status}`);

    res.json({
      success: true,
      old_status: oldStatus,
      new_status: new_status,
      message: `Estado cambiado de ${oldStatus} a ${new_status}`
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error cambiando estado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/:id/status-history
 * Obtiene el historial de cambios de estado de un presupuesto
 */
router.get('/:id/status-history', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;

    const quotes = await sequelize.query(
      `SELECT status_history FROM quotes WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    res.json({
      success: true,
      quote_id: parseInt(id),
      status_history: quotes[0].status_history || []
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo historial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/:id/send-email
 * Envía el presupuesto por email al cliente
 *
 * ACTUALIZADO: Usa configuración SMTP de aponnt_email_config (tipo 'commercial')
 * - Incluye BCC si está configurado
 * - Guarda log en email_logs para tracking
 */
router.post('/:id/send-email', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { to_email, message } = req.body;

    // Obtener el quote con datos de empresa
    const { sequelize, Company } = require('../config/database');
    const { QueryTypes } = require('sequelize');
    const EmailConfigService = require('../services/EmailConfigService');
    const crypto = require('crypto');

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

    // Construir URL pública (detectar producción automáticamente)
    let baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      // Detectar si está en Render
      if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        baseUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
      } else if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        baseUrl = 'https://aponnt.onrender.com'; // Fallback hardcoded para producción
      } else {
        baseUrl = 'http://localhost:9998';
      }
    }
    const publicUrl = `${baseUrl}/presupuesto/${publicToken}`;
    console.log('📧 [QUOTES] URL pública generada:', publicUrl, '| BASE_URL env:', process.env.BASE_URL || 'no definido');

    // ==== OBTENER CONFIGURACIÓN SMTP DE LA BD (tipo 'commercial') ====
    let smtpConfig = null;
    let bccEmail = null;
    let fromEmail = process.env.SMTP_FROM || '"APONNT" <noreply@aponnt.com>';

    try {
      smtpConfig = await EmailConfigService.getConfigByType('commercial');
      if (smtpConfig) {
        console.log('📧 [QUOTES] Usando config SMTP de BD:', smtpConfig.from_email);
        bccEmail = smtpConfig.bcc_email;
        fromEmail = `"${smtpConfig.from_name || 'APONNT Comercial'}" <${smtpConfig.from_email}>`;
        if (bccEmail) {
          console.log('📧 [QUOTES] BCC configurado:', bccEmail);
        }
      }
    } catch (configError) {
      console.warn('⚠️ [QUOTES] No se pudo obtener config de BD, usando env vars:', configError.message);
    }

    // Generar tracking ID para este email
    const trackingId = crypto.randomUUID();

    // Generar HTML del email
    const modulesData = quote.modules_data || [];
    const modulesHtml = modulesData.map(m =>
      `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${m.module_name}</td>
       <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">USD $${m.price}/mes</td></tr>`
    ).join('');

    // Tracking pixel URL
    const trackingPixelUrl = `${baseUrl}/api/email/track/${trackingId}/open`;

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
        <!-- Tracking pixel -->
        <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
      </div>
    `;

    // Configurar transporter
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpConfig?.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(smtpConfig?.smtp_port || process.env.SMTP_PORT || '587'),
      secure: smtpConfig?.smtp_secure || process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpConfig?.from_email || process.env.SMTP_USER,
        pass: smtpConfig?.app_password_decrypted || smtpConfig?.smtp_password_decrypted || process.env.SMTP_PASS
      }
    });

    // Preparar opciones de email
    const mailOptions = {
      from: fromEmail,
      to: recipientEmail,
      subject: `Presupuesto ${quote.quote_number} - APONNT 360°`,
      html: emailHtml
    };

    // Agregar BCC si está configurado
    if (bccEmail) {
      mailOptions.bcc = bccEmail;
      console.log('📧 [QUOTES] Agregando BCC:', bccEmail);
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ [QUOTES] Email enviado:', info.messageId);

      // ==== GUARDAR LOG EN email_logs ====
      try {
        await sequelize.query(`
          INSERT INTO email_logs (
            sender_type, recipient_email, recipient_name,
            subject, status, sent_at, message_id,
            tracking_id, category, priority, created_at, updated_at
          ) VALUES (
            'aponnt', :recipientEmail, :companyName,
            :subject, 'sent', NOW(), :messageId,
            :trackingId::uuid, 'quote', 'normal', NOW(), NOW()
          )
        `, {
          replacements: {
            recipientEmail,
            companyName: quote.company_name,
            subject: `Presupuesto ${quote.quote_number} - APONNT 360°`,
            messageId: info.messageId,
            trackingId
          }
        });
        console.log('📝 [QUOTES] Log guardado en email_logs con tracking_id:', trackingId);
      } catch (logError) {
        console.error('⚠️ [QUOTES] Error guardando log (email sí se envió):', logError.message);
      }

      // Marcar como enviado
      await QuoteManagementService.sendQuote(id, req.user?.id);

      res.json({
        success: true,
        message: `Presupuesto enviado a ${recipientEmail}${bccEmail ? ' (con copia a ' + bccEmail + ')' : ''}`,
        public_url: publicUrl,
        tracking_id: trackingId
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

// ═══════════════════════════════════════════════════════════
// CIRCUITO: Quote → Factura → Pago → Alta Definitiva
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/quotes/:id/generate-invoice
 * LEGACY: Genera factura inicial desde un quote activo
 * NOTA: En el nuevo flujo se usa /upload-invoice para cargar facturas ya emitidas
 */
router.post('/:id/generate-invoice', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.staff?.id || null;

    const result = await QuoteManagementService.generateInvoiceFromQuote(id, userId);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error generando factura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// Multer para upload de facturas
// ═══════════════════════════════════════════════════════════
const multerInvoice = require('multer');
const pathInvoice = require('path');
const fsInvoice = require('fs');

const invoiceStorage = multerInvoice.diskStorage({
  destination: function(req, file, cb) {
    const dir = pathInvoice.join(__dirname, '../../public/uploads/invoices');
    if (!fsInvoice.existsSync(dir)) fsInvoice.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const ext = pathInvoice.extname(file.originalname);
    const safeNumber = (req.body.invoice_number || '').replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `invoice_quote_${req.params.id}_${safeNumber}_${Date.now()}${ext}`);
  }
});

const uploadInvoiceFile = multerInvoice({
  storage: invoiceStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: function(req, file, cb) {
    const ext = pathInvoice.extname(file.originalname).toLowerCase();
    cb(null, ext === '.pdf');
  }
});

/**
 * POST /api/quotes/:id/upload-invoice
 * Carga una factura ya emitida (CAE/AFIP) para el quote
 * Body (multipart): invoice_number, total_amount, due_date, notes
 * File: invoice_pdf
 */
router.post('/:id/upload-invoice', verifyStaffToken, uploadInvoiceFile.single('invoice_pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const { invoice_number, total_amount, due_date, notes } = req.body;

    if (!invoice_number) {
      return res.status(400).json({ success: false, error: 'Número de factura requerido' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Archivo PDF de factura requerido' });
    }

    // Get quote to verify it exists
    const [quotes] = await sequelize.query(
      `SELECT q.id, q.company_id, c.name as company_name, q.total_amount
       FROM quotes q
       LEFT JOIN companies c ON q.company_id = c.company_id
       WHERE q.id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (!quotes) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const quote = quotes;

    // Check if invoice already exists for this quote
    const [existingInvoices] = await sequelize.query(
      `SELECT id FROM invoices WHERE quote_id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    const pdfPath = `uploads/invoices/${req.file.filename}`;
    const invoiceAmount = total_amount ? parseFloat(total_amount) : parseFloat(quote.total_amount || 0);
    const invoiceDueDate = due_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    const staffId = req.staff?.id || null;

    let invoiceId;
    let isUpdate = false;

    if (existingInvoices) {
      // Update existing invoice
      isUpdate = true;
      invoiceId = existingInvoices.id;
      await sequelize.query(`
        UPDATE invoices SET
          invoice_number = :invoice_number,
          total_amount = :total_amount,
          due_date = :due_date,
          invoice_pdf_path = :pdf_path,
          notes = :notes,
          status = CASE WHEN status = 'draft' THEN 'pending' ELSE status END,
          updated_at = NOW()
        WHERE id = :invoiceId
      `, {
        replacements: {
          invoiceId,
          invoice_number,
          total_amount: invoiceAmount,
          due_date: invoiceDueDate,
          pdf_path: pdfPath,
          notes: notes || ''
        },
        type: QueryTypes.UPDATE
      });
    } else {
      // Create new invoice
      const [result] = await sequelize.query(`
        INSERT INTO invoices (
          quote_id, company_id, invoice_number, total_amount, due_date,
          invoice_pdf_path, notes, status, created_by, created_at, updated_at
        ) VALUES (
          :quote_id, :company_id, :invoice_number, :total_amount, :due_date,
          :pdf_path, :notes, 'pending', :created_by, NOW(), NOW()
        ) RETURNING id
      `, {
        replacements: {
          quote_id: id,
          company_id: quote.company_id,
          invoice_number,
          total_amount: invoiceAmount,
          due_date: invoiceDueDate,
          pdf_path: pdfPath,
          notes: notes || '',
          created_by: staffId
        },
        type: QueryTypes.INSERT
      });
      invoiceId = result?.id || result;
    }

    // Update quote invoice_id if field exists
    try {
      await sequelize.query(
        `UPDATE quotes SET invoice_id = :invoiceId, updated_at = NOW() WHERE id = :id`,
        { replacements: { invoiceId, id }, type: QueryTypes.UPDATE }
      );
    } catch (e) { /* invoice_id column may not exist */ }

    console.log(`✅ [QUOTES] Factura ${isUpdate ? 'actualizada' : 'cargada'}: ${invoice_number} para quote ${id}`);

    res.json({
      success: true,
      invoice_id: invoiceId,
      invoice_number,
      message: isUpdate ? 'Factura actualizada correctamente' : 'Factura cargada correctamente'
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error cargando factura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/:id/invoice
 * Obtiene la factura asociada al quote
 */
router.get('/:id/invoice', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await QuoteManagementService.getQuoteInvoice(id);

    if (!invoice) {
      return res.json({ success: true, invoice: null, message: 'No hay factura generada para este presupuesto' });
    }

    res.json({ success: true, invoice });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo factura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/:id/billing-status
 * Obtiene estado completo de facturación: pre-factura + factura
 */
router.get('/:id/billing-status', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get quote
    const [quote] = await sequelize.query(
      `SELECT id, company_id, total_amount, invoice_id FROM quotes WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    // Get pre-invoice if exists (linked via admin_notes containing quote_id:X)
    let preInvoice = null;
    try {
      const [preInv] = await sequelize.query(
        `SELECT id, pre_invoice_code, status, total as total_amount, created_at
         FROM aponnt_pre_invoices
         WHERE company_id = :companyId
           AND admin_notes LIKE :quoteRef
         ORDER BY created_at DESC LIMIT 1`,
        { replacements: { companyId: quote.company_id, quoteRef: `%quote_id:${id}%` }, type: QueryTypes.SELECT }
      );
      preInvoice = preInv || null;
    } catch (e) { /* table may not exist */ }

    // Get invoice
    let invoice = null;
    try {
      const [inv] = await sequelize.query(
        `SELECT id, invoice_number, status, total_amount, due_date, sent_at, paid_at, invoice_pdf_path
         FROM invoices WHERE quote_id = :id ORDER BY created_at DESC LIMIT 1`,
        { replacements: { id }, type: QueryTypes.SELECT }
      );
      invoice = inv || null;
    } catch (e) { /* table may not exist */ }

    res.json({
      success: true,
      pre_invoice: preInvoice,
      invoice: invoice
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error obteniendo billing status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/:id/generate-pre-invoice
 * Genera una pre-factura inicial desde el quote
 */
router.post('/:id/generate-pre-invoice', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.staff?.id || null;

    // Get quote
    const [quote] = await sequelize.query(
      `SELECT q.id, q.quote_number, q.company_id, q.total_amount,
              q.modules_data, q.status,
              c.name as company_name, c.name as company_legal_name, c.contact_email
       FROM quotes q
       LEFT JOIN companies c ON q.company_id = c.company_id
       WHERE q.id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    // Check if already has pre-invoice (check by company_id since quote_id column may not exist)
    try {
      const [existing] = await sequelize.query(
        `SELECT id FROM aponnt_pre_invoices WHERE company_id = :companyId AND pre_invoice_code LIKE :pattern LIMIT 1`,
        { replacements: { companyId: quote.company_id, pattern: `PRE-${new Date().getFullYear()}%` }, type: QueryTypes.SELECT }
      );
      // Skip check for now - allow multiple pre-invoices
    } catch (e) { /* ignore */ }

    // Generate pre-invoice code
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM aponnt_pre_invoices WHERE EXTRACT(YEAR FROM created_at) = :year`,
      { replacements: { year }, type: QueryTypes.SELECT }
    ).catch(() => [{ count: 0 }]);
    const count = parseInt(countResult?.count || 0) + 1;
    const preInvoiceCode = `PRE-${year}${month}-${String(count).padStart(4, '0')}`;

    // Create pre-invoice (using only existing columns in aponnt_pre_invoices)
    const companyName = quote.company_legal_name || quote.company_name || 'Sin nombre';
    const today = new Date();
    const periodoDesde = today.toISOString().split('T')[0];
    const periodoHasta = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const totalAmount = parseFloat(quote.total_amount || 0);

    const [result] = await sequelize.query(`
      INSERT INTO aponnt_pre_invoices (
        pre_invoice_code, company_id,
        cliente_cuit, cliente_razon_social, cliente_condicion_iva,
        periodo_desde, periodo_hasta, items,
        subtotal, neto_gravado, total,
        status, observations, admin_notes
      ) VALUES (
        :code, :company_id,
        :cuit, :razon_social, :condicion_iva,
        :periodo_desde, :periodo_hasta, :items,
        :subtotal, :neto_gravado, :total,
        'PENDING_REVIEW', :observations, :admin_notes
      ) RETURNING id, pre_invoice_code
    `, {
      replacements: {
        code: preInvoiceCode,
        company_id: quote.company_id,
        cuit: '00-00000000-0',
        razon_social: companyName,
        condicion_iva: 'Responsable Inscripto',
        periodo_desde: periodoDesde,
        periodo_hasta: periodoHasta,
        items: JSON.stringify([{
          description: `Presupuesto ${quote.quote_number}`,
          quantity: 1,
          unit_price: totalAmount,
          subtotal: totalAmount
        }]),
        subtotal: totalAmount,
        neto_gravado: totalAmount,
        total: totalAmount,
        observations: `Generada desde presupuesto ${quote.quote_number}`,
        admin_notes: `quote_id:${quote.id}`
      },
      type: QueryTypes.INSERT
    });

    const preInvoiceId = result?.[0]?.id || result?.id || result;

    console.log(`✅ [QUOTES] Prefactura generada: ${preInvoiceCode} para quote ${id}`);

    res.json({
      success: true,
      pre_invoice_id: preInvoiceId,
      pre_invoice_code: preInvoiceCode,
      message: 'Prefactura generada correctamente'
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error generando prefactura:', error);
    // Check if table doesn't exist
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      return res.status(500).json({
        success: false,
        error: 'Tabla de prefacturas no existe. Ejecute la migración correspondiente.'
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Note: Legacy invoice endpoints have been deprecated in favor of the new billing flow

/**
 * POST /api/quotes/:id/confirm-payment
 * Registra pago para la factura del quote (wrapper de PaymentService)
 * Body: { amount, payment_method, payment_reference, payment_date, notes }
 * File: receipt (optional, via multipart)
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const receiptStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../public/uploads/receipts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `receipt_quote_${req.params.id}_${Date.now()}${ext}`);
  }
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

router.post('/:id/confirm-payment', verifyStaffToken, uploadReceipt.single('receipt'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, payment_reference, payment_date, notes } = req.body;

    const paymentData = {
      amount: amount ? parseFloat(amount) : undefined,
      payment_method: payment_method || 'transfer',
      payment_reference: payment_reference || '',
      payment_date: payment_date || new Date().toISOString(),
      notes: notes || '',
      registered_by: null  // PaymentService expects UUID; staff IDs are integers
    };

    if (req.file) {
      paymentData.receipt_file_path = `uploads/receipts/${req.file.filename}`;
      paymentData.receipt_file_name = req.file.originalname;
    }

    const result = await QuoteManagementService.confirmPaymentForQuote(id, paymentData);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error confirmando pago:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/public/debug/:token
 * Debug: Ver contenido del token sin verificar firma (solo para diagnóstico)
 */
router.get('/public/debug/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const jwt = require('jsonwebtoken');

    // Decodificar sin verificar para ver contenido
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      return res.json({
        success: false,
        error: 'Token malformado - no se puede decodificar',
        token_preview: token.substring(0, 50) + '...'
      });
    }

    // Intentar verificar y capturar error específico
    let verifyError = null;
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');
    } catch (e) {
      verifyError = {
        name: e.name,
        message: e.message,
        expiredAt: e.expiredAt
      };
    }

    res.json({
      success: !verifyError,
      decoded_header: decoded.header,
      decoded_payload: decoded.payload,
      verify_error: verifyError,
      jwt_secret_preview: (process.env.JWT_SECRET || 'aponnt-secret-key').substring(0, 10) + '...',
      server_time: new Date().toISOString()
    });
  } catch (error) {
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
      console.error('❌ [QUOTES] Error verificando token público:', e.name, e.message);
      const errorDetails = e.name === 'TokenExpiredError'
        ? 'Token expirado'
        : e.name === 'JsonWebTokenError'
          ? 'Token inválido o firma incorrecta'
          : 'Token inválido o expirado';
      return res.status(401).json({ success: false, error: errorDetails, error_type: e.name });
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
      console.error('❌ [QUOTES] Error verificando token para accept:', e.name, e.message);
      const errorDetails = e.name === 'TokenExpiredError'
        ? 'Token expirado'
        : e.name === 'JsonWebTokenError'
          ? 'Token inválido o firma incorrecta'
          : 'Token inválido o expirado';
      return res.status(401).json({ success: false, error: errorDetails, error_type: e.name });
    }

    const { company: companyData, admin: adminData, branches: branchesData } = req.body || {};
    const options = {};
    if (companyData || adminData || branchesData) {
      options.onboardingData = { company: companyData, admin: adminData, branches: branchesData };
    }

    const result = await QuoteManagementService.acceptQuote(decoded.quote_id, options);

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
      console.error('❌ [QUOTES] Error verificando token para reject:', e.name, e.message);
      const errorDetails = e.name === 'TokenExpiredError'
        ? 'Token expirado'
        : e.name === 'JsonWebTokenError'
          ? 'Token inválido o firma incorrecta'
          : 'Token inválido o expirado';
      return res.status(401).json({ success: false, error: errorDetails, error_type: e.name });
    }

    const result = await QuoteManagementService.rejectQuote(decoded.quote_id, reason);

    res.json(result);

  } catch (error) {
    console.error('❌ [QUOTES API] Error rechazando (público):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CONTRATO EULA - Generación, envío y firma
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/quotes/:id/contract/generate
 * Genera el contrato (pasa a draft)
 */
router.post('/:id/contract/generate', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    await sequelize.query(`
      UPDATE quotes SET contract_status = 'draft', updated_at = NOW() WHERE id = :id
    `, { replacements: { id } });
    res.json({ success: true, contract_status: 'draft' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/:id/contract/send
 * Envia el contrato EULA al cliente por email con link de aceptacion
 */
router.post('/:id/contract/send', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const crypto = require('crypto');
    const nodemailer = require('nodemailer');
    const EmailConfigService = require('../services/EmailConfigService');

    // Obtener datos del quote y company
    const quotes = await sequelize.query(`
      SELECT q.*, c.name as company_name, c.contact_email,
        c.legal_name as company_legal_name
      FROM quotes q
      JOIN companies c ON q.company_id = c.company_id
      WHERE q.id = :id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const quote = quotes[0];
    const clientEmail = quote.contact_email;

    if (!clientEmail) {
      return res.status(400).json({ success: false, error: 'La empresa no tiene email de contacto configurado' });
    }

    // Generar token unico para aceptacion (valido 7 dias)
    const acceptanceToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 7);

    // Generar link de aceptacion
    const { getEulaAcceptUrl } = require('../utils/urlHelper');
    const acceptanceLink = getEulaAcceptUrl(acceptanceToken, id);

    // Obtener configuración SMTP desde BD (igual que presupuestos)
    let smtpConfig = null;
    let bccEmail = null;
    try {
      smtpConfig = await EmailConfigService.getConfigByType('commercial');
      if (smtpConfig) {
        bccEmail = smtpConfig.bcc_email;
        if (bccEmail) {
          console.log('📧 [CONTRACT] BCC configurado:', bccEmail);
        }
      }
    } catch (configErr) {
      console.warn('⚠️ [CONTRACT] No se pudo obtener config de email, usando env vars:', configErr.message);
    }

    // Preparar transporter (prioridad: BD config > env vars)
    const transporter = nodemailer.createTransport({
      host: smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(smtpConfig?.port || process.env.SMTP_PORT || '587'),
      secure: smtpConfig?.secure || process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpConfig?.user || process.env.SMTP_USER,
        pass: smtpConfig?.password || process.env.SMTP_PASS
      }
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">APONNT 360</h1>
          <p style="margin: 5px 0 0;">Contrato de Suscripcion de Servicios</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <p>Estimado/a cliente de <strong>${quote.company_legal_name || quote.company_name}</strong>,</p>
          <p>Le enviamos el Contrato Marco de Suscripcion de Servicios (EULA) para su revision y aceptacion.</p>
          <p><strong>Presupuesto:</strong> ${quote.quote_number}<br>
          <strong>Monto mensual:</strong> $${parseFloat(quote.total_amount || 0).toLocaleString('es-AR')}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptanceLink}"
               style="background: #22c55e; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Ver y Aceptar Contrato
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">
            Este link es valido por 7 dias. Al hacer click en "Acepto los Terminos",
            quedara registrada su aceptacion electronica conforme la Ley 25.506.
          </p>
        </div>
        <div style="background: #1e3a5f; color: white; padding: 15px; text-align: center; font-size: 12px;">
          APONNT S.A.S. - Sistema de Gestion de Asistencia Biometrica
        </div>
      </div>
    `;

    // PRIMERO enviar email, DESPUES actualizar BD
    const mailOptions = {
      from: smtpConfig?.fromEmail ? `"${smtpConfig.fromName || 'APONNT 360'}" <${smtpConfig.fromEmail}>` : (process.env.SMTP_FROM || '"APONNT 360" <contratos@aponnt.com>'),
      to: clientEmail,
      subject: `Contrato EULA - ${quote.quote_number} - APONNT 360`,
      html: emailHtml
    };

    // Agregar BCC si está configurado
    if (bccEmail) {
      mailOptions.bcc = bccEmail;
      console.log('📧 [CONTRACT] Agregando BCC:', bccEmail);
    }

    await transporter.sendMail(mailOptions);

    console.log(`✅ [CONTRACT] Email enviado a: ${clientEmail}${bccEmail ? ' (con copia a ' + bccEmail + ')' : ''}`);

    // Solo si el email se envio exitosamente, actualizar BD
    await sequelize.query(`
      UPDATE quotes
      SET contract_status = 'sent',
          contract_sent_at = NOW(),
          contract_acceptance_data = jsonb_build_object(
            'acceptance_token', :token,
            'token_expiry', :expiry,
            'sent_to_email', :email
          ),
          updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id,
        token: acceptanceToken,
        expiry: tokenExpiry.toISOString(),
        email: clientEmail
      }
    });

    res.json({
      success: true,
      contract_status: 'sent',
      sent_at: new Date(),
      sent_to: clientEmail,
      acceptance_link: acceptanceLink
    });

  } catch (error) {
    console.error('❌ [CONTRACT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/:id/contract/sign
 * Registra la aceptacion EULA del cliente (pasa a signed)
 *
 * EULA funciona diferente a contratos tradicionales:
 * - No hay firma manuscrita ni nombre/DNI insertados en el documento
 * - Es un "click-wrap agreement" - el cliente hace click en "Acepto"
 * - Se registran metadatos de auditoria inmutables:
 *   - Timestamp exacto (con timezone)
 *   - IP del cliente
 *   - User-Agent del navegador
 *   - Hash del documento (para probar que no cambio)
 *   - UUID unico de la aceptacion
 */
router.post('/:id/contract/sign', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { acceptance_type, user_agent, screen_resolution, timezone } = req.body;
    const crypto = require('crypto');

    // Obtener IP del cliente
    const client_ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || req.socket?.remoteAddress
      || 'unknown';

    // Generar hash del documento EULA (para probar inmutabilidad)
    const { CONTRACT_TEMPLATE_ARG_V2 } = require('../templates/contract-eula-arg-v2');
    const documentHash = crypto.createHash('sha256')
      .update(JSON.stringify(CONTRACT_TEMPLATE_ARG_V2))
      .digest('hex');

    // Generar UUID unico para esta aceptacion
    const acceptanceUUID = crypto.randomUUID();

    // Timestamp con timezone
    const acceptedAt = new Date();
    const acceptanceRecord = {
      acceptance_id: acceptanceUUID,
      accepted_at: acceptedAt.toISOString(),
      timezone: timezone || 'UTC',
      acceptance_type: acceptance_type || 'eula_click',
      client_ip: client_ip,
      user_agent: user_agent || req.headers['user-agent'] || 'unknown',
      screen_resolution: screen_resolution || 'unknown',
      document_hash: documentHash,
      document_version: CONTRACT_TEMPLATE_ARG_V2.header?.version || 'v2.0',
      immutable: true
    };

    // Guardar en la base de datos - También actualizar status del quote a 'accepted'
    await sequelize.query(`
      UPDATE quotes
      SET contract_status = 'signed',
          contract_signed_at = :signed_at,
          contract_signature_ip = :client_ip,
          contract_acceptance_data = :acceptance_data,
          status = CASE WHEN status IN ('sent', 'in_trial', 'draft') THEN 'accepted' ELSE status END,
          accepted_date = CASE WHEN status IN ('sent', 'in_trial', 'draft') THEN NOW() ELSE accepted_date END,
          updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id,
        signed_at: acceptedAt,
        client_ip,
        acceptance_data: JSON.stringify(acceptanceRecord)
      }
    });

    console.log('✅ [EULA] Aceptacion registrada:', acceptanceUUID, 'Quote:', id);

    res.json({
      success: true,
      contract_status: 'signed',
      acceptance: {
        id: acceptanceUUID,
        signed_at: acceptedAt.toISOString(),
        document_hash: documentHash,
        ip: client_ip
      }
    });
  } catch (error) {
    console.error('❌ [EULA] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/:id/contract-preview
 * Genera preview del contrato EULA para este presupuesto
 */
router.get('/:id/contract-preview', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { CONTRACT_TEMPLATE_ARG_V2 } = require('../templates/contract-eula-arg-v2');

    const quotes = await sequelize.query(`
      SELECT q.*, c.name as company_name, c.legal_name as company_legal_name,
        c.tax_id as company_tax_id, c.address as company_address,
        c.city as company_city, c.province as company_province,
        c.country as company_country, c.phone as company_phone
      FROM quotes q
      LEFT JOIN companies c ON q.company_id = c.company_id
      WHERE q.id = :id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    res.json({
      success: true,
      template: CONTRACT_TEMPLATE_ARG_V2,
      quote: quotes[0]
    });
  } catch (error) {
    console.error('Error contract-preview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/:id/contract-pdf
 * Genera y descarga el contrato EULA en PDF
 */
router.get('/:id/contract-pdf', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const PDFDocument = require('pdfkit');
    const { CONTRACT_TEMPLATE_ARG_V2 } = require('../templates/contract-eula-arg-v2');

    // Obtener datos del quote y company
    const quotes = await sequelize.query(`
      SELECT q.*, c.name as company_name, c.legal_name as company_legal_name,
        c.tax_id as company_tax_id, c.address as company_address,
        c.city as company_city, c.province as company_province,
        c.country as company_country, c.phone as company_phone
      FROM quotes q
      LEFT JOIN companies c ON q.company_id = c.company_id
      WHERE q.id = :id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const q = quotes[0];
    const tpl = CONTRACT_TEMPLATE_ARG_V2;

    // Crear PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Contrato EULA - ' + (q.quote_number || 'Quote'),
        Author: 'APONNT S.A.S.',
        Subject: 'End User License Agreement'
      }
    });

    // Configurar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="contrato-eula-' + (q.quote_number || id) + '.pdf"');
    doc.pipe(res);

    // Replacements para el texto
    const replacements = {
      '{{APONNT_LEGAL_NAME}}': 'APONNT S.A.S.',
      '{{APONNT_ADDRESS}}': 'Ciudad Autonoma de Buenos Aires, Argentina',
      '{{APONNT_CUIT}}': '30-XXXXXXXX-X',
      '{{COMPANY_LEGAL_NAME}}': q.company_legal_name || q.company_name || 'EMPRESA',
      '{{COMPANY_ADDRESS}}': [q.company_address, q.company_city, q.company_province].filter(Boolean).join(', ') || '-',
      '{{COMPANY_CUIT}}': q.company_tax_id || '-'
    };

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text(tpl.header.title, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(tpl.header.subtitle + ' - ' + tpl.header.version, { align: 'center' });
    doc.moveDown(2);

    // Secciones
    tpl.sections.forEach(section => {
      doc.fontSize(12).font('Helvetica-Bold').text(section.title);
      doc.moveDown(0.5);

      let content = section.content;
      Object.keys(replacements).forEach(key => {
        content = content.split(key).join(replacements[key]);
      });

      doc.fontSize(10).font('Helvetica').text(content, { align: 'justify' });
      doc.moveDown(1.5);
    });

    // Anexo
    if (tpl.annexA) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('ANEXO A: ORDER FORM', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica');
      doc.text('Razon Social: ' + (q.company_legal_name || q.company_name || '-'));
      doc.text('CUIT: ' + (q.company_tax_id || '-'));
      doc.text('Domicilio: ' + replacements['{{COMPANY_ADDRESS}}']);
      doc.text('Telefono: ' + (q.company_phone || '-'));
      doc.moveDown(1);

      doc.text('Modulos contratados:');
      const modules = q.modules_data || [];
      if (typeof modules === 'string') {
        try { modules = JSON.parse(modules); } catch(e) {}
      }
      if (Array.isArray(modules)) {
        modules.forEach(mod => {
          doc.text('  - ' + (mod.module_name || mod.module_key) + ': $' + (mod.price || 0) + '/mes');
        });
      }
      doc.moveDown(1);
      doc.text('Total mensual: $' + parseFloat(q.total_amount || 0).toLocaleString('es-AR'));
    }

    // Estado de aceptacion si existe
    if (q.contract_status === 'signed' && q.contract_acceptance_data) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('REGISTRO DE ACEPTACION EULA', { align: 'center' });
      doc.moveDown(1);

      let acceptData = q.contract_acceptance_data;
      if (typeof acceptData === 'string') {
        try { acceptData = JSON.parse(acceptData); } catch(e) {}
      }

      doc.fontSize(10).font('Helvetica');
      doc.text('ID de Aceptacion: ' + (acceptData.acceptance_id || '-'));
      doc.text('Fecha/Hora: ' + (acceptData.accepted_at || q.contract_signed_at || '-'));
      doc.text('Timezone: ' + (acceptData.timezone || 'UTC'));
      doc.text('IP del cliente: ' + (acceptData.client_ip || q.contract_signature_ip || '-'));
      doc.text('User-Agent: ' + (acceptData.user_agent || '-'));
      doc.text('Hash del documento: ' + (acceptData.document_hash || '-'));
      doc.text('Version del documento: ' + (acceptData.document_version || 'v2.0'));
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica-Oblique').text(
        'Este registro es inmutable y constituye evidencia de la aceptacion de los terminos del contrato EULA.',
        { align: 'center' }
      );
    }

    // Finalizar
    doc.end();

  } catch (error) {
    console.error('❌ [QUOTES API] Error contract-pdf:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINTS PUBLICOS - ACEPTACION EULA POR CLIENTE (sin auth)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/quotes/public/contract/:id
 * Obtiene el contrato para visualizacion publica (requiere token valido)
 */
router.get('/public/contract/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token requerido' });
    }

    const { CONTRACT_TEMPLATE_ARG_V2 } = require('../templates/contract-eula-arg-v2');

    // Obtener quote y validar token
    const quotes = await sequelize.query(`
      SELECT q.*, c.name as company_name, c.legal_name as company_legal_name,
        c.tax_id as company_tax_id
      FROM quotes q
      JOIN companies c ON q.company_id = c.company_id
      WHERE q.id = :id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const quote = quotes[0];

    // Verificar que el contrato esta en estado 'sent'
    if (quote.contract_status === 'signed') {
      return res.json({ success: false, error: 'already_signed' });
    }

    if (quote.contract_status !== 'sent') {
      return res.status(400).json({ success: false, error: 'Contrato no disponible para aceptacion' });
    }

    // Validar token
    let acceptData = quote.contract_acceptance_data;
    if (typeof acceptData === 'string') {
      try { acceptData = JSON.parse(acceptData); } catch(e) { acceptData = {}; }
    }

    if (!acceptData || acceptData.acceptance_token !== token) {
      return res.status(403).json({ success: false, error: 'Token invalido' });
    }

    // Verificar expiracion
    if (acceptData.token_expiry && new Date(acceptData.token_expiry) < new Date()) {
      return res.json({ success: false, error: 'expired' });
    }

    res.json({
      success: true,
      quote: {
        id: quote.id,
        quote_number: quote.quote_number,
        company_name: quote.company_name,
        company_legal_name: quote.company_legal_name,
        total_amount: quote.total_amount,
        modules_data: quote.modules_data
      },
      template: CONTRACT_TEMPLATE_ARG_V2
    });

  } catch (error) {
    console.error('❌ [PUBLIC CONTRACT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/public/contract/:id/accept
 * Registra la aceptacion EULA del cliente (endpoint publico con token)
 */
router.post('/public/contract/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { token, user_agent, screen_resolution, timezone } = req.body;
    const crypto = require('crypto');

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token requerido' });
    }

    // Obtener quote
    const quotes = await sequelize.query(`
      SELECT q.*, c.contact_email
      FROM quotes q
      JOIN companies c ON q.company_id = c.company_id
      WHERE q.id = :id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const quote = quotes[0];

    // Verificar estado
    if (quote.contract_status === 'signed') {
      return res.status(400).json({ success: false, error: 'Contrato ya fue aceptado' });
    }

    if (quote.contract_status !== 'sent') {
      return res.status(400).json({ success: false, error: 'Contrato no disponible' });
    }

    // Validar token
    let acceptData = quote.contract_acceptance_data;
    if (typeof acceptData === 'string') {
      try { acceptData = JSON.parse(acceptData); } catch(e) { acceptData = {}; }
    }

    if (!acceptData || acceptData.acceptance_token !== token) {
      return res.status(403).json({ success: false, error: 'Token invalido' });
    }

    if (acceptData.token_expiry && new Date(acceptData.token_expiry) < new Date()) {
      return res.status(400).json({ success: false, error: 'Token expirado' });
    }

    // Obtener IP del cliente
    const client_ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || 'unknown';

    // Generar hash del documento
    const { CONTRACT_TEMPLATE_ARG_V2 } = require('../templates/contract-eula-arg-v2');
    const documentHash = crypto.createHash('sha256')
      .update(JSON.stringify(CONTRACT_TEMPLATE_ARG_V2))
      .digest('hex');

    // Generar UUID de aceptacion
    const acceptanceUUID = crypto.randomUUID();
    const acceptedAt = new Date();

    // Crear registro de aceptacion
    const acceptanceRecord = {
      acceptance_id: acceptanceUUID,
      accepted_at: acceptedAt.toISOString(),
      timezone: timezone || 'UTC',
      acceptance_type: 'eula_click_public',
      client_ip: client_ip,
      user_agent: user_agent || req.headers['user-agent'] || 'unknown',
      screen_resolution: screen_resolution || 'unknown',
      document_hash: documentHash,
      document_version: CONTRACT_TEMPLATE_ARG_V2.header?.version || 'v2.0',
      accepted_by_email: acceptData.sent_to_email,
      immutable: true
    };

    // Guardar en BD - También actualizar status del quote a 'accepted' si estaba en trial o sent
    await sequelize.query(`
      UPDATE quotes
      SET contract_status = 'signed',
          contract_signed_at = :signed_at,
          contract_signature_ip = :client_ip,
          contract_acceptance_data = :acceptance_data,
          status = CASE WHEN status IN ('sent', 'in_trial', 'draft') THEN 'accepted' ELSE status END,
          accepted_date = CASE WHEN status IN ('sent', 'in_trial', 'draft') THEN NOW() ELSE accepted_date END,
          updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id,
        signed_at: acceptedAt,
        client_ip,
        acceptance_data: JSON.stringify(acceptanceRecord)
      }
    });

    console.log('✅ [PUBLIC EULA] Aceptacion registrada:', acceptanceUUID, 'Quote:', id, 'Email:', acceptData.sent_to_email);

    // ═══════════════════════════════════════════════════════════
    // ENVIAR EMAIL DE CONFIRMACIÓN DE ACEPTACIÓN AL CLIENTE
    // ═══════════════════════════════════════════════════════════
    try {

      // Formatear fecha de aceptación
      const acceptedAtFormatted = acceptedAt.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // HTML del email de confirmación
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #22c55e; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Contrato Aceptado</h1>
            <p style="margin: 5px 0 0;">APONNT 360</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <p>Estimado/a cliente,</p>
            <p>Le confirmamos que hemos registrado exitosamente la <strong>aceptación de su Contrato de Suscripción de Servicios APONNT 360</strong>.</p>

            <div style="background: white; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Presupuesto:</strong> ${quote.quote_number}</p>
              <p style="margin: 5px 0;"><strong>Fecha de aceptación:</strong> ${acceptedAtFormatted}</p>
              <p style="margin: 5px 0;"><strong>ID de aceptación:</strong> ${acceptanceUUID}</p>
              <p style="margin: 5px 0;"><strong>Monto mensual:</strong> $${parseFloat(quote.total_amount || 0).toLocaleString('es-AR')}</p>
            </div>

            <h3 style="color: #1e3a5f;">Próximos pasos:</h3>
            <ol style="line-height: 1.8;">
              <li>En las próximas 24-48 horas recibirá un email con sus credenciales de acceso al panel de administración</li>
              <li>Nuestro equipo de soporte lo contactará para agendar la capacitación inicial</li>
              <li>Si tiene alguna consulta, puede responder a este email o contactarnos directamente</li>
            </ol>

            <p style="margin-top: 30px;">¡Bienvenido/a a APONNT 360! Estamos aquí para ayudarlo a optimizar la gestión de su empresa.</p>

            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              <strong>Nota legal:</strong> Su aceptación electrónica ha sido registrada conforme la Ley 25.506 de Firma Digital.
              El documento hash SHA-256 de su contrato es: <code style="font-size: 10px;">${documentHash.substring(0, 32)}...</code>
            </p>
          </div>
          <div style="background: #1e3a5f; color: white; padding: 15px; text-align: center; font-size: 12px;">
            APONNT S.A.S. - Sistema de Gestión de Asistencia Biométrica<br>
            soporte@aponnt.com | www.aponnt.com
          </div>
        </div>
      `;

      // Enviar email de confirmación usando NCE (con tracking, BCC automático, etc.)
      await NCE.send({
        companyId: null, // Es un email externo pre-onboarding
        module: 'quotes',
        workflowKey: 'quotes.contract_confirmation',
        originType: 'quote',
        originId: String(id),
        recipientType: 'external',
        recipientEmail: acceptData.sent_to_email || quote.contact_email,
        title: `✅ Confirmación de Aceptación de Contrato - ${quote.quote_number}`,
        message: `Contrato ${quote.quote_number} aceptado exitosamente el ${acceptedAtFormatted}`,
        metadata: {
          quote_id: id,
          quote_number: quote.quote_number,
          acceptance_uuid: acceptanceUUID,
          document_hash: documentHash,
          htmlContent: confirmationHtml
        },
        priority: 'high',
        channels: ['email']
      });

      console.log(`✅ [CONTRACT CONFIRMATION] Email de confirmación enviado via NCE a: ${acceptData.sent_to_email || quote.contact_email}`);

    } catch (emailError) {
      // No romper el flujo si falla el email de confirmación (ya se registró la aceptación)
      console.error('⚠️ [CONTRACT CONFIRMATION] Error enviando email de confirmación (no bloqueante):', emailError.message);
    }

    res.json({
      success: true,
      message: 'Contrato aceptado exitosamente. Recibirá un email de confirmación en breve.',
      acceptance: {
        id: acceptanceUUID,
        signed_at: acceptedAt.toISOString(),
        document_hash: documentHash
      }
    });

  } catch (error) {
    console.error('❌ [PUBLIC EULA] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quotes/:id/full-context
 * Devuelve quote + contrato + factura + trials + lead + company en una sola llamada
 */
router.get('/:id/full-context', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Quote + Company
    const quotes = await sequelize.query(`
      SELECT q.*,
        c.name as company_name, c.contact_email as company_email,
        c.legal_name as company_legal_name, c.tax_id as company_tax_id,
        c.address as company_address, c.city as company_city,
        c.province as company_province, c.country as company_country,
        c.phone as company_phone, c.metadata as company_metadata,
        c.is_active as company_is_active
      FROM quotes q
      LEFT JOIN companies c ON q.company_id = c.company_id
      WHERE q.id = :id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (quotes.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const quote = quotes[0];

    // Contract (if exists)
    let contract = null;
    try {
      const contracts = await sequelize.query(`
        SELECT id, status, signed_date, start_date, end_date, created_at
        FROM contracts WHERE quote_id = :id ORDER BY created_at DESC LIMIT 1
      `, { replacements: { id }, type: QueryTypes.SELECT });
      contract = contracts[0] || null;
    } catch (e) { /* table may not exist */ }

    // Invoice (most recent for this company)
    let invoice = null;
    try {
      const invoices = await sequelize.query(`
        SELECT id, invoice_number, status, total_amount, due_date, paid_at, sent_at, created_at
        FROM invoices WHERE quote_id = :id ORDER BY created_at DESC LIMIT 1
      `, { replacements: { id }, type: QueryTypes.SELECT });
      invoice = invoices[0] || null;
    } catch (e) { /* table may not exist */ }

    // Module trials
    let trials = [];
    try {
      const trialRows = await sequelize.query(`
        SELECT id, module_key, status, start_date, end_date
        FROM module_trials WHERE quote_id = :id
      `, { replacements: { id }, type: QueryTypes.SELECT });
      trials = trialRows;
    } catch (e) { /* table may not exist */ }

    // Lead origin
    let lead = null;
    if (quote.lead_id) {
      try {
        const leads = await sequelize.query(`
          SELECT id, company_name, contact_name, contact_email, temperature, lifecycle_stage, total_score
          FROM marketing_leads WHERE id = :lead_id
        `, { replacements: { lead_id: quote.lead_id }, type: QueryTypes.SELECT });
        lead = leads[0] || null;
      } catch (e) { /* table may not exist */ }
    }

    // Compute onboarding_phase
    let onboarding_phase = 'Borrador';
    if (quote.status === 'sent') {
      onboarding_phase = 'Enviado';
    } else if (quote.status === 'in_trial') {
      onboarding_phase = 'En Trial';
    } else if (quote.status === 'accepted' && !contract) {
      onboarding_phase = 'Pendiente Contrato';
    } else if (contract && !invoice) {
      onboarding_phase = 'Pendiente Factura';
    } else if (invoice && invoice.status !== 'paid') {
      onboarding_phase = 'Pendiente Pago';
    } else if (quote.company_is_active) {
      onboarding_phase = 'Activo';
    } else if (quote.status === 'active') {
      onboarding_phase = 'Activo';
    } else if (quote.status === 'rejected') {
      onboarding_phase = 'Rechazado';
    }

    res.json({
      success: true,
      quote,
      contract,
      invoice,
      trials,
      lead,
      onboarding_phase
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error full-context:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quotes/:id/activate-company
 * Activa la empresa asociada al quote (después de confirmar pago)
 * - Cambia companies.is_active = true
 * - Cambia companies.status = 'active'
 * - Cambia companies.onboarding_status = 'ACTIVE'
 * - Crea usuario administrador si no existe
 * - Cambia quote.status = 'active'
 */
router.post('/:id/activate-company', verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.staff?.id || req.user?.id || 1;

    // Get quote with company
    const [quote] = await sequelize.query(
      `SELECT q.id, q.company_id, q.status, q.quote_number,
              c.name as company_name, c.is_active, c.slug
       FROM quotes q
       LEFT JOIN companies c ON q.company_id = c.company_id
       WHERE q.id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    if (!quote.company_id) {
      return res.status(400).json({ success: false, error: 'El presupuesto no tiene empresa asociada' });
    }

    if (quote.is_active) {
      return res.json({ success: true, message: 'La empresa ya está activa', already_active: true });
    }

    // Activar empresa
    await sequelize.query(`
      UPDATE companies SET
        is_active = true,
        status = 'active',
        onboarding_status = 'ACTIVE',
        activated_at = NOW(),
        updated_at = NOW()
      WHERE company_id = :companyId
    `, { replacements: { companyId: quote.company_id }, type: QueryTypes.UPDATE });

    // Cambiar quote a active
    await sequelize.query(`
      UPDATE quotes SET
        status = 'active',
        updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id }, type: QueryTypes.UPDATE });

    // Crear usuario administrador si no existe
    const [existingAdmin] = await sequelize.query(`
      SELECT id FROM users WHERE company_id = :companyId AND role = 'admin' LIMIT 1
    `, { replacements: { companyId: quote.company_id }, type: QueryTypes.SELECT });

    let adminCreated = false;
    if (!existingAdmin) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await sequelize.query(`
        INSERT INTO users (company_id, username, password, email, first_name, last_name, role, is_active, is_core_user, created_at, updated_at)
        VALUES (:companyId, 'administrador', :password, :email, 'Administrador', 'Principal', 'admin', true, true, NOW(), NOW())
      `, {
        replacements: {
          companyId: quote.company_id,
          password: hashedPassword,
          email: quote.slug ? quote.slug + '@empresa.com' : 'admin' + quote.company_id + '@empresa.com'
        },
        type: QueryTypes.INSERT
      });
      adminCreated = true;
    }

    console.log(`✅ [QUOTES] Empresa ${quote.company_name} (ID: ${quote.company_id}) ACTIVADA por staff ${staffId}`);

    res.json({
      success: true,
      message: 'Empresa activada correctamente',
      company_id: quote.company_id,
      company_name: quote.company_name,
      admin_created: adminCreated,
      admin_credentials: adminCreated ? { username: 'administrador', password: 'admin123' } : null
    });

  } catch (error) {
    console.error('❌ [QUOTES API] Error activando empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
