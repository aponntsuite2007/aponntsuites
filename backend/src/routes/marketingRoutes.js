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
        // IMPORTANTE: Usar replaceAll para reemplazar TODAS las ocurrencias
        // (un mismo $1 puede aparecer múltiples veces en ILIKE OR clauses)
        let convertedSql = sql;
        let paramIndex = 1;
        while (convertedSql.includes(`$${paramIndex}`)) {
            // Usar regex con flag 'g' para reemplazar TODAS las ocurrencias
            convertedSql = convertedSql.replace(new RegExp(`\\$${paramIndex}\\b`, 'g'), '?');
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

        // ============================================================
        // SSOT: Filtrado por rol del usuario
        // - Vendedor (is_sales_role=true): solo ve sus leads asignados
        // - Gerente/Admin/SuperAdmin: ven todos los leads
        // ============================================================
        let isSalesRole = false;
        let userPartnerId = null;
        let userViewScope = 'all'; // 'all' o 'own'

        const isValidUUID = (id) => {
            if (!id || typeof id !== 'string') return false;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        };

        if (isValidUUID(req.staff.id)) {
            try {
                // Verificar rol del staff
                const roleCheck = await pool.query(
                    `SELECT r.is_sales_role, r.role_code, r.level
                     FROM aponnt_staff s
                     JOIN aponnt_staff_roles r ON s.role_id = r.role_id
                     WHERE s.staff_id = $1`,
                    [req.staff.id]
                );

                if (roleCheck.rows.length > 0) {
                    const role = roleCheck.rows[0];
                    isSalesRole = role.is_sales_role;

                    // Vendedores (level >= 3 y is_sales_role) solo ven sus leads
                    // Gerentes/Jefes (level <= 2) o roles administrativos ven todo
                    if (isSalesRole && role.level >= 3) {
                        // Buscar partner asociado
                        const partnerCheck = await pool.query(
                            'SELECT id FROM partners WHERE email = $1 AND is_active = true LIMIT 1',
                            [req.staff.email]
                        );

                        if (partnerCheck.rows.length > 0) {
                            userPartnerId = partnerCheck.rows[0].id;
                            userViewScope = 'own';
                        }
                    }
                }
            } catch (e) {
                console.log('[MARKETING] Error checking role, defaulting to all:', e.message);
            }
        }

        // Aplicar filtro SSOT si es vendedor
        // Usamos prefijo ml. porque la query principal hace JOIN con partners
        if (userViewScope === 'own' && userPartnerId) {
            // Vendedor solo ve: leads asignados a él O creados por él
            whereClause += ` AND (ml.assigned_seller_id = $${paramIndex} OR ml.created_by_staff_id = $${paramIndex + 1})`;
            params.push(userPartnerId, req.staff.id);
            paramIndex += 2;
            console.log(`[MARKETING] SSOT: Vendedor ${req.staff.email} - filtrando solo sus leads`);
        }

        if (status) {
            whereClause += ` AND ml.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            // Nota: Cada placeholder necesita su propio parámetro para Sequelize
            // Prefijamos con ml. porque hacemos JOIN con partners que también tiene "email"
            whereClause += ` AND (ml.full_name ILIKE $${paramIndex} OR ml.email ILIKE $${paramIndex + 1} OR ml.company_name ILIKE $${paramIndex + 2})`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
            paramIndex += 3;
        }

        if (created_by) {
            whereClause += ` AND ml.created_by_staff_id = $${paramIndex}`;
            params.push(created_by);
            paramIndex++;
        }

        // Contar total (usamos alias ml para consistencia con whereClause)
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM marketing_leads ml WHERE ${whereClause}`,
            params
        );

        // Obtener leads con info del vendedor asignado
        const result = await pool.query(
            `SELECT ml.*,
                    (p.first_name || ' ' || p.last_name) AS assigned_seller_name
             FROM marketing_leads ml
             LEFT JOIN partners p ON ml.assigned_seller_id = p.id
             WHERE ${whereClause}
             ORDER BY ml.created_at DESC
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
            },
            _ssot: {
                viewScope: userViewScope,
                filteredBy: userPartnerId ? 'seller' : null
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

        // Auto-asignar vendedor si el staff que crea es un vendedor
        // Reglas:
        // 1. Si el staff es vendedor (is_sales_role=true) → asignar automáticamente
        // 2. Si es gerente/admin/superadmin → no asignar (puede asignarse después)
        // 3. Si no tiene partner asociado → no asignar (venta directa)
        let assignedSellerId = null;
        let assignedAt = null;

        if (staffId && req.staff.email) {
            try {
                // Verificar si el staff tiene rol de ventas
                const roleCheck = await pool.query(
                    `SELECT r.is_sales_role
                     FROM aponnt_staff s
                     JOIN aponnt_staff_roles r ON s.role_id = r.role_id
                     WHERE s.staff_id = $1`,
                    [staffId]
                );

                const isSalesRole = roleCheck.rows[0]?.is_sales_role;

                if (isSalesRole) {
                    // Buscar partner asociado por email
                    const partnerCheck = await pool.query(
                        'SELECT id FROM partners WHERE email = $1 AND is_active = true LIMIT 1',
                        [req.staff.email]
                    );

                    if (partnerCheck.rows.length > 0) {
                        assignedSellerId = partnerCheck.rows[0].id;
                        assignedAt = new Date();
                        console.log(`[MARKETING] Auto-asignando vendedor ${assignedSellerId} al lead (staff es vendedor)`);
                    }
                }
            } catch (e) {
                // No hay problema si falla - simplemente no se asigna vendedor
                console.log('[MARKETING] No se pudo auto-asignar vendedor:', e.message);
            }
        }

        // Insertar lead - asegurar que no hay undefined (Sequelize no los maneja bien)
        const result = await pool.query(
            `INSERT INTO marketing_leads
             (full_name, email, language, company_name, industry, phone, whatsapp,
              source, notes, created_by_staff_id, created_by_staff_name,
              assigned_seller_id, assigned_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                full_name || null,
                email || null,
                language || 'es',
                company_name || null,
                industry || null,
                phone || null,
                whatsapp || null,
                source || 'manual',
                notes || null,
                staffId || null,
                req.staff.full_name || req.staff.email || null,
                assignedSellerId || null,
                assignedAt || null
            ]
        );

        const sellerInfo = assignedSellerId ? ` (vendedor auto-asignado: ${assignedSellerId})` : ' (sin vendedor)';
        console.log(`[MARKETING] Lead created: ${email} by ${req.staff.email}${sellerInfo}`);

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

        // DEBUG: Log recibido
        console.log('[MARKETING] PUT /leads/:id - ID:', id);
        console.log('[MARKETING] PUT /leads/:id - Body:', JSON.stringify(req.body, null, 2));
        console.log('[MARKETING] PUT /leads/:id - full_name:', full_name);

        // Asegurar que no hay undefined (Sequelize no los maneja bien)
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
            [
                full_name !== undefined ? full_name : null,
                email !== undefined ? email : null,
                language !== undefined ? language : null,
                company_name !== undefined ? company_name : null,
                industry !== undefined ? industry : null,
                phone !== undefined ? phone : null,
                whatsapp !== undefined ? whatsapp : null,
                status !== undefined ? status : null,
                notes !== undefined ? notes : null,
                next_followup_at !== undefined ? next_followup_at : null,
                id
            ]
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
        // ============================================================
        // SSOT: Determinar scope según rol del usuario
        // ============================================================
        let whereClause = '1=1';
        let viewScope = 'all';
        const params = [];

        const isValidUUID = (id) => {
            if (!id || typeof id !== 'string') return false;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        };

        if (isValidUUID(req.staff.id)) {
            try {
                const roleCheck = await pool.query(
                    `SELECT r.is_sales_role, r.level
                     FROM aponnt_staff s
                     JOIN aponnt_staff_roles r ON s.role_id = r.role_id
                     WHERE s.staff_id = $1`,
                    [req.staff.id]
                );

                if (roleCheck.rows.length > 0 && roleCheck.rows[0].is_sales_role && roleCheck.rows[0].level >= 3) {
                    const partnerCheck = await pool.query(
                        'SELECT id FROM partners WHERE email = $1 AND is_active = true LIMIT 1',
                        [req.staff.email]
                    );

                    if (partnerCheck.rows.length > 0) {
                        whereClause = `(assigned_seller_id = $1 OR created_by_staff_id = $2)`;
                        params.push(partnerCheck.rows[0].id, req.staff.id);
                        viewScope = 'own';
                    }
                }
            } catch (e) {
                console.log('[MARKETING] Stats: Error checking role, showing all:', e.message);
            }
        }

        // Stats generales (filtradas por scope)
        const generalStats = await pool.query(
            `SELECT
                COUNT(*) as total_leads,
                COUNT(*) FILTER (WHERE flyer_sent_at IS NOT NULL) as flyers_sent,
                COUNT(*) FILTER (WHERE status = 'interested') as interested,
                COUNT(*) FILTER (WHERE status = 'converted') as converted,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
                COUNT(*) FILTER (WHERE page_visited_at IS NOT NULL) as page_visits,
                COUNT(*) FILTER (WHERE flyer_opened_at IS NOT NULL) as emails_opened
             FROM marketing_leads
             WHERE ${whereClause}`,
            params
        );

        // Stats por staff (solo si ve todo)
        let staffStats = [];
        if (viewScope === 'all') {
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
            staffStats = staffStatsResult.rows;
        }

        // Stats por idioma (filtradas por scope)
        const languageStatsResult = await pool.query(
            `SELECT language, COUNT(*) as count
             FROM marketing_leads
             WHERE ${whereClause}
             GROUP BY language
             ORDER BY count DESC`,
            params
        );

        // Stats por industria/rubro (filtradas por scope)
        const industryStatsResult = await pool.query(
            `SELECT industry, COUNT(*) as count
             FROM marketing_leads
             WHERE ${whereClause} AND industry IS NOT NULL
             GROUP BY industry
             ORDER BY count DESC
             LIMIT 10`,
            params
        );

        // Stats de engagement (filtradas por scope)
        const engagementStats = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE page_visit_count > 0) as leads_with_visits,
                SUM(COALESCE(page_visit_count, 0)) as total_page_visits,
                COUNT(*) FILTER (WHERE demo_accessed_at IS NOT NULL) as demo_accessed,
                COUNT(*) FILTER (WHERE survey_completed_at IS NOT NULL) as surveys_completed,
                ROUND(AVG(COALESCE(interaction_count, 0)), 1) as avg_interactions
             FROM marketing_leads
             WHERE ${whereClause}`,
            params
        );

        res.json({
            success: true,
            data: {
                general: generalStats.rows[0] || {},
                engagement: engagementStats.rows[0] || {},
                byStaff: staffStats,
                byLanguage: languageStatsResult.rows,
                byIndustry: industryStatsResult.rows
            },
            _ssot: {
                viewScope: viewScope
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
 * GET /api/marketing/track/:token/open
 * Email open tracking pixel - Registra cuando el lead ABRE el email
 * Este pixel se incrusta en el HTML del flyer/email
 * Diferente al tracking de visita a página
 */
router.get('/track/:token/open', async (req, res) => {
    try {
        const { token } = req.params;

        // Buscar lead por tracking token
        const leadResult = await pool.query(
            'SELECT id, full_name, email, flyer_opened_at FROM marketing_leads WHERE tracking_token = $1',
            [token]
        );

        if (leadResult.rows.length > 0) {
            const lead = leadResult.rows[0];
            const now = new Date().toISOString();

            // Solo actualizar si es la primera vez que abre
            if (!lead.flyer_opened_at) {
                await pool.query(
                    `UPDATE marketing_leads SET
                        flyer_opened_at = $1,
                        last_contact_at = $1,
                        status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END
                     WHERE id = $2`,
                    [now, lead.id]
                );

                // Registrar evento
                try {
                    await pool.query(
                        `INSERT INTO marketing_lead_events (lead_id, event_type, event_data, ip_address, user_agent)
                         VALUES ($1, 'email_opened', $2, $3, $4)`,
                        [
                            lead.id,
                            JSON.stringify({ first_open: true }),
                            req.ip || req.connection?.remoteAddress,
                            req.headers['user-agent']
                        ]
                    );
                } catch (e) {
                    // Ignorar si falla el evento
                }

                console.log(`[MARKETING] 📧 EMAIL ABIERTO: ${lead.email} abrió el flyer por primera vez`);
            }

            // Actualizar comunicación si existe
            try {
                await pool.query(
                    `UPDATE marketing_lead_communications
                     SET opened_at = COALESCE(opened_at, NOW())
                     WHERE lead_id = $1 AND opened_at IS NULL
                     ORDER BY sent_at DESC LIMIT 1`,
                    [lead.id]
                );
            } catch (e) {
                // Ignorar si falla
            }
        }

        // Siempre retornar pixel transparente de 1x1 (GIF)
        res.set('Content-Type', 'image/gif');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));

    } catch (error) {
        console.error('[MARKETING] Error email open tracking:', error);
        // Siempre retornar el pixel aunque haya error
        res.set('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
});

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
        const { company_data, modules_data, notes, seller_id: requestSellerId } = req.body;

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

        // 5. Obtener seller_id con prioridad:
        //    1. seller_id del request (si el usuario lo especificó)
        //    2. seller_id del lead (si ya tenía vendedor asignado)
        //    3. Partner asociado al staff que crea el presupuesto
        //    4. NULL (venta directa sin comisión)
        let sellerId = null;
        let sellerAssignedAt = null;

        if (requestSellerId) {
            // Validar que el seller existe
            const sellerCheck = await pool.query(
                'SELECT id FROM partners WHERE id = $1 AND is_active = true',
                [requestSellerId]
            );
            if (sellerCheck.rows.length > 0) {
                sellerId = requestSellerId;
                sellerAssignedAt = new Date();
                console.log('[MARKETING] Seller asignado desde request:', sellerId);
            }
        }

        if (!sellerId && lead.assigned_seller_id) {
            // Heredar del lead
            sellerId = lead.assigned_seller_id;
            sellerAssignedAt = lead.assigned_at;
            console.log('[MARKETING] Seller heredado del lead:', sellerId);
        }

        if (!sellerId) {
            // Intentar encontrar partner asociado al staff
            try {
                const sellerResult = await pool.query(
                    'SELECT id FROM partners WHERE email = $1 AND is_active = true LIMIT 1',
                    [req.staff.email]
                );
                if (sellerResult.rows.length > 0) {
                    sellerId = sellerResult.rows[0].id;
                    sellerAssignedAt = new Date();
                    console.log('[MARKETING] Seller encontrado por email del staff:', sellerId);
                }
            } catch (e) {
                // No hay partner, está OK - será venta directa
            }
        }

        if (!sellerId) {
            console.log('[MARKETING] Sin seller asignado - venta directa (sin comisión)');
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

        // 8. Crear el presupuesto con origin tracking
        const quoteResult = await sequelize.query(
            `INSERT INTO quotes (
                quote_number, company_id, seller_id, lead_id,
                modules_data, total_amount, notes,
                status, has_trial, trial_modules,
                origin_type, origin_detail, seller_assigned_at
            ) VALUES (
                :quote_number, :company_id, :seller_id, :lead_id,
                :modules_data, :total_amount, :notes,
                'draft', true, :trial_modules,
                'marketing_lead', :origin_detail, :seller_assigned_at
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
                    trial_modules: JSON.stringify(modules_data.map(m => m.module_key)),
                    origin_detail: JSON.stringify({
                        lead_email: lead.email,
                        lead_name: lead.full_name,
                        lead_company: lead.company_name,
                        campaign_source: lead.campaign_source || 'unknown',
                        created_via: 'marketing_leads_module',
                        created_by_staff: req.staff.email
                    }),
                    seller_assigned_at: sellerAssignedAt
                },
                type: QueryTypes.INSERT,
                transaction
            }
        );

        const quote = quoteResult[0][0] || quoteResult[0];

        // 9. Actualizar lead con referencia al quote y tracking de conversión
        await sequelize.query(
            `UPDATE marketing_leads SET
                status = CASE WHEN status IN ('new', 'contacted') THEN 'interested' ELSE status END,
                converted_to_quote_id = :quoteId,
                converted_at = NOW(),
                notes = COALESCE(notes, '') || E'\n[' || NOW()::date || '] Presupuesto ${quoteNumber} creado'
             WHERE id = :id`,
            {
                replacements: { id, quoteId: quote.id },
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

// ============================================================================
// NUEVOS ENDPOINTS: SELLER ASSIGNMENT, FOLLOW-UP, INTERACTIONS
// ============================================================================

/**
 * POST /api/marketing/leads/:id/assign-seller
 * Asigna un vendedor/partner a un lead (opcional, para tracking de comisiones)
 */
router.post('/leads/:id/assign-seller', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { seller_id, notes } = req.body;

        // Validar que el lead existe
        const leadResult = await pool.query(
            'SELECT id, full_name FROM marketing_leads WHERE id = $1',
            [id]
        );

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        if (seller_id) {
            // Validar que el seller existe
            const sellerResult = await pool.query(
                `SELECT id, (first_name || ' ' || last_name) AS seller_name FROM partners WHERE id = $1 AND is_active = true`,
                [seller_id]
            );

            if (sellerResult.rows.length === 0) {
                return res.status(400).json({ success: false, error: 'Vendedor no encontrado o inactivo' });
            }

            // Asignar vendedor
            await pool.query(
                `UPDATE marketing_leads SET
                    assigned_seller_id = $1,
                    assigned_at = NOW(),
                    notes = COALESCE(notes, '') || E'\n[' || NOW()::date || '] Vendedor asignado: ' || $2
                WHERE id = $3`,
                [seller_id, sellerResult.rows[0].seller_name, id]
            );

            console.log(`[MARKETING] Vendedor ${seller_id} asignado al lead ${id} por ${req.staff.email}`);

            res.json({
                success: true,
                message: 'Vendedor asignado correctamente',
                seller: sellerResult.rows[0]
            });
        } else {
            // Quitar vendedor asignado (venta directa)
            await pool.query(
                `UPDATE marketing_leads SET
                    assigned_seller_id = NULL,
                    assigned_at = NULL,
                    notes = COALESCE(notes, '') || E'\n[' || NOW()::date || '] Vendedor removido (venta directa)'
                WHERE id = $1`,
                [id]
            );

            res.json({
                success: true,
                message: 'Vendedor removido - será venta directa (sin comisión)'
            });
        }

    } catch (error) {
        console.error('[MARKETING] Error assigning seller:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/marketing/leads/:id/follow-up
 * Configura un recordatorio de follow-up para un lead
 */
router.patch('/leads/:id/follow-up', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { follow_up_date, follow_up_notes } = req.body;

        // Validar que el lead existe
        const leadResult = await pool.query(
            'SELECT id FROM marketing_leads WHERE id = $1',
            [id]
        );

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        // Actualizar follow-up
        await pool.query(
            `UPDATE marketing_leads SET
                follow_up_date = $1,
                follow_up_notes = $2
            WHERE id = $3`,
            [follow_up_date || null, follow_up_notes || null, id]
        );

        console.log(`[MARKETING] Follow-up configurado para lead ${id}: ${follow_up_date}`);

        res.json({
            success: true,
            message: follow_up_date ? `Follow-up programado para ${follow_up_date}` : 'Follow-up removido'
        });

    } catch (error) {
        console.error('[MARKETING] Error setting follow-up:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/leads/follow-ups/due
 * Obtiene leads con follow-ups pendientes
 */
router.get('/leads/follow-ups/due', verifyStaffToken, async (req, res) => {
    try {
        const { days_ahead = 7 } = req.query;

        const result = await pool.query(
            `SELECT ml.*, (p.first_name || ' ' || p.last_name) AS seller_name
             FROM marketing_leads ml
             LEFT JOIN partners p ON ml.assigned_seller_id = p.id
             WHERE ml.follow_up_date IS NOT NULL
               AND ml.follow_up_date <= CURRENT_DATE + INTERVAL '${parseInt(days_ahead)} days'
               AND ml.status NOT IN ('converted', 'not_interested')
             ORDER BY ml.follow_up_date ASC`
        );

        // Agrupar por urgencia
        const today = new Date().toISOString().split('T')[0];
        const overdue = result.rows.filter(l => l.follow_up_date < today);
        const dueToday = result.rows.filter(l => l.follow_up_date === today);
        const upcoming = result.rows.filter(l => l.follow_up_date > today);

        res.json({
            success: true,
            data: {
                overdue: overdue,
                due_today: dueToday,
                upcoming: upcoming,
                total: result.rows.length
            }
        });

    } catch (error) {
        console.error('[MARKETING] Error getting due follow-ups:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/marketing/leads/:id/interaction
 * Registra una interacción con el lead
 */
router.post('/leads/:id/interaction', verifyStaffToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { interaction_type, notes, channel } = req.body;

        // Validar que el lead existe
        const leadResult = await pool.query(
            'SELECT id, interaction_count FROM marketing_leads WHERE id = $1',
            [id]
        );

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead no encontrado' });
        }

        // Incrementar contador de interacciones
        await pool.query(
            `UPDATE marketing_leads SET
                interaction_count = COALESCE(interaction_count, 0) + 1,
                last_interaction_at = NOW()
            WHERE id = $1`,
            [id]
        );

        // Registrar en communications
        await pool.query(
            `INSERT INTO marketing_lead_communications
                (lead_id, comm_type, channel, message, sent_by_staff_id, sent_by_staff_name)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                id,
                interaction_type || 'note',
                channel || 'direct',
                notes || '',
                req.staff.id,
                req.staff.full_name
            ]
        );

        const newCount = (leadResult.rows[0].interaction_count || 0) + 1;
        console.log(`[MARKETING] Interacción registrada para lead ${id}. Total: ${newCount}`);

        res.json({
            success: true,
            message: 'Interacción registrada',
            interaction_count: newCount
        });

    } catch (error) {
        console.error('[MARKETING] Error recording interaction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/partners/available
 * Obtiene lista de partners/vendedores disponibles para asignar
 */
router.get('/partners/available', verifyStaffToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, (first_name || ' ' || last_name) AS name, email, phone
             FROM partners
             WHERE is_active = true
             ORDER BY first_name, last_name ASC`
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('[MARKETING] Error getting available partners:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/marketing/pipeline/summary
 * Obtiene resumen del pipeline unificado
 */
router.get('/pipeline/summary', verifyStaffToken, async (req, res) => {
    try {
        // Intentar usar la vista si existe
        let result;
        try {
            result = await sequelize.query(
                `SELECT pipeline_stage, COUNT(*) as count,
                        SUM(COALESCE(quote_amount, 0)) as total_amount
                 FROM v_sales_pipeline
                 GROUP BY pipeline_stage
                 ORDER BY MAX(stage_order) DESC`,
                { type: QueryTypes.SELECT }
            );
        } catch (viewError) {
            // Vista no existe, calcular manualmente
            result = await pool.query(
                `SELECT
                    CASE
                        WHEN ml.converted_to_quote_id IS NOT NULL THEN 'converted'
                        WHEN ml.status = 'interested' THEN 'interested'
                        WHEN ml.status = 'contacted' THEN 'contacted'
                        WHEN ml.status = 'not_interested' THEN 'lost'
                        ELSE 'new_lead'
                    END as pipeline_stage,
                    COUNT(*) as count
                 FROM marketing_leads ml
                 GROUP BY pipeline_stage`
            );
            result = result.rows;
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[MARKETING] Error getting pipeline summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
