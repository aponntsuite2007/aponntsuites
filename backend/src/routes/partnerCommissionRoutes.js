/**
 * PARTNER COMMISSION ROUTES
 * API para el sistema de comisiones que Aponnt cobra a los asociados
 *
 * BASE URL: /api/partners/commissions/*
 *
 * @version 1.0
 * @date 2025-12-08
 */

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// =====================================================
// DASHBOARD & OVERVIEW
// =====================================================

/**
 * @route GET /api/partners/commissions/dashboard
 * @desc Vista general del dashboard de comisiones para Aponnt
 */
router.get('/dashboard', auth, async (req, res) => {
    try {
        // Obtener estadisticas globales
        const [stats] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM partners WHERE is_active = true AND approval_status = 'approved') as total_partners,
                (SELECT COUNT(*) FROM partner_commissions WHERE is_active = true) as partners_with_config,
                (SELECT COALESCE(SUM(commission_amount), 0) FROM partner_commission_transactions WHERE status = 'pending') as total_pending,
                (SELECT COALESCE(SUM(commission_amount), 0) FROM partner_commission_transactions WHERE status = 'paid') as total_collected,
                (SELECT COALESCE(SUM(commission_amount), 0) FROM partner_commission_transactions
                 WHERE status != 'cancelled'
                 AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                 AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as this_month_total
        `, { type: QueryTypes.SELECT });

        // Obtener top asociados por comision
        const topPartners = await sequelize.query(`
            SELECT
                p.id as partner_id,
                p.first_name || ' ' || p.last_name as partner_name,
                p.specialty,
                COUNT(pct.id) as total_transactions,
                COALESCE(SUM(pct.commission_amount), 0) as total_commission,
                COALESCE(SUM(CASE WHEN pct.status = 'pending' THEN pct.commission_amount ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN pct.status = 'paid' THEN pct.commission_amount ELSE 0 END), 0) as paid
            FROM partners p
            LEFT JOIN partner_commission_transactions pct ON p.id = pct.partner_id AND pct.status != 'cancelled'
            WHERE p.is_active = true
            GROUP BY p.id, p.first_name, p.last_name, p.specialty
            ORDER BY total_commission DESC
            LIMIT 10
        `, { type: QueryTypes.SELECT });

        // Comisiones por mes (ultimos 6 meses)
        const monthlyCommissions = await sequelize.query(`
            SELECT
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                COUNT(*) as transactions,
                COALESCE(SUM(commission_amount), 0) as total_commission,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as collected
            FROM partner_commission_transactions
            WHERE status != 'cancelled'
              AND transaction_date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
            ORDER BY month DESC
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            stats: {
                totalPartners: parseInt(stats.total_partners || 0),
                partnersWithConfig: parseInt(stats.partners_with_config || 0),
                pendingCommissions: parseFloat(stats.total_pending || 0),
                collectedCommissions: parseFloat(stats.total_collected || 0),
                thisMonthTotal: parseFloat(stats.this_month_total || 0)
            },
            topPartners: topPartners.map(p => ({
                partnerId: p.partner_id,
                partnerName: p.partner_name,
                specialty: p.specialty,
                totalTransactions: parseInt(p.total_transactions || 0),
                totalCommission: parseFloat(p.total_commission || 0),
                pending: parseFloat(p.pending || 0),
                paid: parseFloat(p.paid || 0)
            })),
            monthlyCommissions: monthlyCommissions.map(m => ({
                month: m.month,
                transactions: parseInt(m.transactions || 0),
                totalCommission: parseFloat(m.total_commission || 0),
                collected: parseFloat(m.collected || 0)
            }))
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] Dashboard error:', error);
        res.status(500).json({ error: 'Error obteniendo dashboard de comisiones' });
    }
});

// =====================================================
// COMMISSION CONFIG
// =====================================================

/**
 * @route GET /api/partners/commissions/config
 * @desc Lista de configuraciones de comision por asociado
 */
