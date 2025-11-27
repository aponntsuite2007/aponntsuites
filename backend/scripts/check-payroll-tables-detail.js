/**
 * Check key payroll/attendance table structures in detail
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: false
});

async function checkTables() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database\n');

        const tablesToCheck = [
            'attendances',
            'payroll_run_details',
            'payroll_template_concepts',
            'payroll_templates',
            'payroll_concept_types',
            'user_payroll_assignment',
            'user_salary_config',
            'salary_categories'
        ];

        for (const table of tablesToCheck) {
            const [cols] = await sequelize.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = '${table}'
                ORDER BY ordinal_position
            `);

            console.log(`\n=== ${table.toUpperCase()} (${cols.length} columns) ===`);
            cols.forEach(c => {
                const nullable = c.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
                const defaultVal = c.column_default ? ` DEFAULT ${c.column_default.substring(0, 30)}` : '';
                console.log(`  ${c.column_name}: ${c.data_type}${nullable}${defaultVal}`);
            });
        }

        // Check existing payroll runs for ISI
        console.log('\n\n=== EXISTING ISI PAYROLL RUNS ===');
        const [runs] = await sequelize.query(`
            SELECT id, run_code, run_name, period_year, period_month, total_employees, total_gross, status
            FROM payroll_runs
            WHERE company_id = 11
            ORDER BY id DESC
            LIMIT 5
        `);
        if (runs.length > 0) {
            runs.forEach(r => console.log(`  ${r.run_code}: ${r.run_name} - ${r.total_employees} emp, $${r.total_gross}, ${r.status}`));
        } else {
            console.log('  (no runs found)');
        }

        // Check existing payroll templates
        console.log('\n=== EXISTING PAYROLL TEMPLATES ===');
        const [templates] = await sequelize.query(`
            SELECT id, name, country, payment_frequency, is_active
            FROM payroll_templates
            LIMIT 5
        `);
        if (templates.length > 0) {
            templates.forEach(t => console.log(`  ${t.id}: ${t.name} (${t.country}, ${t.payment_frequency})`));
        } else {
            console.log('  (no templates found)');
        }

        // Check existing salary categories
        console.log('\n=== EXISTING SALARY CATEGORIES ===');
        const [cats] = await sequelize.query(`
            SELECT * FROM salary_categories LIMIT 5
        `);
        if (cats.length > 0) {
            cats.forEach(c => console.log(`  ${JSON.stringify(c)}`));
        } else {
            console.log('  (no categories found)');
        }

        // Check user_payroll_assignment
        console.log('\n=== USER PAYROLL ASSIGNMENTS (ISI) ===');
        const [assignments] = await sequelize.query(`
            SELECT COUNT(*) as count FROM user_payroll_assignment WHERE company_id = 11
        `);
        console.log(`  ${assignments[0].count} assignments for ISI`);

    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

checkTables();
