/**
 * 🎯 TEST DEFINITIVO: 35 MÓDULOS DE ISI
 *
 * Objetivo: Testear EXACTAMENTE los módulos asignados a empresa ISI
 * - Lista obtenida del DOM real (35 módulos visibles)
 * - Timeout LARGO: 60s (para módulos lentos)
 * - Autodescubrimiento básico
 * - NO hace CRUD profundo (eso viene después)
 *
 * Duración estimada: 35-70 minutos
 */

const path = require('path');
const fs = require('fs');

console.log('\n🎯 ==========================================');
console.log('   TEST DEFINITIVO: 35 MÓDULOS ISI');
console.log('   Timeout: 60s por módulo');
console.log('==========================================\n');

// Cargar lista EXACTA de módulos ISI
const isiModules = require('../isi-assigned-modules.json');

console.log(`📊 Total módulos ISI a testear: ${isiModules.length}\n`);

// Mock database simple
const mockDatabase = {
  sequelize: {
    query: async () => [[], { rowCount: 0 }],
    transaction: async (callback) => {
      const t = { commit: async () => {}, rollback: async () => {} };
      return callback(t);
    },
    QueryTypes: { SELECT: 'SELECT' }
  },
  User: {
    findAll: async () => [],
    create: async (data) => ({ id: 1, ...data }),
    destroy: async () => 1
  },
  Company: {
    findByPk: async () => ({ id: 11, name: 'ISI Test' }),
    findAll: async () => [],
    create: async (data) => ({ id: 1, ...data }),
    destroy: async () => 1
  }
};

