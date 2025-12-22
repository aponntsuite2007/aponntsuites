/**
 * ============================================================================
 * CIRCUIT ROUTES - API de Circuitos de Negocio y Tours
 * ============================================================================
 *
 * Endpoints para:
 * - Consultar circuitos de negocio
 * - Ejecutar tours guiados
 * - Consultar APKs móviles
 * - Preguntas sobre el sistema
 *
 * Base URL: /api/brain/circuits
 *
 * Created: 2025-12-20
 * Phase: 8 - Business Circuits
 */

const express = require('express');
const router = express.Router();

// Importar providers y registries
const { getBrainKnowledgeProvider } = require('../brain/integrations/BrainKnowledgeProvider');
const { getCircuitTourEngine } = require('../brain/integrations/CircuitTourEngine');
const {
    getAllCircuits,
    getCircuit,
    getCircuitsByType,
    findCircuitsUsingModule,
    getCircuitsSummary,
    CIRCUITS_REGISTRY
} = require('../brain/circuits/BusinessCircuitsRegistry');
const {
    getAllApps,
    getApp,
    getAppsSummary,
    getEndpointsMatrix,
    recommendAppForTask
} = require('../brain/registry/MobileAppsRegistry');

// =============================================================================
// CIRCUITOS DE NEGOCIO
// =============================================================================

/**
 * GET /api/brain/circuits
 * Listar todos los circuitos de negocio
 */
router.get('/', (req, res) => {
    try {
        const summary = getCircuitsSummary();

        res.json({
            success: true,
            count: summary.length,
            circuits: summary
        });
    } catch (error) {
        console.error('[CIRCUITS] Error listando circuitos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al listar circuitos'
        });
    }
});

/**
 * GET /api/brain/circuits/:key
 * Obtener detalle de un circuito específico
 */
router.get('/:key', (req, res) => {
    try {
        const { key } = req.params;
        const circuit = getCircuit(key);

        if (!circuit) {
            return res.status(404).json({
                success: false,
                error: `Circuito '${key}' no encontrado`,
                available: Object.keys(CIRCUITS_REGISTRY)
            });
        }

        res.json({
            success: true,
            circuit: circuit.toJSON()
        });
    } catch (error) {
        console.error('[CIRCUITS] Error obteniendo circuito:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener circuito'
        });
    }
});

/**
 * GET /api/brain/circuits/:key/tour
 * Obtener tour completo de un circuito (sin interacción)
 */
router.get('/:key/tour', (req, res) => {
    try {
        const { key } = req.params;
        const circuit = getCircuit(key);

        if (!circuit) {
            return res.status(404).json({
                success: false,
                error: `Circuito '${key}' no encontrado`
            });
        }

        const tour = circuit.generateTour();

        res.json({
            success: true,
            tour
        });
    } catch (error) {
        console.error('[CIRCUITS] Error generando tour:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar tour'
        });
    }
});

/**
 * GET /api/brain/circuits/:key/narrative
 * Obtener narrativa de un circuito (texto para IA)
 */
router.get('/:key/narrative', (req, res) => {
    try {
        const { key } = req.params;
        const circuit = getCircuit(key);

        if (!circuit) {
            return res.status(404).json({
                success: false,
                error: `Circuito '${key}' no encontrado`
            });
        }

        const narrative = circuit.generateQuickTour();

        res.json({
            success: true,
            circuitKey: key,
            narrative
        });
    } catch (error) {
        console.error('[CIRCUITS] Error generando narrativa:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar narrativa'
        });
    }
});

/**
 * GET /api/brain/circuits/by-type/:type
 * Obtener circuitos por tipo
 */
router.get('/by-type/:type', (req, res) => {
    try {
        const { type } = req.params;
        const circuits = getCircuitsByType(type);

        res.json({
            success: true,
            type,
            count: circuits.length,
            circuits: circuits.map(c => ({
                key: c.key,
                name: c.name,
                description: c.description
            }))
        });
    } catch (error) {
        console.error('[CIRCUITS] Error buscando por tipo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al buscar circuitos'
        });
    }
});

/**
 * GET /api/brain/circuits/using-module/:moduleName
 * Encontrar circuitos que usen un módulo específico
 */
