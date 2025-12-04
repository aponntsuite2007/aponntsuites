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
        // Verificar PK de companies
        console.log('=== Companies PK ===');
        const companies = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'companies'
            ORDER BY ordinal_position
            LIMIT 5
        `);
        console.log(companies.rows);

        // Verificar PK de departments
        console.log('\n=== Departments PK ===');
        const departments = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'departments'
            ORDER BY ordinal_position
            LIMIT 5
        `);
        console.log(departments.rows);

        // Verificar si sectors existe
        console.log('\n=== Sectors existe? ===');
        const sectors = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = 'sectors'
        `);
        console.log(sectors.rows.length > 0 ? 'Sí' : 'No');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
