/**
 * FIX AUDIT LOGS SCHEMA
 * Agrega columna test_description faltante
 */

// Force DATABASE_URL to be set if not already
if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL no configurada, usando local');
}

const database = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function fixAuditLogsSchema() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        console.log(`📍 Database: ${process.env.DATABASE_URL ? 'Render PostgreSQL' : 'Local PostgreSQL'}\n`);

        await database.sequelize.authenticate();
        console.log('✅ Conexión exitosa\n');

        console.log('🔧 Ejecutando migración: add test_description...');

        const migrationPath = path.join(__dirname, '../migrations/20251020_add_test_description_to_audit_logs.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await database.sequelize.query(sql);

        console.log('✅ Migración ejecutada exitosamente');
        console.log('✅ Columna test_description agregada a audit_logs\n');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        process.exit(1);
    } finally {
        await database.sequelize.close();
    }
}

fixAuditLogsSchema();
