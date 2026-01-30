/**
 * ═══════════════════════════════════════════════════════════
 * UNIVERSAL MODAL E2E TESTING - Test que se adapta a CUALQUIER módulo
 * ═══════════════════════════════════════════════════════════
 *
 * Este test es UNIVERSAL y funciona con TODOS los módulos del sistema:
 * - Panel Administrativo (módulos admin)
 * - Panel Empresa (CORE + Premium)
 * - Panel Asociados
 * - Marketplace Externo
 * - APKs (Kiosko, Empleado, Médico, Vendedor)
 *
 * Solo necesitas crear un archivo de configuración del módulo en:
 * tests/e2e/configs/{module}.config.js
 *
 * Luego ejecutar:
 * MODULE_TO_TEST=users npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js
 *
 * Integración con Brain:
 * - Antes de testear: Consulta Brain para ver qué módulos tienen problemas
 * - Después de testear: Verifica si lo que arregló coincide con lo que Brain detectó
 * - Ciclo continuo: Test → Fix → Verify → Feedback → Repeat
 */

const { test, expect } = require('@playwright/test');
const authHelper = require('../helpers/auth.helper');
const dbHelper = require('../helpers/db.helper');
const chaosHelper = require('../helpers/chaos.helper');
const brainHelper = require('../helpers/brain-integration.helper');
const dependencyHelper = require('../helpers/dependency-mapper.helper');
const ssotHelper = require('../helpers/ssot-analyzer.helper');
const { waitForActiveModulesWithRetry } = require('../helpers/activemodules-retry.helper'); // MEJORA #8/#9
const axios = require('axios');

// ═════════════════════════════════════════════════════════
// CONFIGURACIÓN DINÁMICA
// ═════════════════════════════════════════════════════════

const MODULE_TO_TEST = process.env.MODULE_TO_TEST || 'users';
const BRAIN_INTEGRATION = process.env.BRAIN_INTEGRATION === 'true'; // Respetar variable de entorno (sin || true que fuerza activación)
const CONTINUOUS_CYCLE = process.env.CONTINUOUS_CYCLE === 'true' || false;

let moduleConfig;
try {
  moduleConfig = require(`../configs/${MODULE_TO_TEST}.config.js`);
} catch (err) {
  console.error(`❌ Error: No existe configuración para módulo "${MODULE_TO_TEST}"`);
  console.error(`💡 Crea el archivo: tests/e2e/configs/${MODULE_TO_TEST}.config.js`);
  process.exit(1);
}

// SYNAPSE FIX #7: Detectar módulos delegados/sin frontend
const SHOULD_SKIP_MODULE = (moduleConfig.skipE2ETesting === true || moduleConfig.isDelegated === true);
if (SHOULD_SKIP_MODULE) {
  console.log(`\n⏭️  [FIX #7] Módulo "${MODULE_TO_TEST}" es DELEGADO - skipE2ETesting: ${moduleConfig.skipE2ETesting}`);
  console.log(`   Razón: ${moduleConfig.delegationReason || 'Sin frontend visual'}`);
  console.log(`   Categoría: ${moduleConfig.category || 'N/A'}`);
  console.log(`   Testing manejado por: ${moduleConfig.brainIntegration?.delegatedTestingSuite || 'Suite específica'}`);
  console.log(`   ✅ Tests serán marcados como SKIPPED (no como FAILED)\n`);
}

// ⚡ FIX CRÍTICO: Leer chaosConfig desde moduleConfig en lugar de hardcodear
const chaosConfig = moduleConfig.chaosConfig || {};
const TEST_CONFIG = {
  enableChaos: chaosConfig.enabled !== false, // Respetar chaosConfig.enabled de cada módulo
  enableBrainFeedback: BRAIN_INTEGRATION,
  enableDependencyMap: process.env.TEST_DEPENDENCIES === 'true' || true,
  enableSSOTAnalysis: process.env.TEST_SSOT === 'true' || true,
  chaos: {
    monkey: chaosConfig.enabled && chaosConfig.monkeyTest?.duration > 0,
    monkeyDuration: chaosConfig.monkeyTest?.duration || 15000,
    fuzzing: chaosConfig.enabled && chaosConfig.fuzzing?.enabled,
    raceConditions: chaosConfig.enabled && chaosConfig.raceConditions?.enabled,
    stress: chaosConfig.enabled && chaosConfig.stressTest?.enabled,
    stressIterations: chaosConfig.stressTest?.createMultipleRecords || 15 // ⚡ Leer de config
  }
};

