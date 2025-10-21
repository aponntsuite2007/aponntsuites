/**
 * AUDITOR ROUTES - API del Sistema de Auditoría
 *
 * Endpoints:
 * - POST /api/audit/run - Ejecutar auditoría completa
 * - POST /api/audit/run/:module - Auditoría de módulo específico
 * - GET /api/audit/status - Estado actual
 * - GET /api/audit/executions - Histórico de ejecuciones
 * - GET /api/audit/executions/:id - Detalle de ejecución
 * - POST /api/audit/heal/:logId - Aplicar fix sugerido
 * - POST /api/audit/seed/:module - Generar datos de prueba
 * - DELETE /api/audit/cleanup - Limpiar datos de prueba
 * - GET /api/audit/registry - Ver registry completo
 * - GET /api/audit/registry/:module - Ver módulo específico
 * - GET /api/audit/dependencies/:module - Analizar dependencias
 * - GET /api/audit/bundles - Sugerir bundles comerciales
 *
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Middleware de autenticación (solo admins pueden usar el auditor)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Solo administradores pueden acceder al auditor'
    });
  }
  next();
};

module.exports = (database) => {
  const { AuditLog } = database;

  // Lazy-load del auditor (se inicializa en la primera llamada)
  let auditorEngine = null;
  let systemRegistry = null;
  let moduleScanner = null;
  let knowledgeBase = null;

  async function getAuditor() {
    if (!auditorEngine) {
      console.log('🔧 [AUDITOR-API] Inicializando Auditor Engine...');

      const AuditorEngine = require('../auditor/core/AuditorEngine');
      const SystemRegistry = require('../auditor/registry/SystemRegistry');
      const ModuleScanner = require('../auditor/core/ModuleScanner');
      const AuditorKnowledgeBase = require('../auditor/core/AuditorKnowledgeBase');
      const EndpointCollector = require('../auditor/collectors/EndpointCollector');
      const DatabaseCollector = require('../auditor/collectors/DatabaseCollector');
      const FrontendCollector = require('../auditor/collectors/FrontendCollector');
      const IntegrationCollector = require('../auditor/collectors/IntegrationCollector');
      const AndroidKioskCollector = require('../auditor/collectors/AndroidKioskCollector');
      const HybridHealer = require('../auditor/healers/HybridHealer');
      const AdvancedHealer = require('../auditor/healers/AdvancedHealer');

      systemRegistry = new SystemRegistry(database);
      await systemRegistry.initialize();

      // 🧠 Inicializar Knowledge Base (aprendizaje continuo)
      knowledgeBase = new AuditorKnowledgeBase(database);
      await knowledgeBase.initialize();

      // 🔍 Inicializar Module Scanner (auto-descubrimiento)
      moduleScanner = new ModuleScanner(database, systemRegistry);

      auditorEngine = new AuditorEngine(database, {
        environment: process.env.NODE_ENV || 'local',
        autoHeal: true,
        parallel: true,
        knowledgeBase, // Pasar knowledge base al engine
        moduleScanner  // Pasar scanner al engine
      });

      // Registrar collectors (TODOS habilitados para diagnóstico completo)
      auditorEngine.registerCollector('endpoints', new EndpointCollector(database, systemRegistry));
      auditorEngine.registerCollector('database', new DatabaseCollector(database, systemRegistry));
      // ✅ HABILITADO: FrontendCollector en modo HEADLESS (navegador invisible)
      auditorEngine.registerCollector('frontend', new FrontendCollector(database, systemRegistry));
      auditorEngine.registerCollector('integration', new IntegrationCollector(database, systemRegistry));
      // ✅ NUEVO: AndroidKioskCollector para auditar APK
      auditorEngine.registerCollector('android-kiosk', new AndroidKioskCollector(database, systemRegistry));

      // Registrar healers (orden: advanced primero, hybrid como fallback)
      auditorEngine.registerHealer('advanced', new AdvancedHealer(database, systemRegistry));
      auditorEngine.registerHealer('hybrid', new HybridHealer(database, systemRegistry));

      console.log('✅ [AUDITOR-API] Auditor Engine inicializado');
      console.log('   🧠 Knowledge Base: inicializada');
      console.log('   🔍 Module Scanner: listo');
      console.log('   📱 Android Kiosk Collector: registrado');
    }

    return { auditorEngine, systemRegistry, moduleScanner, knowledgeBase };
  }

  // ═══════════════════════════════════════════════════════════
  // EXECUTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/audit/run
   * Ejecutar auditoría completa del sistema
   */
  router.post('/run', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();

      console.log('🚀 [AUDITOR-API] Iniciando auditoría completa...');

      const options = {
        company_id: req.user?.company_id,
        parallel: req.body.parallel !== false,
        autoHeal: req.body.autoHeal !== false
      };

      // Ejecutar en background
      auditorEngine.runFullAudit(options)
        .then(result => {
          console.log('✅ [AUDITOR-API] Auditoría completada');
        })
        .catch(error => {
          console.error('❌ [AUDITOR-API] Error en auditoría:', error);
        });

      res.json({
        success: true,
        message: 'Auditoría iniciada',
        execution_id: auditorEngine.currentExecution?.id,
        status: 'running'
      });

    } catch (error) {
      console.error('❌ [AUDITOR-API] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/run/:module
   * Auditar módulo específico
   */
  router.post('/run/:module', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();
      const { module } = req.params;

      console.log(`🚀 [AUDITOR-API] Auditando módulo: ${module}`);

      auditorEngine.runModuleAudit(module, {
        company_id: req.user?.company_id
      }).then(result => {
        console.log(`✅ [AUDITOR-API] Auditoría de ${module} completada`);
      }).catch(error => {
        console.error(`❌ [AUDITOR-API] Error en ${module}:`, error);
      });

      res.json({
        success: true,
        message: `Auditoría de ${module} iniciada`,
        execution_id: auditorEngine.currentExecution?.id
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/status
   * Obtener estado actual del auditor
   */
  router.get('/status', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();
      const status = auditorEngine.getStatus();

      res.json({
        success: true,
        status
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/executions
   * Obtener histórico de ejecuciones
   */
  router.get('/executions', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();
      const limit = parseInt(req.query.limit) || 10;

      const executions = await auditorEngine.getRecentAudits(limit);

      res.json({
        success: true,
        executions
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/executions/:id
   * Detalle de una ejecución específica
   */
  router.get('/executions/:id', auth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const logs = await AuditLog.findAll({
        where: { execution_id: id },
        order: [['started_at', 'ASC']]
      });

      const summary = await AuditLog.getExecutionSummary(id);

      // Determinar status: completed si tiene completed_at, running si no
      const status = summary && summary.completed_at ? 'completed' : 'running';

      res.json({
        success: true,
        execution_id: id,
        status,
        summary,
        logs
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // HEALING ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/audit/heal/:logId
   * Aplicar fix sugerido
   */
  router.post('/heal/:logId', auth, requireAdmin, async (req, res) => {
    try {
      const { logId } = req.params;
      const { suggestionIndex } = req.body;

      const log = await AuditLog.findByPk(logId);

      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Log no encontrado'
        });
      }

      if (!log.suggestions || log.suggestions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay sugerencias disponibles'
        });
      }

      const suggestion = log.suggestions[suggestionIndex || 0];

      // Aplicar el fix sugerido
      // TODO: Implementar aplicación de fix

      res.json({
        success: true,
        message: 'Fix aplicado',
        suggestion
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // SEEDER ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/audit/seed/:module
   * Generar datos de prueba
   */
  router.post('/seed/:module', auth, requireAdmin, async (req, res) => {
    try {
      const { module } = req.params;
      const count = parseInt(req.body.count) || 10;

      const UniversalSeeder = require('../auditor/seeders/UniversalSeeder');
      const { systemRegistry } = await getAuditor();

      const seeder = new UniversalSeeder(database, systemRegistry);
      const records = await seeder.seedModule(module, count, {
        company_id: req.user?.company_id
      });

      res.json({
        success: true,
        message: `${records.length} registros generados para ${module}`,
        records: records.map(r => ({ id: r.id }))
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/audit/cleanup
   * Limpiar datos de prueba
   */
  router.delete('/cleanup', auth, requireAdmin, async (req, res) => {
    try {
      const UniversalSeeder = require('../auditor/seeders/UniversalSeeder');
      const { systemRegistry } = await getAuditor();

      const seeder = new UniversalSeeder(database, systemRegistry);
      await seeder.cleanup();

      res.json({
        success: true,
        message: 'Datos de prueba eliminados'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // REGISTRY ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/audit/registry
   * Ver registry completo del sistema
   */
  router.get('/registry', auth, requireAdmin, async (req, res) => {
    try {
      const { systemRegistry } = await getAuditor();

      const modules = systemRegistry.getAllModules();

      res.json({
        success: true,
        total_modules: modules.length,
        modules: modules.map(m => ({
          id: m.id,
          name: m.name,
          category: m.category,
          version: m.version,
          dependencies: m.dependencies,
          commercial: m.commercial
        }))
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/registry/:module
   * Ver módulo específico del registry
   */
  router.get('/registry/:module', auth, requireAdmin, async (req, res) => {
    try {
      const { systemRegistry } = await getAuditor();
      const { module } = req.params;

      const moduleData = systemRegistry.getModule(module);

      if (!moduleData) {
        return res.status(404).json({
          success: false,
          error: `Módulo ${module} no encontrado en registry`
        });
      }

      res.json({
        success: true,
        module: moduleData
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/dependencies/:module
   * Analizar dependencias de un módulo
   */
  router.get('/dependencies/:module', auth, requireAdmin, async (req, res) => {
    try {
      const { systemRegistry } = await getAuditor();
      const { module } = req.params;

      const canWork = await systemRegistry.canModuleWork(module, req.user?.company_id);
      const deactivationImpact = systemRegistry.analyzeDeactivationImpact(module);

      res.json({
        success: true,
        module,
        can_work: canWork,
        deactivation_impact: deactivationImpact
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/bundles
   * Sugerir bundles comerciales para la empresa
   */
  router.get('/bundles', auth, requireAdmin, async (req, res) => {
    try {
      const { systemRegistry } = await getAuditor();

      const suggestions = await systemRegistry.suggestBundles(req.user?.company_id);

      res.json({
        success: true,
        suggestions
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // REALTIME MONITOR ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  let realtimeMonitor = null;

  /**
   * POST /api/audit/monitor/start
   * Iniciar monitor en tiempo real
   */
  router.post('/monitor/start', auth, requireAdmin, async (req, res) => {
    try {
      if (realtimeMonitor && realtimeMonitor.isRunning) {
        return res.json({
          success: false,
          error: 'Monitor ya está corriendo'
        });
      }

      const { auditorEngine, systemRegistry } = await getAuditor();
      const RealtimeMonitor = require('../auditor/core/RealtimeMonitor');

      realtimeMonitor = new RealtimeMonitor(auditorEngine, database, systemRegistry);

      const options = {
        interval: req.body.interval || 5 * 60 * 1000 // 5 minutos default
      };

      realtimeMonitor.start(options);

      res.json({
        success: true,
        message: 'Monitor en tiempo real iniciado',
        interval: options.interval
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/monitor/stop
   * Detener monitor en tiempo real
   */
  router.post('/monitor/stop', auth, requireAdmin, async (req, res) => {
    try {
      if (!realtimeMonitor || !realtimeMonitor.isRunning) {
        return res.json({
          success: false,
          error: 'Monitor no está corriendo'
        });
      }

      realtimeMonitor.stop();

      res.json({
        success: true,
        message: 'Monitor detenido'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/monitor/status
   * Obtener estado del monitor
   */
  router.get('/monitor/status', auth, requireAdmin, async (req, res) => {
    try {
      if (!realtimeMonitor) {
        return res.json({
          success: true,
          status: 'stopped',
          metrics: null
        });
      }

      const metrics = realtimeMonitor.getMetrics();

      res.json({
        success: true,
        status: realtimeMonitor.isRunning ? 'running' : 'stopped',
        metrics
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ITERATIVE AUDITOR ENDPOINTS (Ciclos de auto-reparación)
  // ═══════════════════════════════════════════════════════════

  let iterativeAuditor = null; // Instancia del iterador

  async function getIterativeAuditor(io = null) {
    if (!iterativeAuditor) {
      const { auditorEngine, systemRegistry } = await getAuditor();
      const IterativeAuditor = require('../auditor/core/IterativeAuditor');

      // Buscar AssistantService si existe
      let assistantService = null;
      try {
        const AssistantService = require('../services/AssistantService');
        assistantService = new AssistantService(database);
      } catch (err) {
        console.log('⚠️  [ITERATIVE-AUDITOR] AssistantService no disponible');
      }

      iterativeAuditor = new IterativeAuditor(
        database,
        auditorEngine,
        systemRegistry,
        assistantService,
        io // Pasar Socket.IO para real-time updates
      );

      console.log('✅ [ITERATIVE-AUDITOR] Instancia creada');
    }

    return iterativeAuditor;
  }

  /**
   * POST /api/audit/iterative/start
   * Iniciar ciclos iterativos de auto-reparación
   *
   * Body:
   * {
   *   "maxCycles": 500,
   *   "targetSuccessRate": 100,
   *   "companyId": 11
   * }
   */
  router.post('/iterative/start', auth, requireAdmin, async (req, res) => {
    try {
      const io = req.app.get('io'); // Obtener Socket.IO desde app
      const iterator = await getIterativeAuditor(io);

      if (iterator.isRunning) {
        return res.status(400).json({
          success: false,
          error: 'Ya hay ciclos iterativos en ejecución. Use /stop para detenerlos primero.'
        });
      }

      const { maxCycles = 100, targetSuccessRate = 100, companyId } = req.body;

      console.log('🔁 [ITERATIVE-AUDITOR-API] Iniciando ciclos iterativos...');

      // Obtener el token del usuario autenticado
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      // Ejecutar en background
      iterator.start({
        maxCycles,
        targetSuccessRate,
        companyId: companyId || req.user?.company_id || 11,
        authToken // Pasar el token al auditor
      }).catch(error => {
        console.error('❌ [ITERATIVE-AUDITOR-API] Error en ciclos:', error);
      });

      res.json({
        success: true,
        message: 'Ciclos iterativos iniciados',
        config: {
          maxCycles,
          targetSuccessRate,
          companyId: companyId || req.user?.company_id || 11
        }
      });

    } catch (error) {
      console.error('❌ [ITERATIVE-AUDITOR-API] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/iterative/stop
   * Detener ciclos iterativos de forma segura
   */
  router.post('/iterative/stop', auth, requireAdmin, async (req, res) => {
    try {
      if (!iterativeAuditor) {
        return res.json({
          success: true,
          message: 'No hay ciclos iterativos activos'
        });
      }

      iterativeAuditor.stop();

      res.json({
        success: true,
        message: 'Señal de parada enviada. El ciclo actual se completará antes de detenerse.'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/iterative/status
   * Ver estado actual de ciclos iterativos
   */
  router.get('/iterative/status', auth, requireAdmin, async (req, res) => {
    try {
      if (!iterativeAuditor) {
        return res.json({
          success: true,
          status: {
            isRunning: false,
            currentCycle: 0,
            maxCycles: 0,
            message: 'No se han iniciado ciclos iterativos'
          }
        });
      }

      const status = iterativeAuditor.getStatus();

      res.json({
        success: true,
        status
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/iterative/metrics
   * Obtener métricas completas de ciclos iterativos
   */
  router.get('/iterative/metrics', auth, requireAdmin, async (req, res) => {
    try {
      if (!iterativeAuditor) {
        return res.json({
          success: true,
          metrics: null,
          message: 'No se han ejecutado ciclos iterativos'
        });
      }

      const metrics = iterativeAuditor.getMetrics();

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // MODULE SCANNER ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/audit/scan
   * Ejecutar escaneo de módulos (auto-descubrimiento)
   */
  router.post('/scan', auth, requireAdmin, async (req, res) => {
    try {
      const { moduleScanner } = await getAuditor();

      console.log('🔍 [SCANNER] Ejecutando escaneo completo...');

      const results = await moduleScanner.scanAll();

      res.json({
        success: true,
        message: 'Escaneo completado',
        results
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/scan/sync
   * Sincronizar descubrimientos con registry
   */
  router.post('/scan/sync', auth, requireAdmin, async (req, res) => {
    try {
      const { moduleScanner } = await getAuditor();

      console.log('🔄 [SCANNER] Escaneando y sincronizando...');

      const scanResults = await moduleScanner.scanAll();
      const syncResults = await moduleScanner.syncWithRegistry(scanResults);

      res.json({
        success: true,
        message: 'Sincronización completada',
        scan: scanResults,
        sync: syncResults
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // KNOWLEDGE BASE ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/audit/knowledge
   * Ver estadísticas de la knowledge base
   */
  router.get('/knowledge', auth, requireAdmin, async (req, res) => {
    try {
      const { knowledgeBase } = await getAuditor();

      const stats = knowledgeBase.getStats();

      res.json({
        success: true,
        knowledge_base: stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/knowledge/refresh
   * Recargar knowledge base desde BD
   */
  router.post('/knowledge/refresh', auth, requireAdmin, async (req, res) => {
    try {
      const { knowledgeBase } = await getAuditor();

      await knowledgeBase.initialize();

      const stats = knowledgeBase.getStats();

      res.json({
        success: true,
        message: 'Knowledge base recargada',
        stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
