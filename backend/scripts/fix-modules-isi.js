/**
 * Fix módulos ISI:
 * 1. Desasignar hours-cube-dashboard (es parte de attendance)
 * 2. Verificar estado final
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

const COMPANY_ID = 11; // ISI

async function fix() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔧 FIX: Desasignar hours-cube-dashboard de ISI');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Obtener ID del módulo
    const moduleResult = await pool.query(
      "SELECT id, module_key, name FROM system_modules WHERE module_key = 'hours-cube-dashboard'"
    );

    if (moduleResult.rows.length === 0) {
      console.log('❌ Módulo hours-cube-dashboard no encontrado');
      return;
    }

    const module = moduleResult.rows[0];

    // 2. Desasignar (eliminar o desactivar)
    const deleteResult = await pool.query(
      'DELETE FROM company_modules WHERE company_id = $1 AND system_module_id = $2 RETURNING *',
      [COMPANY_ID, module.id]
    );

    if (deleteResult.rows.length > 0) {
      console.log(`✅ "${module.module_key}" desasignado de ISI`);
    } else {
      console.log(`⚠️  "${module.module_key}" no estaba asignado a ISI`);
    }

    // 3. Verificar resultado final
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('📋 MÓDULOS ACTUALES DE ISI:');
    console.log('═══════════════════════════════════════════════════════════════════════');

    const finalResult = await pool.query(`
      SELECT sm.module_key, sm.name, sm.category
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = $1 AND cm.is_active = true
      ORDER BY sm.category, sm.module_key
    `, [COMPANY_ID]);

    finalResult.rows.forEach((m, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(25)} | ${m.name}`);
    });

    console.log('');
    console.log(`Total: ${finalResult.rows.length} módulos`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
