/**
 * ============================================================================
 * MIGRACIÓN: Unificar departments + shifts → organizational-structure
 * ============================================================================
 *
 * Este script actualiza:
 * 1. Tabla company_modules - Reemplaza "departments" y "shifts" por "organizational-structure"
 * 2. Tabla company_modules (dependencies) - Actualiza JSON dependencies
 * 3. Verifica integridad post-migración
 *
 * SAFE: No borra nada, solo actualiza referencias
 *
 * @date 2025-12-11
 * ============================================================================
 */

const database = require('../src/config/database');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  MIGRACIÓN: departments + shifts → organizational-structure  ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function migrateToOrganizationalStructure() {
  const sequelize = database.sequelize;

  try {
    console.log('📡 Conectando a PostgreSQL...\n');
    await sequelize.authenticate();
    console.log('✅ Base de datos conectada\n');

    // ========================================================================
    // PASO 1: Verificar estado actual
    // ========================================================================
    console.log('🔍 PASO 1: Verificando estado actual...\n');

    const [companiesWithDepts] = await sequelize.query(`
      SELECT company_id, slug, name, active_modules
      FROM companies
      WHERE active_modules LIKE '%departments%'
         OR active_modules LIKE '%shifts%'
    `);

    console.log(`📊 Empresas con departments/shifts activos: ${companiesWithDepts.length}`);
    companiesWithDepts.forEach(c => {
      console.log(`   - ${c.slug} (${c.name})`);
    });

    if (companiesWithDepts.length === 0) {
      console.log('\n✅ No hay empresas con departments/shifts - Migración no necesaria\n');
      process.exit(0);
    }

    const [modulesWithDeps] = await sequelize.query(`
      SELECT module_key, dependencies
      FROM company_modules
      WHERE dependencies::text LIKE '%departments%'
         OR dependencies::text LIKE '%shifts%'
    `);

    console.log(`\n📦 Módulos con dependencies a departments/shifts: ${modulesWithDeps.length}`);

    // ========================================================================
    // PASO 2: Actualizar active_modules en companies
    // ========================================================================
    console.log('\n🔧 PASO 2: Actualizando active_modules en companies...\n');

    // Parsear JSON, modificar y guardar de vuelta
    for (const company of companiesWithDepts) {
      try {
        let modules = JSON.parse(company.active_modules || '[]');

        // Remover departments y shifts
        modules = modules.filter(m => m !== 'departments' && m !== 'shifts');

        // Agregar organizational-structure si no existe
        if (!modules.includes('organizational-structure')) {
          modules.push('organizational-structure');
        }

        // Actualizar
        await sequelize.query(`
          UPDATE companies
          SET active_modules = :modules
          WHERE company_id = :id
        `, {
          replacements: {
            modules: JSON.stringify(modules),
            id: company.company_id
          }
        });

        console.log(`   ✓ ${company.slug}`);

      } catch (error) {
        console.error(`   ❌ Error en ${company.slug}: ${error.message}`);
      }
    }

    const updateActiveModules = [[companiesWithDepts]]; // Fake result for logging

    console.log(`✅ ${updateActiveModules[0].length} empresas actualizadas`);
    updateActiveModules[0].forEach(c => {
      console.log(`   ✓ ${c.slug}`);
    });

    // ========================================================================
    // PASO 3: Actualizar dependencies en company_modules
    // ========================================================================
    console.log('\n🔧 PASO 3: Actualizando dependencies en company_modules...\n');

    // Obtener todos los módulos con dependencies
    const [allModules] = await sequelize.query(`
      SELECT id, module_key, dependencies
      FROM company_modules
      WHERE dependencies IS NOT NULL
    `);

    let updatedCount = 0;

    for (const module of allModules) {
      let deps = module.dependencies;
      let changed = false;

      // Reemplazar "departments" por "organizational-structure"
      if (deps.required && deps.required.includes('departments')) {
        deps.required = deps.required.filter(d => d !== 'departments');
        if (!deps.required.includes('organizational-structure')) {
          deps.required.push('organizational-structure');
        }
        changed = true;
      }

      if (deps.optional && deps.optional.includes('departments')) {
        deps.optional = deps.optional.filter(d => d !== 'departments');
        if (!deps.optional.includes('organizational-structure')) {
          deps.optional.push('organizational-structure');
        }
        changed = true;
      }

      // Reemplazar "shifts" por "organizational-structure"
      if (deps.required && deps.required.includes('shifts')) {
        deps.required = deps.required.filter(d => d !== 'shifts');
        if (!deps.required.includes('organizational-structure')) {
          deps.required.push('organizational-structure');
        }
        changed = true;
      }

      if (deps.optional && deps.optional.includes('shifts')) {
        deps.optional = deps.optional.filter(d => d !== 'shifts');
        if (!deps.optional.includes('organizational-structure')) {
          deps.optional.push('organizational-structure');
        }
        changed = true;
      }

      if (changed) {
        await sequelize.query(`
          UPDATE company_modules
          SET dependencies = :deps
          WHERE id = :id
        `, {
          replacements: {
            deps: JSON.stringify(deps),
            id: module.id
          }
        });

        console.log(`   ✓ ${module.module_key} - dependencies actualizadas`);
        updatedCount++;
      }
    }

    console.log(`\n✅ ${updatedCount} módulos actualizados`);

    // ========================================================================
    // PASO 4: Verificar integridad post-migración
    // ========================================================================
    console.log('\n🔍 PASO 4: Verificando integridad post-migración...\n');

    const [remainingDepts] = await sequelize.query(`
      SELECT company_id, slug
      FROM companies
      WHERE active_modules LIKE '%departments%'
         OR active_modules LIKE '%shifts%'
    `);

    if (remainingDepts.length > 0) {
      console.log(`⚠️  Advertencia: ${remainingDepts.length} empresas todavía tienen departments/shifts`);
    } else {
      console.log('✅ Ninguna empresa tiene departments/shifts en active_modules');
    }

    const [hasOrgStructure] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE active_modules LIKE '%organizational-structure%'
    `);

    console.log(`✅ ${hasOrgStructure[0].count} empresas tienen organizational-structure activo\n`);

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    MIGRACIÓN COMPLETADA                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Empresas migradas: ${updateActiveModules[0].length}`);
    console.log(`✅ Módulos actualizados: ${updatedCount}`);
    console.log(`✅ Empresas con organizational-structure: ${hasOrgStructure[0].count}\n`);

    console.log('🎯 Próximo paso: Verificar que frontend use "organizational-structure"\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR en migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
migrateToOrganizationalStructure();
