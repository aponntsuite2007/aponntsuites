/**
 * ============================================================================
 * UPDATE SYSTEM_MODULES - Actualizar dependencies en BD
 * ============================================================================
 *
 * Este script actualiza las dependencies en la tabla system_modules
 * Reemplaza "departments" y "shifts" por "organizational-structure"
 *
 * @date 2025-12-11
 * ============================================================================
 */

const database = require('../src/config/database');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  UPDATE SYSTEM_MODULES - Actualizar Dependencies en BD       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function updateSystemModulesDependencies() {
  const sequelize = database.sequelize;

  try {
    console.log('📡 Conectando a PostgreSQL...\n');
    await sequelize.authenticate();
    console.log('✅ Base de datos conectada\n');

    // ========================================================================
    // PASO 1: Verificar estructura de tabla
    // ========================================================================
    console.log('🔍 PASO 1: Verificando estructura de system_modules...\n');

    const [tableInfo] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'system_modules'
      ORDER BY ordinal_position
    `);

    console.log('   Columnas de system_modules:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // ========================================================================
    // PASO 2: Buscar módulos con departments/shifts en dependencies
    // ========================================================================
    console.log('\n🔍 PASO 2: Buscando módulos con dependencies a departments/shifts...\n');

    const [modulesWithDeps] = await sequelize.query(`
      SELECT
        id,
        module_key,
        name,
        requirements,
        integrates_with,
        provides_to
      FROM system_modules
      WHERE
        requirements::text LIKE '%departments%'
        OR requirements::text LIKE '%shifts%'
        OR integrates_with::text LIKE '%departments%'
        OR integrates_with::text LIKE '%shifts%'
        OR provides_to::text LIKE '%departments%'
        OR provides_to::text LIKE '%shifts%'
    `);

    console.log(`📊 Módulos con dependencies a departments/shifts: ${modulesWithDeps.length}\n`);

    if (modulesWithDeps.length === 0) {
      console.log('✅ No hay módulos con dependencies a departments/shifts\n');
      process.exit(0);
    }

    modulesWithDeps.forEach(mod => {
      console.log(`   📦 ${mod.module_key} (${mod.name})`);
      console.log(`      requirements: ${JSON.stringify(mod.requirements)}`);
      console.log(`      integrates_with: ${JSON.stringify(mod.integrates_with)}`);
      console.log(`      provides_to: ${JSON.stringify(mod.provides_to)}\n`);
    });

    // ========================================================================
    // PASO 3: Actualizar cada módulo
    // ========================================================================
    console.log('🔧 PASO 3: Actualizando dependencies...\n');

    let updatedCount = 0;

    for (const mod of modulesWithDeps) {
      let changed = false;
      let newRequirements = mod.requirements || [];
      let newIntegratesWith = mod.integrates_with || [];
      let newProvidesTo = mod.provides_to || [];

      // Procesar requirements
      if (newRequirements.includes('departments')) {
        newRequirements = newRequirements.filter(d => d !== 'departments');
        if (!newRequirements.includes('organizational-structure')) {
          newRequirements.push('organizational-structure');
        }
        changed = true;
      }
      if (newRequirements.includes('shifts')) {
        newRequirements = newRequirements.filter(d => d !== 'shifts');
        if (!newRequirements.includes('organizational-structure')) {
          newRequirements.push('organizational-structure');
        }
        changed = true;
      }

      // Procesar integratesWith
      if (newIntegratesWith.includes('departments')) {
        newIntegratesWith = newIntegratesWith.filter(d => d !== 'departments');
        if (!newIntegratesWith.includes('organizational-structure')) {
          newIntegratesWith.push('organizational-structure');
        }
        changed = true;
      }
      if (newIntegratesWith.includes('shifts')) {
        newIntegratesWith = newIntegratesWith.filter(d => d !== 'shifts');
        if (!newIntegratesWith.includes('organizational-structure')) {
          newIntegratesWith.push('organizational-structure');
        }
        changed = true;
      }

      // Procesar providesTo
      if (newProvidesTo.includes('departments')) {
        newProvidesTo = newProvidesTo.filter(d => d !== 'departments');
        if (!newProvidesTo.includes('organizational-structure')) {
          newProvidesTo.push('organizational-structure');
        }
        changed = true;
      }
      if (newProvidesTo.includes('shifts')) {
        newProvidesTo = newProvidesTo.filter(d => d !== 'shifts');
        if (!newProvidesTo.includes('organizational-structure')) {
          newProvidesTo.push('organizational-structure');
        }
        changed = true;
      }

      if (changed) {
        await sequelize.query(`
          UPDATE system_modules
          SET
            requirements = :requirements,
            integrates_with = :integratesWith,
            provides_to = :providesTo,
            updated_at = NOW()
          WHERE id = :id
        `, {
          replacements: {
            requirements: JSON.stringify(newRequirements),
            integratesWith: JSON.stringify(newIntegratesWith),
            providesTo: JSON.stringify(newProvidesTo),
            id: mod.id
          }
        });

        console.log(`   ✓ ${mod.module_key} - dependencies actualizadas`);
        updatedCount++;
      }
    }

    console.log(`\n✅ ${updatedCount} módulos actualizados\n`);

    // ========================================================================
    // PASO 4: Verificar resultados
    // ========================================================================
    console.log('🔍 PASO 4: Verificando resultados...\n');

    const [stillWithDeps] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM system_modules
      WHERE
        requirements::text LIKE '%departments%'
        OR requirements::text LIKE '%shifts%'
        OR integrates_with::text LIKE '%departments%'
        OR integrates_with::text LIKE '%shifts%'
        OR provides_to::text LIKE '%departments%'
        OR provides_to::text LIKE '%shifts%'
    `);

    if (stillWithDeps[0].count > 0) {
      console.log(`⚠️  Advertencia: ${stillWithDeps[0].count} módulos todavía tienen departments/shifts`);
    } else {
      console.log('✅ Ningún módulo tiene departments/shifts en dependencies');
    }

    const [withOrgStructure] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM system_modules
      WHERE
        requirements::text LIKE '%organizational-structure%'
        OR integrates_with::text LIKE '%organizational-structure%'
        OR provides_to::text LIKE '%organizational-structure%'
    `);

    console.log(`✅ ${withOrgStructure[0].count} módulos tienen organizational-structure\n`);

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    ACTUALIZACIÓN COMPLETADA                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Módulos actualizados: ${updatedCount}`);
    console.log(`✅ Módulos con organizational-structure: ${withOrgStructure[0].count}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR en actualización:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar actualización
updateSystemModulesDependencies();
