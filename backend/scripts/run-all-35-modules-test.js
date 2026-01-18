/**
 * TEST COMPLETO DE LOS 35 MÓDULOS ISI
 *
 * Usa los métodos testAllModules y testModuleComplete
 * integrados permanentemente en AutonomousQAAgent.js
 *
 * Ejecuta el mismo testing exhaustivo que funcionó para 'users'
 * en TODOS los módulos asignados a la empresa ISI.
 */

const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const fs = require('fs');

// 35 módulos de ISI
const ALL_ISI_MODULES = [
  "notification-center",
  "biometric-consent",
  "organizational-structure",
  "finance-dashboard",
  "warehouse-management",
  "dms-dashboard",
  "mi-espacio",
  "my-procedures",
  "user-support",
  "users",
  "attendance",
  "legal-dashboard",
  "kiosks",
  "employee-360",
  "medical",
  "vacation-management",
  "procurement-management",
  "hour-bank",
  "payroll-liquidation",
  "art-management",
  "training-management",
  "compliance-dashboard",
  "visitors",
  "hse-management",
  "emotional-analysis",
  "employee-map",
  "job-postings",
  "sanctions-management",
  "sla-tracking",
  "audit-reports",
  "benefits-management",
  "logistics-dashboard",
  "siac-commercial-dashboard",
  "voice-platform",
  "procedures-manual"
];

async function runCompleteTest() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔬 TEST COMPLETO INTEGRADO - 35 MÓDULOS ISI');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`📋 Total módulos: ${ALL_ISI_MODULES.length}`);
  console.log(`⏰ Inicio: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const agent = new AutonomousQAAgent({
    headless: true,
    timeout: 60000,
    learningMode: false,
    brainIntegration: false
  });

  let results = null;

  try {
    // Inicializar agente
    console.log('1️⃣ Inicializando navegador...');
    await agent.init();
    console.log('   ✅ Navegador iniciado\n');

    // Login
    console.log('2️⃣ Login como admin de ISI...');
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login exitoso\n');

    // Ejecutar test completo usando el método integrado
    console.log('3️⃣ Ejecutando testAllModules() integrado...\n');
    results = await agent.testAllModules(ALL_ISI_MODULES);

    // Guardar resultados
    const resultsFile = 'all-35-modules-test-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Resultados guardados en: ${resultsFile}`);

    // Generar reporte detallado
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('📊 REPORTE DETALLADO');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    // Módulos con CRUD exitoso
    const crudSuccess = results.moduleResults.filter(m =>
      m.loaded && m.crudTests?.some(t => t.success)
    );
    if (crudSuccess.length > 0) {
      console.log('✅ MÓDULOS CON CRUD EXITOSO:');
      crudSuccess.forEach(m => {
        const successCount = m.crudTests.filter(t => t.success).length;
        console.log(`   - ${m.moduleId}: ${successCount} operaciones CRUD OK`);
      });
      console.log('');
    }

    // Módulos con tabs explorados
    const withTabs = results.moduleResults.filter(m =>
      m.tabs && m.tabs.length > 0
    );
    if (withTabs.length > 0) {
      console.log('📑 MÓDULOS CON TABS/SUBMODULOS:');
      withTabs.forEach(m => {
        console.log(`   - ${m.moduleId}: ${m.tabs.length} tabs`);
      });
      console.log('');
    }

    // Módulos tipo dashboard (sin CRUD)
    const dashboards = results.moduleResults.filter(m =>
      m.loaded && (!m.crudTests || m.crudTests.length === 0) && (!m.tabs || m.tabs.length === 0)
    );
    if (dashboards.length > 0) {
      console.log('📊 DASHBOARDS (Solo visualización):');
      dashboards.forEach(m => console.log(`   - ${m.moduleId}`));
      console.log('');
    }

    // Módulos con errores
    const withErrors = results.moduleResults.filter(m =>
      m.errors && m.errors.length > 0
    );
    if (withErrors.length > 0) {
      console.log('⚠️ MÓDULOS CON ERRORES:');
      withErrors.forEach(m => {
        console.log(`   - ${m.moduleId}: ${m.errors[0].substring(0, 60)}`);
      });
      console.log('');
    }

    // Módulos que no cargaron
    const notLoaded = results.moduleResults.filter(m => !m.loaded);
    if (notLoaded.length > 0) {
      console.log('❌ MÓDULOS QUE NO CARGARON:');
      notLoaded.forEach(m => {
        console.log(`   - ${m.moduleId}: ${m.error || 'No navegado'}`);
      });
      console.log('');
    }

    // Screenshot final
    await agent.page.screenshot({ path: 'test-35-modules-final.png' });
    console.log('📸 Screenshot guardado: test-35-modules-final.png');

  } catch (error) {
    console.log('\n❌ ERROR FATAL:', error.message);
    console.log(error.stack);
  } finally {
    await agent.close();
    console.log('\n🏁 Test finalizado');
    console.log(`⏰ Fin: ${new Date().toLocaleString()}`);
  }

  return results;
}

// Ejecutar
runCompleteTest().catch(console.error);
