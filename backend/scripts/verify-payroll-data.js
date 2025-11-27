const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: false
});

async function verify() {
    // Check payroll runs for ISI
    const [runs] = await sequelize.query(`
        SELECT id, run_code, run_name, total_employees, total_gross, total_net, status
        FROM payroll_runs
        WHERE company_id = 11
        ORDER BY id DESC
    `);
    console.log('=== PAYROLL RUNS ISI ===');
    runs.forEach(r => console.log(`  ${r.id}: ${r.run_code} - ${r.total_employees} emps, Bruto: $${r.total_gross}, Neto: $${r.total_net}, Status: ${r.status}`));

    // Check run details for the new run (last run created)
    const newRunId = runs.find(r => r.run_code === 'LIQ-NOV-2025-DETAIL')?.id || 3;
    const [details] = await sequelize.query(`
        SELECT rd.*, u."firstName", u."lastName"
        FROM payroll_run_details rd
        JOIN users u ON rd.user_id = u.user_id
        WHERE rd.run_id = ${newRunId}
    `);
    console.log(`\n=== PAYROLL RUN DETAILS (Run ${newRunId}) ===`);
    details.forEach(d => {
        console.log(`  ${d.firstName} ${d.lastName}:`);
        console.log(`    - Días: ${d.worked_days}, Horas: ${d.worked_hours}, HE50: ${d.overtime_50_hours}`);
        console.log(`    - Bruto: $${d.gross_earnings}, Neto: $${d.net_salary}`);
        console.log(`    - Recibo: ${d.receipt_number}`);
    });

    // Check attendance count
    const [attendance] = await sequelize.query(`
        SELECT COUNT(*) as count FROM attendances
        WHERE company_id = 11
        AND date >= '2025-11-01' AND date <= '2025-11-30'
    `);
    console.log('\n=== FICHAJES NOV 2025 ===');
    console.log(`  Total: ${attendance[0].count} registros`);

    // Check holidays
    const [holidays] = await sequelize.query(`
        SELECT date, name FROM holidays
        WHERE country = 'AR' AND year = 2025
        ORDER BY date
    `);
    console.log('\n=== FERIADOS ARGENTINA 2025 ===');
    holidays.forEach(h => console.log(`  ${h.date}: ${h.name}`));

    await sequelize.close();
}
verify();
