const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

(async () => {
  const modulesToRegister = [
    { key: 'departments', name: 'Gestión de Departamentos', is_core: true },
    { key: 'notifications', name: 'Sistema de Notificaciones', is_core: true },
    { key: 'shifts', name: 'Gestión de Turnos', is_core: true }
  ];

  console.log('Registrando módulos faltantes...\n');

  for (const mod of modulesToRegister) {
    try {
      await pool.query(`
        INSERT INTO system_modules (id, module_key, name, is_core, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
        ON CONFLICT (module_key) DO UPDATE SET
          name = EXCLUDED.name,
          is_core = EXCLUDED.is_core,
          is_active = true,
          updated_at = NOW()
      `, [mod.key, mod.name, mod.is_core]);

      console.log(`   ✅ ${mod.key}`);
    } catch (err) {
      console.error(`   ❌ Error: ${mod.key} - ${err.message}`);
    }
  }

  console.log('\n✅ Módulos registrados correctamente\n');
  await pool.end();
})();
