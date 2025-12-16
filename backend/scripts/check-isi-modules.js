const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function check() {
  // Módulos de ISI (company_id = 11)
  const isiModules = await pool.query(`
    SELECT sm.module_key, sm.name, sm.is_core, sm.category
    FROM company_modules cm
    JOIN system_modules sm ON cm.system_module_id = sm.id
    WHERE cm.company_id = 11 AND cm.is_active = true
    ORDER BY sm.category, sm.module_key
  `);

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('📦 MÓDULOS ASIGNADOS A ISI (company_id=11):');
  console.log('═══════════════════════════════════════════════════════════════════════');

  isiModules.rows.forEach((m, i) => {
    const core = m.is_core ? ' [CORE]' : '';
    console.log((i+1).toString().padStart(2) + '. ' + m.module_key.padEnd(28) + ' | ' + m.name.padEnd(35) + ' | ' + m.category + core);
  });

  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('Total:', isiModules.rows.length);

  // Contar core vs comerciales
  const core = isiModules.rows.filter(m => m.is_core).length;
  const comercial = isiModules.rows.filter(m => !m.is_core).length;
  console.log('Core:', core, '| Comerciales:', comercial);

  await pool.end();
}
check().catch(console.error);
