/**
 * ============================================================================
 * CAJA ROUTES - API REST para Gestión de Caja
 * ============================================================================
 *
 * Endpoints CAJAS:
 * - GET    /api/siac/caja/cajas              - Listar cajas
 * - GET    /api/siac/caja/cajas/:id          - Obtener caja por ID
 * - POST   /api/siac/caja/cajas              - Crear caja
 * - GET    /api/siac/caja/estado             - Estado de todas las cajas
 *
 * Endpoints SESIONES:
 * - GET    /api/siac/caja/sesiones/:cajaId/activa    - Sesión activa
 * - GET    /api/siac/caja/sesiones/:cajaId/historial - Historial sesiones
 * - POST   /api/siac/caja/sesiones/abrir             - Abrir sesión
 * - POST   /api/siac/caja/sesiones/:id/cerrar        - Cerrar sesión
 *
 * Endpoints MOVIMIENTOS:
 * - GET    /api/siac/caja/movimientos/:sesionId      - Movimientos de sesión
 * - GET    /api/siac/caja/movimientos/detalle/:id    - Detalle movimiento
 * - POST   /api/siac/caja/movimientos                - Registrar movimiento
 * - POST   /api/siac/caja/movimientos/ingreso        - Registrar ingreso
 * - POST   /api/siac/caja/movimientos/egreso         - Registrar egreso
 * - DELETE /api/siac/caja/movimientos/:id            - Anular movimiento
 *
 * Endpoints ARQUEO:
 * - GET    /api/siac/caja/arqueo/:sesionId           - Historial arqueos
 * - POST   /api/siac/caja/arqueo                     - Registrar arqueo
 *
 * Endpoints REPORTES:
 * - GET    /api/siac/caja/reportes/dia/:cajaId       - Resumen del día
 * - GET    /api/siac/caja/reportes/estadisticas      - Estadísticas
 * - GET    /api/siac/caja/reportes/por-concepto      - Movimientos por concepto
 *
 * Created: 2025-12-17
 */

const express = require('express');
const router = express.Router();
const CajaService = require('../../services/siac/CajaService');

// =============================================================================
// CAJAS (Maestro)
// =============================================================================

/**
 * GET /api/siac/caja/cajas
 * Listar cajas de la empresa
 */
