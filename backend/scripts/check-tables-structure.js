const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

async function checkStructure() {
    try {
        console.log('📊 Verificando estructura de tablas...\n');

        // Check companies table
        const companiesColumns = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'companies'
            ORDER BY ordinal_position
        `);

        console.log('🏢 Columnas de tabla COMPANIES:');
        companiesColumns.rows.forEach(r => {
            console.log(`   - ${r.column_name} (${r.data_type})`);
        });

        // Check modules table
        const modulesColumns = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'modules'
            ORDER BY ordinal_position
        `);

        console.log('\n📦 Columnas de tabla MODULES:');
        modulesColumns.rows.forEach(r => {
            console.log(`   - ${r.column_name} (${r.data_type})`);
        });

        // Check company_modules table
        const companyModulesColumns = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'company_modules'
            ORDER BY ordinal_position
        `);

        console.log('\n🔗 Columnas de tabla COMPANY_MODULES:');
        companyModulesColumns.rows.forEach(r => {
            console.log(`   - ${r.column_name} (${r.data_type})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkStructure();
