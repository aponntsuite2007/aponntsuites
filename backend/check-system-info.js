const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432
});

async function checkSystemInfo() {
    try {
        // 1. Roles existentes
        const rolesResult = await pool.query(`
            SELECT DISTINCT role FROM users WHERE role IS NOT NULL ORDER BY role
        `);
        console.log('\n📋 ROLES EXISTENTES:');
        rolesResult.rows.forEach(r => console.log(`   - ${r.role}`));

        // 2. Usuario admin ISI
        const isiAdminResult = await pool.query(`
            SELECT u.user_id, u.usuario, u.role, u."firstName", u."lastName", u.company_id, c.name as company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.company_id
            WHERE c.company_id = 11 AND u.role = 'admin'
            LIMIT 1
        `);
        console.log('\n👤 ADMIN ISI:');
        console.log(JSON.stringify(isiAdminResult.rows[0], null, 2));

        // 3. Módulos de ISI
        const isiModulesResult = await pool.query(`
            SELECT company_id, name, active_modules
            FROM companies
            WHERE company_id = 11
        `);
        console.log('\n🏢 MÓDULOS ISI:');
        console.log(isiModulesResult.rows[0].active_modules);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkSystemInfo();
