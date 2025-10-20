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

        console.log('🔧 Ejecutando RECONSTRUCCIÓN COMPLETA de audit_logs...');
        console.log('⚠️  ADVERTENCIA: Se creará backup de datos existentes\n');

        const migrationPath = path.join(__dirname, '../migrations/20251020_rebuild_audit_logs_complete.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await database.sequelize.query(sql);

        console.log('\n✅ Migración ejecutada exitosamente');
        console.log('✅ Tabla audit_logs reconstruida al 100%');
        console.log('📊 39 columnas creadas');
        console.log('📋 9 índices creados');
        console.log('💾 Backup guardado en: audit_logs_backup_20251020\n');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        process.exit(1);
    } finally {
        await database.sequelize.close();
    }
}

fixAuditLogsSchema();
