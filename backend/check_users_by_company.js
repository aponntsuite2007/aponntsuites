/**
 * Script para verificar usuarios por empresa
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function checkUsersByCompany() {
    try {
        await sequelize.authenticate();
        console.log('✅ Verificando usuarios por empresa...');

        // Ver todas las empresas
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug FROM companies ORDER BY id;
        `);

        console.log(`\n📋 EMPRESAS DISPONIBLES (${companies.length}):`);
        companies.forEach(company => {
            console.log(`  - ${company.company_id}: ${company.name} (slug: ${company.slug})`);
        });

        // Ver usuarios por empresa
        console.log(`\n👥 USUARIOS POR EMPRESA:`);

        for (const company of companies) {
            const [users] = await sequelize.query(`
                SELECT id, "firstName", "lastName", email, role, "employeeId"
                FROM users
                WHERE company_id = ?
                ORDER BY "firstName", "lastName"
            `, {
                replacements: [company.company_id]
            });

            console.log(`\n  🏢 EMPRESA ${company.company_id} (${company.name}):`);
            if (users.length === 0) {
                console.log(`    ❌ No tiene usuarios`);
            } else {
                console.log(`    ✅ ${users.length} usuario(s):`);
                users.forEach(user => {
                    console.log(`      - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}, ID: ${user.employeeId}`);
                });
            }
        }

        // Ver usuarios sin empresa (company_id NULL)
        const [orphanUsers] = await sequelize.query(`
            SELECT id, "firstName", "lastName", email, role, "employeeId", company_id
            FROM users
            WHERE company_id IS NULL
            ORDER BY "firstName", "lastName"
        `);

        if (orphanUsers.length > 0) {
            console.log(`\n⚠️  USUARIOS SIN EMPRESA ASIGNADA (${orphanUsers.length}):`);
            orphanUsers.forEach(user => {
                console.log(`      - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}, ID: ${user.employeeId}`);
            });
        }

        // Verificar específicamente la empresa ISI
        const [isiCompany] = await sequelize.query(`
            SELECT * FROM companies WHERE name ILIKE '%ISI%' OR slug ILIKE '%isi%';
        `);

        if (isiCompany.length > 0) {
            console.log(`\n🔍 EMPRESA ISI ENCONTRADA:`);
            isiCompany.forEach(company => {
                console.log(`  - ID: ${company.company_id}, Nombre: ${company.name}, Slug: ${company.slug}`);
            });
        } else {
            console.log(`\n❌ NO se encontró empresa con nombre "ISI"`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkUsersByCompany();