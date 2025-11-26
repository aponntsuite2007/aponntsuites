/**
 * EJECUTAR MIGRACIÓN: SISTEMA COMPLETO DE PERFIL DE EMPLEADO
 * Crea 18 nuevas tablas para funcionalidad 100% del modal
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');

async function runMigration() {
    try {
        console.log('🔄 Iniciando migración del sistema de perfil de empleado...\n');

        // Conectar a la base de datos
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos establecida\n');

        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'migrations', '20250128_complete_user_profile_system.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📄 Ejecutando migración SQL...\n');

        // Ejecutar la migración
        await sequelize.query(migrationSQL);

        console.log('✅ Migración ejecutada exitosamente\n');

        // Verificar tablas creadas
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'user_%'
            ORDER BY table_name
        `);

        console.log('📋 Tablas del perfil de usuario creadas:');
        tables.forEach((table, index) => {
            console.log(`   ${index + 1}. ${table.table_name}`);
        });

        console.log(`\n✅ Total: ${tables.length} tablas\n`);

        // Verificar índices
        const [indexes] = await sequelize.query(`
            SELECT
                tablename,
                indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename LIKE 'user_%'
            ORDER BY tablename, indexname
        `);

        console.log('📊 Índices creados:');
        indexes.forEach((idx, index) => {
            console.log(`   ${index + 1}. ${idx.indexname} en ${idx.tablename}`);
        });

        console.log(`\n✅ Total: ${indexes.length} índices\n`);

        // Verificar triggers
        const [triggers] = await sequelize.query(`
            SELECT
                event_object_table AS table_name,
                trigger_name
            FROM information_schema.triggers
            WHERE event_object_schema = 'public'
            AND event_object_table LIKE 'user_%'
            AND trigger_name LIKE '%updated_at%'
            ORDER BY event_object_table
        `);

        console.log('⚡ Triggers de updated_at creados:');
        triggers.forEach((trg, index) => {
            console.log(`   ${index + 1}. ${trg.trigger_name} en ${trg.table_name}`);
        });

        console.log(`\n✅ Total: ${triggers.length} triggers\n`);

        console.log('🎉 ¡Migración completada exitosamente!\n');
        console.log('📌 Próximo paso: Crear modelos Sequelize para estas tablas\n');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        console.error(error);
        await sequelize.close();
        process.exit(1);
    }
}

runMigration();
