/**
 * Fix SIAC Commercial Dashboard Icon
 * Actualiza el icono a emoji 📊
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function fixIcon() {
  try {
    console.log('🔧 Actualizando icono de SIAC Commercial Dashboard...');

    // El emoji 📊 en UTF-8
    const emoji = '📊';

    const result = await pool.query(
      `UPDATE system_modules
       SET icon = $1
       WHERE module_key = 'siac-commercial-dashboard'
       RETURNING module_key, name, icon`,
      [emoji]
    );

    if (result.rows.length > 0) {
      console.log('✅ Icono actualizado correctamente:');
      console.log('   Module:', result.rows[0].module_key);
      console.log('   Name:', result.rows[0].name);
      console.log('   Icon:', result.rows[0].icon);
      console.log('   Icon length:', result.rows[0].icon.length);
      console.log('   Icon hex:', Buffer.from(result.rows[0].icon).toString('hex'));
    } else {
      console.log('⚠️ No se encontró el módulo');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixIcon();
