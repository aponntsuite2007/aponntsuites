/**
 * ============================================================================
 * BRAIN AGENTS ROUTES - API REST para Sistema Autónomo
 * ============================================================================
 *
 * Expone todos los agentes IA via REST API:
 * - /api/brain/support - Soporte 24/7
 * - /api/brain/trainer - Capacitación
 * - /api/brain/tester - Testing
 * - /api/brain/evaluator - Evaluación
 * - /api/brain/sales - Demos y ventas
 * - /api/brain/stats - Estadísticas globales
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Lazy loading del orquestrador para evitar problemas de inicialización
let brainOrchestrator = null;

const getBrain = async () => {
    if (!brainOrchestrator) {
        const { getInstance } = require('../BrainOrchestrator');
        brainOrchestrator = await getInstance();
    }
    return brainOrchestrator;
};

/**
 * ========================================================================
 * MIDDLEWARE
 * ========================================================================
 */

// Middleware para verificar que el Brain está activo
const ensureBrainActive = async (req, res, next) => {
    try {
        const brain = await getBrain();
        if (brain.status !== 'running') {
            return res.status(503).json({
                error: 'Brain Orchestrator not running',
                status: brain.status
            });
        }
        req.brain = brain;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Failed to initialize Brain', message: error.message });
    }
};

/**
 * ========================================================================
 * SUPPORT AI ENDPOINTS
 * ========================================================================
 */

/**
 * POST /api/brain/support/ask
 * Hacer una pregunta al Support AI
 */