router.get('/using-module/:moduleName', (req, res) => {
    try {
        const { moduleName } = req.params;
        const circuits = findCircuitsUsingModule(moduleName);

        const participation = circuits.map(c => {
            const stages = c.stages.filter(s => s.modules.includes(moduleName));
            return {
                circuitKey: c.key,
                circuitName: c.name,
                stagesCount: stages.length,
                stages: stages.map(s => s.name)
            };
        });

        res.json({
            success: true,
            module: moduleName,
            participatesIn: circuits.length,
            circuits: participation
        });
    } catch (error) {
        console.error('[CIRCUITS] Error buscando módulo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al buscar módulo'
        });
    }
});

/**
 * GET /api/brain/circuits/dependencies
 * Obtener matriz de dependencias entre circuitos
 */
router.get('/analysis/dependencies', (req, res) => {
    try {
        const tourEngine = getCircuitTourEngine();
        const matrix = tourEngine.getCircuitDependencyMatrix();

        res.json({
            success: true,
            dependencies: matrix
        });
    } catch (error) {
        console.error('[CIRCUITS] Error obteniendo dependencias:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dependencias'
        });
    }
});

// =============================================================================
// TOURS INTERACTIVOS
// =============================================================================

/**
 * POST /api/brain/circuits/tour/start
 * Iniciar un tour guiado
 */
router.post('/tour/start', (req, res) => {
    try {
        const { circuitKey, userId } = req.body;

        if (!circuitKey) {
            return res.status(400).json({
                success: false,
                error: 'circuitKey es requerido',
                available: Object.keys(CIRCUITS_REGISTRY)
            });
        }

        const tourEngine = getCircuitTourEngine();
        const result = tourEngine.startTour(userId || 'default', circuitKey);

        res.json(result);
    } catch (error) {
        console.error('[CIRCUITS] Error iniciando tour:', error);
        res.status(500).json({
            success: false,
            error: 'Error al iniciar tour'
        });
    }
});

/**
 * POST /api/brain/circuits/tour/next
 * Avanzar al siguiente paso del tour
 */
router.post('/tour/next', (req, res) => {
    try {
        const { userId } = req.body;

        const tourEngine = getCircuitTourEngine();
        const result = tourEngine.nextStep(userId || 'default');

        res.json(result);
    } catch (error) {
        console.error('[CIRCUITS] Error en siguiente paso:', error);
        res.status(500).json({
            success: false,
            error: 'Error al avanzar tour'
        });
    }
});

/**
 * POST /api/brain/circuits/tour/previous
 * Retroceder al paso anterior
 */
router.post('/tour/previous', (req, res) => {
    try {
        const { userId } = req.body;

        const tourEngine = getCircuitTourEngine();
        const result = tourEngine.previousStep(userId || 'default');

        res.json(result);
    } catch (error) {
        console.error('[CIRCUITS] Error en paso anterior:', error);
        res.status(500).json({
            success: false,
            error: 'Error al retroceder tour'
        });
    }
});

/**
 * POST /api/brain/circuits/tour/end
 * Terminar el tour
 */
router.post('/tour/end', (req, res) => {
    try {
        const { userId } = req.body;

        const tourEngine = getCircuitTourEngine();
        const result = tourEngine.endTour(userId || 'default');

        res.json(result);
    } catch (error) {
        console.error('[CIRCUITS] Error terminando tour:', error);
        res.status(500).json({
            success: false,
            error: 'Error al terminar tour'
        });
    }
});

/**
 * GET /api/brain/circuits/tour/status
 * Obtener estado del tour actual
 */
router.get('/tour/status', (req, res) => {
    try {
        const { userId } = req.query;

        const tourEngine = getCircuitTourEngine();
        const status = tourEngine.getTourStatus(userId || 'default');

        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('[CIRCUITS] Error obteniendo estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estado'
        });
    }
});

// =============================================================================
// APLICACIONES MÓVILES
// =============================================================================

/**
 * GET /api/brain/circuits/apps
 * Listar todas las APKs
 */
