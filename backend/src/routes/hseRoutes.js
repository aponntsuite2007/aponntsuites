/**
 * hseRoutes.js
 * Rutas API para el modulo HSE - Seguridad e Higiene Laboral
 * ISO 45001 / OSHA / EU-OSHA / SRT
 *
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const HseService = require('../services/HseService');
const { auth: authMiddleware } = require('../middleware/auth');

// Aplicar auth a todas las rutas
router.use(authMiddleware);

// =========================================================================
// CATEGORIAS DE EPP (Globales)
// =========================================================================

/**
 * GET /api/v1/hse/categories
 * Obtener todas las categorias de EPP
 */
router.get('/categories', async (req, res) => {
    try {
        const result = await HseService.getCategories();
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getCategories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// CATALOGO DE EPP
// =========================================================================

/**
 * GET /api/v1/hse/catalog
 * Obtener catalogo de EPP de la empresa
 */
router.get('/catalog', async (req, res) => {
    try {
        const { categoryId, isActive, search } = req.query;
        const result = await HseService.getCatalog(req.user.company_id, {
            categoryId: categoryId ? parseInt(categoryId) : null,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            search
        });
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getCatalog:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/hse/catalog
 * Crear EPP en catalogo
 */
router.post('/catalog', async (req, res) => {
    try {
        const result = await HseService.createCatalogItem(req.user.company_id, req.body);
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('[HSE Routes] Error createCatalogItem:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v1/hse/catalog/:id
 * Actualizar EPP del catalogo
 */
router.put('/catalog/:id', async (req, res) => {
    try {
        const result = await HseService.updateCatalogItem(
            req.user.company_id,
            parseInt(req.params.id),
            req.body
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error updateCatalogItem:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/v1/hse/catalog/:id
 * Desactivar EPP del catalogo
 */
router.delete('/catalog/:id', async (req, res) => {
    try {
        const result = await HseService.deleteCatalogItem(
            req.user.company_id,
            parseInt(req.params.id)
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error deleteCatalogItem:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// MATRIZ ROL-EPP (Requirements)
// =========================================================================

/**
 * GET /api/v1/hse/requirements
 * Obtener todos los requerimientos de EPP
 */
router.get('/requirements', async (req, res) => {
    try {
        const result = await HseService.getRequirementsMatrix(req.user.company_id);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getRequirements:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/hse/requirements/position/:positionId
 * Obtener EPP requerido por posicion
 */
router.get('/requirements/position/:positionId', async (req, res) => {
    try {
        const result = await HseService.getRequirementsByPosition(
            req.user.company_id,
            parseInt(req.params.positionId)
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getRequirementsByPosition:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/hse/requirements/matrix
 * Obtener matriz completa rol-EPP
 */
router.get('/requirements/matrix', async (req, res) => {
    try {
        const result = await HseService.getRequirementsMatrix(req.user.company_id);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getRequirementsMatrix:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/hse/requirements
 * Asignar EPP a posicion
 */
router.post('/requirements', async (req, res) => {
    try {
        const result = await HseService.createRequirement(
            req.user.company_id,
            req.body,
            req.user.id
        );
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('[HSE Routes] Error createRequirement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v1/hse/requirements/:id
 * Actualizar requerimiento
 */
router.put('/requirements/:id', async (req, res) => {
    try {
        const result = await HseService.updateRequirement(
            req.user.company_id,
            parseInt(req.params.id),
            req.body
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error updateRequirement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/v1/hse/requirements/:id
 * Eliminar requerimiento
 */
router.delete('/requirements/:id', async (req, res) => {
    try {
        const result = await HseService.deleteRequirement(
            req.user.company_id,
            parseInt(req.params.id)
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error deleteRequirement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ENTREGAS DE EPP
// =========================================================================

/**
 * GET /api/v1/hse/deliveries
 * Obtener entregas de EPP
 */
router.get('/deliveries', async (req, res) => {
    try {
        const { employeeId, status, eppCatalogId } = req.query;
        const result = await HseService.getDeliveries(req.user.company_id, {
            employeeId,
            status,
            eppCatalogId: eppCatalogId ? parseInt(eppCatalogId) : null
        });
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getDeliveries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/hse/deliveries/employee/:employeeId
 * Obtener entregas de un empleado
 */
router.get('/deliveries/employee/:employeeId', async (req, res) => {
    try {
        const result = await HseService.getEmployeeDeliveries(
            req.user.company_id,
            req.params.employeeId
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getEmployeeDeliveries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/hse/deliveries/expiring
 * Obtener EPP proximos a vencer
 */
router.get('/deliveries/expiring', async (req, res) => {
    try {
        const daysAhead = req.query.days ? parseInt(req.query.days) : 30;
        const result = await HseService.getExpiringDeliveries(req.user.company_id, daysAhead);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getExpiringDeliveries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/hse/deliveries
 * Registrar entrega de EPP
 */
router.post('/deliveries', async (req, res) => {
    try {
        const result = await HseService.createDelivery(
            req.user.company_id,
            req.body,
            req.user.id
        );
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('[HSE Routes] Error createDelivery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v1/hse/deliveries/:id
 * Actualizar entrega
 */
router.put('/deliveries/:id', async (req, res) => {
    try {
        // Simple update via service
        const { EppDelivery } = require('../config/database');
        const delivery = await EppDelivery.findOne({
            where: { id: parseInt(req.params.id), company_id: req.user.company_id }
        });

        if (!delivery) {
            return res.status(404).json({ success: false, error: 'Entrega no encontrada' });
        }

        await delivery.update(req.body);
        res.json({ success: true, delivery });
    } catch (error) {
        console.error('[HSE Routes] Error updateDelivery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/hse/deliveries/:id/sign
 * Registrar firma del empleado
 */
router.post('/deliveries/:id/sign', async (req, res) => {
    try {
        const result = await HseService.signDelivery(
            req.user.company_id,
            parseInt(req.params.id),
            req.body.signatureMethod
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error signDelivery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/hse/deliveries/:id/return
 * Registrar devolucion de EPP
 */
router.post('/deliveries/:id/return', async (req, res) => {
    try {
        const result = await HseService.returnDelivery(
            req.user.company_id,
            parseInt(req.params.id),
            req.body
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error returnDelivery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/hse/deliveries/:id/replace
 * Reemplazar EPP vencido
 */
router.post('/deliveries/:id/replace', async (req, res) => {
    try {
        const result = await HseService.replaceDelivery(
            req.user.company_id,
            parseInt(req.params.id),
            req.body,
            req.user.id
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error replaceDelivery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// INSPECCIONES
// =========================================================================

/**
 * GET /api/v1/hse/inspections
 * Obtener inspecciones
 */
router.get('/inspections', async (req, res) => {
    try {
        const { deliveryId, condition, actionRequired } = req.query;
        const result = await HseService.getInspections(req.user.company_id, {
            deliveryId: deliveryId ? parseInt(deliveryId) : null,
            condition,
            actionRequired
        });
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getInspections:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/hse/inspections/pending
 * Obtener inspecciones con acciones pendientes
 */
router.get('/inspections/pending', async (req, res) => {
    try {
        const result = await HseService.getPendingInspections(req.user.company_id);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getPendingInspections:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/hse/inspections
 * Crear inspeccion
 */
router.post('/inspections', async (req, res) => {
    try {
        const result = await HseService.createInspection(
            req.body.delivery_id,
            req.body,
            req.user.id
        );
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('[HSE Routes] Error createInspection:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v1/hse/inspections/:id/complete
 * Completar accion de inspeccion
 */
router.put('/inspections/:id/complete', async (req, res) => {
    try {
        const result = await HseService.completeInspectionAction(parseInt(req.params.id));
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error completeInspectionAction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// DASHBOARD Y REPORTES
// =========================================================================

/**
 * GET /api/v1/hse/dashboard
 * Obtener KPIs del dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        const result = await HseService.getDashboardKPIs(req.user.company_id);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getDashboardKPIs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/hse/compliance/:employeeId
 * Obtener cumplimiento de EPP de un empleado
 */
router.get('/compliance/:employeeId', async (req, res) => {
    try {
        const result = await HseService.getEmployeeCompliance(
            req.user.company_id,
            req.params.employeeId
        );
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getEmployeeCompliance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/hse/reports/expiring
 * Reporte de vencimientos
 */
router.get('/reports/expiring', async (req, res) => {
    try {
        const daysAhead = req.query.days ? parseInt(req.query.days) : 30;
        const result = await HseService.getExpirationReport(req.user.company_id, daysAhead);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getExpirationReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// CONFIGURACION
// =========================================================================

/**
 * GET /api/v1/hse/config
 * Obtener configuracion HSE
 */
router.get('/config', async (req, res) => {
    try {
        const result = await HseService.getConfig(req.user.company_id);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error getConfig:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v1/hse/config
 * Actualizar configuracion HSE
 */
router.put('/config', async (req, res) => {
    try {
        const result = await HseService.updateConfig(req.user.company_id, req.body);
        res.json(result);
    } catch (error) {
        console.error('[HSE Routes] Error updateConfig:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
