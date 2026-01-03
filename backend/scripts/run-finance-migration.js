/**
 * Script para ejecutar la migración del sistema Finance Enterprise
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

async function runMigration() {
    console.log('💰 [FINANCE] Iniciando migración del Sistema Financiero Enterprise...\n');

    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251231_create_finance_enterprise_system.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Archivo de migración cargado');
        console.log('⏳ Ejecutando migración (esto puede tomar unos segundos)...\n');

        // Ejecutar la migración
        await client.query(migrationSQL);

        console.log('✅ Migración completada exitosamente!\n');

        // Verificar tablas creadas
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'finance_%'
            ORDER BY table_name
        `);

        console.log(`📊 Tablas Finance creadas: ${result.rows.length}`);
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        if (error.position) {
            console.error('   Posición del error:', error.position);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
