const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'Aedr15150302', database: 'attendance_system' });

async function verify() {
    console.log('=== VERIFICANDO DATOS DE LIQUIDACIÓN ===\n');

    // Ver runs
    console.log('--- Payroll Runs ---');
    const runs = await pool.query('SELECT id, run_code, period_year, period_month, total_employees, total_gross, total_net, status FROM payroll_runs WHERE company_id = 11 ORDER BY id DESC LIMIT 3');
    runs.rows.forEach(r => {
        console.log('  Run', r.id, ':', r.period_month + '/' + r.period_year);
        console.log('    Empleados:', r.total_employees, '| Bruto: $' + parseFloat(r.total_gross).toLocaleString(), '| Neto: $' + parseFloat(r.total_net).toLocaleString(), '| Status:', r.status);
    });

    // Ver detalles del último run
    console.log('\n--- Detalles Run ID 10 ---');
    const details = await pool.query(`
        SELECT prd.*, u."firstName", u."lastName"
        FROM payroll_run_details prd
        JOIN users u ON prd.user_id = u.user_id
        WHERE prd.run_id = 10
        ORDER BY prd.gross_earnings DESC
    `);
    details.rows.forEach(d => {
        console.log('  ', d.firstName, d.lastName);
        console.log('    Bruto: $' + parseFloat(d.gross_earnings).toLocaleString(), '| Deduc: $' + parseFloat(d.total_deductions).toLocaleString(), '| Neto: $' + parseFloat(d.net_salary).toLocaleString());
    });

    // Ver asignaciones
    console.log('\n--- Asignaciones Activas ---');
    const assigns = await pool.query('SELECT COUNT(*) as count FROM user_payroll_assignment WHERE company_id = 11 AND is_current = true');
    console.log('  Total asignaciones:', assigns.rows[0].count);

    await pool.end();
}
verify();
