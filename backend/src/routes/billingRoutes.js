/**
 * ============================================================================
 * BILLING ROUTES - API REST PARA SISTEMA DE FACTURACIÓN DE 3 MODOS
 * ============================================================================
 *
 * Endpoints unificados para los 3 modos de facturación:
 * - MANUAL: Facturación directa sin presupuesto
 * - OCASIONAL: Desde presupuesto que se factura 1 vez
 * - RECURRENTE: Desde presupuesto con facturación periódica
 *
 * BASE URL: /api/billing/*
 *
 * SERVICIOS:
 * - ContractBillingService: Facturación Aponnt desde contratos
 * - RecurringQuoteBillingService: Facturación recurrente desde presupuestos
 * - ManualInvoiceService: Facturación manual directa
 *
 * Created: 2025-01-20
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const ContractBillingService = require('../services/billing/ContractBillingService');
const RecurringQuoteBillingService = require('../services/billing/RecurringQuoteBillingService');
const ManualInvoiceService = require('../services/billing/ManualInvoiceService');

// ============================================
// PRESUPUESTOS
// ============================================

/**
 * POST /api/billing/presupuestos
 * Crear presupuesto (OCASIONAL o RECURRENTE)
 *
 * Body: {
 *   company_id, cliente, items, tipo_facturacion, frecuencia_facturacion, ...
 * }
 */
