/**
 * Test the exact query used in payroll summary endpoint
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
    logging: console.log
});

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected\n');

        // Query exactly like endpoint
        const [result] = await sequelize.query(`
            SELECT
                COALESCE(SUM(total_employees), 0) as total_employees,
                COALESCE(SUM(total_gross), 0) as total_gross,
                COALESCE(SUM(total_net), 0) as total_net,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as pending,
                COUNT(CASE WHEN status IN ('completed', 'approved', 'paid') THEN 1 END) as processed
            FROM payroll_runs
            WHERE company_id = 11
            AND period_year = 2025
            AND period_month = 11
        `);

        console.log('\n=== QUERY RESULT ===');
        console.log(JSON.stringify(result, null, 2));

        // Verify raw data
        const [runs] = await sequelize.query(`
            SELECT id, run_code, total_employees, total_gross, total_net, status, period_year, period_month
            FROM payroll_runs
            WHERE company_id = 11
        `);
        console.log('\n=== RAW RUNS DATA ===');
        console.log(JSON.stringify(runs, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

test();
