const reg = require('../src/config/modules-registry.json');

console.log('📊 LISTA COMPLETA DE MÓDULOS PARA CLASIFICAR');
console.log('='.repeat(80));
console.log('');

console.log('🛠️  ADMINISTRATIVOS (7 - ya marcados como NO comercializables):');
console.log('');
const admin = reg.modules.filter(m => m.isAdministrative);
admin.forEach((m, i) => {
  console.log(`  ${i+1}. [${m.key.padEnd(35)}] - ${m.name}`);
});

console.log('');
console.log('💰 COMERCIALES ACTUALES (50):');
console.log('');

console.log('--- CORE COMERCIALES (11):');
const coreCommercial = reg.modules.filter(m => m.is_core && !m.isAdministrative);
coreCommercial.forEach((m, i) => {
  console.log(`  ${i+1}. [${m.key.padEnd(35)}] - ${m.name}`);
});

console.log('');
console.log('--- PREMIUM (39):');
const premium = reg.modules.filter(m => !m.is_core && !m.isAdministrative);
premium.forEach((m, i) => {
  console.log(`  ${(i+1)+''.padStart(2)}. [${m.key.padEnd(35)}] - ${m.name}`);
});

console.log('');
console.log('='.repeat(80));
console.log('📝 INSTRUCCIONES:');
console.log('   Revisa la lista PREMIUM y dime cuáles NO deberían ser comerciales');
console.log('   (si hay más módulos administrativos ocultos)');
console.log('='.repeat(80));
