/**
 * VISIBLE TESTING ROUTES - Phase 4
 *
 * Endpoints para ejecutar tests E2E con Puppeteer VISIBLE
 * El navegador se abre en el servidor y es visible al operador
 *
 * @author Claude Code + APONNT
 * @date 2025-10-30
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Phase4TestOrchestrator = require('../auditor/core/Phase4TestOrchestrator');
const { sequelize } = require('../config/database');
// const { auth } = require('../middleware/auth'); // No se requiere auth para testing visible

// ============================================
// ESTADO EN MEMORIA + PERSISTENCIA
// ============================================
// Map de ejecuciones activas: executionId => { process, logs, status, ... }
const activeExecutions = new Map();

// Cargar modelo TestExecution dinámicamente
let TestExecution = null;
try {
    TestExecution = sequelize.models.TestExecution || require('../models/TestExecution')(sequelize);
} catch (error) {
    console.warn('⚠️ [VISIBLE-TESTING] TestExecution model not available:', error.message);
}

// ============================================
// HELPERS
// ============================================

/**
 * Determina la URL base según el entorno
 */
function getBaseUrlForEnvironment(environment) {
    switch (environment) {
        case 'local':
            return process.env.BASE_URL || `http://localhost:${process.env.PORT || 9998}`;
        case 'staging':
            return process.env.STAGING_URL || process.env.RENDER_EXTERNAL_URL || 'https://staging.example.com';
        case 'production':
            return process.env.PRODUCTION_URL || process.env.RENDER_EXTERNAL_URL || 'https://production.example.com';
        default:
            return process.env.BASE_URL || `http://localhost:${process.env.PORT || 9998}`;
    }
}

/**
 * Agrega un log a la ejecución
 */
function addLog(executionId, type, message) {
    const execution = activeExecutions.get(executionId);
    if (execution) {
        execution.logs.push({
            timestamp: new Date().toISOString(),
            type,
            message
        });
    }
}

/**
 * Actualiza el estado de la ejecución
 */
function updateExecutionStatus(executionId, status, data = {}) {
    const execution = activeExecutions.get(executionId);
    if (execution) {
        execution.status = status;
        execution.updatedAt = new Date();
        Object.assign(execution, data);
    }
}

// ============================================
// ENDPOINT: POST /api/testing/run-visible
// ============================================
/**
 * Inicia un test E2E con navegador visible
 *
 * Body:
 * {
 *   environment: 'local' | 'staging' | 'production',
 *   module: 'users' | 'attendance' | ...,
 *   cycles: 5,
 *   slowMo: 100,
 *   companyId: 11
 * }
 */
