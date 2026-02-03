/**
 * Script para agregar columna username a AponntStaff en Render
 */

const { Client } = require('pg');

const RENDER_DB_URL = 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

async function addUsernameColumn() {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Conectando a Render PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado\n');

    console.log('⚙️  Agregando columna username a AponntStaff...');
    await client.query(`
      ALTER TABLE "AponntStaff"
      ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
    `);
    console.log('✅ Columna username agregada exitosamente\n');

    // Verificar
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'AponntStaff'
      AND column_name = 'username'
    `);

    if (result.rows.length > 0) {
      console.log('✅ VERIFICACIÓN: Columna username existe');
      console.log(result.rows[0]);
    } else {
      console.log('❌ ERROR: Columna no encontrada después de crear');
    }

    await client.end();
    console.log('\n✅ Proceso completado');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addUsernameColumn();
