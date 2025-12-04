const reg = require('../src/config/modules-registry.json');

console.log('📊 CHECKING 4 CORRECTED MODULES IN REGISTRY:\n');

['attendance', 'departments', 'inbox', 'shifts'].forEach(key => {
  const m = reg.modules.find(mod => mod.key === key);
  if (m) {
    console.log(`✓ ${key.padEnd(20)} | is_core: ${m.is_core} | category: ${m.category}`);
  } else {
    console.log(`✗ ${key.padEnd(20)} | NOT FOUND`);
  }
});

console.log('\n📊 REGISTRY TOTALS:');
console.log(`Total modules: ${reg.modules.length}`);
console.log(`CORE: ${reg.modules.filter(m => m.is_core).length}`);
console.log(`PREMIUM: ${reg.modules.filter(m => !m.is_core).length}`);

console.log('\n📋 ALL CORE MODULES IN REGISTRY:');
reg.modules.filter(m => m.is_core).forEach(m => {
  console.log(`  ✓ ${m.key.padEnd(35)} | ${m.name}`);
});
