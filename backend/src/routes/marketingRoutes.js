/**
 * Marketing Routes - Sistema de captación de leads y envío de flyers
 * Permite a todo el staff de APONNT registrar potenciales clientes
 * y enviarles el flyer "Preguntale a tu IA"
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const salesOrchestrationService = require('../services/SalesOrchestrationService');

// Helper para simular pool.query usando sequelize
// Convierte $1, $2 a ? y usa bind para los parámetros
const pool = {
    query: async (sql, params = []) => {
        // Convertir placeholders $1, $2, etc. a ?
        let convertedSql = sql;
        let paramIndex = 1;
        while (convertedSql.includes(`$${paramIndex}`)) {
            convertedSql = convertedSql.replace(`$${paramIndex}`, '?');
            paramIndex++;
        }

        const sqlUpper = sql.trim().toUpperCase();
        const isSelect = sqlUpper.startsWith('SELECT');
        const hasReturning = sqlUpper.includes('RETURNING');

        // sequelize.query devuelve diferentes formatos según el tipo:
        // - SELECT: devuelve [rows, metadata]
        // - INSERT/UPDATE con RETURNING: devuelve [rows, metadata]
        // - INSERT/UPDATE sin RETURNING: devuelve [undefined, affectedRows]
        const result = await sequelize.query(convertedSql, {
            replacements: params,
            type: (isSelect || hasReturning) ? QueryTypes.SELECT : QueryTypes.RAW
        });

        // Para SELECT y queries con RETURNING, result es el array de filas directamente
        // cuando usamos QueryTypes.SELECT
        let rows;
        if (isSelect || hasReturning) {
            rows = Array.isArray(result) ? result : [];
        } else {
            // Para INSERT/UPDATE/DELETE sin RETURNING
            rows = Array.isArray(result) ? result : [];
        }

        return { rows };
    }
};

// =========================================================================
// MIDDLEWARE DE AUTENTICACIÓN PARA STAFF
// =========================================================================

const verifyStaffToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') ||
                      req.cookies?.aponnt_token_staff;

        if (!token) {
            return res.status(401).json({ success: false, error: 'No autorizado' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');

        // Guardar datos del staff en el request
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

// ============================================================================
// CRUD DE LEADS
// ============================================================================

/**
 * GET /api/marketing/leads
 * Lista todos los leads con paginación y filtros
 */
