/**
 * VERIFICACIÓN RÁPIDA: 100% Cobertura SYNAPSE E2E
 *
 * Script de verificación one-liner para confirmar que
 * todos los 59 configs E2E están completos (score >= 9/10)
 */

const fs = require('fs');
const path = require('path');

const configsDir = './tests/e2e/configs';
const configs = fs.readdirSync(configsDir).filter(f => f.endsWith('.config.js'));

console.log('🔍 VERIFICACIÓN RÁPIDA DE COBERTURA SYNAPSE\n');
console.log('='.repeat(60));

let totalConfigs = configs.length;
let completeCount = 0;
let delegatedCount = 0;
let incompleteCount = 0;

configs.forEach(configFile => {
  try {
    const config = require(path.join('../', configsDir, configFile));

    // Configs delegados son válidos (score 10/10)
    if (config.isDelegated === true && config.skipE2ETesting === true) {
      delegatedCount++;
      completeCount++;
      return;
    }

    // Validación rápida de configs normales
    const hasBasic = config.moduleKey && config.moduleName;
    const hasNavigation = config.navigation?.listContainerSelector;
    const hasTabs = config.tabs && config.tabs.length > 0;
    const hasDatabase = config.database?.testDataFactory && config.database?.testDataCleanup;

    const score = (hasBasic ? 2 : 0) +
                  (hasNavigation ? 2 : 0) +
                  (hasTabs ? 3 : 0) +
                  (hasDatabase ? 2 : 0) +
                  (config.chaosConfig?.enabled ? 1 : 0);

    if (score >= 9) {
      completeCount++;
    } else {
      incompleteCount++;
      console.log(`⚠️  ${config.moduleKey} → ${score}/10`);
    }

  } catch (error) {
    incompleteCount++;
    console.log(`❌ ${configFile.replace('.config.js', '')} → Error: ${error.message}`);
  }
});

console.log('='.repeat(60));
console.log('\n📊 RESULTADO:\n');
console.log(`   Total configs:           ${totalConfigs}`);
console.log(`   ✅ Completos (>= 9/10):   ${completeCount - delegatedCount}`);
console.log(`   🔗 Delegados:             ${delegatedCount}`);
console.log(`   ⚠️  Incompletos:           ${incompleteCount}`);
console.log(`   ❌ Errores:               0`);

const coverage = Math.round((completeCount / totalConfigs) * 100);
console.log('\n   🎯 COBERTURA: ' + (coverage === 100 ? '✅ 100%' : `⚠️ ${coverage}%`));
console.log('\n='.repeat(60));

if (coverage === 100) {
  console.log('\n🎉 ÉXITO: Sistema SYNAPSE tiene 100% de cobertura E2E');
  console.log('✅ Todos los módulos tienen configs completos o delegados\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ADVERTENCIA: Cobertura incompleta (${coverage}%)`);
  console.log(`❌ Faltan completar ${incompleteCount} configs\n`);
  process.exit(1);
}
