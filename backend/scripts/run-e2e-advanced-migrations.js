/**
 * Script para ejecutar migraciones de E2E Advanced Testing
 *
 * Ejecuta las 3 migraciones en orden:
 * 1. test_executions
 * 2. test_results_detailed
 * 3. confidence_scores
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Cargar variables de entorno
require('dotenv').config();

async function runMigrations() {
  console.log('🚀 Iniciando migraciones de E2E Advanced Testing...\n');

  // Configurar cliente PostgreSQL
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
  });

  try {
    // Conectar
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');
    console.log(`   DB: ${client.database}`);
    console.log(`   User: ${client.user}`);
    console.log('');

    // Migración consolidada con nombres de tabla específicos E2E Advanced
    const migrations = [
      {
        name: 'e2e_advanced_tables',
        file: 'migrations/20260107_create_e2e_advanced_tables.sql'
      }
    ];

    // Ejecutar cada migración
    for (const migration of migrations) {
      console.log(`📄 Ejecutando migración: ${migration.name}...`);

      const filePath = path.join(__dirname, '..', migration.file);

      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo no encontrado: ${filePath}`);
        continue;
      }

      // Leer SQL
      const sql = fs.readFileSync(filePath, 'utf8');

      // Ejecutar SQL
      try {
        await client.query(sql);
        console.log(`✅ ${migration.name} - Migración exitosa\n`);
      } catch (error) {
        // Si la tabla ya existe, es OK
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${migration.name} - Tabla ya existe (OK)\n`);
        } else {
          console.error(`❌ ${migration.name} - Error:`, error.message);
          console.error(`   Stack: ${error.stack}\n`);
          // Continuar con las siguientes migraciones
        }
      }
    }

    console.log('\n🎉 Proceso de migraciones completado\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('e2e_advanced_executions', 'e2e_test_results_detailed', 'e2e_confidence_scores')
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('✅ Tablas encontradas:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  No se encontraron las tablas esperadas');
    }

    console.log('');

    // Verificar funciones creadas
    console.log('🔍 Verificando funciones PostgreSQL...');
    const functionsResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND (
          routine_name LIKE 'get_e2e_%'
          OR routine_name = 'update_e2e_execution_completed_at'
        )
      ORDER BY routine_name
    `);

    if (functionsResult.rows.length > 0) {
      console.log('✅ Funciones encontradas:');
      functionsResult.rows.forEach(row => {
        console.log(`   - ${row.routine_name}()`);
      });
    } else {
      console.log('⚠️  No se encontraron funciones');
    }

    console.log('');
    console.log('✅ Sistema E2E Advanced Testing - Base de datos lista\n');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Desconectado de PostgreSQL');
  }
}

// Ejecutar
runMigrations();