router.get('/config', auth, async (req, res) => {
    try {
        const configs = await sequelize.query(`
            SELECT
                pc.id,
                pc.partner_id,
                p.first_name || ' ' || p.last_name as partner_name,
                p.specialty,
                pc.commission_type,
                pc.percentage,
                pc.fixed_amount,
                pc.is_active,
                pc.effective_from,
                pc.effective_until,
                pc.notes,
                pc.created_at
            FROM partner_commissions pc
            JOIN partners p ON pc.partner_id = p.id
            ORDER BY pc.is_active DESC, pc.created_at DESC
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            configs: configs.map(c => ({
                id: c.id,
                partnerId: c.partner_id,
                partnerName: c.partner_name,
                specialty: c.specialty,
                commissionType: c.commission_type,
                percentage: parseFloat(c.percentage || 0),
                fixedAmount: parseFloat(c.fixed_amount || 0),
                isActive: c.is_active,
                effectiveFrom: c.effective_from,
                effectiveUntil: c.effective_until,
                notes: c.notes,
                createdAt: c.created_at
            }))
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] Config list error:', error);
        res.status(500).json({ error: 'Error obteniendo configuraciones' });
    }
});

/**
 * @route POST /api/partners/commissions/config
 * @desc Crear o actualizar configuracion de comision para un asociado
 */
router.post('/config', auth, async (req, res) => {
    try {
        const {
            partnerId,
            commissionType = 'percentage',
            percentage = 15,
            fixedAmount = 0,
            effectiveFrom,
            effectiveUntil,
            notes
        } = req.body;

        if (!partnerId) {
            return res.status(400).json({ error: 'partnerId es requerido' });
        }

        // Desactivar config anterior si existe
        await sequelize.query(`
            UPDATE partner_commissions
            SET is_active = false, updated_at = NOW()
            WHERE partner_id = :partnerId AND is_active = true
        `, { replacements: { partnerId }, type: QueryTypes.UPDATE });

        // Crear nueva config
        const [newConfig] = await sequelize.query(`
            INSERT INTO partner_commissions (
                partner_id, commission_type, percentage, fixed_amount,
                effective_from, effective_until, notes, created_by
            ) VALUES (
                :partnerId, :commissionType, :percentage, :fixedAmount,
                COALESCE(:effectiveFrom, CURRENT_DATE), :effectiveUntil, :notes, :createdBy
            )
            RETURNING *
        `, {
            replacements: {
                partnerId,
                commissionType,
                percentage,
                fixedAmount,
                effectiveFrom: effectiveFrom || null,
                effectiveUntil: effectiveUntil || null,
                notes: notes || null,
                createdBy: req.user?.id || null
            },
            type: QueryTypes.INSERT
        });

        res.json({
            success: true,
            message: 'Configuracion de comision creada',
            config: newConfig
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] Config create error:', error);
        res.status(500).json({ error: 'Error creando configuracion' });
    }
});

// =====================================================
// TRANSACTIONS
// =====================================================

/**
 * @route GET /api/partners/commissions/transactions
 * @desc Lista de transacciones de comision
 */
router.get('/transactions', auth, async (req, res) => {
    try {
        const { partnerId, status, startDate, endDate, limit = 100 } = req.query;

        let whereClause = 'WHERE 1=1';
        const replacements = { limit: parseInt(limit) };

        if (partnerId) {
            whereClause += ' AND pct.partner_id = :partnerId';
            replacements.partnerId = partnerId;
        }
        if (status) {
            whereClause += ' AND pct.status = :status';
            replacements.status = status;
        }
        if (startDate) {
            whereClause += ' AND pct.transaction_date >= :startDate';
            replacements.startDate = startDate;
        }
        if (endDate) {
            whereClause += ' AND pct.transaction_date <= :endDate';
            replacements.endDate = endDate;
        }

        const transactions = await sequelize.query(`
            SELECT
                pct.id,
                pct.partner_id,
                p.first_name || ' ' || p.last_name as partner_name,
                pct.reference_type,
                pct.reference_id,
                c.name as company_name,
                pct.billable_amount,
                pct.commission_percentage,
                pct.commission_amount,
                pct.net_amount,
                pct.status,
                pct.transaction_date,
                pct.invoiced_at,
                pct.paid_at,
                pct.invoice_number,
                pct.description
            FROM partner_commission_transactions pct
            JOIN partners p ON pct.partner_id = p.id
            LEFT JOIN companies c ON pct.company_id = c.company_id
            ${whereClause}
            ORDER BY pct.transaction_date DESC
            LIMIT :limit
        `, { replacements, type: QueryTypes.SELECT });

        res.json({
            success: true,
            transactions: transactions.map(t => ({
                id: t.id,
                partnerId: t.partner_id,
                partnerName: t.partner_name,
                referenceType: t.reference_type,
                referenceId: t.reference_id,
                companyName: t.company_name,
                billableAmount: parseFloat(t.billable_amount || 0),
                commissionPercentage: parseFloat(t.commission_percentage || 0),
                commissionAmount: parseFloat(t.commission_amount || 0),
                netAmount: parseFloat(t.net_amount || 0),
                status: t.status,
                transactionDate: t.transaction_date,
                invoicedAt: t.invoiced_at,
                paidAt: t.paid_at,
                invoiceNumber: t.invoice_number,
                description: t.description
            }))
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] Transactions list error:', error);
        res.status(500).json({ error: 'Error obteniendo transacciones' });
    }
});

/**
 * @route POST /api/partners/commissions/transactions
 * @desc Registrar nueva transaccion de comision
 */
router.post('/transactions', auth, async (req, res) => {
    try {
        const {
            partnerId,
            referenceType,
            referenceId,
            companyId,
            billableAmount,
            description
        } = req.body;

        if (!partnerId || !referenceType || !referenceId || !billableAmount) {
            return res.status(400).json({
                error: 'partnerId, referenceType, referenceId y billableAmount son requeridos'
            });
        }

        // Calcular comision usando la funcion de BD
        const [commissionCalc] = await sequelize.query(`
            SELECT * FROM calculate_partner_commission(:partnerId, :billableAmount)
        `, {
            replacements: { partnerId, billableAmount },
            type: QueryTypes.SELECT
        });

        const commissionAmount = parseFloat(commissionCalc.calculated_commission || billableAmount * 0.15);
        const commissionPercentage = parseFloat(commissionCalc.percentage || 15);
        const netAmount = billableAmount - commissionAmount;

        // Insertar transaccion
        const [transaction] = await sequelize.query(`
            INSERT INTO partner_commission_transactions (
                partner_id, partner_commission_id, reference_type, reference_id,
                company_id, billable_amount, commission_percentage, commission_amount,
                net_amount, description
            ) VALUES (
                :partnerId, :commissionId, :referenceType, :referenceId,
                :companyId, :billableAmount, :commissionPercentage, :commissionAmount,
                :netAmount, :description
            )
            RETURNING *
        `, {
            replacements: {
                partnerId,
                commissionId: commissionCalc.commission_id || null,
                referenceType,
                referenceId,
                companyId: companyId || null,
                billableAmount,
                commissionPercentage,
                commissionAmount,
                netAmount,
                description: description || null
            },
            type: QueryTypes.INSERT
        });

        res.json({
            success: true,
            message: 'Transaccion de comision registrada',
            transaction: {
                ...transaction,
                billableAmount: parseFloat(transaction.billable_amount),
                commissionPercentage: parseFloat(transaction.commission_percentage),
                commissionAmount: parseFloat(transaction.commission_amount),
                netAmount: parseFloat(transaction.net_amount)
            }
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] Transaction create error:', error);
        res.status(500).json({ error: 'Error registrando transaccion' });
    }
});

/**
 * @route PATCH /api/partners/commissions/transactions/:id/status
 * @desc Actualizar estado de una transaccion
 */
router.patch('/transactions/:id/status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, invoiceNumber, paymentReference, paymentMethod } = req.body;

        if (!['pending', 'invoiced', 'paid', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Estado invalido' });
        }

        let additionalFields = '';
        const replacements = { id, status };

        if (status === 'invoiced') {
            additionalFields = ', invoiced_at = NOW()';
            if (invoiceNumber) {
                additionalFields += ', invoice_number = :invoiceNumber';
                replacements.invoiceNumber = invoiceNumber;
            }
        } else if (status === 'paid') {
            additionalFields = ', paid_at = NOW()';
            if (paymentReference) {
                additionalFields += ', payment_reference = :paymentReference';
                replacements.paymentReference = paymentReference;
            }
            if (paymentMethod) {
                additionalFields += ', payment_method = :paymentMethod';
                replacements.paymentMethod = paymentMethod;
            }
        }

        await sequelize.query(`
            UPDATE partner_commission_transactions
            SET status = :status, updated_at = NOW() ${additionalFields}
            WHERE id = :id
        `, { replacements, type: QueryTypes.UPDATE });

        res.json({
            success: true,
            message: `Transaccion actualizada a ${status}`
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] Status update error:', error);
        res.status(500).json({ error: 'Error actualizando estado' });
    }
});

// =====================================================
// SUMMARIES
// =====================================================

/**
 * @route GET /api/partners/commissions/summaries
 * @desc Resumenes mensuales de comisiones
 */
router.get('/summaries', auth, async (req, res) => {
    try {
        const { partnerId, year, month } = req.query;

        let whereClause = 'WHERE 1=1';
        const replacements = {};

        if (partnerId) {
            whereClause += ' AND pcs.partner_id = :partnerId';
            replacements.partnerId = partnerId;
        }
        if (year) {
            whereClause += ' AND pcs.year = :year';
            replacements.year = parseInt(year);
        }
        if (month) {
            whereClause += ' AND pcs.month = :month';
            replacements.month = parseInt(month);
        }

        const summaries = await sequelize.query(`
            SELECT
                pcs.*,
                p.first_name || ' ' || p.last_name as partner_name,
                p.specialty
            FROM partner_commission_summaries pcs
            JOIN partners p ON pcs.partner_id = p.id
            ${whereClause}
            ORDER BY pcs.year DESC, pcs.month DESC, partner_name
        `, { replacements, type: QueryTypes.SELECT });

        res.json({
            success: true,
            summaries: summaries.map(s => ({
                id: s.id,
                partnerId: s.partner_id,
                partnerName: s.partner_name,
                specialty: s.specialty,
                year: s.year,
                month: s.month,
                totalCases: parseInt(s.total_cases || 0),
                totalBillable: parseFloat(s.total_billable || 0),
                totalCommission: parseFloat(s.total_commission || 0),
                totalNet: parseFloat(s.total_net || 0),
                pendingAmount: parseFloat(s.pending_amount || 0),
                invoicedAmount: parseFloat(s.invoiced_amount || 0),
                paidAmount: parseFloat(s.paid_amount || 0),
                status: s.status
            }))
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] Summaries error:', error);
        res.status(500).json({ error: 'Error obteniendo resumenes' });
    }
});

// =====================================================
// PARTNER SPECIFIC
// =====================================================

/**
 * @route GET /api/partners/commissions/my-commissions
 * @desc Vista de comisiones para el asociado logueado
 */
router.get('/my-commissions', auth, async (req, res) => {
    try {
        // Obtener partner_id del usuario logueado
        const [partner] = await sequelize.query(`
            SELECT id FROM partners WHERE user_id = :userId
        `, { replacements: { userId: req.user.id }, type: QueryTypes.SELECT });

        if (!partner) {
            return res.status(404).json({ error: 'No se encontro asociado para este usuario' });
        }

        const partnerId = partner.id;

        // Obtener config actual
        const [config] = await sequelize.query(`
            SELECT * FROM partner_commissions
            WHERE partner_id = :partnerId AND is_active = true
            ORDER BY created_at DESC LIMIT 1
        `, { replacements: { partnerId }, type: QueryTypes.SELECT });

        // Obtener estadisticas
        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE status != 'cancelled') as total_transactions,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN status = 'invoiced' THEN commission_amount ELSE 0 END), 0) as invoiced_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
                COALESCE(SUM(billable_amount), 0) as total_billed
            FROM partner_commission_transactions
            WHERE partner_id = :partnerId
        `, { replacements: { partnerId }, type: QueryTypes.SELECT });

        // Ultimas transacciones
        const recentTransactions = await sequelize.query(`
            SELECT
                pct.id, pct.reference_type, pct.billable_amount,
                pct.commission_amount, pct.net_amount, pct.status,
                pct.transaction_date, c.name as company_name
            FROM partner_commission_transactions pct
            LEFT JOIN companies c ON pct.company_id = c.company_id
            WHERE pct.partner_id = :partnerId
            ORDER BY pct.transaction_date DESC
            LIMIT 20
        `, { replacements: { partnerId }, type: QueryTypes.SELECT });

        res.json({
            success: true,
            config: config ? {
                commissionType: config.commission_type,
                percentage: parseFloat(config.percentage || 0),
                fixedAmount: parseFloat(config.fixed_amount || 0),
                effectiveFrom: config.effective_from
            } : { commissionType: 'percentage', percentage: 15, fixedAmount: 0 },
            stats: {
                totalTransactions: parseInt(stats.total_transactions || 0),
                pendingAmount: parseFloat(stats.pending_amount || 0),
                invoicedAmount: parseFloat(stats.invoiced_amount || 0),
                paidAmount: parseFloat(stats.paid_amount || 0),
                totalBilled: parseFloat(stats.total_billed || 0)
            },
            recentTransactions: recentTransactions.map(t => ({
                id: t.id,
                referenceType: t.reference_type,
                companyName: t.company_name,
                billableAmount: parseFloat(t.billable_amount || 0),
                commissionAmount: parseFloat(t.commission_amount || 0),
                netAmount: parseFloat(t.net_amount || 0),
                status: t.status,
                transactionDate: t.transaction_date
            }))
        });
    } catch (error) {
        console.error('[PARTNER COMMISSIONS] My commissions error:', error);
        res.status(500).json({ error: 'Error obteniendo mis comisiones' });
    }
});

module.exports = router;
