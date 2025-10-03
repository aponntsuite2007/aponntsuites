const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

async function runMigration() {
    try {
        console.log('📋 [MIGRATION] Iniciando migración de kiosks...');

        // Leer archivo SQL
        const sqlFilePath = path.join(__dirname, '../../database/migrations/20251002_kiosks_system.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('📄 [MIGRATION] Archivo SQL cargado');
        console.log('🔄 [MIGRATION] Ejecutando migración...');

        // Ejecutar SQL
        await sequelize.query(sqlContent);

        console.log('✅ [MIGRATION] Migración completada exitosamente');
        console.log('📟 [MIGRATION] Sistema de kiosks instalado');

        process.exit(0);

    } catch (error) {
        console.error('❌ [MIGRATION] Error ejecutando migración:', error);
        process.exit(1);
    }
}

// Ejecutar
runMigration();
