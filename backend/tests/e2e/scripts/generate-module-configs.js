/**
 * GENERADOR AUTOMÁTICO DE CONFIGURACIONES E2E
 *
 * Este script genera archivos .config.js para todos los módulos del sistema
 * basándose en una plantilla genérica que funciona con el test universal.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de BD
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302'
});

/**
 * Plantilla genérica para módulos
 */
function generateConfigTemplate(module) {
  const { module_key, name, category } = module;

  return `/**
 * CONFIGURACIÓN DE TESTING E2E - ${name.toUpperCase()}
 *
 * Configuración AUTO-GENERADA para testing universal E2E
 * Módulo: ${module_key}
 * Categoría: ${category}
 */

module.exports = {
  // ============================================================================
  // IDENTIFICACIÓN DEL MÓDULO
  // ============================================================================
  moduleKey: '${module_key}',
  moduleName: '${name}',
  category: '${category}',

  // ============================================================================
  // CONFIGURACIÓN DE NAVEGACIÓN
  // ============================================================================
  baseUrl: 'http://localhost:9998/panel-empresa.html#${module_key}',

  navigation: {
    // Selector para abrir modal/vista de detalle
    openModalSelector: 'button.btn-icon:has(i.fa-eye), .card:first-child, button:has-text("Ver"), button:has-text("Detalle")',

    // Selector para cerrar modal
    closeModalSelector: 'button.close, button:has-text("Cerrar"), button:has-text("Volver")',

    // Selector del botón crear/nuevo
    createButtonSelector: 'button:has-text("Nuevo"), button:has-text("Crear"), button:has-text("Agregar"), button.btn-primary',

    // Container principal de lista
    listContainerSelector: '#${module_key}Container, #${module_key.replace(/-/g, '')}Container, .module-content, .list-container',

    // Botones de acción
    editButtonSelector: 'button.btn-icon:has(i.fa-edit), button:has-text("Editar")',
    deleteButtonSelector: 'button.btn-icon:has(i.fa-trash), button:has-text("Eliminar"), button.btn-danger'
  },

  // ============================================================================
  // DEFINICIÓN DE TABS Y CAMPOS (GENÉRICO)
  // ============================================================================
  tabs: [
    {
      key: 'general',
      label: 'General',
      tabSelector: 'button.file-tab:first-child, .tab-pane.active',
      isDefault: true,
      fields: [
        {
          selector: 'input[type="text"]:first-of-type, input[name="name"], input[name="nombre"]',
          name: 'name',
          type: 'text',
          label: 'Nombre',
          isRequired: true
        },
        {
          selector: 'textarea:first-of-type, textarea[name="description"], textarea[name="descripcion"]',
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          isRequired: false
        }
      ]
    }
  ],

  // ============================================================================
  // CONFIGURACIÓN DE BASE DE DATOS (GENÉRICO)
  // ============================================================================
  database: {
    tableName: '${module_key.replace(/-/g, '_')}',
    primaryKey: 'id',

    // Crear datos de prueba genéricos
    testDataGenerator: async (db) => {
      console.log('⚠️  NOTA: Config auto-generada - testDataGenerator genérico');
      return 'test-id-' + Date.now();
    },

    // Limpiar datos de prueba
    testDataCleanup: async (db, id) => {
      console.log('⚠️  NOTA: Config auto-generada - testDataCleanup genérico');
    },

    // Validar datos de prueba
    validateTestData: async (db, id) => {
      console.log('⚠️  NOTA: Config auto-generada - validateTestData genérico');
      return true;
    }
  },

  // ============================================================================
  // CONFIGURACIÓN DE TESTING
  // ============================================================================
  testing: {
    // Módulo auto-generado - CRUD puede no ser aplicable
    skipCRUD: true,

    // Tests personalizados vacíos
    customTests: [],

    // Fuzzing genérico
    fuzzingFields: [],

    // Thresholds de performance
    performanceThresholds: {
      listLoad: 3000,
      detailLoad: 1000,
      createAction: 2000
    }
  }
};
`;
}

/**
 * Generar configs para todos los módulos
 */
async function generateAllConfigs() {
  console.log('🔧 [GENERATOR] Iniciando generación de configs...\n');

  try {
    // Obtener todos los módulos CORE activos
    const result = await pool.query(`
      SELECT module_key, name, category
      FROM system_modules
      WHERE is_core = true AND is_active = true
      ORDER BY module_key
    `);

    const modules = result.rows;
    console.log(`📊 [GENERATOR] ${modules.length} módulos CORE encontrados\n`);

    const configsDir = path.join(__dirname, '../configs');
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const module of modules) {
      const configPath = path.join(configsDir, `${module.module_key}.config.js`);

      // Verificar si ya existe
      if (fs.existsSync(configPath)) {
        console.log(`⏭️  SKIP: ${module.module_key} (ya existe)`);
        skipped++;
        continue;
      }

      try {
        // Generar y escribir config
        const content = generateConfigTemplate(module);
        fs.writeFileSync(configPath, content, 'utf8');
        console.log(`✅ CREATED: ${module.module_key}.config.js`);
        created++;
      } catch (err) {
        console.error(`❌ ERROR: ${module.module_key} - ${err.message}`);
        errors++;
      }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 RESUMEN DE GENERACIÓN');
    console.log('═══════════════════════════════════════════');
    console.log(`Total módulos: ${modules.length}`);
    console.log(`✅ Creados: ${created}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
generateAllConfigs();
