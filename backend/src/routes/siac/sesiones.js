const express = require('express');
const router = express.Router();
const SiacSessionManager = require('../../services/siac/SessionManager');
const { auth } = require('../../middleware/auth');

/**
 * SIAC SESIONES - APIs de Concurrencia
 * Manejo de 20+ terminales simultáneas sin conflictos
 */

// ===============================================
// CREAR NUEVA SESIÓN
// ===============================================
router.post('/crear', auth, async (req, res) => {
    try {
        const { terminalId, companyId } = req.body;
        const userId = req.user.user_id;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        if (!terminalId || !companyId) {
            return res.status(400).json({
                success: false,
                error: 'Terminal ID y Company ID son obligatorios'
            });
        }

        const resultado = await SiacSessionManager.crearSesion(
            companyId,
            terminalId,
            userId,
            ipAddress,
            userAgent
        );

        res.json(resultado);

    } catch (error) {
        console.error('Error creando sesión:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// AGREGAR ITEM TEMPORAL
// ===============================================
router.post('/:sessionId/agregar-item', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { tipoTabla, item } = req.body;

        if (!tipoTabla || !item) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de tabla e item son obligatorios'
            });
        }

        const resultado = await SiacSessionManager.agregarItemTemporal(
            sessionId,
            tipoTabla,
            item
        );

        res.json(resultado);

    } catch (error) {
        console.error('Error agregando item temporal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER PRÓXIMO NÚMERO DE COMPROBANTE
// ===============================================
router.post('/:sessionId/proximo-numero', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { tipoComprobante, companyId } = req.body;

        if (!tipoComprobante || !companyId) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de comprobante y Company ID son obligatorios'
            });
        }

        const sessionData = {
            sessionId,
            userId: req.user.user_id,
            terminalId: req.body.terminalId || 'UNKNOWN'
        };

        const resultado = await SiacSessionManager.obtenerProximoNumeroSeguro(
            companyId,
            tipoComprobante,
            sessionData
        );

        res.json(resultado);

    } catch (error) {
        console.error('Error obteniendo próximo número:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// CONFIRMAR OPERACIÓN
// ===============================================
router.post('/:sessionId/confirmar-operacion', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { tipoOperacion, datosConfirmacion } = req.body;

        if (!tipoOperacion || !datosConfirmacion) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de operación y datos de confirmación son obligatorios'
            });
        }

        const resultado = await SiacSessionManager.confirmarOperacion(
            sessionId,
            tipoOperacion,
            datosConfirmacion
        );

        res.json(resultado);

    } catch (error) {
        console.error('Error confirmando operación:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER ESTADO DE SESIÓN
// ===============================================
router.get('/:sessionId/estado', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const resultado = await SiacSessionManager.obtenerEstadoSesion(sessionId);

        res.json(resultado);

    } catch (error) {
        console.error('Error obteniendo estado de sesión:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// CERRAR SESIÓN
// ===============================================
router.post('/:sessionId/cerrar', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { motivo } = req.body;

        const resultado = await SiacSessionManager.cerrarSesion(
            sessionId,
            motivo || 'Sesión cerrada por usuario'
        );

        res.json(resultado);

    } catch (error) {
        console.error('Error cerrando sesión:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER SESIONES ACTIVAS DE UNA EMPRESA
// ===============================================
router.get('/activas/:companyId', auth, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Verificar que el usuario tenga acceso a la empresa
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            if (req.user.companyId !== parseInt(companyId)) {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado a sesiones de esta empresa'
                });
            }
        }

        const resultado = await SiacSessionManager.obtenerSesionesActivas(
            parseInt(companyId)
        );

        res.json(resultado);

    } catch (error) {
        console.error('Error obteniendo sesiones activas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// EJECUTAR CLEANUP MANUAL
// ===============================================
router.post('/cleanup', auth, async (req, res) => {
    try {
        // Solo admins pueden ejecutar cleanup manual
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden ejecutar cleanup'
            });
        }

        const resultado = await SiacSessionManager.ejecutarCleanupAutomatico();

        res.json(resultado);

    } catch (error) {
        console.error('Error ejecutando cleanup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// ENDPOINT DE TESTING PARA 20 CAJAS SIMULTÁNEAS
// ===============================================
router.post('/test-concurrencia', auth, async (req, res) => {
    try {
        // Solo para testing en desarrollo
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Test de concurrencia no disponible en producción'
            });
        }

        const { companyId, numeroTerminales } = req.body;
        const terminales = numeroTerminales || 5;

        console.log(`🧪 [TEST] Iniciando test de concurrencia con ${terminales} terminales`);

        const resultados = [];

        // Crear múltiples sesiones simultáneas
        for (let i = 1; i <= terminales; i++) {
            const terminalId = `CAJA_${i.toString().padStart(2, '0')}`;

            try {
                const sesion = await SiacSessionManager.crearSesion(
                    companyId,
                    terminalId,
                    req.user.user_id,
                    req.ip,
                    `Test Terminal ${i}`
                );

                // Agregar algunos items temporales
                await SiacSessionManager.agregarItemTemporal(
                    sesion.sessionId,
                    'facturacion',
                    {
                        producto: `Producto Test ${i}`,
                        cantidad: Math.floor(Math.random() * 10) + 1,
                        precio: Math.floor(Math.random() * 1000) + 100
                    }
                );

                // Obtener número de comprobante
                const numero = await SiacSessionManager.obtenerProximoNumeroSeguro(
                    companyId,
                    'facturaA',
                    {
                        sessionId: sesion.sessionId,
                        userId: req.user.user_id,
                        terminalId
                    }
                );

                resultados.push({
                    terminal: terminalId,
                    sessionId: sesion.sessionId,
                    numeroAsignado: numero.numeroAsignado,
                    success: true
                });

            } catch (error) {
                resultados.push({
                    terminal: terminalId,
                    error: error.message,
                    success: false
                });
            }
        }

        // Verificar que no hay números duplicados
        const numerosAsignados = resultados
            .filter(r => r.success)
            .map(r => r.numeroAsignado);

        const numerosDuplicados = numerosAsignados.filter(
            (num, index) => numerosAsignados.indexOf(num) !== index
        );

        res.json({
            success: true,
            test: 'Concurrencia múltiples terminales',
            terminalesCreados: resultados.filter(r => r.success).length,
            errores: resultados.filter(r => !r.success).length,
            numerosDuplicados: numerosDuplicados.length,
            resultados,
            mensaje: numerosDuplicados.length === 0 ?
                '✅ Test exitoso - Sin duplicados en numeración' :
                '❌ Test falló - Números duplicados detectados'
        });

    } catch (error) {
        console.error('Error en test de concurrencia:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;