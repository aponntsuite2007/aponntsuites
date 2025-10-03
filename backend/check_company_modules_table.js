const { Client } = require('pg');

async function checkCompanyModulesTable() {
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

        // Verificar si existe la tabla company_modules
        const tableExistsResult = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'company_modules'
            );
        `);

        console.log('📋 Table company_modules exists:', tableExistsResult.rows[0].exists);

        if (tableExistsResult.rows[0].exists) {
            // Mostrar estructura de la tabla
            const columnsResult = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'company_modules'
                ORDER BY ordinal_position;
            `);

            console.log('🏗️ company_modules table structure:');
            columnsResult.rows.forEach(column => {
                console.log(`  - ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
            });

            // Verificar registros existentes
            const dataResult = await client.query(`
                SELECT * FROM company_modules LIMIT 5;
            `);

            console.log('📊 Sample data from company_modules:');
            console.log(dataResult.rows);

        } else {
            console.log('❌ Table company_modules does not exist');

            // Verificar otras tablas relacionadas
            const tablesResult = await client.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name LIKE '%module%'
                OR table_name LIKE '%company%'
                ORDER BY table_name;
            `);

            console.log('🔍 Related tables found:');
            tablesResult.rows.forEach(table => {
                console.log(`  - ${table.table_name}`);
            });
        }

        // Verificar cómo se manejan los módulos en la tabla companies
        const companyModulesInfo = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'companies'
            AND (column_name LIKE '%module%' OR column_name LIKE '%pricing%')
            ORDER BY column_name;
        `);

        console.log('🏢 Module-related columns in companies table:');
        companyModulesInfo.rows.forEach(column => {
            console.log(`  - ${column.column_name}: ${column.data_type}`);
        });

        // Mostrar los datos actuales de ISI
        const isiResult = await client.query(`
            SELECT id, name, active_modules, modules_data, modules_pricing
            FROM companies
            WHERE name ILIKE '%isi%'
        `);

        console.log('🏢 ISI company current module data:');
        console.log(isiResult.rows[0]);

    } catch (error) {
        console.error('❌ Error checking company_modules table:', error);
    } finally {
        await client.end();
    }
}

checkCompanyModulesTable();