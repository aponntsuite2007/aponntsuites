/**
 * REGENERAR REGISTRY DESDE BD - CIRUGÍA QUIRÚRGICA
 *
 * Este script:
 * 1. Lee TODOS los módulos de system_modules (BD = fuente de verdad)
 * 2. Aplica correcciones del usuario (attendance, departments, inbox, shifts → core)
 * 3. Genera nuevo modules-registry.json
 * 4. NO toca la BD
 * 5. NO toca panel-empresa.html
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../src/config/database');

// Correcciones a aplicar (del usuario)
const CORRECTIONS = {
  'attendance': { is_core: true, category: 'core' },
  'departments': { is_core: true, category: 'core' },
  'inbox': { is_core: true, category: 'core' },
  'shifts': { is_core: true, category: 'core' }
};

async function regenerateRegistry() {
  console.log('🔧 REGENERACIÓN QUIRÚRGICA DEL REGISTRY');
  console.log('='.repeat(80));

  try {
    // 1. CONECTAR BD
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD');

    // 2. LEER TODOS LOS MÓDULOS DE BD
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

    // 3. TRANSFORMAR A FORMATO REGISTRY
    const modules = bdModules.map(bdMod => {
      const moduleKey = bdMod.module_key;

      // Aplicar correcciones si existen
      const correction = CORRECTIONS[moduleKey] || {};

      return {
        id: moduleKey,
        key: moduleKey,
        name: bdMod.name,
        icon: bdMod.icon || '📦',
        category: correction.category || bdMod.category || 'other',
        is_core: correction.is_core !== undefined ? correction.is_core : bdMod.is_core,
        base_price: parseFloat(bdMod.base_price) || 0,
        description: bdMod.description || '',
        dependencies: {
          required: bdMod.requirements ? (Array.isArray(bdMod.requirements) ? bdMod.requirements : []) : [],
          optional: [],
          provides_to: bdMod.provides_to ? (Array.isArray(bdMod.provides_to) ? bdMod.provides_to : []) : []
        }
      };
    });

    console.log(`✅ Transformados ${modules.length} módulos`);

    // 4. CONTAR CORE vs PREMIUM
    const coreCount = modules.filter(m => m.is_core).length;
    const premiumCount = modules.filter(m => !m.is_core).length;

    console.log(`   CORE: ${coreCount}`);
    console.log(`   PREMIUM: ${premiumCount}`);

    // 5. LEER REGISTRY ANTERIOR (para preservar bundles y licensesTiers)
    const oldRegistryPath = path.join(__dirname, '../src/config/modules-registry.json');
    const oldRegistry = JSON.parse(await fs.readFile(oldRegistryPath, 'utf8'));

    // 6. CONSTRUIR NUEVO REGISTRY
    const newRegistry = {
      version: "5.0.0",
      description: "Registry REGENERADO desde BD - Fuente única de verdad",
      generated_at: new Date().toISOString().split('T')[0],
      total_modules: modules.length,
      changelog: "v5.0.0: Regenerado desde BD con correcciones (attendance, departments, inbox, shifts → core)",

      modules: modules,

      // Preservar bundles y licensesTiers del registry anterior
      bundles: oldRegistry.bundles || {},
      licensesTiers: oldRegistry.licensesTiers || {},

      // Categorías (detectadas automáticamente)
      categories: {},

      // Metadata
      _metadata: {
        source: "PostgreSQL system_modules table",
        generated_by: "scripts/regenerate-registry-from-bd.js",
        corrections_applied: Object.keys(CORRECTIONS).map(key => ({
          module: key,
          changes: CORRECTIONS[key]
        }))
      }
    };

    // 7. DETECTAR CATEGORÍAS ÚNICAS
    const categoriesSet = new Set(modules.map(m => m.category));
    categoriesSet.forEach(cat => {
      newRegistry.categories[cat] = {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        color: oldRegistry.categories?.[cat]?.color || '#666666'
      };
    });

    // 8. GUARDAR NUEVO REGISTRY
    const newRegistryPath = path.join(__dirname, '../src/config/modules-registry.json');
    await fs.writeFile(
      newRegistryPath,
      JSON.stringify(newRegistry, null, 2),
      'utf8'
    );

    console.log(`✅ Nuevo registry guardado`);
    console.log(`   Total módulos: ${modules.length}`);
    console.log(`   CORE: ${coreCount}`);
    console.log(`   PREMIUM: ${premiumCount}`);
    console.log(`   Categorías: ${categoriesSet.size}`);

    // 9. MOSTRAR CORRECCIONES APLICADAS
    console.log('');
    console.log('🔧 CORRECCIONES APLICADAS:');
    Object.entries(CORRECTIONS).forEach(([key, changes]) => {
      const module = modules.find(m => m.key === key);
      if (module) {
        console.log(`   ✓ ${key} → is_core: ${changes.is_core}, category: ${changes.category}`);
      } else {
        console.log(`   ⚠️ ${key} → NO ENCONTRADO EN BD`);
      }
    });

    // 10. MOSTRAR MÓDULOS CORE FINALES
    console.log('');
    console.log('📊 MÓDULOS CORE FINALES:');
    modules.filter(m => m.is_core).forEach(m => {
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
    console.log('   2. Verificar módulos en panel-administrativo');
    console.log('   3. Verificar módulos en panel-empresa');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

regenerateRegistry();
