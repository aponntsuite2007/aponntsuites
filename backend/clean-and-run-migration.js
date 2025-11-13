/**
 * ========================================================================
 * SCRIPT: Limpiar y Ejecutar Migración de Sistema Consciente
 * ========================================================================
 * Primero limpia funciones existentes, luego ejecuta la migración
 * ========================================================================
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function cleanAndMigrate() {
    console.log('🚀 Iniciando limpieza y migración de Sistema Consciente...\n');

    // Configurar conexión desde .env
    const connectionString = process.env.DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

    console.log('📡 Conectando a base de datos...');
    console.log(`   ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

    const client = new Client({
        connectionString: connectionString,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });

    try {
        // Conectar
        await client.connect();
        console.log('✅ Conexión establecida\n');

        // PASO 1: Limpiar funciones existentes
        console.log('🧹 Limpiando funciones existentes...\n');

        const cleanupSQL = `
            -- Eliminar todas las versiones de las funciones
            DROP FUNCTION IF EXISTS can_module_work(VARCHAR, TEXT[]);
            DROP FUNCTION IF EXISTS get_system_context(INTEGER);
            DROP FUNCTION IF EXISTS analyze_deactivation_impact(VARCHAR);
            DROP FUNCTION IF EXISTS get_system_stats();
        `;

        await client.query(cleanupSQL);
        console.log('✅ Funciones limpiadas\n');

        // PASO 2: Leer y ejecutar migración
        const migrationPath = path.join(__dirname, 'migrations', '20251101_create_system_consciousness.sql');
        console.log('📄 Leyendo migración:', migrationPath);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log(`   Tamaño: ${(sql.length / 1024).toFixed(2)} KB\n`);

        console.log('⚙️  Ejecutando migración...\n');
        await client.query(sql);
        console.log('✅ Migración ejecutada exitosamente\n');

        // PASO 3: Verificar resultados
        console.log('🔍 Verificando resultados...\n');

        const verifyQueries = [
            {
                name: 'Metadatos del sistema',
                query: 'SELECT COUNT(*) as count FROM system_metadata'
            },
            {
                name: 'Módulos registrados',
                query: 'SELECT COUNT(*) as count FROM system_modules_registry'
            },
            {
                name: 'Logs del sistema',
                query: 'SELECT COUNT(*) as count FROM system_consciousness_log'
            }
        ];

        for (const { name, query } of verifyQueries) {
            try {
                const res = await client.query(query);
                console.log(`✅ ${name}: ${res.rows[0].count}`);
            } catch (err) {
                console.error(`❌ Error verificando ${name}:`, err.message);
            }
        }

        // Verificar estadísticas
        try {
            console.log('\n📊 Estadísticas del sistema:');
            const statsRes = await client.query('SELECT get_system_stats() as stats');
            const stats = statsRes.rows[0].stats;
            console.log(`   - Total módulos: ${stats.total_modules}`);
            console.log(`   - Módulos CORE: ${stats.core_modules}`);
            console.log(`   - Módulos OPCIONAL: ${stats.optional_modules}`);
            console.log(`   - Herramientas ADMIN: ${stats.admin_tools}`);
            console.log(`   - Total metadatos: ${stats.total_metadata}`);
            console.log(`   - Total eventos: ${stats.total_events}`);
        } catch (err) {
            console.error(`❌ Error obteniendo estadísticas:`, err.message);
        }

        console.log('\n========================================');
        console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('========================================\n');

        console.log('📝 Funciones PostgreSQL disponibles:');
        console.log('   - can_module_work(module_key, active_modules[])');
        console.log('   - get_system_context(company_id)');
        console.log('   - analyze_deactivation_impact(module_key)');
        console.log('   - get_system_stats()');
        console.log('\n💡 Ejemplos de uso:');
        console.log('   SELECT get_system_stats();');
        console.log('   SELECT get_system_context(1);');
        console.log('   SELECT can_module_work(\'attendance\', ARRAY[\'users\', \'shifts\']);');
        console.log('   SELECT analyze_deactivation_impact(\'users\');\n');

    } catch (error) {
        console.error('\n❌ Error ejecutando migración:');
        console.error('   ', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('👋 Conexión cerrada\n');
    }
}

// Ejecutar
cleanAndMigrate();
