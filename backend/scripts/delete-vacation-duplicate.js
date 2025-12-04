/**
 * ELIMINAR MÓDULO DUPLICADO "vacation"
 *
 * vacation-management es el que tiene implementación real.
 * vacation es un registro duplicado sin código.
 */

const db = require('../src/config/database');

async function deleteVacationDuplicate() {
  console.log('🗑️  ELIMINANDO MÓDULO DUPLICADO "vacation"');
  console.log('='.repeat(80));
  console.log('');

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // PASO 1: Verificar si alguna empresa lo tiene activo
    console.log('1️⃣  Verificando si hay empresas con "vacation" activo...');

    const [companiesUsingIt] = await db.sequelize.query(`
      SELECT c.id, c.name, cm.module_id
      FROM companies c
      INNER JOIN company_modules cm ON c.id = cm.company_id
      INNER JOIN system_modules sm ON cm.module_id = sm.id
      WHERE sm.module_key = 'vacation' AND cm.is_active = true
    `);

    if (companiesUsingIt.length > 0) {
      console.log('   ⚠️  ATENCIÓN: Hay empresas usando este módulo:');
      companiesUsingIt.forEach(c => {
        console.log(`      - ${c.name} (ID: ${c.id})`);
      });
      console.log('');
      console.log('   🔄 Desactivando asignaciones...');

      // Desactivar en company_modules
      await db.sequelize.query(`
        UPDATE company_modules
        SET is_active = false
        WHERE module_id IN (
          SELECT id FROM system_modules WHERE module_key = 'vacation'
        )
      `);

      console.log('   ✅ Asignaciones desactivadas');
    } else {
      console.log('   ✅ Ninguna empresa lo usa');
    }

    // PASO 2: Obtener info del módulo antes de borrar
    console.log('\n2️⃣  Obteniendo información del módulo...');

    const [moduleInfo] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price, is_core
      FROM system_modules
      WHERE module_key = 'vacation'
    `);

    if (moduleInfo.length === 0) {
      console.log('   ⚠️  Módulo "vacation" no encontrado en BD (ya eliminado?)');
      process.exit(0);
    }

    const module = moduleInfo[0];
    console.log(`   ID: ${module.id}`);
    console.log(`   Key: ${module.module_key}`);
    console.log(`   Name: ${module.name}`);
    console.log(`   Price: $${module.base_price}`);
    console.log(`   Is Core: ${module.is_core}`);

    // PASO 3: Eliminar de system_modules
    console.log('\n3️⃣  Eliminando de system_modules...');

    const [deleteResult] = await db.sequelize.query(`
      DELETE FROM system_modules
      WHERE module_key = 'vacation'
      RETURNING id, module_key, name
    `);

    if (deleteResult.length > 0) {
      console.log(`   ✅ Módulo eliminado: ${deleteResult[0].module_key}`);
    } else {
      console.log('   ⚠️  No se eliminó nada (puede estar protegido)');
    }

    // PASO 4: Verificar vacation-management existe
    console.log('\n4️⃣  Verificando que vacation-management existe...');

    const [vacationManagement] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price
      FROM system_modules
      WHERE module_key = 'vacation-management'
    `);

    if (vacationManagement.length > 0) {
      const vm = vacationManagement[0];
      console.log(`   ✅ vacation-management existe (ID: ${vm.id}, Precio: $${vm.base_price})`);
    } else {
      console.log('   ⚠️  vacation-management NO EXISTE - ADVERTENCIA!');
    }

    // PASO 5: Contar módulos finales
    console.log('\n5️⃣  Contando módulos finales...');

    const [counts] = await db.sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_core = true) as core_count,
        COUNT(*) FILTER (WHERE is_core = false) as premium_count,
        COUNT(*) as total
      FROM system_modules
      WHERE is_active = true
    `);

    const count = counts[0];
    console.log(`   Total módulos activos: ${count.total}`);
    console.log(`   CORE: ${count.core_count}`);
    console.log(`   PREMIUM: ${count.premium_count}`);

    await db.sequelize.close();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ELIMINACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log('');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Regenerar registry: node scripts/regenerate-registry-with-administrative.js');
    console.log('   2. Consolidar metadata: node scripts/consolidate-modules-simple.js');
    console.log('   3. Verificar frontend\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deleteVacationDuplicate();
