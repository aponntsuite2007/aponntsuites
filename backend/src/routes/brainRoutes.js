/**
 * ============================================================================
 * BRAIN ROUTES - API del Cerebro del Ecosistema
 * ============================================================================
 *
 * Endpoints que proporcionan datos EN VIVO del sistema.
 * NO lee de archivos JSON estáticos - todo es escaneado en tiempo real.
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const EcosystemBrainService = require('../services/EcosystemBrainService');

// Importar rutas de circuitos de negocio (opcional para compatibilidad con producción)
let circuitRoutes = null;
try {
  circuitRoutes = require('./circuitRoutes');
  console.log('✅ [BRAIN-API] Circuit routes loaded');
} catch(e) {
  console.log('⚠️ [BRAIN-API] Circuit routes not available:', e.message);
}

let brainService = null;

// Inicializar servicio con database
function initBrainService(database) {
  if (!brainService) {
    brainService = new EcosystemBrainService(database);
    console.log('🧠 [BRAIN-API] Servicio inicializado');
  }
  return brainService;
}

// Middleware para asegurar que el servicio está inicializado
router.use((req, res, next) => {
  if (!brainService && req.app.get('database')) {
    initBrainService(req.app.get('database'));
  }
  next();
});

/**
 * GET /api/brain/health
 * Health check del cerebro
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    service: 'EcosystemBrainService',
    timestamp: new Date().toISOString(),
    message: 'El cerebro está activo y escaneando'
  });
});

/**
 * GET /api/brain/overview
 * Vista general del ecosistema (para tab Overview)
 */