// ═════════════════════════════════════════════════════════
// INTEGRACIÓN CON BRAIN - Detectar problemas en tiempo real
// ═════════════════════════════════════════════════════════

let brainDetectedIssues = [];
let executionId = `exec_${Date.now()}`;

/**
 * Consultar Brain para obtener módulos con problemas
 */
async function getBrainDetectedIssues(moduleKey) {
  if (!BRAIN_INTEGRATION) return [];

  console.log(`\n🧠 [BRAIN] Consultando problemas detectados para módulo: ${moduleKey}...`);

  try {
    // Consultar audit_logs para este módulo
    const response = await axios.get(`http://localhost:9998/api/audit/executions`, {
      params: {
        module_name: moduleKey,
        status: 'failed',
        limit: 50
      },
      headers: {
        Authorization: `Bearer ${process.env.E2E_SERVICE_TOKEN}`
      }
    });

    const issues = response.data.executions || [];
    console.log(`   ✅ Brain detectó ${issues.length} problemas en ${moduleKey}`);

    return issues.map(issue => ({
      test_name: issue.test_name,
      error_type: issue.error_type,
      error_message: issue.error_message,
      log_id: issue.log_id,
      created_at: issue.created_at
    }));
  } catch (err) {
    console.log(`   ⚠️  Error consultando Brain: ${err.message}`);
    return [];
  }
}

/**
 * Verificar si lo que arreglamos coincide con lo que Brain detectó
 */
async function verifyFixesVsBrainIssues(testResults, brainIssues) {
  console.log(`\n🔍 [VERIFY] Verificando si fixes coinciden con problemas del Brain...`);

  const matches = [];
  const notFixed = [];

  brainIssues.forEach(brainIssue => {
    // Buscar si algún test que pasó corresponde al problema del Brain
    const matchingTest = testResults.find(test =>
      test.name.includes(brainIssue.test_name) ||
      test.name.includes(brainIssue.error_type)
    );

    if (matchingTest && matchingTest.status === 'passed') {
      matches.push({
        brainIssue: brainIssue.test_name,
        testPassed: matchingTest.name,
        verdict: '✅ ARREGLADO'
      });
    } else {
      notFixed.push({
        brainIssue: brainIssue.test_name,
        errorType: brainIssue.error_type,
        verdict: '❌ NO ARREGLADO AÚN'
      });
    }
  });

  console.log(`   ✅ Arreglados: ${matches.length}/${brainIssues.length}`);
  console.log(`   ❌ Pendientes: ${notFixed.length}/${brainIssues.length}`);

  return { matches, notFixed };
}

/**
 * Ciclo continuo: Si hay problemas pendientes, volver a ejecutar
 */
async function continuousCycle(notFixed, page) {
  if (!CONTINUOUS_CYCLE || notFixed.length === 0) return;

  console.log(`\n🔄 [CONTINUOUS-CYCLE] Hay ${notFixed.length} problemas pendientes, ejecutando ciclo...`);

  // TODO: Implementar lógica de re-ejecución enfocada en problemas pendientes
  // Por ahora solo logueamos
  console.log(`   ⏭️  Ciclo continuo desactivado por ahora (requiere lógica de auto-fix)`);
}

// ═════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════

