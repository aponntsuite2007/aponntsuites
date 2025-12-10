/**
 * ============================================================================
 * TRAINING & KNOWLEDGE ROUTES - API de Capacitación Inteligente
 * ============================================================================
 *
 * Endpoints para:
 * - Tutoriales auto-generados por módulo
 * - Sistema de capacitación con autoevaluación
 * - Dashboard de soporte con Brain Analytics
 * - Tutoriales personalizados para tickets
 * - Notificaciones de novedades
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const TrainingKnowledgeService = require('../services/TrainingKnowledgeService');

let trainingService = null;

/**
 * Middleware para inicializar el servicio
 */
router.use((req, res, next) => {
  if (!trainingService) {
    const database = req.app.get('database');
    const brainService = req.app.get('brainService');
    trainingService = new TrainingKnowledgeService(database, brainService);
    console.log('📚 [TRAINING-API] Training & Knowledge Service inicializado');
  }
  next();
});

// ============================================================================
// STATUS
// ============================================================================

/**
 * GET /api/training/status
 * Estado del servicio de capacitación
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      initialized: !!trainingService,
      brainConnected: !!trainingService?.brainService,
      features: [
        'module-tutorials',
        'auto-evaluation',
        'ticket-tutorials',
        'feature-notifications',
        'training-progress',
        'support-dashboard'
      ],
      version: '1.0.0'
    }
  });
});

// ============================================================================
// 1. TUTORIALES POR MÓDULO
// ============================================================================

/**
 * GET /api/training/tutorial/:moduleKey
 * Obtiene tutorial para un módulo específico
 */
