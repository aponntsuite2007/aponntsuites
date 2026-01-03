/**
 * ACTUALIZAR 13 CONFIGS E2E CON FRONTEND REAL
 *
 * Los 13 módulos marcados como "delegados" SÍ tienen frontend.
 * Este script actualiza sus configs con selectores REALES.
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Actualizando 13 configs E2E con frontend REAL...\n');

// Leer el documento con configs actualizados
const docPath = path.join(__dirname, '../E2E-CONFIGS-13-MODULOS-UPDATED.md');
const configsDir = path.join(__dirname, '../tests/e2e/configs');

if (!fs.existsSync(docPath)) {
  console.error('❌ No se encontró E2E-CONFIGS-13-MODULOS-UPDATED.md');
  process.exit(1);
}

const docContent = fs.readFileSync(docPath, 'utf8');

// Extraer configs de código JavaScript del markdown
const configBlocks = docContent.match(/```javascript\n\/\*\*[\s\S]*?module\.exports = \{[\s\S]*?\};[\s\S]*?```/g);

if (!configBlocks || configBlocks.length === 0) {
  console.error('❌ No se encontraron configs en el documento');
  process.exit(1);
}

console.log(`📄 Encontrados ${configBlocks.length} configs en el documento\n`);

let updated = 0;
let skipped = 0;

configBlocks.forEach((block, index) => {
  // Extraer código JavaScript limpio
  const jsCode = block.replace(/```javascript\n/, '').replace(/\n```$/, '');

  // Extraer moduleKey del código
  const moduleKeyMatch = jsCode.match(/moduleKey:\s*['"]([^'"]+)['"]/);

  if (!moduleKeyMatch) {
    console.log(`⚠️  Config ${index + 1}: No se pudo extraer moduleKey, saltando...`);
    skipped++;
    return;
  }

  const moduleKey = moduleKeyMatch[1];
  const configPath = path.join(configsDir, `${moduleKey}.config.js`);

  // Verificar si el config existe
  if (!fs.existsSync(configPath)) {
    console.log(`⚠️  ${moduleKey}: Archivo no existe, saltando...`);
    skipped++;
    return;
  }

  // Leer config actual
  const currentConfig = fs.readFileSync(configPath, 'utf8');

  // Verificar si es un config "delegado" (tiene isDelegated: true)
  if (!currentConfig.includes('isDelegated: true')) {
    console.log(`⏭️  ${moduleKey}: Ya tiene config completo, saltando...`);
    skipped++;
    return;
  }

  // Escribir nuevo config
  fs.writeFileSync(configPath, jsCode, 'utf8');
  console.log(`✅ ${moduleKey}: Config actualizado con frontend REAL`);
  updated++;
});

console.log('\n' + '='.repeat(70));
console.log(`📊 RESUMEN:`);
console.log(`   ✅ Actualizados: ${updated}`);
console.log(`   ⏭️  Saltados: ${skipped}`);
console.log(`   📁 Total procesados: ${configBlocks.length}`);
console.log('='.repeat(70));

if (updated > 0) {
  console.log('\n✅ Configs actualizados correctamente');
  console.log('💡 Próximo paso: node scripts/validate-e2e-configs.js');
} else {
  console.log('\n⚠️  No se actualizó ningún config');
}
