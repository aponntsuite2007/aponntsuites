const fs = require('fs');
const path = require('path');

// Cargar registry y batch results
const registry = JSON.parse(fs.readFileSync('./src/auditor/registry/modules-registry.json', 'utf8'));
const batchResults = JSON.parse(fs.readFileSync('./tests/e2e/results/batch-test-results.json', 'utf8'));

console.log('🔍 CLASIFICACIÓN DE 63 MÓDULOS:\n');
console.log('═══════════════════════════════════════════════════════════\n');

const withFrontend = [];
const noFrontendIntegrated = [];
const noFrontendNeedCreation = [];

batchResults.modules.forEach(m => {
  const mod = registry.modules.find(r => r.key === m.moduleKey);

  if (!mod) {
    noFrontendNeedCreation.push({
      key: m.moduleKey,
      status: m.status,
      tests: `${m.passing}/${m.total}`,
      reason: 'No en registry'
    });
    return;
  }

  // Verificar si tiene UI elements
  const hasModal = mod.ui_elements?.modals && mod.ui_elements.modals.length > 0;
  const hasPanel = mod.ui_elements?.panels && mod.ui_elements.panels.length > 0;
  const hasDashboard = mod.ui_elements?.dashboards && mod.ui_elements.dashboards.length > 0;
  const hasFrontend = hasModal || hasPanel || hasDashboard;

  if (hasFrontend) {
    withFrontend.push({
      key: m.moduleKey,
      status: m.status,
      tests: `${m.passing}/${m.total}`,
      panel: mod.panel_type || 'unknown'
    });
  } else if (mod.integrates_with && mod.integrates_with.length > 0) {
    noFrontendIntegrated.push({
      key: m.moduleKey,
      status: m.status,
      tests: `${m.passing}/${m.total}`,
      integratedIn: mod.integrates_with
    });
  } else {
    noFrontendNeedCreation.push({
      key: m.moduleKey,
      status: m.status,
      tests: `${m.passing}/${m.total}`,
      reason: 'Sin UI elements'
    });
  }
});

console.log('✅ MÓDULOS CON FRONTEND (' + withFrontend.length + '):');
console.log('   (Usables desde panel-empresa o panel-administrativo)\n');
const passedWithFE = withFrontend.filter(m => m.status === 'PASSED');
const failedWithFE = withFrontend.filter(m => m.status === 'FAILED');

console.log('   ✅ PASSED (' + passedWithFE.length + '):');
passedWithFE.forEach((m, i) => {
  console.log('      ' + (i+1) + '. ' + m.key.padEnd(35) + ' → ' + m.tests + ' tests (' + m.panel + ')');
});

console.log('\n   ❌ FAILED (' + failedWithFE.length + '):');
failedWithFE.forEach((m, i) => {
  console.log('      ' + (i+1) + '. ' + m.key.padEnd(35) + ' → ' + m.tests + ' tests (' + m.panel + ')');
});

console.log('\n\n🔧 MÓDULOS SIN FRONTEND - INTEGRADOS (' + noFrontendIntegrated.length + '):');
console.log('   (Funcionalidad backend integrada en otros módulos)\n');
noFrontendIntegrated.forEach((m, i) => {
  const icon = m.status === 'PASSED' ? '✅' : '❌';
  console.log('   ' + (i+1) + '. ' + icon + ' ' + m.key.padEnd(35) + ' → Integrado en: ' + m.integratedIn.join(', '));
});

console.log('\n\n⚠️  MÓDULOS SIN FRONTEND - NECESITAN CREACIÓN (' + noFrontendNeedCreation.length + '):');
console.log('   (Delegar a otra sesión para crear frontend)\n');
noFrontendNeedCreation.forEach((m, i) => {
  const icon = m.status === 'PASSED' ? '✅' : '❌';
  console.log('   ' + (i+1) + '. ' + icon + ' ' + m.key.padEnd(35) + ' → ' + m.tests + ' tests (' + m.reason + ')');
});

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('📊 RESUMEN:');
console.log('   Total módulos: ' + batchResults.modules.length);
console.log('   Con frontend: ' + withFrontend.length + ' (' + passedWithFE.length + ' PASSED, ' + failedWithFE.length + ' FAILED)');
console.log('   Sin frontend (integrados): ' + noFrontendIntegrated.length);
console.log('   Sin frontend (necesitan creación): ' + noFrontendNeedCreation.length);
console.log('═══════════════════════════════════════════════════════════');

// Guardar lista de módulos sin frontend para delegación
const toDelegate = noFrontendNeedCreation.map(m => m.key);
fs.writeFileSync(
  './tests/e2e/results/modules-need-frontend.json',
  JSON.stringify({ modules: toDelegate, total: toDelegate.length }, null, 2)
);
console.log('\n✅ Lista guardada en: tests/e2e/results/modules-need-frontend.json');
