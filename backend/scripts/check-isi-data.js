const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'Aedr15150302', database: 'attendance_system' });

async function check() {
    // Verificar empresa ISI
    const company = await pool.query('SELECT company_id, name, slug FROM companies WHERE company_id = 11');
    console.log('=== EMPRESA ===');
    console.log(company.rows[0]);

    // Verificar runs de ISI
    console.log('\n=== LIQUIDACIONES DE ISI (company_id=11) ===');
    const runs = await pool.query('SELECT id, run_name, period_month, period_year, total_employees, total_net, status FROM payroll_runs WHERE company_id = 11 ORDER BY id DESC');
    runs.rows.forEach(r => {
        console.log('  Run', r.id, ':', r.run_name);
        console.log('    Periodo:', r.period_month + '/' + r.period_year, '| Empleados:', r.total_employees, '| Neto: $' + parseFloat(r.total_net).toLocaleString(), '| Status:', r.status);
    });

    // Verificar empleados asignados de ISI
    console.log('\n=== EMPLEADOS ISI CON PLANTILLA ASIGNADA ===');
    const emps = await pool.query(`
        SELECT u."firstName", u."lastName", upa.base_salary, pt.template_name
        FROM user_payroll_assignment upa
        JOIN users u ON upa.user_id = u.user_id
        JOIN payroll_templates pt ON upa.template_id = pt.id
        WHERE upa.company_id = 11 AND upa.is_current = true
        ORDER BY upa.base_salary DESC
    `);
    emps.rows.forEach(e => {
        console.log('  ', e.firstName, e.lastName, '- Salario: $' + parseFloat(e.base_salary).toLocaleString(), '- Plantilla:', e.template_name);
    });

    await pool.end();
}
check();