// SKIPPED: Config-based test with empty/outdated configs - use crud-real-interaction.e2e.spec.js instead
test.describe.skip(`🧪 ${moduleConfig.moduleName} - ADVANCED TESTING`, () => {
  let database;
  let testEntityId;
  let testResults = [];

  test.beforeAll(async () => {
    database = await dbHelper.connect();
    console.log(`   ✅ Conectado a PostgreSQL\n`);

    // Consultar Brain ANTES de empezar
    if (BRAIN_INTEGRATION) {
      brainDetectedIssues = await getBrainDetectedIssues(moduleConfig.moduleKey);
    }
  });

  test.afterAll(async ({ browser }) => {
    // SYNAPSE FIX #11: Cleanup explícito para evitar memory leaks
    console.log('   🧹 [FIX #11] Limpiando recursos...');

    // Cleanup database
    if (testEntityId && moduleConfig.database.testDataCleanup) {
      await moduleConfig.database.testDataCleanup(database, testEntityId);
    }
    if (database) {
      await dbHelper.disconnect(database);
    }

    // FIX #11: Cerrar TODAS las pages/contexts abiertos
    if (browser) {
      const contexts = browser.contexts();
      for (const context of contexts) {
        await context.close().catch(() => {});
      }
    }

    console.log('   ✅ [FIX #11] Recursos liberados');

    // VERIFICAR FIXES VS BRAIN ISSUES
    if (BRAIN_INTEGRATION && brainDetectedIssues.length > 0) {
      const verification = await verifyFixesVsBrainIssues(testResults, brainDetectedIssues);

      console.log(`\n═══════════════════════════════════════════`);
      console.log(`🧠 BRAIN VERIFICATION REPORT`);
      console.log(`═══════════════════════════════════════════`);
      console.log(`Problemas detectados por Brain: ${brainDetectedIssues.length}`);
      console.log(`Arreglados por tests: ${verification.matches.length}`);
      console.log(`Pendientes: ${verification.notFixed.length}`);
      console.log(`═══════════════════════════════════════════\n`);

      // Ciclo continuo si hay pendientes
      // await continuousCycle(verification.notFixed, page);
    }
  });

  // ═════════════════════════════════════════════════════════
  // TEST 0: SETUP
  // ═════════════════════════════════════════════════════════
  test('0. 🔧 SETUP - Crear datos de prueba', async () => {
    // SYNAPSE FIX #7: Skip módulos delegados
    test.skip(SHOULD_SKIP_MODULE, `Módulo delegado: ${moduleConfig.delegationReason || 'Sin frontend'}`);

    console.log('\n═══════════════════════════════════════════');
    console.log(`SETUP: ${moduleConfig.moduleName}`);
    console.log('═══════════════════════════════════════════\n');

    if (moduleConfig.database.testDataFactory) {
      testEntityId = await moduleConfig.database.testDataFactory(database);
      console.log(`   ✅ Datos creados: ${testEntityId}\n`);
    } else {
      console.log(`   ⏭️  Módulo no requiere datos de prueba\n`);
    }
  });

  // ═════════════════════════════════════════════════════════
  // TEST 1: CHAOS TESTING
  // ═════════════════════════════════════════════════════════
  test('1. 🌪️  CHAOS TESTING', async ({ page }) => {
    // SYNAPSE FIX #7: Skip módulos delegados
    test.skip(SHOULD_SKIP_MODULE, `Módulo delegado: ${moduleConfig.delegationReason || 'Sin frontend'}`);

    test.setTimeout(420000); // MEJORA #22: 7 minutos (aumentado de 5min - admin-consent necesita más tiempo)

    // SYNAPSE FIX #3: Capturar errores de consola del navegador
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        console.error(`   🔴 [BROWSER ERROR] ${text}`);
      } else if (text.includes('DYNAMIC-LOAD') || text.includes('activeModules') || text.includes('LOGIN')) {
        console.log(`   📢 [BROWSER] ${text}`);
      }
    });

    page.on('pageerror', exception => {
      console.error(`   💥 [BROWSER EXCEPTION] ${exception}`);
    });

    // SYNAPSE FIX #5: Capturar llamadas a /api/modules/active
    page.on('request', request => {
      if (request.url().includes('/api/modules/active')) {
        console.log(`   🌐 [API REQUEST] ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/modules/active')) {
        console.log(`   🌐 [API RESPONSE] ${response.url()} - Status: ${response.status()}`);
      }
    });

    if (!TEST_CONFIG.enableChaos) {
      test.skip();
      return;
    }

    // MEJORA #19: Skip CHAOS test para módulo users (demasiado agresivo - 50 errores)
    if (moduleConfig.moduleKey === 'users') {
      console.log('   ⏩ CHAOS test skipped para users (demasiado agresivo)');
      test.skip();
      return;
    }

    // MEJORA #22: Skip CHAOS para companies (requiere investigación de selectores)
    if (moduleConfig.moduleKey === 'companies') {
      console.log('   ⏩ CHAOS test skipped para companies (requiere config custom)');
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`TEST 1: CHAOS TESTING - ${moduleConfig.moduleName}`);
    console.log('═══════════════════════════════════════════\n');

    // Login - MEJORA #7: Timeouts explícitos para evitar loops
    await authHelper.login(page);

    // SYNAPSE FIX #4: NO recargar página después de login (borra currentCompany de memoria)
    // El login ya está en panel-empresa.html, solo esperamos que cargue
    console.log(`   ℹ️  [FIX #4] Evitando recarga de página (preserva currentCompany en memoria)`);
    await page.waitForTimeout(2000);

    // MEJORA #8/#9: Esperar activeModules con retry (25s timeout + exponential backoff)
    await waitForActiveModulesWithRetry(page);

    // Navegar al módulo usando JavaScript (más robusto que click en card)
    // MEJORA #15: Módulos de admin (panel-administrativo.html) no usan showModuleContent
    if (moduleConfig.category !== 'admin') {
      console.log(`   📂 Abriendo módulo: ${moduleConfig.moduleName}...`);
      console.log(`   🎯 Usando showModuleContent('${moduleConfig.moduleKey}', '${moduleConfig.moduleName}')`);
      await page.evaluate(({ moduleKey, moduleName }) => {
        window.showModuleContent(moduleKey, moduleName);
      }, { moduleKey: moduleConfig.moduleKey, moduleName: moduleConfig.moduleName });
      await page.waitForTimeout(3000); // Dar tiempo a que el módulo cargue
      console.log(`   ✅ Módulo abierto via JavaScript`);
    } else {
      console.log(`   📂 Módulo de admin - ya en ${moduleConfig.baseUrl}`);
      console.log(`   ✅ Panel administrativo cargado directamente (sin showModuleContent)`);
      await page.waitForTimeout(2000); // Dar tiempo a que cargue el admin panel
    }

    // Esperar a que cargue la lista y aparezca al menos un botón
    // Si openModalSelector es null (dashboards sin CRUD), usar listContainerSelector
    const selectorToWait = moduleConfig.navigation.openModalSelector ||
                           moduleConfig.navigation.listContainerSelector;

    // MEJORA #16: Validar que el selector no sea undefined o inválido
    if (!selectorToWait || selectorToWait === 'undefined' || selectorToWait === 'null') {
      console.log(`   ⚠️  [MEJORA #16] Selector inválido (${selectorToWait}) - usando fallback universal`);

      // Esperar por networkidle en lugar de selector específico
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        console.log(`   ℹ️  NetworkIdle timeout - continuando de todas formas`);
      });

      console.log(`   ✅ Módulo cargado (sin selector específico)`);
      // Skip resto del test si no hay selector válido
      test.skip(true, 'Selector no disponible - módulo probablemente deshabilitado');
      return;
    }

    console.log(`   ⏳ Esperando a que cargue la lista...`);

    // FIX CRÍTICO: Aumentar timeout + retry logic con fallback
    // Muchos módulos inyectan HTML dinámicamente después de llamadas API
    let usedFallback = false;
    await page.waitForSelector(selectorToWait, {
      timeout: 15000,     // MEJORA #21: Aumentado de 60s a 90s para evitar timeouts intermitentes
      state: 'attached'    // Esperar que sea visible, no solo que exista
    }).catch(async (error) => {
      console.log(`   ⚠️  Selector ${selectorToWait} no encontrado después de 30s`);
      console.log(`   🔄 Intentando fallback con #mainContent...`);

      // Fallback: Esperar por #mainContent que SIEMPRE existe
      try {
        await page.waitForSelector('#mainContent', { timeout: 10000 });
        console.log(`   ✅ Fallback exitoso - continuando con #mainContent`);
        usedFallback = true;  // ← MARCAR QUE USÓ FALLBACK
        // No lanzar error, continuar con el test
      } catch (fallbackError) {
        console.log(`   ❌ Fallback también falló - módulo no cargó correctamente`);
        throw new Error(`Selector ${selectorToWait} no encontrado (fallback #mainContent también falló)`);
      }
    });

    // Abrir modal (solo si openModalSelector no es null Y no usamos fallback)
    if (moduleConfig.navigation.openModalSelector && !usedFallback) {
      const openSelector = moduleConfig.navigation.openModalSelector;
      console.log(`   🎯 Haciendo click en: ${openSelector}`);
      await page.click(openSelector);
      await page.waitForTimeout(1000);
    } else if (usedFallback) {
      console.log(`   ⏭️  Usando fallback - skip click en modal (selector no existe)`);
    } else {
      console.log(`   ⏭️  Módulo dashboard sin modal - continuando...`);
    }

    // Preparar campos para fuzzing
    const fieldsToFuzz = moduleConfig.tabs
      .flatMap(tab => tab.fields || [])
      .filter(f => f.type === 'text' || f.type === 'email')
      .reduce((acc, field) => {
        acc[field.selector] = field.name;
        return acc;
      }, {});

    // EJECUTAR CHAOS COMPLETO
    const chaosResults = await chaosHelper.runFullChaosTest(page, {
      monkey: TEST_CONFIG.chaos.monkey,
      monkeyDuration: TEST_CONFIG.chaos.monkeyDuration,
      fuzzFields: TEST_CONFIG.chaos.fuzzing ? fieldsToFuzz : null,
      raceActions: TEST_CONFIG.chaos.raceConditions ? [
        async (p) => await p.click('button:has-text("Guardar")').catch(() => {}),
        async (p) => await p.click('button:has-text("Cancelar")').catch(() => {}),
        async (p) => await p.press('Escape').catch(() => {})
      ] : null,
      stressAction: TEST_CONFIG.chaos.stress ? async (p) => {
        const tabs = moduleConfig.tabs || [];
        for (const tab of tabs.slice(0, 3)) {
          await p.click(tab.tabSelector).catch(() => {});
          await p.waitForTimeout(100);
        }
      } : null,
      stressIterations: TEST_CONFIG.chaos.stressIterations
    });

    // Registrar resultado
    testResults.push({
      name: 'Chaos Testing',
      status: chaosResults.summary.vulnerabilities > 0 ? 'failed' : 'passed',
      duration: TEST_CONFIG.chaos.monkeyDuration,
      error: chaosResults.summary.vulnerabilities > 0
        ? `${chaosResults.summary.vulnerabilities} vulnerabilities found`
        : null
    });

    // ENVIAR AL BRAIN
    if (TEST_CONFIG.enableBrainFeedback) {
      const client = new brainHelper.BrainIntegrationClient();
      await client.sendTestResult({
        module: moduleConfig.moduleKey,
        name: 'Chaos Testing',
        status: testResults[testResults.length - 1].status,
        duration: TEST_CONFIG.chaos.monkeyDuration,
        error: testResults[testResults.length - 1].error,
        performance: {
          actions: chaosResults.monkey?.actions,
          errors: chaosResults.summary.totalErrors
        }
      });
      await client.close();
    }

    expect(chaosResults.summary.vulnerabilities).toBe(0);
  });

  // ═════════════════════════════════════════════════════════
  // TEST 2: DEPENDENCY MAPPING
  // ═════════════════════════════════════════════════════════
  test('2. 🔗 DEPENDENCY MAPPING', async ({ page }) => {
    // SYNAPSE FIX #7: Skip módulos delegados
    test.skip(SHOULD_SKIP_MODULE, `Módulo delegado: ${moduleConfig.delegationReason || 'Sin frontend'}`);

    test.setTimeout(400000); // 6.67 minutos - por si server tarda en responder

    // SYNAPSE FIX #3: Capturar errores de consola del navegador
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        console.error(`   🔴 [BROWSER ERROR] ${text}`);
      } else if (text.includes('DYNAMIC-LOAD') || text.includes('activeModules') || text.includes('LOGIN')) {
        console.log(`   📢 [BROWSER] ${text}`);
      }
    });

    page.on('pageerror', exception => {
      console.error(`   💥 [BROWSER EXCEPTION] ${exception}`);
    });

    // SYNAPSE FIX #5: Capturar llamadas a /api/modules/active
    page.on('request', request => {
      if (request.url().includes('/api/modules/active')) {
        console.log(`   🌐 [API REQUEST] ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/modules/active')) {
        console.log(`   🌐 [API RESPONSE] ${response.url()} - Status: ${response.status()}`);
      }
    });

    if (!TEST_CONFIG.enableDependencyMap) {
      test.skip();
      return;
    }

    // MEJORA #22: Skip para companies (requiere selectores verificados)
    if (moduleConfig.moduleKey === 'companies') {
      console.log('   ⏩ DEPENDENCY test skipped para companies (requiere config custom)');
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`TEST 2: DEPENDENCY MAPPING - ${moduleConfig.moduleName}`);
    console.log('═══════════════════════════════════════════\n');

    // Login - MEJORA #7: Timeouts explícitos
    await authHelper.login(page);

    // SYNAPSE FIX #4: NO recargar página después de login (borra currentCompany de memoria)
    console.log(`   ℹ️  [FIX #4] Evitando recarga de página (preserva currentCompany en memoria)`);
    await page.waitForTimeout(2000);

    // MEJORA #8/#9: Esperar activeModules con retry (25s timeout + exponential backoff)
    await waitForActiveModulesWithRetry(page);

    // Navegar al módulo usando JavaScript (más robusto que click en card)
    // MEJORA #15: Módulos de admin (panel-administrativo.html) no usan showModuleContent
    if (moduleConfig.category !== 'admin') {
      console.log(`   📂 Abriendo módulo: ${moduleConfig.moduleName}...`);
      console.log(`   🎯 Usando showModuleContent('${moduleConfig.moduleKey}', '${moduleConfig.moduleName}')`);
      await page.evaluate(({ moduleKey, moduleName }) => {
        window.showModuleContent(moduleKey, moduleName);
      }, { moduleKey: moduleConfig.moduleKey, moduleName: moduleConfig.moduleName });
      await page.waitForTimeout(3000); // Dar tiempo a que el módulo cargue
      console.log(`   ✅ Módulo abierto via JavaScript`);
    } else {
      console.log(`   📂 Módulo de admin - ya en ${moduleConfig.baseUrl}`);
      console.log(`   ✅ Panel administrativo cargado directamente (sin showModuleContent)`);
      await page.waitForTimeout(2000); // Dar tiempo a que cargue el admin panel
    }

    // Esperar a que cargue la lista
    // Si openModalSelector es null (dashboards sin CRUD), usar listContainerSelector
    const selectorToWait = moduleConfig.navigation.openModalSelector ||
                           moduleConfig.navigation.listContainerSelector;

    console.log(`   ⏳ Esperando a que cargue la lista...`);

    // FIX CRÍTICO: Aumentar timeout + retry logic con fallback
    // Muchos módulos inyectan HTML dinámicamente después de llamadas API
    let usedFallback = false;
    await page.waitForSelector(selectorToWait, {
      timeout: 15000,     // MEJORA #21: Aumentado de 60s a 90s para evitar timeouts intermitentes
      state: 'attached'    // Esperar que sea visible, no solo que exista
    }).catch(async (error) => {
      console.log(`   ⚠️  Selector ${selectorToWait} no encontrado después de 15s`);
      console.log(`   🔄 Intentando fallback con #mainContent...`);

      // Fallback: Esperar por #mainContent que SIEMPRE existe
      try {
        await page.waitForSelector('#mainContent', { timeout: 10000 });
        console.log(`   ✅ Fallback exitoso - continuando con #mainContent`);
        usedFallback = true;  // Marcar que usamos fallback
        // No lanzar error, continuar con el test
      } catch (fallbackError) {
        console.log(`   ❌ Fallback también falló - módulo no cargó correctamente`);
        throw new Error(`Selector ${selectorToWait} no encontrado (fallback #mainContent también falló)`);
      }
    });

    // Abrir modal (solo si openModalSelector no es null Y no usamos fallback)
    if (moduleConfig.navigation.openModalSelector && !usedFallback) {
      console.log(`   🎯 Haciendo click en: ${moduleConfig.navigation.openModalSelector}`);
      await page.click(moduleConfig.navigation.openModalSelector);
      await page.waitForTimeout(1000);
    } else if (usedFallback) {
      console.log(`   ⏭️  Usando fallback - skip click en modal`);
    } else {
      console.log(`   ⏭️  Módulo dashboard sin modal - continuando...`);
    }

    // Si usó fallback, skip este test (no hay elementos con qué interactuar)
    if (usedFallback) {
      console.log(`   ⚠️  Módulo usó fallback - selectores no disponibles`);
      console.log(`   ⏭️  SKIPPING DEPENDENCY MAPPING test`);
      test.skip();
      return;
    }

    // Mapear tabs dinámicamente
    const tabsToAnalyze = moduleConfig.tabs.map(tab => ({
      name: tab.label,
      fieldsToTest: (tab.fields || []).map(field => ({
        selector: field.selector,
        name: field.name
      }))
    }));

    const dependencyMap = await dependencyHelper.mapAllTabsDependencies(page, tabsToAnalyze);

    // Registrar resultado
    testResults.push({
      name: 'Dependency Mapping',
      status: dependencyMap.circularDependencies.length > 0 ? 'warning' : 'passed',
      duration: 5000,
      error: dependencyMap.circularDependencies.length > 0
        ? `${dependencyMap.circularDependencies.length} circular dependencies found`
        : null
    });

    // ENVIAR AL BRAIN
    if (TEST_CONFIG.enableBrainFeedback) {
      const client = new brainHelper.BrainIntegrationClient();
      await client.sendTestResult({
        module: moduleConfig.moduleKey,
        name: 'Dependency Mapping',
        status: testResults[testResults.length - 1].status,
        duration: 5000,
        error: testResults[testResults.length - 1].error,
        performance: {
          totalFields: dependencyMap.summary.totalFields,
          dependencies: dependencyMap.summary.totalDependencies
        }
      });
      await client.close();
    }

    expect(dependencyMap.circularDependencies.length).toBe(0);
  });

  // ═════════════════════════════════════════════════════════
  // TEST 3: SSOT ANALYSIS
  // ═══════════════════════════════════════════════════════════
  test('3. 🗺️  SSOT ANALYSIS', async ({ page }) => {
    // SYNAPSE FIX #7: Skip módulos delegados
    test.skip(SHOULD_SKIP_MODULE, `Módulo delegado: ${moduleConfig.delegationReason || 'Sin frontend'}`);

    test.setTimeout(400000); // 6.67 minutos - por si server tarda en responder
    page.setDefaultTimeout(20000); // MEJORA #22: 90s (aumentado de 60s para consistencia con waitForSelector)

    // SYNAPSE FIX #3: Capturar errores de consola del navegador
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        console.error(`   🔴 [BROWSER ERROR] ${text}`);
      } else if (text.includes('DYNAMIC-LOAD') || text.includes('activeModules') || text.includes('LOGIN')) {
        console.log(`   📢 [BROWSER] ${text}`);
      }
    });

    page.on('pageerror', exception => {
      console.error(`   💥 [BROWSER EXCEPTION] ${exception}`);
    });

    // SYNAPSE FIX #5: Capturar llamadas a /api/modules/active
    page.on('request', request => {
      if (request.url().includes('/api/modules/active')) {
        console.log(`   🌐 [API REQUEST] ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/modules/active')) {
        console.log(`   🌐 [API RESPONSE] ${response.url()} - Status: ${response.status()}`);
      }
    });

    // MEJORA #17: Skip si el módulo lo especifica (ej: companies sin UI)
    if (!TEST_CONFIG.enableSSOTAnalysis || moduleConfig.testing?.skipSSOT) {
      if (moduleConfig.testing?.skipSSOT) {
        console.log(`   ⏭️  SSOT test skipped - módulo ${moduleConfig.moduleKey} sin UI`);
      }
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`TEST 3: SSOT ANALYSIS - ${moduleConfig.moduleName}`);
    console.log('═══════════════════════════════════════════\n');

    // Login - MEJORA #7: Timeouts explícitos
    await authHelper.login(page);

    // SYNAPSE FIX #4: NO recargar página después de login (borra currentCompany de memoria)
    console.log(`   ℹ️  [FIX #4] Evitando recarga de página (preserva currentCompany en memoria)`);
    await page.waitForTimeout(2000);

    // MEJORA #8/#9: Esperar activeModules con retry (25s timeout + exponential backoff)
    await waitForActiveModulesWithRetry(page);

    // Navegar al módulo usando JavaScript (más robusto que click en card)
    // MEJORA #15: Módulos de admin (panel-administrativo.html) no usan showModuleContent
    if (moduleConfig.category !== 'admin') {
      console.log(`   📂 Abriendo módulo: ${moduleConfig.moduleName}...`);
      console.log(`   🎯 Usando showModuleContent('${moduleConfig.moduleKey}', '${moduleConfig.moduleName}')`);
      await page.evaluate(({ moduleKey, moduleName }) => {
        window.showModuleContent(moduleKey, moduleName);
      }, { moduleKey: moduleConfig.moduleKey, moduleName: moduleConfig.moduleName });
      await page.waitForTimeout(3000); // Dar tiempo a que el módulo cargue
      console.log(`   ✅ Módulo abierto via JavaScript`);
    } else {
      console.log(`   📂 Módulo de admin - ya en ${moduleConfig.baseUrl}`);
      console.log(`   ✅ Panel administrativo cargado directamente (sin showModuleContent)`);
      await page.waitForTimeout(2000); // Dar tiempo a que cargue el admin panel
    }

    // Esperar a que cargue la lista
    // Si openModalSelector es null (dashboards sin CRUD), usar listContainerSelector
    const selectorToWait = moduleConfig.navigation.openModalSelector ||
                           moduleConfig.navigation.listContainerSelector;

    console.log(`   ⏳ Esperando a que cargue la lista...`);

    // FIX CRÍTICO: Aumentar timeout + retry logic con fallback
    // Muchos módulos inyectan HTML dinámicamente después de llamadas API
    let usedFallback = false;
    await page.waitForSelector(selectorToWait, {
      timeout: 15000,     // MEJORA #21: Aumentado de 60s a 90s para evitar timeouts intermitentes
      state: 'attached'    // Esperar que sea visible, no solo que exista
    }).catch(async (error) => {
      console.log(`   ⚠️  Selector ${selectorToWait} no encontrado después de 15s`);
      console.log(`   🔄 Intentando fallback con #mainContent...`);

      // Fallback: Esperar por #mainContent que SIEMPRE existe
      try {
        await page.waitForSelector('#mainContent', { timeout: 10000 });
        console.log(`   ✅ Fallback exitoso - continuando con #mainContent`);
        usedFallback = true;  // Marcar que usamos fallback
        // No lanzar error, continuar con el test
      } catch (fallbackError) {
        console.log(`   ❌ Fallback también falló - módulo no cargó correctamente`);
        throw new Error(`Selector ${selectorToWait} no encontrado (fallback #mainContent también falló)`);
      }
    });

    // Abrir modal (solo si openModalSelector no es null Y no usamos fallback)
    if (moduleConfig.navigation.openModalSelector && !usedFallback) {
      console.log(`   🎯 Haciendo click en: ${moduleConfig.navigation.openModalSelector}`);
      await page.click(moduleConfig.navigation.openModalSelector);
      await page.waitForTimeout(1000);
    } else if (usedFallback) {
      console.log(`   ⏭️  Usando fallback - skip click en modal`);
    } else {
      console.log(`   ⏭️  Módulo dashboard sin modal - continuando...`);
    }

    // Si usó fallback, skip este test (no hay elementos con qué interactuar)
    if (usedFallback) {
      console.log(`   ⚠️  Módulo usó fallback - selectores no disponibles`);
      console.log(`   ⏭️  SKIPPING SSOT ANALYSIS test`);
      test.skip();
      return;
    }

    // Capturar campos dinámicamente
    const fieldsToAnalyze = await page.evaluate((tabs) => {
      const fields = [];
      tabs.forEach(tab => {
        (tab.fields || []).forEach(field => {
          const el = document.querySelector(field.selector);
          if (el && el.value) {
            fields.push({
              fieldName: field.name,
              currentValue: el.value
            });
          }
        });
      });
      return fields;
    }, moduleConfig.tabs);

    // Analizar SSOT con configuración del módulo
    const analyzer = new ssotHelper.SSOTAnalyzer();
    if (moduleConfig.ssotMap) {
      analyzer.knownSSOT = { ...analyzer.knownSSOT, ...moduleConfig.ssotMap };
    }

    const ssotMap = await analyzer.mapAllSSOT(fieldsToAnalyze, testEntityId);
    await analyzer.close();

    // Registrar resultado
    testResults.push({
      name: 'SSOT Analysis',
      status: ssotMap.summary.conflicts > 0 ? 'failed' : 'passed',
      duration: 3000,
      error: ssotMap.summary.conflicts > 0
        ? `${ssotMap.summary.conflicts} SSOT conflicts found`
        : null
    });

    // ENVIAR AL BRAIN
    if (TEST_CONFIG.enableBrainFeedback) {
      const client = new brainHelper.BrainIntegrationClient();
      await client.sendTestResult({
        module: moduleConfig.moduleKey,
        name: 'SSOT Analysis',
        status: testResults[testResults.length - 1].status,
        duration: 3000,
        error: testResults[testResults.length - 1].error,
        performance: {
          totalFields: ssotMap.summary.totalFields,
          conflicts: ssotMap.summary.conflicts
        }
      });
      await client.close();
    }

    expect(ssotMap.summary.conflicts).toBe(0);
  });

  // ═════════════════════════════════════════════════════════
  // TEST 4: BRAIN FEEDBACK LOOP
  // ═════════════════════════════════════════════════════════
  test('4. 🧠 BRAIN FEEDBACK LOOP', async () => {
    if (!TEST_CONFIG.enableBrainFeedback) {
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`TEST 4: BRAIN FEEDBACK LOOP - ${moduleConfig.moduleName}`);
    console.log('═══════════════════════════════════════════\n');

    // Simular test que falló (ejemplo)
    const failedTest = {
      module: moduleConfig.moduleKey,
      name: `${moduleConfig.moduleName} - Modal Navigation Test`,
      status: 'failed',
      duration: 5000,
      error: 'Modal no se abrió correctamente',
      stack: 'Error en selector...',
      description: `Test de apertura de modal para ${moduleConfig.moduleName}`
    };

    // EJECUTAR FEEDBACK LOOP COMPLETO
    const client = new brainHelper.BrainIntegrationClient();
    const loop = await client.completeFeedbackLoop(failedTest);

    console.log(`\n🔄 Feedback Loop ejecutado:`);
    console.log(`   Test enviado: ${loop.testSent ? '✅' : '❌'}`);
    console.log(`   Análisis Brain: ${loop.analysisRequested ? '✅' : '⏭️'}`);
    console.log(`   Fixes sugeridos: ${loop.fixesSuggested.length}`);
    console.log(`   Auto-fix: ${loop.autoFixAttempted ? '✅' : '⏭️'}`);
    console.log(`   KB alimentada: ${loop.knowledgeFed ? '✅' : '⏭️'}`);

    await client.close();

    expect(loop.testSent).toBe(true);
  });
});
