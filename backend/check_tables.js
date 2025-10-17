const { Client } = require('pg');

async function checkStructure() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('📋 Estructura de company_modules:');
        const result = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'company_modules'
            ORDER BY ordinal_position
        `);

        result.rows.forEach((col, i) => {
            console.log(`   ${i + 1}. ${col.column_name} (${col.data_type})`);
        });

        console.log('\n📋 Registros en company_modules (company_id = 11):');
        const modules = await client.query(`
            SELECT * FROM company_modules WHERE company_id = 11 LIMIT 5
        `);

        console.log(`   Total: ${modules.rows.length} registros`);
        modules.rows.forEach((m, i) => {
            console.log(`   ${i + 1}.`, m);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkStructure();
