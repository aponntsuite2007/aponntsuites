/**
 * Script para ejecutar migración de campos SLA warning
 */

const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('📊 Ejecutando migración: 20260107_add_sla_warning_fields.sql...');

        const migrationPath = path.join(__dirname, '../migrations/20260107_add_sla_warning_fields.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await sequelize.query(sql);

        console.log('✅ Migración ejecutada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        process.exit(1);
    }
}

runMigration();