router.get('/cajas', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const cajas = await CajaService.getCajas(companyId);

        res.json({
            success: true,
            data: cajas,
            count: cajas.length
        });

    } catch (error) {
        console.error('Error listando cajas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/caja/estado
 * Estado de todas las cajas (abiertas/cerradas)
 */
router.get('/estado', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const estado = await CajaService.getEstadoCajas(companyId);

        res.json({
            success: true,
            data: estado,
            count: estado.length
        });

    } catch (error) {
        console.error('Error obteniendo estado de cajas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/caja/cajas/:id
 * Obtener caja por ID
 */
router.get('/cajas/:id', async (req, res) => {
    try {
        const caja = await CajaService.getCajaById(req.params.id);

        if (!caja) {
            return res.status(404).json({
                success: false,
                error: 'Caja no encontrada'
            });
        }

        res.json({
            success: true,
            data: caja
        });

    } catch (error) {
        console.error('Error obteniendo caja:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/caja/cajas
 * Crear nueva caja
 */
router.post('/cajas', async (req, res) => {
    try {
        const data = { ...req.body };

        if (!data.company_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        if (!data.nombre) {
            return res.status(400).json({
                success: false,
                error: 'nombre es requerido'
            });
        }

        const caja = await CajaService.createCaja(data);

        res.status(201).json({
            success: true,
            data: caja,
            message: `Caja "${caja.nombre}" creada exitosamente`
        });

    } catch (error) {
        console.error('Error creando caja:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// SESIONES DE CAJA
// =============================================================================

/**
 * GET /api/siac/caja/sesiones/:cajaId/activa
 * Obtener sesión activa de una caja
 */
router.get('/sesiones/:cajaId/activa', async (req, res) => {
    try {
        const sesion = await CajaService.getSesionActiva(req.params.cajaId);

        res.json({
            success: true,
            data: sesion,
            tiene_sesion_abierta: !!sesion
        });

    } catch (error) {
        console.error('Error obteniendo sesión activa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/caja/sesiones/:cajaId/historial
 * Obtener historial de sesiones
 */
router.get('/sesiones/:cajaId/historial', async (req, res) => {
    try {
        const filters = {
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            limit: parseInt(req.query.limit) || 20
        };

        const sesiones = await CajaService.getHistorialSesiones(req.params.cajaId, filters);

        res.json({
            success: true,
            data: sesiones,
            count: sesiones.length
        });

    } catch (error) {
        console.error('Error obteniendo historial de sesiones:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/caja/sesiones/abrir
 * Abrir sesión de caja
 */
router.post('/sesiones/abrir', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        if (!data.caja_id) {
            return res.status(400).json({
                success: false,
                error: 'caja_id es requerido'
            });
        }

        const sesion = await CajaService.abrirSesion(data);

        res.status(201).json({
            success: true,
            data: sesion,
            message: 'Sesión de caja abierta exitosamente'
        });

    } catch (error) {
        console.error('Error abriendo sesión de caja:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/caja/sesiones/:id/cerrar
 * Cerrar sesión de caja
 */
router.post('/sesiones/:id/cerrar', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        if (data.saldo_cierre_declarado === undefined) {
            return res.status(400).json({
                success: false,
                error: 'saldo_cierre_declarado es requerido'
            });
        }

        const resultado = await CajaService.cerrarSesion(req.params.id, data);

        res.json({
            success: true,
            data: resultado,
            message: 'Sesión de caja cerrada exitosamente'
        });

    } catch (error) {
        console.error('Error cerrando sesión de caja:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// MOVIMIENTOS
// =============================================================================

/**
 * GET /api/siac/caja/movimientos/:sesionId
 * Listar movimientos de una sesión
 */
router.get('/movimientos/:sesionId', async (req, res) => {
    try {
        const filters = {
            tipo: req.query.tipo,
            concepto: req.query.concepto,
            forma_pago: req.query.forma_pago,
            limit: parseInt(req.query.limit) || 100
        };

        const movimientos = await CajaService.getMovimientosSesion(req.params.sesionId, filters);

        res.json({
            success: true,
            data: movimientos,
            count: movimientos.length
        });

    } catch (error) {
        console.error('Error listando movimientos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/caja/movimientos/detalle/:id
 * Obtener detalle de un movimiento
 */
router.get('/movimientos/detalle/:id', async (req, res) => {
    try {
        const movimiento = await CajaService.getMovimientoById(req.params.id);

        if (!movimiento) {
            return res.status(404).json({
                success: false,
                error: 'Movimiento no encontrado'
            });
        }

        res.json({
            success: true,
            data: movimiento
        });

    } catch (error) {
        console.error('Error obteniendo movimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/caja/movimientos
 * Registrar movimiento genérico
 */
router.post('/movimientos', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        // Validaciones
        if (!data.sesion_caja_id) {
            return res.status(400).json({
                success: false,
                error: 'sesion_caja_id es requerido'
            });
        }

        if (!data.tipo || !['INGRESO', 'EGRESO'].includes(data.tipo)) {
            return res.status(400).json({
                success: false,
                error: 'tipo debe ser INGRESO o EGRESO'
            });
        }

        if (!data.concepto) {
            return res.status(400).json({
                success: false,
                error: 'concepto es requerido'
            });
        }

        if (!data.monto || data.monto <= 0) {
            return res.status(400).json({
                success: false,
                error: 'monto debe ser mayor a 0'
            });
        }

        const movimiento = await CajaService.registrarMovimiento(data);

        res.status(201).json({
            success: true,
            data: movimiento,
            message: `${data.tipo} registrado exitosamente`
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
 * POST /api/siac/caja/movimientos/ingreso
 * Registrar ingreso
 */
router.post('/movimientos/ingreso', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        if (!data.sesion_caja_id || !data.concepto || !data.monto) {
            return res.status(400).json({
                success: false,
                error: 'sesion_caja_id, concepto y monto son requeridos'
            });
        }

        const movimiento = await CajaService.registrarIngreso(data);

        res.status(201).json({
            success: true,
            data: movimiento,
            message: 'Ingreso registrado exitosamente'
        });

    } catch (error) {
        console.error('Error registrando ingreso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/caja/movimientos/egreso
 * Registrar egreso
 */
router.post('/movimientos/egreso', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        if (!data.sesion_caja_id || !data.concepto || !data.monto) {
            return res.status(400).json({
                success: false,
                error: 'sesion_caja_id, concepto y monto son requeridos'
            });
        }

        const movimiento = await CajaService.registrarEgreso(data);

        res.status(201).json({
            success: true,
            data: movimiento,
            message: 'Egreso registrado exitosamente'
        });

    } catch (error) {
        console.error('Error registrando egreso:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/siac/caja/movimientos/:id
 * Anular movimiento
 */
router.delete('/movimientos/:id', async (req, res) => {
    try {
        const data = {
            usuario_id: req.body.usuario_id || req.user?.id || 1,
            motivo: req.body.motivo || 'Anulado por usuario'
        };

        const resultado = await CajaService.anularMovimiento(req.params.id, data);

        res.json({
            success: true,
            data: resultado,
            message: 'Movimiento anulado exitosamente'
        });

    } catch (error) {
        console.error('Error anulando movimiento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// ARQUEO
// =============================================================================

/**
 * GET /api/siac/caja/arqueo/:sesionId
 * Obtener historial de arqueos de una sesión
 */
router.get('/arqueo/:sesionId', async (req, res) => {
    try {
        const arqueos = await CajaService.getHistorialArqueos(req.params.sesionId);

        res.json({
            success: true,
            data: arqueos,
            count: arqueos.length
        });

    } catch (error) {
        console.error('Error obteniendo arqueos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/caja/arqueo
 * Registrar arqueo de caja
 */
router.post('/arqueo', async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.body.usuario_id || req.user?.id || 1
        };

        if (!data.sesion_caja_id) {
            return res.status(400).json({
                success: false,
                error: 'sesion_caja_id es requerido'
            });
        }

        const arqueo = await CajaService.registrarArqueo(data);

        res.status(201).json({
            success: true,
            data: arqueo,
            message: `Arqueo registrado - Estado: ${arqueo.estado}`
        });

    } catch (error) {
        console.error('Error registrando arqueo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// REPORTES
// =============================================================================

/**
 * GET /api/siac/caja/reportes/dia/:cajaId
 * Obtener resumen del día para una caja
 */
router.get('/reportes/dia/:cajaId', async (req, res) => {
    try {
        const fecha = req.query.fecha || null;
        const resumen = await CajaService.getResumenDia(req.params.cajaId, fecha);

        res.json({
            success: true,
            data: resumen
        });

    } catch (error) {
        console.error('Error obteniendo resumen del día:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/siac/caja/reportes/estadisticas
 * Obtener estadísticas de caja
 */
router.get('/reportes/estadisticas', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const periodo = req.query.periodo || 'month';

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const stats = await CajaService.getEstadisticas(companyId, periodo);

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
 * GET /api/siac/caja/reportes/por-concepto
 * Obtener movimientos agrupados por concepto
 */
router.get('/reportes/por-concepto', async (req, res) => {
    try {
        const companyId = req.query.company_id || req.user?.company_id;
        const dias = parseInt(req.query.dias) || 30;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const movimientos = await CajaService.getMovimientosPorConcepto(companyId, dias);

        res.json({
            success: true,
            data: movimientos,
            count: movimientos.length
        });

    } catch (error) {
        console.error('Error obteniendo movimientos por concepto:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
