// ============================================
// PANEL-TRANSPORTE - MIGRACIÓN EN POSTGRESQL
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Ejecutar migración desde el entorno del sistema biométrico

const fs = require('fs');
const path = require('path');

// Usar la configuración de base de datos existente
const dbConfig = require('./src/config/database-postgresql');

async function executeMigration() {
    try {
        console.log('🔄 [TRANSPORT-MIGRATION] Iniciando migración Panel Transporte...');

        // Conectar a la base de datos
        await dbConfig.connect();
        console.log('✅ [TRANSPORT-MIGRATION] Conectado a PostgreSQL');

        // Leer el archivo SQL de migración
        const sqlFile = path.join('C:', 'Transporte', 'database', 'transport_modules_postgresql.sql');
        console.log(`📄 [TRANSPORT-MIGRATION] Leyendo: ${sqlFile}`);

        if (!fs.existsSync(sqlFile)) {
            throw new Error(`Archivo SQL no encontrado: ${sqlFile}`);
        }

        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        console.log(`📊 [TRANSPORT-MIGRATION] Archivo leído: ${sqlContent.length} caracteres`);

        // Ejecutar el script SQL usando Sequelize
        console.log('🔄 [TRANSPORT-MIGRATION] Ejecutando migración...');

        try {
            await dbConfig.sequelize.query(sqlContent);
            console.log('✅ [TRANSPORT-MIGRATION] Script SQL ejecutado exitosamente');
        } catch (sqlError) {
            console.error('❌ [TRANSPORT-MIGRATION] Error ejecutando SQL:', sqlError.message);
            throw sqlError;
        }

        // Verificar los resultados de la migración
        console.log('🔍 [TRANSPORT-MIGRATION] Verificando resultados...');

        // Verificar módulos insertados
        const modulesResult = await dbConfig.sequelize.query(
            `SELECT COUNT(*) as count FROM system_modules WHERE module_key LIKE 'transport-%'`,
            { type: dbConfig.sequelize.QueryTypes.SELECT }
        );
        const modulesCount = modulesResult[0].count;
        console.log(`✅ [TRANSPORT-MIGRATION] Módulos de transporte: ${modulesCount}`);

        // Verificar empresas insertadas
        const companiesResult = await dbConfig.sequelize.query(
            `SELECT COUNT(*) as count FROM companies WHERE metadata->>'created_for' = 'panel-transporte'`,
            { type: dbConfig.sequelize.QueryTypes.SELECT }
        );
        const companiesCount = companiesResult[0].count;
        console.log(`✅ [TRANSPORT-MIGRATION] Empresas de transporte: ${companiesCount}`);

        // Verificar asignaciones de módulos
        const assignmentsResult = await dbConfig.sequelize.query(
            `SELECT COUNT(*) as count
             FROM company_modules cm
             JOIN system_modules sm ON cm.system_module_id = sm.id
             WHERE sm.module_key LIKE 'transport-%'`,
            { type: dbConfig.sequelize.QueryTypes.SELECT }
        );
        const assignmentsCount = assignmentsResult[0].count;
        console.log(`✅ [TRANSPORT-MIGRATION] Asignaciones de módulos: ${assignmentsCount}`);

        // Listar empresas creadas
        console.log('📋 [TRANSPORT-MIGRATION] Empresas de transporte disponibles:');
        const companiesList = await dbConfig.sequelize.query(
            `SELECT id, name, slug, display_name
             FROM companies
             WHERE metadata->>'created_for' = 'panel-transporte'
             ORDER BY name`,
            { type: dbConfig.sequelize.QueryTypes.SELECT }
        );

        companiesList.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (${company.slug}) - ID: ${company.company_id}`);
        });

        // Listar módulos creados
        console.log('📦 [TRANSPORT-MIGRATION] Módulos de transporte disponibles:');
        const modulesList = await dbConfig.sequelize.query(
            `SELECT id, module_key, name, base_price
             FROM system_modules
             WHERE module_key LIKE 'transport-%'
             ORDER BY display_order`,
            { type: dbConfig.sequelize.QueryTypes.SELECT }
        );

        modulesList.forEach((module, index) => {
            console.log(`   ${index + 1}. ${module.module_key} - ${module.name} ($${module.base_price})`);
        });

        console.log('🎯 [TRANSPORT-MIGRATION] MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('📊 [TRANSPORT-MIGRATION] Resumen:');
        console.log(`   - Módulos creados: ${modulesCount}`);
        console.log(`   - Empresas creadas: ${companiesCount}`);
        console.log(`   - Asignaciones creadas: ${assignmentsCount}`);

    } catch (error) {
        console.error('❌ [TRANSPORT-MIGRATION] Error en migración:', error);
        console.error('❌ [TRANSPORT-MIGRATION] Stack:', error.stack);
        throw error;
    } finally {
        try {
            await dbConfig.close();
            console.log('🔐 [TRANSPORT-MIGRATION] Conexión cerrada');
        } catch (closeError) {
            console.error('⚠️ [TRANSPORT-MIGRATION] Error cerrando conexión:', closeError);
        }
    }
}

// Ejecutar migración
if (require.main === module) {
    executeMigration()
        .then(() => {
            console.log('🎉 [TRANSPORT-MIGRATION] PANEL-TRANSPORTE INTEGRADO A POSTGRESQL');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 [TRANSPORT-MIGRATION] FALLO EN MIGRACIÓN:', error.message);
            process.exit(1);
        });
}

module.exports = { executeMigration };