router.get('/apps/list', (req, res) => {
    try {
        const apps = getAppsSummary();

        res.json({
            success: true,
            count: apps.length,
            apps
        });
    } catch (error) {
        console.error('[CIRCUITS] Error listando apps:', error);
        res.status(500).json({
            success: false,
            error: 'Error al listar apps'
        });
    }
});

/**
 * GET /api/brain/circuits/apps/:key
 * Obtener detalle de una APK
 */
router.get('/apps/:key', (req, res) => {
    try {
        const { key } = req.params;
        const app = getApp(key);

        if (!app) {
            return res.status(404).json({
                success: false,
                error: `APK '${key}' no encontrada`,
                available: getAllApps().map(a => a.key)
            });
        }

        res.json({
            success: true,
            app: {
                ...app.toJSON(),
                endpointsByCategory: app.getEndpointsByCategory(),
                documentation: app.documentation
            }
        });
    } catch (error) {
        console.error('[CIRCUITS] Error obteniendo app:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener app'
        });
    }
});

/**
 * GET /api/brain/circuits/apps/endpoints-matrix
 * Obtener matriz de endpoints por APK
 */
router.get('/apps/analysis/endpoints-matrix', (req, res) => {
    try {
        const matrix = getEndpointsMatrix();

        res.json({
            success: true,
            matrix
        });
    } catch (error) {
        console.error('[CIRCUITS] Error obteniendo matriz:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener matriz'
        });
    }
});

/**
 * POST /api/brain/circuits/apps/recommend
 * Recomendar APK para una tarea
 */
router.post('/apps/recommend', (req, res) => {
    try {
        const { task } = req.body;

        if (!task) {
            return res.status(400).json({
                success: false,
                error: 'task es requerido'
            });
        }

        const recommendation = recommendAppForTask(task);

        res.json({
            success: true,
            ...recommendation
        });
    } catch (error) {
        console.error('[CIRCUITS] Error recomendando app:', error);
        res.status(500).json({
            success: false,
            error: 'Error al recomendar app'
        });
    }
});

// =============================================================================
// PREGUNTAS Y RESPUESTAS
// =============================================================================

/**
 * POST /api/brain/circuits/ask
 * Hacer una pregunta sobre el sistema
 */
router.post('/ask', (req, res) => {
    try {
        const { question, context } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: 'question es requerida'
            });
        }

        const tourEngine = getCircuitTourEngine();
        const answer = tourEngine.answerQuestion(question, context || {});

        res.json({
            success: true,
            question,
            ...answer
        });
    } catch (error) {
        console.error('[CIRCUITS] Error respondiendo pregunta:', error);
        res.status(500).json({
            success: false,
            error: 'Error al responder pregunta'
        });
    }
});

/**
 * POST /api/brain/circuits/find-circuit
 * Encontrar el circuito adecuado para una necesidad
 */
router.post('/find-circuit', (req, res) => {
    try {
        const { need } = req.body;

        if (!need) {
            return res.status(400).json({
                success: false,
                error: 'need es requerido'
            });
        }

        const tourEngine = getCircuitTourEngine();
        const result = tourEngine.findCircuitForNeed(need);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[CIRCUITS] Error buscando circuito:', error);
        res.status(500).json({
            success: false,
            error: 'Error al buscar circuito'
        });
    }
});

/**
 * POST /api/brain/circuits/end-to-end-flow
 * Obtener flujo end-to-end entre dos puntos
 */
router.post('/end-to-end-flow', (req, res) => {
    try {
        const { start, end } = req.body;

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                error: 'start y end son requeridos'
            });
        }

        const provider = getBrainKnowledgeProvider();
        const flow = provider.getEndToEndFlow(start, end);

        res.json({
            success: true,
            ...flow
        });
    } catch (error) {
        console.error('[CIRCUITS] Error obteniendo flujo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener flujo'
        });
    }
});

/**
 * GET /api/brain/circuits/ai-context
 * Obtener contexto completo para el Asistente IA
 */
router.get('/ai-context', (req, res) => {
    try {
        const tourEngine = getCircuitTourEngine();
        const context = tourEngine.generateAIContext();

        res.json({
            success: true,
            context
        });
    } catch (error) {
        console.error('[CIRCUITS] Error generando contexto IA:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar contexto'
        });
    }
});

module.exports = router;
