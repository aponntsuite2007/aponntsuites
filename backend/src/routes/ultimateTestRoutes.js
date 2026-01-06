/**
 * ═══════════════════════════════════════════════════════════════════════
 * ULTIMATE TEST ROUTES - API para Ultimate Testing Engine
 * ═══════════════════════════════════════════════════════════════════════
 *
 * UN SOLO ENDPOINT que ejecuta TODA la batería de testing:
 * POST /api/ultimate-test/run
 *
 * @version 1.0.0
 * @date 2026-01-05
 */

const express = require('express');
const router = express.Router();
const UltimateTestingEngine = require('../auditor/core/UltimateTestingEngine');
const database = require('../config/database');
const SystemRegistry = require('../auditor/registry/SystemRegistry');

// Estado global de ejecución
let currentExecution = {
    isRunning: false,
    startedAt: null,
    executionId: null,
    progress: {
        currentPhase: null,
        currentModule: null,
        completed: 0,
        total: 0
    },
    logs: []
};

// Referencia al engine activo
let activeEngine = null;

/**
 * POST /api/ultimate-test/run
 * Ejecuta ULTIMATE TEST - Batería completa
 */
router.post('/run', async (req, res) => {
    try {
        // Verificar que no haya otra ejecución en curso
        if (currentExecution.isRunning) {
            return res.status(409).json({
                success: false,
                message: 'Ya hay una ejecución en curso',
                currentExecution
            });
        }

        // Parsear opciones
        const {
            modules = 'all',           // 'all' | ['attendance', 'users'] | 'attendance'
            companySlug = 'isi',
            username = 'administrador',
            password = 'admin123',
            headless = false,          // false para ver el navegador (local)
            includePerformance = true,
            includeSimulation = true,
            includeSecurity = false,
            skipPhases = []            // ['simulation', 'security'] para saltar fases
        } = req.body;

        console.log('🚀 [ULTIMATE-TEST-API] Iniciando Ultimate Testing Engine');
        console.log('   Modules:', modules);
        console.log('   Company:', companySlug);
        console.log('   Headless:', headless);

        // Inicializar estado
        currentExecution = {
            isRunning: true,
            startedAt: new Date().toISOString(),
            executionId: null,
            progress: {
                currentPhase: 'initializing',
                currentModule: null,
                completed: 0,
                total: 0
            },
            logs: []
        };

        // Ejecutar en background
        executeUltimateTest({
            modules,
            companySlug,
            username,
            password,
            headless,
            includePerformance,
            includeSimulation,
            includeSecurity,
            skipPhases
        }).catch(error => {
            console.error('❌ [ULTIMATE-TEST-API] Error en ejecución:', error);
            currentExecution.isRunning = false;
            currentExecution.error = error.message;
        });

        // Retornar inmediatamente
        res.json({
            success: true,
            message: 'Ultimate Testing Engine iniciado',
            execution: {
                startedAt: currentExecution.startedAt
            }
        });

    } catch (error) {
        console.error('❌ [ULTIMATE-TEST-API] Error iniciando:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/ultimate-test/status
 * Obtiene el estado actual de ejecución
 */
router.get('/status', async (req, res) => {
    try {
        res.json({
            success: true,
            execution: currentExecution
        });
    } catch (error) {
        console.error('❌ [ULTIMATE-TEST-API] Error obteniendo estado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/ultimate-test/stop
 * Detiene la ejecución actual
 */
router.post('/stop', async (req, res) => {
    try {
        if (!currentExecution.isRunning) {
            return res.status(400).json({
                success: false,
                message: 'No hay ninguna ejecución en curso'
            });
        }

        console.log('🛑 [ULTIMATE-TEST-API] Deteniendo ejecución...');

        // Detener engine
        if (activeEngine && activeEngine.phase4) {
            try {
                await activeEngine.phase4.stop();
                console.log('✅ [ULTIMATE-TEST-API] Engine detenido correctamente');
            } catch (error) {
                console.error('⚠️ Error deteniendo engine:', error);
            }
            activeEngine = null;
        }

        // Actualizar estado
        currentExecution.isRunning = false;
        currentExecution.stoppedAt = new Date().toISOString();
        currentExecution.stoppedBy = 'user';

        res.json({
            success: true,
            message: 'Ejecución detenida correctamente',
            execution: currentExecution
        });

    } catch (error) {
        console.error('❌ [ULTIMATE-TEST-API] Error deteniendo:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/ultimate-test/results
 * Obtiene resultados de ejecuciones previas
 */
router.get('/results', async (req, res) => {
    try {
        const { AuditLog } = database;

        // Obtener últimas 20 ejecuciones
        const executions = await AuditLog.findAll({
            attributes: ['execution_id', 'started_at', 'completed_at'],
            where: {
                test_type: 'ultimate'
            },
            group: ['execution_id', 'started_at', 'completed_at'],
            order: [['started_at', 'DESC']],
            limit: 20,
            raw: true
        });

        res.json({
            success: true,
            executions
        });

    } catch (error) {
        console.error('❌ [ULTIMATE-TEST-API] Error obteniendo resultados:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            executions: []
        });
    }
});

/**
 * GET /api/ultimate-test/results/:executionId
 * Obtiene detalle de una ejecución específica
 */
router.get('/results/:executionId', async (req, res) => {
    try {
        const { executionId } = req.params;
        const { AuditLog } = database;

        // Obtener todos los logs de esta ejecución
        const logs = await AuditLog.findAll({
            where: { execution_id: executionId },
            order: [['started_at', 'ASC']],
            raw: true
        });

        // Calcular stats
        const passed = logs.filter(l => l.status === 'passed' || l.status === 'pass').length;
        const failed = logs.filter(l => l.status === 'failed' || l.status === 'fail').length;
        const warnings = logs.filter(l => l.status === 'warning').length;

        res.json({
            success: true,
            execution: {
                executionId,
                totalTests: logs.length,
                passed,
                failed,
                warnings,
                successRate: ((passed / logs.length) * 100).toFixed(1) + '%',
                logs
            }
        });

    } catch (error) {
        console.error('❌ [ULTIMATE-TEST-API] Error obteniendo detalle:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Función helper: Ejecuta el Ultimate Test REAL
 */
async function executeUltimateTest(options) {
    try {
        console.log('🚀 [ULTIMATE-TEST-EXEC] Iniciando ejecución real...');

        // Crear SystemRegistry
        const systemRegistry = new SystemRegistry(database);
        await systemRegistry.initialize();

        // Crear Ultimate Testing Engine
        const engine = new UltimateTestingEngine(database, systemRegistry, {
            headless: options.headless,
            includePerformance: options.includePerformance,
            includeSimulation: options.includeSimulation,
            includeSecurity: options.includeSecurity
        });

        activeEngine = engine;

        // Interceptar logs para enviarlos al frontend
        const originalLog = engine.log.bind(engine);
        engine.log = function(message) {
            originalLog(message);
            if (currentExecution.logs.length < 500) {
                currentExecution.logs.push(message);
            }
        };

        // Ejecutar MEGA TEST
        const results = await engine.run({
            modules: options.modules,
            companySlug: options.companySlug,
            username: options.username,
            password: options.password,
            skipPhases: options.skipPhases
        });

        console.log('✅ [ULTIMATE-TEST-EXEC] Ejecución completada');

        // Actualizar estado
        currentExecution.isRunning = false;
        currentExecution.completedAt = new Date().toISOString();
        currentExecution.executionId = results.executionId;
        currentExecution.results = results;
        currentExecution.success = true;

    } catch (error) {
        console.error('❌ [ULTIMATE-TEST-EXEC] Error en ejecución:', error);

        currentExecution.isRunning = false;
        currentExecution.error = error.message;
        currentExecution.errorStack = error.stack;

        // Asegurar cierre de engine
        if (activeEngine && activeEngine.phase4) {
            try {
                await activeEngine.phase4.stop();
            } catch (e) {
                console.error('Error cerrando engine:', e);
            }
        }
        activeEngine = null;

        throw error;
    }
}

module.exports = router;
