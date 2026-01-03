/**
 * Script para aplicar MEJORA #8 y #9 en universal-modal-advanced.e2e.spec.js
 * Reemplaza las 3 ocurrencias de waitForFunction con la nueva función helper
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../modules/universal-modal-advanced.e2e.spec.js');

console.log('📝 Aplicando MEJORA #8 y #9...');
console.log(`📂 Archivo: ${filePath}`);

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// PASO 1: Agregar require del helper después de los otros requires
const requirePattern = /(const ssotHelper = require\('\.\.\/helpers\/ssot-analyzer\.helper'\);)/;
const newRequire = `$1\nconst { waitForActiveModulesWithRetry } = require('../helpers/activemodules-retry.helper'); // MEJORA #8/#9`;

if (!content.includes('activemodules-retry.helper')) {
  content = content.replace(requirePattern, newRequire);
  console.log('✅ Require agregado');
} else {
  console.log('ℹ️  Require ya existe, saltando...');
}

// PASO 2: Reemplazar las 3 ocurrencias de waitForFunction por la nueva función
const oldPattern = /\/\/ Esperar a que window\.activeModules esté cargado - MEJORA #7: Timeout explícito\s+console\.log\(`   ⏳ Esperando a que window\.activeModules se cargue\.\.\.`\);\s+await page\.waitForFunction\(\(\) => window\.activeModules && window\.activeModules\.length > 0, \{\s+timeout: 15000 \/\/ MEJORA #7: 15s máximo \(era 10s\)\s+\}\);\s+console\.log\(`   ✅ activeModules cargado: \$\{await page\.evaluate\(\(\) => window\.activeModules\?\.length \|\| 0\)\} módulos`\);/g;

const newCode = `// MEJORA #8/#9: Esperar activeModules con retry (25s timeout + exponential backoff)
    await waitForActiveModulesWithRetry(page);`;

const replacements = (content.match(oldPattern) || []).length;
content = content.replace(oldPattern, newCode);

console.log(`✅ ${replacements} ocurrencias reemplazadas`);

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');
console.log('💾 Archivo guardado exitosamente');
console.log('\n🎯 MEJORA #8 y #9 aplicadas:');
console.log('   - Timeout aumentado: 15s → 25s');
console.log('   - Retry con exponential backoff: 3 intentos (5s, 10s, 15s)');
