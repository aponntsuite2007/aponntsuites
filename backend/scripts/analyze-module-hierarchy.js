const registry = require('../src/auditor/registry/modules-registry.json');
const modules = registry.modules;

console.log('TOTAL MÓDULOS en registry:', modules.length);

// Módulos con parent (submódulos)
const withParent = modules.filter(m => m.parent_module);
console.log('\nMÓDULOS CON PARENT (submódulos):', withParent.length);
withParent.forEach(m => {
  console.log(`  - ${m.id} → parent: ${m.parent_module}`);
});

// Módulos SIN parent (principales - los 35 comerciales)
const withoutParent = modules.filter(m => !m.parent_module);
console.log('\n\nMÓDULOS SIN PARENT (principales comerciales):', withoutParent.length);
withoutParent.forEach(m => {
  console.log(`  - ${m.id}`);
});
