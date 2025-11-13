const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'attendance_system',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
});

async function checkGPS() {
    const client = await pool.connect();
    try {
        console.log('✅ Conectado a PostgreSQL');

        // Get Admin ISI user
        const result = await client.query(`
            SELECT
                user_id,
                "firstName",
                "lastName",
                email,
                gps_enabled,
                is_active
            FROM users
            WHERE email = 'admin@isi.com'
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        const user = result.rows[0];

        console.log('\n📊 VALORES EN BASE DE DATOS (PostgreSQL):');
        console.log('user_id:', user.user_id);
        console.log('firstName:', user.firstName);
        console.log('lastName:', user.lastName);
        console.log('email:', user.email);
        console.log('is_active:', user.is_active);
        console.log('gps_enabled (VALOR REAL EN BD):', user.gps_enabled);

        console.log('\n📝 CÁLCULO PARA FRONTEND:');
        const allowOutsideRadius = user.gps_enabled !== null ? !user.gps_enabled : true;
        console.log('allowOutsideRadius (calculado):', allowOutsideRadius);

        console.log('\n📖 INTERPRETACIÓN:');
        if (user.gps_enabled === true) {
            console.log('✅ gps_enabled = TRUE → GPS ACTIVO → Usuario RESTRINGIDO al área → allowOutsideRadius = FALSE');
            console.log('   UI debería mostrar: "📍 Solo área autorizada"');
            console.log('   Botón debería decir: "🌍 Permitir fuera de área"');
        } else if (user.gps_enabled === false) {
            console.log('✅ gps_enabled = FALSE → GPS DESACTIVADO → Usuario PUEDE SALIR → allowOutsideRadius = TRUE');
            console.log('   UI debería mostrar: "🌍 Sin restricción GPS"');
            console.log('   Botón debería decir: "📍 Restringir GPS"');
        } else {
            console.log('⚠️  gps_enabled = NULL → Valor por defecto → allowOutsideRadius = TRUE');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkGPS();
