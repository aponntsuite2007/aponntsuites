/**
 * INSPECTOR AUTOMÁTICO DE FRONTEND + REGENERADOR DE CONFIGS
 *
 * Lee el código JavaScript real de cada módulo frontend y extrae:
 * - Selectores CSS (IDs, clases, data-attributes)
 * - Estructura de tabs
 * - Campos de formularios
 * - Botones CRUD
 *
 * Luego REGENERA el config E2E con selectores REALES.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// PostgreSQL pool
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

/**
 * PASO 1: Extraer selectores CSS del código JavaScript
 */
function extractSelectorsFromJS(jsCode, moduleKey) {
  const selectors = {
    ids: new Set(),
    classes: new Set(),
    dataAttributes: new Set(),
    buttons: new Set(),
    modals: new Set(),
    tabs: new Set(),
    inputs: new Set()
  };

  // Regex patterns
  const patterns = {
    getElementById: /getElementById\(['"]([^'"]+)['"]\)/g,
    querySelector: /querySelector\(['"]([^'"]+)['"]\)/g,
    querySelectorAll: /querySelectorAll\(['"]([^'"]+)['"]\)/g,
    className: /className\s*=\s*['"]([^'"]+)['"]/g,
    dataAttr: /data-([a-z-]+)\s*=\s*['"]/g,
    htmlId: /id\s*=\s*['"]([^'"]+)['"]/g,
    htmlClass: /class\s*=\s*['"]([^'"]+)['"]/g
  };

  // Extract IDs
  let match;
  while ((match = patterns.getElementById.exec(jsCode)) !== null) {
    selectors.ids.add('#' + match[1]);
  }
  while ((match = patterns.htmlId.exec(jsCode)) !== null) {
    selectors.ids.add('#' + match[1]);
  }

  // Extract classes
  while ((match = patterns.className.exec(jsCode)) !== null) {
    match[1].split(' ').forEach(cls => {
      if (cls.trim()) selectors.classes.add('.' + cls.trim());
    });
  }
  while ((match = patterns.htmlClass.exec(jsCode)) !== null) {
    match[1].split(' ').forEach(cls => {
      if (cls.trim()) selectors.classes.add('.' + cls.trim());
    });
  }

  // Extract querySelector selectors
  while ((match = patterns.querySelector.exec(jsCode)) !== null) {
    const selector = match[1];
    if (selector.startsWith('#')) selectors.ids.add(selector);
    else if (selector.startsWith('.')) selectors.classes.add(selector);
  }

  // Extract data attributes
  while ((match = patterns.dataAttr.exec(jsCode)) !== null) {
    selectors.dataAttributes.add('[data-' + match[1] + ']');
  }

  // Detectar botones CRUD comunes
  const buttonPatterns = [
    'btn-create', 'btn-add', 'btn-new',
    'btn-edit', 'btn-update', 'btn-modify',
    'btn-delete', 'btn-remove',
    'btn-view', 'btn-detail',
    'btn-save', 'btn-submit'
  ];

  buttonPatterns.forEach(pattern => {
    if (jsCode.includes(pattern)) {
      selectors.buttons.add('.' + pattern);
      selectors.buttons.add('button.' + pattern);
    }
  });

  // Detectar modals
  const modalPatterns = [
    'modal', 'modal-overlay', 'modal-content', 'modal-dialog',
    moduleKey + '-modal', 'att-modal', 'user-modal'
  ];

  modalPatterns.forEach(pattern => {
    if (jsCode.includes(pattern)) {
      selectors.modals.add('.' + pattern);
    }
  });

  // Detectar tabs
  if (jsCode.includes('data-tab') || jsCode.includes('tab-')) {
    selectors.tabs.add('[data-tab]');
    selectors.tabs.add('.tab-button');
    selectors.tabs.add('.tab-content');
  }

  // Detectar inputs comunes
  const inputPatterns = [
    'name', 'email', 'dni', 'phone', 'address',
    'description', 'notes', 'date', 'status'
  ];

  inputPatterns.forEach(pattern => {
    const inputId = `#${moduleKey}${pattern.charAt(0).toUpperCase()}${pattern.slice(1)}`;
    const altId = `#${pattern}`;
    if (jsCode.includes(inputId) || jsCode.includes(altId)) {
      selectors.inputs.add(inputId);
      selectors.inputs.add(altId);
    }
  });

  return {
    ids: Array.from(selectors.ids),
    classes: Array.from(selectors.classes),
    dataAttributes: Array.from(selectors.dataAttributes),
    buttons: Array.from(selectors.buttons),
    modals: Array.from(selectors.modals),
    tabs: Array.from(selectors.tabs),
    inputs: Array.from(selectors.inputs)
  };
}

/**
 * PASO 2: Generar config E2E basado en selectores reales
 */
function generateConfig(moduleKey, moduleName, selectors, category = 'empresa') {
  // Detectar selector de lista (container principal)
  const listSelectors = selectors.classes.filter(s =>
    s.includes('container') || s.includes('list') || s.includes('table')
  );
  const listContainerSelector = listSelectors[0] || `#${moduleKey}Container, #mainContent`;

  // Detectar botón de crear
  const createButtons = selectors.buttons.filter(s =>
    s.includes('create') || s.includes('add') || s.includes('new')
  );
  const createButtonSelector = createButtons[0] || `button.btn-create, button[onclick*="create"]`;

  // Detectar modal
  const modalSelectors = selectors.modals;
  const modalSelector = modalSelectors[0] || '.modal-overlay, .modal';

  // Detectar botones CRUD
  const editButtons = selectors.buttons.filter(s => s.includes('edit') || s.includes('update'));
  const deleteButtons = selectors.buttons.filter(s => s.includes('delete') || s.includes('remove'));
  const viewButtons = selectors.buttons.filter(s => s.includes('view') || s.includes('detail'));

  const editButtonSelector = editButtons[0] || 'button.btn-edit, button[onclick*="edit"]';
  const deleteButtonSelector = deleteButtons[0] || 'button.btn-delete, button[onclick*="delete"]';
  const viewButtonSelector = viewButtons[0] || 'button.btn-view, button[onclick*="view"]';

  // Base URL
  const baseUrl = category === 'admin'
    ? 'http://localhost:9998/panel-administrativo.html'
    : 'http://localhost:9998/panel-empresa.html';

  // Generar config
  return `/**
 * CONFIGURACIÓN E2E - ${moduleName.toUpperCase()}
 * ⭐ AUTO-GENERADO por inspector de frontend
 * Sistema SYNAPSE - Selectores REALES extraídos del código
 */

module.exports = {
  moduleKey: '${moduleKey}',
  moduleName: '${moduleName}',
  category: '${category}',
  baseUrl: '${baseUrl}',

  navigation: {
    listContainerSelector: '${listContainerSelector}',
    createButtonSelector: '${createButtonSelector}',
    openModalSelector: 'button[data-action="open"], ${createButtonSelector}',
    viewButtonSelector: '${viewButtonSelector}',
    editButtonSelector: '${editButtonSelector}',
    deleteButtonSelector: '${deleteButtonSelector}',
    modalSelector: '${modalSelector}',
    closeModalSelector: 'button.close, button[onclick*="close"]'
  },

  tabs: [
    {
      key: 'general',
      label: 'General',
      tabSelector: 'button[data-tab="general"], .tab-button.active',
      isDefault: true,
      fields: [
        // NOTA: Campos detectados automáticamente - revisar manualmente
${selectors.inputs.slice(0, 5).map(input => `        // { selector: '${input}', type: 'text' }`).join(',\n')}
      ]
    }
  ],

  database: {
    table: '${moduleKey}',
    primaryKey: 'id',
    testDataFactory: async (db) => {
      // Factory genérico - personalizar según tabla real
      return null; // Deshabilitado hasta configurar manualmente
    },
    testDataCleanup: async (db, id) => {
      // await db.query('DELETE FROM ${moduleKey} WHERE id = $1', [id]);
    }
  },

  chaosConfig: {
    enabled: true,
    monkeyTest: { duration: 15000, maxActions: 50 },
    fuzzing: { enabled: true, fields: [] },
    raceConditions: { enabled: false },
    stressTest: { enabled: false, createMultipleRecords: 0 }
  },

  brainIntegration: {
    enabled: false
  }
};
`;
}

/**
 * PASO 3: Procesar TODOS los módulos
 */
async function regenerateAllConfigs() {
  console.log('🚀 INSPECTOR DE FRONTEND - Regenerando configs E2E\n');
  console.log('═'.repeat(70));

  // 1. Obtener lista de módulos de PostgreSQL
  const result = await pool.query(`
    SELECT module_key, name, category
    FROM system_modules
    WHERE is_active = true
    ORDER BY is_core DESC, module_key
  `);

  const modules = result.rows;
  console.log(`\n📊 Total módulos a procesar: ${modules.length}\n`);

  let processed = 0;
  let regenerated = 0;
  let skipped = 0;

  for (const module of modules) {
    const { module_key, name, category } = module;

    console.log(`\n[${processed + 1}/${modules.length}] 📂 ${module_key} (${name})`);
    console.log('─'.repeat(70));

    // 2. Verificar si existe el archivo JavaScript del frontend
    const jsPath = path.join(__dirname, '..', 'public', 'js', 'modules', `${module_key}.js`);

    if (!fs.existsSync(jsPath)) {
      console.log(`   ⏭️  Frontend JS no existe - SKIP`);
      skipped++;
      processed++;
      continue;
    }

    // 3. Leer código JavaScript
    const jsCode = fs.readFileSync(jsPath, 'utf8');
    console.log(`   ✅ Frontend JS leído: ${(jsCode.length / 1024).toFixed(1)} KB`);

    // 4. Extraer selectores
    const selectors = extractSelectorsFromJS(jsCode, module_key);
    console.log(`   🔍 Selectores encontrados:`);
    console.log(`      - IDs: ${selectors.ids.length}`);
    console.log(`      - Classes: ${selectors.classes.length}`);
    console.log(`      - Buttons: ${selectors.buttons.length}`);
    console.log(`      - Modals: ${selectors.modals.length}`);
    console.log(`      - Tabs: ${selectors.tabs.length}`);

    // 5. Generar config
    const configContent = generateConfig(
      module_key,
      name,
      selectors,
      category === 'admin' ? 'admin' : 'empresa'
    );

    // 6. Escribir config
    const configPath = path.join(__dirname, '..', 'tests', 'e2e', 'configs', `${module_key}.config.js`);
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log(`   ✅ Config regenerado: ${configPath}`);

    regenerated++;
    processed++;
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🏁 PROCESO COMPLETADO\n');
  console.log(`📊 Estadísticas:`);
  console.log(`   - Total procesados: ${processed}`);
  console.log(`   - Configs regenerados: ${regenerated}`);
  console.log(`   - Módulos sin frontend: ${skipped}`);
  console.log('═'.repeat(70));

  await pool.end();
}

// Ejecutar
regenerateAllConfigs().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
