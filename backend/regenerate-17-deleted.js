/**
 * Regenerar EXACTAMENTE los 17 configs faltantes
 */
const fs = require('fs');
const path = require('path');

const MISSING_17 = [
  'companies', 'medical-associates', 'notifications', 'partners',
  'testing-metrics-dashboard', 'user-support', 'vendors',
  'admin-consent-management', 'associate-workflow-panel',
  'configurador-modulos', 'database-sync', 'deploy-manager-3stages',
  'hours-cube-dashboard', 'mi-espacio', 'notification-center',
  'partner-scoring-system', 'phase4-integrated-manager'
];

const configsDir = path.join(__dirname, 'tests/e2e/configs');

const TEMPLATE = (moduleKey) => {
  const date = new Date().toISOString().split('T')[0];
  const moduleName = moduleKey.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

  return `/**
 * E2E Test Config: ${moduleKey}
 * Generated: ${date}
 */

module.exports = {
  moduleKey: '${moduleKey}',
  moduleName: '${moduleName}',
  moduleDescription: 'Backend component - part of larger modules',

  selectors: {
    nav: '[data-module="${moduleKey}"]',
    button: 'button[data-module="${moduleKey}"]',
    form: 'form[id*="${moduleKey}"]',
    modal: '.modal:has([data-module="${moduleKey}"])',
    table: 'table[data-module="${moduleKey}"]',
    searchInput: 'input[type="search"]',
    submitButton: 'button[type="submit"]',
    closeButton: '.modal button.close, .modal .btn-close',
    deleteButton: 'button.btn-danger, button:has-text("Eliminar")',
    editButton: 'button.btn-warning, button:has-text("Editar")',
    viewButton: 'button.btn-info, button:has-text("Ver")',
    createButton: 'button.btn-success, button:has-text("Crear"), button:has-text("Agregar")'
  },

  navigation: {
    useModuleLoader: true,
    fallbackToDirectCall: true
  },

  fields: {
    searchFields: ['name', 'description'],
    requiredFields: []
  },

  testData: {
    create: {},
    update: {},
    search: {}
  },

  chaosConfig: {
    enabled: false, // Backend-only module
    monkeyTest: { duration: 0 },
    fuzzing: { enabled: false },
    raceConditions: { enabled: false },
    stressTest: { enabled: false, createMultipleRecords: 0 }
  },

  performanceThresholds: {
    pageLoad: 3000,
    apiResponse: 1000
  }
};
`;
};

console.log(`\n🔄 Regenerando ${MISSING_17.length} configs...\n`);

let created = 0;
MISSING_17.forEach(moduleKey => {
  const filePath = path.join(configsDir, `${moduleKey}.config.js`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, TEMPLATE(moduleKey));
    console.log(`   ✅ ${moduleKey}.config.js`);
    created++;
  } else {
    console.log(`   ⏭️  ${moduleKey}.config.js (ya existe)`);
  }
});

console.log(`\n📊 RESUMEN:`);
console.log(`   Creados: ${created}`);
console.log(`   Total configs: ${fs.readdirSync(configsDir).filter(f => f.endsWith('.config.js')).length}\n`);
