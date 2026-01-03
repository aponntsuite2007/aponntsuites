/**
 * Generador automático de configs E2E para módulos faltantes
 * Crea configs basados en template para los 30 módulos NO-CORE sin tests
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

// Módulos NO-CORE sin config E2E (30 módulos)
const MODULES_TO_CREATE = [
  'ai-assistant',
  'art-management',
  'audit-reports',
  'auditor',
  'benefits-management',
  'compliance-dashboard',
  'emotional-analysis',
  'employee-360',
  'employee-map',
  'hour-bank',
  'hse-management',
  'job-postings',
  'kiosks',
  'kiosks-apk',
  'knowledge-base',
  'legal-dashboard',
  'medical',
  'my-procedures',
  'payroll-liquidation',
  'positions-management',
  'predictive-workforce-dashboard',
  'procedures-manual',
  'sanctions-management',
  'siac-commercial-dashboard',
  'sla-tracking',
  'temporary-access',
  'training-management',
  'vacation-management',
  'voice-platform'
];

// Módulos con config pero sin registro en BD
const MODULES_TO_REGISTER = [
  { key: 'departments', name: 'Gestión de Departamentos', is_core: true },
  { key: 'notifications', name: 'Sistema de Notificaciones', is_core: true },
  { key: 'shifts', name: 'Gestión de Turnos', is_core: true }
];

// Template base para configs E2E
function generateConfigTemplate(moduleKey, moduleName) {
  return `/**
 * E2E Config: ${moduleName}
 * Auto-generated config for universal testing
 */

module.exports = {
  moduleKey: '${moduleKey}',
  moduleName: '${moduleName}',

  // Selectores principales
  selectors: {
    container: '#${moduleKey}-container, .${moduleKey}-module, #mainContent',
    list: '.data-table, .module-list, #mainContent',
    createButton: 'button:has-text("Crear"), button:has-text("Nuevo"), button:has-text("Agregar")',
    modal: '.modal, [role="dialog"], #universalModal',
    saveButton: 'button:has-text("Guardar"), button[type="submit"]',
    cancelButton: 'button:has-text("Cancelar"), button:has-text("Cerrar")',
    editButton: '.edit-btn, button:has-text("Editar")',
    deleteButton: '.delete-btn, button:has-text("Eliminar")',
    searchInput: 'input[type="search"], input[placeholder*="Buscar"]'
  },

  // Campos del formulario (genéricos)
  formFields: [],

  // Tabs del módulo (si aplica)
  tabs: [],

  // Configuración de tests
  testConfig: {
    skipCRUD: false,
    skipChaos: false,
    skipDependencyMapping: false,
    skipSSOT: false,
    requiresSetup: false,
    isAdminOnly: false,
    isDashboard: true // Asumir que es dashboard si no tiene modal
  },

  // Data de prueba
  testData: {
    // Datos genéricos - customizar según el módulo
  },

  // Setup/Teardown
  async setup(page, testData) {
    // Setup genérico - puede requerir customización
    return null;
  },

  async teardown(page, createdId) {
    // Teardown genérico
    if (createdId) {
      console.log(\`   ⏭️  Teardown: No implementado para \${createdId}\`);
    }
  }
};
`;
}

async function main() {
  console.log('🚀 Generando configs E2E para módulos faltantes...\n');

  const configsDir = path.join(__dirname, '../tests/e2e/configs');
  let created = 0;
  let skipped = 0;

  // 1. Crear configs para módulos NO-CORE sin tests
  console.log('📝 Creando configs para módulos NO-CORE...\n');

  for (const moduleKey of MODULES_TO_CREATE) {
    const configPath = path.join(configsDir, `${moduleKey}.config.js`);

    if (fs.existsSync(configPath)) {
      console.log(`   ⏭️  Skip: ${moduleKey} (ya existe)`);
      skipped++;
      continue;
    }

    // Obtener nombre del módulo desde BD
    let moduleName = moduleKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    try {
      const result = await pool.query(
        'SELECT name FROM system_modules WHERE module_key = $1',
        [moduleKey]
      );

      if (result.rows.length > 0) {
        moduleName = result.rows[0].name;
      }
    } catch (err) {
      // Si no está en BD, usar el nombre generado
    }

    const configContent = generateConfigTemplate(moduleKey, moduleName);
    fs.writeFileSync(configPath, configContent, 'utf8');

    console.log(`   ✅ Created: ${moduleKey}.config.js`);
    created++;
  }

  // 2. Registrar módulos con config pero sin BD
  console.log('\n📝 Registrando módulos faltantes en system_modules...\n');

  for (const mod of MODULES_TO_REGISTER) {
    try {
      const exists = await pool.query(
        'SELECT module_key FROM system_modules WHERE module_key = $1',
        [mod.key]
      );

      if (exists.rows.length > 0) {
        console.log(`   ⏭️  Skip: ${mod.key} (ya existe en BD)`);
        continue;
      }

      await pool.query(`
        INSERT INTO system_modules (module_key, name, is_core, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (module_key) DO NOTHING
      `, [mod.key, mod.name, mod.is_core]);

      console.log(`   ✅ Registered: ${mod.key} in system_modules`);
    } catch (err) {
      console.error(`   ❌ Error registering ${mod.key}:`, err.message);
    }
  }

  // 3. Crear config para visitors (NO-CORE con config existente)
  const visitorsConfigPath = path.join(configsDir, 'visitors.config.js');
  if (!fs.existsSync(visitorsConfigPath)) {
    const visitorsConfig = generateConfigTemplate('visitors', 'Gestión de Visitantes');
    fs.writeFileSync(visitorsConfigPath, visitorsConfig, 'utf8');
    console.log('\n   ✅ Created: visitors.config.js');
    created++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log(`   Configs creados: ${created}`);
  console.log(`   Configs existentes (skip): ${skipped}`);
  console.log(`   Total configs E2E: ${created + skipped + 33}`);
  console.log('='.repeat(60) + '\n');

  await pool.end();
}

main().catch(console.error);
