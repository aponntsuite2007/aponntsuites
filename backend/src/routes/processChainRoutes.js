/**
 * ============================================================================
 * PROCESS CHAIN ROUTES - API para Autoconocimiento Integral
 * ============================================================================
 *
 * Endpoints que demuestran el verdadero AUTOCONOCIMIENTO del sistema:
 * - Validación de prerequisitos (blockchain de datos)
 * - Generación dinámica de cadenas de procesos
 * - Routing automático por organigrama (SSOT)
 * - Alternativas inteligentes cuando falta un módulo
 *
 * Esto reemplaza el trabajo de soporte humano en 80%+ de casos.
 *
 * @version 1.0.0
 * @date 2025-12-10
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const ProcessChainGenerator = require('../services/ProcessChainGenerator');
const ContextValidatorService = require('../services/ContextValidatorService');
const EcosystemBrainService = require('../services/EcosystemBrainService');
const database = require('../config/database');

// Inicializar servicios
const brainService = new EcosystemBrainService(database.sequelize);
const processChainService = new ProcessChainGenerator(database.sequelize, brainService);
const contextValidator = new ContextValidatorService(database.sequelize);

/**
 * POST /api/process-chain/generate
 * Genera cadena de procesos completa para una acción de usuario
 *
 * Body:
 * {
 *   userId: 123,
 *   companyId: 1,
 *   action: "shift-swap",
 *   userIntent: "quiero pedir un cambio de turno con jose"
 * }
 */
router.post('/generate', async (req, res) => {
    console.log('\n🔗 [API] Solicitud de generación de process chain');

    try {
        const { userId, companyId, action, userIntent } = req.body;

        if (!userId || !companyId || !action) {
            return res.status(400).json({
                success: false,
                error: 'Parámetros requeridos: userId, companyId, action'
            });
        }

        const chain = await processChainService.generateProcessChain(
            userId,
            companyId,
            action,
            userIntent
        );

        if (!chain || chain.error) {
            return res.status(500).json({
                success: false,
                error: chain.error || 'Error generando process chain'
            });
        }

        res.json({
            success: true,
            data: chain,
            message: chain.canProceed
                ? `Process chain generada: ${chain.processSteps.length} pasos`
                : `Prerequisitos faltantes: ${chain.prerequisiteSteps.length}`
        });

    } catch (error) {
        console.error('❌ Error en /generate:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/process-chain/validate-context/:userId/:companyId/:action
 * Valida si el usuario puede realizar una acción (prerequisitos)
 */
router.get('/validate-context/:userId/:companyId/:action', async (req, res) => {
    console.log('\n🔍 [API] Validando contexto de usuario');

    try {
        const { userId, companyId, action } = req.params;

        const validation = await contextValidator.validateUserContext(
            parseInt(userId),
            parseInt(companyId),
            action
        );

        res.json({
            success: true,
            data: validation,
            message: validation.valid
                ? 'Usuario puede realizar la acción'
                : `Faltan ${validation.missingPrerequisites?.length || 0} prerequisitos`
        });

    } catch (error) {
        console.error('❌ Error en /validate-context:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/process-chain/user-actions/:userId/:companyId
 * Obtiene todas las acciones disponibles para un usuario con su estado
 */
router.get('/user-actions/:userId/:companyId', async (req, res) => {
    console.log('\n📋 [API] Obteniendo acciones disponibles para usuario');

    try {
        const { userId, companyId } = req.params;

        const actions = await contextValidator.getUserAvailableActions(
            parseInt(userId),
            parseInt(companyId)
        );

        const summary = {
            total: actions.length,
            available: actions.filter(a => a.available).length,
            blocked: actions.filter(a => !a.available).length,
            withAlternatives: actions.filter(a => a.hasAlternative).length
        };

        res.json({
            success: true,
            data: {
                actions,
                summary
            },
            message: `${summary.available}/${summary.total} acciones disponibles`
        });

    } catch (error) {
        console.error('❌ Error en /user-actions:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/process-chain/interpret-intent
 * Interpreta intent del usuario y genera process chain automáticamente
 *
 * Body:
 * {
 *   userId: 123,
 *   companyId: 1,
 *   userIntent: "quiero pedir un cambio de turno con jose"
 * }
 */
router.post('/interpret-intent', async (req, res) => {
    console.log('\n🧠 [API] Interpretando intent de usuario');

    try {
        const { userId, companyId, userIntent } = req.body;

        if (!userId || !companyId || !userIntent) {
            return res.status(400).json({
                success: false,
                error: 'Parámetros requeridos: userId, companyId, userIntent'
            });
        }

        // Detectar acción desde el intent usando keywords
        const actionKey = detectActionFromIntent(userIntent);

        if (!actionKey) {
            return res.json({
                success: false,
                error: 'No se pudo interpretar la intención. Por favor sea más específico.',
                suggestions: [
                    'cambio de turno',
                    'solicitud de vacaciones',
                    'pedir ausencia',
                    'horas extra',
                    'turno médico'
                ]
            });
        }

        // Generar process chain
        const chain = await processChainService.generateProcessChain(
            userId,
            companyId,
            actionKey,
            userIntent
        );

        res.json({
            success: true,
            data: {
                detectedAction: actionKey,
                userIntent,
                chain
            },
            message: `Interpretado: "${actionKey}" → ${chain.canProceed ? 'puede proceder' : 'prerequisitos faltantes'}`
        });

    } catch (error) {
        console.error('❌ Error en /interpret-intent:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Detecta la acción desde el intent del usuario usando keywords
 */
function detectActionFromIntent(intent) {
    const lower = intent.toLowerCase();

    // Keywords para cada acción
    const keywords = {
        'shift-swap': ['cambio de turno', 'cambiar turno', 'intercambiar turno', 'swap', 'permutar turno'],
        'vacation-request': ['vacaciones', 'vacacional', 'pedir vacaciones', 'solicitar vacaciones'],
        'time-off-request': ['ausencia', 'permiso', 'faltar', 'no venir', 'ausentarme'],
        'overtime-request': ['horas extra', 'horas extras', 'overtime', 'trabajar más'],
        'medical-appointment': ['turno médico', 'turno medico', 'consulta médica', 'doctor', 'médico', 'medico']
    };

    // Buscar coincidencias
    for (const [action, keywordList] of Object.entries(keywords)) {
        for (const keyword of keywordList) {
            if (lower.includes(keyword)) {
                return action;
            }
        }
    }

    return null;
}

/**
 * GET /api/process-chain/health
 * Health check del sistema de process chains
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Process Chain Generator API',
        version: '1.0.0',
        capabilities: {
            contextValidation: true,
            processChainGeneration: true,
            organizationalRouting: true,
            alternativePathFinding: true,
            intentInterpretation: true
        },
        description: 'Sistema de autoconocimiento integral con generación dinámica de cadenas de procesos',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
