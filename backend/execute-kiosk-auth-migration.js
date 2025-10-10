const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurado');
  console.log('💡 Usar: DATABASE_URL="postgresql://..." node execute-kiosk-auth-migration.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function executeMigration() {
  const client = await pool.connect();

  try {
    console.log('🔌 Conectado a la base de datos de Render\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '20251009_kiosk_department_authorization.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Ejecutando migración de autorización kiosk-department...\n');

    // Ejecutar la migración
    await client.query(migrationSQL);

    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar columnas agregadas
    const deptColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'departments' AND column_name = 'default_kiosk_id';
    `);

    const kioskColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'kiosks' AND column_name = 'authorized_departments';
    `);

    if (deptColumns.rows.length > 0) {
      console.log('✅ departments.default_kiosk_id agregado correctamente');
    }

    if (kioskColumns.rows.length > 0) {
      console.log('✅ kiosks.authorized_departments agregado correctamente');
    }

    // Verificar función
    const funcExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'can_user_use_kiosk_v2'
      );
    `);

    if (funcExists.rows[0].exists) {
      console.log('✅ Función can_user_use_kiosk_v2 creada correctamente');
    }

    // Verificar vista
    const viewExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_views WHERE viewname = 'kiosk_department_authorizations'
      );
    `);

    if (viewExists.rows[0].exists) {
      console.log('✅ Vista kiosk_department_authorizations creada correctamente\n');
    }

    console.log('🎯 Sistema de autorización kiosk-department implementado exitosamente');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigration();
