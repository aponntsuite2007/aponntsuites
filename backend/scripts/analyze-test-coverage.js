/**
 * Analiza cobertura de tests E2E Advanced
 * Muestra qué módulos se testearon y cuáles faltan
 */

const registry = require('../src/auditor/registry/modules-registry.json');

// Módulos testeados en la sesión nocturna
const testedModules = [
  'users',
  'attendance',
  'departments',
  'shifts',
  'reports',
  'notifications',
  'kiosks'
];

console.log('📊 ANÁLISIS DE COBERTURA E2E TESTING\n');
console.log('═'.repeat(70));

// Total
const allModules = registry.modules.map(m => m.id);
const totalModules = allModules.length;
const totalTested = testedModules.length;
const totalPending = totalModules - totalTested;

console.log(`\n🎯 RESUMEN:`);
console.log(`   Total módulos en el sistema: ${totalModules}`);
console.log(`   ✅ Testeados: ${totalTested} (${((totalTested/totalModules)*100).toFixed(1)}%)`);
console.log(`   ⏳ Pendientes: ${totalPending} (${((totalPending/totalModules)*100).toFixed(1)}%)`);

// Módulos testeados
console.log(`\n✅ MÓDULOS TESTEADOS (${totalTested}):`);
console.log('─'.repeat(70));
testedModules.forEach((moduleId, i) => {
  const moduleInfo = registry.modules.find(m => m.id === moduleId);
  if (moduleInfo) {
    console.log(`${i+1}. ${moduleId.padEnd(25)} - ${moduleInfo.name}`);
  } else {
    console.log(`${i+1}. ${moduleId.padEnd(25)} - [NO ENCONTRADO EN REGISTRY]`);
  }
});

// Módulos pendientes
console.log(`\n⏳ MÓDULOS PENDIENTES (${totalPending}):`);
console.log('─'.repeat(70));

const pendingModules = registry.modules
  .filter(m => !testedModules.includes(m.id))
  .sort((a, b) => {
    // Ordenar por: core primero, luego por categoría
    if (a.commercial.is_core && !b.commercial.is_core) return -1;
    if (!a.commercial.is_core && b.commercial.is_core) return 1;
    return a.category.localeCompare(b.category);
  });

let currentCategory = '';
pendingModules.forEach((module, i) => {
  // Mostrar separador por categoría
  if (module.category !== currentCategory) {
    currentCategory = module.category;
    console.log(`\n   📁 ${currentCategory.toUpperCase()}:`);
  }

  const coreLabel = module.commercial.is_core ? '⭐' : '  ';
  console.log(`${coreLabel} ${(i+1).toString().padStart(2)}. ${module.id.padEnd(30)} - ${module.name}`);
});

console.log('\n' + '═'.repeat(70));
console.log('\n💡 LEYENDA:');
console.log('   ⭐ = Módulo CORE (esencial)');
console.log('      = Módulo adicional/premium');

console.log('\n🎯 PRÓXIMO PASO:');
console.log('   Ejecutar tests E2E para los 65 módulos pendientes');
console.log('   Comando: node scripts/run-e2e-all-modules.js');
console.log('\n');