router.post('/run-visible', async (req, res) => {
    try {
        const { environment, module, cycles, slowMo, companyId } = req.body;

        // Validaciones
        if (!environment || !['local', 'staging', 'production'].includes(environment)) {
            return res.status(400).json({
                success: false,
                message: 'Environment inválido. Debe ser: local, staging o production'
            });
        }

        if (!module) {
            return res.status(400).json({
                success: false,
                message: 'Module es requerido'
            });
        }

        if (!cycles || cycles < 1 || cycles > 100) {
            return res.status(400).json({
                success: false,
                message: 'Cycles debe estar entre 1 y 100'
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'CompanyId es requerido'
            });
        }

        // Obtener el slug de la empresa desde la BD (usando raw query)
        const { sequelize } = require('../config/database');
        const companies = await sequelize.query(
            'SELECT company_id, slug, name FROM companies WHERE company_id = :companyId LIMIT 1',
            {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!companies || companies.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Empresa con ID ${companyId} no encontrada`
            });
        }

        const company = companies[0];
        const companySlug = company.slug;

        // Generar execution ID
        const executionId = uuidv4();

        // Determinar URL base
        const baseUrl = getBaseUrlForEnvironment(environment);

        // Crear registro en BD si el modelo está disponible
        if (TestExecution) {
            try {
                await TestExecution.create({
                    execution_id: executionId,
                    environment,
                    module,
                    company_id: companyId,
                    company_name: company.name,
                    cycles,
                    slow_mo: slowMo,
                    base_url: baseUrl,
                    status: 'starting'
                });
            } catch (dbError) {
                console.error('❌ Error al persistir en BD:', dbError.message);
                // Continuar sin BD
            }
        }

        // Crear entrada en el Map
        const execution = {
            executionId,
            environment,
            module,
            cycles,
            slowMo,
            companyId,
            baseUrl,
            status: 'starting',
            logs: [],
            process: null,
            startTime: new Date(),
            updatedAt: new Date(),
            results: null
        };

        activeExecutions.set(executionId, execution);

        addLog(executionId, 'info', `Iniciando test en entorno: ${environment.toUpperCase()}`);
        addLog(executionId, 'info', `Empresa: ${company.name} (${companySlug})`);
        addLog(executionId, 'info', `Módulo: ${module}, Ciclos: ${cycles}, SlowMo: ${slowMo}ms`);
        addLog(executionId, 'info', `URL Base: ${baseUrl}`);
        addLog(executionId, 'info', `Login automático: usuario "soporte" / empresa "${companySlug}"`);

        // Usar Phase4TestOrchestrator directamente
        addLog(executionId, 'info', `Inicializando Phase4TestOrchestrator...`);

        execution.status = 'running';
        execution.orchestrator = null;

        addLog(executionId, 'success', `Test iniciado con Execution ID: ${executionId}`);
        addLog(executionId, 'info', '👀 El navegador debe abrirse de forma visible. Observa la ejecución.');

        // Ejecutar en background
        (async () => {
            // Capturar console.log para enviar al frontend
            const originalLog = console.log;
            const originalError = console.error;

            console.log = (...args) => {
                const message = args.join(' ');
                addLog(executionId, 'info', message);
                originalLog.apply(console, args);
            };

            console.error = (...args) => {
                const message = args.join(' ');
                addLog(executionId, 'error', message);
                originalError.apply(console, args);
            };

            const orchestrator = new Phase4TestOrchestrator({
                baseUrl,
                slowMo: slowMo || 50,
                headless: false, // VISIBLE
                timeout: 30000
            });

            execution.orchestrator = orchestrator;

            try {
                addLog(executionId, 'info', '🚀 Iniciando sistema completo (WebSocket, PostgreSQL, Playwright, Ollama)...');
                await orchestrator.start();
                addLog(executionId, 'success', '✅ Sistema iniciado exitosamente');

                addLog(executionId, 'info', `🧪 Ejecutando test del módulo: ${module} (${cycles} ciclos)...`);
                const report = await orchestrator.runModuleTest(module, companyId, cycles, companySlug, null, 'admin123');

                addLog(executionId, 'success', `✅ Test completado: ${report.status}`);
                addLog(executionId, 'info', `📊 Tests totales: ${report.stats?.totalTests || 0}`);
                addLog(executionId, 'info', `✅ Tests pasados: ${report.stats?.uiTestsPassed + report.stats?.dbTestsPassed || 0}`);
                addLog(executionId, 'info', `❌ Tests fallidos: ${report.stats?.uiTestsFailed + report.stats?.dbTestsFailed || 0}`);
                addLog(executionId, 'info', `🎫 Tickets generados: ${report.stats?.tickets?.length || 0}`);

                const results = {
                    total: report.stats?.totalTests || 0,
                    passed: (report.stats?.uiTestsPassed + report.stats?.dbTestsPassed) || 0,
                    failed: (report.stats?.uiTestsFailed + report.stats?.dbTestsFailed) || 0,
                    ui_tests_passed: report.stats?.uiTestsPassed || 0,
                    ui_tests_failed: report.stats?.uiTestsFailed || 0,
                    db_tests_passed: report.stats?.dbTestsPassed || 0,
                    db_tests_failed: report.stats?.dbTestsFailed || 0,
                    successRate: report.stats?.totalTests > 0
                        ? (((report.stats?.uiTestsPassed + report.stats?.dbTestsPassed) / report.stats?.totalTests) * 100).toFixed(2)
                        : 0,
                    duration: ((new Date() - execution.startTime) / 1000).toFixed(2),
                    tickets: report.stats?.tickets || []
                };

                updateExecutionStatus(executionId, 'completed', { results });

                // Persistir resultados en BD
                if (TestExecution) {
                    try {
                        const testExec = await TestExecution.findOne({ where: { execution_id: executionId } });
                        if (testExec) {
                            await testExec.markCompleted(results);
                        }
                    } catch (dbError) {
                        console.error('❌ Error al actualizar BD:', dbError.message);
                    }
                }

                await orchestrator.stop();
                addLog(executionId, 'info', '🛑 Sistema detenido correctamente');

            } catch (error) {
                addLog(executionId, 'error', `❌ Error: ${error.message}`);
                if (error.stack) {
                    addLog(executionId, 'error', error.stack);
                }

                const failedResults = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    successRate: 0,
                    duration: ((new Date() - execution.startTime) / 1000).toFixed(2),
                    errors: [error.message]
                };

                updateExecutionStatus(executionId, 'failed', { results: failedResults });

                // Persistir fallo en BD
                if (TestExecution) {
                    try {
                        const testExec = await TestExecution.findOne({ where: { execution_id: executionId } });
                        if (testExec) {
                            await testExec.markFailed(error.message);
                        }
                    } catch (dbError) {
                        console.error('❌ Error al actualizar BD:', dbError.message);
                    }
                }

                try {
                    await orchestrator.stop();
                } catch (stopErr) {
                    addLog(executionId, 'error', `Error al detener orchestrator: ${stopErr.message}`);
                }
            } finally {
                // Restaurar console.log original
                console.log = originalLog;
                console.error = originalError;
            }
        })();

        // Responder inmediatamente al cliente
        res.json({
            success: true,
            executionId,
            message: 'Test iniciado. Usa /execution-status/:executionId para ver el progreso.'
        });

    } catch (error) {
        console.error('❌ [VISIBLE-TESTING] Error al iniciar test:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar test',
            error: error.message
        });
    }
});

// ============================================
// ENDPOINT: GET /api/testing/execution-status/:executionId
// ============================================
/**
 * Obtiene el estado de una ejecución en progreso
 */
router.get('/execution-status/:executionId', async (req, res) => {
    try {
        const { executionId } = req.params;

        const execution = activeExecutions.get(executionId);

        if (!execution) {
            return res.status(404).json({
                success: false,
                message: 'Ejecución no encontrada'
            });
        }

        // Calcular progreso aproximado
        let progress = 0;
        if (execution.status === 'starting') {
            progress = 5;
        } else if (execution.status === 'running') {
            // Estimar progreso basado en logs o tiempo
            progress = Math.min(95, 10 + execution.logs.length * 2);
        } else if (execution.status === 'completed' || execution.status === 'failed') {
            progress = 100;
        }

        // Retornar solo logs nuevos (desde el último polling)
        // Para simplificar, retornamos todos los logs aquí
        // En producción, podrías agregar un parámetro lastLogIndex

        res.json({
            success: true,
            executionId,
            status: execution.status,
            progress,
            logs: execution.logs, // TODOS los logs
            results: execution.results,
            startTime: execution.startTime,
            updatedAt: execution.updatedAt
        });

    } catch (error) {
        console.error('❌ [VISIBLE-TESTING] Error al obtener estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado de ejecución',
            error: error.message
        });
    }
});

// ============================================
// ENDPOINT: GET /api/testing/active-executions
// ============================================
/**
 * Lista todas las ejecuciones activas
 */
router.get('/active-executions', async (req, res) => {
    try {
        const executions = Array.from(activeExecutions.values()).map(exec => ({
            executionId: exec.executionId,
            environment: exec.environment,
            module: exec.module,
            status: exec.status,
            startTime: exec.startTime
        }));

        res.json({
            success: true,
            count: executions.length,
            executions
        });

    } catch (error) {
        console.error('❌ [VISIBLE-TESTING] Error al listar ejecuciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar ejecuciones activas',
            error: error.message
        });
    }
});

// ============================================
// ENDPOINT: POST /api/testing/kill-execution/:executionId
// ============================================
/**
 * Mata una ejecución en progreso
 */
router.post('/kill-execution/:executionId', async (req, res) => {
    try {
        const { executionId } = req.params;

        const execution = activeExecutions.get(executionId);

        if (!execution) {
            return res.status(404).json({
                success: false,
                message: 'Ejecución no encontrada'
            });
        }

        if (execution.orchestrator) {
            try {
                await execution.orchestrator.stop();
                addLog(executionId, 'warning', '⚠️ Ejecución detenida por el usuario');
                updateExecutionStatus(executionId, 'killed');

                res.json({
                    success: true,
                    message: 'Ejecución detenida'
                });
            } catch (stopErr) {
                addLog(executionId, 'error', `Error al detener: ${stopErr.message}`);
                res.status(500).json({
                    success: false,
                    message: 'Error al detener ejecución',
                    error: stopErr.message
                });
            }
        } else {
            res.json({
                success: false,
                message: 'El orchestrator ya no está activo'
            });
        }

    } catch (error) {
        console.error('❌ [VISIBLE-TESTING] Error al matar ejecución:', error);
        res.status(500).json({
            success: false,
            message: 'Error al detener ejecución',
            error: error.message
        });
    }
});

// ============================================
// ENDPOINT: GET /api/testing/metrics
// ============================================
/**
 * Obtiene métricas históricas de testing
 */
router.get('/metrics', async (req, res) => {
    try {
        const { company_id, environment, module, days } = req.query;

        if (!TestExecution) {
            return res.status(503).json({
                success: false,
                message: 'Modelo TestExecution no disponible'
            });
        }

        const metrics = await TestExecution.getMetrics({
            company_id: company_id ? parseInt(company_id) : null,
            environment,
            module,
            days: days ? parseInt(days) : 30
        });

        res.json({
            success: true,
            metrics,
            filters: { company_id, environment, module, days: days || 30 }
        });

    } catch (error) {
        console.error('❌ [VISIBLE-TESTING] Error al obtener métricas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener métricas',
            error: error.message
        });
    }
});

// ============================================
// ENDPOINT: GET /api/testing/history
// ============================================
/**
 * Obtiene historial de ejecuciones
 */
router.get('/history', async (req, res) => {
    try {
        const { company_id, limit, offset } = req.query;

        if (!TestExecution) {
            return res.status(503).json({
                success: false,
                message: 'Modelo TestExecution no disponible'
            });
        }

        const where = {};
        if (company_id) where.company_id = parseInt(company_id);

        const executions = await TestExecution.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });

        const total = await TestExecution.count({ where });

        res.json({
            success: true,
            executions,
            total,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });

    } catch (error) {
        console.error('❌ [VISIBLE-TESTING] Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial',
            error: error.message
        });
    }
});

// ============================================
// LIMPIEZA PERIÓDICA
// ============================================
// Cada 10 minutos, limpiar ejecuciones completas de más de 30 minutos
setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutos

    for (const [executionId, execution] of activeExecutions.entries()) {
        const age = now - execution.updatedAt.getTime();

        if (age > maxAge && ['completed', 'failed', 'killed'].includes(execution.status)) {
            console.log(`🧹 Limpiando ejecución antigua: ${executionId}`);
            activeExecutions.delete(executionId);
        }
    }
}, 10 * 60 * 1000);

// ============================================
// LOGGING
// ============================================
console.log('👁️ [VISIBLE-TESTING-ROUTES] Rutas cargadas:');
console.log('   POST   /api/testing/run-visible');
console.log('   GET    /api/testing/execution-status/:executionId');
console.log('   GET    /api/testing/active-executions');
console.log('   POST   /api/testing/kill-execution/:executionId');
console.log('   GET    /api/testing/metrics - Métricas históricas');
console.log('   GET    /api/testing/history - Historial de ejecuciones');

module.exports = router;