router.get('/overview', async (req, res) => {
  try {
    const data = await brainService.getOverview();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/backend-files
 * Archivos backend escaneados EN VIVO
 */
router.get('/backend-files', async (req, res) => {
  try {
    const data = await brainService.scanBackendFiles();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en backend-files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/frontend-files
 * Archivos frontend escaneados EN VIVO
 */
router.get('/frontend-files', async (req, res) => {
  try {
    const data = await brainService.scanFrontendFiles();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en frontend-files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/commercial-modules
 * Módulos comerciales desde BD (VIVOS)
 */
router.get('/commercial-modules', async (req, res) => {
  try {
    const data = await brainService.getCommercialModules();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en commercial-modules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/technical-modules
 * Módulos técnicos detectados del código EN VIVO
 */
router.get('/technical-modules', async (req, res) => {
  try {
    const data = await brainService.getTechnicalModules();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en technical-modules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/roadmap
 * Roadmap desde BD con auto-detección
 */
router.get('/roadmap', async (req, res) => {
  try {
    const data = await brainService.getRoadmap();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en roadmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/critical-path
 * ❌ REMOVIDO - Módulo Camino Crítico nunca funcionó correctamente
 */
// router.get('/critical-path', async (req, res) => {
//   try {
//     const data = await brainService.getCriticalPath();
//     res.json({ success: true, data });
//   } catch (error) {
//     console.error('❌ [BRAIN-API] Error en critical-path:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

/**
 * GET /api/brain/workflows
 * Workflows detectados del código
 */
router.get('/workflows', async (req, res) => {
  try {
    const data = await brainService.getWorkflows();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en workflows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/database
 * Schema de BD introspectado EN VIVO
 */
router.get('/database', async (req, res) => {
  try {
    const data = await brainService.getDatabaseSchema();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en database:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/applications
 * Aplicaciones del ecosistema
 */
router.get('/applications', async (req, res) => {
  try {
    const data = await brainService.getApplications();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en applications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/organigrama (LEGACY - mantener por compatibilidad)
 * Organigrama de Aponnt simple
 */
router.get('/organigrama', async (req, res) => {
  try {
    const data = await brainService.getOrganigrama();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en organigrama:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/orgchart/aponnt
 * Organigrama Inteligente de Aponnt (staff interno)
 * Features: Auto-detección de vacantes, análisis de bottlenecks, insights
 */
router.get('/orgchart/aponnt', async (req, res) => {
  try {
    const data = await brainService.getOrgChartAponnt();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en orgchart Aponnt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/orgchart/company/:company_id
 * Organigrama Inteligente de Empresa (empleados)
 * Features: Auto-detección de vacantes, análisis de estructura, insights
 */
router.get('/orgchart/company/:company_id', async (req, res) => {
  try {
    const companyId = parseInt(req.params.company_id);
    if (isNaN(companyId)) {
      return res.status(400).json({ success: false, error: 'company_id inválido' });
    }

    const data = await brainService.getOrgChartCompany(companyId);
    res.json({ success: true, data });
  } catch (error) {
    console.error(`❌ [BRAIN-API] Error en orgchart company:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/brain/clear-cache
 * Limpiar cache para forzar escaneo fresco
 */
router.post('/clear-cache', (req, res) => {
  try {
    brainService.clearCache();
    res.json({
      success: true,
      message: 'Cache limpiado - próxima petición escaneará en vivo'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/metadata
 * Metadata completa (reemplaza a /api/engineering/metadata)
 * Combina toda la información viva en un solo objeto
 */
router.get('/metadata', async (req, res) => {
  try {
    const [overview, backend, frontend, commercial, technical, apps, roadmap, workflows] = await Promise.all([
      brainService.getOverview(),
      brainService.scanBackendFiles(),
      brainService.scanFrontendFiles(),
      brainService.getCommercialModules(),
      brainService.getTechnicalModules(),
      brainService.getApplications(),
      brainService.getRoadmap(),
      brainService.getWorkflows()
    ]);

    res.json({
      success: true,
      data: {
        project: overview.project,
        scannedAt: new Date().toISOString(),
        source: 'LIVE_SCAN',
        applications: apps.applications,
        modules: technical.modules,
        commercialModules: commercial,
        backendFiles: backend.categories,
        frontendFiles: frontend.categories,
        roadmap: roadmap.phases,
        workflows: workflows.workflows,
        stats: overview.stats
      }
    });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en metadata:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/stats
 * Estadísticas agregadas del sistema
 */
router.get('/stats', async (req, res) => {
  try {
    const overview = await brainService.getOverview();
    res.json({
      success: true,
      data: overview.stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/brain/update-llm-context
 * Actualiza el llm-context.json con TODA la información del Brain
 *
 * ESTRATEGIA:
 * Transparencia radical como ventaja competitiva.
 * Ningún competidor expone así su metadata para análisis de IAs.
 *
 * IMPORTANTE: Genera backup automático antes de actualizar
 */
router.post('/update-llm-context', async (req, res) => {
  try {
    console.log('🧠 [BRAIN-API] Regenerando llm-context.json con transparencia radical...');

    // Importar el nuevo generador
    const BrainLLMContextGenerator = require('../services/BrainLLMContextGenerator');

    // Crear instancia y generar
    const generator = new BrainLLMContextGenerator();
    const context = await generator.generate();

    console.log('✅ [BRAIN-API] llm-context.json actualizado exitosamente');

    res.json({
      success: true,
      message: 'llm-context.json regenerado exitosamente con transparencia radical',
      stats: {
        total_modules: context._metadata.total_modules_in_registry,
        client_visible_modules: context._metadata.client_visible_modules,
        engineering_metadata_lines: context._metadata.engineering_metadata_lines,
        version: context._metadata.version,
        generated_at: context._metadata.generated_at,
        transparency_level: context._metadata.transparency_level
      },
      strategy: 'Exposing full system architecture for objective AI analysis',
      competitive_advantage: 'No competitor exposes metadata like this'
    });

  } catch (error) {
    console.error('❌ [BRAIN-API] Error actualizando llm-context.json:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// SISTEMA NERVIOSO - VERIFICACIÓN DE PRERREQUISITOS EN VIVO
// ============================================================================

const PrerequisiteChecker = require('../brain/services/PrerequisiteChecker');
let prerequisiteChecker = null;

function getPrerequisiteChecker(database) {
  if (!prerequisiteChecker && database) {
    prerequisiteChecker = new PrerequisiteChecker(database);
  }
  return prerequisiteChecker;
}

/**
 * GET /api/brain/actions
 * Lista todas las acciones disponibles con sus prerrequisitos
 */
router.get('/actions', (req, res) => {
  try {
    const checker = getPrerequisiteChecker(req.app.get('database'));
    if (!checker) {
      return res.status(503).json({ success: false, error: 'PrerequisiteChecker no inicializado' });
    }

    const actions = checker.getAvailableActions();
    res.json({
      success: true,
      count: actions.length,
      actions
    });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en actions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/prerequisites/:actionKey
 * Verificar prerrequisitos de una acción específica para una empresa/usuario
 *
 * Query params:
 * - company_id: ID de la empresa (requerido)
 * - user_id: ID del usuario (opcional)
 *
 * Ejemplo: /api/brain/prerequisites/payroll-request?company_id=11
 */
router.get('/prerequisites/:actionKey', async (req, res) => {
  try {
    const { actionKey } = req.params;
    const { company_id, user_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido',
        example: '/api/brain/prerequisites/payroll-request?company_id=11'
      });
    }

    const checker = getPrerequisiteChecker(req.app.get('database'));
    if (!checker) {
      return res.status(503).json({ success: false, error: 'PrerequisiteChecker no inicializado' });
    }

    const result = await checker.checkPrerequisites(actionKey, parseInt(company_id), user_id);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en prerequisites:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/check-readiness
 * Verificar qué acciones puede ejecutar una empresa/usuario
 *
 * Query params:
 * - company_id: ID de la empresa (requerido)
 * - user_id: ID del usuario (opcional)
 *
 * Devuelve: acciones disponibles y bloqueadas con razones
 */
router.get('/check-readiness', async (req, res) => {
  try {
    const { company_id, user_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido',
        example: '/api/brain/check-readiness?company_id=11'
      });
    }

    const checker = getPrerequisiteChecker(req.app.get('database'));
    if (!checker) {
      return res.status(503).json({ success: false, error: 'PrerequisiteChecker no inicializado' });
    }

    const result = await checker.getAvailableActionsForUser(parseInt(company_id), user_id);

    res.json({
      success: true,
      companyId: parseInt(company_id),
      userId: user_id || null,
      summary: {
        available: result.available.length,
        blocked: result.blocked.length,
        total: result.available.length + result.blocked.length
      },
      available: result.available,
      blocked: result.blocked
    });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en check-readiness:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/brain/check-multiple
 * Verificar múltiples acciones a la vez
 *
 * Body:
 * - actions: ["action1", "action2", ...]
 * - company_id: ID de la empresa
 * - user_id: ID del usuario (opcional)
 */
router.post('/check-multiple', async (req, res) => {
  try {
    const { actions, company_id, user_id } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        error: 'actions debe ser un array de strings'
      });
    }

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'company_id es requerido' });
    }

    const checker = getPrerequisiteChecker(req.app.get('database'));
    if (!checker) {
      return res.status(503).json({ success: false, error: 'PrerequisiteChecker no inicializado' });
    }

    const results = await checker.checkMultipleActions(actions, parseInt(company_id), user_id);

    const summary = {
      total: actions.length,
      canProceed: Object.values(results).filter(r => r.canProceed).length,
      blocked: Object.values(results).filter(r => !r.canProceed).length
    };

    res.json({
      success: true,
      summary,
      results
    });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en check-multiple:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/workflows/notifications
 * Auto-Discovery de Workflows de Notificación
 *
 * Retorna todos los workflows de notificación desde la tabla SSOT
 * con estadísticas y agrupación por scope/módulo.
 */
router.get('/workflows/notifications', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { scope, priority, module, active } = req.query;

    // Construir query con filtros opcionales
    let whereClause = '1=1';
    const replacements = {};

    if (scope && scope !== 'all') {
      whereClause += ' AND scope = :scope';
      replacements.scope = scope;
    }

    if (priority) {
      whereClause += ' AND priority = :priority';
      replacements.priority = priority;
    }

    if (module) {
      whereClause += ' AND module = :module';
      replacements.module = module;
    }

    if (active !== undefined) {
      whereClause += ' AND is_active = :active';
      replacements.active = active === 'true';
    }

    // Obtener workflows
    const [workflows] = await sequelize.query(`
      SELECT
        id, process_key, process_name, module, description,
        scope, channels, priority, requires_response,
        response_type, response_options, is_active,
        email_template_key, workflow_steps, metadata,
        created_at, updated_at
      FROM notification_workflows
      WHERE ${whereClause}
      ORDER BY scope, module, priority DESC, process_name
    `, { replacements });

    // Calcular estadísticas
    const stats = {
      total: workflows.length,
      by_scope: {
        aponnt: workflows.filter(w => w.scope === 'aponnt').length,
        company: workflows.filter(w => w.scope === 'company').length
      },
      by_priority: {
        critical: workflows.filter(w => w.priority === 'critical').length,
        high: workflows.filter(w => w.priority === 'high').length,
        medium: workflows.filter(w => w.priority === 'medium').length,
        low: workflows.filter(w => w.priority === 'low').length
      },
      by_module: {},
      with_response: workflows.filter(w => w.requires_response).length,
      active: workflows.filter(w => w.is_active).length,
      inactive: workflows.filter(w => !w.is_active).length
    };

    // Agrupar por módulo
    workflows.forEach(w => {
      if (!stats.by_module[w.module]) {
        stats.by_module[w.module] = 0;
      }
      stats.by_module[w.module]++;
    });

    // Metadata del sistema
    const metadata = {
      source: 'notification_workflows table (SSOT)',
      lastSync: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'Multi-canal (Email, WhatsApp, SMS, Push)',
        'Workflows con respuesta automática',
        'Scope: Aponnt (global) + Company (multi-tenant)',
        'Prioridades: critical, high, medium, low',
        'Templates parametrizables'
      ]
    };

    res.json({
      success: true,
      workflows,
      stats,
      metadata
    });

  } catch (error) {
    console.error('❌ [BRAIN-WORKFLOWS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('🧠 [BRAIN-API] Sistema Nervioso - Prerrequisitos activado');

// ============================================================================
// MONTAR RUTAS DE CIRCUITOS DE NEGOCIO (si están disponibles)
// ============================================================================
if (circuitRoutes) {
  router.use('/circuits', circuitRoutes);
  console.log('🔄 [BRAIN-API] Rutas de circuitos de negocio montadas en /api/brain/circuits');
} else {
  console.log('⚠️ [BRAIN-API] Circuit routes no montadas (dependencias no disponibles)');
}

// Exportar router e inicializador
module.exports = router;
module.exports.initBrainService = initBrainService;