router.get('/leads', verifyStaffToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            status,
            search,
            created_by
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = '1=1';
        const params = [];
        let paramIndex = 1;

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR company_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (created_by) {
            whereClause += ` AND created_by_staff_id = $${paramIndex}`;
            params.push(created_by);
            paramIndex++;
        }

        // Contar total
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM marketing_leads WHERE ${whereClause}`,
            params
        );

        // Obtener leads
        const result = await pool.query(
            `SELECT * FROM marketing_leads
             WHERE ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        });

    } catch (error) {
        console.error('[MARKETING] Error listing leads:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/leads/:id
 * Obtiene un lead específico con su historial de comunicaciones
 */
router.get('/leads/:id', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener lead
        const leadResult = await pool.query(
            'SELECT * FROM marketing_leads WHERE id = $1',
            [id]
        );

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        // Obtener historial de comunicaciones
        const commsResult = await pool.query(
            `SELECT * FROM marketing_lead_communications
             WHERE lead_id = $1
             ORDER BY sent_at DESC`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...leadResult.rows[0],
                communications: commsResult.rows
            }
        });

    } catch (error) {
        console.error('[MARKETING] Error getting lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/marketing/leads
 * Crea un nuevo lead
 */
router.post('/leads', verifyStaffToken, async (req, res) => {
    try {
        const {
            full_name,
            email,
            language = 'es',
            company_name,
            industry,
            phone,
            whatsapp,
            source = 'manual',
            notes
        } = req.body;

        // Validaciones
        if (!full_name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y email son obligatorios'
            });
        }

        // Verificar si ya existe el email
        const existingLead = await pool.query(
            'SELECT id FROM marketing_leads WHERE email = $1',
            [email]
        );

        if (existingLead.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Ya existe un lead con este email',
                existing_id: existingLead.rows[0].id
            });
        }

        // Verificar si staff_id es un UUID válido (no 'SUPERADMIN' u otros strings)
        const isValidUUID = (id) => {
            if (!id || typeof id !== 'string') return false;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(id);
        };
        const staffId = isValidUUID(req.staff.id) ? req.staff.id : null;

        // Insertar lead
        const result = await pool.query(
            `INSERT INTO marketing_leads
             (full_name, email, language, company_name, industry, phone, whatsapp,
              source, notes, created_by_staff_id, created_by_staff_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                full_name, email, language, company_name, industry,
                phone, whatsapp, source, notes,
                staffId, req.staff.full_name || req.staff.email
            ]
        );

        console.log(`[MARKETING] Lead created: ${email} by ${req.staff.email}`);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Lead registrado exitosamente'
        });

    } catch (error) {
        console.error('[MARKETING] Error creating lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/marketing/leads/:id
 * Actualiza un lead existente
 */
router.put('/leads/:id', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name,
            email,
            language,
            company_name,
            industry,
            phone,
            whatsapp,
            status,
            notes,
            next_followup_at
        } = req.body;

        const result = await pool.query(
            `UPDATE marketing_leads SET
                full_name = COALESCE($1, full_name),
                email = COALESCE($2, email),
                language = COALESCE($3, language),
                company_name = COALESCE($4, company_name),
                industry = COALESCE($5, industry),
                phone = COALESCE($6, phone),
                whatsapp = COALESCE($7, whatsapp),
                status = COALESCE($8, status),
                notes = COALESCE($9, notes),
                next_followup_at = COALESCE($10, next_followup_at)
             WHERE id = $11
             RETURNING *`,
            [full_name, email, language, company_name, industry,
             phone, whatsapp, status, notes, next_followup_at, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Lead actualizado'
        });

    } catch (error) {
        console.error('[MARKETING] Error updating lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/marketing/leads/:id
 * Elimina un lead (soft delete cambiando status)
 */
router.delete('/leads/:id', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Hard delete - las comunicaciones se borran por CASCADE
        const result = await pool.query(
            'DELETE FROM marketing_leads WHERE id = $1 RETURNING id, full_name, email',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        console.log(`[MARKETING] Lead deleted: ${result.rows[0].email} by ${req.staff.email}`);

        res.json({
            success: true,
            message: 'Lead eliminado'
        });

    } catch (error) {
        console.error('[MARKETING] Error deleting lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENVÍO DE FLYERS
// ============================================================================

/**
 * POST /api/marketing/leads/:id/send-flyer
 * Envía el flyer "Preguntale a tu IA" al lead
 */
router.post('/leads/:id/send-flyer', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { via = 'email' } = req.body; // email o whatsapp

        // Obtener lead
        const leadResult = await pool.query(
            'SELECT * FROM marketing_leads WHERE id = $1',
            [id]
        );

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        const lead = leadResult.rows[0];
        let sendResult = { success: false };

        // Obtener o generar tracking token
        let trackingToken = lead.tracking_token;
        if (!trackingToken) {
            // Generar nuevo token si no existe
            const tokenResult = await pool.query(
                'UPDATE marketing_leads SET tracking_token = gen_random_uuid() WHERE id = $1 RETURNING tracking_token',
                [id]
            );
            trackingToken = tokenResult.rows[0]?.tracking_token;
        }

        if (via === 'email') {
            // Generar flyer HTML personalizado con el nombre del lead y tracking
            const flyerHtml = salesOrchestrationService.generateAskYourAIFlyer(lead.full_name, lead.language || 'es', trackingToken);

            // Enviar email usando el método correcto
            try {
                const emailResult = await salesOrchestrationService.sendEmail({
                    to: lead.email,
                    subject: lead.language === 'en'
                        ? 'Ask your AI about APONNT'
                        : 'Preguntale a tu IA sobre APONNT',
                    html: flyerHtml
                });
                sendResult = { success: emailResult === true || (emailResult && emailResult.success) };
                if (!sendResult.success) {
                    console.error('[MARKETING] Email send returned false for:', lead.email);
                }
            } catch (emailError) {
                console.error('[MARKETING] Error enviando email:', emailError.message);
                sendResult = { success: false, error: emailError.message };
            }

        } else if (via === 'whatsapp') {
            // Para WhatsApp, solo generamos el texto - el envío es manual
            const whatsappText = salesOrchestrationService.generateAskYourAIWhatsApp(lead.full_name, lead.language || 'es');
            sendResult = {
                success: true,
                whatsappText: whatsappText,
                whatsappUrl: `https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappText)}`
            };
        }

        if (sendResult.success) {
            // Actualizar lead con fecha de envío
            await pool.query(
                `UPDATE marketing_leads SET
                    flyer_sent_at = NOW(),
                    flyer_sent_via = $1,
                    last_contact_at = NOW(),
                    status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END
                 WHERE id = $2`,
                [via, id]
            );

            // Registrar comunicación (validar UUID para sent_by_staff_id)
            const isValidUUID = (id) => {
                if (!id || typeof id !== 'string') return false;
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            };
            const staffIdForComm = isValidUUID(req.staff.id) ? req.staff.id : null;

            await pool.query(
                `INSERT INTO marketing_lead_communications
                 (lead_id, comm_type, channel, subject, flyer_type, status, sent_by_staff_id, sent_by_staff_name)
                 VALUES ($1, 'flyer_sent', $2, $3, 'ask_your_ai', 'sent', $4, $5)`,
                [
                    id,
                    via,
                    via === 'email' ? 'Preguntale a tu IA' : 'WhatsApp Flyer',
                    staffIdForComm,
                    req.staff.full_name || req.staff.email
                ]
            );

            console.log(`[MARKETING] Flyer sent to ${lead.email} via ${via} by ${req.staff.email}`);
        }

        res.json({
            success: sendResult.success,
            via: via,
            message: sendResult.success
                ? (via === 'email' ? 'Flyer enviado por email' : 'Texto listo para WhatsApp')
                : 'Error al enviar',
            ...(via === 'whatsapp' && sendResult.success && {
                whatsappText: sendResult.whatsappText,
                whatsappUrl: sendResult.whatsappUrl
            })
        });

    } catch (error) {
        console.error('[MARKETING] Error sending flyer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/flyer-preview
 * Preview del flyer en diferentes idiomas
 */
router.get('/flyer-preview', verifyStaffToken, async (req, res) => {
    try {
        const { language = 'es', format = 'email' } = req.query;

        if (format === 'whatsapp') {
            // Preview usa nombre de ejemplo
            const text = salesOrchestrationService.generateAskYourAIWhatsApp('María', language);
            res.json({ success: true, format: 'whatsapp', content: text });
        } else {
            // Preview usa nombre de ejemplo
            const html = salesOrchestrationService.generateAskYourAIFlyer('María', language);
            res.json({ success: true, format: 'email', content: html });
        }

    } catch (error) {
        console.error('[MARKETING] Error generating preview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

/**
 * GET /api/marketing/stats
 * Estadísticas generales de marketing
 */
router.get('/stats', verifyStaffToken, async (req, res) => {
    try {
        const statsResult = await pool.query('SELECT * FROM marketing_stats');

        // Stats por staff (quién registró más leads)
        const staffStatsResult = await pool.query(
            `SELECT
                created_by_staff_name as staff_name,
                COUNT(*) as leads_created,
                COUNT(*) FILTER (WHERE flyer_sent_at IS NOT NULL) as flyers_sent,
                COUNT(*) FILTER (WHERE status = 'converted') as conversions
             FROM marketing_leads
             WHERE created_by_staff_id IS NOT NULL
             GROUP BY created_by_staff_name, created_by_staff_id
             ORDER BY leads_created DESC
             LIMIT 10`
        );

        // Stats por idioma
        const languageStatsResult = await pool.query(
            `SELECT language, COUNT(*) as count
             FROM marketing_leads
             GROUP BY language
             ORDER BY count DESC`
        );

        // Stats por industria/rubro
        const industryStatsResult = await pool.query(
            `SELECT industry, COUNT(*) as count
             FROM marketing_leads
             WHERE industry IS NOT NULL
             GROUP BY industry
             ORDER BY count DESC
             LIMIT 10`
        );

        res.json({
            success: true,
            data: {
                general: statsResult.rows[0] || {},
                byStaff: staffStatsResult.rows,
                byLanguage: languageStatsResult.rows,
                byIndustry: industryStatsResult.rows
            }
        });

    } catch (error) {
        console.error('[MARKETING] Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TRACKING DE VISITAS Y ENCUESTAS
// ============================================================================

/**
 * GET /api/marketing/track/:token
 * Tracking pixel - Registra cuando el lead visita la página
 * El token se incluye en los links del flyer
 */
router.get('/track/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { event = 'page_visit' } = req.query;

        // Buscar lead por tracking token
        const leadResult = await pool.query(
            'SELECT id, full_name, email, page_visit_count FROM marketing_leads WHERE tracking_token = $1',
            [token]
        );

        if (leadResult.rows.length === 0) {
            // Retornar pixel transparente aunque no exista el lead
            res.set('Content-Type', 'image/gif');
            res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
            return;
        }

        const lead = leadResult.rows[0];
        const now = new Date().toISOString();

        // Actualizar lead con info de visita
        await pool.query(
            `UPDATE marketing_leads SET
                page_visited_at = COALESCE(page_visited_at, $1),
                page_visit_count = COALESCE(page_visit_count, 0) + 1,
                last_contact_at = $1,
                status = CASE WHEN status = 'new' THEN 'interested' ELSE status END
             WHERE id = $2`,
            [now, lead.id]
        );

        // Registrar evento
        await pool.query(
            `INSERT INTO marketing_lead_events (lead_id, event_type, event_data, ip_address, user_agent, referrer)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                lead.id,
                event,
                JSON.stringify({ visit_number: (lead.page_visit_count || 0) + 1 }),
                req.ip || req.connection?.remoteAddress,
                req.headers['user-agent'],
                req.headers['referer']
            ]
        );

        console.log(`[MARKETING] 📍 Tracking: ${lead.email} visitó la página (visita #${(lead.page_visit_count || 0) + 1})`);

        // Si es la primera visita, programar envío de encuesta
        if (!lead.page_visit_count || lead.page_visit_count === 0) {
            // Crear encuesta pendiente
            await pool.query(
                `INSERT INTO marketing_lead_surveys (lead_id) VALUES ($1)
                 ON CONFLICT DO NOTHING`,
                [lead.id]
            );
        }

        // Retornar pixel transparente de 1x1
        res.set('Content-Type', 'image/gif');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));

    } catch (error) {
        console.error('[MARKETING] Error tracking:', error);
        // Siempre retornar el pixel aunque haya error
        res.set('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
});

