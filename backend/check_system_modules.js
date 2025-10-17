const { Client } = require('pg');

async function checkStructure() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const result = await client.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'system_modules'
            ORDER BY ordinal_position
        `);

        console.log('Estructura de system_modules:');
        result.rows.forEach((col, i) => {
            const len = col.character_maximum_length ? ` (max: ${col.character_maximum_length})` : '';
            console.log(`${i + 1}. ${col.column_name} - ${col.data_type}${len}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkStructure();
