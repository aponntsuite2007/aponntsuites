/**
 * SCRIPT: Ejecutar migración para agregar columna bcc_email
 * Ejecutar: node scripts/run-bcc-email-migration.js
 */

require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Construir connection string desde variables individuales o usar DATABASE_URL
const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

console.log('📦 Conectando a:', process.env.POSTGRES_HOST || 'render.com');

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔧 [BCC-MIGRATION] Ejecutando migración para bcc_email...\n');

    const migrationPath = path.join(__dirname, '../migrations/20260202_add_bcc_to_email_configs.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Archivo de migración no encontrado:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);

    console.log('✅ [BCC-MIGRATION] Migración ejecutada correctamente');
    console.log('   - aponnt_email_config.bcc_email agregado');
    console.log('   - company_email_config.bcc_email agregado');
    console.log('   - email_configurations.bcc_email verificado');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  [BCC-MIGRATION] La columna ya existe (OK)');
    } else {
      console.error('❌ [BCC-MIGRATION] Error:', error.message);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
