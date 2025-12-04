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
        console.log('=== shifts columns ===');
        const cols = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'shifts'
            ORDER BY ordinal_position
        `);
        console.log(cols.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
