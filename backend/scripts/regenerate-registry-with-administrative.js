/**
 * REGENERAR REGISTRY CON CLASIFICACIÓN ADMINISTRATIVA
 *
 * Incluye la nueva clasificación:
 * - isCommercial: true/false (si se puede vender a clientes)
 * - isAdministrative: true/false (si es uso interno)
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../src/config/database');

async function regenerateRegistry() {
  console.log('🔧 REGENERACIÓN REGISTRY CON CLASIFICACIÓN ADMINISTRATIVA');
  console.log('='.repeat(80));

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD');

    // Leer todos los módulos de BD
    const [bdModules] = await db.sequelize.query(`
      SELECT
        id, module_key, name, icon, color, category,
        base_price, is_active, is_core, display_order,
        features, requirements, bundled_modules,
        available_in, provides_to, integrates_with,
        metadata, version, min_employees, max_employees, rubro,
        description
      FROM system_modules
      WHERE is_active = true
      ORDER BY display_order, module_key
    `);

    console.log(`✅ Leídos ${bdModules.length} módulos de BD`);

    // Transformar a formato registry
    const modules = bdModules.map(bdMod => {
      const moduleKey = bdMod.module_key;

      // Parsear metadata
      let metadata = {};
      if (bdMod.metadata) {
        try {
          metadata = typeof bdMod.metadata === 'string'
            ? JSON.parse(bdMod.metadata)
            : bdMod.metadata;
        } catch (e) {
          console.log(`   ⚠️  Error parsing metadata for ${moduleKey}`);
        }
      }

      const isAdministrative = metadata.isAdministrative === true;
      const isCommercial = isAdministrative ? false : true; // Si es admin, no es comercial

      return {
        id: moduleKey,
        key: moduleKey,
        name: bdMod.name,
        icon: bdMod.icon || '📦',
        category: bdMod.category || 'other',
        is_core: bdMod.is_core,
        base_price: parseFloat(bdMod.base_price) || 0,
        description: bdMod.description || '',

        // Nueva clasificación
        isCommercial: isCommercial,
        isAdministrative: isAdministrative,

        dependencies: {
          required: bdMod.requirements ? (Array.isArray(bdMod.requirements) ? bdMod.requirements : []) : [],
          optional: [],
          provides_to: bdMod.provides_to ? (Array.isArray(bdMod.provides_to) ? bdMod.provides_to : []) : []
        }
      };
    });

    console.log(`✅ Transformados ${modules.length} módulos`);

    // Contar clasificaciones
    const commercial = modules.filter(m => m.isCommercial);
    const administrative = modules.filter(m => m.isAdministrative);
    const coreCommercial = modules.filter(m => m.is_core && m.isCommercial);
    const coreAdmin = modules.filter(m => m.is_core && m.isAdministrative);
    const premium = modules.filter(m => !m.is_core);

    console.log('');
    console.log('📊 CLASIFICACIÓN:');
    console.log(`   Total módulos: ${modules.length}`);
    console.log(`   Comercializables: ${commercial.length} (${coreCommercial.length} CORE + ${premium.length} PREMIUM)`);
    console.log(`   Administrativos: ${administrative.length} (uso interno)`);

    // Leer registry anterior para preservar bundles y licensesTiers
    const oldRegistryPath = path.join(__dirname, '../src/config/modules-registry.json');
    const oldRegistry = JSON.parse(await fs.readFile(oldRegistryPath, 'utf8'));

    // Construir nuevo registry
    const newRegistry = {
      version: "5.1.0",
      description: "Registry con clasificación Comercial vs Administrativo",
      generated_at: new Date().toISOString().split('T')[0],
      total_modules: modules.length,
      changelog: "v5.1.0: Clasificación comercial (51) vs administrativo (6-7)",

      modules: modules,

      // Preservar bundles y licensesTiers
      bundles: oldRegistry.bundles || {},
      licensesTiers: oldRegistry.licensesTiers || {},

      // Categorías
      categories: {},

      // Metadata
      _metadata: {
        source: "PostgreSQL system_modules table",
        generated_by: "scripts/regenerate-registry-with-administrative.js",
        classification: {
          commercial: commercial.length,
          administrative: administrative.length,
          core_commercial: coreCommercial.length,
          core_administrative: coreAdmin.length,
          premium: premium.length
        }
      }
    };

    // Detectar categorías únicas
    const categoriesSet = new Set(modules.map(m => m.category));
    categoriesSet.forEach(cat => {
      newRegistry.categories[cat] = {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        color: oldRegistry.categories?.[cat]?.color || '#666666'
      };
    });

    // Guardar nuevo registry
    const newRegistryPath = path.join(__dirname, '../src/config/modules-registry.json');
    await fs.writeFile(
      newRegistryPath,
      JSON.stringify(newRegistry, null, 2),
      'utf8'
    );

    console.log('');
    console.log('✅ Nuevo registry guardado');
    console.log(`   Total módulos: ${modules.length}`);
    console.log(`   Comercializables: ${commercial.length}`);
    console.log(`   Administrativos: ${administrative.length}`);

    // Mostrar módulos administrativos
    console.log('');
    console.log('🛠️  MÓDULOS ADMINISTRATIVOS (NO comercializables):');
    administrative.forEach(m => {
      console.log(`   ✓ ${m.key.padEnd(30)} | ${m.name}`);
    });

    // Mostrar CORE comerciales
    console.log('');
    console.log('💰 CORE COMERCIALES (presupuestables):');
    coreCommercial.forEach(m => {
      console.log(`   ✓ ${m.key.padEnd(30)} | ${m.name}`);
    });

    await db.sequelize.close();

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ REGENERACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log('');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Ejecutar: node scripts/consolidate-modules-simple.js');
    console.log('   2. Actualizar frontend para separar tabs');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

regenerateRegistry();
