/**
 * ============================================================================
 * BRAIN NERVOUS SYSTEM ROUTES - API del Sistema Nervioso del Brain
 * ============================================================================
 *
 * Endpoints para controlar y monitorear el sistema nervioso del Brain.
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Importar servicios
let BrainNervousSystem, BrainEscalationService;

// Lazy load de servicios
const loadServices = () => {
    if (!BrainNervousSystem) {
        BrainNervousSystem = require('../brain/services/BrainNervousSystem');
    }
    if (!BrainEscalationService) {
        BrainEscalationService = require('../brain/services/BrainEscalationService');
    }
};

/**
 * ========================================================================
 * CONTROL DEL SISTEMA
 * ========================================================================
 */

/**
 * GET /api/brain/nervous/status
 * Obtener estado del sistema nervioso
 */
router.get('/status', async (req, res) => {
    try {
        loadServices();
        const status = BrainNervousSystem.getStatus();

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error obteniendo status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/nervous/start
 * Iniciar el sistema nervioso
 */
router.post('/start', async (req, res) => {
    try {
        loadServices();

        const started = await BrainNervousSystem.start();

        res.json({
            success: started,
            message: started ?
                'Sistema nervioso iniciado correctamente' :
                'No se pudo iniciar el sistema nervioso'
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error iniciando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/nervous/stop
 * Detener el sistema nervioso
 */
router.post('/stop', async (req, res) => {
    try {
        loadServices();

        BrainNervousSystem.stop();

        res.json({
            success: true,
            message: 'Sistema nervioso detenido'
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error deteniendo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/nervous/stats
 * Obtener estadisticas del sistema
 */
router.get('/stats', async (req, res) => {
    try {
        loadServices();
        const stats = BrainNervousSystem.getStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error obteniendo stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ========================================================================
 * INCIDENTES
 * ========================================================================
 */

/**
 * GET /api/brain/nervous/incidents
 * Obtener incidentes activos
 */
router.get('/incidents', async (req, res) => {
    try {
        loadServices();
        const incidents = BrainEscalationService.getActiveIncidents();

        res.json({
            success: true,
            total: incidents.length,
            data: incidents
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error obteniendo incidentes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/nervous/report
 * Reportar un problema manualmente
 */
router.post('/report', async (req, res) => {
    try {
        loadServices();

        const { type, module, severity, message, stack, files } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'El campo "message" es requerido'
            });
        }

        const incident = await BrainNervousSystem.reportProblem({
            type: type || 'manual_report',
            module,
            severity: severity || 'medium',
            message,
            stack,
            files
        });

        res.json({
            success: true,
            message: 'Problema reportado correctamente',
            data: incident
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error reportando problema:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/nervous/cleanup
 * Limpiar incidentes resueltos
 */
router.post('/cleanup', async (req, res) => {
    try {
        loadServices();
        const cleaned = BrainEscalationService.cleanupResolvedIncidents();

        res.json({
            success: true,
            message: `Limpiados ${cleaned.length} incidentes resueltos`,
            data: { cleaned }
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error limpiando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ========================================================================
 * HEALTH CHECKS Y SSOT
 * ========================================================================
 */

/**
 * POST /api/brain/nervous/health-check
 * Ejecutar health check manual
 */
router.post('/health-check', async (req, res) => {
    try {
        loadServices();

        // Ejecutar health check
        await BrainNervousSystem.runHealthCheck();

        res.json({
            success: true,
            message: 'Health check ejecutado',
            data: {
                lastCheck: BrainNervousSystem.lastHealthCheck,
                stats: BrainNervousSystem.getStats()
            }
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error en health check:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/nervous/ssot-test
 * Ejecutar tests SSOT manualmente
 */
router.post('/ssot-test', async (req, res) => {
    try {
        loadServices();

        // Ejecutar tests SSOT
        await BrainNervousSystem.runSSOTTests();

        res.json({
            success: true,
            message: 'Tests SSOT ejecutados',
            data: {
                stats: BrainNervousSystem.getStats()
            }
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error en SSOT test:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ========================================================================
 * SIMULACION (PARA TESTING)
 * ========================================================================
 */

/**
 * POST /api/brain/nervous/simulate-error
 * Simular un error para probar el sistema
 */
router.post('/simulate-error', async (req, res) => {
    try {
        loadServices();

        const { severity, module, message } = req.body;

        // Simular deteccion de error
        const incident = await BrainEscalationService.onProblemDetected({
            type: 'simulated_error',
            module: module || 'test-module',
            severity: severity || 'medium',
            message: message || 'Error simulado para testing del sistema nervioso'
        });

        res.json({
            success: true,
            message: 'Error simulado - incidente creado',
            data: incident
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error simulando:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/nervous/test-escalation
 * Probar la cadena de escalamiento completa
 */
router.post('/test-escalation', async (req, res) => {
    try {
        loadServices();

        const { severity } = req.body;

        // Crear incidente que fuerce escalamiento
        const incident = await BrainEscalationService.onProblemDetected({
            type: 'escalation_test',
            module: 'brain-test',
            severity: severity || 'high',
            message: 'Test de escalamiento - este problema no puede ser auto-reparado y debe escalar a soporte Aponnt'
        });

        // Forzar escalamiento inmediato
        await BrainEscalationService.escalateToSupport(incident.id);

        res.json({
            success: true,
            message: 'Test de escalamiento completado',
            data: {
                incidentId: incident.id,
                escalated: true
            }
        });

    } catch (error) {
        console.error('[BRAIN-NERVOUS-API] Error en test de escalamiento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
