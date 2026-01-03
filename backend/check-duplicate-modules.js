const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function main() {
  try {
    const result = await pool.query(`
      SELECT module_key, name, category, available_in, is_core
      FROM system_modules
      WHERE module_key IN ('organizational-structure', 'departments', 'shifts', 'roles-permissions', 'roles')
      ORDER BY module_key
    `);

    console.log('\n📊 MÓDULOS EN BASE DE DATOS:\n');
    console.log('═'.repeat(90));
    console.log('MODULE_KEY'.padEnd(35), '| NAME'.padEnd(45), '| CORE');
    console.log('═'.repeat(90));

    result.rows.forEach(r => {
      const core = r.is_core ? '✅ CORE' : '      ';
      console.log(
        r.module_key.padEnd(35),
        '|', r.name.substring(0, 42).padEnd(42),
        '|', core
      );
    });

    console.log('═'.repeat(90));

    // Buscar qué aparece en company_modules para ISI (company_id=11)
    const activeModules = await pool.query(`
      SELECT sm.module_key, sm.name, cm.is_active
      FROM company_modules cm
      JOIN system_modules sm ON cm.module_id = sm.id
      WHERE cm.company_id = 11
        AND sm.module_key IN ('organizational-structure', 'departments', 'shifts', 'roles-permissions', 'roles')
      ORDER BY sm.module_key
    `);

    console.log('\n📋 MÓDULOS ACTIVOS PARA ISI (company_id=11):\n');
    console.log('MODULE_KEY'.padEnd(35), '| ACTIVO');
    console.log('─'.repeat(50));

    activeModules.rows.forEach(r => {
      const active = r.is_active ? '✅ Sí' : '❌ No';
      console.log(r.module_key.padEnd(35), '|', active);
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
