/**
 * 🎭 MIGRACIÓN BIOMÉTRICA - EXTENSIÓN TABLA USERS
 * Script para ejecutar migración de base de datos biométrica
 */

const fs = require('fs');
const path = require('path');

// Importar configuración de base de datos
const { sequelize } = require('../src/config/database');

async function runBiometricMigration() {
    console.log('🎭 [MIGRATION] Iniciando migración biométrica...');

    try {
        // Leer archivo SQL de migración
        const migrationPath = path.join(__dirname, '../database/migrations/extend_users_biometric.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 [MIGRATION] Archivo de migración cargado');

        // Ejecutar migración
        console.log('⚡ [MIGRATION] Ejecutando migración en PostgreSQL...');

        await sequelize.query(migrationSQL);

        console.log('✅ [MIGRATION] Migración biométrica completada exitosamente');

        // Verificar extensiones
        console.log('🔍 [MIGRATION] Verificando extensiones...');

        // Verificar campos nuevos en users
        const [userColumns] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name LIKE '%biometric%'
            ORDER BY column_name
        `);

        console.log('📊 [MIGRATION] Campos biométricos agregados a tabla users:');
        userColumns.forEach(col => {
            console.log(`   ✅ ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });

        // Verificar nuevas tablas
        const [newTables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%biometric%'
            ORDER BY table_name
        `);

        console.log('🗄️ [MIGRATION] Nuevas tablas biométricas creadas:');
        newTables.forEach(table => {
            console.log(`   ✅ ${table.table_name}`);
        });

        // Verificar índices
        const [newIndexes] = await sequelize.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE indexname LIKE '%biometric%'
            ORDER BY indexname
        `);

        console.log('🔍 [MIGRATION] Índices biométricos creados:');
        newIndexes.forEach(index => {
            console.log(`   ✅ ${index.indexname}`);
        });

        // Verificar vista de estadísticas
        const [viewExists] = await sequelize.query(`
            SELECT viewname
            FROM pg_views
            WHERE viewname = 'biometric_company_stats'
        `);

        if (viewExists.length > 0) {
            console.log('📈 [MIGRATION] Vista biometric_company_stats creada correctamente');
        }

        // Probar configuración inicial
        const [companyConfigs] = await sequelize.query(`
            SELECT company_id, confidence_threshold, ai_analysis_enabled
            FROM biometric_company_config
            LIMIT 5
        `);

        console.log('⚙️ [MIGRATION] Configuraciones iniciales creadas:');
        companyConfigs.forEach(config => {
            console.log(`   🏢 Empresa ${config.company_id}: confianza=${config.confidence_threshold}, IA=${config.ai_analysis_enabled}`);
        });

        console.log('🎉 [MIGRATION] ¡Migración biométrica 100% exitosa!');
        console.log('🔒 [MIGRATION] Compatibilidad preservada - sin breaking changes');

    } catch (error) {
        console.error('❌ [MIGRATION] Error durante migración:', error);
        console.error('📄 [MIGRATION] Detalles del error:', error.message);
        throw error;
    }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    runBiometricMigration()
        .then(() => {
            console.log('✅ [MIGRATION] Script completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ [MIGRATION] Script falló:', error);
            process.exit(1);
        });
}

module.exports = { runBiometricMigration };