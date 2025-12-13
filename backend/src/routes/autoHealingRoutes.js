/**
 * ============================================================================
 * AUTO-HEALING CYCLE - API ROUTES
 * ============================================================================
 *
 * Rutas para ejecutar y consultar el Auto-Healing Cycle desde el dashboard.
 *
 * Endpoints:
 * - POST /api/auto-healing/run - Ejecutar ciclo de auto-healing
 * - GET /api/auto-healing/reports - Obtener reportes históricos
 * - GET /api/auto-healing/status - Estado de ejecución actual
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const Phase4TestOrchestrator = require('../auditor/core/Phase4TestOrchestrator');
const database = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Estado global de ejecución (en producción usar Redis)
let currentExecution = {
    isRunning: false,
    startedAt: null,
    currentIteration: 0,
    totalIterations: 0,
    totalGaps: 0,
    gapsHealed: 0,
    modulesProcessed: 0,
    totalModules: 0,
    logs: []
};

// Referencia al orchestrator en ejecución (para poder detenerlo)
let activeOrchestrator = null;

/**
 * POST /api/auto-healing/run
 * Ejecuta el ciclo de auto-healing completo
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
            maxIterations = 5,
            companySlug = 'isi',
            username = 'admin',
            password = 'admin123',
            moduleKeys = null,
            headless = true
        } = req.body;

        // 🔍 DEBUG: Ver qué valor recibe headless
        console.log('🔍 [AUTO-HEALING] req.body.headless:', req.body.headless);
        console.log('🔍 [AUTO-HEALING] headless (después de destructuring):', headless);

        // Inicializar estado
        currentExecution = {
            isRunning: true,
            startedAt: new Date().toISOString(),
            currentIteration: 0,
            totalIterations: maxIterations,
            totalGaps: 0,
            gapsHealed: 0,
            modulesProcessed: 0,
            totalModules: 0,
            logs: []
        };

        console.log('🔄 [AUTO-HEALING] Iniciando ciclo desde API...');

        // Ejecutar en background
        executeAutoHealingCycle({
            maxIterations,
            companySlug,
            username,
            password,
            moduleKeys,
            headless
        }).catch(error => {
            console.error('❌ [AUTO-HEALING] Error en ejecución:', error);
            currentExecution.isRunning = false;
            currentExecution.error = error.message;
        });

        // Retornar inmediatamente
        res.json({
            success: true,
            message: 'Auto-Healing Cycle iniciado',
            execution: {
                startedAt: currentExecution.startedAt,
                maxIterations
            }
        });

    } catch (error) {
        console.error('❌ Error iniciando Auto-Healing:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/auto-healing/status
 * Obtiene el estado actual de ejecución
 */
