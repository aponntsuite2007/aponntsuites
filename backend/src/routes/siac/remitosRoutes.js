/**
 * ============================================================================
 * REMITOS ROUTES - API REST para Gestión de Remitos
 * ============================================================================
 *
 * Endpoints:
 * - GET    /api/siac/remitos              - Listar remitos
 * - GET    /api/siac/remitos/:id          - Obtener remito por ID
 * - POST   /api/siac/remitos              - Crear remito directo
 * - POST   /api/siac/remitos/from-presupuesto/:id - Crear desde presupuesto
 * - PUT    /api/siac/remitos/:id          - Actualizar remito
 * - PUT    /api/siac/remitos/:id/entregar - Marcar como entregado
 * - POST   /api/siac/remitos/:id/facturar - Facturar remito
 * - DELETE /api/siac/remitos/:id          - Anular remito
 * - GET    /api/siac/remitos/pendientes   - Remitos pendientes de facturar
 * - GET    /api/siac/remitos/stats        - Estadísticas
 *
 * Created: 2025-12-17
 */

const express = require('express');
const router = express.Router();
const RemitosService = require('../../services/siac/RemitosService');

/**
 * GET /api/siac/remitos
 * Listar remitos con filtros
 */
router.get('/', async (req, res) => {
    try {
        const filters = {
            company_id: req.query.company_id || req.user?.company_id,
            cliente_id: req.query.cliente_id,
            estado: req.query.estado,
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            search: req.query.search,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const remitos = await RemitosService.list(filters);

        res.json({
            success: true,
            data: remitos,
            count: remitos.length
        });

    } catch (error) {
        console.error('Error listando remitos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/remitos/pendientes
 * Obtener remitos pendientes de facturar
 */
router.get('/pendientes', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const remitos = await RemitosService.getPendientesFacurar(companyId);

        res.json({
            success: true,
            data: remitos,
            count: remitos.length
        });

    } catch (error) {
        console.error('Error obteniendo remitos pendientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/remitos/stats
 * Obtener estadísticas de remitos
 */
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const periodo = req.query.periodo || 'month';

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const stats = await RemitosService.getEstadisticas(companyId, periodo);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/remitos/:id
 * Obtener remito por ID con items
 */
router.get('/:id', async (req, res) => {
    try {
        const remito = await RemitosService.getById(req.params.id);

        if (!remito) {
            return res.status(404).json({
                success: false,
                error: 'Remito no encontrado'
            });
        }

        res.json({
            success: true,
            data: remito
        });

    } catch (error) {
        console.error('Error obteniendo remito:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/remitos
 * Crear remito directo
 */
router.post('/', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        // Validaciones básicas
        if (!data.company_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        if (!data.cliente_nombre && !data.cliente_id) {
            return res.status(400).json({
                success: false,
                error: 'cliente_id o cliente_nombre es requerido'
            });
        }

        if (!data.punto_venta) {
            data.punto_venta = 1;
        }

        const remito = await RemitosService.create(data);

        res.status(201).json({
            success: true,
            data: remito,
            message: `Remito ${remito.numero_completo} creado exitosamente`
        });

    } catch (error) {
        console.error('Error creando remito:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/remitos/from-presupuesto/:id
 * Crear remito desde presupuesto
 */
router.post('/from-presupuesto/:id', async (req, res) => {
    try {
        const presupuestoId = req.params.id;
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        const remito = await RemitosService.createFromPresupuesto(presupuestoId, data);

        res.status(201).json({
            success: true,
            data: remito,
            message: `Remito ${remito.numero_completo} generado desde presupuesto`
        });

    } catch (error) {
        console.error('Error creando remito desde presupuesto:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/siac/remitos/:id/entregar
 * Marcar remito como entregado
 */
router.put('/:id/entregar', async (req, res) => {
    try {
        const remito = await RemitosService.marcarEntregado(req.params.id, req.body);

        res.json({
            success: true,
            data: remito,
            message: 'Remito marcado como entregado'
        });

    } catch (error) {
        console.error('Error marcando remito como entregado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/remitos/:id/datos-factura
 * Obtener datos para crear factura desde remito
 */
router.get('/:id/datos-factura', async (req, res) => {
    try {
        const datos = await RemitosService.getDatosParaFactura(req.params.id);

        res.json({
            success: true,
            data: datos
        });

    } catch (error) {
        console.error('Error obteniendo datos para factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/remitos/:id/facturar
 * Facturar remito (crear factura y marcar como facturado)
 */
router.post('/:id/facturar', async (req, res) => {
    try {
        const result = await RemitosService.facturar(req.params.id, req.body);

        res.json({
            success: true,
            data: result,
            message: 'Remito facturado exitosamente'
        });

    } catch (error) {
        console.error('Error facturando remito:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/siac/remitos/:id
 * Anular remito
 */
router.delete('/:id', async (req, res) => {
    try {
        const data = {
            usuario_id: req.body.usuario_id || req.user?.id || 1,
            motivo: req.body.motivo || 'Anulado por usuario'
        };

        const remito = await RemitosService.anular(req.params.id, data);

        res.json({
            success: true,
            data: remito,
            message: 'Remito anulado exitosamente'
        });

    } catch (error) {
        console.error('Error anulando remito:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
