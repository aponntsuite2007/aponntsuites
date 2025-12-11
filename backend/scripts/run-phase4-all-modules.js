/**
 * ============================================================================
 * RUNNER UNIVERSAL PHASE4 - Ejecuta tests contra TODOS los módulos
 * ============================================================================
 *
 * Este script:
 * 1. Lee modules-registry.json (SSOT) para obtener los 45+ módulos
 * 2. Ejecuta Phase4TestOrchestrator para cada módulo
 * 3. Incluye validación de API con SchemaValidator
 * 4. Genera reporte consolidado con todos los resultados
 * 5. Guarda resultados en JSON para análisis posterior
 *
 * Uso:
 *   node scripts/run-phase4-all-modules.js
 *   node scripts/run-phase4-all-modules.js --module=users (solo un módulo)
 *   node scripts/run-phase4-all-modules.js --headless (sin navegador visible)
 *   node scripts/run-phase4-all-modules.js --skip-ui (solo API tests)
 *
 * @version 1.0.0
 * @date 2025-12-10
 * ============================================================================
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');
const fs = require('fs');
const path = require('path');

// Argumentos CLI
const args = process.argv.slice(2);
const argMap = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.replace('--', '').split('=');
    argMap[key] = value || true;
  }
});

const SINGLE_MODULE = argMap.module || null;
const HEADLESS_MODE = argMap.headless || false;
const SKIP_UI_TESTS = argMap['skip-ui'] || false;
const SKIP_API_TESTS = argMap['skip-api'] || false;

// ============================================================================
// CARGA DE MÓDULOS DESDE SSOT
// ============================================================================

function loadModulesFromRegistry() {
  try {
    const registryPath = path.join(__dirname, '../src/auditor/registry/modules-registry.json');
    const content = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(content);

    console.log(`📋 [RUNNER] Registry cargado: ${registry.total_modules} módulos disponibles`);

    return registry.modules.map(m => m.id);
  } catch (error) {
    console.error('❌ [RUNNER] Error cargando registry:', error.message);
    return [];
  }
}

// ============================================================================
// RUNNER PRINCIPAL
// ============================================================================

async function runPhase4ForAllModules() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🚀 PHASE4 RUNNER UNIVERSAL - Tests Integrados           ║');
  console.log('║  API Schema Validation + UI Tests + DB Persistence       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Cargar módulos desde SSOT
  const allModules = loadModulesFromRegistry();
  const modulesToTest = SINGLE_MODULE ? [SINGLE_MODULE] : allModules;

  console.log(`📦 Módulos a testear: ${modulesToTest.length}`);
  if (SINGLE_MODULE) {
    console.log(`   🎯 Modo SINGLE MODULE: ${SINGLE_MODULE}`);
  }
  if (SKIP_UI_TESTS) {
    console.log(`   ⏭️  UI Tests: SKIP`);
  }
  if (SKIP_API_TESTS) {
    console.log(`   ⏭️  API Tests: SKIP`);
  }
  console.log('');

  // Resultados consolidados
  const consolidatedResults = {
    executionId: `phase4-all-${Date.now()}`,
    startTime: new Date().toISOString(),
    config: {
      headless: HEADLESS_MODE,
      skipUI: SKIP_UI_TESTS,
      skipAPI: SKIP_API_TESTS,
      modulesCount: modulesToTest.length
    },
    modules: [],
    summary: {
      totalModules: modulesToTest.length,
      modulesWithErrors: 0,
      modulesWithWarnings: 0,
      modulesPassed: 0,
      totalAPITests: 0,
      totalUITests: 0,
      totalDBTests: 0,
      apiTestsPassed: 0,
      apiTestsFailed: 0,
      uiTestsPassed: 0,
      uiTestsFailed: 0,
      dbTestsPassed: 0,
      dbTestsFailed: 0,
      schemaValidationPassed: 0,
      schemaValidationFailed: 0,
      criticalErrors: [],
      warnings: []
    }
  };

  // Configuración Phase4
  const phase4Config = {
    baseUrl: process.env.BASE_URL || 'http://localhost:9998',
    headless: HEADLESS_MODE,
    timeout: 30000,
    skipUITests: SKIP_UI_TESTS,
    skipAPITests: SKIP_API_TESTS
  };

  // Inicializar Phase4 una sola vez (reutilizar navegador)
  const orchestrator = new Phase4TestOrchestrator(phase4Config, database);

  try {
    // Start (inicializar navegador, DB, etc.)
    if (!SKIP_UI_TESTS) {
      console.log('🌐 Inicializando navegador Playwright...');
      await orchestrator.start();
      console.log('✅ Navegador iniciado\n');
    }

    // Iterar módulos
    for (const [index, moduleId] of modulesToTest.entries()) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📦 [${index + 1}/${modulesToTest.length}] Testeando módulo: ${moduleId.toUpperCase()}`);
      console.log('='.repeat(70));

      const moduleResult = {
        moduleId,
        startTime: new Date().toISOString(),
        api: { passed: 0, failed: 0, tests: [] },
        ui: { passed: 0, failed: 0 },
        db: { passed: 0, failed: 0 },
        schema: { passed: 0, failed: 0, errors: [] },
        errors: [],
        warnings: [],
        status: 'pending'
      };

      try {
        // =================================================================
        // FASE 1: API SCHEMA VALIDATION (antes de UI)
        // =================================================================
        if (!SKIP_API_TESTS) {
          console.log('\n📡 FASE 1: Validación de API con SchemaValidator...');

          // Obtener token de auth REAL
          const { token: authToken, companyId } = await getTestAuthToken();

          const apiResults = await orchestrator.testAPIEndpoints(moduleId, authToken, companyId);

          moduleResult.api.passed = apiResults.summary.passed;
          moduleResult.api.failed = apiResults.summary.failed;
          moduleResult.api.tests = apiResults.endpoints;

          if (apiResults.summary.failed > 0) {
            moduleResult.errors.push(...apiResults.endpoints.filter(e => e.status === 'failed'));
            consolidatedResults.summary.modulesWithErrors++;
          }

          if (apiResults.summary.warnings > 0) {
            moduleResult.warnings.push(...apiResults.endpoints.filter(e => e.warnings));
            consolidatedResults.summary.modulesWithWarnings++;
          }

          consolidatedResults.summary.totalAPITests += apiResults.summary.total;
          consolidatedResults.summary.apiTestsPassed += apiResults.summary.passed;
          consolidatedResults.summary.apiTestsFailed += apiResults.summary.failed;
        }

        // =================================================================
        // FASE 2: UI TESTS (opcional)
        // =================================================================
        if (!SKIP_UI_TESTS) {
          console.log('\n🖥️  FASE 2: Tests UI con Playwright (pendiente de implementar)...');
          // TODO: Agregar llamada a orchestrator.testModuleUI(moduleId)
          // Por ahora solo hacemos API tests
        }

        // =================================================================
        // RESULTADO DEL MÓDULO
        // =================================================================
        if (moduleResult.errors.length === 0 && moduleResult.warnings.length === 0) {
          moduleResult.status = 'passed';
          consolidatedResults.summary.modulesPassed++;
          console.log(`\n✅ Módulo ${moduleId}: PASSED`);
        } else if (moduleResult.errors.length > 0) {
          moduleResult.status = 'failed';
          console.log(`\n❌ Módulo ${moduleId}: FAILED (${moduleResult.errors.length} errores)`);

          // Agregar errores críticos al resumen
          moduleResult.errors.forEach(err => {
            if (err.schemaValid === false) {
              consolidatedResults.summary.criticalErrors.push({
                module: moduleId,
                endpoint: err.endpoint,
                issues: err.issues?.arrays || err.errors
              });
            }
          });
        } else {
          moduleResult.status = 'passed_with_warnings';
          console.log(`\n⚠️  Módulo ${moduleId}: PASSED WITH WARNINGS`);
        }

      } catch (error) {
        console.error(`❌ Error testeando módulo ${moduleId}:`, error.message);
        moduleResult.status = 'error';
        moduleResult.errors.push({
          type: 'UnexpectedError',
          message: error.message,
          stack: error.stack
        });
        consolidatedResults.summary.modulesWithErrors++;
      }

      moduleResult.endTime = new Date().toISOString();
      consolidatedResults.modules.push(moduleResult);

      // Mini resumen después de cada módulo
      console.log(`   API Tests: ${moduleResult.api.passed}✅ / ${moduleResult.api.failed}❌`);
    }

    // =================================================================
    // REPORTE FINAL CONSOLIDADO
    // =================================================================
    console.log('\n\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  📊 REPORTE FINAL - PHASE4 RUNNER UNIVERSAL               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    consolidatedResults.endTime = new Date().toISOString();
    consolidatedResults.duration = `${duration}s`;

    console.log(`⏱️  Duración total: ${duration}s`);
    console.log(`📦 Módulos testeados: ${consolidatedResults.summary.totalModules}`);
    console.log(`✅ Módulos PASSED: ${consolidatedResults.summary.modulesPassed}`);
    console.log(`❌ Módulos con errores: ${consolidatedResults.summary.modulesWithErrors}`);
    console.log(`⚠️  Módulos con warnings: ${consolidatedResults.summary.modulesWithWarnings}`);
    console.log('');
    console.log(`📡 API Tests:`);
    console.log(`   Total: ${consolidatedResults.summary.totalAPITests}`);
    console.log(`   Passed: ${consolidatedResults.summary.apiTestsPassed} ✅`);
    console.log(`   Failed: ${consolidatedResults.summary.apiTestsFailed} ❌`);
    console.log('');

    if (consolidatedResults.summary.criticalErrors.length > 0) {
      console.log(`🔥 ERRORES CRÍTICOS DETECTADOS (${consolidatedResults.summary.criticalErrors.length}):\n`);

      consolidatedResults.summary.criticalErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. Módulo: ${err.module} | Endpoint: ${err.endpoint}`);
        if (err.issues && err.issues.length > 0) {
          err.issues.forEach(issue => {
            console.log(`      ❌ ${issue.message}`);
            if (issue.fix) {
              console.log(`         💡 Fix: ${issue.fix}`);
            }
          });
        }
      });
      console.log('');
    }

    // Guardar resultados en JSON
    const resultsPath = path.join(__dirname, '../logs', `phase4-runner-${consolidatedResults.executionId}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(consolidatedResults, null, 2));
    console.log(`💾 Resultados guardados en: ${resultsPath}\n`);

    // Exit code
    const exitCode = consolidatedResults.summary.modulesWithErrors > 0 ? 1 : 0;
    process.exit(exitCode);

  } finally {
    // Cleanup
    if (orchestrator.browser) {
      console.log('\n🧹 Cerrando navegador...');
      await orchestrator.browser.close();
    }

    if (orchestrator.sequelize) {
      await orchestrator.sequelize.close();
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function getTestAuthToken() {
  const axios = require('axios');
  const baseUrl = process.env.BASE_URL || 'http://localhost:9998';

  try {
    console.log('🔐 Obteniendo token de autenticación...');

    const loginResponse = await axios.post(`${baseUrl}/api/v1/auth/login`, {
      companySlug: 'aponnt-empresa-demo',
      identifier: 'administrador',
      password: 'admin123'
    }, {
      timeout: 5000,
      validateStatus: () => true // No lanzar error en 4xx/5xx
    });

    if (loginResponse.status === 200 && loginResponse.data && loginResponse.data.token) {
      const userData = loginResponse.data;
      console.log('✅ Autenticación exitosa');
      console.log(`   Usuario: ${userData.user?.email || 'admin'}`);
      console.log(`   Empresa: ${userData.company?.name || 'N/A'} (ID: ${userData.company?.company_id || userData.user?.company_id || 'N/A'})`);
      console.log(`   Token: ${userData.token.substring(0, 20)}...`);

      return {
        token: userData.token,
        companyId: userData.company?.company_id || userData.user?.company_id || 11
      };
    }

    // Si falla, intentar con empresa alternativa
    console.warn('⚠️  Login con aponnt-empresa-demo falló, intentando empresa-test...');

    const loginResponse2 = await axios.post(`${baseUrl}/api/v1/auth/login`, {
      companySlug: 'empresa-test',
      identifier: 'administrador1',
      password: 'admin123'
    }, {
      timeout: 5000,
      validateStatus: () => true
    });

    if (loginResponse2.status === 200 && loginResponse2.data && loginResponse2.data.token) {
      const userData = loginResponse2.data;
      console.log('✅ Autenticación exitosa (empresa-test)');
      console.log(`   Empresa ID: ${userData.company?.company_id || userData.user?.company_id || 'N/A'}`);

      return {
        token: userData.token,
        companyId: userData.company?.company_id || userData.user?.company_id || 1
      };
    }

    throw new Error('No se pudo autenticar con ninguna empresa');

  } catch (error) {
    console.error('❌ Error obteniendo token de autenticación:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('💡 Verifica que el servidor esté corriendo:');
    console.error('   cd backend && PORT=9998 npm start');
    console.error('');

    throw error; // Lanzar error para que el test falle
  }
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

runPhase4ForAllModules().catch(error => {
  console.error('\n❌ Error fatal en runner:', error);
  process.exit(1);
});
