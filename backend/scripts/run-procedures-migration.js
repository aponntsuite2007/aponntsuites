/**
 * Script para ejecutar la migración del Manual de Procedimientos
 *
 * Ejecutar: node scripts/run-procedures-migration.js
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🚀 Iniciando migración del Manual de Procedimientos...\n');

    // Cargar configuración de BD
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

    const { Client } = require('pg');

    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'attendance_system',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Aedr15150302'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL\n');

        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251207_create_procedures_manual.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📋 Ejecutando migración...\n');

        // Ejecutar migración
        await client.query(migrationSQL);

        console.log('✅ Migración completada exitosamente\n');

        // Verificar tablas creadas
        const tables = ['procedures', 'procedure_versions', 'procedure_roles', 'procedure_acknowledgements'];

        console.log('🔍 Verificando tablas creadas:\n');
        for (const table of tables) {
            const result = await client.query(`
                SELECT COUNT(*) as count FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = $1
            `, [table]);

            const exists = result.rows[0].count > 0;
            console.log(`   ${exists ? '✅' : '❌'} ${table}`);
        }

        // Verificar vista
        const viewResult = await client.query(`
            SELECT COUNT(*) as count FROM information_schema.views
            WHERE table_schema = 'public' AND table_name = 'v_employee_procedures'
        `);
        const viewExists = viewResult.rows[0].count > 0;
        console.log(`   ${viewExists ? '✅' : '❌'} v_employee_procedures (vista)`);

        console.log('\n✅ Manual de Procedimientos configurado correctamente');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\n⚠️  Las tablas ya existen. La migración ya fue ejecutada previamente.');
        }
    } finally {
        await client.end();
    }
}

runMigration();
