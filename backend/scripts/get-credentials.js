const { Sequelize } = require('sequelize');

// Conexión directa a PostgreSQL local
const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

async function getCredentials() {
    try {
        // Empresas activas
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug, is_active
            FROM companies
            WHERE is_active = true
            ORDER BY company_id
            LIMIT 10
        `);
        console.log('=== EMPRESAS ACTIVAS ===');
        companies.forEach(c => console.log(`  - ${c.slug} (ID: ${c.company_id}) - ${c.name}`));

        // Usuarios admin de cada empresa
        console.log('\n=== USUARIOS ADMIN ===');
        for (const company of companies.slice(0, 5)) {
            const [users] = await sequelize.query(`
                SELECT "employeeId", email, role, "firstName", "lastName"
                FROM users
                WHERE company_id = ${company.company_id} AND role = 'admin'
                LIMIT 3
            `);
            if (users.length > 0) {
                console.log(`\n  Empresa: ${company.slug}`);
                users.forEach(u => console.log(`    Usuario: ${u.employeeId || u.email} | Nombre: ${u.firstName} ${u.lastName} | Rol: ${u.role}`));
            }
        }

        console.log('\n=== PASSWORD POR DEFECTO ===');
        console.log('  La mayoria usa: admin123');

        await sequelize.close();
    } catch (e) {
        console.error('Error:', e.message);
    }
}
getCredentials();
