const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function fix() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    // Buscar usuario soporte de wftest-empresa-demo
    const result = await client.query(`
        SELECT u.user_id, u.usuario, u.password, c.company_id
        FROM users u
        JOIN companies c ON u.company_id = c.company_id
        WHERE c.slug = 'wftest-empresa-demo' AND u.usuario = 'soporte'
    `);

    if (result.rows.length === 0) {
        console.log('❌ Usuario soporte no encontrado');
        await client.end();
        return;
    }

    const user = result.rows[0];
    console.log('Usuario encontrado:', user.usuario, 'company_id:', user.company_id);

    // Verificar si password actual es admin123
    const currentMatch = await bcrypt.compare('admin123', user.password || '');
    console.log('Password actual es admin123:', currentMatch ? 'SI' : 'NO');

    if (!currentMatch) {
        // Actualizar password a admin123
        const newHash = await bcrypt.hash('admin123', 10);
        await client.query(`
            UPDATE users SET password = $1 WHERE user_id = $2
        `, [newHash, user.user_id]);
        console.log('✅ Password actualizado a admin123');
    }

    await client.end();
}

fix().catch(e => console.error('Error:', e.message));
