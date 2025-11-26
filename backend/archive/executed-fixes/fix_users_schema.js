const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function fixSchema() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // FIX #1: Agregar columna legajo
    console.log('🔧 FIX #1: Agregando columna legajo...');
    try {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS legajo VARCHAR(50);
      `);
      console.log('✅ Columna legajo agregada\n');
    } catch (err) {
      console.log(`⚠️ Error al agregar legajo: ${err.message}\n`);
    }

    // FIX #2: Investigar duplicidad is_active
    console.log('🔍 FIX #2: Verificando columnas is_active...');
    const cols = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('isActive', 'is_active')
      ORDER BY column_name;
    `);

    console.log('Columnas encontradas:');
    cols.rows.forEach(r => console.log(`  - ${r.column_name}`));

    if (cols.rows.length > 1) {
      console.log('\n⚠️ DUPLICIDAD DETECTADA: Hay más de una columna de activación');
      console.log('Solución: Eliminar columna isActive (camelCase) y mantener is_active (snake_case)\n');

      // Copiar datos de is_active a isActive si existen diferencias
      await client.query(`
        UPDATE users
        SET "isActive" = is_active
        WHERE "isActive" IS DISTINCT FROM is_active;
      `);
      console.log('✅ Datos sincronizados entre isActive e is_active');

      // Eliminar columna isActive (duplicada)
      await client.query(`
        ALTER TABLE users
        DROP COLUMN IF EXISTS "isActive";
      `);
      console.log('✅ Columna "isActive" eliminada (duplicada)');
      console.log('✅ Ahora solo existe is_active\n');
    }

    // Verificar resultado
    console.log('📊 VERIFICACIÓN FINAL:');
    const finalCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('legajo', 'isActive', 'is_active')
      ORDER BY column_name;
    `);

    console.log('Columnas presentes:');
    finalCheck.rows.forEach(r => console.log(`  ✅ ${r.column_name}`));

    console.log('\n✅ SCHEMA FIXED COMPLETAMENTE');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixSchema();