/**
 * POST /api/marketing/leads/:id/send-survey
 * Envía encuesta de satisfacción al lead (después de que visitó la página)
 */
router.post('/leads/:id/send-survey', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener lead
        const leadResult = await pool.query(
            'SELECT * FROM marketing_leads WHERE id = $1',
            [id]
        );

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        const lead = leadResult.rows[0];

        // Crear o obtener encuesta
        let surveyResult = await pool.query(
            'SELECT survey_token FROM marketing_lead_surveys WHERE lead_id = $1 AND status = \'pending\' ORDER BY created_at DESC LIMIT 1',
            [id]
        );

        let surveyToken;
        if (surveyResult.rows.length === 0) {
            // Crear nueva encuesta
            const newSurvey = await pool.query(
                'INSERT INTO marketing_lead_surveys (lead_id) VALUES ($1) RETURNING survey_token',
                [id]
            );
            surveyToken = newSurvey.rows[0].survey_token;
        } else {
            surveyToken = surveyResult.rows[0].survey_token;
        }

        // Generar email de encuesta
        const surveyHtml = salesOrchestrationService.generateSurveyEmail(lead.full_name, surveyToken, lead.language || 'es');

        // Enviar email
        try {
            await salesOrchestrationService.sendEmail({
                to: lead.email,
                subject: lead.language === 'en'
                    ? `${lead.full_name.split(' ')[0]}, thanks for visiting! Quick survey`
                    : `${lead.full_name.split(' ')[0]}, gracias por visitarnos! Breve encuesta`,
                html: surveyHtml
            });

            // Actualizar lead
            await pool.query(
                'UPDATE marketing_leads SET survey_sent_at = NOW() WHERE id = $1',
                [id]
            );

            // Registrar evento
            await pool.query(
                `INSERT INTO marketing_lead_events (lead_id, event_type, event_data)
                 VALUES ($1, 'survey_sent', $2)`,
                [id, JSON.stringify({ survey_token: surveyToken })]
            );

            console.log(`[MARKETING] 📧 Encuesta enviada a ${lead.email}`);

            res.json({
                success: true,
                message: 'Encuesta enviada exitosamente'
            });

        } catch (emailError) {
            console.error('[MARKETING] Error enviando encuesta:', emailError);
            res.status(500).json({ success: false, error: 'Error enviando email' });
        }

    } catch (error) {
        console.error('[MARKETING] Error send-survey:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/survey/:token
 * Página de encuesta con emojis (pública, no requiere auth)
 */
router.get('/survey/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Buscar encuesta
        const surveyResult = await pool.query(
            `SELECT s.*, l.full_name, l.language
             FROM marketing_lead_surveys s
             JOIN marketing_leads l ON s.lead_id = l.id
             WHERE s.survey_token = $1`,
            [token]
        );

        if (surveyResult.rows.length === 0) {
            return res.status(404).send('<h1>Encuesta no encontrada</h1>');
        }

        const survey = surveyResult.rows[0];

        if (survey.status === 'completed') {
            return res.send(salesOrchestrationService.generateSurveyThankYouPage(survey.full_name, survey.language || 'es'));
        }

        // Retornar página de encuesta con emojis
        res.send(salesOrchestrationService.generateSurveyPage(survey.full_name, token, survey.language || 'es'));

    } catch (error) {
        console.error('[MARKETING] Error survey page:', error);
        res.status(500).send('<h1>Error cargando encuesta</h1>');
    }
});

