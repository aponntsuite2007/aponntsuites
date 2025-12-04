/**
 * ELIMINAR 4 MÓDULOS BIOMÉTRICOS MOCKUP
 * - facial-biometric
 * - professional-biometric-registration
 * - biometric-enterprise
 * - real-biometric-enterprise
 */

const db = require('../src/config/database');

async function deleteMockups() {
  console.log('🗑️  ELIMINANDO MÓDULOS BIOMÉTRICOS MOCKUP\n');

  const MOCKUP_MODULES = [
    'facial-biometric',
    'professional-biometric-registration',
    'biometric-enterprise',
    'real-biometric-enterprise'
  ];

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    for (const moduleKey of MOCKUP_MODULES) {
      console.log(`🔍 Procesando: ${moduleKey}...`);

      // 1. Verificar si existe
      const [moduleInfo] = await db.sequelize.query(`
        SELECT id, module_key, name, base_price, is_core
        FROM system_modules
        WHERE module_key = $1
      `, {
        bind: [moduleKey]
      });

      if (moduleInfo.length === 0) {
        console.log(`   ⚠️  No encontrado (ya eliminado)\n`);
        continue;
      }

      const moduleId = moduleInfo[0].id;
      console.log(`   ID: ${moduleId}`);
      console.log(`   Name: ${moduleInfo[0].name}`);
      console.log(`   Price: $${moduleInfo[0].base_price}`);

      // 2. Eliminar asignaciones de company_modules
      await db.sequelize.query(`
        DELETE FROM company_modules
        WHERE system_module_id = $1
      `, {
        bind: [moduleId]
      });

      console.log(`   ✅ Asignaciones eliminadas`);

      // 3. Eliminar de system_modules
      await db.sequelize.query(`
        DELETE FROM system_modules
        WHERE module_key = $1
      `, {
        bind: [moduleKey]
      });

      console.log(`   ✅ Módulo eliminado\n`);
    }

    // 4. Contar módulos finales
    const [counts] = await db.sequelize.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_core = true) as core,
        COUNT(*) FILTER (WHERE is_core = false) as premium
      FROM system_modules
      WHERE is_active = true
    `);

    console.log('📊 MÓDULOS FINALES:');
    console.log(`   Total: ${counts[0].total}`);
    console.log(`   CORE: ${counts[0].core}`);
    console.log(`   PREMIUM: ${counts[0].premium}\n`);

    await db.sequelize.close();

    console.log('='.repeat(80));
    console.log('✅ ELIMINACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log('\n📝 Ejecuta ahora:');
    console.log('   1. node scripts/regenerate-registry-with-administrative.js');
    console.log('   2. node scripts/consolidate-modules-simple.js\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    await db.sequelize.close();
    process.exit(1);
  }
}

deleteMockups();
