require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('=== salary_categories_v2 columns ===');
        const cols = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'salary_categories_v2'
            ORDER BY ordinal_position
        `);
        console.log(cols.rows);

        console.log('\n=== Sample data ===');
        const data = await client.query('SELECT * FROM salary_categories_v2 LIMIT 2');
        console.log(data.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
