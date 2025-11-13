const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'attendance_system',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'SoyAdmin2024**',
    logging: false
});

async function checkUser() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        const [results] = await sequelize.query(`
            SELECT
                user_id,
                "firstName",
                "lastName",
                is_active AS "isActive",
                gps_enabled AS "gpsEnabled",
                allow_outside_radius AS "allowOutsideRadius",
                role
            FROM users
            WHERE email = 'admin@isi.com'
            LIMIT 1
        `);

        if (results.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        const user = results[0];
        console.log('\n📊 USUARIO Admin ISI (ACTUAL EN BD):');
        console.log('🆔 user_id:', user.user_id);
        console.log('👤 Nombre:', `${user.firstName} ${user.lastName}`);
        console.log('📊 isActive (is_active):', user.isActive);
        console.log('🌍 gpsEnabled (gps_enabled):', user.gpsEnabled);
        console.log('🌍 allowOutsideRadius (allow_outside_radius):', user.allowOutsideRadius);
        console.log('👑 role:', user.role);

        console.log('\n📋 INTERPRETACIÓN:');
        console.log('Estado usuario:', user.isActive ? '✅ Activo' : '❌ Inactivo');
        console.log('GPS restricción:', user.gpsEnabled ? '📍 Solo área autorizada' : '🌍 Sin restricción GPS');
        console.log('GPS allow outside:', user.allowOutsideRadius ? 'Sí puede salir' : 'No puede salir');

        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkUser();