router.get('/status', async (req, res) => {
    try {
        res.json({
            success: true,
            execution: currentExecution
        });
    } catch (error) {
        console.error('❌ Error obteniendo estado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/auto-healing/stop
 * Detiene la ejecución actual del Auto-Healing
 */
router.post('/stop', async (req, res) => {
    try {
        // Verificar que haya una ejecución en curso
        if (!currentExecution.isRunning) {
            return res.status(400).json({
                success: false,
                message: 'No hay ninguna ejecución en curso'
            });
        }

        console.log('🛑 [AUTO-HEALING] Deteniendo ejecución...');

        // Cerrar navegador de Playwright si existe
        if (activeOrchestrator) {
            try {
                await activeOrchestrator.stop();
                console.log('✅ [AUTO-HEALING] Navegador cerrado correctamente');
            } catch (error) {
                console.error('⚠️ Error cerrando navegador:', error);
            }
            activeOrchestrator = null;
        }

        // Actualizar estado
        currentExecution.isRunning = false;
        currentExecution.stoppedAt = new Date().toISOString();
        currentExecution.stoppedBy = 'user';
        currentExecution.logs.push('🛑 Ejecución detenida por el usuario');

        console.log('✅ [AUTO-HEALING] Ejecución detenida correctamente');

        res.json({
            success: true,
            message: 'Ejecución detenida correctamente',
            execution: currentExecution
        });

    } catch (error) {
        console.error('❌ Error deteniendo Auto-Healing:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/auto-healing/reports
 * Obtiene reportes históricos del directorio logs/
 */
router.get('/reports', async (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../../logs');

        // Leer archivos de reportes
        const files = await fs.readdir(logsDir);

        // Filtrar solo reportes de auto-healing
        const reportFiles = files.filter(f =>
            f.startsWith('auto-healing-cycle-') && f.endsWith('.json')
        );

        // Leer cada reporte
        const reports = await Promise.all(
            reportFiles.map(async (filename) => {
                const filePath = path.join(logsDir, filename);
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                const stats = await fs.stat(filePath);

                return {
                    filename,
                    timestamp: stats.mtime,
                    ...data
                };
            })
        );

        // Ordenar por fecha (más reciente primero)
        reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            reports: reports.slice(0, 20) // Últimos 20
        });

    } catch (error) {
        console.error('❌ Error obteniendo reportes:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            reports: []
        });
    }
});

/**
 * GET /api/auto-healing/metrics
 * Obtiene métricas agregadas de todos los reportes
 */
router.get('/metrics', async (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../../logs');
        const files = await fs.readdir(logsDir);

        const reportFiles = files.filter(f =>
            f.startsWith('auto-healing-cycle-') && f.endsWith('.json')
        );

        let totalExecutions = 0;
        let totalGapsHealed = 0;
        let totalIterations = 0;
        let successfulExecutions = 0;

        // Leer y agregar datos
        for (const filename of reportFiles) {
            const filePath = path.join(logsDir, filename);
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);

            totalExecutions++;
            totalGapsHealed += data.totalGapsHealed || 0;
            totalIterations += data.iterations?.length || 0;

            if (data.finalGapsCount === 0) {
                successfulExecutions++;
            }
        }

        res.json({
            success: true,
            metrics: {
                totalExecutions,
                totalGapsHealed,
                totalIterations,
                successfulExecutions,
                successRate: totalExecutions > 0
                    ? Math.round((successfulExecutions / totalExecutions) * 100)
                    : 0
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo métricas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Función helper: Ejecuta el ciclo de auto-healing REAL
 */
async function executeAutoHealingCycle(options) {
    let orchestrator = null;

    try {
        console.log('🚀 [AUTO-HEALING] Iniciando ciclo REAL...');
        currentExecution.logs.push(`🚀 Iniciando Auto-Healing Cycle para empresa ${options.companySlug}`);

        // 🔍 DEBUG: Ver qué valor tiene options.headless
        console.log('🔍 [AUTO-HEALING] options.headless:', options.headless);
        console.log('🔍 [AUTO-HEALING] options.headless !== false:', options.headless !== false);

        // Crear instancia de Phase4TestOrchestrator
        const headlessConfig = options.headless !== false; // Default true (headless)
        console.log('🔍 [AUTO-HEALING] headlessConfig (valor final):', headlessConfig);

        orchestrator = new Phase4TestOrchestrator({
            headless: headlessConfig,
            slowMo: 100,
            timeout: 60000
        }, database.sequelize);

        // Guardar referencia global para poder detenerlo
        activeOrchestrator = orchestrator;

        // Interceptar logger para capturar logs en tiempo real
        // Usar Proxy para mantener TODOS los métodos originales
        const originalLogger = orchestrator.logger;
        orchestrator.logger = new Proxy(originalLogger, {
            get(target, prop) {
                const original = target[prop];

                // Si es una función, interceptar
                if (typeof original === 'function') {
                    return function(...args) {
                        // Llamar al método original
                        const result = original.apply(target, args);

                        // Capturar logs solo para métodos de logging
                        if (['info', 'error', 'warn', 'debug'].includes(prop) && args.length > 0) {
                            const msg = typeof args[0] === 'string' ? args[0] :
                                       (args[1] && typeof args[1] === 'string' ? args[1] :
                                       JSON.stringify(args));

                            if (currentExecution.logs.length < 200) {
                                const prefix = prop === 'error' ? '❌ ' : prop === 'warn' ? '⚠️ ' : '';
                                currentExecution.logs.push(`${prefix}${msg}`);
                            }
                        }

                        return result;
                    };
                }

                // Si no es función, retornar como está
                return original;
            }
        });

        // INTERCEPTAR CONSOLE.LOG/ERROR/WARN GLOBALES para capturar logs detallados
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.log = function(...args) {
            // Llamar al console.log original
            originalConsoleLog.apply(console, args);

            // Capturar para dashboard
            if (currentExecution.logs.length < 500) {
                const msg = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
                // Filtrar logs muy verbosos del sistema
                if (!msg.includes('[DEBUG]') && !msg.includes('Ejecutando (default)')) {
                    currentExecution.logs.push(msg);
                }
            }
        };

        console.error = function(...args) {
            originalConsoleError.apply(console, args);
            if (currentExecution.logs.length < 500) {
                const msg = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
                currentExecution.logs.push(`❌ ${msg}`);
            }
        };

        console.warn = function(...args) {
            originalConsoleWarn.apply(console, args);
            if (currentExecution.logs.length < 500) {
                const msg = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
                currentExecution.logs.push(`⚠️ ${msg}`);
            }
        };

        // Iniciar Playwright
        currentExecution.logs.push('🌐 Iniciando navegador...');
        await orchestrator.start();

        // Ejecutar ciclo de auto-healing REAL
        currentExecution.logs.push('🔄 Ejecutando discovery y actualización de Brain...');
        const results = await orchestrator.runAutoHealingCycle({
            maxIterations: options.maxIterations,
            companySlug: options.companySlug,
            username: options.username,
            password: options.password,
            moduleKeys: options.moduleKeys
        });

        console.log('✅ [AUTO-HEALING] Ciclo completado');

        // Actualizar estado con resultados REALES
        currentExecution.isRunning = false;
        currentExecution.completedAt = new Date().toISOString();
        currentExecution.totalGaps = results.finalGapsCount || 0;
        currentExecution.gapsHealed = results.totalGapsHealed || 0;
        currentExecution.finalGapsCount = results.finalGapsCount || 0;
        currentExecution.modulesProcessed = results.modulesHealed || 0;
        currentExecution.totalModules = results.iterations?.[0]?.modulesProcessed || 0;
        currentExecution.success = true;
        currentExecution.logs.push(`🎉 Ciclo completado: ${results.totalGapsHealed} gaps sanados`);

        // Guardar reporte
        const logsDir = path.join(__dirname, '../../logs');
        const reportPath = path.join(logsDir, `auto-healing-cycle-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');

        console.log(`📄 [AUTO-HEALING] Reporte guardado: ${reportPath}`);

        // Cerrar navegador
        await orchestrator.stop();
        activeOrchestrator = null;

        // RESTAURAR console.log/error/warn ORIGINALES
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;

    } catch (error) {
        // RESTAURAR console.log/error/warn ORIGINALES ANTES de logguear error
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;

        console.error('❌ [AUTO-HEALING] Error en ejecución:', error);

        currentExecution.isRunning = false;
        currentExecution.error = error.message;
        currentExecution.errorStack = error.stack;
        currentExecution.logs.push(`❌ Error: ${error.message}`);

        // Asegurar cierre de navegador
        if (orchestrator) {
            try {
                await orchestrator.stop();
            } catch (e) {
                console.error('Error cerrando orchestrator:', e);
            }
        }
        activeOrchestrator = null;

        throw error;
    }
}

module.exports = router;
