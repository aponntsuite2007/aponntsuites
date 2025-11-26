/**
 * Cambiar rol de usuario "admin" a "admin"
 */

require('dotenv').config();
const database = require('./src/config/database');

async function fixAdminRole() {
    try {
        console.log('\n🔧 Actualizando rol de usuario "admin" a "admin"...\n');

        // Actualizar rol
        await database.sequelize.query(`
            UPDATE users
            SET role = $1
            WHERE usuario = $2 AND company_id = $3
        `, { bind: ['admin', 'admin', 11] });

        // Verificar
        const [result] = await database.sequelize.query(`
            SELECT user_id, usuario, "firstName", "lastName", role, "isActive"
            FROM users
            WHERE usuario = $1 AND company_id = $2
        `, { bind: ['admin', 11] });

        console.log('✅ Usuario admin actualizado:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixAdminRole();
