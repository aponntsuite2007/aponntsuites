/**
 * MEDIOS DE PAGO ROUTES - API de Medios de Pago SIAC
 *
 * Endpoints:
 * - GET    /api/siac/medios-pago              - Lista medios de pago activos
 * - GET    /api/siac/medios-pago/tipos        - Lista tipos de medios disponibles
 * - GET    /api/siac/medios-pago/:id          - Obtener medio de pago por ID
 * - POST   /api/siac/medios-pago              - Crear medio de pago
 * - PUT    /api/siac/medios-pago/:id          - Actualizar medio de pago
 * - DELETE /api/siac/medios-pago/:id          - Desactivar medio de pago
 * - POST   /api/siac/medios-pago/calcular     - Calcular monto con beneficios/recargos
 * - POST   /api/siac/medios-pago/retenciones  - Calcular retenciones automáticas
 * - GET    /api/siac/medios-pago/config-cheques/:clienteId - Config cheques diferidos
 * - POST   /api/siac/medios-pago/validar-cheque - Validar cheque diferido
 *
 * Created: 2025-12-31
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const MediosPagoService = require('../../services/siac/MediosPagoService');

// Middleware de autenticación
router.use(auth);

// =============================================================================
// CRUD DE MEDIOS DE PAGO
// =============================================================================

/**
 * GET /api/siac/medios-pago
 * Obtener todos los medios de pago activos de la empresa
 */
