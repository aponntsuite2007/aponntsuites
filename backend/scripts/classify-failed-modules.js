const fs = require('fs');
const path = require('path');

// Cargar batch results
const batchResults = JSON.parse(fs.readFileSync('./tests/e2e/results/batch-test-results.json', 'utf8'));

// Filtrar módulos FAILED con 1/5 (configs auto-generated incompletos)
const failedModules = batchResults.modules
  .filter(m => m.status === 'FAILED')
  .map(m => m.moduleKey);

console.log('📋 CLASIFICACIÓN DE MÓDULOS FAILED\n');
console.log('═══════════════════════════════════════════════════════════\n');

const withFrontend = [];
const noFrontend = [];

failedModules.forEach(moduleKey => {
  const possiblePaths = [
    path.join('./public/js/modules', `${moduleKey}.js`),
    path.join('./public/js/modules', `${moduleKey}-controller.js`),
    path.join('./public/js/modules', `${moduleKey}-module.js`),
    path.join('./public/js/modules', `${moduleKey}-dashboard.js`),
    path.join('./public/js/modules', `${moduleKey}-manager.js`)
  ];

  let hasFrontend = false;
  let frontendPath = null;

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      hasFrontend = true;
      frontendPath = filePath;
      break;
    }
  }

  if (hasFrontend) {
    // Leer archivo para ver si tiene selectores/UI
    const sourceCode = fs.readFileSync(frontendPath, 'utf8');
    const hasModalOrUI = sourceCode.match(/(showModuleContent|modal|innerHTML|querySelector|getElementById)/gi);

    if (hasModalOrUI) {
      withFrontend.push({ key: moduleKey, path: frontendPath.replace('./public/js/modules/', '') });
    } else {
      noFrontend.push({ key: moduleKey, reason: 'Código sin UI elements' });
    }
  } else {
    noFrontend.push({ key: moduleKey, reason: 'No existe archivo JS' });
  }
});

console.log(`✅ MÓDULOS CON FRONTEND (${withFrontend.length}):`);
console.log('   (Reparar config E2E + código si es necesario)\n');
withFrontend.forEach((m, i) => {
  console.log(`   ${i + 1}. ${m.key.padEnd(35)} → ${m.path}`);
});

console.log(`\n\n⚠️  MÓDULOS SIN FRONTEND (${noFrontend.length}):`);
console.log('   (Delegar creación de frontend a otra sesión)\n');
noFrontend.forEach((m, i) => {
  console.log(`   ${i + 1}. ${m.key.padEnd(35)} → ${m.reason}`);
});

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('📊 RESUMEN:');
console.log(`   Total FAILED: ${failedModules.length}`);
console.log(`   Con frontend (reparar): ${withFrontend.length}`);
console.log(`   Sin frontend (delegar): ${noFrontend.length}`);
console.log('═══════════════════════════════════════════════════════════\n');

// Guardar resultados
const result = {
  withFrontend: withFrontend.map(m => m.key),
  noFrontend: noFrontend.map(m => m.key),
  summary: {
    total: failedModules.length,
    toRepair: withFrontend.length,
    toDelegate: noFrontend.length
  }
};

fs.writeFileSync(
  './tests/e2e/results/failed-modules-classification.json',
  JSON.stringify(result, null, 2)
);

console.log('✅ Clasificación guardada en: tests/e2e/results/failed-modules-classification.json\n');

console.log('📋 PRÓXIMO PASO:');
console.log(`   1. Reparar configs de ${withFrontend.length} módulos con frontend`);
console.log(`   2. Pasar lista de ${noFrontend.length} módulos sin frontend a otra sesión`);
console.log('   3. Re-ejecutar batch testing para verificar 100% PASSED\n');
