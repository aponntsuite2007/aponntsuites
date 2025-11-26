/**
 * Script para ejecutar la migración completa de Sistema Médico + Deportes + Salarios
 * Fecha: 2025-11-26
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'attendance_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Aedr15150302'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('='.repeat(70));
        console.log('MIGRACIÓN: Sistema Médico Avanzado + Deportes + Salarios');
        console.log('='.repeat(70));
        console.log('');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '..', 'migrations', '20251126_complete_medical_sports_salary_system.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Ejecutando migración...');
        console.log('');

        await client.query('BEGIN');

        // Ejecutar el SQL completo
        await client.query(sql);

        await client.query('COMMIT');

        console.log('Verificando tablas creadas...');
        console.log('');

        // Verificar tablas creadas
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'user_anthropometric_data',
                'chronic_conditions_catalog',
                'user_chronic_conditions_v2',
                'user_surgeries',
                'user_psychiatric_treatments',
                'sports_catalog',
                'user_sports_activities',
                'user_healthy_habits',
                'labor_agreements_catalog',
                'salary_categories',
                'user_salary_config_v2',
                'user_payroll_records'
            )
            ORDER BY table_name;
        `);

        console.log('Tablas creadas:');
        tablesResult.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });
        console.log('');

        // Verificar catálogos poblados
        const chronicCount = await client.query('SELECT COUNT(*) FROM chronic_conditions_catalog');
        const sportsCount = await client.query('SELECT COUNT(*) FROM sports_catalog');
        const laborCount = await client.query('SELECT COUNT(*) FROM labor_agreements_catalog');

        console.log('Catálogos poblados:');
        console.log(`  ✅ Condiciones crónicas: ${chronicCount.rows[0].count} registros`);
        console.log(`  ✅ Deportes: ${sportsCount.rows[0].count} registros`);
        console.log(`  ✅ Convenios laborales: ${laborCount.rows[0].count} registros`);
        console.log('');

        // Verificar triggers
        const triggersResult = await client.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_name IN ('trg_calculate_bmi', 'trg_calculate_payroll');
        `);

        console.log('Triggers creados:');
        triggersResult.rows.forEach(row => {
            console.log(`  ✅ ${row.trigger_name} en ${row.event_object_table}`);
        });
        console.log('');

        console.log('='.repeat(70));
        console.log('MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('='.repeat(70));

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('ERROR en migración:', error.message);

        if (error.message.includes('already exists')) {
            console.log('');
            console.log('NOTA: Algunas tablas ya existían. Esto es normal si la migración');
            console.log('se ejecutó anteriormente.');
        }

        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(err => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
