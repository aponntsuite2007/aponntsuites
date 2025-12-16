/**
 * 🧠 SYNC BRAIN REGISTRY WITH DATABASE
 *
 * Este script sincroniza modules-registry.json con system_modules (BD)
 * La BD es la ÚNICA fuente de verdad (SSOT)
 *
 * Acciones:
 * 1. Elimina módulos del JSON que no existen en BD (fantasmas)
 * 2. Agrega módulos de BD que no existen en JSON
 * 3. Actualiza nombres si difieren
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

const REGISTRY_PATH = path.join(__dirname, '../src/auditor/registry/modules-registry.json');

async function syncRegistry() {
  console.log('🧠 ═══════════════════════════════════════════════════════════');
  console.log('   SINCRONIZACIÓN BRAIN REGISTRY ↔ DATABASE');
  console.log('   BD es SSOT (Single Source of Truth)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Cargar módulos de BD
    const dbResult = await pool.query(`
      SELECT module_key, name, category, description, icon, color,
             is_core, version, features, requirements,
             integrates_with, provides_to, bundled_modules, rubro
      FROM system_modules
      WHERE is_active = true
      ORDER BY module_key
    `);

    const dbModules = new Map(dbResult.rows.map(r => [r.module_key, r]));
    console.log(`📊 BD: ${dbModules.size} módulos activos\n`);

    // 2. Cargar JSON actual
    const jsonData = await fs.readFile(REGISTRY_PATH, 'utf8');
    const registry = JSON.parse(jsonData);
    const jsonModules = new Map(registry.modules.map(m => [m.id, m]));
    console.log(`📄 JSON: ${jsonModules.size} módulos\n`);

    // 3. Identificar diferencias
    const toRemove = []; // En JSON pero no en BD (fantasmas)
    const toAdd = [];    // En BD pero no en JSON
    const toUpdate = []; // Nombres diferentes

    // Encontrar fantasmas (en JSON, no en BD)
    for (const [key, mod] of jsonModules) {
      if (!dbModules.has(key)) {
        toRemove.push({ key, name: mod.name });
      }
    }

    // Encontrar faltantes (en BD, no en JSON)
    for (const [key, mod] of dbModules) {
      if (!jsonModules.has(key)) {
        toAdd.push(mod);
      } else {
        // Verificar si nombre difiere
        const jsonMod = jsonModules.get(key);
        if (jsonMod.name !== mod.name) {
          toUpdate.push({ key, oldName: jsonMod.name, newName: mod.name });
        }
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 RESUMEN DE CAMBIOS:');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 4. Mostrar y ejecutar cambios

    // 4.1 Eliminar fantasmas
    if (toRemove.length > 0) {
      console.log(`❌ ELIMINANDO ${toRemove.length} módulos fantasma (en JSON, no en BD):`);
      toRemove.forEach((m, i) => console.log(`   ${i+1}. ${m.key} ("${m.name}")`));

      registry.modules = registry.modules.filter(m => !toRemove.some(r => r.key === m.id));
      console.log('');
    } else {
      console.log('✅ No hay módulos fantasma que eliminar\n');
    }

    // 4.2 Agregar faltantes
    if (toAdd.length > 0) {
      console.log(`➕ AGREGANDO ${toAdd.length} módulos faltantes (en BD, no en JSON):`);
      toAdd.forEach((m, i) => console.log(`   ${i+1}. ${m.module_key} ("${m.name}")`));

      for (const dbMod of toAdd) {
        const newModule = buildModuleFromDB(dbMod);
        registry.modules.push(newModule);
      }
      console.log('');
    } else {
      console.log('✅ No hay módulos faltantes que agregar\n');
    }

    // 4.3 Actualizar nombres
    if (toUpdate.length > 0) {
      console.log(`🔄 ACTUALIZANDO ${toUpdate.length} nombres:`);
      toUpdate.forEach((m, i) => {
        console.log(`   ${i+1}. ${m.key}`);
        console.log(`      Antes: "${m.oldName}"`);
        console.log(`      Ahora: "${m.newName}"`);
      });

      for (const upd of toUpdate) {
        const mod = registry.modules.find(m => m.id === upd.key);
        if (mod) {
          mod.name = upd.newName;
        }
      }
      console.log('');
    } else {
      console.log('✅ Todos los nombres coinciden\n');
    }

    // 5. Actualizar metadata del registry
    registry.total_modules = registry.modules.length;
    registry.generated_at = new Date().toISOString().split('T')[0];
    registry.description = 'Registry SINCRONIZADO con system_modules (BD es SSOT)';
    registry.last_sync = new Date().toISOString();

    // 6. Ordenar módulos por categoría y luego por id
    registry.modules.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || 'zzz').localeCompare(b.category || 'zzz');
      }
      return a.id.localeCompare(b.id);
    });

    // 7. Guardar JSON actualizado
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SINCRONIZACIÓN COMPLETADA');
    console.log(`   Total módulos en JSON: ${registry.modules.length}`);
    console.log(`   Fantasmas eliminados: ${toRemove.length}`);
    console.log(`   Nuevos agregados: ${toAdd.length}`);
    console.log(`   Nombres actualizados: ${toUpdate.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Construye un objeto módulo para el JSON desde datos de BD
 */
function buildModuleFromDB(dbMod) {
  return {
    id: dbMod.module_key,
    name: dbMod.name,
    category: dbMod.category || 'uncategorized',
    version: dbMod.version || '1.0.0',
    description: dbMod.description || '',
    dependencies: {
      required: dbMod.requirements || [],
      optional: [],
      integrates_with: dbMod.integrates_with || [],
      provides_to: dbMod.provides_to || [],
      bundled: dbMod.bundled_modules || []
    },
    commercial: {
      is_core: dbMod.is_core || false,
      standalone: !dbMod.is_core,
      rubro: dbMod.rubro || null
    },
    help: {
      quickStart: '',
      commonIssues: []
    },
    ui: {
      mainButtons: [],
      tabs: [],
      inputs: [],
      modals: []
    },
    // Metadata para tracking
    addedFromDB: true,
    addedAt: new Date().toISOString()
  };
}

// Ejecutar
syncRegistry().catch(console.error);
