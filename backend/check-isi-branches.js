/**
 * Verificar sucursales de ISI
 */

require('dotenv').config();
const database = require('./src/config/database');

async function checkBranches() {
    try {
        console.log('\n🏢 Verificando sucursales de ISI (company_id=11)...\n');

        const [branches] = await database.sequelize.query(`
            SELECT
                id, name, code, address, phone, email,
                latitude, longitude, radius, "isActive", company_id,
                "createdAt"
            FROM branches
            WHERE company_id = 11
            ORDER BY "createdAt" DESC
        `);

        console.log(`✅ Total de sucursales: ${branches.length}\n`);

        if (branches.length === 0) {
            console.log('⚠️  ISI no tiene sucursales creadas');
            console.log('💡 Se debería crear una sucursal "CENTRAL" por defecto\n');
        } else {
            console.log('📋 Sucursales encontradas:\n');
            branches.forEach((b, idx) => {
                console.log(`${idx + 1}. ${b.name || 'SIN NOMBRE'}`);
                console.log(`   - ID: ${b.id}`);
                console.log(`   - Code: ${b.code || 'N/A'}`);
                console.log(`   - Address: ${b.address || 'N/A'}`);
                console.log(`   - Phone: ${b.phone || 'N/A'}`);
                console.log(`   - Email: ${b.email || 'N/A'}`);
                console.log(`   - Active: ${b.isActive ? 'Sí' : 'No'}`);
                console.log('');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkBranches();
