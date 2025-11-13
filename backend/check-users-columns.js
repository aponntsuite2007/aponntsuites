/**
 * Verificar columnas de companies para encontrar el ID correcto
 */

require('dotenv').config();
const database = require('./src/config/database');

async function checkColumns() {
    try {
        console.log('\n📊 Verificando estructura de tabla companies...\n');

        const [columns] = await database.sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'companies'
            ORDER BY ordinal_position
        `);

        console.log('🏢 COLUMNAS DE COMPANIES:\n');
        columns.forEach(col => {
            console.log(`   - ${col.column_name.padEnd(30)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL    '} ${col.column_default || ''}`);
        });

        // Verificar users
        const [usersColumns] = await database.sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('user_id', 'email', 'gps_enabled', 'gpsEnabled', 'is_active', 'isActive', 'role')
            ORDER BY ordinal_position
        `);

        console.log('\n\n👥 COLUMNAS CLAVE DE USERS:\n');
        usersColumns.forEach(col => {
            console.log(`   - ${col.column_name.padEnd(30)} ${col.data_type}`);
        });

        // Verificar datos reales del usuario ISI
        const userId = '766de495-e4f3-4e91-a509-1a495c52e15c';
        const [userData] = await database.sequelize.query(`
            SELECT user_id, email, role, gps_enabled, is_active
            FROM users
            WHERE user_id = '${userId}'
        `);

        console.log('\n\n📊 DATOS DEL USUARIO ISI:\n');
        if (userData.length > 0) {
            console.log(JSON.stringify(userData[0], null, 2));
        } else {
            console.log('   ❌ Usuario no encontrado');
        }

        console.log('\n✅ Verificación completa\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        process.exit(1);
    }
}

checkColumns();
