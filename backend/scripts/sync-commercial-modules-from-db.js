/**
 * SYNC COMMERCIAL MODULES FROM DATABASE
 *
 * Sincroniza modules-registry.json desde system_modules (BD)
 *
 * FLUJO:
 * 1. system_modules (BD) ← FUENTE ÚNICA DE VERDAD
 * 2. modules-registry.json (archivo) ← UI metadata (preservar)
 * 3. MERGE: BD + UI metadata → modules-registry.json actualizado
 *
 * Uso:
 *   node scripts/sync-commercial-modules-from-db.js
 *
 * O desde API:
 *   POST /api/engineering/sync-commercial-modules
 *
 * @version 1.0.0
 * @date 2026-01-05
 */

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const REGISTRY_PATH = path.join(__dirname, '..', 'src', 'auditor', 'registry', 'modules-registry.json');

// Determinar entorno (LOCAL o RENDER)
const isRender = process.env.RENDER === 'true' || process.env.DATABASE_URL;

const sequelize = isRender
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'attendance_system',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Aedr15150302',
      logging: false
    });

// ═══════════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ═══════════════════════════════════════════════════════════════

/**
 * Cargar módulos desde BD (system_modules)
 */
async function loadModulesFromDatabase() {
  console.log('📊 [SYNC] Cargando módulos desde system_modules (BD)...');

  try {
    const [modules] = await sequelize.query(`
      SELECT
        id,
        module_key,
        name,
        description,
        icon,
        color,
        category,
        base_price,
        is_core,
        is_active,
        display_order,
        features,
        requirements,
        version,
        min_employees,
        max_employees,
        created_at,
        updated_at,
        rubro,
        bundled_modules,
        available_in,
        provides_to,
        integrates_with,
        metadata,
        ui_metadata,
        parent_module_key,
        module_type
      FROM system_modules
      WHERE is_active = true
      ORDER BY display_order ASC, name ASC
    `);

    console.log(`   ✅ ${modules.length} módulos activos encontrados en BD`);
    return modules;

  } catch (error) {
    console.error('❌ [SYNC] Error cargando desde BD:', error.message);
    throw error;
  }
}

/**
 * Cargar registry existente para preservar UI metadata
 */
function loadExistingRegistry() {
  console.log('📄 [SYNC] Cargando modules-registry.json existente...');

  try {
    if (!fs.existsSync(REGISTRY_PATH)) {
      console.log('   ⚠️  No existe registry previo, se creará uno nuevo');
      return { modules: [], categories: {} };
    }

    const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const registry = JSON.parse(data);

    console.log(`   ✅ Registry existente: ${registry.modules?.length || 0} módulos`);
    return registry;

  } catch (error) {
    console.warn('   ⚠️  Error leyendo registry existente, usando vacío:', error.message);
    return { modules: [], categories: {} };
  }
}

/**
 * Mergear módulo de BD con UI metadata del registry existente
 */
function mergeModuleData(dbModule, existingRegistry) {
  // Buscar módulo existente en registry por ID o module_key
  const existingModule = existingRegistry.modules?.find(m =>
    m.id === dbModule.module_key ||
    m.id === dbModule.id ||
    m.key === dbModule.module_key
  );

  // Construir módulo merged
  const merged = {
    id: dbModule.module_key || dbModule.id,
    name: dbModule.name,
    category: dbModule.category || 'general',
    version: dbModule.version || '1.0.0',
    description: dbModule.description || '',

    // Dependencies
    dependencies: {
      required: parseJSONField(dbModule.requirements) || [],
      optional: [],
      integrates_with: parseJSONField(dbModule.integrates_with) || [],
      provides_to: parseJSONField(dbModule.provides_to) || []
    },

    // Commercial info
    commercial: {
      is_core: dbModule.is_core || false,
      standalone: dbModule.module_type === 'standalone',
      monthly_price: parseFloat(dbModule.base_price) || 0,
      max_users_included: dbModule.max_employees || null,
      additional_user_price: null
    },

    // UI metadata (preservar del registry existente si existe)
    ui: existingModule?.ui || parseJSONField(dbModule.ui_metadata) || {
      mainButtons: [],
      tabs: [],
      inputs: [],
      modals: []
    },

    // Metadata adicional
    is_internal: !dbModule.is_core && (dbModule.category === 'admin' || dbModule.category === 'system'),
    display_order: dbModule.display_order || 999,
    icon: dbModule.icon,
    color: dbModule.color,
    objectives: parseJSONField(dbModule.features) || [],
    tags: [],
    available_for: dbModule.available_in || 'both',
    bundles: parseJSONField(dbModule.bundled_modules) || [],
    metadata: parseJSONField(dbModule.metadata) || {},
    parent_module: dbModule.parent_module_key,
    module_type: dbModule.module_type,
    rubro: dbModule.rubro,

    // Timestamps
    _synced_from_db: true,
    _synced_at: new Date().toISOString(),
    created_at: dbModule.created_at,
    updated_at: dbModule.updated_at
  };

  // Si el módulo existente tiene fullCapabilities, preservarlo
  if (existingModule?.fullCapabilities) {
    merged.fullCapabilities = existingModule.fullCapabilities;
  }

  // Si tiene API endpoints descubiertos, preservarlos
  if (existingModule?.api) {
    merged.api = existingModule.api;
  }

  // Si tiene database tables descubiertas, preservarlas
  if (existingModule?.database) {
    merged.database = existingModule.database;
  }

  return merged;
}

