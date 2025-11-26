/**
 * AGREGAR MÓDULO DE SOPORTE COMO CORE (por defecto en todas las empresas)
 */

require('dotenv').config();
const database = require('./src/config/database');

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🎫 AGREGANDO MÓDULO DE SOPORTE COMO CORE                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    await database.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // 1. VERIFICAR si ya existe el módulo
    console.log('🔍 Verificando si módulo "support" ya existe...\n');

    const [existing] = await database.sequelize.query(`
      SELECT id, module_key, name, is_core
      FROM system_modules
      WHERE module_key = 'support'
      LIMIT 1
    `);

    if (existing.length > 0) {
      console.log('✅ Módulo "support" YA EXISTE:');
      console.table(existing);

      // Verificar si es core
      if (!existing[0].is_core) {
        console.log('\n⚠️  Módulo NO es CORE - Actualizando...');

        await database.sequelize.query(`
          UPDATE system_modules
          SET is_core = true,
              updated_at = NOW()
          WHERE module_key = 'support'
        `);

        console.log('✅ Módulo actualizado a CORE (aparecerá en todas las empresas)');
      } else {
        console.log('\n✅ Módulo ya es CORE - No requiere actualización');
      }
    } else {
      console.log('⚠️  Módulo "support" NO EXISTE - Creándolo...\n');

      await database.sequelize.query(`
        INSERT INTO system_modules (
          module_key,
          name,
          description,
          category,
          is_core,
          is_active,
          base_price,
          icon,
          display_order,
          created_at,
          updated_at
        ) VALUES (
          'support',
          'Soporte Técnico',
          'Sistema de tickets de soporte con acceso temporal y asignación de vendedor',
          'core',
          true,  -- ✅ CORE: Aparece en todas las empresas
          true,
          0.00,  -- Gratis (CORE)
          '🎫',
          1000,
          NOW(),
          NOW()
        )
      `);

      console.log('✅ Módulo "support" creado como CORE');
    }

    // 2. MOSTRAR TODOS LOS MÓDULOS CORE
    console.log('\n📋 MÓDULOS CORE (incluidos por defecto en todas las empresas):\n');

    const [coreModules] = await database.sequelize.query(`
      SELECT id, module_key, name, category, icon
      FROM system_modules
      WHERE is_core = true
      ORDER BY display_order, id
    `);

    console.table(coreModules);

    console.log('\n🎯 PROCESO COMPLETADO');
    console.log('   • El módulo "support" está ahora como CORE');
    console.log('   • Aparecerá automáticamente en el dashboard de TODAS las empresas');
    console.log('   • NO requiere contratación ni activación manual');
    console.log('');

    await database.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
