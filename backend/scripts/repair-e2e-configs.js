const fs = require('fs');
const path = require('path');

/**
 * Script para REPARAR configs E2E auto-generated
 * Extrae selectores del código fuente real y genera configs completos
 */

const classification = JSON.parse(fs.readFileSync('./tests/e2e/results/failed-modules-classification.json', 'utf8'));
const modulesToRepair = classification.withFrontend;

console.log('🔧 REPARANDO CONFIGS E2E\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`📊 Módulos a reparar: ${modulesToRepair.length}\n`);

let repairedCount = 0;
let errorCount = 0;

modulesToRepair.forEach((moduleKey, index) => {
  console.log(`\n[${index + 1}/${modulesToRepair.length}] 📦 ${moduleKey}`);
  console.log('─'.repeat(60));

  try {
    // 1. Buscar código fuente
    const possiblePaths = [
      `./public/js/modules/${moduleKey}.js`,
      `./public/js/modules/${moduleKey}-controller.js`,
      `./public/js/modules/${moduleKey}-dashboard.js`,
      `./public/js/modules/${moduleKey}-manager.js`
    ];

    let sourceCode = null;
    let sourcePath = null;

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sourceCode = fs.readFileSync(p, 'utf8');
        sourcePath = p;
        break;
      }
    }

    if (!sourceCode) {
      console.log('   ❌ No se encontró código fuente');
      errorCount++;
      return;
    }

    console.log(`   📄 Fuente: ${sourcePath.replace('./public/js/modules/', '')}`);

    // 2. Extraer selectores del código
    const selectors = extractSelectors(sourceCode, moduleKey);

    // 3. Generar config reparado
    const newConfig = generateConfig(moduleKey, selectors, sourceCode);

    // 4. Guardar config reparado
    const configPath = `./tests/e2e/configs/${moduleKey}.config.js`;
    fs.writeFileSync(configPath, newConfig);

    console.log(`   ✅ Config reparado: ${selectors.found.length} selectores extraídos`);
    repairedCount++;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errorCount++;
  }
});

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('📊 RESUMEN:');
console.log(`   Total: ${modulesToRepair.length}`);
console.log(`   ✅ Reparados: ${repairedCount}`);
console.log(`   ❌ Errores: ${errorCount}`);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 PRÓXIMO PASO:');
console.log('   Re-ejecutar batch testing: node tests/e2e/scripts/run-all-modules-tests.js\n');

// ═════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═════════════════════════════════════════════════════════════

function extractSelectors(sourceCode, moduleKey) {
  const found = [];

  // Buscar container principal
  const containerMatches = sourceCode.match(/#(\w+Container|mainContent)/gi);
  const container = containerMatches ? containerMatches[0] : '#mainContent';
  found.push({ type: 'container', value: container });

  // Buscar botón crear
  const createMatches = sourceCode.match(/onclick\s*=\s*['"](.*?)(showAddModal|showCreateModal|create|add)\([^)]*\)['"]/gi);
  let createButton = 'button:has-text("Crear"), button:has-text("Nuevo")';
  if (createMatches && createMatches.length > 0) {
    const funcName = createMatches[0].match(/['"]([^'"]+)['"]/)[1];
    createButton = `button[onclick*="${funcName}"]`;
    found.push({ type: 'createButton', value: createButton });
  }

  // Buscar tabs
  const tabMatches = sourceCode.match(/data-view\s*=\s*['"](\w+)['"]/gi);
  const tabs = [];
  if (tabMatches && tabMatches.length > 0) {
    tabMatches.forEach(match => {
      const view = match.match(/data-view\s*=\s*['"](\w+)['"]/i)[1];
      tabs.push(view);
    });
    found.push({ type: 'tabs', value: tabs.join(', ') });
  }

  // Buscar inputs (IDs)
  const inputMatches = sourceCode.match(/#(\w+Input|\w+Select|\w+Date|\w+Textarea|\w+Field)/gi);
  const inputs = [];
  if (inputMatches && inputMatches.length > 0) {
    const uniqueInputs = [...new Set(inputMatches)];
    uniqueInputs.slice(0, 10).forEach(inp => inputs.push(inp));
    found.push({ type: 'inputs', value: inputs.join(', ') });
  }

  // Buscar modal
  const hasModal = sourceCode.match(/(modal|Modal|modalOverlay|universalModal)/gi);
  if (hasModal) {
    found.push({ type: 'modal', value: '.modal, #universalModal, .modal-overlay' });
  }

  return { found, container, createButton, tabs, inputs };
}

function generateConfig(moduleKey, selectors, sourceCode) {
  const moduleName = moduleKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const category = determineCategory(sourceCode);

  // Generar tabs array
  const tabsArray = selectors.tabs && selectors.tabs.length > 0
    ? selectors.tabs.map(view => `
    {
      key: '${view}',
      label: '${view.charAt(0).toUpperCase() + view.slice(1)}',
      tabSelector: '[data-view="${view}"]',
      isDefault: ${view === selectors.tabs[0]},
      fields: [
        // TODO: Agregar campos específicos
      ]
    }`).join(',')
    : `
    {
      key: 'general',
      label: 'General',
      isDefault: true,
      fields: [
        // TODO: Agregar campos específicos
      ]
    }`;

  return `/**
 * CONFIGURACIÓN E2E - ${moduleName}
 * Auto-reparado con selectores extraídos del código fuente
 */

module.exports = {
  moduleKey: '${moduleKey}',
  moduleName: '${moduleName}',
  category: '${category}',

  baseUrl: 'http://localhost:9998/panel-empresa.html#${moduleKey}',

  navigation: {
    listContainerSelector: '${selectors.container}',
    createButtonSelector: '${selectors.createButton}',
    openModalSelector: '${selectors.container}', // Fallback
    modalSelector: '.modal, #universalModal',
    closeModalSelector: 'button.close, button:has-text("Cerrar")'
  },

  tabs: [${tabsArray}
  ],

  database: {
    table: '${moduleKey.replace(/-/g, '_')}s', // Asumir tabla plural
    primaryKey: 'id',

    async testDataFactory(db) {
      // TODO: Implementar factory específico
      console.log('   ⏭️  testDataFactory no implementado para ${moduleKey}');
      return null;
    },

    async testDataCleanup(db, id) {
      if (id) {
        console.log('   ⏭️  testDataCleanup no implementado para ${moduleKey}');
      }
    }
  },

  chaosConfig: {
    enabled: true,
    monkeyTest: { duration: 15000, maxActions: 50 },
    fuzzing: { enabled: true, fields: [] },
    raceConditions: { enabled: true, scenarios: [] },
    stressTest: { enabled: true, createMultipleRecords: 50 }
  },

  brainIntegration: {
    enabled: true,
    expectedIssues: []
  }
};
`;
}

function determineCategory(sourceCode) {
  if (sourceCode.includes('panel-administrativo') || sourceCode.includes('admin')) {
    return 'panel-administrativo';
  }
  if (sourceCode.includes('dashboard')) {
    return 'panel-empresa-dashboard';
  }
  return 'panel-empresa';
}
