/**
 * ============================================================================
 * BRAIN V2 API ROUTES
 * ============================================================================
 *
 * API REST para el nuevo Brain Introspectivo.
 * Endpoints separados en /api/brain/v2/* para no interferir con el sistema actual.
 *
 * ENDPOINTS:
 * - GET  /api/brain/v2/status          - Estado del Brain
 * - GET  /api/brain/v2/nodes           - Listar todos los nodos
 * - GET  /api/brain/v2/nodes/:key      - Obtener nodo específico
 * - GET  /api/brain/v2/relations       - Obtener todas las relaciones
 * - GET  /api/brain/v2/graph           - Grafo exportable para visualización
 * - POST /api/brain/v2/query           - Consultar el Brain
 * - GET  /api/brain/v2/who-provides/:cap   - ¿Quién provee una capacidad?
 * - GET  /api/brain/v2/who-consumes/:cap   - ¿Quién consume una capacidad?
 * - GET  /api/brain/v2/impact/:nodeKey     - Análisis de impacto
 * - GET  /api/brain/v2/health          - Reporte de salud
 * - GET  /api/brain/v2/capabilities    - Vocabulario de capacidades
 *
 * Created: 2025-12-17
 * Phase: 4 - API Routes v2
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// Lazy-load para no romper si Brain no está inicializado
let brain = null;
let migrator = null;
let isInitialized = false;

/**
 * Inicializar el Brain con módulos migrados
 */
async function initializeBrain() {
    if (isInitialized) return brain;

    try {
        const { getIntrospectiveBrain } = require('../brain/core/IntrospectiveBrain');
        const { ModuleMigrator } = require('../brain/core/ModuleMigrator');

        brain = getIntrospectiveBrain();
        migrator = new ModuleMigrator();

        // Migrar módulos y registrar
        const nodes = await migrator.migrateAll();
        for (const node of nodes) {
            brain.register(node);
        }

        // Construir grafo de relaciones
        brain.buildRelationGraph();

        isInitialized = true;
        console.log(`🧠 [BRAIN-V2-API] Brain inicializado con ${nodes.length} nodos`);

        return brain;
    } catch (error) {
        console.error('❌ [BRAIN-V2-API] Error inicializando Brain:', error.message);
        throw error;
    }
}

/**
 * Middleware para verificar que Brain está inicializado
 */
async function ensureBrain(req, res, next) {
    try {
        await initializeBrain();
        req.brain = brain;
        next();
    } catch (error) {
        res.status(503).json({
            success: false,
            error: 'Brain no disponible',
            details: error.message
        });
    }
}

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * GET /api/brain/v2/status
 * Estado general del Brain
 */