/**
 * Helper: parsear campo JSON de BD
 */
function parseJSONField(field) {
  if (!field) return null;
  if (typeof field === 'object') return field;

  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
}

/**
 * Generar categorías desde módulos
 */
function generateCategories(modules) {
  const categories = {};

  for (const mod of modules) {
    const cat = mod.category || 'general';

    if (!categories[cat]) {
      categories[cat] = {
        name: categoryNameMap[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
        description: categoryDescriptionMap[cat] || '',
        color: categoryColorMap[cat] || '#999999'
      };
    }
  }

  return categories;
}

// Mapeos de categorías
const categoryNameMap = {
  'core': 'Sistema Base',
  'rrhh': 'Recursos Humanos',
  'payroll': 'Liquidación y Compensaciones',
  'finance': 'Finanzas',
  'medical': 'Salud Ocupacional',
  'security': 'Seguridad Industrial',
  'compliance': 'Legal y Normativo',
  'ai': 'Inteligencia Artificial',
  'analytics': 'Reportes y Analytics',
  'communication': 'Comunicación',
  'admin': 'Administración',
  'system': 'Sistema',
  'siac': 'Facturación SIAC',
  'support': 'Soporte',
  'hardware': 'Hardware'
};

const categoryDescriptionMap = {
  'core': 'Módulos fundamentales del sistema',
  'rrhh': 'Gestión de personal y talento',
  'payroll': 'Liquidaciones y pagos',
  'finance': 'Gestión financiera empresarial',
  'medical': 'Medicina laboral y ocupacional',
  'security': 'Seguridad e higiene laboral',
  'compliance': 'Cumplimiento normativo',
  'ai': 'IA y asistentes inteligentes',
  'analytics': 'Dashboards y visualizaciones',
  'communication': 'Notificaciones y comunicación',
  'admin': 'Administración del sistema',
  'system': 'Infraestructura y sistema',
  'siac': 'Sistema de facturación',
  'support': 'Soporte y ayuda',
  'hardware': 'Dispositivos y hardware'
};

const categoryColorMap = {
  'core': '#4CAF50',
  'rrhh': '#9C27B0',
  'payroll': '#00897b',
  'finance': '#8bc34a',
  'medical': '#F44336',
  'security': '#e74c3c',
  'compliance': '#e94560',
  'ai': '#667eea',
  'analytics': '#00bcd4',
  'communication': '#2196F3',
  'admin': '#7F8C8D',
  'system': '#607D8B',
  'siac': '#e67e22',
  'support': '#3F51B5',
  'hardware': '#795548'
};

/**
 * Escribir registry actualizado a disco
 */
function writeRegistry(registry) {
  console.log('💾 [SYNC] Escribiendo modules-registry.json actualizado...');

  try {
    // Crear backup del archivo existente
    if (fs.existsSync(REGISTRY_PATH)) {
      const backupPath = REGISTRY_PATH.replace('.json', `.backup-${Date.now()}.json`);
      fs.copyFileSync(REGISTRY_PATH, backupPath);
      console.log(`   📦 Backup creado: ${path.basename(backupPath)}`);
    }

    // Escribir nuevo registry
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
    console.log(`   ✅ Registry actualizado: ${registry.modules.length} módulos`);

  } catch (error) {
    console.error('❌ [SYNC] Error escribiendo registry:', error.message);
    throw error;
  }
}

/**
 * Calcular stats del sync
 */
function calculateStats(oldRegistry, newRegistry) {
  const oldCount = oldRegistry.modules?.length || 0;
  const newCount = newRegistry.modules.length;

  const stats = {
    total_modules: newCount,
    modules_added: Math.max(0, newCount - oldCount),
    modules_removed: Math.max(0, oldCount - newCount),
    modules_updated: newCount,
    core_modules: newRegistry.modules.filter(m => m.commercial?.is_core).length,
    commercial_modules: newRegistry.modules.filter(m => !m.commercial?.is_core && !m.is_internal).length,
    internal_modules: newRegistry.modules.filter(m => m.is_internal).length,
    categories: Object.keys(newRegistry.categories).length
  };

  return stats;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 SYNC: system_modules (BD) → modules-registry.json     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    // 1. Conectar a BD
    console.log('🔌 [SYNC] Conectando a base de datos...');
    await sequelize.authenticate();
    console.log(`   ✅ Conectado (${isRender ? 'Render' : 'Local'})`);
    console.log('');

    // 2. Cargar módulos desde BD
    const dbModules = await loadModulesFromDatabase();
    console.log('');

    // 3. Cargar registry existente
    const existingRegistry = loadExistingRegistry();
    console.log('');

    // 4. Mergear datos
    console.log('🔀 [SYNC] Mergeando datos BD + UI metadata...');
    const mergedModules = dbModules.map(dbMod => mergeModuleData(dbMod, existingRegistry));
    console.log(`   ✅ ${mergedModules.length} módulos procesados`);
    console.log('');

    // 5. Generar categorías
    const categories = generateCategories(mergedModules);

    // 6. Construir nuevo registry
    const newRegistry = {
      version: '4.0.0',
      generated_at: new Date().toISOString(),
      description: 'Registry SINCRONIZADO desde system_modules (BD es SSOT)',
      total_modules: mergedModules.length,
      modules: mergedModules,
      categories: categories,
      _metadata: {
        synced_from: 'system_modules (PostgreSQL)',
        synced_at: new Date().toISOString(),
        sync_method: 'automatic',
        environment: isRender ? 'production' : 'local'
      }
    };

    // 7. Calcular stats
    const stats = calculateStats(existingRegistry, newRegistry);

    // 8. Escribir a disco
    writeRegistry(newRegistry);
    console.log('');

    // 9. Cerrar conexión
    await sequelize.close();

    // 10. Reporte final
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║               ✅ SINCRONIZACIÓN EXITOSA                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 ESTADÍSTICAS:');
    console.log(`   Total módulos:        ${stats.total_modules}`);
    console.log(`   Módulos core:         ${stats.core_modules}`);
    console.log(`   Módulos comerciales:  ${stats.commercial_modules}`);
    console.log(`   Módulos internos:     ${stats.internal_modules}`);
    console.log(`   Categorías:           ${stats.categories}`);
    console.log(`   Agregados:            ${stats.modules_added}`);
    console.log(`   Eliminados:           ${stats.modules_removed}`);
    console.log('');
    console.log(`⏱️  Duración: ${duration}s`);
    console.log('');
    console.log('📁 Archivo actualizado:');
    console.log(`   ${REGISTRY_PATH}`);
    console.log('');

    // Output para consumo por API
    console.log('JSON_OUTPUT_START');
    console.log(JSON.stringify({ success: true, stats }, null, 2));
    console.log('JSON_OUTPUT_END');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                 ❌ ERROR EN SINCRONIZACIÓN                 ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('');

    // Output para consumo por API
    console.log('JSON_OUTPUT_START');
    console.log(JSON.stringify({ success: false, error: error.message }, null, 2));
    console.log('JSON_OUTPUT_END');

    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { main };
