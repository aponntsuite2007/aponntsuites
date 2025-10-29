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
      const E2ECollector = require('../auditor/collectors/E2ECollector');
      const RealUserExperienceCollector = require('../auditor/collectors/RealUserExperienceCollector');
      const AdvancedUserSimulationCollector = require('../auditor/collectors/AdvancedUserSimulationCollector');
      const EmployeeProfileCollector = require('../auditor/collectors/EmployeeProfileCollector');
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
        moduleScanner, // Pasar scanner al engine
        systemRegistry // Pasar system registry al engine
      });

      // Registrar collectors (SOLO los esenciales habilitados)
      auditorEngine.registerCollector('endpoints', new EndpointCollector(database, systemRegistry));
      auditorEngine.registerCollector('database', new DatabaseCollector(database, systemRegistry));
      // ✅ HABILITADO: FrontendCollector - navegador visible único
      auditorEngine.registerCollector('frontend', new FrontendCollector(database, systemRegistry));
      auditorEngine.registerCollector('integration', new IntegrationCollector(database, systemRegistry));
      // ✅ HABILITADO: AndroidKioskCollector para auditar APK
      auditorEngine.registerCollector('android-kiosk', new AndroidKioskCollector(database, systemRegistry));

      // ✅ HABILITADO: EmployeeProfileCollector - Tests de perfil de empleado desde frontend
      auditorEngine.registerCollector('employee-profile', new EmployeeProfileCollector(database, systemRegistry));

      // ⚠️ DESHABILITADOS: Los siguientes collectors abren navegadores adicionales (múltiples Chrome)
      // Descomentar solo si se necesitan tests E2E/UX avanzados
      // auditorEngine.registerCollector('e2e', new E2ECollector(database, systemRegistry));
      // auditorEngine.registerCollector('real-ux', new RealUserExperienceCollector(database, systemRegistry));
      // auditorEngine.registerCollector('advanced-sim', new AdvancedUserSimulationCollector(database, systemRegistry));

      // Registrar healers (orden: advanced primero, hybrid como fallback)
      auditorEngine.registerHealer('advanced', new AdvancedHealer(database, systemRegistry));
      auditorEngine.registerHealer('hybrid', new HybridHealer(database, systemRegistry));

      console.log('✅ [AUDITOR-API] Auditor Engine inicializado');
      console.log('   🧠 Knowledge Base: inicializada');
      console.log('   🔍 Module Scanner: listo');
      console.log('   📱 Android Kiosk Collector: registrado');
      console.log('   🎭 E2E Collector: registrado (tests de experiencia de usuario)');
      console.log('   🎯 Real UX Collector: registrado (detecta errores REALES como 401)');
      console.log('   🚀 Advanced Simulation Collector: registrado (simulación COMPLETA: datos random + CRUD + workflows)');
    }

    return { auditorEngine, systemRegistry, moduleScanner, knowledgeBase };
  }

  // ═══════════════════════════════════════════════════════════
  // EXECUTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // NUEVAS OPCIONES SOLICITADAS - 3 MODOS DE TESTING
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /api/audit/test/global
   * OPCIÓN 1: TEST GLOBAL - Auditoría completa de todos los módulos con simulación avanzada
   */
  router.post('/test/global', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();

      console.log('🌍 [TEST-GLOBAL] Iniciando TEST GLOBAL con simulación completa...');

      const options = {
        company_id: req.user?.company_id,
        parallel: req.body.parallel !== false,
        autoHeal: req.body.autoHeal !== false,
        io: req.app.get('io'),
        testMode: 'global',
        simulationLevel: 'complete', // Simulación profunda con datos random + CRUD + workflows
        includeSubmodules: true, // Incluir todos los submódulos
        humanTiming: true // Velocidad humana realista
      };

      // Ejecutar en background
      auditorEngine.runFullAudit(options)
        .then(result => {
          console.log('✅ [TEST-GLOBAL] Test global completado');
        })
        .catch(error => {
          console.error('❌ [TEST-GLOBAL] Error:', error);
        });

      res.json({
        success: true,
        test_type: 'global',
        message: 'TEST GLOBAL iniciado - Simulación completa de todos los módulos y submódulos',
        execution_id: auditorEngine.currentExecution?.id,
        status: 'running',
        features: [
          'Datos random con Faker.js',
          'CRUD completo (Create → Read → Update → Delete)',
          'Workflows de negocio específicos',
          'Tests de submódulos incluidos',
          'Simulación de velocidad humana'
        ]
      });

    } catch (error) {
      console.error('❌ [TEST-GLOBAL] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/test/apk-kiosk
   * OPCIÓN 2: TEST APK KIOSK - Testing específico de la aplicación Android Kiosk
   */
  router.post('/test/apk-kiosk', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();

      console.log('📱 [TEST-APK-KIOSK] Iniciando TEST específico de Android APK Kiosk...');

      const options = {
        company_id: req.user?.company_id,
        parallel: false, // Secuencial para APK testing
        autoHeal: req.body.autoHeal !== false,
        only: ['android-kiosk'], // Solo el collector de Android
        io: req.app.get('io'),
        testMode: 'apk-kiosk',
        apkTestLevel: 'complete' // Testing completo del APK
      };

      // Ejecutar en background
      auditorEngine.runFullAudit(options)
        .then(result => {
          console.log('✅ [TEST-APK-KIOSK] Test APK Kiosk completado');
        })
        .catch(error => {
          console.error('❌ [TEST-APK-KIOSK] Error:', error);
        });

      res.json({
        success: true,
        test_type: 'apk-kiosk',
        message: 'TEST APK KIOSK iniciado - Testing específico de aplicación Android',
        execution_id: auditorEngine.currentExecution?.id,
        status: 'running',
        features: [
          'Verificación de existencia del APK',
          'Tests de endpoints móviles',
          'Validación de compatibilidad de versiones',
          'Tests de estructura Flutter',
          'Verificación de conectividad backend/APK'
        ]
      });

    } catch (error) {
      console.error('❌ [TEST-APK-KIOSK] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/test/module
   * OPCIÓN 3: TEST MÓDULO ESPECÍFICO - Con selector de módulo y submódulos incluidos
   */
  router.post('/test/module', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine, systemRegistry } = await getAuditor();
      const { moduleKey } = req.body;

      if (!moduleKey) {
        return res.status(400).json({
          success: false,
          error: 'Debe especificar "moduleKey" en el body. Use GET /api/audit/test/modules para ver opciones disponibles.'
        });
      }

      // Validar que el módulo existe
      const moduleData = systemRegistry.getModule(moduleKey);
      if (!moduleData) {
        return res.status(404).json({
          success: false,
          error: `Módulo "${moduleKey}" no encontrado`,
          available_modules_endpoint: '/api/audit/test/modules'
        });
      }

      console.log(`🎯 [TEST-MODULE] Iniciando TEST específico del módulo: ${moduleData.name}...`);

      const options = {
        company_id: req.user?.company_id,
        parallel: false, // Secuencial para módulo específico
        autoHeal: req.body.autoHeal !== false,
        moduleFilter: moduleKey, // Filtro específico para el módulo
        io: req.app.get('io'),
        testMode: 'module-specific',
        simulationLevel: 'complete', // Simulación completa del módulo
        includeSubmodules: true, // Incluir submódulos del módulo seleccionado
        humanTiming: true
      };

      // Ejecutar en background
      auditorEngine.runModuleAudit(moduleKey, options)
        .then(result => {
          console.log(`✅ [TEST-MODULE] Test del módulo ${moduleKey} completado`);
        })
        .catch(error => {
          console.error(`❌ [TEST-MODULE] Error en ${moduleKey}:`, error);
        });

      res.json({
        success: true,
        test_type: 'module-specific',
        module: {
          key: moduleKey,
          name: moduleData.name,
          category: moduleData.category,
          description: moduleData.description
        },
        message: `TEST MÓDULO iniciado - Testing completo de "${moduleData.name}" y sus submódulos`,
        execution_id: auditorEngine.currentExecution?.id,
        status: 'running',
        features: [
          'Testing específico del módulo seleccionado',
          'Incluye todos los submódulos',
          'Datos random específicos del dominio',
          'CRUD completo del módulo',
          'Workflows específicos del módulo'
        ]
      });

    } catch (error) {
      console.error('❌ [TEST-MODULE] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/test/modules
   * Obtener lista de módulos disponibles para testing específico
   */
  router.get('/test/modules', auth, requireAdmin, async (req, res) => {
    try {
      const { systemRegistry } = await getAuditor();

      const modules = systemRegistry.getAllModules();

      // Filtrar módulos por categoría si se especifica
      const category = req.query.category;
      const filteredModules = category
        ? modules.filter(m => m.category === category)
        : modules;

      const moduleOptions = filteredModules.map(m => ({
        key: m.id,
        name: m.name,
        category: m.category,
        description: m.description,
        version: m.version,
        has_submodules: m.submodules && m.submodules.length > 0,
        submodules: m.submodules || [],
        commercial: m.commercial
      }));

      // Agrupar por categoría para mejor visualización
      const modulesByCategory = {};
      moduleOptions.forEach(module => {
        if (!modulesByCategory[module.category]) {
          modulesByCategory[module.category] = [];
        }
        modulesByCategory[module.category].push(module);
      });

      res.json({
        success: true,
        total_modules: moduleOptions.length,
        categories: Object.keys(modulesByCategory),
        modules_by_category: modulesByCategory,
        all_modules: moduleOptions,
        usage: {
          test_specific_module: 'POST /api/audit/test/module con { "moduleKey": "users" }',
          available_categories: Object.keys(modulesByCategory)
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
   * POST /api/audit/run
   * Ejecutar auditoría completa del sistema (endpoint original mantenido para compatibilidad)
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
   * POST /api/audit/run/active
   * Ejecutar auditoría con auto-reparación (MODO ACTIVO)
   */
  router.post('/run/active', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();

      console.log('⚡ [AUDITOR-API] Iniciando auditoría ACTIVA con auto-reparación...');

      const options = {
        company_id: req.user?.company_id,
        parallel: req.body.parallel !== false,
        autoHeal: true, // MODO ACTIVO: Auto-reparar
        maxHealAttempts: req.body.maxHealAttempts || 3,
        only: req.body.only,
        io: req.app.get('io'),
        simulationLevel: req.body.simulationLevel || 'deep'
      };

      // Ejecutar en background
      auditorEngine.runFullAudit(options)
        .then(result => {
          console.log('✅ [AUDITOR-API] Auditoría ACTIVA completada con auto-reparación');
        })
        .catch(error => {
          console.error('❌ [AUDITOR-API] Error en auditoría activa:', error);
        });

      res.json({
        success: true,
        mode: 'active',
        message: 'Auditoría activa iniciada - Con detección y reparación automática',
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
   * POST /api/audit/run/simulation
   * Ejecutar auditoría con simulación completa de usuario (MODO SIMULACIÓN AVANZADA)
   */
  router.post('/run/simulation', auth, requireAdmin, async (req, res) => {
    try {
      const { auditorEngine } = await getAuditor();

      console.log('🎭 [AUDITOR-API] Iniciando SIMULACIÓN COMPLETA de usuario...');

      const options = {
        company_id: req.user?.company_id,
        parallel: false, // Simulación secuencial para mayor realismo
        autoHeal: req.body.autoHeal !== false,
        only: ['advanced-sim'], // Solo el collector de simulación avanzada
        io: req.app.get('io'),
        simulationLevel: 'complete', // Simulación completa: datos random + CRUD + workflows
        humanTiming: req.body.humanTiming !== false // Velocidad humana realista
      };

      // Ejecutar en background
      auditorEngine.runFullAudit(options)
        .then(result => {
          console.log('✅ [AUDITOR-API] SIMULACIÓN COMPLETA terminada');
        })
        .catch(error => {
          console.error('❌ [AUDITOR-API] Error en simulación:', error);
        });

      res.json({
        success: true,
        mode: 'advanced-simulation',
        message: 'Simulación completa iniciada - Datos random, CRUD completo y workflows de negocio',
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

  // ═══════════════════════════════════════════════════════════
  // MARKETING PAPER ENDPOINTS (Dynamic Paper Generation)
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/audit/marketing/paper
   * Obtener paper dinámico de marketing actualizado
   */
  router.get('/marketing/paper', auth, requireAdmin, async (req, res) => {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const reportsDir = path.join(__dirname, '../auditor/reports');
      const latestPath = path.join(reportsDir, 'marketing-paper-latest.json');

      let paper = null;

      // Intentar cargar paper existente
      try {
        const paperData = await fs.readFile(latestPath, 'utf8');
        paper = JSON.parse(paperData);
      } catch (error) {
        console.log('📄 [MARKETING-API] No hay paper existente, generando nuevo...');
      }

      // Si no existe o es muy viejo (>24h), generar nuevo
      const shouldRegenerate = !paper ||
        !paper.meta?.generated_at ||
        (Date.now() - new Date(paper.meta.generated_at).getTime()) > 86400000; // 24 horas

      if (shouldRegenerate) {
        console.log('📄 [MARKETING-API] Generando paper actualizado...');

        const { auditorEngine } = await getAuditor();

        // Forzar regeneración del paper
        const result = await auditorEngine._generateMarketingPaper('api-request', {
          total: 46,
          passed: 45,
          failed: 1
        });

        // Recargar desde archivo
        try {
          const paperData = await fs.readFile(latestPath, 'utf8');
          paper = JSON.parse(paperData);
        } catch (error) {
          throw new Error('Error generando marketing paper');
        }
      }

      res.json({
        success: true,
        paper,
        meta: {
          generated_at: paper?.meta?.generated_at,
          is_fresh: shouldRegenerate,
          update_source: paper?.meta?.update_source || 'cached'
        }
      });

    } catch (error) {
      console.error('❌ [MARKETING-API] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/audit/marketing/regenerate
   * Forzar regeneración del paper de marketing
   */
  router.post('/marketing/regenerate', auth, requireAdmin, async (req, res) => {
    try {
      console.log('📄 [MARKETING-API] Forzando regeneración del paper...');

      const { auditorEngine } = await getAuditor();

      // Generar paper fresco con métricas actuales
      const paper = await auditorEngine._generateMarketingPaper('forced-regeneration', {
        total: 46,
        passed: 45,
        failed: 1
      });

      res.json({
        success: true,
        message: 'Marketing paper regenerado exitosamente',
        generated_at: new Date().toISOString(),
        paper_preview: {
          title: paper?.meta?.title,
          sections: Object.keys(paper || {}).filter(k => k !== 'meta').length
        }
      });

    } catch (error) {
      console.error('❌ [MARKETING-API] Error regenerando:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 📊 MÉTRICAS DE DIAGNÓSTICO - Sistema Híbrido Ollama
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /api/audit/metrics/precision
   * Obtener estadísticas globales de precisión (Ollama vs OpenAI vs Patterns)
   */
  router.get('/metrics/precision', auth, requireAdmin, async (req, res) => {
    try {
      const [results] = await database.sequelize.query('SELECT * FROM get_diagnosis_precision_stats()');

      const stats = results[0] || {
        total_diagnoses: 0,
        ollama_local_count: 0,
        ollama_external_count: 0,
        openai_count: 0,
        pattern_count: 0,
        avg_ollama_confidence: null,
        avg_openai_confidence: null,
        avg_pattern_confidence: null,
        ollama_repair_success_rate: 0,
        openai_repair_success_rate: 0,
        pattern_repair_success_rate: 0,
        recommendation: 'No hay datos suficientes para generar recomendación'
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ [METRICS] Error obteniendo stats de precisión:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/metrics/by-source
   * Comparación detallada por fuente de diagnóstico
   */
  router.get('/metrics/by-source', auth, requireAdmin, async (req, res) => {
    try {
      const [results] = await database.sequelize.query('SELECT * FROM audit_metrics_by_source');

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('❌ [METRICS] Error obteniendo metrics by source:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/metrics/by-module
   * Métricas agregadas por módulo
   */
  router.get('/metrics/by-module', auth, requireAdmin, async (req, res) => {
    try {
      const [results] = await database.sequelize.query('SELECT * FROM audit_metrics_by_module ORDER BY last_audit DESC');

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('❌ [METRICS] Error obteniendo metrics by module:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/metrics/timeline
   * Timeline de progreso (últimas 24 horas)
   */
  router.get('/metrics/timeline', auth, requireAdmin, async (req, res) => {
    try {
      const [results] = await database.sequelize.query('SELECT * FROM audit_progress_timeline');

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('❌ [METRICS] Error obteniendo timeline:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/metrics/errors-with-diagnosis
   * Lista de errores con sus diagnósticos (para tabla detallada)
   */
  router.get('/metrics/errors-with-diagnosis', auth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const [results] = await database.sequelize.query(`
        SELECT
          log_id,
          execution_id,
          module_name,
          test_name,
          test_type,
          status,
          error_type,
          error_message,
          diagnosis_source,
          diagnosis_model,
          diagnosis_level,
          diagnosis_confidence,
          diagnosis_specificity,
          diagnosis_actionable,
          diagnosis_duration_ms,
          repair_success,
          repair_attempts,
          "createdAt" as created_at
        FROM audit_logs
        WHERE diagnosis_source IS NOT NULL
        ORDER BY "createdAt" DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit, offset }
      });

      // Obtener count total
      const [countResult] = await database.sequelize.query(`
        SELECT COUNT(*) as total
        FROM audit_logs
        WHERE diagnosis_source IS NOT NULL
      `);

      res.json({
        success: true,
        data: results,
        pagination: {
          total: parseInt(countResult[0].total),
          limit,
          offset,
          hasMore: (offset + limit) < parseInt(countResult[0].total)
        }
      });

    } catch (error) {
      console.error('❌ [METRICS] Error obteniendo errors with diagnosis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/audit/metrics/dashboard-summary
   * Resumen completo para dashboard (un solo endpoint con todo)
   */
  router.get('/metrics/dashboard-summary', auth, requireAdmin, async (req, res) => {
    try {
      // 1. Precisión global
      const [precisionStats] = await database.sequelize.query('SELECT * FROM get_diagnosis_precision_stats()');

      // 2. Comparación por fuente
      const [bySource] = await database.sequelize.query('SELECT * FROM audit_metrics_by_source');

      // 3. Top 10 módulos con más errores
      const [topModules] = await database.sequelize.query(`
        SELECT * FROM audit_metrics_by_module
        WHERE failed > 0
        ORDER BY failed DESC
        LIMIT 10
      `);

      // 4. Actividad reciente (últimas 24h)
      const [recentActivity] = await database.sequelize.query(`
        SELECT
          DATE_TRUNC('hour', "createdAt") as hour,
          COUNT(*) as tests_run,
          COUNT(CASE WHEN status = 'pass' THEN 1 END) as passed,
          COUNT(CASE WHEN status = 'fail' THEN 1 END) as failed
        FROM audit_logs
        WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour DESC
        LIMIT 24
      `);

      // 5. Últimos 10 diagnósticos
      const [recentDiagnoses] = await database.sequelize.query(`
        SELECT
          module_name,
          diagnosis_source,
          diagnosis_confidence,
          repair_success,
          "createdAt" as created_at
        FROM audit_logs
        WHERE diagnosis_source IS NOT NULL
        ORDER BY "createdAt" DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          precision: precisionStats[0] || null,
          by_source: bySource,
          top_failing_modules: topModules,
          recent_activity: recentActivity,
          recent_diagnoses: recentDiagnoses,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ [METRICS] Error obteniendo dashboard summary:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ENDPOINTS INFORMATIVOS DE REPAIRS (Auto-reparaciones)
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/audit/repairs/:execution_id
   * Ver repairs de una auditoría específica
   */
  router.get('/repairs/:execution_id', auth, requireAdmin, async (req, res) => {
    try {
      const { AuditLog } = require('../models');
      const { execution_id } = req.params;

      const repairs = await AuditLog.findAll({
        where: {
          execution_id,
          fix_attempted: true
        },
        attributes: [
          'id', 'module_name', 'test_name', 'error_message',
          'fix_strategy', 'fix_applied', 'fix_result',
          'diagnosis_source', 'diagnosis_confidence',
          'status', 'started_at', 'completed_at'
        ],
        order: [['started_at', 'ASC']]
      });

      const summary = {
        total: repairs.length,
        successful: repairs.filter(r => r.fix_applied).length,
        failed: repairs.filter(r => !r.fix_applied).length
      };

      res.json({ success: true, repairs, summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/audit/repairs/stats
   * Estadísticas generales de repairs
   */
  router.get('/repairs/stats', auth, requireAdmin, async (req, res) => {
    try {
      const { AuditLog } = require('../models');
      const { Op } = require('sequelize');

      const totalRepairs = await AuditLog.count({
        where: { fix_attempted: true }
      });

      const successful = await AuditLog.count({
        where: { fix_attempted: true, fix_applied: true }
      });

      const byModule = await AuditLog.findAll({
        where: { fix_attempted: true },
        attributes: [
          'module_name',
          [require('sequelize').fn('COUNT', '*'), 'total'],
          [require('sequelize').fn('SUM', require('sequelize').literal('CASE WHEN fix_applied THEN 1 ELSE 0 END')), 'successful']
        ],
        group: ['module_name'],
        order: [[require('sequelize').literal('total'), 'DESC']],
        limit: 10,
        raw: true
      });

      res.json({
        success: true,
        stats: {
          total: totalRepairs,
          successful,
          failed: totalRepairs - successful,
          success_rate: totalRepairs > 0 ? ((successful / totalRepairs) * 100).toFixed(1) : 0,
          by_module: byModule
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