router.get('/', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const mediosPago = await MediosPagoService.getMediosPago(companyId);

        res.json({
            success: true,
            data: mediosPago
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error obteniendo medios de pago:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/medios-pago/tipos
 * Obtener tipos de medios de pago disponibles
 */
router.get('/tipos', async (req, res) => {
    try {
        const tipos = MediosPagoService.getTiposMedioPago();
        res.json({
            success: true,
            data: tipos
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error obteniendo tipos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/medios-pago/:id
 * Obtener medio de pago por ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const medioPago = await MediosPagoService.getMedioPagoById(id);

        if (!medioPago) {
            return res.status(404).json({
                success: false,
                error: 'Medio de pago no encontrado'
            });
        }

        res.json({
            success: true,
            data: medioPago
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error obteniendo medio de pago:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/medios-pago
 * Crear nuevo medio de pago
 */
router.post('/', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const data = {
            ...req.body,
            company_id: companyId
        };

        const medioPago = await MediosPagoService.createMedioPago(data);

        console.log(`✅ [MEDIOS-PAGO] Creado: ${data.nombre} (${data.codigo})`);

        res.status(201).json({
            success: true,
            data: medioPago,
            message: `Medio de pago "${data.nombre}" creado exitosamente`
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error creando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/siac/medios-pago/:id
 * Actualizar medio de pago
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const medioPago = await MediosPagoService.updateMedioPago(id, req.body);

        console.log(`✅ [MEDIOS-PAGO] Actualizado: ${medioPago.nombre}`);

        res.json({
            success: true,
            data: medioPago,
            message: 'Medio de pago actualizado exitosamente'
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error actualizando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/siac/medios-pago/:id
 * Desactivar medio de pago (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const medioPago = await MediosPagoService.deleteMedioPago(id);

        console.log(`⚠️ [MEDIOS-PAGO] Desactivado: ${medioPago.nombre}`);

        res.json({
            success: true,
            message: 'Medio de pago desactivado exitosamente'
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error desactivando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// CÁLCULOS
// =============================================================================

/**
 * POST /api/siac/medios-pago/calcular
 * Calcular monto con descuentos/recargos según medio de pago
 * Body: { medioPagoId, montoBase, fechaFactura? }
 * o para múltiples: { mediosPago: [{ medioPagoId, monto }], fechaFactura? }
 */
router.post('/calcular', async (req, res) => {
    try {
        const { medioPagoId, montoBase, mediosPago, fechaFactura } = req.body;

        let resultado;

        if (mediosPago && Array.isArray(mediosPago)) {
            // Múltiples medios de pago
            resultado = await MediosPagoService.calcularMultiplesMediosPago(
                mediosPago,
                fechaFactura ? new Date(fechaFactura) : new Date()
            );
        } else if (medioPagoId && montoBase) {
            // Un solo medio de pago
            resultado = await MediosPagoService.calcularMontoConMedioPago(
                medioPagoId,
                parseFloat(montoBase),
                fechaFactura ? new Date(fechaFactura) : new Date()
            );
        } else {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar medioPagoId y montoBase, o un array mediosPago'
            });
        }

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error calculando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/medios-pago/retenciones
 * Calcular retenciones automáticas para un cliente
 * Body: { clienteId, montoBase }
 */
router.post('/retenciones', async (req, res) => {
    try {
        const { clienteId, montoBase } = req.body;
        const companyId = req.user.company_id;

        if (!clienteId || !montoBase) {
            return res.status(400).json({
                success: false,
                error: 'clienteId y montoBase son requeridos'
            });
        }

        const retenciones = await MediosPagoService.calcularRetenciones(
            clienteId,
            parseFloat(montoBase),
            companyId
        );

        const totalRetenciones = retenciones.reduce((sum, r) => sum + r.montoRetenido, 0);

        res.json({
            success: true,
            data: {
                retenciones,
                totalRetenciones,
                montoNeto: parseFloat(montoBase) - totalRetenciones
            }
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error calculando retenciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/medios-pago/exenciones/:clienteId
 * Obtener exenciones de retenciones de un cliente
 */
router.get('/exenciones/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const exenciones = await MediosPagoService.getExencionesCliente(clienteId);

        res.json({
            success: true,
            data: exenciones
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error obteniendo exenciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// CONFIGURACIÓN DE CHEQUES DIFERIDOS
// =============================================================================

/**
 * GET /api/siac/medios-pago/config-cheques/:clienteId
 * Obtener configuración de cheques diferidos para un cliente
 */
router.get('/config-cheques/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const config = await MediosPagoService.getConfigChequesDiferidos(clienteId);

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error obteniendo config cheques:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/medios-pago/validar-cheque
 * Validar un cheque diferido según configuración del cliente
 * Body: { clienteId, fechaVencimiento, monto }
 */
router.post('/validar-cheque', async (req, res) => {
    try {
        const { clienteId, fechaVencimiento, monto } = req.body;

        if (!clienteId || !fechaVencimiento || !monto) {
            return res.status(400).json({
                success: false,
                error: 'clienteId, fechaVencimiento y monto son requeridos'
            });
        }

        const validacion = await MediosPagoService.validarChequeDiferido(
            clienteId,
            fechaVencimiento,
            parseFloat(monto)
        );

        res.json({
            success: true,
            data: validacion
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error validando cheque:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// INTERESES POR MORA
// =============================================================================

/**
 * GET /api/siac/medios-pago/config-intereses/:clienteId
 * Obtener configuración de intereses por mora para un cliente
 */
router.get('/config-intereses/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const config = await MediosPagoService.getConfigInteresesMora(clienteId);

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error obteniendo config intereses:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/medios-pago/calcular-intereses
 * Calcular intereses por mora
 * Body: { clienteId, montoVencido, diasVencido }
 */
router.post('/calcular-intereses', async (req, res) => {
    try {
        const { clienteId, montoVencido, diasVencido } = req.body;

        if (!clienteId || !montoVencido || diasVencido === undefined) {
            return res.status(400).json({
                success: false,
                error: 'clienteId, montoVencido y diasVencido son requeridos'
            });
        }

        const calculo = await MediosPagoService.calcularInteresesMora(
            clienteId,
            parseFloat(montoVencido),
            parseInt(diasVencido)
        );

        res.json({
            success: true,
            data: calculo
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error calculando intereses:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// VALIDACIÓN
// =============================================================================

/**
 * POST /api/siac/medios-pago/validar
 * Validar si un medio de pago puede usarse para un monto dado
 * Body: { medioPagoId, monto, clienteId? }
 */
router.post('/validar', async (req, res) => {
    try {
        const { medioPagoId, monto, clienteId } = req.body;

        if (!medioPagoId || !monto) {
            return res.status(400).json({
                success: false,
                error: 'medioPagoId y monto son requeridos'
            });
        }

        const validacion = await MediosPagoService.validarMedioPago(
            medioPagoId,
            parseFloat(monto),
            clienteId
        );

        res.json({
            success: true,
            data: validacion
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error validando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/medios-pago/crear-defaults
 * Crear medios de pago por defecto para la empresa
 */
router.post('/crear-defaults', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const mediosPago = await MediosPagoService.crearMediosPagoDefault(companyId);

        console.log(`✅ [MEDIOS-PAGO] Creados medios por defecto para empresa ${companyId}`);

        res.json({
            success: true,
            data: mediosPago,
            message: 'Medios de pago por defecto creados exitosamente'
        });
    } catch (error) {
        console.error('❌ [MEDIOS-PAGO] Error creando defaults:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
