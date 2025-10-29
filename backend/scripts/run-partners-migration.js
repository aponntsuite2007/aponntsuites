/**
 * SCRIPT: Ejecutar migración del Sistema de Partners
 *
 * Ejecuta la migración SQL para crear todas las tablas del sistema de Partners/Asociados
 *
 * Uso:
 *   node scripts/run-partners-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runPartnersMigration() {
  console.log('🚀 [PARTNERS MIGRATION] Iniciando migración del Sistema de Partners...\n');

  // Conectar a la base de datos
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Drop existing tables if they exist (reverse order due to foreign keys)
    console.log('🗑️  Eliminando tablas existentes (si existen)...\n');
    const dropTablesSQL = `
      DROP TABLE IF EXISTS partner_commissions_log CASCADE;
      DROP TABLE IF EXISTS partner_legal_consents CASCADE;
      DROP TABLE IF EXISTS partner_mediation_cases CASCADE;
      DROP TABLE IF EXISTS partner_service_conversations CASCADE;
      DROP TABLE IF EXISTS partner_reviews CASCADE;
      DROP TABLE IF EXISTS partner_availability CASCADE;
      DROP TABLE IF EXISTS partner_service_requests CASCADE;
      DROP TABLE IF EXISTS partner_notifications CASCADE;
      DROP TABLE IF EXISTS partner_documents CASCADE;
      DROP TABLE IF EXISTS partners CASCADE;
      DROP TABLE IF EXISTS partner_roles CASCADE;
    `;
    await client.query(dropTablesSQL);
    console.log('✅ Tablas eliminadas correctamente\n');

    // Leer el archivo SQL de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', '20251024_create_partners_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Ejecutando migración SQL...');
    console.log('   Archivo:', migrationPath);
    console.log('   Tamaño:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Split into individual statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Total statements: ${statements.length}\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          await client.query(stmt);
          if (stmt.startsWith('CREATE TABLE')) {
            const tableName = stmt.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)?.[1];
            console.log(`   ✓ Tabla creada: ${tableName}`);
          }
        } catch (err) {
          // Log but continue for "already exists" errors
          if (!err.message.includes('already exists')) {
            console.error(`   ⚠️  Error en statement ${i + 1}:`, err.message.substring(0, 100));
          }
        }
      }
    }

    console.log('✅ Migración ejecutada exitosamente!\n');

    // Verificar que las tablas se crearon
    console.log('🔍 Verificando tablas creadas...\n');

    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'partner%'
      ORDER BY table_name;
    `;

    const result = await client.query(verifyQuery);

    console.log('📊 Tablas de Partners creadas:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    console.log(`\n✅ Total: ${result.rows.length} tablas\n`);

    // Verificar datos iniciales insertados
    const rolesQuery = 'SELECT COUNT(*) as count FROM partner_roles';
    const rolesResult = await client.query(rolesQuery);
    console.log(`✅ Roles de Partners insertados: ${rolesResult.rows[0].count}\n`);

    console.log('🎉 Sistema de Partners instalado correctamente!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Crear modelos Sequelize (Partner, PartnerRole, etc.)');
    console.log('   2. Crear API REST (/api/partners)');
    console.log('   3. Crear formulario de registro público');
    console.log('   4. Implementar sistema de firma digital');
    console.log('   5. Crear sección admin en panel-administrativo.html');
    console.log('   6. Crear marketplace en panel-empresa.html\n');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runPartnersMigration()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runPartnersMigration };
