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

        if (via === 'email') {
            // Generar flyer HTML personalizado con el nombre del lead
            const flyerHtml = salesOrchestrationService.generateAskYourAIFlyer(lead.full_name, lead.language || 'es');

            // Enviar email usando el método correcto
            try {
                await salesOrchestrationService.sendEmail({
                    to: lead.email,
                    subject: lead.language === 'en'
                        ? 'Ask your AI about APONNT'
                        : 'Preguntale a tu IA sobre APONNT',
                    html: flyerHtml
                });
                sendResult = { success: true };
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

module.exports = router;
