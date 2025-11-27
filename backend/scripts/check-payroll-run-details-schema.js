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

async function check() {
    try {
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'payroll_run_details'
            ORDER BY ordinal_position
        `);
        console.log('=== COLUMNS IN payroll_run_details ===');
        cols.forEach(c => console.log('  -', c.column_name, '(' + c.data_type + ')'));

        // Check sample data
        const [data] = await sequelize.query(`SELECT * FROM payroll_run_details LIMIT 2`);
        console.log('\n=== SAMPLE DATA ===');
        if (data.length > 0) {
            console.log('Keys:', Object.keys(data[0]).join(', '));
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await sequelize.close();
    }
}
check();
