require('dotenv').config();
const database = require('./src/config/database');

async function checkUserData() {
    try {
        const [users] = await database.sequelize.query(`
            SELECT user_id, "firstName", "lastName",
                   dni_number, dni_expiry,
                   passport_number, passport_expiry,
                   visa_number,
                   license_number_national,
                   license_number_international
            FROM users
            WHERE company_id = 11
            ORDER BY user_id DESC
            LIMIT 1
        `);

        if (users.length === 0) {
            console.log('❌ No hay usuarios');
            process.exit(0);
        }

        const user = users[0];
        console.log('\n═══ USUARIO ═══');
        console.log('Nombre:', user.firstName, user.lastName);
        console.log('ID:', user.user_id);
        console.log('');
        console.log('═══ DATOS BIOMÉTRICOS EN BD ═══');
        console.log('DNI Number:', user.dni_number || '❌ VACÍO');
        console.log('DNI Expiry:', user.dni_expiry || '❌ VACÍO');
        console.log('Pasaporte:', user.passport_number || '❌ VACÍO');
        console.log('Pasaporte Expiry:', user.passport_expiry || '❌ VACÍO');
        console.log('Visa:', user.visa_number || '❌ VACÍO');
        console.log('Licencia Nacional:', user.license_number_national || '❌ VACÍO');
        console.log('Licencia Internacional:', user.license_number_international || '❌ VACÍO');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkUserData();
