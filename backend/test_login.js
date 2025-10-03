const { Client } = require('pg');

async function testLogin() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    });

    try {
        await client.connect();
        console.log('🔗 Connected to PostgreSQL database');

        // Ver usuarios disponibles
        const usersResult = await client.query(`
            SELECT id, username, email, role, company_id, "firstName", "lastName"
            FROM users
            WHERE is_active = true
            LIMIT 10
        `);

        console.log('👥 Usuarios disponibles:');
        usersResult.rows.forEach(user => {
            console.log(`  - ID: ${user.user_id}`);
            console.log(`    Username: ${user.usuario}`);
            console.log(`    Email: ${user.email}`);
            console.log(`    Role: ${user.role}`);
            console.log(`    Company: ${user.company_id}`);
            console.log(`    Name: ${user.firstName} ${user.lastName}`);
            console.log('---');
        });

        // Ver empresas disponibles
        const companiesResult = await client.query(`
            SELECT id, name, slug
            FROM companies
            WHERE is_active = true
            ORDER BY id
        `);

        console.log('🏢 Empresas disponibles:');
        companiesResult.rows.forEach(company => {
            console.log(`  - ID: ${company.company_id}, Name: ${company.name}, Slug: ${company.slug}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

testLogin();