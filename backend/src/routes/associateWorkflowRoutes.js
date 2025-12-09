/**
 * ASSOCIATE WORKFLOW ROUTES - APONNT ADMIN VIEW
 * Endpoints para que Aponnt vea el flujo de trabajo de asociados
 * SIN acceder a información confidencial entre asociado y empresa
 *
 * Solo muestra: estados de workflow, facturación agregada, estadísticas
 * NO muestra: detalles de casos, diagnósticos, comunicaciones privadas
 *
 * @version 1.0
 * @date 2025-12-08
 */

const express = require('express');
const router = express.Router();
// Rutas públicas para panel administrativo (sin JWT auth, igual que aponntDashboard.js)
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// =====================================================
// WORKFLOW OVERVIEW
// =====================================================

/**
 * @route GET /api/associates/admin/workflow/overview
 * @desc Vista general del workflow de asociados para Aponnt
 */
router.get('/overview', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        let startDate = new Date();
        switch (period) {
            case '7d': startDate.setDate(startDate.getDate() - 7); break;
            case '30d': startDate.setDate(startDate.getDate() - 30); break;
            case '90d': startDate.setDate(startDate.getDate() - 90); break;
            default: startDate.setDate(startDate.getDate() - 30);
        }

        const [metricsResult] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM partners WHERE is_active = true AND approval_status = 'approved') as total_active_associates,
                (SELECT COUNT(*) FROM partners WHERE approval_status = 'pending') as pending_approval,
                (SELECT COUNT(DISTINCT company_id) FROM company_medical_staff WHERE is_active = true) as companies_with_associates,
                (SELECT COUNT(*) FROM absence_cases WHERE case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')) as active_cases,
                (SELECT COUNT(*) FROM absence_cases WHERE case_status IN ('justified', 'not_justified', 'closed') AND created_at >= :startDate) as completed_cases_period
        `, { replacements: { startDate: startDate.toISOString() }, type: QueryTypes.SELECT });

        const casesByStatus = await sequelize.query(`
            SELECT case_status as status, COUNT(*) as count
            FROM absence_cases WHERE created_at >= :startDate
            GROUP BY case_status ORDER BY count DESC
        `, { replacements: { startDate: startDate.toISOString() }, type: QueryTypes.SELECT });

        const recentActivity = await sequelize.query(`
            SELECT ac.id, ac.case_status as status, ac.absence_type as type,
                   ac.created_at, ac.updated_at, c.name as company_name,
                   p.first_name || ' ' || p.last_name as associate_name, p.specialty,
                   CASE WHEN ac.case_status IN ('justified', 'not_justified', 'closed') THEN 'completed'
                        WHEN ac.case_status IN ('under_review', 'awaiting_docs', 'needs_follow_up') THEN 'in_progress'
                        ELSE 'pending' END as workflow_stage
            FROM absence_cases ac
            JOIN companies c ON ac.company_id = c.company_id
            LEFT JOIN partners p ON ac.assigned_doctor_id = p.id
            WHERE ac.created_at >= :startDate ORDER BY ac.updated_at DESC LIMIT 50
        `, { replacements: { startDate: startDate.toISOString() }, type: QueryTypes.SELECT });

        res.json({ success: true, period, metrics: metricsResult || {}, casesByStatus,
            recentActivity: recentActivity.map(a => ({
                id: a.id, status: a.status, type: a.type, workflowStage: a.workflow_stage,
                companyName: a.company_name, associateName: a.associate_name,
                specialty: a.specialty, createdAt: a.created_at, updatedAt: a.updated_at
            }))
        });
    } catch (error) {
        console.error('[APONNT WORKFLOW] Error getting overview:', error);
        res.status(500).json({ error: 'Error obteniendo vista de workflow' });
    }
});

// =====================================================
// BILLING SUMMARY
// =====================================================

/**
 * @route GET /api/associates/admin/workflow/billing-summary
 * @desc Resumen de facturación para cálculo de comisiones Aponnt
 */
router.get('/billing-summary', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        let startDate = new Date();
        switch (period) {
            case '7d': startDate.setDate(startDate.getDate() - 7); break;
            case '30d': startDate.setDate(startDate.getDate() - 30); break;
            case '90d': startDate.setDate(startDate.getDate() - 90); break;
            case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
            default: startDate.setDate(startDate.getDate() - 30);
        }

        const billingSummary = await sequelize.query(`
            SELECT p.id as associate_id, p.first_name || ' ' || p.last_name as associate_name,
                   p.specialty, COUNT(ac.id) as cases_completed,
                   COUNT(DISTINCT ac.company_id) as companies_served,
                   COUNT(ac.id) * 500 as estimated_billing,
                   COUNT(ac.id) * 500 * 0.15 as aponnt_commission
            FROM partners p
            LEFT JOIN absence_cases ac ON ac.assigned_doctor_id = p.id
                AND ac.case_status IN ('justified', 'not_justified', 'closed')
                AND ac.updated_at >= :startDate
            WHERE p.is_active = true
            GROUP BY p.id, p.first_name, p.last_name, p.specialty
            HAVING COUNT(ac.id) > 0 ORDER BY estimated_billing DESC
        `, { replacements: { startDate: startDate.toISOString() }, type: QueryTypes.SELECT });

        const totals = billingSummary.reduce((acc, item) => ({
            totalCases: acc.totalCases + parseInt(item.cases_completed || 0),
            totalBilling: acc.totalBilling + parseFloat(item.estimated_billing || 0),
            totalCommission: acc.totalCommission + parseFloat(item.aponnt_commission || 0)
        }), { totalCases: 0, totalBilling: 0, totalCommission: 0 });

        res.json({ success: true, period, summary: billingSummary.map(item => ({
            associateId: item.associate_id, associateName: item.associate_name,
            specialty: item.specialty, casesCompleted: parseInt(item.cases_completed || 0),
            companiesServed: parseInt(item.companies_served || 0),
            estimatedBilling: parseFloat(item.estimated_billing || 0),
            aponntCommission: parseFloat(item.aponnt_commission || 0)
        })), totals });
    } catch (error) {
        console.error('[APONNT WORKFLOW] Error getting billing summary:', error);
        res.status(500).json({ error: 'Error obteniendo resumen de facturación' });
    }
});

// =====================================================
// ASSOCIATE DETAIL
// =====================================================

/**
 * @route GET /api/associates/admin/workflow/associate/:associateId
 * @desc Detalle de workflow de un asociado específico (sin info confidencial)
 */
router.get('/associate/:associateId', async (req, res) => {
    try {
        const { associateId } = req.params;
        const { period = '30d' } = req.query;
        let startDate = new Date();
        switch (period) {
            case '7d': startDate.setDate(startDate.getDate() - 7); break;
            case '30d': startDate.setDate(startDate.getDate() - 30); break;
            case '90d': startDate.setDate(startDate.getDate() - 90); break;
            default: startDate.setDate(startDate.getDate() - 30);
        }

        const [associateInfo] = await sequelize.query(`
            SELECT id, first_name, last_name, email, specialty, license_number,
                   is_active, approval_status, created_at
            FROM partners WHERE id = :associateId
        `, { replacements: { associateId }, type: QueryTypes.SELECT });

        if (!associateInfo) return res.status(404).json({ error: 'Asociado no encontrado' });

        const [workMetrics] = await sequelize.query(`
            SELECT COUNT(DISTINCT company_id) as companies_served,
                   COUNT(*) FILTER (WHERE case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')) as active_cases,
                   COUNT(*) FILTER (WHERE case_status IN ('justified', 'not_justified', 'closed')) as completed_cases,
                   COUNT(*) FILTER (WHERE case_status = 'justified') as justified_cases,
                   COUNT(*) FILTER (WHERE case_status = 'not_justified') as not_justified_cases,
                   AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric(10,1) as avg_resolution_days
            FROM absence_cases WHERE assigned_doctor_id = :associateId AND created_at >= :startDate
        `, { replacements: { associateId, startDate: startDate.toISOString() }, type: QueryTypes.SELECT });

        const activityHistory = await sequelize.query(`
            SELECT ac.id, ac.case_status as status, ac.absence_type as type,
                   c.name as company_name, ac.created_at, ac.updated_at,
                   EXTRACT(EPOCH FROM (ac.updated_at - ac.created_at)) / 86400 as days_to_resolve
            FROM absence_cases ac JOIN companies c ON ac.company_id = c.company_id
            WHERE ac.assigned_doctor_id = :associateId AND ac.created_at >= :startDate
            ORDER BY ac.created_at DESC LIMIT 100
        `, { replacements: { associateId, startDate: startDate.toISOString() }, type: QueryTypes.SELECT });

        res.json({ success: true,
            associate: { id: associateInfo.id, name: `${associateInfo.first_name} ${associateInfo.last_name}`,
                email: associateInfo.email, specialty: associateInfo.specialty,
                licenseNumber: associateInfo.license_number, isActive: associateInfo.is_active,
                approvalStatus: associateInfo.approval_status, memberSince: associateInfo.created_at },
            metrics: { companiesServed: parseInt(workMetrics?.companies_served || 0),
                activeCases: parseInt(workMetrics?.active_cases || 0),
                completedCases: parseInt(workMetrics?.completed_cases || 0),
                justifiedCases: parseInt(workMetrics?.justified_cases || 0),
                notJustifiedCases: parseInt(workMetrics?.not_justified_cases || 0),
                avgResolutionDays: parseFloat(workMetrics?.avg_resolution_days || 0) },
            activityHistory: activityHistory.map(item => ({
                id: item.id, status: item.status, type: item.type, companyName: item.company_name,
                createdAt: item.created_at, updatedAt: item.updated_at,
                daysToResolve: parseFloat(item.days_to_resolve || 0).toFixed(1)
            }))
        });
    } catch (error) {
        console.error('[APONNT WORKFLOW] Error getting associate detail:', error);
        res.status(500).json({ error: 'Error obteniendo detalle del asociado' });
    }
});

// =====================================================
// COMPANIES LIST
// =====================================================

/**
 * @route GET /api/associates/admin/workflow/companies
 * @desc Lista de empresas con asociados contratados
 */
router.get('/companies', async (req, res) => {
    try {
        const companies = await sequelize.query(`
            SELECT c.company_id as id, c.name, c.slug, c.contact_email,
                   COUNT(DISTINCT cms.partner_id) as associates_count,
                   COUNT(DISTINCT ac.id) FILTER (WHERE ac.case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')) as active_cases,
                   COUNT(DISTINCT ac.id) FILTER (WHERE ac.case_status IN ('justified', 'not_justified', 'closed')) as completed_cases
            FROM companies c
            LEFT JOIN company_medical_staff cms ON c.company_id = cms.company_id AND cms.is_active = true
            LEFT JOIN absence_cases ac ON c.company_id = ac.company_id
            WHERE c.is_active = true AND (cms.id IS NOT NULL OR ac.id IS NOT NULL)
            GROUP BY c.company_id, c.name, c.slug, c.contact_email
            ORDER BY associates_count DESC, c.name
        `, { type: QueryTypes.SELECT });

        res.json({ success: true, companies: companies.map(c => ({
            id: c.id, name: c.name, slug: c.slug, contactEmail: c.contact_email,
            associatesCount: parseInt(c.associates_count || 0),
            activeCases: parseInt(c.active_cases || 0),
            completedCases: parseInt(c.completed_cases || 0)
        })) });
    } catch (error) {
        console.error('[APONNT WORKFLOW] Error getting companies:', error);
        res.status(500).json({ error: 'Error obteniendo empresas' });
    }
});

// =====================================================
// GLOBAL STATS
// =====================================================

/**
 * @route GET /api/associates/admin/workflow/stats
 * @desc Estadísticas globales para dashboard Aponnt
 */
router.get('/stats', async (req, res) => {
    try {
        const currentMonth = new Date(); currentMonth.setDate(1); currentMonth.setHours(0, 0, 0, 0);
        const previousMonth = new Date(currentMonth); previousMonth.setMonth(previousMonth.getMonth() - 1);

        const [stats] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM partners WHERE is_active = true AND approval_status = 'approved') as total_associates,
                (SELECT COUNT(*) FROM partners WHERE approval_status = 'pending') as pending_associates,
                (SELECT COUNT(*) FROM partners WHERE created_at >= :currentMonth) as new_associates_month,
                (SELECT COUNT(DISTINCT company_id) FROM company_medical_staff WHERE is_active = true) as companies_with_associates,
                (SELECT COUNT(*) FROM absence_cases WHERE created_at >= :currentMonth) as cases_this_month,
                (SELECT COUNT(*) FROM absence_cases WHERE case_status IN ('justified', 'not_justified', 'closed') AND updated_at >= :currentMonth) as completed_this_month,
                (SELECT COUNT(*) FROM absence_cases WHERE created_at >= :previousMonth AND created_at < :currentMonth) as cases_last_month,
                (SELECT COUNT(*) FROM absence_cases WHERE case_status IN ('justified', 'not_justified', 'closed') AND updated_at >= :previousMonth AND updated_at < :currentMonth) as completed_last_month,
                (SELECT COUNT(*) * 500 FROM absence_cases WHERE case_status IN ('justified', 'not_justified', 'closed') AND updated_at >= :currentMonth) as billing_this_month,
                (SELECT COUNT(*) * 500 * 0.15 FROM absence_cases WHERE case_status IN ('justified', 'not_justified', 'closed') AND updated_at >= :currentMonth) as commission_this_month
        `, { replacements: { currentMonth: currentMonth.toISOString(), previousMonth: previousMonth.toISOString() }, type: QueryTypes.SELECT });

        const casesVariation = stats.cases_last_month > 0
            ? ((stats.cases_this_month - stats.cases_last_month) / stats.cases_last_month * 100).toFixed(1) : 0;

        res.json({ success: true, stats: {
            associates: { total: parseInt(stats.total_associates || 0),
                pending: parseInt(stats.pending_associates || 0),
                newThisMonth: parseInt(stats.new_associates_month || 0) },
            companies: { withAssociates: parseInt(stats.companies_with_associates || 0) },
            cases: { thisMonth: parseInt(stats.cases_this_month || 0),
                completedThisMonth: parseInt(stats.completed_this_month || 0),
                lastMonth: parseInt(stats.cases_last_month || 0),
                variation: parseFloat(casesVariation) },
            billing: { estimatedThisMonth: parseFloat(stats.billing_this_month || 0),
                commissionThisMonth: parseFloat(stats.commission_this_month || 0) }
        }});
    } catch (error) {
        console.error('[APONNT WORKFLOW] Error getting stats:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

module.exports = router;
