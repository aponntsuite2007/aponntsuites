const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function checkSchema() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'shifts'
            ORDER BY ordinal_position
        `);

        console.log('📋 COLUMNAS DE LA TABLA shifts:\n');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
