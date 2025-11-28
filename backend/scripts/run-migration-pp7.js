/**
 * Script para ejecutar migración PP-7-IMPL-1
 * Agrega campos de justificación a la tabla attendance
 */
const { Pool } = require('pg');
const path = require('path');

// Cargar .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// DATABASE_URL de Render (producción)
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  });

  let client;
  try {
    console.log('🔄 Conectando a PostgreSQL (Render)...');
    client = await pool.connect();
    console.log('✅ Conexión establecida');

    // Ejecutar migración paso a paso
    console.log('\n📄 Ejecutando migración PP-7-IMPL-1...');

    // 1. Crear ENUM si no existe
    console.log('1/7 Creando ENUM absence_type_enum...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'absence_type_enum') THEN
          CREATE TYPE absence_type_enum AS ENUM (
            'medical', 'vacation', 'suspension', 'personal', 'bereavement',
            'maternity', 'paternity', 'study', 'union', 'other'
          );
        END IF;
      END $$;
    `);
    console.log('   ✅ ENUM creado/verificado');

    // 2. Agregar is_justified
    console.log('2/7 Agregando columna is_justified...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'attendances' AND column_name = 'is_justified'
        ) THEN
          ALTER TABLE attendances ADD COLUMN is_justified BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);
    console.log('   ✅ is_justified OK');

    // 3. Agregar absence_type
    console.log('3/7 Agregando columna absence_type...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'attendances' AND column_name = 'absence_type'
        ) THEN
          ALTER TABLE attendances ADD COLUMN absence_type VARCHAR(50);
        END IF;
      END $$;
    `);
    console.log('   ✅ absence_type OK');

    // 4. Agregar absence_reason
    console.log('4/7 Agregando columna absence_reason...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'attendances' AND column_name = 'absence_reason'
        ) THEN
          ALTER TABLE attendances ADD COLUMN absence_reason TEXT;
        END IF;
      END $$;
    `);
    console.log('   ✅ absence_reason OK');

    // 5. Agregar justified_by
    console.log('5/7 Agregando columna justified_by...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'attendances' AND column_name = 'justified_by'
        ) THEN
          ALTER TABLE attendances ADD COLUMN justified_by UUID;
        END IF;
      END $$;
    `);
    console.log('   ✅ justified_by OK');

    // 6. Agregar justified_at
    console.log('6/7 Agregando columna justified_at...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'attendances' AND column_name = 'justified_at'
        ) THEN
          ALTER TABLE attendances ADD COLUMN justified_at TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);
    console.log('   ✅ justified_at OK');

    // 7. Agregar medical_certificate_id
    console.log('7/7 Agregando columna medical_certificate_id...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'attendances' AND column_name = 'medical_certificate_id'
        ) THEN
          ALTER TABLE attendances ADD COLUMN medical_certificate_id INTEGER;
        END IF;
      END $$;
    `);
    console.log('   ✅ medical_certificate_id OK');

    // Verificar columnas
    console.log('\n📊 Verificando columnas...');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'attendances'
      AND column_name IN ('is_justified', 'absence_type', 'absence_reason', 'justified_by', 'justified_at', 'medical_certificate_id')
      ORDER BY column_name;
    `);

    console.log('Columnas encontradas (' + result.rows.length + '/6):');
    result.rows.forEach(row => {
      console.log('   ✅ ' + row.column_name + ' (' + row.data_type + ')');
    });

    if (result.rows.length >= 6) {
      console.log('\n🎉 PP-7-IMPL-1 COMPLETADO: Campos de justificación agregados');
    }

    client.release();
    await pool.end();
    console.log('\n✅ Migración finalizada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    if (client) client.release();
    await pool.end();
    process.exit(1);
  }
}

runMigration();
