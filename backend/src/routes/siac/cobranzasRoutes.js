/**
 * ============================================================================
 * COBRANZAS ROUTES - API REST para Cobranzas, Recibos y Cheques
 * ============================================================================
 *
 * Endpoints RECIBOS:
 * - GET    /api/siac/cobranzas/recibos              - Listar recibos
 * - GET    /api/siac/cobranzas/recibos/:id          - Obtener recibo
 * - POST   /api/siac/cobranzas/recibos              - Crear recibo
 * - DELETE /api/siac/cobranzas/recibos/:id          - Anular recibo
 *
 * Endpoints CHEQUES:
 * - GET    /api/siac/cobranzas/cheques              - Listar cheques
 * - GET    /api/siac/cobranzas/cheques/a-vencer     - Cheques a vencer
 * - GET    /api/siac/cobranzas/cheques/stats        - Estadísticas cheques
 * - PUT    /api/siac/cobranzas/cheques/:id/depositar  - Depositar cheque
 * - PUT    /api/siac/cobranzas/cheques/:id/cobrar     - Cobrar cheque
 * - PUT    /api/siac/cobranzas/cheques/:id/rechazar   - Rechazar cheque
 * - PUT    /api/siac/cobranzas/cheques/:id/endosar    - Endosar cheque
 *
 * Endpoints SEGUIMIENTO:
 * - GET    /api/siac/cobranzas/seguimiento/:clienteId     - Gestiones cliente
 * - GET    /api/siac/cobranzas/seguimiento/proximas       - Próximas acciones
 * - GET    /api/siac/cobranzas/seguimiento/promesas-vencidas - Promesas vencidas
 * - POST   /api/siac/cobranzas/seguimiento                - Registrar gestión
 * - PUT    /api/siac/cobranzas/seguimiento/:id/promesa    - Actualizar promesa
 * - GET    /api/siac/cobranzas/stats                      - Estadísticas
 *
 * Created: 2025-12-17
 */

const express = require('express');
const router = express.Router();
const CobranzasService = require('../../services/siac/CobranzasService');

// =============================================================================
// RECIBOS
// =============================================================================

/**
 * GET /api/siac/cobranzas/recibos
 * Listar recibos
 */
