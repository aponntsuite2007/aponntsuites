/**
 * Script para ejecutar migración del sistema Analytics
 * Usa pg directamente (no requiere psql instalado)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
    console.log('📊 ATTENDANCE ANALYTICS SYSTEM - Migración');
    console.log('===========================================\n');

    // Configuración PostgreSQL
    const client = new Client({
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        // Conectar
        console.log('🔌 Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado\n');

        // Leer migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251121_create_attendance_analytics_system.sql');
        console.log(`📄 Leyendo migración: ${path.basename(migrationPath)}`);

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log(`📏 Tamaño: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

        // Ejecutar migración
        console.log('⏳ Ejecutando migración (puede tomar 10-30 segundos)...\n');

        const startTime = Date.now();
        const result = await client.query(migrationSQL);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`✅ Migración ejecutada en ${duration} segundos\n`);

        // Verificar tablas creadas
        console.log('🔍 Verificando objetos creados...\n');

        const verifyQuery = `
            SELECT
                (SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name IN (
                     'attendance_profiles', 'attendance_patterns',
                     'attendance_analytics_cache', 'comparative_analytics',
                     'scoring_history'
                 )) as tables_count,
                (SELECT COUNT(*) FROM pg_matviews
                 WHERE schemaname = 'public' AND matviewname = 'attendance_rankings') as views_count,
                (SELECT COUNT(*) FROM pg_proc
                 WHERE proname IN ('refresh_attendance_profiles', 'refresh_all_profiles_batch',
                                   'detect_tolerance_abuser_pattern')) as functions_count
        `;

        const verification = await client.query(verifyQuery);
        const { tables_count, views_count, functions_count } = verification.rows[0];

        console.log(`📊 Tablas creadas: ${tables_count} / 5`);
        console.log(`📈 Materialized views: ${views_count} / 1`);
        console.log(`⚙️  Stored procedures: ${functions_count} / 3\n`);

        if (tables_count == 5 && views_count == 1 && functions_count == 3) {
            console.log('✅✅✅ MIGRACIÓN COMPLETADA EXITOSAMENTE ✅✅✅');
            console.log('\n🎯 Sistema Analytics listo para usar');
            console.log('📝 Próximo paso: Crear modelos Sequelize\n');
            process.exit(0);
        } else {
            console.error('⚠️ ADVERTENCIA: Algunos objetos no se crearon');
            console.error('Revisar logs de PostgreSQL para detalles');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ ERROR EJECUTANDO MIGRACIÓN:');
        console.error('Mensaje:', error.message);
        console.error('\nStack:', error.stack);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Ejecutar
runMigration().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
