/**
 * ============================================================================
 * CUENTA CORRIENTE ROUTES - API REST para Cuentas Corrientes
 * ============================================================================
 *
 * Endpoints:
 * - GET    /api/siac/cuenta-corriente/clientes         - Clientes con saldo
 * - GET    /api/siac/cuenta-corriente/morosos          - Clientes morosos
 * - GET    /api/siac/cuenta-corriente/estadisticas     - Estadísticas de cartera
 * - GET    /api/siac/cuenta-corriente/:clienteId       - Estado de cuenta
 * - GET    /api/siac/cuenta-corriente/:clienteId/resumen    - Resumen
 * - GET    /api/siac/cuenta-corriente/:clienteId/aging      - Aging
 * - GET    /api/siac/cuenta-corriente/:clienteId/pendientes - Comprobantes pendientes
 * - GET    /api/siac/cuenta-corriente/:clienteId/verificar  - Verificar cliente
 * - POST   /api/siac/cuenta-corriente/movimiento       - Registrar movimiento
 * - POST   /api/siac/cuenta-corriente/:clienteId/imputar    - Imputar pago
 * - POST   /api/siac/cuenta-corriente/:clienteId/interes    - Aplicar interés
 *
 * Created: 2025-12-17
 */

const express = require('express');
const router = express.Router();
const CuentaCorrienteService = require('../../services/siac/CuentaCorrienteService');

/**
 * GET /api/siac/cuenta-corriente/clientes
 * Listar clientes con saldo
 */
router.get('/clientes', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const filters = {
            solo_con_saldo: req.query.solo_con_saldo === 'true',
            solo_vencidos: req.query.solo_vencidos === 'true',
            dias_vencido_minimo: req.query.dias_vencido_minimo ? parseInt(req.query.dias_vencido_minimo) : null,
            search: req.query.search,
            order_by: req.query.order_by,
            order_dir: req.query.order_dir,
            limit: parseInt(req.query.limit) || 100
        };

        const clientes = await CuentaCorrienteService.getClientesConSaldo(companyId, filters);

        res.json({
            success: true,
            data: clientes,
            count: clientes.length
        });

    } catch (error) {
        console.error('Error listando clientes con saldo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cuenta-corriente/morosos
 * Obtener clientes morosos
 */
router.get('/morosos', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const diasMinimo = parseInt(req.query.dias_minimo) || 30;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const morosos = await CuentaCorrienteService.getClientesMorosos(companyId, diasMinimo);

        res.json({
            success: true,
            data: morosos,
            count: morosos.length
        });

    } catch (error) {
        console.error('Error obteniendo morosos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cuenta-corriente/estadisticas
 * Obtener estadísticas de cartera
 */
router.get('/estadisticas', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const stats = await CuentaCorrienteService.getEstadisticasCartera(companyId);

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
 * GET /api/siac/cuenta-corriente/:clienteId
 * Obtener estado de cuenta completo de un cliente
 */
router.get('/:clienteId', async (req, res) => {
    try {
        const filters = {
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            solo_pendientes: req.query.solo_pendientes === 'true'
        };

        const movimientos = await CuentaCorrienteService.getEstadoCuenta(req.params.clienteId, filters);

        res.json({
            success: true,
            data: movimientos,
            count: movimientos.length
        });

    } catch (error) {
        console.error('Error obteniendo estado de cuenta:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cuenta-corriente/:clienteId/resumen
 * Obtener resumen de cuenta corriente
 */
router.get('/:clienteId/resumen', async (req, res) => {
    try {
        const resumen = await CuentaCorrienteService.getResumen(req.params.clienteId);

        res.json({
            success: true,
            data: resumen
        });

    } catch (error) {
        console.error('Error obteniendo resumen:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cuenta-corriente/:clienteId/aging
 * Obtener aging (antigüedad de saldos)
 */
router.get('/:clienteId/aging', async (req, res) => {
    try {
        const aging = await CuentaCorrienteService.getAging(req.params.clienteId);

        res.json({
            success: true,
            data: aging
        });

    } catch (error) {
        console.error('Error obteniendo aging:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cuenta-corriente/:clienteId/pendientes
 * Obtener comprobantes pendientes
 */
router.get('/:clienteId/pendientes', async (req, res) => {
    try {
        const pendientes = await CuentaCorrienteService.getComprobantesPendientes(req.params.clienteId);

        res.json({
            success: true,
            data: pendientes,
            count: pendientes.length
        });

    } catch (error) {
        console.error('Error obteniendo pendientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cuenta-corriente/:clienteId/verificar
 * Verificar si cliente puede operar
 */
router.get('/:clienteId/verificar', async (req, res) => {
    try {
        const montoOperacion = parseFloat(req.query.monto) || 0;
        const estado = await CuentaCorrienteService.verificarCliente(req.params.clienteId, montoOperacion);

        res.json({
            success: true,
            data: estado
        });

    } catch (error) {
        console.error('Error verificando cliente:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/cuenta-corriente/movimiento
 * Registrar movimiento en cuenta corriente
 */
router.post('/movimiento', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        if (!data.company_id || !data.cliente_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id y cliente_id son requeridos'
            });
        }

        if (!data.tipo || !['DEBITO', 'CREDITO'].includes(data.tipo)) {
            return res.status(400).json({
                success: false,
                error: 'tipo debe ser DEBITO o CREDITO'
            });
        }

        const movimiento = await CuentaCorrienteService.registrarMovimiento(data);

        res.status(201).json({
            success: true,
            data: movimiento,
            message: 'Movimiento registrado exitosamente'
        });

    } catch (error) {
        console.error('Error registrando movimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/cuenta-corriente/:clienteId/imputar
 * Imputar pago a comprobantes pendientes
 */
router.post('/:clienteId/imputar', async (req, res) => {
    try {
        const { monto, recibo_id } = req.body;

        if (!monto || monto <= 0) {
            return res.status(400).json({
                success: false,
                error: 'monto debe ser mayor a 0'
            });
        }

        const resultado = await CuentaCorrienteService.imputarPago(
            req.params.clienteId,
            monto,
            recibo_id
        );

        res.json({
            success: true,
            data: resultado,
            message: `Imputados $${resultado.monto_imputado} a ${resultado.imputaciones.length} comprobantes`
        });

    } catch (error) {
        console.error('Error imputando pago:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/cuenta-corriente/:clienteId/interes
 * Aplicar interés por mora
 */
router.post('/:clienteId/interes', async (req, res) => {
    try {
        const { tasa_interes } = req.body;
        const usuarioId = req.body.usuario_id || req.user?.id || 1;

        if (!tasa_interes || tasa_interes <= 0) {
            return res.status(400).json({
                success: false,
                error: 'tasa_interes debe ser mayor a 0'
            });
        }

        const resultado = await CuentaCorrienteService.aplicarInteresMora(
            req.params.clienteId,
            tasa_interes,
            usuarioId
        );

        res.json({
            success: true,
            data: resultado,
            message: `Intereses aplicados: $${resultado.total_intereses.toFixed(2)}`
        });

    } catch (error) {
        console.error('Error aplicando interés:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/cuenta-corriente/:clienteId/recalcular
 * Recalcular resumen de cuenta corriente
 */
router.post('/:clienteId/recalcular', async (req, res) => {
    try {
        const resumen = await CuentaCorrienteService.recalcularResumen(req.params.clienteId);

        res.json({
            success: true,
            data: resumen,
            message: 'Resumen recalculado exitosamente'
        });

    } catch (error) {
        console.error('Error recalculando resumen:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
