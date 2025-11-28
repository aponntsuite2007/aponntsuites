const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('\n🚀 EJECUTANDO MIGRACIONES DE WORKFLOW ALTA EMPRESA\n');

// Configuración de PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Lista de migraciones en orden de ejecución
const migrations = [
  '20251127_create_budgets_table.sql',
  '20251127_create_contracts_table.sql',
  '20251127_create_administrative_tasks_table.sql',
  '20251127_create_commission_liquidations_table.sql',
  '20251127_create_commission_payments_table.sql',
  '20251127_add_onboarding_fields_to_companies.sql',
  '20251127_add_core_user_fields_to_users.sql',
  '20251127_add_bank_fields_to_aponnt_staff.sql'
];

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('✅ Conectado a PostgreSQL\n');

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '../migrations', migrationFile);

      console.log(`📄 Ejecutando: ${migrationFile}`);

      if (!fs.existsSync(migrationPath)) {
        console.log(`   ⚠️  Archivo no encontrado: ${migrationPath}`);
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`   ✅ Completada exitosamente\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.log(`   ❌ Error: ${error.message}\n`);

        // Si es un error de "ya existe", no es crítico
        if (error.message.includes('already exists') ||
            error.message.includes('ya existe') ||
            error.message.includes('duplicate')) {
          console.log('   ℹ️  Objeto ya existe (ignorando)\n');
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 TODAS LAS MIGRACIONES COMPLETADAS\n');

    // Verificar tablas creadas
    console.log('📊 VERIFICANDO TABLAS CREADAS:\n');

    const tables = [
      'budgets',
      'contracts',
      'administrative_tasks',
      'commission_liquidations',
      'commission_payments'
    ];

    for (const table of tables) {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      `, [table]);

      const exists = result.rows[0].count > 0;
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    }

    // Verificar campos agregados a companies
    console.log('\n📊 VERIFICANDO CAMPOS EN COMPANIES:\n');

    const companyFields = [
      'onboarding_status',
      'requiere_supervision_factura',
      'activated_at',
      'onboarding_trace_id',
      'vendor_id',
      'modules_trial'
    ];

    for (const field of companyFields) {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'companies'
          AND column_name = $1
      `, [field]);

      const exists = result.rows[0].count > 0;
      console.log(`   ${exists ? '✅' : '❌'} ${field}`);
    }

    // Verificar campos agregados a users
    console.log('\n📊 VERIFICANDO CAMPOS EN USERS:\n');

    const userFields = [
      'is_core_user',
      'force_password_change',
      'password_changed_at',
      'core_user_created_at',
      'onboarding_trace_id'
    ];

    for (const field of userFields) {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = $1
      `, [field]);

      const exists = result.rows[0].count > 0;
      console.log(`   ${exists ? '✅' : '❌'} ${field}`);
    }

    // Verificar campos agregados a aponnt_staff
    console.log('\n📊 VERIFICANDO CAMPOS EN APONNT_STAFF:\n');

    const staffFields = [
      'cbu',
      'alias_cbu',
      'bank_name',
      'account_type',
      'payment_method_preference'
    ];

    for (const field of staffFields) {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'aponnt_staff'
          AND column_name = $1
      `, [field]);

      const exists = result.rows[0].count > 0;
      console.log(`   ${exists ? '✅' : '❌'} ${field}`);
    }

    console.log('\n✅ VERIFICACIÓN COMPLETADA\n');

  } catch (error) {
    console.error('\n❌ ERROR EJECUTANDO MIGRACIONES:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migraciones
runMigrations()
  .then(() => {
    console.log('🚀 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Proceso terminado con errores:', error);
    process.exit(1);
  });
