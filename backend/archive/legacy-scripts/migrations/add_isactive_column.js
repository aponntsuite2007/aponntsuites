const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function addIsActiveColumn() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // Agregar columna isActive de vuelta
    console.log('🔧 Agregando columna "isActive" (camelCase)...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
    `);
    console.log('✅ Columna "isActive" agregada\n');

    // Sincronizar valores de is_active a isActive
    console.log('🔄 Sincronizando valores de is_active → isActive...');
    await client.query(`
      UPDATE users
      SET "isActive" = is_active;
    `);
    console.log('✅ Valores sincronizados\n');

    // Crear trigger para mantenerlas sincronizadas
    console.log('🔧 Creando trigger para sync automático...');

    // Crear función trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_is_active()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW."isActive" IS DISTINCT FROM NEW.is_active THEN
          NEW.is_active = NEW."isActive";
        END IF;
        IF NEW.is_active IS DISTINCT FROM NEW."isActive" THEN
          NEW."isActive" = NEW.is_active;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Eliminar trigger si existe
    await client.query(`DROP TRIGGER IF EXISTS sync_is_active_trigger ON users;`);

    // Crear trigger
    await client.query(`
      CREATE TRIGGER sync_is_active_trigger
      BEFORE INSERT OR UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION sync_is_active();
    `);

    console.log('✅ Trigger creado - isActive e is_active siempre estarán sincronizadas\n');

    // Verificar
    console.log('📊 VERIFICACIÓN:');
    const check = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('isActive', 'is_active')
      ORDER BY column_name;
    `);

    console.log('Columnas presentes:');
    check.rows.forEach(r => console.log(`  ✅ ${r.column_name}`));

    console.log('\n✅ FIX COMPLETADO - Ambas columnas sincronizadas');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

addIsActiveColumn();
