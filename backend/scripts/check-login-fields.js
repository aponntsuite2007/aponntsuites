const { Client } = require('pg');
const LOCAL = { host: 'localhost', port: 5432, database: 'attendance_system', user: 'postgres', password: 'Aedr15150302' };

async function check() {
    const client = new Client(LOCAL);
    await client.connect();

    // Verificar si existe columna username
    const cols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name IN ('username', 'employeeId', 'email')
    `);
    console.log('Columnas de login en users:', cols.rows.map(r => r.column_name).join(', '));

    // Ver qué tiene employeeId para FMIATELLO
    const users = await client.query(`
        SELECT email, "employeeId" FROM users WHERE company_id = 124
    `);
    console.log('\nUsuarios FMIATELLO:');
    users.rows.forEach(u => console.log('  Email:', u.email, '| employeeId:', u.employeeId));

    await client.end();
}
check();
