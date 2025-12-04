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
        // Verificar antes de eliminar
        const before = await pool.query(`
            SELECT module_key, name, is_active
            FROM system_modules
            WHERE module_key = 'privacy-regulations'
        `);
        console.log('Antes de eliminar:', before.rows);

        // Eliminar
        const result = await pool.query(`
            DELETE FROM system_modules
            WHERE module_key = 'privacy-regulations'
        `);
        console.log('Filas eliminadas:', result.rowCount);

        // Verificar después
        const after = await pool.query(`
            SELECT module_key FROM system_modules
            WHERE module_key = 'privacy-regulations'
        `);
        console.log('Después de eliminar:', after.rows.length === 0 ? 'OK - No existe' : 'ERROR');

    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
main();
