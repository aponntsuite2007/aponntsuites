const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/biometric_system'
});

async function checkUser() {
    try {
        const result = await pool.query(`
            SELECT user_id, first_name, last_name, role, is_active, gps_enabled
            FROM users
            WHERE email = 'admin@isi.com'
            LIMIT 1
        `);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('\n📋 USUARIO ADMIN ISI EN BD:');
            console.log('================================');
            console.log('ID:', user.user_id);
            console.log('Nombre:', user.first_name, user.last_name);
            console.log('Rol:', user.role);
            console.log('Estado Activo:', user.is_active);
            console.log('GPS Enabled:', user.gps_enabled);
            console.log('================================\n');
        } else {
            console.log('❌ Usuario no encontrado');
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
    }
}

checkUser();
