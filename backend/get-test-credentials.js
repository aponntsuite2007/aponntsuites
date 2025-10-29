/**
 * OBTENER CREDENCIALES DE TEST
 * Obtiene usuario y empresa para testing
 */

const { sequelize } = require('./src/config/database');

async function getTestCredentials() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a BD exitosa');

        // Obtener primera empresa activa
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug
            FROM companies
            WHERE is_active = true
            LIMIT 1
        `);

        if (companies.length === 0) {
            console.log('❌ No hay empresas activas');
            process.exit(1);
        }

        const company = companies[0];
        console.log(`\n📌 Empresa: ${company.name}`);
        console.log(`   ID: ${company.company_id}`);
        console.log(`   Slug: ${company.slug}`);

        // Obtener primer usuario admin de esa empresa
        const [users] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName", email, usuario, role
            FROM users
            WHERE company_id = ${company.company_id}
            AND is_active = true
            AND role = 'admin'
            LIMIT 1
        `);

        if (users.length === 0) {
            console.log('❌ No hay usuarios admin activos');
            process.exit(1);
        }

        const user = users[0];
        console.log(`\n👤 Usuario: ${user.firstName} ${user.lastName}`);
        console.log(`   ID: ${user.user_id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Usuario: ${user.usuario}`);
        console.log(`   Rol: ${user.role}`);

        console.log('\n📋 Credenciales de Test:');
        console.log(`   Company ID: ${company.company_id}`);
        console.log(`   Identifier: ${user.usuario || user.email}`);
        console.log(`   Password: admin123 (asumir default)`);

        // Retornar JSON para usar en script
        console.log('\n```json');
        console.log(JSON.stringify({
            companyId: company.company_id,
            companySlug: company.slug,
            identifier: user.usuario || user.email,
            userId: user.user_id,
            password: 'admin123'
        }, null, 2));
        console.log('```');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        await sequelize.close();
        process.exit(1);
    }
}

getTestCredentials();
