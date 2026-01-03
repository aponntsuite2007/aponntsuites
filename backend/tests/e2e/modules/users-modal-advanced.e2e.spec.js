/**
 * ═══════════════════════════════════════════════════════════
 * USERS MODAL - ADVANCED E2E TESTING
 * ═══════════════════════════════════════════════════════════
 *
 * Test MAESTRO que integra TODAS las herramientas avanzadas:
 *
 * ✅ Chaos Testing (acciones aleatorias, fuzzing, stress)
 * ✅ Brain Integration (feedback loop automático)
 * ✅ Dependency Mapping (relaciones entre campos)
 * ✅ SSOT Analysis (fuente única de verdad)
 *
 * Configurable desde UI del Módulo de Ingeniería
 */

const { test, expect } = require('@playwright/test');
const authHelper = require('../helpers/auth.helper');
const dbHelper = require('../helpers/db.helper');
const chaosHelper = require('../helpers/chaos.helper');
const brainHelper = require('../helpers/brain-integration.helper');
const dependencyHelper = require('../helpers/dependency-mapper.helper');
const ssotHelper = require('../helpers/ssot-analyzer.helper');

// CONFIGURACIÓN DEL TEST (viene de la UI)
const TEST_CONFIG = {
  // Qué tests ejecutar (checkboxes desde UI)
  enableChaos: process.env.TEST_CHAOS === 'true' || true,
  enableBrainFeedback: process.env.TEST_BRAIN === 'true' || true,
  enableDependencyMap: process.env.TEST_DEPENDENCIES === 'true' || true,
  enableSSOTAnalysis: process.env.TEST_SSOT === 'true' || true,

  // Configuración de Chaos
  chaos: {
    monkey: true,
    monkeyDuration: 15000, // 15 segundos
    fuzzing: true,
    raceConditions: true,
    stress: true,
    stressIterations: 50
  },

  // Configuración de Dependency Mapping
  dependencies: {
    analyzeAllTabs: true,
    detectDynamic: true,
    generateGraph: true
  },

  // Configuración de SSOT
  ssot: {
    verifyWithDB: true,
    detectConflicts: true,
    registerInKB: true
  }
};

// LAS 10 TABS DEL MODAL
const TABS = [
  { key: 'admin', label: 'Administración', icon: '⚙️' },
  { key: 'personal', label: 'Datos Personales', icon: '👤' },
  { key: 'work', label: 'Antecedentes Laborales', icon: '💼' },
  { key: 'family', label: 'Grupo Familiar', icon: '👨‍👩‍👧‍👦' },
  { key: 'medical', label: 'Antecedentes Médicos', icon: '🏥' },
  { key: 'attendance', label: 'Asistencias/Permisos', icon: '📅' },
  { key: 'calendar', label: 'Calendario', icon: '📆' },
  { key: 'disciplinary', label: 'Disciplinarios', icon: '⚖️' },
  { key: 'biometric', label: 'Registro Biométrico', icon: '📸' },
  { key: 'notifications', label: 'Notificaciones', icon: '🔔' }
];