/**
 * POST /api/marketing/survey/:token
 * Recibe respuestas de la encuesta
 */
router.post('/survey/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const {
            rating_overall,
            rating_design,
            rating_clarity,
            rating_interest,
            contact_preference,
            feedback_text
        } = req.body;

        // Buscar encuesta
        const surveyResult = await pool.query(
            `SELECT s.*, l.id as lead_id, l.full_name
             FROM marketing_lead_surveys s
             JOIN marketing_leads l ON s.lead_id = l.id
             WHERE s.survey_token = $1 AND s.status = 'pending'`,
            [token]
        );

        if (surveyResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Encuesta no encontrada o ya completada' });
        }

        const survey = surveyResult.rows[0];

        // Guardar respuestas
        await pool.query(
            `UPDATE marketing_lead_surveys SET
                rating_overall = $1,
                rating_design = $2,
                rating_clarity = $3,
                rating_interest = $4,
                contact_preference = $5,
                feedback_text = $6,
                completed_at = NOW(),
                status = 'completed',
                ip_address = $7,
                user_agent = $8
             WHERE survey_token = $9`,
            [
                rating_overall,
                rating_design,
                rating_clarity,
                rating_interest,
                contact_preference,
                feedback_text,
                req.ip || req.connection?.remoteAddress,
                req.headers['user-agent'],
                token
            ]
        );

        // Actualizar lead
        await pool.query(
            `UPDATE marketing_leads SET
                survey_completed_at = NOW(),
                status = CASE
                    WHEN $1 >= 4 THEN 'interested'
                    WHEN $1 <= 2 THEN 'not_interested'
                    ELSE status
                END
             WHERE id = $2`,
            [rating_interest, survey.lead_id]
        );

        // Registrar evento
        await pool.query(
            `INSERT INTO marketing_lead_events (lead_id, event_type, event_data, ip_address, user_agent)
             VALUES ($1, 'survey_completed', $2, $3, $4)`,
            [
                survey.lead_id,
                JSON.stringify({
                    rating_overall,
                    rating_interest,
                    contact_preference
                }),
                req.ip,
                req.headers['user-agent']
            ]
        );

        console.log(`[MARKETING] ✅ Encuesta completada por ${survey.full_name} - Rating: ${rating_overall}/5, Interés: ${rating_interest}/5`);

        res.json({
            success: true,
            message: 'Gracias por completar la encuesta!'
        });

    } catch (error) {
        console.error('[MARKETING] Error submitting survey:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/leads/:id/events
 * Historial de eventos del lead (tracking)
 */
router.get('/leads/:id/events', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;

        const eventsResult = await pool.query(
            `SELECT * FROM marketing_lead_events
             WHERE lead_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [id]
        );

        res.json({
            success: true,
            data: eventsResult.rows
        });

    } catch (error) {
        console.error('[MARKETING] Error getting events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/leads/pending-surveys
 * Lista leads que visitaron pero no completaron encuesta
 */
router.get('/leads/pending-surveys', verifyStaffToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.*, s.created_at as survey_created_at
             FROM marketing_leads l
             LEFT JOIN marketing_lead_surveys s ON l.id = s.lead_id AND s.status = 'pending'
             WHERE l.page_visited_at IS NOT NULL
               AND l.survey_completed_at IS NULL
             ORDER BY l.page_visited_at DESC
             LIMIT 50`
        );

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('[MARKETING] Error getting pending surveys:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CREACIÓN DE PRESUPUESTO DESDE LEAD
// ============================================================================

/**
 * POST /api/marketing/leads/:id/create-quote
 * Crea una empresa (prospecto) y presupuesto desde un lead
 */
router.post('/leads/:id/create-quote', verifyStaffToken, async (req, res) => {
    const { Op } = require('sequelize');
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { company_data, modules_data, notes } = req.body;

        // 1. Validar que el lead existe
        const leadResult = await pool.query(
            'SELECT * FROM marketing_leads WHERE id = $1',
            [id]
        );

        if (leadResult.rows.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        const lead = leadResult.rows[0];

        // 2. Validar datos mínimos
        if (!company_data?.company_name) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'El nombre de la empresa es obligatorio' });
        }

        if (!modules_data || modules_data.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Debe seleccionar al menos un módulo' });
        }

        // 3. Generar slug único para la empresa
        const baseSlug = company_data.company_name
            .toLowerCase()
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/ñ/g, 'n')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        // Verificar si el slug ya existe y agregar sufijo si es necesario
        let slug = baseSlug;
        let slugCounter = 1;
        let existingSlug = await pool.query(
            'SELECT company_id FROM companies WHERE slug = $1',
            [slug]
        );

        while (existingSlug.rows.length > 0) {
            slug = `${baseSlug}-${slugCounter}`;
            slugCounter++;
            existingSlug = await pool.query(
                'SELECT company_id FROM companies WHERE slug = $1',
                [slug]
            );
        }

        // 4. Crear la empresa como prospecto
        const companyResult = await sequelize.query(
            `INSERT INTO companies (
                name, slug, contact_email, contact_phone, tax_id,
                max_employees, is_active, license_type,
                active_modules, modules_data, onboarding_status
            ) VALUES (
                :name, :slug, :contact_email, :contact_phone, :tax_id,
                :max_employees, false, 'trial',
                :active_modules, :modules_data, 'PENDING'
            ) RETURNING *`,
            {
                replacements: {
                    name: company_data.company_name,
                    slug: slug,
                    contact_email: company_data.contact_email || lead.email,
                    contact_phone: company_data.contact_phone || lead.phone || lead.whatsapp,
                    tax_id: company_data.tax_id || null,
                    max_employees: parseInt(company_data.max_employees) || 10,
                    active_modules: JSON.stringify(modules_data.map(m => m.module_key)),
                    modules_data: JSON.stringify(modules_data)
                },
                type: QueryTypes.INSERT,
                transaction
            }
        );

        const company = companyResult[0][0] || companyResult[0];
        const companyId = company.company_id;

        // 5. Obtener seller_id (usar partner del staff si existe, sino NULL)
        let sellerId = null; // UUID del partner, null si no existe
        try {
            const sellerResult = await pool.query(
                'SELECT id FROM partners WHERE email = $1 AND is_active = true LIMIT 1',
                [req.staff.email]
            );
            if (sellerResult.rows.length > 0) {
                sellerId = sellerResult.rows[0].id;
            }
        } catch (e) {
            console.log('[MARKETING] No se encontró partner para staff, seller_id será NULL');
        }

        // 6. Calcular total del presupuesto
        const totalAmount = modules_data.reduce((sum, mod) => {
            return sum + (parseFloat(mod.price) * parseInt(mod.quantity || 1));
        }, 0);

        // 7. Generar quote_number
        const year = new Date().getFullYear();
        const lastQuoteResult = await sequelize.query(
            `SELECT quote_number FROM quotes
             WHERE quote_number LIKE 'PRES-${year}-%'
             ORDER BY id DESC LIMIT 1`,
            { type: QueryTypes.SELECT, transaction }
        );

        let nextNumber = 1;
        if (lastQuoteResult.length > 0 && lastQuoteResult[0].quote_number) {
            const match = lastQuoteResult[0].quote_number.match(/PRES-\d{4}-(\d{4})/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        const quoteNumber = `PRES-${year}-${String(nextNumber).padStart(4, '0')}`;

        // 8. Crear el presupuesto
        const quoteResult = await sequelize.query(
            `INSERT INTO quotes (
                quote_number, company_id, seller_id, lead_id,
                modules_data, total_amount, notes,
                status, has_trial, trial_modules
            ) VALUES (
                :quote_number, :company_id, :seller_id, :lead_id,
                :modules_data, :total_amount, :notes,
                'draft', true, :trial_modules
            ) RETURNING *`,
            {
                replacements: {
                    quote_number: quoteNumber,
                    company_id: companyId,
                    seller_id: sellerId,
                    lead_id: id,
                    modules_data: JSON.stringify(modules_data),
                    total_amount: totalAmount,
                    notes: notes || `Creado desde lead: ${lead.full_name} (${lead.email})`,
                    trial_modules: JSON.stringify(modules_data.map(m => m.module_key))
                },
                type: QueryTypes.INSERT,
                transaction
            }
        );

        const quote = quoteResult[0][0] || quoteResult[0];

        // 9. Actualizar lead con referencia al quote
        await sequelize.query(
            `UPDATE marketing_leads SET
                status = CASE WHEN status = 'new' THEN 'interested' ELSE status END,
                notes = COALESCE(notes, '') || E'\n[' || NOW()::date || '] Presupuesto ${quoteNumber} creado'
             WHERE id = :id`,
            {
                replacements: { id },
                type: QueryTypes.UPDATE,
                transaction
            }
        );

        // 10. Registrar evento
        await pool.query(
            `INSERT INTO marketing_lead_events (lead_id, event_type, event_data)
             VALUES ($1, 'quote_created', $2)`,
            [
                id,
                JSON.stringify({
                    quote_number: quoteNumber,
                    company_id: companyId,
                    company_name: company_data.company_name,
                    total_amount: totalAmount,
                    modules_count: modules_data.length,
                    created_by: req.staff.email
                })
            ]
        );

        await transaction.commit();

        console.log(`[MARKETING] ✅ Presupuesto ${quoteNumber} creado desde lead ${lead.email} por ${req.staff.email}`);

        res.status(201).json({
            success: true,
            message: `Presupuesto ${quoteNumber} creado exitosamente`,
            quote: {
                id: quote.id,
                quote_number: quoteNumber,
                total_amount: totalAmount,
                status: 'draft',
                modules_count: modules_data.length
            },
            company: {
                id: companyId,
                name: company_data.company_name,
                slug: slug,
                status: 'prospecto'
            },
            lead: {
                id: lead.id,
                full_name: lead.full_name,
                email: lead.email
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('[MARKETING] Error creating quote from lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
