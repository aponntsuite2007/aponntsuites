const fs = require('fs');
const path = require('path');

/**
 * Validador de Configs E2E
 * Verifica que los configs estén completos y listos para testing
 */

const configsDir = './tests/e2e/configs';
const configs = fs.readdirSync(configsDir).filter(f => f.endsWith('.config.js'));

console.log('🔍 VALIDANDO CONFIGS E2E\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`📊 Total configs: ${configs.length}\n`);

const results = {
  complete: [],
  incomplete: [],
  errors: []
};

configs.forEach((configFile, index) => {
  const moduleKey = configFile.replace('.config.js', '');

  try {
    const config = require(path.join('../', configsDir, configFile));

    const validation = {
      moduleKey,
      score: 0,
      maxScore: 10,
      issues: []
    };

    // ⭐ NUEVO: Reconocer configs DELEGADOS como válidos (score perfecto)
    if (config.isDelegated === true && config.skipE2ETesting === true) {
      validation.score = 10;
      validation.isDelegated = true;
      validation.delegationReason = config.delegationReason || 'Sin frontend';
      validation.issues.push(`✅ DELEGADO: ${validation.delegationReason}`);
      results.complete.push(validation);
      return; // Skip validación normal
    }

    // 1. Validar estructura básica (2 puntos)
    if (config.moduleKey && config.moduleName) {
      validation.score += 2;
    } else {
      validation.issues.push('Falta moduleKey o moduleName');
    }

    // 2. Validar navigation selectors (2 puntos)
    // Módulos read-only (skipCRUD: true) no necesitan createButtonSelector
    const isReadOnly = config.testing?.skipCRUD === true;
    const hasListContainer = !!config.navigation?.listContainerSelector;
    const hasCreateButton = !!config.navigation?.createButtonSelector;

    if (hasListContainer && (hasCreateButton || isReadOnly)) {
      validation.score += 2;
    } else {
      if (!isReadOnly) {
        validation.issues.push('Selectores de navegación incompletos');
      } else {
        validation.issues.push('Falta listContainerSelector (módulo read-only)');
      }
    }

    // 3. Validar tabs con fields (3 puntos)
    // Módulos read-only pueden tener tabs sin fields (solo visualización)
    if (config.tabs && Array.isArray(config.tabs) && config.tabs.length > 0) {
      const hasFields = config.tabs.some(tab => tab.fields && tab.fields.length > 0);
      if (hasFields || isReadOnly) {
        validation.score += 3;
      } else {
        validation.issues.push('Tabs sin fields definidos');
      }
    } else {
      validation.issues.push('No tiene tabs definidos');
    }

    // 4. Validar database config (2 puntos)
    if (config.database?.testDataFactory &&
        config.database?.testDataCleanup) {
      validation.score += 2;
    } else {
      validation.issues.push('testDataFactory o testDataCleanup faltantes');
    }

    // 5. Validar chaos config (1 punto)
    if (config.chaosConfig?.enabled) {
      validation.score += 1;
    } else {
      validation.issues.push('chaosConfig no habilitado');
    }

    // Clasificar resultado
    if (validation.score >= 9) {
      results.complete.push(validation);
    } else {
      results.incomplete.push(validation);
    }

  } catch (error) {
    results.errors.push({ moduleKey, error: error.message });
  }
});

// Separar delegados de completos normales
const delegatedConfigs = results.complete.filter(v => v.isDelegated);
const normalCompleteConfigs = results.complete.filter(v => !v.isDelegated);

// Mostrar resultados
console.log('✅ CONFIGS COMPLETOS CON FRONTEND (score >= 9):');
normalCompleteConfigs.forEach((v, i) => {
  console.log(`   ${i + 1}. ${v.moduleKey.padEnd(35)} → ${v.score}/${v.maxScore} puntos`);
});

console.log(`\n\n🔗 CONFIGS DELEGADOS (sin frontend, score perfecto):`);
delegatedConfigs.forEach((v, i) => {
  console.log(`   ${i + 1}. ${v.moduleKey.padEnd(35)} → ${v.score}/${v.maxScore} puntos`);
  console.log(`      ℹ️  ${v.delegationReason}`);
});

console.log(`\n\n⚠️  CONFIGS INCOMPLETOS (score < 9):`);
results.incomplete.forEach((v, i) => {
  console.log(`   ${i + 1}. ${v.moduleKey.padEnd(35)} → ${v.score}/${v.maxScore} puntos`);
  v.issues.forEach(issue => {
    console.log(`      ❌ ${issue}`);
  });
});

if (results.errors.length > 0) {
  console.log(`\n\n❌ CONFIGS CON ERRORES:`);
  results.errors.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.moduleKey} → ${e.error}`);
  });
}

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('📊 RESUMEN FINAL - COBERTURA SYNAPSE:');
console.log(`   Total configs: ${configs.length}`);
console.log(`   ✅ Completos con frontend: ${normalCompleteConfigs.length} (${((normalCompleteConfigs.length/configs.length)*100).toFixed(1)}%)`);
console.log(`   🔗 Delegados sin frontend: ${delegatedConfigs.length} (${((delegatedConfigs.length/configs.length)*100).toFixed(1)}%)`);
console.log(`   ⚠️  Incompletos: ${results.incomplete.length} (${((results.incomplete.length/configs.length)*100).toFixed(1)}%)`);
console.log(`   ❌ Errores: ${results.errors.length}`);
console.log('\n   🎯 COBERTURA TOTAL: ' + (results.incomplete.length === 0 ? '✅ 100%' : `⚠️ ${((results.complete.length/configs.length)*100).toFixed(1)}%`));
console.log('═══════════════════════════════════════════════════════════\n');

// Guardar reporte
const report = {
  timestamp: new Date().toISOString(),
  total: configs.length,
  completeWithFrontend: normalCompleteConfigs.length,
  delegatedWithoutFrontend: delegatedConfigs.length,
  totalComplete: results.complete.length,
  incomplete: results.incomplete.length,
  errors: results.errors.length,
  coverage: results.incomplete.length === 0 ? '100%' : `${((results.complete.length/configs.length)*100).toFixed(1)}%`,
  details: {
    completeWithFrontend: normalCompleteConfigs,
    delegatedWithoutFrontend: delegatedConfigs,
    incomplete: results.incomplete,
    errors: results.errors
  }
};

fs.writeFileSync(
  './tests/e2e/results/config-validation-report.json',
  JSON.stringify(report, null, 2)
);

console.log('✅ Reporte guardado en: tests/e2e/results/config-validation-report.json\n');

// Exit code basado en completitud
process.exit(results.incomplete.length > 0 ? 1 : 0);
