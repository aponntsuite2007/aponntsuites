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

  async function getAuditor() {
    if (!auditorEngine) {
      console.log('🔧 [AUDITOR-API] Inicializando Auditor Engine...');

      const AuditorEngine = require('../auditor/core/AuditorEngine');
      const SystemRegistry = require('../auditor/registry/SystemRegistry');
      const EndpointCollector = require('../auditor/collectors/EndpointCollector');
      const DatabaseCollector = require('../auditor/collectors/DatabaseCollector');
      const HybridHealer = require('../auditor/healers/HybridHealer');

      systemRegistry = new SystemRegistry(database);
      await systemRegistry.initialize();

      auditorEngine = new AuditorEngine(database, {
        environment: process.env.NODE_ENV || 'local',
        autoHeal: true,
        parallel: true
      });

      // Registrar collectors
      auditorEngine.registerCollector('endpoints', new EndpointCollector(database, systemRegistry));
      auditorEngine.registerCollector('database', new DatabaseCollector(database, systemRegistry));

      // Registrar healers
      auditorEngine.registerHealer('hybrid', new HybridHealer(database, systemRegistry));

      console.log('✅ [AUDITOR-API] Auditor Engine inicializado');
    }

    return { auditorEngine, systemRegistry };
  }

  // ═══════════════════════════════════════════════════════════
  // EXECUTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/audit/run
   * Ejecutar auditoría completa del sistema
   */
  router.post('/run', requireAdmin, async (req, res) => {
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
  router.post('/run/:module', requireAdmin, async (req, res) => {
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
  router.get('/status', requireAdmin, async (req, res) => {
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
  router.get('/executions', requireAdmin, async (req, res) => {
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
  router.get('/executions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const logs = await AuditLog.findAll({
        where: { execution_id: id },
        order: [['started_at', 'ASC']]
      });

      const summary = await AuditLog.getExecutionSummary(id);

      res.json({
        success: true,
        execution_id: id,
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
  router.post('/heal/:logId', requireAdmin, async (req, res) => {
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
  router.post('/seed/:module', requireAdmin, async (req, res) => {
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
  router.delete('/cleanup', requireAdmin, async (req, res) => {
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
  router.get('/registry', requireAdmin, async (req, res) => {
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
  router.get('/registry/:module', requireAdmin, async (req, res) => {
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
  router.get('/dependencies/:module', requireAdmin, async (req, res) => {
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
  router.get('/bundles', requireAdmin, async (req, res) => {
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

  return router;
};
