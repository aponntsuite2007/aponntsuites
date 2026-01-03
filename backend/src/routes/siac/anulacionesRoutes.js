/**
 * ANULACIONES ROUTES - API de Anulaciones y Reversiones SIAC
 *
 * Endpoints:
 * - POST   /api/siac/anulaciones/validar            - Validar si se puede anular
 * - POST   /api/siac/anulaciones/factura/:id        - Anular factura
 * - POST   /api/siac/anulaciones/recibo/:id         - Anular recibo
 * - GET    /api/siac/anulaciones/pendientes         - Solicitudes pendientes de autorización
 * - POST   /api/siac/anulaciones/:id/autorizar      - Autorizar anulación pendiente
 * - POST   /api/siac/anulaciones/:id/rechazar       - Rechazar anulación pendiente
 * - GET    /api/siac/anulaciones/log                - Log de anulaciones
 *
 * Created: 2025-12-31
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const AnulacionesService = require('../../services/siac/AnulacionesService');

// Middleware de autenticación
router.use(auth);

// =============================================================================
// VALIDACIÓN
// =============================================================================

/**
 * POST /api/siac/anulaciones/validar
 * Validar si un documento puede ser anulado
 * Body: { tipoDocumento: 'FACTURA'|'RECIBO', documentoId: number }
 */
router.post('/validar', async (req, res) => {
    try {
        const { tipoDocumento, documentoId } = req.body;

        if (!tipoDocumento || !documentoId) {
            return res.status(400).json({
                success: false,
                error: 'tipoDocumento y documentoId son requeridos'
            });
        }

        const validacion = await AnulacionesService.validarAnulacion(tipoDocumento, documentoId);

        res.json({
            success: true,
            data: validacion
        });
    } catch (error) {
        console.error('❌ [ANULACIONES] Error validando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// ANULACIÓN DE FACTURAS
// =============================================================================

/**
 * POST /api/siac/anulaciones/factura/:id
 * Anular una factura
 * Body: { motivo: string }
 */
router.post('/factura/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const usuarioId = req.user.id;
        const usuarioNombre = req.user.nombre || req.user.username;

        if (!motivo) {
            return res.status(400).json({
                success: false,
                error: 'El motivo de anulación es requerido'
            });
        }

        // Primero validar
        const validacion = await AnulacionesService.validarAnulacion('FACTURA', id);

        if (!validacion.puedeAnular) {
            return res.status(400).json({
                success: false,
                error: validacion.motivos.join('. '),
                validacion
            });
        }

        // Si requiere autorización, crear solicitud
        if (validacion.requiereAutorizacion) {
            const solicitud = await AnulacionesService.solicitarAutorizacion(
                'FACTURA', id, motivo, usuarioId, usuarioNombre
            );
            return res.json({
                success: true,
                data: solicitud,
                requiereAutorizacion: true
            });
        }

        // Ejecutar anulación
        const resultado = await AnulacionesService.anularFactura(
            id, motivo, usuarioId, usuarioNombre
        );

        console.log(`⚠️ [ANULACIONES] Factura ${id} anulada por ${usuarioNombre}`);

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('❌ [ANULACIONES] Error anulando factura:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// ANULACIÓN DE RECIBOS
// =============================================================================

/**
 * POST /api/siac/anulaciones/recibo/:id
 * Anular un recibo
 * Body: { motivo: string }
 */
router.post('/recibo/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const usuarioId = req.user.id;
        const usuarioNombre = req.user.nombre || req.user.username;

        if (!motivo) {
            return res.status(400).json({
                success: false,
                error: 'El motivo de anulación es requerido'
            });
        }

        // Primero validar
        const validacion = await AnulacionesService.validarAnulacion('RECIBO', id);

        if (!validacion.puedeAnular) {
            return res.status(400).json({
                success: false,
                error: validacion.motivos.join('. '),
                validacion
            });
        }

        // Si requiere autorización, crear solicitud
        if (validacion.requiereAutorizacion) {
            const solicitud = await AnulacionesService.solicitarAutorizacion(
                'RECIBO', id, motivo, usuarioId, usuarioNombre
            );
            return res.json({
                success: true,
                data: solicitud,
                requiereAutorizacion: true
            });
        }

        // Ejecutar anulación
        const resultado = await AnulacionesService.anularRecibo(
            id, motivo, usuarioId, usuarioNombre
        );

        console.log(`⚠️ [ANULACIONES] Recibo ${id} anulado por ${usuarioNombre}`);

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('❌ [ANULACIONES] Error anulando recibo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// WORKFLOW DE AUTORIZACIÓN
// =============================================================================

/**
 * GET /api/siac/anulaciones/pendientes
 * Obtener solicitudes de anulación pendientes de autorización
 */
router.get('/pendientes', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const pendientes = await AnulacionesService.getPendientes(companyId);

        res.json({
            success: true,
            data: pendientes
        });
    } catch (error) {
        console.error('❌ [ANULACIONES] Error obteniendo pendientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/anulaciones/:id/autorizar
 * Autorizar una anulación pendiente
 */
router.post('/:id/autorizar', async (req, res) => {
    try {
        const { id } = req.params;
        const autorizanteId = req.user.id;
        const autorizanteNombre = req.user.nombre || req.user.username;

        // Verificar permisos (solo admin o supervisor)
        if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores o supervisores pueden autorizar anulaciones'
            });
        }

        const resultado = await AnulacionesService.autorizarAnulacion(
            id, autorizanteId, autorizanteNombre
        );

        console.log(`✅ [ANULACIONES] Anulación ${id} autorizada por ${autorizanteNombre}`);

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('❌ [ANULACIONES] Error autorizando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/siac/anulaciones/:id/rechazar
 * Rechazar una anulación pendiente
 * Body: { motivo: string }
 */
router.post('/:id/rechazar', async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const autorizanteId = req.user.id;
        const autorizanteNombre = req.user.nombre || req.user.username;

        // Verificar permisos
        if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores o supervisores pueden rechazar anulaciones'
            });
        }

        if (!motivo) {
            return res.status(400).json({
                success: false,
                error: 'El motivo de rechazo es requerido'
            });
        }

        const resultado = await AnulacionesService.rechazarAnulacion(
            id, autorizanteId, autorizanteNombre, motivo
        );

        console.log(`❌ [ANULACIONES] Anulación ${id} rechazada por ${autorizanteNombre}`);

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('❌ [ANULACIONES] Error rechazando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// LOG DE ANULACIONES
// =============================================================================

/**
 * GET /api/siac/anulaciones/log
 * Obtener log de anulaciones
 * Query params: tipoDocumento, clienteId, fechaDesde, fechaHasta
 */
router.get('/log', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { tipoDocumento, clienteId, fechaDesde, fechaHasta } = req.query;

        const log = await AnulacionesService.getLog(companyId, {
            tipoDocumento,
            clienteId: clienteId ? parseInt(clienteId) : null,
            fechaDesde,
            fechaHasta
        });

        res.json({
            success: true,
            data: log
        });
    } catch (error) {
        console.error('❌ [ANULACIONES] Error obteniendo log:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
