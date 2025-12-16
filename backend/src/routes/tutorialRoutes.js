/**
 * ============================================================================
 * TUTORIAL ROUTES - API de Tutoriales Generados por Brain
 * ============================================================================
 *
 * Endpoints para acceder a tutoriales auto-generados desde workflows.
 * Brain detecta STAGES de cada módulo y genera pasos de tutorial automáticamente.
 *
 * ENDPOINTS:
 * - GET /api/tutorials                - Lista todos los tutoriales
 * - GET /api/tutorials/:moduleKey     - Tutorial específico de un módulo
 * - GET /api/tutorials/:moduleKey/steps - Solo pasos del tutorial
 * - GET /api/tutorials/stats          - Estadísticas de tutoriales
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Referencia al brain service (se configura desde server.js)
let brainService = null;

/**
 * Configurar el servicio de Brain
 */
router.setBrainService = function(service) {
    brainService = service;
    console.log('📚 [TUTORIALS] BrainService configurado');
};

/**
 * Middleware para verificar que Brain está disponible
 */
const checkBrain = (req, res, next) => {
    if (!brainService) {
        return res.status(503).json({
            success: false,
            error: 'Brain service not available',
            message: 'El servicio de tutoriales no está disponible temporalmente'
        });
    }
    next();
};

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/tutorials
 * Lista todos los tutoriales disponibles
 */
