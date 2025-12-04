const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function main() {
    try {
        // Primero ver columnas
        const cols = await pool.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'system_modules' ORDER BY ordinal_position
        `);
        console.log('Columnas:', cols.rows.map(r => r.column_name).join(', '));

        // Buscar módulos con privacy
        const result = await pool.query(`
            SELECT * FROM system_modules
            WHERE module_key ILIKE '%privacy%' OR module_key ILIKE '%consent%'
            ORDER BY module_key
        `);
        console.log('\nMódulos encontrados:', result.rows.length);
        result.rows.forEach(r => {
            console.log('  -', r.module_key);
            console.log('    name:', r.name);
            console.log('    active:', r.is_active);
            console.log('    category:', r.category);
            console.log('');
        });
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
main();