router.post('/presupuestos', authenticateJWT, async (req, res) => {
    try {
        const Presupuesto = require('../models/siac/Presupuesto');
        const { Sequelize } = require('sequelize');
        const sequelize = Presupuesto.sequelize;

        // Get next numero for this company
        const [result] = await sequelize.query(
            `SELECT COALESCE(MAX(numero), 0) + 1 as next_numero
             FROM siac_presupuestos
             WHERE company_id = :companyId`,
            {
                replacements: { companyId: req.body.companyId || req.user.company_id },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        const nextNumero = result.next_numero;
        const numeroPresupuesto = `PRES-${String(nextNumero).padStart(8, '0')}`;

        // Merge data with auto-generated fields
        const presupuestoData = {
            ...req.body,
            numero: nextNumero,
            numeroPresupuesto: numeroPresupuesto,
            createdBy: 1,  // TODO: Mapear UUID a INTEGER cuando sea necesario
            updatedBy: 1
        };

        const presupuesto = await Presupuesto.create(presupuestoData);

        return res.status(201).json({
            success: true,
            presupuesto
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en POST /presupuestos:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/billing/presupuestos
 * Listar presupuestos
 *
 * Query: ?company_id=X&tipo_facturacion=Y&estado=Z
 */
router.get('/presupuestos', authenticateJWT, async (req, res) => {
    try {
        const Presupuesto = require('../models/siac/Presupuesto');
        const { company_id, tipo_facturacion, estado } = req.query;

        const where = {};
        if (company_id) where.companyId = company_id;
        if (tipo_facturacion) where.tipoFacturacion = tipo_facturacion;
        if (estado) where.estado = estado;

        const presupuestos = await Presupuesto.findAll({ where });

        return res.status(200).json({
            success: true,
            presupuestos,
            count: presupuestos.length
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en GET /presupuestos:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/billing/presupuestos/:id
 * Obtener presupuesto por ID
 */
router.get('/presupuestos/:id', authenticateJWT, async (req, res) => {
    try {
        const Presupuesto = require('../models/siac/Presupuesto');
        const presupuesto = await Presupuesto.findByPk(req.params.id);

        if (!presupuesto) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        return res.status(200).json({
            success: true,
            presupuesto
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en GET /presupuestos/:id:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/billing/presupuestos/:id/aprobar
 * Aprobar presupuesto
 *
 * Body: { aprobado_por }
 */
router.put('/presupuestos/:id/aprobar', authenticateJWT, async (req, res) => {
    try {
        const Presupuesto = require('../models/siac/Presupuesto');
        const presupuesto = await Presupuesto.findByPk(req.params.id);

        if (!presupuesto) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        presupuesto.estado = 'APROBADO';
        presupuesto.fechaAprobacion = new Date();
        presupuesto.aprobadoPor = req.body.aprobado_por || req.user.name;
        await presupuesto.save();

        return res.status(200).json({
            success: true,
            presupuesto
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en PUT /presupuestos/:id/aprobar:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/billing/presupuestos/:id/activar
 * Activar presupuesto RECURRENTE (iniciar facturación automática)
 *
 * Body: { fecha_inicio }
 */
router.put('/presupuestos/:id/activar', authenticateJWT, async (req, res) => {
    try {
        const Presupuesto = require('../models/siac/Presupuesto');
        const presupuesto = await Presupuesto.findByPk(req.params.id);

        if (!presupuesto) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        if (presupuesto.tipoFacturacion !== 'RECURRENTE') {
            return res.status(400).json({
                success: false,
                error: 'Solo presupuestos RECURRENTE pueden activarse'
            });
        }

        presupuesto.estado = 'ACTIVO';
        presupuesto.fechaInicioFacturacion = req.body.fecha_inicio || new Date();
        presupuesto.proximoPeriodoFacturacion = req.body.fecha_inicio || new Date();
        await presupuesto.save();

        return res.status(200).json({
            success: true,
            presupuesto
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en PUT /presupuestos/:id/activar:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// FACTURACIÓN - MODO MANUAL
// ============================================

/**
 * POST /api/billing/invoices/manual
 * Crear factura manual (sin presupuesto)
 *
 * Body: {
 *   company_id, cliente, items, impuestos, ...
 * }
 */
router.post('/invoices/manual', authenticateJWT, async (req, res) => {
    try {
        const { company_id, ...invoiceData } = req.body;

        const invoice = await ManualInvoiceService.createManualInvoice(company_id, invoiceData);

        return res.status(201).json({
            success: true,
            invoice,
            mode: 'MANUAL'
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en POST /invoices/manual:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// FACTURACIÓN - MODO OCASIONAL
// ============================================

/**
 * POST /api/billing/invoices/from-quote/:presupuesto_id
 * Generar factura desde presupuesto OCASIONAL (factura 1 vez)
 */
router.post('/invoices/from-quote/:presupuesto_id', authenticateJWT, async (req, res) => {
    try {
        const Presupuesto = require('../models/siac/Presupuesto');
        const presupuesto = await Presupuesto.findByPk(req.params.presupuesto_id);

        if (!presupuesto) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        if (presupuesto.tipoFacturacion !== 'OCASIONAL') {
            return res.status(400).json({
                success: false,
                error: 'Este endpoint es solo para presupuestos OCASIONAL'
            });
        }

        if (presupuesto.estado === 'FACTURADO') {
            return res.status(400).json({
                success: false,
                error: 'Este presupuesto ya fue facturado'
            });
        }

        // Generar factura (reutilizando lógica de RecurringQuoteBillingService)
        const invoice = await RecurringQuoteBillingService.createInvoiceFromQuote(
            presupuesto,
            new Date().toISOString().slice(0, 7) // YYYY-MM
        );

        // Marcar presupuesto como FACTURADO
        presupuesto.estado = 'FACTURADO';
        presupuesto.cantidadFacturasGeneradas = 1;
        await presupuesto.save();

        return res.status(201).json({
            success: true,
            invoice,
            mode: 'OCASIONAL'
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en POST /invoices/from-quote:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// FACTURACIÓN - MODO RECURRENTE
// ============================================

/**
 * POST /api/billing/invoices/recurring/process-all
 * Procesar facturación de TODOS los presupuestos recurrentes listos
 * (Trigger manual del cron job)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:presupuesto_id
 */
router.post('/invoices/recurring/process-all', authenticateJWT, requireRole(['admin']), async (req, res) => {
    try {
        const results = await RecurringQuoteBillingService.processRecurringBilling();

        return res.status(200).json({
            success: true,
            results,
            mode: 'RECURRENTE_BATCH'
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en POST /invoices/recurring/process-all:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/billing/invoices/recurring/:presupuesto_id
 * Generar factura desde presupuesto RECURRENTE (manual trigger)
 */
router.post('/invoices/recurring/:presupuesto_id', authenticateJWT, async (req, res) => {
    try {
        const invoice = await RecurringQuoteBillingService.generateInvoiceFromRecurringQuote(
            req.params.presupuesto_id
        );

        return res.status(201).json({
            success: true,
            invoice,
            mode: 'RECURRENTE'
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en POST /invoices/recurring:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// FACTURACIÓN - DESDE CONTRATOS (APONNT)
// ============================================

/**
 * POST /api/billing/invoices/from-contract/:contract_id
 * Generar factura mensual desde contrato activo (Aponnt)
 *
 * Body: { billing_month: "YYYY-MM" }
 */
router.post('/invoices/from-contract/:contract_id', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
    try {
        const { billing_month } = req.body;

        if (!billing_month) {
            return res.status(400).json({
                success: false,
                error: 'billing_month es requerido (formato: YYYY-MM)'
            });
        }

        const invoice = await ContractBillingService.generateInvoiceFromContract(
            req.params.contract_id,
            billing_month
        );

        return res.status(201).json({
            success: true,
            invoice,
            mode: 'CONTRACT'
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en POST /invoices/from-contract:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/billing/invoices/contracts/process-monthly
 * Procesar facturación mensual de TODOS los contratos activos (Aponnt)
 * (Trigger manual del cron job)
 *
 * Body: { billing_month: "YYYY-MM" }
 */
router.post('/invoices/contracts/process-monthly', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
    try {
        const { billing_month } = req.body;

        if (!billing_month) {
            return res.status(400).json({
                success: false,
                error: 'billing_month es requerido (formato: YYYY-MM)'
            });
        }

        const results = await ContractBillingService.processMonthlyBilling(billing_month);

        return res.status(200).json({
            success: true,
            results,
            mode: 'CONTRACT_BATCH'
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en POST /invoices/contracts/process-monthly:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GESTIÓN DE FACTURAS
// ============================================

/**
 * PUT /api/billing/invoices/:id/status
 * Actualizar estado de factura
 *
 * Body: { status, notes }
 */
router.put('/invoices/:id/status', authenticateJWT, async (req, res) => {
    try {
        const { status, notes } = req.body;

        await ManualInvoiceService.updateInvoiceStatus(req.params.id, status, notes);

        return res.status(200).json({
            success: true,
            message: `Factura actualizada a estado: ${status}`
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en PUT /invoices/:id/status:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/billing/invoices/:id
 * Anular factura
 *
 * Body: { cancel_reason }
 */
router.delete('/invoices/:id', authenticateJWT, requireRole(['admin', 'finance']), async (req, res) => {
    try {
        const { cancel_reason } = req.body;

        if (!cancel_reason) {
            return res.status(400).json({
                success: false,
                error: 'cancel_reason es requerido'
            });
        }

        await ManualInvoiceService.cancelInvoice(
            req.params.id,
            cancel_reason,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: 'Factura anulada exitosamente'
        });
    } catch (error) {
        console.error('❌ [BILLING API] Error en DELETE /invoices/:id:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
