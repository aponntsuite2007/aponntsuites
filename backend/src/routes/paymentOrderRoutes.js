/**
 * Payment Order Routes
 * API REST para Órdenes de Pago, Cubo OLAP y Cartera de Cheques
 */

const express = require('express');
const router = express.Router();

// Middleware de autenticación (se inyecta desde server.js)
let authMiddleware = (req, res, next) => next();

// Servicios (se inicializan cuando se monta el router)
let paymentOrderService = null;
let paymentForecastService = null;
let checkManagementService = null;

/**
 * Inicializar servicios con la instancia de DB
 */
router.initServices = (db, authMw) => {
    const PaymentOrderService = require('../services/PaymentOrderService');
    const PaymentForecastService = require('../services/PaymentForecastService');
    const CheckManagementService = require('../services/CheckManagementService');

    paymentOrderService = new PaymentOrderService(db);
    paymentForecastService = new PaymentForecastService(db);
    checkManagementService = new CheckManagementService(db);

    if (authMw) {
        authMiddleware = authMw;
    }
};

// ==========================================
// ÓRDENES DE PAGO
// ==========================================

/**
 * GET /api/payment-orders/pending-invoices
 * Obtener facturas pendientes de pago
 */
router.get('/pending-invoices', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { supplier_id } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const invoices = await paymentOrderService.getPendingInvoices(companyId, supplier_id);

        res.json({
            success: true,
            data: invoices,
            count: invoices.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo facturas pendientes:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders
 * Crear orden de pago
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const companyId = req.user?.company_id || req.body.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const orderData = {
            ...req.body,
            company_id: companyId
        };

        const order = await paymentOrderService.create(orderData, userId);

        res.status(201).json({
            success: true,
            data: order,
            message: 'Orden de pago creada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creando orden de pago:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders
 * Listar órdenes de pago
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const filters = {
            status: req.query.status,
            supplier_id: req.query.supplier_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            scheduled_from: req.query.scheduled_from,
            scheduled_to: req.query.scheduled_to,
            sort_by: req.query.sort_by,
            sort_order: req.query.sort_order,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const result = await paymentOrderService.list(companyId, filters);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Error listando órdenes de pago:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/pending-approval
 * Obtener órdenes pendientes de aprobación
 */
router.get('/pending-approval', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const userRole = req.user?.role || req.query.role;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const orders = await paymentOrderService.getPendingApproval(companyId, userRole);

        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo órdenes pendientes:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/upcoming
 * Obtener órdenes próximas a vencer
 */
router.get('/upcoming', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const days = parseInt(req.query.days) || 7;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const orders = await paymentOrderService.getUpcoming(companyId, days);

        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo órdenes próximas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/stats
 * Obtener estadísticas de órdenes
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { date_from, date_to } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const stats = await paymentOrderService.getStats(companyId, date_from, date_to);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/:id
 * Obtener orden por ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const order = await paymentOrderService.getById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Orden de pago no encontrada' });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('❌ Error obteniendo orden:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/:id/submit
 * Enviar orden a aprobación
 */
router.post('/:id/submit', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const order = await paymentOrderService.submitForApproval(req.params.id, userId);

        res.json({
            success: true,
            data: order,
            message: 'Orden enviada a aprobación'
        });
    } catch (error) {
        console.error('❌ Error enviando a aprobación:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/:id/approve
 * Aprobar orden
 */
router.post('/:id/approve', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const userRole = req.user?.role || req.body.role;
        const authMethod = req.body.auth_method || 'password';

        const order = await paymentOrderService.approve(
            req.params.id,
            userId,
            userRole,
            authMethod
        );

        res.json({
            success: true,
            data: order,
            message: 'Orden aprobada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error aprobando orden:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/:id/schedule
 * Programar fecha de pago
 */
router.post('/:id/schedule', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { payment_date } = req.body;

        if (!payment_date) {
            return res.status(400).json({ error: 'payment_date es requerido' });
        }

        const order = await paymentOrderService.schedulePayment(
            req.params.id,
            payment_date,
            userId
        );

        res.json({
            success: true,
            data: order,
            message: 'Pago programado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error programando pago:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/:id/execute
 * Ejecutar pago
 */
router.post('/:id/execute', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const paymentData = req.body;

        const order = await paymentOrderService.execute(
            req.params.id,
            userId,
            paymentData
        );

        res.json({
            success: true,
            data: order,
            message: 'Pago ejecutado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error ejecutando pago:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/:id/cancel
 * Cancelar orden
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'reason es requerido' });
        }

        const order = await paymentOrderService.cancel(req.params.id, reason, userId);

        res.json({
            success: true,
            data: order,
            message: 'Orden cancelada'
        });
    } catch (error) {
        console.error('❌ Error cancelando orden:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/:id/notify
 * Enviar notificación al proveedor
 */
router.post('/:id/notify', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const order = await paymentOrderService.sendNotification(req.params.id, userId);

        res.json({
            success: true,
            data: order,
            message: 'Notificación enviada al proveedor'
        });
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// CUBO OLAP / FORECAST
// ==========================================

/**
 * POST /api/payment-orders/forecast/refresh
 * Refrescar cubo OLAP
 */
router.post('/forecast/refresh', authMiddleware, async (req, res) => {
    try {
        const result = await paymentForecastService.refreshCube();

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Error refrescando cubo:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/summary
 * Resumen de previsión financiera
 */
router.get('/forecast/summary', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { date_from, date_to } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const summary = await paymentForecastService.getForecastSummary(
            companyId,
            date_from,
            date_to
        );

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('❌ Error obteniendo resumen:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/cube
 * Datos del cubo OLAP
 */
router.get('/forecast/cube', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const options = {
            groupBy: req.query.group_by || 'month',
            dateFrom: req.query.date_from,
            dateTo: req.query.date_to,
            branchId: req.query.branch_id,
            supplierId: req.query.supplier_id,
            costCenterId: req.query.cost_center_id,
            categoryId: req.query.category_id,
            purchaseType: req.query.purchase_type
        };

        const cubeData = await paymentForecastService.getCubeData(companyId, options);

        res.json({
            success: true,
            ...cubeData
        });
    } catch (error) {
        console.error('❌ Error obteniendo datos del cubo:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/drilldown
 * Drill-down en el cubo
 */
router.get('/forecast/drilldown', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { current_level, current_value, target_level } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        // Parsear filtros base del query string
        const baseFilters = {};
        ['date_from', 'date_to', 'branch_id', 'supplier_id', 'cost_center_id', 'category_id', 'purchase_type']
            .forEach(key => {
                if (req.query[key]) {
                    baseFilters[key] = req.query[key];
                }
            });

        const drilldownData = await paymentForecastService.drillDown(
            companyId,
            current_level,
            current_value,
            target_level,
            baseFilters
        );

        res.json({
            success: true,
            ...drilldownData
        });
    } catch (error) {
        console.error('❌ Error en drill-down:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/kpis
 * KPIs del dashboard
 */
router.get('/forecast/kpis', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const kpis = await paymentForecastService.getDashboardKPIs(companyId);

        res.json({
            success: true,
            data: kpis
        });
    } catch (error) {
        console.error('❌ Error obteniendo KPIs:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/timeline
 * Timeline de pagos
 */
router.get('/forecast/timeline', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const days = parseInt(req.query.days) || 30;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const timeline = await paymentForecastService.getPaymentTimeline(companyId, days);

        res.json({
            success: true,
            data: timeline
        });
    } catch (error) {
        console.error('❌ Error obteniendo timeline:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/supplier-concentration
 * Análisis de concentración por proveedor
 */
router.get('/forecast/supplier-concentration', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { date_from, date_to } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const concentration = await paymentForecastService.getSupplierConcentration(
            companyId,
            date_from,
            date_to
        );

        res.json({
            success: true,
            data: concentration
        });
    } catch (error) {
        console.error('❌ Error obteniendo concentración:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/seasonality
 * Análisis de estacionalidad
 */
router.get('/forecast/seasonality', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const seasonality = await paymentForecastService.getSeasonalityAnalysis(companyId);

        res.json({
            success: true,
            data: seasonality
        });
    } catch (error) {
        console.error('❌ Error obteniendo estacionalidad:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/forecast/yoy
 * Comparativa año vs año anterior
 */
router.get('/forecast/yoy', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const comparison = await paymentForecastService.getYearOverYearComparison(companyId);

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('❌ Error obteniendo comparativa YoY:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// CHEQUERAS
// ==========================================

/**
 * POST /api/payment-orders/checkbooks
 * Crear chequera
 */
router.post('/checkbooks', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const companyId = req.user?.company_id || req.body.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const checkbookData = {
            ...req.body,
            company_id: companyId
        };

        const checkbook = await checkManagementService.createCheckbook(checkbookData, userId);

        res.status(201).json({
            success: true,
            data: checkbook,
            message: 'Chequera creada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creando chequera:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checkbooks
 * Listar chequeras
 */
router.get('/checkbooks', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const filters = {
            status: req.query.status,
            bank_account_id: req.query.bank_account_id,
            assigned_to: req.query.assigned_to
        };

        const checkbooks = await checkManagementService.getCheckbooks(companyId, filters);

        res.json({
            success: true,
            data: checkbooks,
            count: checkbooks.length
        });
    } catch (error) {
        console.error('❌ Error listando chequeras:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checkbooks/available
 * Chequeras con cheques disponibles
 */
router.get('/checkbooks/available', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { currency } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const checkbooks = await checkManagementService.getAvailableCheckbooks(companyId, currency);

        res.json({
            success: true,
            data: checkbooks,
            count: checkbooks.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo chequeras disponibles:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checkbooks/stats
 * Estadísticas de chequeras
 */
router.get('/checkbooks/stats', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const stats = await checkManagementService.getCheckbookStats(companyId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error obteniendo stats de chequeras:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checkbooks/:id
 * Obtener chequera por ID
 */
router.get('/checkbooks/:id', authMiddleware, async (req, res) => {
    try {
        const checkbook = await checkManagementService.getCheckbookById(req.params.id);

        if (!checkbook) {
            return res.status(404).json({ error: 'Chequera no encontrada' });
        }

        res.json({
            success: true,
            data: checkbook
        });
    } catch (error) {
        console.error('❌ Error obteniendo chequera:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/checkbooks/:id/cancel
 * Cancelar chequera
 */
router.post('/checkbooks/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'reason es requerido' });
        }

        const checkbook = await checkManagementService.cancelCheckbook(
            req.params.id,
            reason,
            userId
        );

        res.json({
            success: true,
            data: checkbook,
            message: 'Chequera cancelada'
        });
    } catch (error) {
        console.error('❌ Error cancelando chequera:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// CHEQUES
// ==========================================

/**
 * POST /api/payment-orders/checks
 * Emitir cheque manualmente
 */
router.post('/checks', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const companyId = req.user?.company_id || req.body.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const checkData = {
            ...req.body,
            company_id: companyId
        };

        const check = await checkManagementService.issueCheck(checkData, userId);

        res.status(201).json({
            success: true,
            data: check,
            message: 'Cheque emitido exitosamente'
        });
    } catch (error) {
        console.error('❌ Error emitiendo cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks
 * Listar cheques emitidos
 */
router.get('/checks', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const filters = {
            status: req.query.status,
            checkbook_id: req.query.checkbook_id,
            beneficiary_type: req.query.beneficiary_type,
            beneficiary_id: req.query.beneficiary_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            sort_by: req.query.sort_by,
            sort_order: req.query.sort_order,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const result = await checkManagementService.getIssuedChecks(companyId, filters);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Error listando cheques:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/portfolio
 * Cartera de cheques pendientes
 */
router.get('/checks/portfolio', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { date_from, date_to } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const portfolio = await checkManagementService.getPortfolio(companyId, date_from, date_to);

        res.json({
            success: true,
            data: portfolio,
            count: portfolio.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo cartera:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/portfolio/summary
 * Resumen de cartera
 */
router.get('/checks/portfolio/summary', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const summary = await checkManagementService.getPortfolioSummary(companyId);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('❌ Error obteniendo resumen de cartera:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/maturity
 * Análisis de vencimientos
 */
router.get('/checks/maturity', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const maturity = await checkManagementService.getMaturityAnalysis(companyId);

        res.json({
            success: true,
            data: maturity
        });
    } catch (error) {
        console.error('❌ Error obteniendo análisis de vencimientos:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/bounced
 * Cheques rebotados
 */
router.get('/checks/bounced', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const bounced = await checkManagementService.getBouncedChecks(companyId);

        res.json({
            success: true,
            data: bounced,
            count: bounced.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo cheques rebotados:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/upcoming
 * Cheques próximos a vencer
 */
router.get('/checks/upcoming', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const days = parseInt(req.query.days) || 7;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const upcoming = await checkManagementService.getUpcomingChecks(companyId, days);

        res.json({
            success: true,
            data: upcoming,
            count: upcoming.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo cheques próximos:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/stats
 * Estadísticas de cheques
 */
router.get('/checks/stats', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const stats = await checkManagementService.getCheckStats(companyId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error obteniendo stats de cheques:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/timeline
 * Timeline de cheques
 */
router.get('/checks/timeline', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const days = parseInt(req.query.days) || 60;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const timeline = await checkManagementService.getCheckTimeline(companyId, days);

        res.json({
            success: true,
            data: timeline
        });
    } catch (error) {
        console.error('❌ Error obteniendo timeline:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/by-beneficiary
 * Cheques por beneficiario
 */
router.get('/checks/by-beneficiary', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { beneficiary_id, beneficiary_type } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const checks = await checkManagementService.getChecksByBeneficiary(
            companyId,
            beneficiary_id,
            beneficiary_type
        );

        res.json({
            success: true,
            data: checks
        });
    } catch (error) {
        console.error('❌ Error obteniendo cheques por beneficiario:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/dashboard
 * Dashboard de cartera de cheques
 */
router.get('/checks/dashboard', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        const dashboard = await checkManagementService.getDashboardData(companyId);

        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('❌ Error obteniendo dashboard de cheques:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/search
 * Búsqueda de cheques
 */
router.get('/checks/search', authMiddleware, async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { q } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'company_id es requerido' });
        }

        if (!q || q.length < 2) {
            return res.status(400).json({ error: 'Término de búsqueda muy corto' });
        }

        const checks = await checkManagementService.searchChecks(companyId, q);

        res.json({
            success: true,
            data: checks,
            count: checks.length
        });
    } catch (error) {
        console.error('❌ Error buscando cheques:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/:id
 * Obtener cheque por ID
 */
router.get('/checks/:id', authMiddleware, async (req, res) => {
    try {
        const check = await checkManagementService.getCheckById(req.params.id);

        if (!check) {
            return res.status(404).json({ error: 'Cheque no encontrado' });
        }

        res.json({
            success: true,
            data: check
        });
    } catch (error) {
        console.error('❌ Error obteniendo cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payment-orders/checks/:id/history
 * Historial de un cheque
 */
router.get('/checks/:id/history', authMiddleware, async (req, res) => {
    try {
        const history = await checkManagementService.getCheckHistory(req.params.id);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/checks/:id/deliver
 * Marcar cheque como entregado
 */
router.post('/checks/:id/deliver', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { delivered_to, notes } = req.body;

        if (!delivered_to) {
            return res.status(400).json({ error: 'delivered_to es requerido' });
        }

        const check = await checkManagementService.deliverCheck(
            req.params.id,
            delivered_to,
            userId,
            notes
        );

        res.json({
            success: true,
            data: check,
            message: 'Cheque marcado como entregado'
        });
    } catch (error) {
        console.error('❌ Error entregando cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/checks/:id/cash
 * Marcar cheque como cobrado
 */
router.post('/checks/:id/cash', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { bank } = req.body;

        const check = await checkManagementService.cashCheck(req.params.id, userId, bank);

        res.json({
            success: true,
            data: check,
            message: 'Cheque marcado como cobrado'
        });
    } catch (error) {
        console.error('❌ Error cobrando cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/checks/:id/bounce
 * Marcar cheque como rebotado
 */
router.post('/checks/:id/bounce', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { reason, bounce_code } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'reason es requerido' });
        }

        const check = await checkManagementService.bounceCheck(
            req.params.id,
            reason,
            bounce_code,
            userId
        );

        res.json({
            success: true,
            data: check,
            message: 'Cheque marcado como rechazado'
        });
    } catch (error) {
        console.error('❌ Error rechazando cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/checks/:id/void
 * Anular cheque
 */
router.post('/checks/:id/void', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'reason es requerido' });
        }

        const check = await checkManagementService.voidCheck(req.params.id, reason, userId);

        res.json({
            success: true,
            data: check,
            message: 'Cheque anulado'
        });
    } catch (error) {
        console.error('❌ Error anulando cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/checks/:id/cancel
 * Cancelar cheque (después de entregar)
 */
router.post('/checks/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'reason es requerido' });
        }

        const check = await checkManagementService.cancelCheck(req.params.id, reason, userId);

        res.json({
            success: true,
            data: check,
            message: 'Cheque cancelado'
        });
    } catch (error) {
        console.error('❌ Error cancelando cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment-orders/checks/:id/replace
 * Reemplazar cheque
 */
router.post('/checks/:id/replace', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const replacementData = req.body;

        const newCheck = await checkManagementService.replaceCheck(
            req.params.id,
            replacementData,
            userId
        );

        res.status(201).json({
            success: true,
            data: newCheck,
            message: 'Cheque reemplazado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error reemplazando cheque:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
