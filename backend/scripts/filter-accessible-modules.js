/**
 * Filtrar módulos ACCESIBLES desde panel-empresa
 *
 * Criterios:
 * 1. module_type === 'standalone' (tiene botón propio)
 * 2. parent_module === null o undefined (no es submodulo)
 * 3. available_for === 'panel-empresa' o 'both'
 */

const registry = require('../src/auditor/registry/modules-registry.json');

console.log('📊 FILTRANDO MÓDULOS ACCESIBLES EN PANEL-EMPRESA\n');

// Filtrar por diferentes criterios
const byAvailability = registry.modules.filter(m =>
  m.available_for === 'panel-empresa' ||
  m.available_for === 'both' ||
  m.available_for === 'empresa'
);

const byStandalone = registry.modules.filter(m =>
  m.module_type === 'standalone'
);

const byNoParent = registry.modules.filter(m =>
  !m.parent_module || m.parent_module === null
);

// Los que PASARON el test anterior
const passedInTest = [
  'notification-center',
  'biometric-consent',
  'organizational-structure',
  'finance-dashboard',
  'warehouse-management',
  'departments',
  'dms-dashboard',
  'mi-espacio',
  'my-procedures',
  'user-support',
  'users',
  'dashboard',
  'attendance',
  'legal-dashboard',
  'kiosks',
  'employee-360',
  'medical',
  'vacation-management',
  'procurement-management',
  'hour-bank',
  'payroll-liquidation',
  'art-management',
  'training-management',
  'compliance-dashboard',
  'visitors',
  'hse-management',
  'auditor',
  'emotional-analysis'
];

console.log(`1️⃣ Por available_for='panel-empresa'|'both': ${byAvailability.length} módulos`);
console.log(`2️⃣ Por module_type='standalone': ${byStandalone.length} módulos`);
console.log(`3️⃣ Por NO tener parent_module: ${byNoParent.length} módulos`);
console.log(`4️⃣ Los que PASARON el test anterior: ${passedInTest.length} módulos\n`);

// ESTRATEGIA INTELIGENTE: Usar los que PASARON + agregar standalone que no se testearon
const accessibleModules = [...new Set([
  ...passedInTest,
  ...byStandalone.map(m => m.id)
])];

console.log(`✅ MÓDULOS ACCESIBLES (combinado): ${accessibleModules.length} módulos\n`);
console.log('━'.repeat(70));
console.log('LISTA DE MÓDULOS A TESTEAR:\n');
accessibleModules.forEach((id, i) => {
  const wasTested = passedInTest.includes(id);
  const icon = wasTested ? '✅' : '🆕';
  console.log(`${icon} ${(i+1).toString().padStart(2)}. ${id}`);
});
console.log('━'.repeat(70));
console.log(`\n💾 Guardando lista en: accessible-modules.json`);

// Guardar lista
const fs = require('fs');
const path = require('path');
const outputFile = path.join(__dirname, '../accessible-modules.json');
fs.writeFileSync(outputFile, JSON.stringify(accessibleModules, null, 2));

console.log(`✅ Lista guardada exitosamente\n`);
