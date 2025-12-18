/**
 * ============================================================================
 * LEAD ROUTES - API para gestión de leads
 * ============================================================================
 *
 * Endpoints para:
 * - CRUD de leads
 * - Scoring y actividades
 * - Pipeline y reportes
 * - Lifecycle management
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const LeadScoringService = require('../services/LeadScoringService');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Middleware de autenticación (usando el existente de aponnt staff)
const authenticateStaff = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt-secret-key');

        // Verificar que es staff de APONNT
        if (!decoded.staffId && !decoded.staff_id) {
            return res.status(403).json({ error: 'Acceso solo para staff de APONNT' });
        }

        req.staffId = decoded.staffId || decoded.staff_id;
        req.staffRole = decoded.role_code || decoded.roleCode;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// =========================================================================
// CRUD DE LEADS
// =========================================================================

/**
 * GET /api/leads - Obtener leads del vendedor o todos (según rol)
 */
router.get('/', authenticateStaff, async (req, res) => {
    try {
        const { lifecycle, temperature, source, assigned_to, all } = req.query;
        const isManager = ['GG', 'GR', 'LV'].includes(req.staffRole);

        let whereClause = 'WHERE 1=1';
        const params = [];

        // Filtrar por vendedor asignado (a menos que sea gerente pidiendo todos)
        if (!isManager || !all) {
            whereClause += ' AND assigned_vendor_id = ?';
            params.push(req.staffId);
        } else if (assigned_to) {
            whereClause += ' AND assigned_vendor_id = ?';
            params.push(assigned_to);
        }

        // Filtros opcionales
        if (lifecycle) {
            whereClause += ' AND lifecycle_stage = ?';
            params.push(lifecycle);
        }
        if (temperature) {
            whereClause += ' AND temperature = ?';
            params.push(temperature);
        }
        if (source) {
            whereClause += ' AND lead_source = ?';
            params.push(source);
        }

        // Por defecto no mostrar descalificados
        if (req.query.include_disqualified !== 'true') {
            whereClause += ' AND is_disqualified = false';
        }

        const leads = await sequelize.query(`
            SELECT
                l.*,
                l.bant_budget + l.bant_authority + l.bant_need + l.bant_timeline AS bant_total,
                s.full_name AS vendor_name,
                s.email AS vendor_email
            FROM sales_leads l
            LEFT JOIN aponnt_staff s ON l.assigned_vendor_id = s.staff_id
            ${whereClause}
            ORDER BY
                CASE temperature
                    WHEN 'hot' THEN 1
                    WHEN 'warm' THEN 2
                    WHEN 'cold' THEN 3
                    ELSE 4
                END,
                total_score DESC,
                updated_at DESC
            LIMIT 100
        `, {
            replacements: params,
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            count: leads.length,
            leads
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error obteniendo leads:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/leads/:id - Obtener lead por ID
 */
router.get('/:id', authenticateStaff, async (req, res) => {
    try {
        const lead = await LeadScoringService.getLeadById(req.params.id);

        if (!lead) {
            return res.status(404).json({ error: 'Lead no encontrado' });
        }

        // Obtener actividades recientes
        const activities = await LeadScoringService.getLeadActivities(req.params.id, 20);

        res.json({
            success: true,
            lead,
            activities
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error obteniendo lead:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/leads - Crear nuevo lead
 */
router.post('/', authenticateStaff, async (req, res) => {
    try {
        const data = req.body;

        const [result] = await sequelize.query(`
            INSERT INTO sales_leads (
                company_name, company_industry, company_employee_count,
                company_country, company_province, company_city, company_website,
                contact_name, contact_email, contact_phone, contact_whatsapp,
                contact_job_title, contact_is_decision_maker,
                lead_source, lead_source_detail,
                assigned_vendor_id, assigned_at,
                lifecycle_stage, temperature,
                notes, created_by
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, CURRENT_TIMESTAMP,
                'lead', 'cold',
                ?, ?
            )
            RETURNING id
        `, {
            replacements: [
                (data.companyName || '').toUpperCase(),
                data.companyIndustry || 'otro',
                data.companyEmployeeCount,
                data.companyCountry || 'Argentina',
                data.companyProvince,
                data.companyCity,
                data.companyWebsite,
                data.contactName,
                data.contactEmail,
                data.contactPhone,
                data.contactWhatsapp,
                data.contactJobTitle,
                data.contactIsDecisionMaker || false,
                data.leadSource || 'other',
                data.leadSourceDetail,
                data.assignedVendorId || req.staffId,
                data.notes,
                req.staffId
            ],
            type: QueryTypes.SELECT
        });

        // Registrar actividad inicial si viene de demo request
        if (data.leadSource === 'demo_request') {
            await LeadScoringService.recordActivity(result.id, 'demo_requested', 'Solicitó demo');
        }

        res.status(201).json({
            success: true,
            leadId: result.id,
            message: 'Lead creado exitosamente'
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error creando lead:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/leads/:id - Actualizar lead
 */
router.patch('/:id', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Construir query dinámico
        const fields = [];
        const values = [];

        const allowedFields = [
            'company_name', 'company_industry', 'company_employee_count',
            'company_country', 'company_province', 'company_city', 'company_website',
            'contact_name', 'contact_email', 'contact_phone', 'contact_whatsapp',
            'contact_job_title', 'contact_is_decision_maker', 'contact_linkedin',
            'assigned_vendor_id', 'notes', 'next_action', 'next_action_date',
            'expected_decision_date', 'budget_available_date', 'contract_end_current_vendor',
            'current_vendor', 'competitors_evaluating', 'interested_modules', 'primary_interest'
        ];

        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(snakeKey)) {
                fields.push(`${snakeKey} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await sequelize.query(`
            UPDATE sales_leads SET ${fields.join(', ')} WHERE id = ?
        `, { replacements: values });

        res.json({ success: true, message: 'Lead actualizado' });

    } catch (error) {
        console.error('❌ [LEADS API] Error actualizando lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// SCORING Y BANT
// =========================================================================

/**
 * POST /api/leads/:id/activity - Registrar actividad
 */
router.post('/:id/activity', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { activityType, description, metadata } = req.body;

        const result = await LeadScoringService.recordActivity(
            id,
            activityType,
            description,
            metadata || {},
            req.staffId
        );

        res.json({
            success: true,
            newScore: result?.new_score,
            newTemperature: result?.new_temperature
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error registrando actividad:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/leads/:id/bant - Actualizar BANT score
 */
router.patch('/:id/bant', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { budget, authority, need, timeline, notes } = req.body;

        const totalScore = await LeadScoringService.updateBANT(id, {
            budget,
            authority,
            need,
            timeline,
            notes
        });

        res.json({
            success: true,
            totalScore,
            message: 'BANT actualizado'
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error actualizando BANT:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// LIFECYCLE MANAGEMENT
// =========================================================================

/**
 * POST /api/leads/:id/lifecycle - Cambiar lifecycle stage
 */
router.post('/:id/lifecycle', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { newStage, reason } = req.body;

        const changed = await LeadScoringService.changeLifecycle(
            id,
            newStage,
            reason,
            req.staffId
        );

        res.json({
            success: changed,
            message: changed ? `Lifecycle cambiado a ${newStage}` : 'Sin cambios'
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error cambiando lifecycle:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/leads/:id/disqualify - Descalificar lead
 */
router.post('/:id/disqualify', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, notes, canReactivate, reactivateAfter } = req.body;

        const success = await LeadScoringService.disqualifyLead(
            id,
            reason,
            notes,
            canReactivate !== false,
            reactivateAfter,
            req.staffId
        );

        res.json({
            success,
            message: success ? 'Lead descalificado' : 'Error descalificando'
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error descalificando lead:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/leads/:id/reactivate - Reactivar lead descalificado
 */
router.post('/:id/reactivate', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        await sequelize.query(`
            UPDATE sales_leads SET
                is_disqualified = false,
                lifecycle_stage = 'lead',
                temperature = 'cold',
                disqualification_reason = NULL,
                disqualification_notes = NULL,
                disqualified_at = NULL,
                disqualified_by = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND can_reactivate = true
        `, { replacements: [id] });

        // Registrar actividad
        await LeadScoringService.recordActivity(id, 'website_visit', `Reactivado: ${reason || 'Manual'}`, {}, req.staffId);

        res.json({ success: true, message: 'Lead reactivado' });

    } catch (error) {
        console.error('❌ [LEADS API] Error reactivando lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// ASIGNACIÓN
// =========================================================================

/**
 * POST /api/leads/:id/assign - Asignar lead a vendedor
 */
router.post('/:id/assign', authenticateStaff, async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId, reason } = req.body;

        // Verificar permisos (solo gerentes o el propio vendedor puede reasignar)
        const isManager = ['GG', 'GR', 'LV'].includes(req.staffRole);
        if (!isManager) {
            return res.status(403).json({ error: 'Solo gerentes pueden reasignar leads' });
        }

        await sequelize.query(`
            UPDATE sales_leads SET
                previous_vendor_id = assigned_vendor_id,
                assigned_vendor_id = ?,
                assigned_at = CURRENT_TIMESTAMP,
                notes = COALESCE(notes || E'\\n', '') || ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, {
            replacements: [
                vendorId,
                `[${new Date().toISOString()}] Reasignado: ${reason || 'Sin motivo'}`,
                id
            ]
        });

        res.json({ success: true, message: 'Lead reasignado' });

    } catch (error) {
        console.error('❌ [LEADS API] Error asignando lead:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// REPORTES Y PIPELINE
// =========================================================================

/**
 * GET /api/leads/pipeline/summary - Resumen del pipeline
 */
router.get('/pipeline/summary', authenticateStaff, async (req, res) => {
    try {
        const pipeline = await LeadScoringService.getPipeline();

        // Totales
        const totals = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE temperature = 'hot') as hot,
                COUNT(*) FILTER (WHERE temperature = 'warm') as warm,
                COUNT(*) FILTER (WHERE temperature = 'cold') as cold,
                COUNT(*) FILTER (WHERE lifecycle_stage = 'mql') as mql,
                COUNT(*) FILTER (WHERE lifecycle_stage = 'sql') as sql,
                COUNT(*) FILTER (WHERE lifecycle_stage = 'opportunity') as opportunities,
                COUNT(*) FILTER (WHERE lifecycle_stage = 'customer' AND converted_to_customer_at > CURRENT_DATE - INTERVAL '30 days') as new_customers_30d,
                AVG(total_score)::INTEGER as avg_score
            FROM sales_leads
            WHERE is_disqualified = false
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            pipeline,
            totals: totals[0]
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error obteniendo pipeline:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/leads/hot - Obtener leads HOT para seguimiento urgente
 */
router.get('/hot/urgent', authenticateStaff, async (req, res) => {
    try {
        const isManager = ['GG', 'GR', 'LV'].includes(req.staffRole);
        const vendorId = isManager ? null : req.staffId;

        const hotLeads = await LeadScoringService.getHotLeads(vendorId);

        res.json({
            success: true,
            count: hotLeads.length,
            leads: hotLeads
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error obteniendo hot leads:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/leads/reactivate/pending - Leads para reactivar
 */
router.get('/reactivate/pending', authenticateStaff, async (req, res) => {
    try {
        const leads = await LeadScoringService.getLeadsToReactivate();

        res.json({
            success: true,
            count: leads.length,
            leads
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error obteniendo leads para reactivar:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/leads/stats/vendor - Estadísticas por vendedor
 */
router.get('/stats/vendor', authenticateStaff, async (req, res) => {
    try {
        const vendorId = req.query.vendor_id || req.staffId;
        const stats = await LeadScoringService.getVendorStats(vendorId);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error obteniendo stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// MANTENIMIENTO
// =========================================================================

/**
 * POST /api/leads/maintenance/decay - Ejecutar decay de inactividad
 * Solo para admins/sistema
 */
router.post('/maintenance/decay', authenticateStaff, async (req, res) => {
    try {
        // Solo gerencia puede ejecutar mantenimiento
        if (!['GG', 'GR'].includes(req.staffRole)) {
            return res.status(403).json({ error: 'Solo gerencia puede ejecutar mantenimiento' });
        }

        const affectedCount = await LeadScoringService.runInactivityDecay();

        res.json({
            success: true,
            affectedCount,
            message: `Decay aplicado a ${affectedCount} leads`
        });

    } catch (error) {
        console.error('❌ [LEADS API] Error ejecutando decay:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