router.get('/recibos', async (req, res) => {
    try {
        const filters = {
            company_id: req.query.company_id || req.user?.company_id,
            cliente_id: req.query.cliente_id,
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            estado: req.query.estado,
            search: req.query.search,
            limit: parseInt(req.query.limit) || 50
        };

        const recibos = await CobranzasService.listarRecibos(filters);

        res.json({
            success: true,
            data: recibos,
            count: recibos.length
        });

    } catch (error) {
        console.error('Error listando recibos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cobranzas/recibos/:id
 * Obtener recibo por ID
 */
router.get('/recibos/:id', async (req, res) => {
    try {
        const recibo = await CobranzasService.getReciboById(req.params.id);

        if (!recibo) {
            return res.status(404).json({
                success: false,
                error: 'Recibo no encontrado'
            });
        }

        res.json({
            success: true,
            data: recibo
        });

    } catch (error) {
        console.error('Error obteniendo recibo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/cobranzas/recibos
 * Crear recibo de cobro
 */
router.post('/recibos', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        // Validaciones
        if (!data.company_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        if (!data.cliente_id) {
            return res.status(400).json({
                success: false,
                error: 'cliente_id es requerido'
            });
        }

        if (!data.medios_pago || data.medios_pago.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Debe incluir al menos un medio de pago'
            });
        }

        const recibo = await CobranzasService.crearRecibo(data);

        res.status(201).json({
            success: true,
            data: recibo,
            message: `Recibo ${recibo.numero_completo} creado exitosamente`
        });

    } catch (error) {
        console.error('Error creando recibo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/siac/cobranzas/recibos/:id
 * Anular recibo
 */
router.delete('/recibos/:id', async (req, res) => {
    try {
        const data = {
            usuario_id: req.body.usuario_id || req.user?.id || 1,
            motivo: req.body.motivo || 'Anulado por usuario'
        };

        const recibo = await CobranzasService.anularRecibo(req.params.id, data);

        res.json({
            success: true,
            data: recibo,
            message: 'Recibo anulado exitosamente'
        });

    } catch (error) {
        console.error('Error anulando recibo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// CHEQUES
// =============================================================================

/**
 * GET /api/siac/cobranzas/cheques
 * Listar cheques en cartera
 */
router.get('/cheques', async (req, res) => {
    try {
        const filters = {
            company_id: req.query.company_id || req.user?.company_id,
            estado: req.query.estado,
            estados: req.query.estados ? req.query.estados.split(',') : null,
            fecha_cobro_desde: req.query.fecha_cobro_desde,
            fecha_cobro_hasta: req.query.fecha_cobro_hasta,
            banco: req.query.banco,
            limit: parseInt(req.query.limit) || 100
        };

        const cheques = await CobranzasService.listarChequesCartera(filters);

        res.json({
            success: true,
            data: cheques,
            count: cheques.length
        });

    } catch (error) {
        console.error('Error listando cheques:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cobranzas/cheques/a-vencer
 * Obtener cheques a vencer
 */
router.get('/cheques/a-vencer', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const dias = parseInt(req.query.dias) || 7;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const cheques = await CobranzasService.getChequesAVencer(companyId, dias);

        res.json({
            success: true,
            data: cheques,
            count: cheques.length
        });

    } catch (error) {
        console.error('Error obteniendo cheques a vencer:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cobranzas/cheques/stats
 * Estadísticas de cheques
 */
router.get('/cheques/stats', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const stats = await CobranzasService.getEstadisticasCheques(companyId);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de cheques:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/siac/cobranzas/cheques/:id/depositar
 * Depositar cheque
 */
router.put('/cheques/:id/depositar', async (req, res) => {
    try {
        const cheque = await CobranzasService.depositarCheque(req.params.id, req.body);

        res.json({
            success: true,
            data: cheque,
            message: 'Cheque depositado exitosamente'
        });

    } catch (error) {
        console.error('Error depositando cheque:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/siac/cobranzas/cheques/:id/cobrar
 * Marcar cheque como cobrado
 */
router.put('/cheques/:id/cobrar', async (req, res) => {
    try {
        const cheque = await CobranzasService.cobrarCheque(req.params.id, req.body);

        res.json({
            success: true,
            data: cheque,
            message: 'Cheque marcado como cobrado'
        });

    } catch (error) {
        console.error('Error cobrando cheque:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/siac/cobranzas/cheques/:id/rechazar
 * Rechazar cheque
 */
router.put('/cheques/:id/rechazar', async (req, res) => {
    try {
        if (!req.body.motivo_rechazo) {
            return res.status(400).json({
                success: false,
                error: 'motivo_rechazo es requerido'
            });
        }

        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        const cheque = await CobranzasService.rechazarCheque(req.params.id, data);

        res.json({
            success: true,
            data: cheque,
            message: 'Cheque rechazado y débito registrado en cuenta corriente'
        });

    } catch (error) {
        console.error('Error rechazando cheque:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/siac/cobranzas/cheques/:id/endosar
 * Endosar cheque
 */
router.put('/cheques/:id/endosar', async (req, res) => {
    try {
        if (!req.body.endosado_a) {
            return res.status(400).json({
                success: false,
                error: 'endosado_a es requerido'
            });
        }

        const cheque = await CobranzasService.endosarCheque(req.params.id, req.body);

        res.json({
            success: true,
            data: cheque,
            message: 'Cheque endosado exitosamente'
        });

    } catch (error) {
        console.error('Error endosando cheque:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// SEGUIMIENTO DE COBRANZA
// =============================================================================

/**
 * GET /api/siac/cobranzas/seguimiento/proximas
 * Obtener próximas acciones pendientes
 */
router.get('/seguimiento/proximas', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const dias = parseInt(req.query.dias) || 7;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const acciones = await CobranzasService.getProximasAcciones(companyId, dias);

        res.json({
            success: true,
            data: acciones,
            count: acciones.length
        });

    } catch (error) {
        console.error('Error obteniendo próximas acciones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cobranzas/seguimiento/promesas-vencidas
 * Obtener promesas de pago vencidas no cumplidas
 */
router.get('/seguimiento/promesas-vencidas', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const promesas = await CobranzasService.getPromesasVencidas(companyId);

        res.json({
            success: true,
            data: promesas,
            count: promesas.length
        });

    } catch (error) {
        console.error('Error obteniendo promesas vencidas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cobranzas/seguimiento/:clienteId
 * Listar gestiones de un cliente
 */
router.get('/seguimiento/:clienteId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const gestiones = await CobranzasService.listarGestionesCliente(req.params.clienteId, limit);

        res.json({
            success: true,
            data: gestiones,
            count: gestiones.length
        });

    } catch (error) {
        console.error('Error obteniendo gestiones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/cobranzas/seguimiento
 * Registrar gestión de cobranza
 */
router.post('/seguimiento', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        // Validaciones
        if (!data.company_id || !data.cliente_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id y cliente_id son requeridos'
            });
        }

        if (!data.tipo_accion) {
            return res.status(400).json({
                success: false,
                error: 'tipo_accion es requerido'
            });
        }

        const gestion = await CobranzasService.registrarGestion(data);

        res.status(201).json({
            success: true,
            data: gestion,
            message: 'Gestión registrada exitosamente'
        });

    } catch (error) {
        console.error('Error registrando gestión:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/siac/cobranzas/seguimiento/:id/promesa
 * Actualizar estado de promesa de pago
 */
router.put('/seguimiento/:id/promesa', async (req, res) => {
    try {
        const cumplida = req.body.cumplida === true;
        const gestion = await CobranzasService.actualizarPromesa(req.params.id, cumplida);

        res.json({
            success: true,
            data: gestion,
            message: `Promesa marcada como ${cumplida ? 'cumplida' : 'incumplida'}`
        });

    } catch (error) {
        console.error('Error actualizando promesa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/cobranzas/stats
 * Estadísticas de cobranza
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

        const stats = await CobranzasService.getEstadisticasCobranza(companyId, periodo);

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

module.exports = router;