router.get('/', checkBrain, async (req, res) => {
    try {
        console.log('📚 [TUTORIALS] Listando todos los tutoriales');

        // Obtener tutoriales desde Brain
        const tutorials = brainService.getAllTutorials() || [];

        // Si no hay tutoriales en memoria, generar desde workflows
        if (tutorials.length === 0) {
            const { workflows } = await brainService.getWorkflowsConnected();

            for (const workflow of workflows || []) {
                if (workflow.tutorialCapable && workflow.stages?.length > 0) {
                    await brainService.updateTutorialForModule(workflow.name, {
                        workflowName: workflow.name,
                        stagesCount: workflow.stageCount,
                        stages: workflow.stages,
                        version: workflow.completeness ? `${workflow.completeness}%` : '1.0.0'
                    });
                }
            }

            // Re-obtener después de generar
            const updatedTutorials = brainService.getAllTutorials() || [];

            return res.json({
                success: true,
                source: 'generated_from_workflows',
                count: updatedTutorials.length,
                tutorials: updatedTutorials.map(t => ({
                    moduleKey: t.moduleKey,
                    workflowName: t.workflowName,
                    stepsCount: t.steps?.length || 0,
                    generatedAt: t.generatedAt,
                    version: t.version
                }))
            });
        }

        res.json({
            success: true,
            source: 'cache',
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
        console.error('❌ [TUTORIALS] Error listando tutoriales:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/tutorials/stats
 * Estadísticas de tutoriales generados
 */
router.get('/stats', checkBrain, async (req, res) => {
    try {
        const tutorials = brainService.getAllTutorials() || [];
        const { workflows } = await brainService.getWorkflowsConnected();

        const stats = {
            totalTutorials: tutorials.length,
            totalSteps: tutorials.reduce((sum, t) => sum + (t.steps?.length || 0), 0),
            tutorialCapableWorkflows: (workflows || []).filter(w => w.tutorialCapable).length,
            totalWorkflows: (workflows || []).length,
            coverage: workflows?.length > 0
                ? Math.round((tutorials.length / workflows.filter(w => w.tutorialCapable).length) * 100)
                : 0,
            byModule: tutorials.map(t => ({
                module: t.moduleKey,
                steps: t.steps?.length || 0,
                lastUpdated: t.generatedAt
            }))
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [TUTORIALS] Error obteniendo stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/tutorials/:moduleKey
 * Tutorial completo de un módulo específico
 */
router.get('/:moduleKey', checkBrain, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        console.log(`📚 [TUTORIALS] Obteniendo tutorial: ${moduleKey}`);

        // Buscar en cache
        let tutorial = brainService.getTutorial(moduleKey);

        // Si no existe, intentar generar
        if (!tutorial) {
            const { workflows } = await brainService.getWorkflowsConnected();
            const workflow = workflows?.find(w =>
                w.name.toLowerCase().includes(moduleKey.toLowerCase()) ||
                moduleKey.toLowerCase().includes(w.name.toLowerCase().replace('workflow', ''))
            );

            if (workflow && workflow.stages?.length > 0) {
                await brainService.updateTutorialForModule(moduleKey, {
                    workflowName: workflow.name,
                    stagesCount: workflow.stageCount,
                    stages: workflow.stages,
                    version: '1.0.0'
                });

                tutorial = brainService.getTutorial(moduleKey);
            }
        }

        if (!tutorial) {
            return res.status(404).json({
                success: false,
                error: 'Tutorial not found',
                message: `No se encontró tutorial para el módulo: ${moduleKey}`,
                suggestion: 'Verifica que el módulo tenga un workflow con STAGES definidos'
            });
        }

        res.json({
            success: true,
            tutorial
        });

    } catch (error) {
        console.error(`❌ [TUTORIALS] Error obteniendo tutorial ${req.params.moduleKey}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/tutorials/:moduleKey/steps
 * Solo los pasos del tutorial (para UI)
 */
router.get('/:moduleKey/steps', checkBrain, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const tutorial = brainService.getTutorial(moduleKey);

        if (!tutorial) {
            return res.status(404).json({
                success: false,
                error: 'Tutorial not found'
            });
        }

        res.json({
            success: true,
            moduleKey: tutorial.moduleKey,
            workflowName: tutorial.workflowName,
            totalSteps: tutorial.steps?.length || 0,
            steps: tutorial.steps || []
        });

    } catch (error) {
        console.error(`❌ [TUTORIALS] Error obteniendo steps:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/tutorials/:moduleKey/regenerate
 * Forzar regeneración de tutorial desde workflow actualizado
 */
router.post('/:moduleKey/regenerate', checkBrain, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        console.log(`🔄 [TUTORIALS] Regenerando tutorial: ${moduleKey}`);

        // Invalidar cache y regenerar
        brainService.invalidateCache('workflows');

        const { workflows } = await brainService.getWorkflowsConnected();
        const workflow = workflows?.find(w =>
            w.name.toLowerCase().includes(moduleKey.toLowerCase()) ||
            moduleKey.toLowerCase().includes(w.name.toLowerCase().replace('workflow', ''))
        );

        if (!workflow || !workflow.stages?.length) {
            return res.status(404).json({
                success: false,
                error: 'No workflow found',
                message: `No se encontró workflow con STAGES para: ${moduleKey}`
            });
        }

        await brainService.updateTutorialForModule(moduleKey, {
            workflowName: workflow.name,
            stagesCount: workflow.stageCount,
            stages: workflow.stages,
            version: new Date().toISOString()
        });

        const tutorial = brainService.getTutorial(moduleKey);

        res.json({
            success: true,
            message: 'Tutorial regenerado exitosamente',
            tutorial
        });

    } catch (error) {
        console.error(`❌ [TUTORIALS] Error regenerando:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/tutorials/workflow/:workflowId
 * Tutorial por ID de workflow
 */
router.get('/workflow/:workflowId', checkBrain, async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { workflows } = await brainService.getWorkflowsConnected();

        const workflow = workflows?.find(w => w.id === workflowId);

        if (!workflow) {
            return res.status(404).json({
                success: false,
                error: 'Workflow not found'
            });
        }

        // Generar tutorial en tiempo real desde workflow
        const tutorialSteps = (workflow.stages || [])
            .filter(s => !s.is_final)
            .map((stage, index) => ({
                step: index + 1,
                title: stage.name || stage.code,
                description: stage.description || `Paso ${index + 1}`,
                category: stage.category || 'general',
                subSteps: (stage.subStatuses || []).map(ss => ({
                    code: ss.code,
                    name: ss.name,
                    order: ss.order
                })),
                transitions: stage.transitionsTo || []
            }));

        res.json({
            success: true,
            workflowId: workflow.id,
            workflowName: workflow.name,
            displayName: workflow.displayName,
            tutorialCapable: workflow.tutorialCapable,
            totalSteps: tutorialSteps.length,
            steps: tutorialSteps
        });

    } catch (error) {
        console.error(`❌ [TUTORIALS] Error:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
