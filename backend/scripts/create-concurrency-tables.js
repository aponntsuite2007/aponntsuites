/**
 * Script para crear tablas de concurrencia SIAC
 * Solución a 20 años de limitaciones de Access
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function createConcurrencyTables() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conexión establecida');

        // Leer archivo SQL de concurrencia
        const sqlFile = path.join(__dirname, '../sql/002_create_siac_concurrency.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        console.log('🔄 Ejecutando script de concurrencia SIAC...');

        // Ejecutar SQL completo (PostgreSQL soporta múltiples statements)
        await sequelize.query(sqlContent);

        console.log('✅ Tablas de concurrencia creadas exitosamente');

        // Verificar tablas creadas
        const [tables] = await sequelize.query(`
            SELECT table_name,
                   (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            AND table_name LIKE 'siac_%'
            ORDER BY table_name;
        `);

        console.log('📋 Tablas SIAC en la base de datos:');
        tables.forEach(table => {
            console.log(`   ✓ ${table.table_name} (${table.column_count} columnas)`);
        });

        // Verificar funciones creadas
        const [functions] = await sequelize.query(`
            SELECT routine_name, routine_type
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name LIKE '%siac%' OR routine_name LIKE '%sesiones%' OR routine_name LIKE '%numero%'
            ORDER BY routine_name;
        `);

        console.log('⚙️ Funciones PostgreSQL creadas:');
        functions.forEach(func => {
            console.log(`   ✓ ${func.routine_name} (${func.routine_type})`);
        });

        // Test rápido de función de numeración
        console.log('🧪 Testing función de numeración segura...');

        try {
            const [result] = await sequelize.query(`
                SELECT * FROM obtener_proximo_numero_seguro(21, 'facturaA', 'test_session_001', 1, 'TEST_TERMINAL');
            `);

            console.log('✅ Test de numeración exitoso:', result[0]);
        } catch (testError) {
            console.log('⚠️ Test de numeración falló (normal si no existe empresa 21):', testError.message);
        }

        // Verificar terminales por defecto
        const [terminales] = await sequelize.query(`
            SELECT company_id, terminal_id, nombre_terminal, tipo_terminal
            FROM siac_configuracion_terminal
            ORDER BY company_id, terminal_id;
        `);

        console.log('🖥️ Terminales configurados:');
        terminales.forEach(terminal => {
            console.log(`   ✓ ${terminal.terminal_id} - ${terminal.nombre_terminal} (${terminal.tipo_terminal})`);
        });

        console.log('🎉 ¡Sistema de concurrencia SIAC implementado exitosamente!');

        // Estadísticas finales
        const [stats] = await sequelize.query(`
            SELECT
                (SELECT count(*) FROM siac_configuracion_empresa) as empresas_configuradas,
                (SELECT count(*) FROM siac_sesiones_locales WHERE is_active = true) as sesiones_activas,
                (SELECT count(*) FROM siac_configuracion_terminal WHERE activo = true) as terminales_activos,
                (SELECT count(*) FROM siac_numeracion_log) as registros_numeracion;
        `);

        console.log('📊 Estadísticas del sistema:');
        console.log(`   📈 Empresas configuradas: ${stats[0].empresas_configuradas}`);
        console.log(`   🖥️ Terminales activos: ${stats[0].terminales_activos}`);
        console.log(`   ⚡ Sesiones activas: ${stats[0].sesiones_activas}`);
        console.log(`   📋 Registros de numeración: ${stats[0].registros_numeracion}`);

    } catch (error) {
        console.error('❌ Error creando sistema de concurrencia:', error.message);

        // Diagnóstico adicional
        if (error.message.includes('syntax error')) {
            console.error('💡 Probable error de sintaxis SQL. Revisar archivo 002_create_siac_concurrency.sql');
        }

        if (error.message.includes('does not exist')) {
            console.error('💡 Probable tabla/función faltante. Ejecutar primero 001_create_siac_tables.sql');
        }
    } finally {
        await sequelize.close();
        console.log('🔒 Conexión cerrada');
    }
}

// Ejecutar script
createConcurrencyTables();