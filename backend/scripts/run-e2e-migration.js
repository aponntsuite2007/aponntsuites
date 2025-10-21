/**
 * Run E2E Migration - Add 'e2e' to audit_log_test_type enum
 */

const fs = require('fs');
const path = require('path');
const database = require('../src/config/database');

async function runMigration() {
  try {
    console.log('\n🔧 [MIGRATION] Ejecutando migración E2E...\n');

    const migrationPath = path.join(__dirname, '../migrations/20251022_add_e2e_to_audit_logs.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await database.sequelize.query(sql);

    console.log('✅ [SUCCESS] Migración ejecutada correctamente\n');
    console.log('   Valor "e2e" agregado a audit_log_test_type enum\n');

    process.exit(0);

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  [INFO] Valor "e2e" ya existe en el enum (OK)\n');
      process.exit(0);
    } else {
      console.error('❌ [ERROR] Error ejecutando migración:', error.message);
      process.exit(1);
    }
  }
}

runMigration();
