/**
 * Limpieza completa de support-base
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function cleanup() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🗑️  LIMPIEZA COMPLETA: support-base');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Desasignar de TODAS las empresas
    const deleteResult = await pool.query(`
      DELETE FROM company_modules
      WHERE system_module_id = (SELECT id FROM system_modules WHERE module_key = 'support-base')
      RETURNING company_id
    `);
    console.log(`✅ Desasignado de ${deleteResult.rows.length} empresas`);

    // 2. Desactivar en system_modules
    const updateResult = await pool.query(`
      UPDATE system_modules
      SET is_active = false,
          updated_at = NOW(),
          description = '[OBSOLETO] ' || COALESCE(description, '')
      WHERE module_key = 'support-base'
      RETURNING module_key, name
    `);

    if (updateResult.rows.length > 0) {
      console.log(`✅ Módulo desactivado en system_modules: ${updateResult.rows[0].name}`);
    }

    // 3. Verificar módulos restantes de ISI
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('📋 MÓDULOS ACTUALES DE ISI:');
    console.log('═══════════════════════════════════════════════════════════════════════');

    const finalResult = await pool.query(`
      SELECT sm.module_key, sm.name
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11 AND cm.is_active = true
      ORDER BY sm.module_key
    `);

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

cleanup();