router.get('/tutorial/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const { format = 'step_by_step', audience = 'user' } = req.query;

    console.log(`\n📖 [API] Tutorial solicitado: ${moduleKey} (${format})`);

    const result = await trainingService.generateModuleTutorial(moduleKey, {
      format,
      audience,
      includeExamples: true
    });

    res.json(result);
  } catch (error) {
    console.error(`❌ Error generando tutorial: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/training/tutorials
 * Lista todos los tutoriales disponibles
 */
router.get('/tutorials', async (req, res) => {
  try {
    const { category, audience = 'user' } = req.query;

    // Obtener módulos disponibles
    const brainService = req.app.get('brainService');
    let modules = [];

    if (brainService) {
      try {
        const techModules = await brainService.getTechnicalModules?.();
        modules = techModules?.modules || [];
      } catch (e) {
        console.log(`   ⚠️ Error obteniendo módulos: ${e.message}`);
      }
    }

    // Si no hay módulos del Brain, usar registry
    if (modules.length === 0) {
      try {
        const registryPath = require('path').join(__dirname, '../auditor/registry/modules-registry.json');
        const registry = require(registryPath);
        modules = Object.entries(registry.modules || {}).map(([key, mod]) => ({
          key,
          name: mod.name,
          category: mod.category,
          description: mod.description
        }));
      } catch (e) {
        console.log(`   ⚠️ Error cargando registry: ${e.message}`);
      }
    }

    // Filtrar por categoría si se especificó
    if (category) {
      modules = modules.filter(m => m.category === category);
    }

    res.json({
      success: true,
      data: {
        totalModules: modules.length,
        tutorials: modules.map(m => ({
          moduleKey: m.key,
          name: m.name,
          category: m.category,
          description: m.description?.substring(0, 100) || '',
          formats: ['step_by_step', 'video_script', 'faq', 'quick_reference'],
          url: `/api/training/tutorial/${m.key}`
        }))
      }
    });
  } catch (error) {
    console.error(`❌ Error listando tutoriales: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 2. CAPACITACIÓN Y AUTOEVALUACIÓN
// ============================================================================

/**
 * GET /api/training/plan/:userId
 * Obtiene el plan de capacitación de un usuario
 */
router.get('/plan/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role = 'user' } = req.query;

    console.log(`\n📋 [API] Plan de capacitación para: ${userId}`);

    const plan = await trainingService.getTrainingPlan(userId, role);

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error(`❌ Error obteniendo plan: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/training/quiz/:moduleKey
 * Obtiene el quiz de autoevaluación para un módulo
 */
router.get('/quiz/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;

    console.log(`\n📝 [API] Quiz solicitado: ${moduleKey}`);

    // Generar tutorial con quiz incluido
    const result = await trainingService.generateModuleTutorial(moduleKey, {
      format: 'step_by_step'
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: {
        moduleKey,
        moduleName: result.tutorial.title,
        quiz: result.tutorial.quiz
      }
    });
  } catch (error) {
    console.error(`❌ Error obteniendo quiz: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/training/quiz/:moduleKey/submit
 * Envía respuestas del quiz para evaluación
 */
router.post('/quiz/:moduleKey/submit', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const { userId, answers } = req.body;

    if (!userId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere userId y answers (array)'
      });
    }

    console.log(`\n✅ [API] Evaluando quiz ${moduleKey} para ${userId}`);

    const result = await trainingService.evaluateQuiz(userId, moduleKey, answers);

    res.json(result);
  } catch (error) {
    console.error(`❌ Error evaluando quiz: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/training/progress/:userId
 * Obtiene el progreso de capacitación de un usuario
 */
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const plan = await trainingService.getTrainingPlan(userId);

    res.json({
      success: true,
      data: {
        userId,
        overallProgress: plan.overallProgress,
        completedModules: plan.completedModules,
        totalModules: plan.totalModules,
        pendingModules: plan.pendingModules,
        modules: plan.modules.map(m => ({
          key: m.key,
          name: m.name,
          status: m.status,
          progress: Math.round((m.completedSteps / m.totalSteps) * 100),
          quizPassed: m.quizPassed
        }))
      }
    });
  } catch (error) {
    console.error(`❌ Error obteniendo progreso: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 3. TUTORIALES PARA TICKETS DE SOPORTE
// ============================================================================

/**
 * POST /api/training/ticket-tutorial
 * Genera tutorial personalizado basado en un ticket
 */
router.post('/ticket-tutorial', async (req, res) => {
  try {
    const { ticketId, subject, description, category, moduleKey, userLevel } = req.body;

    if (!ticketId || !description) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere ticketId y description'
      });
    }

    console.log(`\n🎫 [API] Generando tutorial para ticket: ${ticketId}`);

    const result = await trainingService.generateTicketTutorial(ticketId, {
      subject,
      description,
      category,
      moduleKey,
      userLevel
    });

    res.json(result);
  } catch (error) {
    console.error(`❌ Error generando tutorial de ticket: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 4. NOTIFICACIONES DE NOVEDADES
// ============================================================================

/**
 * POST /api/training/notify-feature
 * Notifica sobre nueva funcionalidad o actualización
 */
router.post('/notify-feature', async (req, res) => {
  try {
    const { type, moduleKey, title, description, affectedRoles, requiresTraining, priority } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere type y title'
      });
    }

    console.log(`\n📢 [API] Notificando: ${type} - ${title}`);

    const result = await trainingService.notifyNewFeatures({
      type,
      moduleKey,
      title,
      description,
      affectedRoles,
      requiresTraining,
      priority
    });

    res.json(result);
  } catch (error) {
    console.error(`❌ Error notificando: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/training/updates/:userId
 * Obtiene actualizaciones pendientes para un usuario
 */
router.get('/updates/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const updates = await trainingService.getPendingUpdates(userId);

    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error(`❌ Error obteniendo actualizaciones: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 5. DASHBOARD DE SOPORTE CON BRAIN ANALYTICS
// ============================================================================

/**
 * GET /api/training/support-dashboard
 * Dashboard para equipo de soporte con métricas del Brain
 */
router.get('/support-dashboard', async (req, res) => {
  try {
    const { role = 'support' } = req.query;

    console.log(`\n📊 [API] Dashboard de soporte para: ${role}`);

    const dashboard = await trainingService.getSupportDashboardData(role);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error(`❌ Error obteniendo dashboard: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/training/brain-status
 * Estado detallado del Brain para soporte
 */
router.get('/brain-status', async (req, res) => {
  try {
    const brainService = req.app.get('brainService');

    if (!brainService) {
      return res.json({
        success: true,
        data: {
          connected: false,
          message: 'Brain Service no disponible'
        }
      });
    }

    // Obtener overview del Brain
    const overview = await brainService.getProjectOverview?.();

    res.json({
      success: true,
      data: {
        connected: true,
        overview: overview || null,
        capabilities: [
          'Escaneo de archivos en tiempo real',
          'Detección de módulos y dependencias',
          'Análisis de workflows',
          'Generación de tutoriales contextuales',
          'Métricas de salud del sistema'
        ],
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`❌ Error obteniendo estado del Brain: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/training/module-health/:moduleKey
 * Health de un módulo específico (para diagnóstico de soporte)
 */
router.get('/module-health/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const brainService = req.app.get('brainService');

    if (!brainService) {
      return res.status(503).json({
        success: false,
        error: 'Brain Service no disponible'
      });
    }

    // Obtener datos vivos del módulo
    let moduleData = null;
    try {
      moduleData = await brainService.getModuleWithLiveData?.(moduleKey);
    } catch (e) {
      console.log(`   ⚠️ Error obteniendo datos: ${e.message}`);
    }

    res.json({
      success: true,
      data: {
        moduleKey,
        found: !!moduleData,
        liveData: moduleData,
        health: {
          status: moduleData ? 'operational' : 'unknown',
          lastChecked: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error(`❌ Error obteniendo health del módulo: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/training/health
 * Health check del servicio
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    service: 'TrainingKnowledgeService',
    timestamp: new Date().toISOString(),
    brainConnected: !!trainingService?.brainService
  });
});

module.exports = router;
