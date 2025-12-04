/**
 * Script para ejecutar la migración de snapshot de liquidaciones
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function main() {
    console.log('🚀 Ejecutando migración de snapshot para payroll_run_details...');

    try {
        const migrationPath = path.join(__dirname, '../migrations/20251202_payroll_run_details_snapshot.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Migración ejecutada exitosamente');

        // Verificar que se crearon las columnas
        const verifyResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'payroll_run_details'
            AND column_name IN ('employee_snapshot', 'payslip_template_snapshot')
        `);

        console.log('\n📋 Columnas de snapshot verificadas:');
        verifyResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });

        // Verificar función
        const funcResult = await pool.query(`
            SELECT proname FROM pg_proc
            WHERE proname IN ('create_employee_liquidation_snapshot', 'create_payslip_template_snapshot')
        `);

        console.log('\n📋 Funciones de snapshot creadas:');
        funcResult.rows.forEach(row => {
            console.log(`   - ${row.proname}()`);
        });

        // Verificar vista
        const viewResult = await pool.query(`
            SELECT viewname FROM pg_views
            WHERE viewname = 'vw_payroll_historical_details'
        `);

        if (viewResult.rows.length > 0) {
            console.log('\n✅ Vista vw_payroll_historical_details creada');
        }

        console.log('\n🎉 Todo listo! El histórico de liquidaciones ahora preserva datos de cargos.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detalle:', error.detail);
    } finally {
        await pool.end();
    }
}

main();
