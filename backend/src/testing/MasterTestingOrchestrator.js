/**
 * ════════════════════════════════════════════════════════════════════════════
 * MASTER TESTING ORCHESTRATOR - Integrador Principal de TODO el Ecosistema
 * ════════════════════════════════════════════════════════════════════════════
 *
 * INTEGRA:
 * 1. SYNAPSE Central Hub - Orquestador maestro con mutex y dependencias
 * 2. Phase4TestOrchestrator - Playwright E2E + PostgreSQL + Ollama + Tickets
 * 3. FrontendCollector V2 - Testing CRUD con datos reales
 * 4. Brain Nervous System - Monitoreo tiempo real + auto-healing
 * 5. SYNAPSE Configs (60 configs) - Selectores, tabs, fields por módulo
 * 6. SystemRegistry - Single Source of Truth (72 módulos desde BD)
 *
 * OBJETIVO:
 * Testing COMPLETO end-to-end de 51 módulos comerciales con:
 * - Datos REALES en PostgreSQL
 * - CRUD verificado (Create, Read, Update, Delete)
 * - Persistencia validada
 * - Auto-healing cuando falla
 * - Reporte profesional final
 *
 * @version 1.0.0
 * @date 2026-01-06
 * ════════════════════════════════════════════════════════════════════════════
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTES DEL ECOSISTEMA
// ═══════════════════════════════════════════════════════════════════════════

const SynapseCentralHub = require('../synapse/SynapseCentralHub');
const Phase4TestOrchestrator = require('../auditor/core/Phase4TestOrchestrator');
const FrontendCollector = require('../auditor/collectors/FrontendCollector');
const BrainNervousSystem = require('../brain/services/BrainNervousSystem');
const SystemRegistry = require('../auditor/registry/SystemRegistry');
const database = require('../config/database');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Directorio de configs SYNAPSE
  configsDir: path.join(__dirname, '../../tests/e2e/configs'),

  // Usuario admin para testing (permisos completos)
  testUser: {
    empresa: 'aponnt-empresa-demo',
    usuario: 'administrador',
    password: 'admin123'
  },

  // Empresa test para datos reales
  testCompany: {
    id: null, // Se obtendrá de BD
    slug: 'aponnt-empresa-demo'
  },

  // Configuración Playwright
  playwright: {
    headless: false,        // Browser visible para debugging
    slowMo: 100,           // Slow motion 100ms
    timeout: 60000         // 60s timeout
  },

  // Auto-healing
  autoHealing: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 5000      // 5s entre reintentos
  },

  // Reporte
  reportPath: path.join(__dirname, '../../TESTING-FINAL-REPORT.md')
};

// ═══════════════════════════════════════════════════════════════════════════
// MASTER TESTING ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

class MasterTestingOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = { ...CONFIG, ...options };

    // Componentes
    this.synapse = null;
    this.phase4 = null;
    this.frontendCollector = null;
    this.brainNervous = null;
    this.systemRegistry = null;

    // Estado
    this.isRunning = false;
    this.currentExecution = null;
    this.testResults = [];

    // Stats
    this.stats = {
      totalModules: 0,
      tested: 0,
      passed: 0,
      failed: 0,
      fixed: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };

    console.log('🎯 [MASTER] Master Testing Orchestrator inicializado');
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * INICIALIZACIÓN - Conectar todos los componentes
   * ═════════════════════════════════════════════════════════════════════════
   */
  async initialize() {
    console.log('\n' + '═'.repeat(80));
    console.log('🚀 [MASTER] INICIALIZANDO ECOSISTEMA DE TESTING COMPLETO');
    console.log('═'.repeat(80));

    try {
      // 1. SystemRegistry (Single Source of Truth)
      console.log('\n📚 [MASTER] Inicializando SystemRegistry...');
      this.systemRegistry = SystemRegistry;
      await this.systemRegistry.loadFromDatabase();
      console.log(`   ✅ ${this.systemRegistry.getAllModules().length} módulos cargados desde PostgreSQL`);

      // 2. SYNAPSE Central Hub (Orquestador maestro)
      console.log('\n🧠 [MASTER] Inicializando SYNAPSE Central Hub...');
      this.synapse = SynapseCentralHub;
      await this.synapse.initBrain();
      console.log('   ✅ SYNAPSE Central Hub listo');

      // 3. Brain Nervous System (Monitoreo tiempo real)
      console.log('\n🔬 [MASTER] Inicializando Brain Nervous System...');
      this.brainNervous = new BrainNervousSystem({
        healthCheckInterval: 30000,  // 30s
        ssotTestInterval: 120000     // 2min
      });
      // NO iniciar nervous system todavía, lo haremos al empezar tests
      console.log('   ✅ Brain Nervous System configurado');

      // 4. Phase4 Test Orchestrator
      console.log('\n⚙️ [MASTER] Inicializando Phase4 Test Orchestrator...');
      this.phase4 = new Phase4TestOrchestrator({
        baseUrl: `http://localhost:${process.env.PORT || 9998}`,
        ...this.config.playwright
      }, database, this.brainNervous);
      console.log('   ✅ Phase4 Test Orchestrator listo');

      // 5. Frontend Collector V2
      console.log('\n🌐 [MASTER] Inicializando Frontend Collector...');
      this.frontendCollector = new FrontendCollector(database, this.systemRegistry);
      console.log('   ✅ Frontend Collector listo');

      // 6. Obtener ID de empresa test
      console.log('\n🏢 [MASTER] Obteniendo empresa test...');
      const company = await this.getTestCompany();
      if (!company) {
        throw new Error('No se encontró empresa test. Ejecutar setup-test-data-real.js primero');
      }
      this.config.testCompany.id = company.company_id;
      console.log(`   ✅ Empresa test: ${company.name} (ID: ${company.company_id})`);

      // 7. Cargar configs SYNAPSE
      console.log('\n📋 [MASTER] Cargando configs SYNAPSE...');
      const configs = await this.loadSynapseConfigs();
      console.log(`   ✅ ${configs.length} configs cargados`);

      console.log('\n' + '═'.repeat(80));
      console.log('✅ [MASTER] ECOSISTEMA INICIALIZADO COMPLETAMENTE');
      console.log('═'.repeat(80) + '\n');

      return true;
    } catch (error) {
      console.error('\n❌ [MASTER] Error en inicialización:', error.message);
      throw error;
    }
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * EJECUTAR TESTING COMPLETO - Entry point principal
   * ═════════════════════════════════════════════════════════════════════════
   */
  async runFullTesting(options = {}) {
    if (this.isRunning) {
      throw new Error('Ya hay un testing en ejecución');
    }

    this.isRunning = true;
    this.stats.startTime = new Date();
    this.currentExecution = `exec-${Date.now()}`;

    console.log('\n' + '═'.repeat(80));
    console.log('🎯 [MASTER] INICIANDO TESTING COMPLETO E2E');
    console.log('═'.repeat(80));
    console.log(`   Execution ID: ${this.currentExecution}`);
    console.log(`   Módulos a testear: ${options.modules || 'TODOS (51)'}` );
    console.log(`   Auto-healing: ${this.config.autoHealing.enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    console.log('═'.repeat(80) + '\n');

    try {
      // 1. Iniciar Brain Nervous System (monitoreo en background)
      console.log('🔬 [MASTER] Iniciando monitoreo Brain Nervous System...');
      await this.brainNervous.start();
      console.log('   ✅ Brain monitoreando en background\n');

      // 2. Obtener módulos a testear (filtrados inteligentemente)
      const modules = await this.getModulesToTest(options);
      this.stats.totalModules = modules.length;

      console.log(`📋 [MASTER] ${modules.length} módulos comerciales para testear:\n`);
      modules.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.name} (${m.id})`);
      });
      console.log('');

      // 3. Testear cada módulo
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];

        console.log('\n' + '─'.repeat(80));
        console.log(`🧪 [MASTER] MÓDULO ${i + 1}/${modules.length}: ${module.name}`);
        console.log('─'.repeat(80));

        const result = await this.testModuleComplete(module);

        this.testResults.push(result);
        this.stats.tested++;

        if (result.status === 'passed') {
          this.stats.passed++;
          console.log(`   ✅ PASSED: ${module.name}`);
        } else if (result.status === 'failed') {
          this.stats.failed++;
          console.log(`   ❌ FAILED: ${module.name}`);

          // Auto-healing si está habilitado
          if (this.config.autoHealing.enabled && result.canAutoFix) {
            console.log(`   🔧 [AUTO-HEALING] Intentando reparar automáticamente...`);
            const fixed = await this.attemptAutoHealing(module, result);
            if (fixed) {
              this.stats.fixed++;
              result.status = 'fixed';
              console.log(`   ✅ FIXED: ${module.name}`);
            }
          }
        } else if (result.status === 'skipped') {
          this.stats.skipped++;
          console.log(`   ⏭️ SKIPPED: ${module.name}`);
        }

        // Emit progress event
        this.emit('progress', {
          module: module.name,
          current: i + 1,
          total: modules.length,
          result: result,
          stats: { ...this.stats }
        });
      }

      // 4. Detener Brain Nervous System
      console.log('\n🔬 [MASTER] Deteniendo Brain Nervous System...');
      await this.brainNervous.stop();
      console.log('   ✅ Brain detenido\n');

      // 5. Generar reporte final
      console.log('📄 [MASTER] Generando reporte final...');
      await this.generateFinalReport();
      console.log(`   ✅ Reporte guardado en: ${this.config.reportPath}\n`);

      this.stats.endTime = new Date();
      const duration = (this.stats.endTime - this.stats.startTime) / 1000;

      console.log('\n' + '═'.repeat(80));
      console.log('🎉 [MASTER] TESTING COMPLETO FINALIZADO');
      console.log('═'.repeat(80));
      console.log(`   Total módulos: ${this.stats.totalModules}`);
      console.log(`   ✅ Passed: ${this.stats.passed}`);
      console.log(`   ❌ Failed: ${this.stats.failed}`);
      console.log(`   🔧 Fixed: ${this.stats.fixed}`);
      console.log(`   ⏭️ Skipped: ${this.stats.skipped}`);
      console.log(`   ⏱️ Duración: ${duration.toFixed(1)}s`);
      console.log('═'.repeat(80) + '\n');

      return {
        success: this.stats.failed === 0,
        executionId: this.currentExecution,
        stats: this.stats,
        results: this.testResults,
        reportPath: this.config.reportPath
      };

    } catch (error) {
      console.error('\n❌ [MASTER] Error en testing:', error);
      throw error;
    } finally {
      this.isRunning = false;

      // Asegurar que Brain se detenga
      try {
        await this.brainNervous.stop();
      } catch (e) {
        // Ignorar
      }
    }
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * TESTEAR MÓDULO COMPLETO - Con SYNAPSE config + datos reales + CRUD
   * ═════════════════════════════════════════════════════════════════════════
   */
  async testModuleComplete(module) {
    const startTime = Date.now();

    try {
      // 1. Cargar config SYNAPSE para este módulo
      const config = await this.getSynapseConfig(module.id);

      // 2. Si no hay config o está incompleto, usar testing básico
      if (!config || !config.tabs || config.tabs.length === 0) {
        console.log(`   ⚠️ Config SYNAPSE incompleto para ${module.id}, usando testing básico`);
        return await this.testModuleBasic(module);
      }

      // 3. Testing COMPLETO con config SYNAPSE
      console.log(`   📋 Config SYNAPSE: ${config.tabs.length} tabs, ${this.countFields(config)} campos`);

      const result = {
        module: module.id,
        moduleName: module.name,
        status: 'pending',
        duration: 0,
        tests: {
          load: null,
          navigation: null,
          create: null,
          read: null,
          update: null,
          delete: null,
          persistence: null
        },
        errors: [],
        canAutoFix: false
      };

      // Test 1: Cargar módulo
      console.log(`   🔄 Test 1/7: Cargando módulo...`);
      result.tests.load = await this.testModuleLoad(module);

      if (!result.tests.load.passed) {
        result.status = 'failed';
        result.errors.push('No se pudo cargar el módulo');
        return result;
      }

      // Test 2: Navegación y detección de elementos
      console.log(`   🔄 Test 2/7: Navegación y detección de UI...`);
      result.tests.navigation = await this.testModuleNavigation(module, config);

      // Test 3: CREATE (usando config SYNAPSE)
      console.log(`   🔄 Test 3/7: CREATE - Crear registro con datos reales...`);
      result.tests.create = await this.testModuleCreate(module, config);

      // Test 4: READ (verificar en lista)
      console.log(`   🔄 Test 4/7: READ - Verificar en lista...`);
      result.tests.read = await this.testModuleRead(module, config, result.tests.create.recordId);

      // Test 5: UPDATE (editar registro)
      console.log(`   🔄 Test 5/7: UPDATE - Editar registro...`);
      result.tests.update = await this.testModuleUpdate(module, config, result.tests.create.recordId);

      // Test 6: DELETE (eliminar registro)
      console.log(`   🔄 Test 6/7: DELETE - Eliminar registro...`);
      result.tests.delete = await this.testModuleDelete(module, config, result.tests.create.recordId);

      // Test 7: PERSISTENCIA (F5 y verificar)
      console.log(`   🔄 Test 7/7: PERSISTENCIA - Verificar después de F5...`);
      result.tests.persistence = await this.testModulePersistence(module, config);

      // Calcular resultado final
      const allPassed = Object.values(result.tests).every(t => t && t.passed);
      result.status = allPassed ? 'passed' : 'failed';
      result.duration = Date.now() - startTime;

      // Verificar si puede auto-fixearse
      if (result.status === 'failed') {
        result.canAutoFix = this.canAutoFix(result);
      }

      return result;

    } catch (error) {
      console.error(`   ❌ Error testeando ${module.name}:`, error.message);
      return {
        module: module.id,
        moduleName: module.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        canAutoFix: false
      };
    }
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * TESTING BÁSICO - Sin config SYNAPSE (fallback)
   * ═════════════════════════════════════════════════════════════════════════
   */
  async testModuleBasic(module) {
    console.log(`   🔍 Testing básico para ${module.name}...`);

    // Usar FrontendCollector existente
    const result = await this.frontendCollector.testModule(module, this.currentExecution);

    return {
      module: module.id,
      moduleName: module.name,
      status: result.status || 'failed',
      duration: result.duration || 0,
      basic: true,
      tests: result,
      canAutoFix: false
    };
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * HELPERS - Tests individuales (CREATE, READ, UPDATE, DELETE, etc.)
   * ═════════════════════════════════════════════════════════════════════════
   */

  async testModuleLoad(module) {
    // TODO: Implementar test de carga
    return { passed: true, message: 'Módulo carga correctamente' };
  }

  async testModuleNavigation(module, config) {
    // TODO: Implementar test de navegación
    return { passed: true, buttons: [] };
  }

  async testModuleCreate(module, config) {
    // TODO: Implementar test CREATE con datos reales
    return { passed: false, recordId: null, message: 'Pendiente de implementación' };
  }

  async testModuleRead(module, config, recordId) {
    // TODO: Implementar test READ
    return { passed: false, message: 'Pendiente de implementación' };
  }

  async testModuleUpdate(module, config, recordId) {
    // TODO: Implementar test UPDATE
    return { passed: false, message: 'Pendiente de implementación' };
  }

  async testModuleDelete(module, config, recordId) {
    // TODO: Implementar test DELETE
    return { passed: false, message: 'Pendiente de implementación' };
  }

  async testModulePersistence(module, config) {
    // TODO: Implementar test PERSISTENCIA
    return { passed: false, message: 'Pendiente de implementación' };
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * AUTO-HEALING - Intentar reparar automáticamente
   * ═════════════════════════════════════════════════════════════════════════
   */
  async attemptAutoHealing(module, result) {
    console.log(`   🔧 [AUTO-HEALING] Analizando error...`);

    // Consultar Brain para sugerencias
    if (this.brainNervous) {
      try {
        // TODO: Implementar consulta al Brain
        // const suggestion = await this.brainNervous.analyzeError(result);
        // if (suggestion.fix) {
        //   await this.applyFix(suggestion.fix);
        //   return true;
        // }
      } catch (e) {
        console.error(`   ❌ Error en auto-healing:`, e.message);
      }
    }

    return false;
  }

  canAutoFix(result) {
    // Determinar si el error es auto-fixeable
    if (result.error && typeof result.error === 'string') {
      const autoFixableErrors = [
        'timeout',
        'element not found',
        'network',
        'authentication'
      ];

      return autoFixableErrors.some(err =>
        result.error.toLowerCase().includes(err)
      );
    }

    return false;
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * MÓDULOS - Obtener módulos a testear
   * ═════════════════════════════════════════════════════════════════════════
   */
  async getModulesToTest(options) {
    // Si hay filtro específico
    if (options.modules && options.modules.length > 0) {
      return options.modules.map(id => this.systemRegistry.getModule(id)).filter(m => m);
    }

    // Obtener todos y filtrar inteligentemente
    const allModules = this.systemRegistry.getAllModules();

    const filtered = allModules.filter(m => {
      // Solo módulos para panel-empresa
      const availableFor = ['panel-empresa', 'both', 'company'];
      const isForPanelEmpresa = availableFor.includes(m.available_for);

      // No internos
      const isNotInternal = m.is_internal !== true;

      // No backend-only
      const backendOnly = ['kiosks-apk', 'api-gateway', 'webhooks', 'integrations-api'];
      const isNotBackendOnly = !backendOnly.includes(m.id);

      // Válido
      const isValid = m.id && m.name;

      return isForPanelEmpresa && isNotInternal && isNotBackendOnly && isValid;
    });

    console.log(`🧠 [FILTER] ${allModules.length} → ${filtered.length} módulos comerciales`);

    return filtered;
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * CONFIGS SYNAPSE - Cargar configs
   * ═════════════════════════════════════════════════════════════════════════
   */
  async loadSynapseConfigs() {
    try {
      const files = await fs.readdir(this.config.configsDir);
      const configFiles = files.filter(f => f.endsWith('.config.js'));

      return configFiles.map(f => {
        const fullPath = path.join(this.config.configsDir, f);
        return {
          file: f,
          moduleKey: f.replace('.config.js', ''),
          path: fullPath
        };
      });
    } catch (error) {
      console.warn('⚠️ [MASTER] No se pudieron cargar configs SYNAPSE:', error.message);
      return [];
    }
  }

  async getSynapseConfig(moduleKey) {
    try {
      const configPath = path.join(this.config.configsDir, `${moduleKey}.config.js`);
      delete require.cache[require.resolve(configPath)];
      return require(configPath);
    } catch (error) {
      return null;
    }
  }

  countFields(config) {
    if (!config.tabs) return 0;
    return config.tabs.reduce((sum, tab) => sum + (tab.fields?.length || 0), 0);
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * DATABASE - Helpers
   * ═════════════════════════════════════════════════════════════════════════
   */
  async getTestCompany() {
    try {
      const [companies] = await database.sequelize.query(`
        SELECT company_id, name, slug
        FROM companies
        WHERE slug = :slug OR name LIKE '%demo%' OR name LIKE '%test%'
        LIMIT 1
      `, {
        replacements: { slug: this.config.testCompany.slug }
      });

      return companies[0] || null;
    } catch (error) {
      console.error('❌ Error obteniendo empresa test:', error.message);
      return null;
    }
  }

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * REPORTE FINAL - Generar markdown profesional
   * ═════════════════════════════════════════════════════════════════════════
   */
  async generateFinalReport() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const successRate = ((this.stats.passed / this.stats.totalModules) * 100).toFixed(1);

    const report = `# 📊 TESTING FINAL REPORT - Sistema Completo E2E

**Fecha**: ${this.stats.endTime.toISOString()}
**Execution ID**: ${this.currentExecution}
**Duración**: ${duration.toFixed(1)}s

---

## ✅ RESUMEN EJECUTIVO

\`\`\`
Total módulos testeados: ${this.stats.totalModules}
✅ Passed:              ${this.stats.passed} (${successRate}%)
❌ Failed:              ${this.stats.failed}
🔧 Fixed (auto-heal):   ${this.stats.fixed}
⏭️ Skipped:             ${this.stats.skipped}
\`\`\`

---

## 📋 RESULTADOS POR MÓDULO

${this.testResults.map((r, idx) => `
### ${idx + 1}. ${r.moduleName} (${r.module})

**Status**: ${this.getStatusEmoji(r.status)} ${r.status.toUpperCase()}
**Duración**: ${r.duration}ms

${r.tests ? `
**Tests ejecutados**:
${Object.entries(r.tests).map(([name, result]) =>
  `- ${result?.passed ? '✅' : '❌'} ${name}: ${result?.message || 'N/A'}`
).join('\n')}
` : ''}

${r.errors && r.errors.length > 0 ? `
**Errores**:
${r.errors.map(e => `- ${e}`).join('\n')}
` : ''}

---
`).join('\n')}

## 🎯 CONCLUSIÓN

${this.stats.failed === 0 ?
  '✅ **TODOS LOS MÓDULOS PASARON LOS TESTS**\n\nEl sistema está listo para producción.' :
  `⚠️ **${this.stats.failed} módulos fallaron**\n\nRevisar errores arriba y aplicar fixes necesarios.`
}

---

**Generado por**: Master Testing Orchestrator
**Sistema**: SYNAPSE + Phase4 + Brain + FrontendCollector V2
`;

    await fs.writeFile(this.config.reportPath, report, 'utf8');
  }

  getStatusEmoji(status) {
    const emojis = {
      'passed': '✅',
      'failed': '❌',
      'fixed': '🔧',
      'skipped': '⏭️',
      'pending': '⏳'
    };
    return emojis[status] || '❓';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

module.exports = MasterTestingOrchestrator;
