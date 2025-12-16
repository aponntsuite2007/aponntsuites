/**
 * ============================================================================
 * BRAIN ECOSYSTEM ROUTES
 * ============================================================================
 *
 * API para el ecosistema completo del Brain:
 * - Estado del ecosistema
 * - Regeneración de workflows
 * - Tests inteligentes
 * - Tutoriales auto-generados
 * - Learning patterns
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Referencia al ecosistema (se configura desde server.js)
let ecosystemInitializer = null;

/**
 * Configurar el inicializador del ecosistema
 */
router.setEcosystemInitializer = function(initializer) {
    ecosystemInitializer = initializer;
    console.log('🌐 [ECOSYSTEM] Inicializador configurado');
};

/**
 * Middleware para verificar ecosistema
 */
const checkEcosystem = (req, res, next) => {
    if (!ecosystemInitializer) {
        return res.status(503).json({
            success: false,
            error: 'Ecosystem not initialized'
        });
    }
    next();
};

// ============================================================================
// STATUS & INFO
// ============================================================================

/**
 * GET /api/ecosystem/status
 * Estado completo del ecosistema
 */
router.get('/status', checkEcosystem, (req, res) => {
    try {
        const status = ecosystemInitializer.getStatus();

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ecosystem: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ecosystem/health
 * Health check rápido
 */
router.get('/health', checkEcosystem, (req, res) => {
    const status = ecosystemInitializer.getStatus();
    const components = Object.values(status.components || {});
    const activeCount = components.filter(c => c === true).length;
    const totalCount = components.length;

    res.json({
        success: true,
        healthy: activeCount >= Math.ceil(totalCount / 2),
        activeComponents: activeCount,
        totalComponents: totalCount,
        isInitialized: status.isInitialized
    });
});

// ============================================================================
// WORKFLOWS
// ============================================================================

/**
 * GET /api/ecosystem/workflows
 * Lista workflows configurados
 */
router.get('/workflows', checkEcosystem, async (req, res) => {
    try {
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.workflowGenerator) {
            return res.status(503).json({
                success: false,
                error: 'Workflow generator not available'
            });
        }

        const modules = ecosystem.workflowGenerator.getConfiguredModules();
        const workflows = [];

        for (const moduleKey of modules) {
            const workflow = await ecosystem.workflowGenerator.getWorkflow(moduleKey);
            if (workflow) {
                workflows.push({
                    moduleKey,
                    stagesCount: workflow.stages?.length || 0,
                    version: workflow.version,
                    generatedAt: workflow.generatedAt
                });
            }
        }

        res.json({
            success: true,
            totalModules: modules.length,
            workflows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ecosystem/workflows/regenerate
 * Regenerar todos los workflows
 */
router.post('/workflows/regenerate', checkEcosystem, async (req, res) => {
    try {
        console.log('🔄 [ECOSYSTEM] Regenerando todos los workflows...');

        const result = await ecosystemInitializer.regenerateAllWorkflows();

        res.json({
            success: true,
            message: 'Workflows regenerados',
            result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ecosystem/workflows/regenerate/:moduleKey
 * Regenerar workflow de un módulo específico
 */
router.post('/workflows/regenerate/:moduleKey', checkEcosystem, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.workflowGenerator) {
            return res.status(503).json({
                success: false,
                error: 'Workflow generator not available'
            });
        }

        const result = await ecosystem.workflowGenerator.regenerateModuleWorkflow(moduleKey);

        res.json({
            success: true,
            moduleKey,
            result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// SMART TESTING
// ============================================================================

/**
 * POST /api/ecosystem/test/:moduleKey
 * Ejecutar test inteligente de un módulo
 */
router.post('/test/:moduleKey', checkEcosystem, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const { reason } = req.body;

        console.log(`🧪 [ECOSYSTEM] Test inteligente: ${moduleKey}`);

        const testId = await ecosystemInitializer.runSmartTest(moduleKey, reason || 'api_request');

        res.json({
            success: true,
            message: `Test encolado para ${moduleKey}`,
            testId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ecosystem/test-all
 * Ejecutar test completo del sistema
 */
router.post('/test-all', checkEcosystem, async (req, res) => {
    try {
        console.log('🚀 [ECOSYSTEM] Test completo del sistema...');

        const result = await ecosystemInitializer.runFullSystemTest();

        res.json({
            success: true,
            message: 'Tests del sistema iniciados',
            result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// TUTORIALS
// ============================================================================

/**
 * GET /api/ecosystem/tutorials
 * Lista todos los tutoriales disponibles
 */
router.get('/tutorials', checkEcosystem, (req, res) => {
    try {
        const tutorials = ecosystemInitializer.getAllTutorials();

        res.json({
            success: true,
            count: tutorials.length,
            tutorials: tutorials.map(t => ({
                moduleKey: t.moduleKey,
                workflowName: t.workflowName,
                stepsCount: t.steps?.length || 0,
                generatedAt: t.generatedAt,
                version: t.version
            }))
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ecosystem/tutorials/:moduleKey
 * Tutorial de un módulo específico
 */
router.get('/tutorials/:moduleKey', checkEcosystem, (req, res) => {
    try {
        const { moduleKey } = req.params;
        const tutorial = ecosystemInitializer.getTutorial(moduleKey);

        if (!tutorial) {
            return res.status(404).json({
                success: false,
                error: 'Tutorial not found',
                moduleKey
            });
        }

        res.json({
            success: true,
            tutorial
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// LEARNING PATTERNS
// ============================================================================

/**
 * GET /api/ecosystem/learning
 * Obtener learning patterns de todos los módulos
 */
router.get('/learning', checkEcosystem, (req, res) => {
    try {
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.brainService) {
            return res.status(503).json({
                success: false,
                error: 'Brain service not available'
            });
        }

        const patterns = ecosystem.brainService.getLearningPatterns();

        res.json({
            success: true,
            patterns
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ecosystem/learning/:moduleKey
 * Learning patterns de un módulo específico
 */
router.get('/learning/:moduleKey', checkEcosystem, (req, res) => {
    try {
        const { moduleKey } = req.params;
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.brainService) {
            return res.status(503).json({
                success: false,
                error: 'Brain service not available'
            });
        }

        const patterns = ecosystem.brainService.getLearningPatterns(moduleKey);

        if (!patterns) {
            return res.status(404).json({
                success: false,
                error: 'No learning patterns found',
                moduleKey
            });
        }

        res.json({
            success: true,
            moduleKey,
            patterns
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ecosystem/scores
 * Scores de todos los módulos
 */
router.get('/scores', checkEcosystem, (req, res) => {
    try {
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.brainService) {
            return res.status(503).json({
                success: false,
                error: 'Brain service not available'
            });
        }

        const scores = {};
        if (ecosystem.brainService.moduleScores) {
            for (const [key, value] of ecosystem.brainService.moduleScores) {
                scores[key] = value;
            }
        }

        res.json({
            success: true,
            scores
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// FILE WATCHER
// ============================================================================

/**
 * GET /api/ecosystem/watcher/status
 * Estado del file watcher
 */
router.get('/watcher/status', checkEcosystem, (req, res) => {
    try {
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.fileWatcher) {
            return res.json({
                success: true,
                available: false,
                message: 'File watcher not initialized'
            });
        }

        res.json({
            success: true,
            available: true,
            status: ecosystem.fileWatcher.getStatus()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ecosystem/watcher/start
 * Iniciar file watcher
 */
router.post('/watcher/start', checkEcosystem, (req, res) => {
    try {
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.fileWatcher) {
            return res.status(503).json({
                success: false,
                error: 'File watcher not available'
            });
        }

        ecosystem.fileWatcher.start();

        res.json({
            success: true,
            message: 'File watcher started',
            status: ecosystem.fileWatcher.getStatus()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ecosystem/watcher/stop
 * Detener file watcher
 */
router.post('/watcher/stop', checkEcosystem, (req, res) => {
    try {
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.fileWatcher) {
            return res.status(503).json({
                success: false,
                error: 'File watcher not available'
            });
        }

        ecosystem.fileWatcher.stop();

        res.json({
            success: true,
            message: 'File watcher stopped',
            status: ecosystem.fileWatcher.getStatus()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ecosystem/watcher/rescan
 * Forzar re-escaneo de todos los archivos
 */
router.post('/watcher/rescan', checkEcosystem, async (req, res) => {
    try {
        const ecosystem = ecosystemInitializer.getEcosystem();

        if (!ecosystem.fileWatcher) {
            return res.status(503).json({
                success: false,
                error: 'File watcher not available'
            });
        }

        const result = await ecosystem.fileWatcher.forceRescan();

        res.json({
            success: true,
            message: 'Rescan completed',
            result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
