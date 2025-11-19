const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302'
});

// Migraciones a ejecutar (en orden)
const migrations = [
  '20250117_add_tab2_extended_fields_to_users.sql',
  '20250117_create_driver_licenses_table.sql',
  '20250117_create_professional_licenses_table.sql',
  '20250117_create_tab3_legal_union_tables.sql',
  '20250117_create_tab8_tasks_salary_system.sql'
];

async function runMigrations() {
  console.log('\n🚀 INICIANDO EJECUCIÓN DE MIGRACIONES - TABs 2-9\n');
  console.log('='.repeat(60));

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (const migrationFile of migrations) {
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

    console.log(`\n📄 Ejecutando: ${migrationFile}`);
    console.log('-'.repeat(60));

    try {
      // Leer el archivo SQL
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Ejecutar la migración
      const startTime = Date.now();
      await pool.query(sql);
      const endTime = Date.now();

      console.log(`✅ ÉXITO - Tiempo: ${endTime - startTime}ms`);
      successCount++;
      results.push({ file: migrationFile, status: 'success', time: endTime - startTime });

    } catch (error) {
      console.error(`❌ ERROR en ${migrationFile}:`);
      console.error(`   Mensaje: ${error.message}`);
      if (error.code) {
        console.error(`   Código: ${error.code}`);
      }
      errorCount++;
      results.push({ file: migrationFile, status: 'error', error: error.message });

      // Si es un error de "ya existe", continuamos
      if (error.code === '42P07' || error.code === '42701') {
        console.log('   (La tabla/columna ya existe - continuando...)');
        successCount++; // Contamos como éxito parcial
      } else {
        // Para otros errores, detenemos
        console.error('\n❌ ERROR CRÍTICO - Deteniendo ejecución\n');
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMEN DE MIGRACIONES\n');
  console.log(`✅ Exitosas: ${successCount}/${migrations.length}`);
  console.log(`❌ Fallidas: ${errorCount}/${migrations.length}`);

  console.log('\n📋 DETALLE:\n');
  results.forEach((result, index) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.file}`);
    if (result.time) {
      console.log(`   Tiempo: ${result.time}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));

  // Verificar tablas creadas
  console.log('\n🔍 VERIFICANDO TABLAS CREADAS...\n');

  const tablesToCheck = [
    'user_driver_licenses',
    'user_professional_licenses',
    'user_legal_issues',
    'user_union_affiliation',
    'company_tasks',
    'user_assigned_tasks',
    'user_salary_config'
  ];

  for (const table of tablesToCheck) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [table]);

      if (result.rows[0].exists) {
        console.log(`✅ Tabla '${table}' existe`);
      } else {
        console.log(`❌ Tabla '${table}' NO existe`);
      }
    } catch (error) {
      console.error(`❌ Error verificando tabla '${table}': ${error.message}`);
    }
  }

  // Verificar campos nuevos en users
  console.log('\n🔍 VERIFICANDO CAMPOS NUEVOS EN TABLA USERS...\n');

  const fieldsToCheck = [
    'secondary_phone',
    'home_phone',
    'city',
    'province',
    'postal_code',
    'health_insurance_provider',
    'health_insurance_expiry'
  ];

  for (const field of fieldsToCheck) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = $1
        )
      `, [field]);

      if (result.rows[0].exists) {
        console.log(`✅ Campo 'users.${field}' existe`);
      } else {
        console.log(`❌ Campo 'users.${field}' NO existe`);
      }
    } catch (error) {
      console.error(`❌ Error verificando campo 'users.${field}': ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ PROCESO COMPLETADO\n');

  await pool.end();
}

// Ejecutar
runMigrations().catch(error => {
  console.error('\n❌ ERROR FATAL:', error);
  pool.end();
  process.exit(1);
});
