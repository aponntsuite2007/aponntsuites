/**
 * CONTEXTUAL HELP ROUTES v1.0
 * API para sistema de ayuda contextual con Ollama
 *
 * @version 1.0
 * @date 2025-12-06
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ContextualHelpService = require('../services/ContextualHelpService');

// =====================================================
// AYUDA ESTÁTICA
// =====================================================

/**
 * @route GET /api/v1/help/module/:moduleKey
 * @desc Obtener ayuda completa de un módulo
 */
router.get('/module/:moduleKey', auth, async (req, res) => {
    try {
        const { moduleKey } = req.params;

        const help = await ContextualHelpService.getModuleHelp(moduleKey);

        if (!help) {
            return res.status(404).json({ error: 'Módulo no encontrado' });
        }

        res.json({ success: true, help });

    } catch (error) {
        console.error('[HELP] Error getting module help:', error);
        res.status(500).json({ error: 'Error obteniendo ayuda del módulo' });
    }
});

/**
 * @route GET /api/v1/help/tooltip
 * @desc Obtener tooltip de un elemento específico
 */
router.get('/tooltip', auth, async (req, res) => {
    try {
        const { moduleKey, screenKey, elementKey } = req.query;

        if (!moduleKey || !elementKey) {
            return res.status(400).json({ error: 'moduleKey y elementKey son requeridos' });
        }

        const tooltip = await ContextualHelpService.getElementTooltip(
            moduleKey,
            screenKey || 'main',
            elementKey
        );

        res.json({ success: true, tooltip });

    } catch (error) {
        console.error('[HELP] Error getting tooltip:', error);
        res.status(500).json({ error: 'Error obteniendo tooltip' });
    }
});

/**
 * @route GET /api/v1/help/walkthrough/:moduleKey
 * @desc Obtener walkthrough (tutorial) de un módulo
 */
router.get('/walkthrough/:moduleKey', auth, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const { screenKey } = req.query;

        const steps = await ContextualHelpService.getWalkthrough(moduleKey, screenKey || 'main');

        res.json({
            success: true,
            steps,
            hasWalkthrough: steps.length > 0
        });

    } catch (error) {
        console.error('[HELP] Error getting walkthrough:', error);
        res.status(500).json({ error: 'Error obteniendo tutorial' });
    }
});

/**
 * @route POST /api/v1/help/feedback/:helpId
 * @desc Registrar feedback de ayuda (útil/no útil)
 */
router.post('/feedback/:helpId', auth, async (req, res) => {
    try {
        const { helpId } = req.params;
        const { wasHelpful } = req.body;

        const result = await ContextualHelpService.recordHelpFeedback(
            parseInt(helpId),
            wasHelpful === true
        );

        res.json({ success: result.success });

    } catch (error) {
        console.error('[HELP] Error recording feedback:', error);
        res.status(500).json({ error: 'Error registrando feedback' });
    }
});

// =====================================================
// VERIFICACIÓN DE DEPENDENCIAS
// =====================================================

/**
 * @route GET /api/v1/help/readiness/:moduleKey
 * @desc Verificar si el módulo está listo para usar
 */
router.get('/readiness/:moduleKey', auth, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const companyId = req.user.company_id;

        const readiness = await ContextualHelpService.checkModuleReadiness(moduleKey, companyId);

        res.json({ success: true, ...readiness });

    } catch (error) {
        console.error('[HELP] Error checking readiness:', error);
        res.status(500).json({ error: 'Error verificando disponibilidad del módulo' });
    }
});

/**
 * @route GET /api/v1/help/suggestions/:moduleKey
 * @desc Obtener sugerencias proactivas para el módulo actual
 */
router.get('/suggestions/:moduleKey', auth, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const companyId = req.user.company_id;
        const userRole = req.user.role;

        const suggestions = await ContextualHelpService.getProactiveSuggestions(
            moduleKey,
            companyId,
            userRole
        );

        res.json({ success: true, suggestions });

    } catch (error) {
        console.error('[HELP] Error getting suggestions:', error);
        res.status(500).json({ error: 'Error obteniendo sugerencias' });
    }
});

// =====================================================
// ASISTENTE IA (OLLAMA)
// =====================================================

/**
 * @route POST /api/v1/help/ask
 * @desc Hacer pregunta al asistente IA
 */
router.post('/ask', auth, async (req, res) => {
    try {
        const { question, moduleKey, screenKey } = req.body;
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const role = req.user.role;

        if (!question || question.trim().length < 3) {
            return res.status(400).json({ error: 'La pregunta es muy corta' });
        }

        // Verificar dependencias del módulo actual (para contexto)
        let issues = [];
        if (moduleKey) {
            const readiness = await ContextualHelpService.checkModuleReadiness(moduleKey, companyId);
            issues = readiness.issues;
        }

        const result = await ContextualHelpService.getAIAssistance(question, {
            moduleKey,
            screenKey,
            companyId,
            userId,
            role,
            issues
        });

        res.json({
            success: result.success,
            answer: result.answer,
            source: result.source || 'ollama',
            model: result.model,
            ollamaAvailable: result.ollamaAvailable !== false
        });

    } catch (error) {
        console.error('[HELP] Error getting AI assistance:', error);
        res.status(500).json({ error: 'Error obteniendo respuesta del asistente' });
    }
});

/**
 * @route GET /api/v1/help/ai-status
 * @desc Verificar estado de Ollama
 */
router.get('/ai-status', auth, async (req, res) => {
    try {
        const status = await ContextualHelpService.checkOllamaStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        console.error('[HELP] Error checking AI status:', error);
        res.status(500).json({ error: 'Error verificando estado de IA' });
    }
});

// =====================================================
// COMBINADO: Todo para un módulo
// =====================================================

/**
 * @route GET /api/v1/help/full-context/:moduleKey
 * @desc Obtener todo el contexto de ayuda para un módulo
 * (ayuda + dependencias + sugerencias + tooltips)
 */
router.get('/full-context/:moduleKey', auth, async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const { screenKey } = req.query;
        const companyId = req.user.company_id;
        const userRole = req.user.role;

        // Obtener todo en paralelo
        const [help, readiness, suggestions] = await Promise.all([
            ContextualHelpService.getModuleHelp(moduleKey),
            ContextualHelpService.checkModuleReadiness(moduleKey, companyId),
            ContextualHelpService.getProactiveSuggestions(moduleKey, companyId, userRole)
        ]);

        // Filtrar tooltips para la pantalla actual
        const tooltips = help?.tooltips?.filter(t =>
            t.screen_key === (screenKey || 'main') || t.screen_key === null
        ) || [];

        res.json({
            success: true,
            module: {
                key: moduleKey,
                name: help?.module_name,
                description: help?.description,
                helpTitle: help?.help_title,
                helpDescription: help?.help_description,
                gettingStarted: help?.help_getting_started,
                commonTasks: help?.help_common_tasks
            },
            readiness: {
                isReady: readiness.isReady,
                issues: readiness.issues,
                warnings: readiness.warnings
            },
            suggestions,
            tooltips,
            hasWalkthrough: help?.hasWalkthrough || false
        });

    } catch (error) {
        console.error('[HELP] Error getting full context:', error);
        res.status(500).json({ error: 'Error obteniendo contexto de ayuda' });
    }
});

module.exports = router;
