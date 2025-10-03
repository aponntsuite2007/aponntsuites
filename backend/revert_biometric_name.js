/**
 * Script para revertir el nombre a algo simple que funcione
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function revertBiometricName() {
    try {
        await sequelize.authenticate();

        // Volver al nombre simple "Control Biométrico"
        await sequelize.query(`
            UPDATE system_modules
            SET name = 'Control Biométrico'
            WHERE module_key = 'biometric';
        `);

        console.log('✅ Nombre revertido a "Control Biométrico"');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

revertBiometricName();