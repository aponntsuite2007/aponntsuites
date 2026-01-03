const fs = require('fs');
const path = require('path');

/**
 * Script para completar configs E2E auto-generated
 * Extrae información de:
 * - Código fuente del módulo (public/js/modules/*.js)
 * - Schema de base de datos (src/models/*.js)
 * - Registry de módulos (modules-registry.json)
 */

const configsDir = './tests/e2e/configs';
const modulesDir = './public/js/modules';
const modelsDir = './src/models';

// Cargar batch results para saber cuáles fallaron
const batchResults = JSON.parse(fs.readFileSync('./tests/e2e/results/batch-test-results.json', 'utf8'));

const failedModules = batchResults.modules
  .filter(m => m.status === 'FAILED' && m.passing === 1 && m.total === 5)
  .map(m => m.moduleKey);

console.log('🔧 COMPLETANDO CONFIGS AUTO-GENERATED\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`📊 Total módulos FAILED con 1/5: ${failedModules.length}\n`);

failedModules.forEach((moduleKey, index) => {
  console.log(`${index + 1}. ${moduleKey}`);
});

console.log('\n═══════════════════════════════════════════════════════════\n');

// Función para analizar un módulo JS y extraer selectores
function analyzeModuleSource(moduleKey) {
  const possiblePaths = [
    path.join(modulesDir, `${moduleKey}.js`),
    path.join(modulesDir, `${moduleKey}-controller.js`),
    path.join(modulesDir, `${moduleKey}-module.js`)
  ];

  let sourceCode = null;
  let sourcePath = null;

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      sourceCode = fs.readFileSync(filePath, 'utf8');
      sourcePath = filePath;
      break;
    }
  }

  if (!sourceCode) {
    return null;
  }

  console.log(`   📄 Código fuente: ${sourcePath}`);

  // Extraer selectores comunes (regex patterns)
  const selectors = {};

  // Buscar botones de crear
  const createBtnMatches = sourceCode.match(/onclick\s*=\s*['"](.*?\.showAddModal\(\)|.*?\.create\(\)|.*?\.add\(\))['"]/gi);
  if (createBtnMatches && createBtnMatches.length > 0) {
    selectors.createButton = createBtnMatches[0].match(/onclick\s*=\s*['"]([^'"]+)['"]/i)[1];
    console.log(`   ✅ Create button found: onclick="${selectors.createButton}"`);
  }

  // Buscar selectores de tabla/lista
  const tableMatches = sourceCode.match(/(#\w+Container|#\w+Table|\.data-table)/gi);
  if (tableMatches && tableMatches.length > 0) {
    selectors.container = tableMatches[0];
    console.log(`   ✅ Container found: ${selectors.container}`);
  }

  // Buscar tabs
  const tabMatches = sourceCode.match(/data-view\s*=\s*['"](\w+)['"]/gi);
  if (tabMatches && tabMatches.length > 0) {
    selectors.tabs = tabMatches.map(match => {
      const viewName = match.match(/data-view\s*=\s*['"](\w+)['"]/i)[1];
      return { view: viewName, selector: `[data-view="${viewName}"]` };
    });
    console.log(`   ✅ Tabs found: ${selectors.tabs.length} tabs`);
  }

  // Buscar inputs en el código (IDs)
  const inputMatches = sourceCode.match(/#\w+Input|#\w+Select|#\w+Date|#\w+Textarea/gi);
  if (inputMatches && inputMatches.length > 0) {
    selectors.inputs = [...new Set(inputMatches)];
    console.log(`   ✅ Inputs found: ${selectors.inputs.length} campos`);
  }

  return selectors;
}

// Función para buscar modelo de BD
function findDatabaseModel(moduleKey) {
  const possibleModelNames = [
    moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).replace(/-./g, x => x[1].toUpperCase()),
    moduleKey.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(''),
    moduleKey.replace(/-/g, '_')
  ];

  for (const modelName of possibleModelNames) {
    const modelPath = path.join(modelsDir, `${modelName}.js`);
    if (fs.existsSync(modelPath)) {
      console.log(`   🗄️  Modelo BD: ${modelPath}`);
      return modelPath;
    }
  }

  return null;
}

// Procesar cada módulo failed
console.log('🔍 ANALIZANDO MÓDULOS...\n');

const analysisResults = [];

failedModules.slice(0, 5).forEach((moduleKey, index) => {
  console.log(`\n[${index + 1}/${Math.min(5, failedModules.length)}] 📦 ${moduleKey}`);
  console.log('─'.repeat(60));

  const analysis = {
    moduleKey,
    sourceCode: analyzeModuleSource(moduleKey),
    model: findDatabaseModel(moduleKey),
    status: 'analyzed'
  };

  analysisResults.push(analysis);

  if (!analysis.sourceCode) {
    console.log('   ⚠️  No se encontró código fuente del módulo');
  }

  if (!analysis.model) {
    console.log('   ⚠️  No se encontró modelo de base de datos');
  }
});

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('📊 RESUMEN DE ANÁLISIS:');
console.log(`   Módulos analizados: ${analysisResults.length}`);
console.log(`   Con código fuente: ${analysisResults.filter(a => a.sourceCode).length}`);
console.log(`   Con modelo BD: ${analysisResults.filter(a => a.model).length}`);
console.log('═══════════════════════════════════════════════════════════\n');

// Guardar resultados
fs.writeFileSync(
  './tests/e2e/results/config-analysis.json',
  JSON.stringify({ modules: analysisResults, total: analysisResults.length }, null, 2)
);

console.log('✅ Análisis guardado en: tests/e2e/results/config-analysis.json\n');

// Próximo paso: mostrar qué configs necesitan ser completados
console.log('📋 PRÓXIMO PASO:');
console.log('   1. Revisar config-analysis.json para ver qué se encontró');
console.log('   2. Usar Task agent para completar configs con selectores reales');
console.log('   3. Re-ejecutar batch testing para alcanzar 100% PASSED\n');
