/**
 * ============================================================================
 * BRAIN TOUR ROUTES - API de Tours Interactivos Integrados
 * ============================================================================
 *
 * Endpoints para gestionar tours interactivos con integración completa:
 * - Brain Orchestrator (coordinación central)
 * - Support AI (preguntas durante tour)
 * - NLU (comprensión de intenciones)
 * - TourService (definiciones y progreso)
 *
 * @version 2.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Lazy load de servicios
let brainOrchestrator = null;
let tourService = null;
let legacyService = null;

const loadOrchestrator = async () => {
    if (!brainOrchestrator) {
        try {
            const { getInstanceSync } = require('../brain/BrainOrchestrator');
            brainOrchestrator = getInstanceSync();

            if (!brainOrchestrator) {
                // Si no está inicializado, usar getInstance
                const { getInstance } = require('../brain/BrainOrchestrator');
                brainOrchestrator = await getInstance();
            }
        } catch (error) {
            console.log('[TOUR-API] Orchestrator no disponible, usando TourService directo');
        }
    }
    return brainOrchestrator;
};

const loadTourService = () => {
    if (!tourService) {
        const { getInstance } = require('../brain/services/TourService');
        tourService = getInstance();
    }
    return tourService;
};

const loadLegacyService = async () => {
    if (!legacyService) {
        try {
            legacyService = require('../brain/services/BrainTourService');
            await legacyService.initialize();
        } catch (error) {
            console.log('[TOUR-API] Legacy service no disponible');
        }
    }
    return legacyService;
};

/**
 * ============================================================================
 * ENDPOINTS PRINCIPALES - TOURS INTERACTIVOS
 * ============================================================================
 */

/**
 * GET /api/brain/tours
 * Listar todos los tours disponibles
 */
