/**
 * ELIMINAR MÓDULO DUPLICADO "vacation" - VERSION SIMPLE
 */

const db = require('../src/config/database');

async function deleteVacation() {
  console.log('🗑️  ELIMINANDO MÓDULO DUPLICADO "vacation"\n');

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // Verificar y desactivar asignaciones
    console.log('1️⃣  Desactivando asignaciones en company_modules...');

    await db.sequelize.query(`
      UPDATE company_modules
      SET is_active = false
      WHERE module_id IN (SELECT id FROM system_modules WHERE module_key = 'vacation')
    `);

    console.log('   ✅ Asignaciones desactivadas\n');

    // Obtener info antes de borrar
    console.log('2️⃣  Información del módulo a eliminar:');

    const [info] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price, is_core
      FROM system_modules
      WHERE module_key = 'vacation'
    `);

    if (info.length === 0) {
      console.log('   ⚠️  Módulo no encontrado\n');
      process.exit(0);
    }

    console.log(`   Key: ${info[0].module_key}`);
    console.log(`   Name: ${info[0].name}`);
    console.log(`   Price: $${info[0].base_price}`);
    console.log(`   Is Core: ${info[0].is_core}\n`);

    // Eliminar
    console.log('3️⃣  Eliminando de system_modules...');

    await db.sequelize.query(`
      DELETE FROM system_modules WHERE module_key = 'vacation'
    `);

    console.log('   ✅ Módulo eliminado\n');

    // Verificar vacation-management
    console.log('4️⃣  Verificando vacation-management...');

    const [vm] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price
      FROM system_modules
      WHERE module_key = 'vacation-management'
    `);

    if (vm.length > 0) {
      console.log(`   ✅ vacation-management existe (ID: ${vm[0].id}, $${vm[0].base_price})\n`);
    } else {
      console.log('   ⚠️  vacation-management NO EXISTE!\n');
    }

    // Contar totales
    console.log('5️⃣  Módulos finales:');

    const [counts] = await db.sequelize.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_core = true) as core,
        COUNT(*) FILTER (WHERE is_core = false) as premium
      FROM system_modules
      WHERE is_active = true
    `);

    console.log(`   Total: ${counts[0].total}`);
    console.log(`   CORE: ${counts[0].core}`);
    console.log(`   PREMIUM: ${counts[0].premium}\n`);

    await db.sequelize.close();

    console.log('='.repeat(80));
    console.log('✅ ELIMINACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log('\n📝 Ejecuta ahora:');
    console.log('   node scripts/regenerate-registry-with-administrative.js');
    console.log('   node scripts/consolidate-modules-simple.js\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

deleteVacation();
