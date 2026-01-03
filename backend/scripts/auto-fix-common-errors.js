/**
 * AUTO-FIX COMÚN DE ERRORES DETECTADOS POR SYNAPSE
 *
 * Errores frecuentes y sus fixes automáticos
 */

const fs = require('fs');
const path = require('path');

/**
 * ERROR 1: Config sin navigation.listContainerSelector
 */
function fixMissingListSelector(configPath, moduleKey) {
  console.log(`🔧 Fix #1: Agregando listContainerSelector a ${moduleKey}`);

  const content = fs.readFileSync(configPath, 'utf8');

  // Si no tiene listContainerSelector, agregarlo
  if (!content.includes('listContainerSelector:')) {
    const fix = content.replace(
      /navigation: \{/,
      `navigation: {
    listContainerSelector: '#${moduleKey}Container, #mainContent',`
    );

    fs.writeFileSync(configPath, fix, 'utf8');
    console.log(`   ✅ listContainerSelector agregado`);
    return true;
  }

  return false;
}

/**
 * ERROR 2: Selectores CSS que no existen en frontend
 */
function fixInvalidSelectors(configPath, moduleKey) {
  console.log(`🔧 Fix #2: Corrigiendo selectores inválidos en ${moduleKey}`);

  const content = fs.readFileSync(configPath, 'utf8');

  // Reemplazar selectores 'undefined' o 'null'
  let fixed = content.replace(/'undefined'/g, `'#${moduleKey}Container'`);
  fixed = fixed.replace(/'null'/g, `'#mainContent'`);
  fixed = fixed.replace(/undefined/g, `'#${moduleKey}Container'`);
  fixed = fixed.replace(/null,/g, `'#mainContent',`);

  if (fixed !== content) {
    fs.writeFileSync(configPath, fixed, 'utf8');
    console.log(`   ✅ Selectores corregidos`);
    return true;
  }

  return false;
}

/**
 * ERROR 3: baseUrl incorrecto
 */
function fixBaseUrl(configPath, moduleKey, category) {
  console.log(`🔧 Fix #3: Verificando baseUrl de ${moduleKey}`);

  const content = fs.readFileSync(configPath, 'utf8');

  const correctBaseUrl = category === 'admin'
    ? `'http://localhost:9998/panel-administrativo.html'`
    : `'http://localhost:9998/panel-empresa.html'`;

  // Verificar si baseUrl es correcto
  if (!content.includes(`baseUrl: ${correctBaseUrl}`)) {
    const fixed = content.replace(
      /baseUrl: '[^']+'/,
      `baseUrl: ${correctBaseUrl}`
    );

    fs.writeFileSync(configPath, fixed, 'utf8');
    console.log(`   ✅ baseUrl corregido a ${correctBaseUrl}`);
    return true;
  }

  return false;
}

/**
 * ERROR 4: Tabs vacías o sin fields
 */
function fixEmptyTabs(configPath, moduleKey) {
  console.log(`🔧 Fix #4: Verificando tabs de ${moduleKey}`);

  const content = fs.readFileSync(configPath, 'utf8');

  // Si tabs está vacío, agregar tab básica
  if (content.includes('tabs: []')) {
    const fix = content.replace(
      /tabs: \[\]/,
      `tabs: [
    {
      key: 'general',
      label: 'General',
      tabSelector: 'button[data-tab="general"]',
      isDefault: true,
      fields: []
    }
  ]`
    );

    fs.writeFileSync(configPath, fix, 'utf8');
    console.log(`   ✅ Tab básica agregada`);
    return true;
  }

  return false;
}

/**
 * ERROR 5: database.testDataFactory faltante
 */
function fixMissingTestDataFactory(configPath, moduleKey) {
  console.log(`🔧 Fix #5: Verificando testDataFactory de ${moduleKey}`);

  const content = fs.readFileSync(configPath, 'utf8');

  // Si no tiene testDataFactory, agregar uno genérico
  if (!content.includes('testDataFactory:')) {
    const fix = content.replace(
      /database: \{/,
      `database: {
    table: '${moduleKey}',
    primaryKey: 'id',
    testDataFactory: async (db) => {
      // Factory genérico - crear registro de prueba
      const result = await db.query(\`
        INSERT INTO ${moduleKey} (id, created_at, updated_at)
        VALUES (gen_random_uuid(), NOW(), NOW())
        RETURNING id
      \`);
      return result.rows[0].id;
    },
    testDataCleanup: async (db, id) => {
      await db.query('DELETE FROM ${moduleKey} WHERE id = $1', [id]);
    },`
    );

    fs.writeFileSync(configPath, fix, 'utf8');
    console.log(`   ✅ testDataFactory genérico agregado`);
    return true;
  }

  return false;
}

/**
 * EJECUTAR TODOS LOS FIXES
 */
async function autoFixModule(moduleKey) {
  const configPath = path.join(__dirname, '..', 'tests', 'e2e', 'configs', `${moduleKey}.config.js`);

  if (!fs.existsSync(configPath)) {
    console.log(`❌ Config no existe: ${configPath}`);
    return { fixed: false, reason: 'Config no existe' };
  }

  console.log(`\n🔧 AUTO-FIX: ${moduleKey}`);
  console.log('─'.repeat(60));

  let fixesApplied = 0;

  // Cargar config para detectar category
  const config = require(configPath);

  // Aplicar fixes
  if (fixMissingListSelector(configPath, moduleKey)) fixesApplied++;
  if (fixInvalidSelectors(configPath, moduleKey)) fixesApplied++;
  if (fixBaseUrl(configPath, moduleKey, config.category)) fixesApplied++;
  if (fixEmptyTabs(configPath, moduleKey)) fixesApplied++;
  if (fixMissingTestDataFactory(configPath, moduleKey)) fixesApplied++;

  if (fixesApplied > 0) {
    console.log(`\n✅ ${fixesApplied} fixes aplicados a ${moduleKey}`);
    return { fixed: true, count: fixesApplied };
  } else {
    console.log(`\n⚠️  No se encontraron fixes automáticos para ${moduleKey}`);
    return { fixed: false, reason: 'No hay fixes automáticos disponibles' };
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  const moduleKey = process.argv[2];

  if (!moduleKey) {
    console.log('❌ Uso: node auto-fix-common-errors.js <module-key>');
    process.exit(1);
  }

  autoFixModule(moduleKey).then(result => {
    console.log('\nResultado:', result);
    process.exit(result.fixed ? 0 : 1);
  });
}

module.exports = { autoFixModule };
