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

    // Get admin users
    const userRes = await client.query(`
        SELECT user_id, email, "firstName", "lastName", role, "isActive", company_id
        FROM users
        WHERE role = 'admin'
        ORDER BY company_id
        LIMIT 10;
    `);
    console.log('=== ALL ADMIN USERS ===');
    userRes.rows.forEach(r => console.log(`  company=${r.company_id}, email=${r.email}, name=${r.firstName} ${r.lastName}, role=${r.role}, active=${r.isActive}`));

    client.release();
    await pool.end();
}
check();