router.post('/support/ask', ensureBrainActive, async (req, res) => {
    try {
        const { question, context } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        const response = await req.brain.handleSupportQuestion(question, {
            ...context,
            userId: req.user?.id,
            companyId: req.user?.company_id
        });

        res.json(response);

    } catch (error) {
        console.error('Support AI error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * ========================================================================
 * TRAINER AI ENDPOINTS
 * ========================================================================
 */

/**
 * POST /api/brain/trainer/onboarding/start
 * Iniciar onboarding para un usuario
 */
router.post('/trainer/onboarding/start', ensureBrainActive, async (req, res) => {
    try {
        const { userId, userRole, userName } = req.body;

        const onboarding = await req.brain.startUserOnboarding(
            userId || req.user?.id,
            userRole || req.user?.role,
            userName || req.user?.name
        );

        res.json(onboarding);

    } catch (error) {
        console.error('Trainer AI error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/trainer/tutorial/next/:userId
 * Obtener siguiente tutorial para un usuario
 */
router.get('/trainer/tutorial/next/:userId', ensureBrainActive, (req, res) => {
    try {
        const tutorial = req.brain.getNextTutorial(req.params.userId);
        res.json(tutorial || { message: 'No more tutorials available' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brain/trainer/tutorial/complete
 * Marcar tutorial como completado
 */
router.post('/trainer/tutorial/complete', ensureBrainActive, async (req, res) => {
    try {
        const { userId, tutorialId, score } = req.body;

        const result = await req.brain.completeTutorial(
            userId || req.user?.id,
            tutorialId,
            score || 100
        );

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/trainer/progress/:userId
 * Obtener progreso de un usuario
 */
router.get('/trainer/progress/:userId', ensureBrainActive, (req, res) => {
    try {
        const progress = req.brain.agents.trainer.getUserProgress(req.params.userId);
        res.json(progress || { message: 'User not found in training program' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/trainer/leaderboard
 * Obtener leaderboard de capacitación
 */
router.get('/trainer/leaderboard', ensureBrainActive, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = req.brain.agents.trainer.getLeaderboard(limit);
        res.json(leaderboard);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * ========================================================================
 * TESTER AI ENDPOINTS
 * ========================================================================
 */

/**
 * POST /api/brain/tester/run
 * Ejecutar tests
 */
router.post('/tester/run', ensureBrainActive, async (req, res) => {
    try {
        const { module } = req.body;

        const results = await req.brain.runTests({ module });
        res.json(results);

    } catch (error) {
        console.error('Tester AI error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/tester/results/:runId
 * Obtener resultados de un run de tests
 */
router.get('/tester/results/:runId', ensureBrainActive, (req, res) => {
    try {
        const results = req.brain.agents.tester.testResults.find(
            r => r.id === req.params.runId
        );

        if (!results) {
            return res.status(404).json({ error: 'Test run not found' });
        }

        res.json(results);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/tester/edge-cases/:module
 * Generar casos edge para un módulo
 */
router.get('/tester/edge-cases/:module', ensureBrainActive, (req, res) => {
    try {
        const cases = req.brain.agents.tester.generateEdgeCases(req.params.module);
        res.json(cases);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * ========================================================================
 * EVALUATOR AI ENDPOINTS
 * ========================================================================
 */

/**
 * POST /api/brain/evaluator/user
 * Evaluar un usuario
 */
router.post('/evaluator/user', ensureBrainActive, async (req, res) => {
    try {
        const { userId, periodDays } = req.body;

        const evaluation = await req.brain.evaluateUser(
            userId || req.user?.id,
            { periodDays }
        );

        res.json(evaluation);

    } catch (error) {
        console.error('Evaluator AI error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brain/evaluator/department
 * Evaluar un departamento
 */
router.post('/evaluator/department', ensureBrainActive, async (req, res) => {
    try {
        const { departmentId, userIds } = req.body;

        if (!departmentId) {
            return res.status(400).json({ error: 'departmentId is required' });
        }

        const evaluation = await req.brain.evaluateDepartment(departmentId, userIds || []);
        res.json(evaluation);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/evaluator/report/:evaluationId
 * Obtener reporte de evaluación
 */
router.get('/evaluator/report/:evaluationId', ensureBrainActive, (req, res) => {
    try {
        const report = req.brain.agents.evaluator.generateReport(req.params.evaluationId);

        if (!report) {
            return res.status(404).json({ error: 'Evaluation not found' });
        }

        res.json(report);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/evaluator/leaderboard
 * Obtener leaderboard de evaluaciones
 */
router.get('/evaluator/leaderboard', ensureBrainActive, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = req.brain.agents.evaluator.getLeaderboard(limit);
        res.json(leaderboard);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * ========================================================================
 * SALES AI ENDPOINTS
 * ========================================================================
 */

/**
 * POST /api/brain/sales/demo/start
 * Iniciar demo de ventas
 */
router.post('/sales/demo/start', ensureBrainActive, async (req, res) => {
    try {
        const leadInfo = req.body;

        if (!leadInfo.industry) {
            return res.status(400).json({ error: 'industry is required' });
        }

        const demo = await req.brain.startSalesDemo(leadInfo);
        res.json(demo);

    } catch (error) {
        console.error('Sales AI error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brain/sales/demo/advance/:sessionId
 * Avanzar demo al siguiente paso
 */
router.post('/sales/demo/advance/:sessionId', ensureBrainActive, async (req, res) => {
    try {
        const result = await req.brain.advanceDemo(req.params.sessionId);
        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brain/sales/objection
 * Manejar objeción
 */
router.post('/sales/objection', ensureBrainActive, (req, res) => {
    try {
        const { objection, sessionId } = req.body;

        if (!objection) {
            return res.status(400).json({ error: 'objection text is required' });
        }

        const response = req.brain.handleObjection(objection, sessionId);
        res.json(response);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brain/sales/pricing
 * Calcular pricing
 */
router.post('/sales/pricing', ensureBrainActive, (req, res) => {
    try {
        const { employeeCount, modules, annualPayment } = req.body;

        if (!employeeCount) {
            return res.status(400).json({ error: 'employeeCount is required' });
        }

        const pricing = req.brain.calculatePricing(employeeCount, modules || [], { annualPayment });
        res.json(pricing);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brain/sales/roi
 * Calcular ROI
 */
router.post('/sales/roi', ensureBrainActive, (req, res) => {
    try {
        const companyInfo = req.body;

        if (!companyInfo.employeeCount) {
            return res.status(400).json({ error: 'employeeCount is required' });
        }

        const roi = req.brain.calculateROI(companyInfo);
        res.json(roi);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/brain/sales/proposal/:leadId
 * Generar propuesta comercial
 */
router.post('/sales/proposal/:leadId', ensureBrainActive, async (req, res) => {
    try {
        const proposal = await req.brain.generateProposal(req.params.leadId, req.body);

        if (proposal.error) {
            return res.status(404).json(proposal);
        }

        res.json(proposal);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/sales/leads
 * Listar leads
 */
router.get('/sales/leads', ensureBrainActive, (req, res) => {
    try {
        const leads = req.brain.agents.sales.listLeads();
        res.json(leads);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/brain/sales/industries
 * Obtener industrias disponibles
 */
router.get('/sales/industries', ensureBrainActive, (req, res) => {
    try {
        const industries = req.brain.agents.sales.industries;
        res.json(industries);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * ========================================================================
 * GLOBAL STATS & HEALTH
 * ========================================================================
 */

/**
 * GET /api/brain/health
 * Health check del sistema
 */
router.get('/health', ensureBrainActive, (req, res) => {
    const health = req.brain.healthCheck();
    res.json(health);
});

/**
 * GET /api/brain/stats
 * Estadísticas globales
 */
router.get('/stats', ensureBrainActive, (req, res) => {
    const stats = req.brain.getStats();
    res.json(stats);
});

/**
 * GET /api/brain/dashboard
 * Resumen para dashboard
 */
router.get('/dashboard', ensureBrainActive, (req, res) => {
    const summary = req.brain.getDashboardSummary();
    res.json(summary);
});

/**
 * POST /api/brain/discovery/run
 * Ejecutar discovery de UI
 */
router.post('/discovery/run', ensureBrainActive, async (req, res) => {
    try {
        await req.brain.runInitialDiscovery();
        res.json({ success: true, message: 'Discovery completed' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
