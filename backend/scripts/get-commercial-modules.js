/**
 * Script para obtener los 36 módulos comerciales de panel-empresa
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function getCommercialModules() {
  try {
    // Query de módulos comerciales (fuente de verdad según CLAUDE.md)
    const query = `
      SELECT
        module_key,
        module_name,
        category,
        description,
        is_core,
        pricing_tier
      FROM v_modules_by_panel
      WHERE target_panel = 'panel-empresa'
        AND show_as_card = true
      ORDER BY
        is_core DESC,
        category,
        module_name;
    `;

    const result = await pool.query(query);

    console.log(`\n📊 MÓDULOS COMERCIALES DE PANEL-EMPRESA: ${result.rows.length}\n`);
    console.log('═'.repeat(80));

    const coreModules = result.rows.filter(m => m.is_core);
    const optionalModules = result.rows.filter(m => !m.is_core);

    console.log(`\n🔵 CORE (${coreModules.length}):`);
    coreModules.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.module_key} - ${m.module_name}`);
    });

    console.log(`\n🟢 OPCIONALES (${optionalModules.length}):`);
    optionalModules.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.module_key} - ${m.module_name}`);
    });

    console.log('\n═'.repeat(80));
    console.log('\n📝 MÓDULOS EN FORMATO JSON:\n');
    console.log(JSON.stringify(result.rows, null, 2));

    await pool.end();
    return result.rows;

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

getCommercialModules();
