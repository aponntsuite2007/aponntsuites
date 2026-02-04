const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    const result = await client.query(`
        SELECT u.usuario, u.email, u.role, u.is_active, c.slug
        FROM users u
        JOIN companies c ON u.company_id = c.company_id
        WHERE c.slug = 'wftest-empresa-demo'
          AND u.role = 'admin'
          AND u.usuario IS NOT NULL
        ORDER BY u.usuario
        LIMIT 5
    `);

    console.log('=== USUARIOS ADMIN DE wftest-empresa-demo ===');
    if (result.rows.length === 0) {
        console.log('No hay usuarios admin con usuario no nulo');
    } else {
        result.rows.forEach(u => console.log('Usuario:', u.usuario, '| Email:', u.email, '| Activo:', u.is_active));
    }

    // También buscar "administrador"
    const admin = await client.query(`
        SELECT u.usuario, u.email, c.slug
        FROM users u
        JOIN companies c ON u.company_id = c.company_id
        WHERE c.slug = 'wftest-empresa-demo' AND u.usuario = 'administrador'
    `);

    console.log('\n=== USUARIO administrador ===');
    if (admin.rows.length > 0) {
        console.log('Existe:', admin.rows[0].usuario, admin.rows[0].email);
    } else {
        console.log('No existe usuario "administrador"');
    }

    await client.end();
}

check().catch(e => console.error('Error:', e.message));
