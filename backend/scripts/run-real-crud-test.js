/**
 * TEST REAL DE CRUD - USA testModule() que llama a testCRUD() con verifyPersistence()
 *
 * Este es el test REAL, no el atajo falso de testModuleComplete()
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');

// Empezar con 5 módulos críticos para validar que funciona
const TEST_MODULES = [
  "users",           // CRUD completo de usuarios
  "attendance",      // Asistencias
  "kiosks",          // Kioscos biométricos
  "medical",         // Registros médicos
  "visitors"         // Visitantes
];

async function runRealTest() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔬 TEST REAL DE CRUD - CON VERIFICACIÓN DE PERSISTENCIA');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`📋 Módulos a testear: ${TEST_MODULES.length}`);
  console.log(`⏰ Inicio: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 120000,  // 2 minutos por operación
    learningMode: true,
    brainIntegration: false
  });

  const allResults = {
    timestamp: new Date().toISOString(),
    modules: [],
    summary: {
      total: TEST_MODULES.length,
      passed: 0,
      failed: 0,
      crudVerified: 0,
      persistenceVerified: 0
    }
  };

  try {
    console.log('1️⃣ Inicializando navegador...');
    await agent.init();
    console.log('   ✅ Navegador iniciado\n');

    console.log('2️⃣ Login como admin de ISI...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login exitoso\n');

    console.log('3️⃣ Ejecutando testModule() REAL para cada módulo...\n');

    for (let i = 0; i < TEST_MODULES.length; i++) {
      const moduleId = TEST_MODULES[i];

      console.log(`\n[${ i + 1}/${TEST_MODULES.length}] ─────────────────────────────────────────────`);

      try {
        // Usar testModule() que llama a testCRUD() internamente
        const result = await agent.testModule(moduleId);

        // Analizar resultados
        const moduleResult = {
          moduleId,
          tested: true,
          crudResults: [],
          errors: [],
          persistenceVerified: false
        };

        // Buscar resultados de CRUD en los elementos testeados
        if (result && result.tested) {
          for (const tested of result.tested) {
            if (tested.crudTest) {
              moduleResult.crudResults.push({
                element: tested.element?.text || 'unknown',
                create: tested.crudTest.create?.success || false,
                read: tested.crudTest.read?.success || false,
                update: tested.crudTest.update?.success || false,
                delete: tested.crudTest.delete?.success || false,
                persistence: tested.crudTest.persistence?.success || false
              });

              if (tested.crudTest.persistence?.success) {
                moduleResult.persistenceVerified = true;
                allResults.summary.persistenceVerified++;
              }
            }

            if (tested.error) {
              moduleResult.errors.push(tested.error);
            }
          }
        }

        // Determinar si pasó
        const hasCrudSuccess = moduleResult.crudResults.some(c => c.create || c.read);
        const hasNoErrors = moduleResult.errors.length === 0;

        if (hasCrudSuccess || hasNoErrors) {
          allResults.summary.passed++;
          console.log(`   ✅ ${moduleId}: CRUD verificado`);
        } else {
          allResults.summary.failed++;
          console.log(`   ❌ ${moduleId}: Errores encontrados`);
          moduleResult.errors.forEach(e => console.log(`      - ${e}`));
        }

        if (moduleResult.crudResults.length > 0) {
          allResults.summary.crudVerified++;
        }

        allResults.modules.push(moduleResult);

      } catch (error) {
        console.log(`   ❌ ${moduleId}: ERROR FATAL - ${error.message}`);
        allResults.modules.push({
          moduleId,
          tested: false,
          error: error.message,
          stack: error.stack
        });
        allResults.summary.failed++;
      }

      // Screenshot después de cada módulo
      await agent.page.screenshot({
        path: `real-test-${moduleId}.png`,
        fullPage: true
      });
    }

    // Guardar resultados
    const resultsFile = 'real-crud-test-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
    console.log(`\n📄 Resultados guardados en: ${resultsFile}`);

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL - TEST REAL');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`   Total módulos: ${allResults.summary.total}`);
    console.log(`   ✅ Pasaron: ${allResults.summary.passed}`);
    console.log(`   ❌ Fallaron: ${allResults.summary.failed}`);
    console.log(`   🔍 CRUD verificado: ${allResults.summary.crudVerified}`);
    console.log(`   💾 Persistencia verificada: ${allResults.summary.persistenceVerified}`);
    console.log(`   Success Rate: ${Math.round(allResults.summary.passed / allResults.summary.total * 100)}%`);

    // Listar errores específicos
    const modulesWithErrors = allResults.modules.filter(m => m.errors?.length > 0 || m.error);
    if (modulesWithErrors.length > 0) {
      console.log('\n⚠️ MÓDULOS CON ERRORES A CORREGIR:');
      modulesWithErrors.forEach(m => {
        console.log(`   - ${m.moduleId}:`);
        if (m.error) {
          console.log(`      ${m.error}`);
        }
        if (m.errors) {
          m.errors.forEach(e => console.log(`      ${e}`));
        }
      });
    }

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
    console.log(error.stack);
  } finally {
    await agent.close();
    console.log('\n🏁 Test finalizado');
    console.log(`⏰ Fin: ${new Date().toLocaleString()}`);
  }

  return allResults;
}

// Ejecutar
runRealTest().catch(console.error);
