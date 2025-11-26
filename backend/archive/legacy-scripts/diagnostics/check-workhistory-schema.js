const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD
});

async function checkSchema() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'user_work_history'
            ORDER BY ordinal_position
        `);

        console.log('\n📊 COLUMNAS EN user_work_history:');
        console.log('─'.repeat(80));
        result.rows.forEach(col => {
            console.log(`  • ${col.column_name} | ${col.data_type} | NULL: ${col.is_nullable}`);
        });
        console.log('─'.repeat(80));
        console.log(`\n✅ Total: ${result.rows.length} columnas\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
