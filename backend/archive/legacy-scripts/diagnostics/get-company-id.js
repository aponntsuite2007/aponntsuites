const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD
});

async function getCompanyId() {
    try {
        const result = await pool.query(`
            SELECT company_id, slug, name
            FROM companies
            WHERE slug = 'aponnt-empresa-demo'
        `);

        if (result.rows.length > 0) {
            console.log(JSON.stringify(result.rows[0]));
        } else {
            console.log('{}');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

getCompanyId();