router.get('/', async (req, res) => {
    try {
        // Primero intentar con TourService nuevo
        const service = loadTourService();
        const newTours = service.listTours();

        res.json({
            success: true,
            source: 'tour-service',
            count: newTours.length,
            data: newTours
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/tours/stats
 * Obtener estadísticas de tours (DEBE ir antes de /:tourId)
 */
router.get('/stats', async (req, res) => {
    try {
        const service = loadTourService();
        const stats = service.getStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/tours/module/:module
 * Obtener tours de un módulo específico (DEBE ir antes de /:tourId)
 */
router.get('/module/:module', async (req, res) => {
    try {
        const { module } = req.params;
        const service = loadTourService();
        const tours = service.getToursByModule(module);

        if (!tours || tours.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No hay tours para el módulo '${module}'`
            });
        }

        res.json({
            success: true,
            count: tours.length,
            data: tours
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/tours/onboarding/:role
 * Tour de onboarding para rol específico (DEBE ir antes de /:tourId)
 */
router.get('/onboarding/:role', async (req, res) => {
    try {
        const { role } = req.params;
        const service = loadTourService();
        const firstStepsTour = service.getTour('first-steps');

        if (firstStepsTour) {
            return res.json({
                success: true,
                data: {
                    ...firstStepsTour,
                    targetRole: role
                }
            });
        }

        res.status(404).json({
            success: false,
            error: 'No hay tours de onboarding disponibles'
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/tours/progress/:userId
 * Obtener progreso actual del tour (DEBE ir antes de /:tourId)
 */
router.get('/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const service = loadTourService();
        const progress = service.getProgress(userId);

        res.json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/tours/:tourId
 * Obtener tour específico con todos sus pasos (DEBE ir AL FINAL de los GETs)
 */
router.get('/:tourId', async (req, res) => {
    try {
        const { tourId } = req.params;
        const service = loadTourService();

        const tour = service.getTour(tourId);

        if (!tour) {
            const available = service.listTours();
            return res.status(404).json({
                success: false,
                error: `Tour '${tourId}' no encontrado`,
                available: available.map(t => ({ id: t.id, name: t.name }))
            });
        }

        res.json({
            success: true,
            data: tour
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * ENDPOINTS DE SESIÓN - CONTROL INTERACTIVO (POSTs no tienen conflicto)
 * ============================================================================
 */

/**
 * PLACEHOLDER - Las rutas POST no tienen conflicto con /:tourId
 */
const _placeholder_for_module_route = true; // Mantener estructura

/**
 * GET /api/brain/tours/module/:module - YA DEFINIDO ARRIBA
 * (Este comentario es solo para documentación)
 */
router.get('/module-legacy/:module', async (req, res) => {
    try {
        const { module } = req.params;
        const orchestrator = await loadOrchestrator();

        let tours;
        if (orchestrator) {
            tours = orchestrator.getToursByModule(module);
        } else {
            const service = loadTourService();
            tours = service.getToursByModule(module);
        }

        if (!tours || tours.length === 0) {
            // Intentar con legacy service
            const legacy = await loadLegacyService();
            if (legacy) {
                const legacyTour = legacy.generateModuleTour(module);
                if (!legacyTour.error) {
                    return res.json({
                        success: true,
                        source: 'legacy',
                        data: [legacyTour]
                    });
                }
            }

            return res.status(404).json({
                success: false,
                error: `No hay tours para el módulo '${module}'`
            });
        }

        res.json({
            success: true,
            count: tours.length,
            data: tours
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * ENDPOINTS DE SESIÓN - CONTROL INTERACTIVO
 * ============================================================================
 */

/**
 * POST /api/brain/tours/start
 * Iniciar un tour para el usuario actual
 */
router.post('/start', async (req, res) => {
    try {
        const { tourId, userId } = req.body;

        if (!tourId) {
            return res.status(400).json({
                success: false,
                error: 'tourId es requerido'
            });
        }

        const uid = userId || req.user?.id || 'anonymous';
        const orchestrator = await loadOrchestrator();

        let result;
        if (orchestrator) {
            result = orchestrator.startTour(uid, tourId);
        } else {
            const service = loadTourService();
            result = service.startTour(uid, tourId);
        }

        if (result.error) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            message: `Tour '${tourId}' iniciado`,
            data: result
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/tours/advance
 * Avanzar al siguiente paso del tour
 */
router.post('/advance', async (req, res) => {
    try {
        const { userId } = req.body;
        const uid = userId || req.user?.id || 'anonymous';

        const orchestrator = await loadOrchestrator();

        let result;
        if (orchestrator) {
            result = orchestrator.advanceTourStep(uid);
        } else {
            const service = loadTourService();
            result = service.advanceStep(uid);
        }

        if (result.error) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/tours/back
 * Retroceder al paso anterior
 */
router.post('/back', async (req, res) => {
    try {
        const { userId } = req.body;
        const uid = userId || req.user?.id || 'anonymous';

        const orchestrator = await loadOrchestrator();

        let result;
        if (orchestrator) {
            result = orchestrator.goBackTourStep(uid);
        } else {
            const service = loadTourService();
            result = service.goBack(uid);
        }

        if (result.error) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/tours/pause
 * Pausar el tour actual
 */
router.post('/pause', async (req, res) => {
    try {
        const { userId } = req.body;
        const uid = userId || req.user?.id || 'anonymous';

        const orchestrator = await loadOrchestrator();

        let result;
        if (orchestrator) {
            result = orchestrator.pauseTour(uid);
        } else {
            const service = loadTourService();
            result = service.pauseTour(uid);
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/tours/resume
 * Reanudar tour pausado
 */
router.post('/resume', async (req, res) => {
    try {
        const { userId } = req.body;
        const uid = userId || req.user?.id || 'anonymous';

        const orchestrator = await loadOrchestrator();

        let result;
        if (orchestrator) {
            result = orchestrator.resumeTour(uid);
        } else {
            const service = loadTourService();
            result = service.resumeTour(uid);
        }

        if (result.error) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/tours/progress/:userId
 * Obtener progreso actual del tour
 */
router.get('/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const orchestrator = await loadOrchestrator();

        let progress;
        if (orchestrator) {
            progress = orchestrator.getTourProgress(userId);
        } else {
            const service = loadTourService();
            progress = service.getProgress(userId);
        }

        res.json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * ENDPOINTS DE PREGUNTAS - INTEGRACIÓN CON SUPPORT AI
 * ============================================================================
 */

/**
 * POST /api/brain/tours/question
 * Hacer pregunta durante el tour (integra Support AI)
 */
router.post('/question', async (req, res) => {
    try {
        const { userId, question, tourContext } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: 'question es requerido'
            });
        }

        const uid = userId || req.user?.id || 'anonymous';
        const orchestrator = await loadOrchestrator();

        if (orchestrator) {
            const result = await orchestrator.handleTourQuestion(uid, question, tourContext || {});

            return res.json({
                success: true,
                source: 'orchestrator',
                data: result
            });
        }

        // Fallback: usar Support AI directo
        try {
            const { getInstance: getSupportAI } = require('../brain/agents/SupportAIAgent');
            const supportAI = await getSupportAI();
            const answer = await supportAI.handleQuestion(question, {
                ...tourContext,
                isTourMode: true
            });

            res.json({
                success: true,
                source: 'support-direct',
                data: {
                    answer,
                    tourProgress: null
                }
            });

        } catch (supportError) {
            res.json({
                success: true,
                source: 'fallback',
                data: {
                    answer: {
                        answer: 'Lo siento, el asistente no está disponible en este momento. Continúa con el tour y vuelve a intentarlo más tarde.',
                        confidence: 0,
                        source: 'fallback'
                    },
                    tourProgress: null
                }
            });
        }

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/tours/detect-intent
 * Detectar si el usuario quiere iniciar un tour (NLU)
 */
router.post('/detect-intent', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'text es requerido'
            });
        }

        const orchestrator = await loadOrchestrator();

        let intent;
        if (orchestrator) {
            intent = orchestrator.detectTourIntent(text);

            // Si quiere tour, sugerir tours disponibles
            if (intent.wantsTour) {
                const tours = intent.module !== 'general'
                    ? orchestrator.getToursByModule(intent.module)
                    : orchestrator.listTours();

                intent.suggestedTours = tours.slice(0, 3);
            }
        } else {
            // Detección básica sin orchestrator
            const tourPatterns = [
                /tour|guía|enseña|muestra|aprend/i
            ];
            intent = {
                wantsTour: tourPatterns.some(p => p.test(text)),
                module: 'general'
            };
        }

        res.json({
            success: true,
            data: intent
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ============================================================================
 * ENDPOINTS LEGACY - COMPATIBILIDAD
 * ============================================================================
 */

/**
 * GET /api/brain/tours/onboarding/:role
 * Tour de onboarding para rol específico (legacy)
 */
router.get('/onboarding/:role', async (req, res) => {
    try {
        const { role } = req.params;
        const { modules } = req.query;

        // Intentar primero el nuevo servicio
        const service = loadTourService();
        const firstStepsTour = service.getTour('first-steps');

        if (firstStepsTour) {
            return res.json({
                success: true,
                source: 'new-service',
                data: {
                    ...firstStepsTour,
                    targetRole: role
                }
            });
        }

        // Fallback a legacy
        const legacy = await loadLegacyService();
        if (legacy) {
            const activeModules = modules ? modules.split(',') : [];
            const tour = legacy.generateOnboardingTour(role, activeModules);

            return res.json({
                success: true,
                source: 'legacy',
                data: tour
            });
        }

        res.status(404).json({
            success: false,
            error: 'No hay tours de onboarding disponibles'
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/tours/progress
 * Guardar progreso (legacy)
 */
router.post('/progress', async (req, res) => {
    try {
        const { userId, tourId, completedSteps, isCompleted } = req.body;

        if (!userId || !tourId) {
            return res.status(400).json({
                success: false,
                error: 'userId y tourId son requeridos'
            });
        }

        // El nuevo servicio maneja progreso en memoria
        // Aquí podríamos persistirlo en BD si es necesario

        const legacy = await loadLegacyService();
        if (legacy) {
            const saved = await legacy.saveTourProgress(userId, tourId, {
                completedSteps,
                isCompleted
            });

            return res.json({
                success: saved,
                message: saved ? 'Progreso guardado' : 'No se pudo guardar'
            });
        }

        res.json({
            success: true,
            message: 'Progreso registrado (en memoria)'
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/tours/stats
 * Obtener estadísticas de tours
 */
router.get('/stats', async (req, res) => {
    try {
        const service = loadTourService();
        const stats = service.getStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('[TOUR-API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
