/**
 * Ejecutar fixes críticos de WMS
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function runFixes() {
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

        const sql = fs.readFileSync(
            path.join(__dirname, '..', 'migrations', '20251231_wms_critical_fixes.sql'),
            'utf8'
        );

        console.log('🔧 Ejecutando fixes críticos WMS...\n');
        await client.query(sql);
        console.log('\n✅ Fixes aplicados exitosamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

runFixes();
