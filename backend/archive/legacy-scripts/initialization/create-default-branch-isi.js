/**
 * Crear sucursal CENTRAL por defecto para ISI
 */

require('dotenv').config();
const database = require('./src/config/database');

async function createDefaultBranch() {
    try {
        console.log('\n🏢 Creando sucursal CENTRAL para ISI...\n');

        // Verificar si ya existe
        const [existing] = await database.sequelize.query(`
            SELECT id, name FROM branches
            WHERE company_id = 11 AND LOWER(name) = 'central'
        `);

        if (existing.length > 0) {
            console.log('✅ La sucursal CENTRAL ya existe');
            console.log(JSON.stringify(existing[0], null, 2));
            process.exit(0);
        }

        // Asegurar que uuid-ossp esté habilitado
        await database.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Crear sucursal CENTRAL
        const [result] = await database.sequelize.query(`
            INSERT INTO branches (
                id, name, code, address, phone, email,
                latitude, longitude, radius,
                "isActive", company_id,
                "createdAt", "updatedAt"
            ) VALUES (
                uuid_generate_v4(),
                'CENTRAL',
                'CENTRAL',
                'Oficina Principal',
                '-',
                'info@isi.com',
                0,
                0,
                100,
                true,
                11,
                NOW(),
                NOW()
            )
            RETURNING id, name, code, address
        `);

        console.log('✅ Sucursal CENTRAL creada exitosamente:');
        console.log(JSON.stringify(result[0], null, 2));
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createDefaultBranch();
