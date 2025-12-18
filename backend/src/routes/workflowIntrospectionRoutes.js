/**
 * ============================================================================
 * WORKFLOW INTROSPECTION ROUTES
 * ============================================================================
 *
 * API REST para el servicio de introspección de workflows.
 * Provee endpoints para:
 * - Escanear workflows de todos los módulos
 * - Obtener tutoriales auto-generados
 * - Proveer contexto al AI Assistant
 * - Buscar workflows por pregunta natural
 */

const express = require('express');
const router = express.Router();
const workflowService = require('../services/WorkflowIntrospectionService');

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE ESCANEO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/workflows/scan
 * Escanea todos los módulos y detecta workflows
 */
router.get('/scan', async (req, res) => {
  try {
    const forceRefresh = req.query.force === 'true';
    const workflows = await workflowService.scanAllWorkflows(forceRefresh);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      moduleCount: Object.keys(workflows).length,
      workflows
    });
  } catch (error) {
    console.error('Error scanning workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/workflows/module/:moduleId
 * Obtiene workflows de un módulo específico
 */
router.get('/module/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const context = await workflowService.getWorkflowContextForAssistant(moduleId);

    res.json({
      success: true,
      ...context
    });
  } catch (error) {
    console.error('Error getting module workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/workflows/module/:moduleId/action/:action
 * Obtiene un workflow específico de un módulo
 */
router.get('/module/:moduleId/action/:action', async (req, res) => {
  try {
    const { moduleId, action } = req.params;
    const context = await workflowService.getWorkflowContextForAssistant(moduleId, action);

    res.json({
      success: true,
      ...context
    });
  } catch (error) {
    console.error('Error getting specific workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE TUTORIALES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/workflows/tutorials
 * Lista todos los tutoriales auto-generados
 */
router.get('/tutorials', async (req, res) => {
  try {
    // Asegurar que workflows están escaneados
    const workflows = await workflowService.scanAllWorkflows();

    const allTutorials = [];
    for (const [moduleId, moduleData] of Object.entries(workflows)) {
      for (const tutorial of moduleData.tutorials) {
        allTutorials.push({
          ...tutorial,
          moduleId,
          moduleName: moduleData.moduleName
        });
      }
    }

    // Agrupar por dificultad
    const grouped = {
      básico: allTutorials.filter(t => t.difficulty === 'básico'),
      intermedio: allTutorials.filter(t => t.difficulty === 'intermedio'),
      avanzado: allTutorials.filter(t => t.difficulty === 'avanzado')
    };

    res.json({
      success: true,
      totalTutorials: allTutorials.length,
      byDifficulty: {
        básico: grouped.básico.length,
        intermedio: grouped.intermedio.length,
        avanzado: grouped.avanzado.length
      },
      tutorials: allTutorials
    });
  } catch (error) {
    console.error('Error getting tutorials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/workflows/tutorials/:moduleId
 * Obtiene tutoriales de un módulo específico
 */
router.get('/tutorials/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const context = await workflowService.getWorkflowContextForAssistant(moduleId);

    if (!context.found) {
      return res.status(404).json({
        success: false,
        error: `No se encontraron tutoriales para ${moduleId}`
      });
    }

    res.json({
      success: true,
      moduleId,
      moduleName: context.moduleName,
      tutorials: context.tutorials
    });
  } catch (error) {
    console.error('Error getting module tutorials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS PARA AI ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/workflows/search
 * Busca workflows por pregunta natural (para AI Assistant)
 */
router.post('/search', async (req, res) => {
  try {
    const { question, limit = 5 } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una pregunta'
      });
    }

    const results = await workflowService.searchWorkflowsByQuestion(question);

    res.json({
      success: true,
      question,
      resultCount: results.length,
      results: results.slice(0, limit)
    });
  } catch (error) {
    console.error('Error searching workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/workflows/assistant-context/:moduleId
 * Obtiene contexto completo para AI Assistant
 */
router.get('/assistant-context/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { action } = req.query;

    const context = await workflowService.getWorkflowContextForAssistant(moduleId, action);

    // Formatear para AI Assistant
    const assistantContext = {
      moduleId,
      moduleName: context.moduleName || moduleId,
      found: context.found,
      capabilities: context.summary?.capabilities || [],
      workflows: context.workflows || {},
      helpTexts: {},
      tutorials: context.tutorials || []
    };

    // Generar textos de ayuda para cada workflow
    if (context.workflows) {
      for (const [key, workflow] of Object.entries(context.workflows)) {
        assistantContext.helpTexts[key] = workflowService.generateHelpText(workflow);
      }
    }

    res.json({
      success: true,
      ...assistantContext
    });
  } catch (error) {
    console.error('Error getting assistant context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/workflows/help
 * Genera ayuda contextual basada en módulo y acción actual
 */
router.post('/help', async (req, res) => {
  try {
    const { moduleId, currentAction, userQuestion } = req.body;

    // 1. Obtener contexto del módulo
    const moduleContext = await workflowService.getWorkflowContextForAssistant(moduleId, currentAction);

    // 2. Si hay pregunta, buscar workflows relacionados
    let searchResults = [];
    if (userQuestion) {
      searchResults = await workflowService.searchWorkflowsByQuestion(userQuestion);
    }

    // 3. Generar respuesta de ayuda
    const helpResponse = {
      moduleId,
      moduleName: moduleContext.moduleName,
      currentWorkflow: moduleContext.workflow || null,
      currentTutorial: moduleContext.tutorial || null,
      relatedWorkflows: searchResults.slice(0, 3),
      suggestedHelp: []
    };

    // Agregar sugerencias de ayuda
    if (moduleContext.found && moduleContext.workflows) {
      helpResponse.suggestedHelp = Object.entries(moduleContext.workflows).map(([key, wf]) => ({
        action: key,
        name: wf.name,
        description: wf.description
      }));
    }

    res.json({
      success: true,
      ...helpResponse
    });
  } catch (error) {
    console.error('Error generating help:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/workflows/stats
 * Estadísticas de workflows del sistema
 */
router.get('/stats', async (req, res) => {
  try {
    const workflows = await workflowService.scanAllWorkflows();

    let totalWorkflows = 0;
    let totalTutorials = 0;
    const byType = {};
    const byModule = {};

    for (const [moduleId, moduleData] of Object.entries(workflows)) {
      const moduleWorkflowCount = Object.keys(moduleData.workflows).length;
      totalWorkflows += moduleWorkflowCount;
      totalTutorials += moduleData.tutorials.length;
      byModule[moduleId] = moduleWorkflowCount;

      for (const workflow of Object.values(moduleData.workflows)) {
        byType[workflow.type] = (byType[workflow.type] || 0) + 1;
      }
    }

    res.json({
      success: true,
      stats: {
        totalModules: Object.keys(workflows).length,
        totalWorkflows,
        totalTutorials,
        byType,
        topModules: Object.entries(byModule)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, count]) => ({ moduleId: id, workflowCount: count }))
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/workflows/coverage
 * Cobertura de workflows por módulo
 */
router.get('/coverage', async (req, res) => {
  try {
    const workflows = await workflowService.scanAllWorkflows();
    const modules = await workflowService.getModulesFromRegistry();

    const coverage = modules.map(mod => {
      const moduleWorkflows = workflows[mod.id];
      const workflowCount = moduleWorkflows ? Object.keys(moduleWorkflows.workflows).length : 0;

      return {
        moduleId: mod.id,
        moduleName: mod.name,
        type: mod.taxonomy?.type || 'UNKNOWN',
        hasUI: mod.taxonomy?.has_ui || false,
        workflowCount,
        hasTutorials: workflowCount > 0,
        coverage: workflowCount > 0 ? 'complete' : 'pending'
      };
    });

    const complete = coverage.filter(c => c.coverage === 'complete').length;
    const pending = coverage.filter(c => c.coverage === 'pending').length;

    res.json({
      success: true,
      summary: {
        total: modules.length,
        withWorkflows: complete,
        pending: pending,
        coveragePercent: Math.round((complete / modules.length) * 100)
      },
      coverage: coverage.sort((a, b) => b.workflowCount - a.workflowCount)
    });
  } catch (error) {
    console.error('Error getting coverage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
