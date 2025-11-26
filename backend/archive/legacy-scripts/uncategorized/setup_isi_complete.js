const { sequelize } = require('./src/config/database');

async function setupIsiComplete() {
  try {
    console.log('🏢 CONFIGURANDO ISI COMPLETAMENTE...');

    // 1. Asignar los nuevos módulos a ISI (company_id=11)
    console.log('📦 Asignando nuevos módulos a ISI...');

    const [newModuleIds] = await sequelize.query(`
      SELECT id, module_key FROM system_modules
      WHERE module_key IN ('psychological-assessment', 'sanctions-management', 'vacation-management')
    `);

    for (const module of newModuleIds) {
      await sequelize.query(`
        INSERT INTO company_modules (company_id, system_module_id, precio_mensual, activo, fecha_asignacion, created_at, updated_at)
        VALUES (11, '${module.id}', 2000, true, NOW(), NOW(), NOW())
        ON CONFLICT (company_id, system_module_id) DO UPDATE SET activo = true
      `);
      console.log(`  ✅ ${module.module_key} asignado a ISI`);
    }

    // 2. Verificar módulos activos en ISI
    const [isiActiveModules] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM company_modules cm
      WHERE cm.company_id = 11 AND cm.activo = true
    `);

    console.log(`\n📊 ISI tiene ${isiActiveModules[0].count} módulos activos`);

    // 3. Crear usuario de prueba para ISI
    console.log('\n👤 Creando usuario de prueba para ISI...');

    await sequelize.query(`
      INSERT INTO users (
        id, email, firstName, lastName, company_id, role, isActive,
        password, username, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'admin@isi.com',
        'Admin',
        'ISI',
        11,
        'admin',
        true,
        '$2b$10$placeholder',
        'admin_isi',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    console.log('  ✅ Usuario admin@isi.com creado para ISI');

    // 4. Verificar resultado final
    const [finalCheck] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM company_modules WHERE company_id = 11 AND activo = true) as active_modules,
        (SELECT COUNT(*) FROM users WHERE company_id = 11) as users_count
    `);

    console.log('\n🎯 RESULTADO FINAL:');
    console.log(`  - Módulos activos en ISI: ${finalCheck[0].active_modules}`);
    console.log(`  - Usuarios en ISI: ${finalCheck[0].users_count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupIsiComplete();