const { Sequelize } = require('sequelize');
const sequelize = require('./src/config/database').sequelize;
const User = require('./src/models/User-postgresql');

async function testGPS() {
    try {
        // Get Admin ISI user
        const user = await User.findOne({
            where: { email: 'admin@isi.com' },
            raw: true
        });

        if (!user) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        console.log('\n📊 VALORES EN BASE DE DATOS:');
        console.log('user_id:', user.user_id);
        console.log('gps_enabled (BD):', user.gps_enabled);
        console.log('gpsEnabled (Sequelize):', user.gpsEnabled);

        console.log('\n📊 CÁLCULO CORRECTO:');
        const calculatedAllowOutsideRadius = user.gps_enabled !== undefined
            ? !user.gps_enabled
            : (user.gpsEnabled !== undefined ? !user.gpsEnabled : true);

        console.log('allowOutsideRadius calculado:', calculatedAllowOutsideRadius);
        console.log('\n📝 LÓGICA:');
        console.log('Si gps_enabled = true  → allowOutsideRadius = false (área restringida)');
        console.log('Si gps_enabled = false → allowOutsideRadius = true (puede salir)');

        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testGPS();
