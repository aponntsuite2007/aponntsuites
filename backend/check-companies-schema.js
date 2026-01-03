/**
 * CHECK COMPANIES SCHEMA - Ver estructura real de la tabla
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function checkSchema() {
    try {
        console.log('🔍 [CHECK] Verificando esquema de tabla companies...\n');

        // Ver columnas de la tabla
        const schemaResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'companies'
            ORDER BY ordinal_position
        `);

        console.log(`📋 Columnas encontradas (${schemaResult.rows.length}):\n`);
        for (const col of schemaResult.rows) {
            console.log(`   - ${col.column_name} (${col.data_type})`);
        }

        // Ver una empresa de ejemplo
        console.log(`\n\n🏢 [SAMPLE] Primera empresa en la base de datos:\n`);

        const sampleResult = await pool.query(`
            SELECT *
            FROM companies
            LIMIT 1
        `);

        if (sampleResult.rows.length > 0) {
            const company = sampleResult.rows[0];
            console.log('Datos de la empresa:');
            for (const [key, value] of Object.entries(company)) {
                const displayValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value;
                console.log(`   ${key}: ${displayValue}`);
            }
        } else {
            console.log('   ⚠️ No hay empresas en la base de datos');
        }

    } catch (error) {
        console.error('❌ [ERROR]:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