async function runISITest() {
  const startTime = Date.now();
  const results = {
    total: isiModules.length,
    tested: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    modules: {},
    summary: {
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0
    }
  };

  try {
    // 1. Cargar AutonomousQAAgent
    console.log('📦 [1/3] Cargando AutonomousQAAgent...');
    const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
    console.log('   ✅ AutonomousQAAgent cargado\n');

    // 2. Inicializar agent con TIMEOUT LARGO
    console.log('🔧 [2/3] Inicializando agent con Playwright...');
    const agent = new AutonomousQAAgent({
      baseURL: 'http://localhost:9998',
      headless: true,
      timeout: 60000 // ⭐ 60s timeout (para módulos lentos)
    });

    await agent.init();
    console.log('   ✅ Agent inicializado\n');

    // 3. Login una sola vez
    console.log('🔐 [3/3] Realizando login...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login exitoso\n');

    console.log('━'.repeat(70));
    console.log('🧪 COMENZANDO TESTS DE 35 MÓDULOS ISI\n');
    console.log('⏱️  Timeout por módulo: 60s (LARGO - para módulos lentos)');
    console.log('📋 Tests: Navegación + Autodescubrimiento básico\n');
    console.log('━'.repeat(70));
    console.log('');

    // 4. Testear cada módulo
    for (let i = 0; i < isiModules.length; i++) {
      const moduleId = isiModules[i];
      const moduleNum = i + 1;
      const progress = `[${moduleNum}/${isiModules.length}]`;

      console.log(`\n${progress} 🧪 Testing: ${moduleId}`);

      const moduleResult = {
        status: 'pending',
        error: null,
        discoveredElements: 0,
        buttons: 0,
        fields: 0,
        modals: 0,
        testDurationMs: 0
      };

      const moduleStartTime = Date.now();

      try {
        // Test básico: navegar + autodescubrir
        await agent.navigateToModule(moduleId);

        // Autodescubrimiento
        const discoveries = await agent.discoverAll();

        moduleResult.status = 'passed';
        moduleResult.buttons = discoveries.buttons?.length || 0;
        moduleResult.fields = discoveries.fields?.length || 0;
        moduleResult.modals = discoveries.modals?.length || 0;
        moduleResult.tabs = discoveries.tabs?.length || 0;
        moduleResult.tables = discoveries.tables?.length || 0;
        moduleResult.discoveredElements =
          moduleResult.buttons +
          moduleResult.fields +
          moduleResult.modals +
          moduleResult.tabs +
          moduleResult.tables;

        results.passed++;
        console.log(`   ✅ PASSED - ${moduleResult.buttons}btn, ${moduleResult.fields}fields, ${moduleResult.modals}modals`);

      } catch (error) {
        results.failed++;
        moduleResult.status = 'failed';
        moduleResult.error = error.message;
        console.log(`   ❌ FAILED - ${error.message.substring(0, 100)}...`);
      }

      moduleResult.testDurationMs = Date.now() - moduleStartTime;
      results.modules[moduleId] = moduleResult;
      results.tested++;

      // Progress update cada 10 módulos
      if (moduleNum % 10 === 0) {
        const passRate = ((results.passed / results.tested) * 100).toFixed(1);
        console.log(`\n📊 Progress: ${moduleNum}/${isiModules.length} | Pass rate: ${passRate}%\n`);
      }
    }

    // 5. Cerrar browser
    console.log('\n🧹 Cerrando navegador...');
    await agent.browser.close();

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error(error.stack);
  }

  // 6. Calcular métricas finales
  const endTime = Date.now();
  results.summary.endTime = new Date().toISOString();
  results.summary.durationMinutes = ((endTime - startTime) / 1000 / 60).toFixed(2);

  const passRate = ((results.passed / results.tested) * 100).toFixed(1);
  const failRate = ((results.failed / results.tested) * 100).toFixed(1);

  // 7. Mostrar resumen
  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 RESUMEN FINAL - 35 MÓDULOS ISI');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`⏱️  Duración total: ${results.summary.durationMinutes} minutos`);
  console.log('');
  console.log(`✅ Módulos PASSED: ${results.passed}/${results.tested} (${passRate}%)`);
  console.log(`❌ Módulos FAILED: ${results.failed}/${results.tested} (${failRate}%)`);
  console.log('');

  // 8. Listar módulos fallidos (si hay)
  if (results.failed > 0) {
    console.log('❌ MÓDULOS FALLIDOS:\n');
    Object.entries(results.modules)
      .filter(([_, result]) => result.status === 'failed')
      .forEach(([moduleId, result], i) => {
        console.log(`   ${i + 1}. ${moduleId}`);
        console.log(`      Error: ${result.error.substring(0, 80)}...\n`);
      });
  }

  // 9. Guardar resultados
  const resultsFile = path.join(__dirname, '../isi-test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Resultados guardados en: isi-test-results.json`);

  // 10. Recomendación
  console.log('\n' + '═'.repeat(70));
  console.log('🎯 RECOMENDACIÓN:');
  console.log('═'.repeat(70));
  console.log('');

  if (passRate >= 95) {
    console.log('🎉 EXCELENTE - Pass rate >= 95%');
    console.log('   → ¡Sistema LISTO para producción!');
    console.log('   → Siguiente paso: Setup profesional (k6, OWASP ZAP, Grafana)');
  } else if (passRate >= 85) {
    console.log('✅ MUY BUENO - Pass rate 85-95%');
    console.log('   → Sistema casi listo');
    console.log('   → Revisar módulos fallidos (no bloqueante)');
    console.log('   → Continuar con setup profesional');
  } else if (passRate >= 70) {
    console.log('🟡 ACEPTABLE - Pass rate 70-85%');
    console.log('   → Aplicar auto-repair con HybridHealer');
    console.log('   → Luego continuar con setup profesional');
  } else {
    console.log('🔴 CRÍTICO - Pass rate < 70%');
    console.log('   → Revisar y arreglar errores CRÍTICOS');
    console.log('   → NO continuar hasta resolver');
  }

  console.log('\n');

  return results;
}

// Ejecutar
runISITest()
  .then(results => {
    const passRate = ((results.passed / results.tested) * 100).toFixed(1);
    console.log(`\n🏁 Test completado - Pass rate: ${passRate}%\n`);
    process.exit(passRate >= 70 ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Error ejecutando tests:', error);
    process.exit(1);
  });
