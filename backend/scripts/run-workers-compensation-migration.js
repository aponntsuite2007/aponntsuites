/**
 * EJECUTAR MIGRACIÓN: Workers' Compensation Claims Management
 * Ejecuta la migración SQL para crear tablas de gestión de reclamos laborales
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🏥 [WORKERS COMPENSATION MIGRATION] Ejecutando migración de Workers Compensation Claims...\n');

// Configuración de PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'attendance_system',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('📂 Leyendo archivo de migración...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '20250201_create_workers_compensation.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Archivo leído correctamente\n');

    console.log('🔄 Ejecutando migración SQL...');
    console.log('   (Esto puede tardar 15-30 segundos)\n');

    await client.query('BEGIN');

    // Ejecutar la migración
    await client.query(sql);

    await client.query('COMMIT');

    console.log('✅ MIGRACIÓN EXITOSA\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...\n');

    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'oh_%claim%'
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);

    if (tablesResult.rows.length > 0) {
      console.log('📊 TABLAS CREADAS:');
      tablesResult.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });
      console.log('');
    }

    // Verificar funciones creadas
    const functionsQuery = `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND (routine_name LIKE '%claim%' OR routine_name LIKE '%compensation%')
      ORDER BY routine_name;
    `;

    const functionsResult = await client.query(functionsQuery);

    if (functionsResult.rows.length > 0) {
      console.log('⚙️  FUNCIONES CREADAS:');
      functionsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.routine_name}()`);
      });
      console.log('');
    }

    // Verificar seed data
    const seedQuery = `
      SELECT region, COUNT(*) as count
      FROM oh_claim_types
      WHERE is_active = true
      GROUP BY region
      ORDER BY region;
    `;

    const seedResult = await client.query(seedQuery);

    if (seedResult.rows.length > 0) {
      console.log('🌱 SEED DATA - TIPOS DE RECLAMOS POR REGIÓN:');
      seedResult.rows.forEach(row => {
        console.log(`   ${row.region}: ${row.count} claim types`);
      });
      console.log('');
    }

    const totalTypesQuery = `
      SELECT COUNT(*) as total
      FROM oh_claim_types
      WHERE is_active = true;
    `;

    const totalResult = await client.query(totalTypesQuery);
    const totalTypes = parseInt(totalResult.rows[0].total);

    console.log(`📋 TOTAL: ${totalTypes} tipos de reclamos insertados\n`);

    console.log('🎉 MIGRACIÓN OH-V6-5 COMPLETADA EXITOSAMENTE');
    console.log('');
    console.log('📋 PRÓXIMO PASO:');
    console.log('   OH-V6-5: Implementar API REST para Workers Compensation Claims');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR EN MIGRACIÓN:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