test.describe('👥 Users Modal - ADVANCED TESTING', () => {
  let database;
  let testUserId;
  let token;

  test.beforeAll(async () => {
    // Conectar a BD
    database = await dbHelper.connect();
    console.log('   ✅ Conectado a PostgreSQL\n');
  });

  test.afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await dbHelper.deleteUser(testUserId);
    }
    await dbHelper.disconnect();
  });

  // ══════════════════════════════════════════════════════════
  // TEST 0: SETUP
  // ══════════════════════════════════════════════════════════
  test('0. 🔧 SETUP - Crear usuario de prueba', async () => {
    console.log('\n═══════════════════════════════════════════');
    console.log('SETUP: Creando usuario de prueba');
    console.log('═══════════════════════════════════════════\n');

    testUserId = await dbHelper.createTestUser({
      nombre: 'Test Advanced User',
      email: `advanced.test.${Date.now()}@demo.com`,
      company_id: 11
    });

    console.log(`   ✅ Usuario creado: ${testUserId}\n`);
  });

  // ══════════════════════════════════════════════════════════
  // TEST 1: CHAOS TESTING
  // ══════════════════════════════════════════════════════════
  test('1. 🌪️  CHAOS TESTING - Acciones Aleatorias', async ({ page }) => {
    if (!TEST_CONFIG.enableChaos) {
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 1: CHAOS TESTING');
    console.log('═══════════════════════════════════════════\n');

    // Login
    await authHelper.login(page);
    await page.goto('http://localhost:9998/panel-empresa.html#users');
    await page.waitForTimeout(2000);

    // Abrir modal
    await page.click('i.fa-eye');
    await page.waitForTimeout(1000);

    // EJECUTAR CHAOS COMPLETO
    const chaosResults = await chaosHelper.runFullChaosTest(page, {
      monkey: TEST_CONFIG.chaos.monkey,
      monkeyDuration: TEST_CONFIG.chaos.monkeyDuration,

      fuzzFields: TEST_CONFIG.chaos.fuzzing ? {
        '#newUserEmail': 'Email',
        '#newUserName': 'Nombre',
        '#newUserDNI': 'DNI'
      } : null,

      raceActions: TEST_CONFIG.chaos.raceConditions ? [
        async (p) => await p.click('button:has-text("Guardar")'),
        async (p) => await p.click('button:has-text("Cancelar")'),
        async (p) => await p.press('Escape')
      ] : null,

      stressAction: TEST_CONFIG.chaos.stress ? async (p) => {
        await p.click('button.file-tab:has-text("Administración")');
        await p.waitForTimeout(100);
        await p.click('button.file-tab:has-text("Datos Personales")');
        await p.waitForTimeout(100);
      } : null,

      stressIterations: TEST_CONFIG.chaos.stressIterations
    });

    // ENVIAR RESULTADOS AL BRAIN
    if (TEST_CONFIG.enableBrainFeedback) {
      const client = new brainHelper.BrainIntegrationClient();
      await client.sendTestResult({
        module: 'users',
        name: 'Chaos Testing',
        status: chaosResults.summary.vulnerabilities > 0 ? 'failed' : 'passed',
        duration: TEST_CONFIG.chaos.monkeyDuration,
        error: chaosResults.summary.vulnerabilities > 0 ?
          `${chaosResults.summary.vulnerabilities} vulnerabilities found` : null,
        performance: {
          actions: chaosResults.monkey?.actions,
          errors: chaosResults.summary.totalErrors
        }
      });
      await client.close();
    }

    expect(chaosResults.summary.vulnerabilities).toBe(0);
  });

  // ══════════════════════════════════════════════════════════
  // TEST 2: DEPENDENCY MAPPING
  // ══════════════════════════════════════════════════════════
  test('2. 🔗 DEPENDENCY MAPPING - Relaciones entre Campos', async ({ page }) => {
    if (!TEST_CONFIG.enableDependencyMap) {
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 2: DEPENDENCY MAPPING');
    console.log('═══════════════════════════════════════════\n');

    // Login
    await authHelper.login(page);
    await page.goto('http://localhost:9998/panel-empresa.html#users');
    await page.waitForTimeout(2000);

    // Abrir modal
    await page.click('i.fa-eye');
    await page.waitForTimeout(1000);

    // MAPEAR DEPENDENCIAS DE TODAS LAS TABS
    const tabsToAnalyze = TABS.map(tab => ({
      name: tab.label,
      fieldsToTest: [
        // Campos comunes que pueden tener dependencias
        { selector: `#${tab.key}Field1`, name: `${tab.key}_field1` },
        { selector: `#${tab.key}Field2`, name: `${tab.key}_field2` }
      ]
    }));

    const dependencyMap = await dependencyHelper.mapAllTabsDependencies(page, tabsToAnalyze);

    // Generar grafo visual
    if (TEST_CONFIG.dependencies.generateGraph) {
      for (const [tabName, tabData] of Object.entries(dependencyMap.tabs)) {
        const graph = dependencyHelper.generateDependencyGraph(tabData);
        console.log(`\n📊 Grafo de ${tabName}:\n${graph}`);
      }
    }

    // ENVIAR AL BRAIN
    if (TEST_CONFIG.enableBrainFeedback) {
      const client = new brainHelper.BrainIntegrationClient();
      await client.sendTestResult({
        module: 'users',
        name: 'Dependency Mapping',
        status: dependencyMap.circularDependencies.length > 0 ? 'warning' : 'passed',
        duration: 5000,
        error: dependencyMap.circularDependencies.length > 0 ?
          `${dependencyMap.circularDependencies.length} circular dependencies found` : null,
        performance: {
          totalFields: dependencyMap.summary.totalFields,
          dependencies: dependencyMap.summary.totalDependencies
        }
      });
      await client.close();
    }

    expect(dependencyMap.circularDependencies.length).toBe(0);
  });

  // ══════════════════════════════════════════════════════════
  // TEST 3: SSOT ANALYSIS
  // ══════════════════════════════════════════════════════════
  test('3. 🗺️  SSOT ANALYSIS - Single Source of Truth', async ({ page }) => {
    if (!TEST_CONFIG.enableSSOTAnalysis) {
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 3: SSOT ANALYSIS');
    console.log('═══════════════════════════════════════════\n');

    // Login
    await authHelper.login(page);
    await page.goto('http://localhost:9998/panel-empresa.html#users');
    await page.waitForTimeout(2000);

    // Abrir modal del usuario de prueba
    const viewButtons = await page.$$('i.fa-eye');
    if (viewButtons.length > 0) {
      await viewButtons[0].click();
      await page.waitForTimeout(1000);
    }

    // CAPTURAR VALORES DE CAMPOS
    const fieldsToAnalyze = await page.evaluate(() => {
      const fields = [];
      document.querySelectorAll('input, select, textarea').forEach(el => {
        const name = el.name || el.id;
        if (name && el.value) {
          fields.push({
            fieldName: name,
            currentValue: el.value
          });
        }
      });
      return fields;
    });

    // ANALIZAR SSOT
    const ssotMap = await ssotHelper.analyzeAllFields(fieldsToAnalyze, testUserId);

    // Generar diagrama
    const analyzer = new ssotHelper.SSOTAnalyzer();
    const diagram = analyzer.generateSSOTDiagram(ssotMap);
    console.log(`\n🗺️  Diagrama SSOT:\n${diagram}`);
    await analyzer.close();

    // ENVIAR AL BRAIN
    if (TEST_CONFIG.enableBrainFeedback) {
      const client = new brainHelper.BrainIntegrationClient();
      await client.sendTestResult({
        module: 'users',
        name: 'SSOT Analysis',
        status: ssotMap.summary.conflicts > 0 ? 'failed' : 'passed',
        duration: 3000,
        error: ssotMap.summary.conflicts > 0 ?
          `${ssotMap.summary.conflicts} SSOT conflicts found` : null,
        performance: {
          totalFields: ssotMap.summary.totalFields,
          conflicts: ssotMap.summary.conflicts
        }
      });
      await client.close();
    }

    expect(ssotMap.summary.conflicts).toBe(0);
  });

  // ══════════════════════════════════════════════════════════
  // TEST 4: BRAIN FEEDBACK LOOP
  // ══════════════════════════════════════════════════════════
  test('4. 🧠 BRAIN FEEDBACK LOOP - Auto-learning', async () => {
    if (!TEST_CONFIG.enableBrainFeedback) {
      test.skip();
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 4: BRAIN FEEDBACK LOOP');
    console.log('═══════════════════════════════════════════\n');

    // Simular un test que falló
    const failedTest = {
      module: 'users',
      name: 'Modal Navigation Test',
      status: 'failed',
      duration: 5000,
      error: 'Modal no se abrió correctamente',
      stack: 'Error en línea 42...',
      description: 'Test de apertura de modal'
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