router.get('/status', ensureBrain, (req, res) => {
    try {
        const stats = req.brain.getStats();
        const { getBrainUpgradeController } = require('../brain/BrainUpgradeController');

        // Obtener estado del upgrade de forma síncrona si está disponible
        let upgradeStatus = null;
        try {
            const controller = getBrainUpgradeController();
            if (controller.then) {
                // Es una promesa, no podemos esperar aquí
                upgradeStatus = { status: 'loading' };
            } else {
                upgradeStatus = controller.getStatus();
            }
        } catch (e) {
            upgradeStatus = { status: 'unavailable' };
        }

        res.json({
            success: true,
            data: {
                initialized: isInitialized,
                stats,
                upgradeStatus,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/nodes
 * Listar todos los nodos
 */
router.get('/nodes', ensureBrain, (req, res) => {
    try {
        const { type, category, status } = req.query;
        let nodes = req.brain.getAllNodes();

        // Filtros opcionales
        if (type) {
            nodes = nodes.filter(n => n.type === type);
        }
        if (category) {
            nodes = nodes.filter(n => n.category === category);
        }
        if (status) {
            nodes = nodes.filter(n => n.status === status);
        }

        res.json({
            success: true,
            data: {
                total: nodes.length,
                nodes: nodes.map(n => ({
                    key: n.key,
                    name: n.name,
                    type: n.type,
                    category: n.category,
                    status: n.status,
                    provides: n.provides.length,
                    consumes: n.consumes.length,
                    emits: n.emits.length,
                    listens: n.listens.length
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/nodes/:key
 * Obtener nodo específico con todos sus detalles
 */
router.get('/nodes/:key', ensureBrain, (req, res) => {
    try {
        const node = req.brain.getNode(req.params.key);

        if (!node) {
            return res.status(404).json({
                success: false,
                error: `Nodo '${req.params.key}' no encontrado`
            });
        }

        // Incluir relaciones del nodo
        const relations = req.brain.getNodeRelations(req.params.key);
        const canWork = req.brain.canNodeWork(req.params.key);

        res.json({
            success: true,
            data: {
                node: node.toJSON(),
                relations: {
                    outgoing: relations.outgoing.length,
                    incoming: relations.incoming.length,
                    details: relations
                },
                canWork
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/relations
 * Obtener todas las relaciones
 */
router.get('/relations', ensureBrain, (req, res) => {
    try {
        const { type, from, to } = req.query;
        let relations = req.brain.relations;

        // Filtros opcionales
        if (type) {
            relations = relations.filter(r => r.type === type);
        }
        if (from) {
            relations = relations.filter(r => r.from === from);
        }
        if (to) {
            relations = relations.filter(r => r.to === to);
        }

        res.json({
            success: true,
            data: {
                total: relations.length,
                relations
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/graph
 * Grafo exportable para visualización (D3.js, Three.js, etc.)
 */
router.get('/graph', ensureBrain, (req, res) => {
    try {
        const graph = req.brain.exportGraph();

        res.json({
            success: true,
            data: graph
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/brain/v2/query
 * Consultar el Brain con preguntas en lenguaje natural (simple)
 */
router.post('/query', ensureBrain, (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere campo "question"'
            });
        }

        const questionLower = question.toLowerCase();
        let answer = null;

        // Parsear preguntas simples
        if (questionLower.includes('provee') || questionLower.includes('provides')) {
            // Extraer capacidad de la pregunta
            const match = question.match(/['"]([^'"]+)['"]/);
            if (match) {
                const providers = req.brain.whoProvides(match[1]);
                answer = {
                    type: 'providers',
                    capability: match[1],
                    nodes: providers.map(n => n.key)
                };
            }
        } else if (questionLower.includes('consume') || questionLower.includes('usa')) {
            const match = question.match(/['"]([^'"]+)['"]/);
            if (match) {
                const consumers = req.brain.whoConsumes(match[1]);
                answer = {
                    type: 'consumers',
                    capability: match[1],
                    nodes: consumers.map(n => n.key)
                };
            }
        } else if (questionLower.includes('falla') || questionLower.includes('impacto')) {
            const match = question.match(/['"]([^'"]+)['"]/);
            if (match) {
                const impact = req.brain.whatIfFails(match[1]);
                answer = {
                    type: 'impact',
                    node: match[1],
                    directlyAffected: impact.directlyAffected.map(n => n.key),
                    transitivelyAffected: impact.transitivelyAffected.map(n => n.key)
                };
            }
        } else if (questionLower.includes('depende')) {
            const match = question.match(/['"]([^'"]+)['"]/);
            if (match) {
                const deps = req.brain.whatDependsOn(match[1]);
                answer = {
                    type: 'dependencies',
                    node: match[1],
                    dependsOn: deps.map(d => ({
                        node: d.node.key,
                        capability: d.capability,
                        required: d.required
                    }))
                };
            }
        }

        if (!answer) {
            answer = {
                type: 'unknown',
                message: 'No pude entender la pregunta. Intenta usar comillas para especificar el nodo/capacidad.'
            };
        }

        res.json({
            success: true,
            data: {
                question,
                answer
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/who-provides/:capability
 * ¿Quién provee una capacidad?
 */
router.get('/who-provides/:capability', ensureBrain, (req, res) => {
    try {
        const capability = decodeURIComponent(req.params.capability);
        const providers = req.brain.whoProvides(capability);

        res.json({
            success: true,
            data: {
                capability,
                providers: providers.map(n => ({
                    key: n.key,
                    name: n.name,
                    type: n.type
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/who-consumes/:capability
 * ¿Quién consume una capacidad?
 */
router.get('/who-consumes/:capability', ensureBrain, (req, res) => {
    try {
        const capability = decodeURIComponent(req.params.capability);
        const consumers = req.brain.whoConsumes(capability);

        res.json({
            success: true,
            data: {
                capability,
                consumers: consumers.map(n => ({
                    key: n.key,
                    name: n.name,
                    type: n.type
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/impact/:nodeKey
 * Análisis de impacto si un nodo falla
 */
router.get('/impact/:nodeKey', ensureBrain, (req, res) => {
    try {
        const nodeKey = req.params.nodeKey;
        const node = req.brain.getNode(nodeKey);

        if (!node) {
            return res.status(404).json({
                success: false,
                error: `Nodo '${nodeKey}' no encontrado`
            });
        }

        const impact = req.brain.whatIfFails(nodeKey);

        res.json({
            success: true,
            data: {
                node: {
                    key: node.key,
                    name: node.name
                },
                impact: {
                    directlyAffected: impact.directlyAffected.map(n => ({
                        key: n.key,
                        name: n.name
                    })),
                    transitivelyAffected: impact.transitivelyAffected.map(n => ({
                        key: n.key,
                        name: n.name
                    })),
                    eventSubscribers: impact.eventSubscribers.map(n => ({
                        key: n.key,
                        name: n.name
                    }))
                },
                summary: {
                    totalAffected: impact.directlyAffected.length + impact.transitivelyAffected.length,
                    severity: impact.directlyAffected.length > 5 ? 'high' :
                              impact.directlyAffected.length > 2 ? 'medium' : 'low'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/health
 * Reporte de salud del ecosistema
 */
router.get('/health', ensureBrain, (req, res) => {
    try {
        const health = req.brain.generateHealthReport();

        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/capabilities
 * Vocabulario de capacidades disponibles
 */
router.get('/capabilities', (req, res) => {
    try {
        const { CapabilitiesVocabulary, STANDARD_EVENTS } =
            require('../brain/schemas/CapabilitiesVocabulary');

        const stats = CapabilitiesVocabulary.getStats();
        const { domain } = req.query;

        let capabilities;
        if (domain) {
            capabilities = CapabilitiesVocabulary.getByDomain(domain);
        } else {
            capabilities = CapabilitiesVocabulary.getAllCapabilities();
        }

        res.json({
            success: true,
            data: {
                stats,
                capabilities,
                events: Object.keys(STANDARD_EVENTS).length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/brain/v2/rebuild
 * Forzar reconstrucción del grafo de relaciones
 */
router.post('/rebuild', ensureBrain, (req, res) => {
    try {
        const relations = req.brain.buildRelationGraph();

        res.json({
            success: true,
            data: {
                message: 'Grafo reconstruido',
                relationsCount: relations.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
