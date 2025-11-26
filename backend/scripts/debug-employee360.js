const { Pool } = require('pg');
require('dotenv').config();

async function debug() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        // Query exacta del endpoint
        const result = await pool.query(`
            SELECT
                cm.id,
                cm.company_id,
                cm.system_module_id,
                cm.activo as is_active,
                sm.module_key,
                sm.name
            FROM company_modules cm
            INNER JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 11
            ORDER BY sm.category, sm.name ASC
        `);

        console.log('Total módulos para ISI (ID 11):', result.rows.length);
        console.log('\n🔍 Buscando employee-360...');
        const emp360 = result.rows.find(r => r.module_key === 'employee-360');
        if (emp360) {
            console.log('✅ ENCONTRADO:', emp360);
        } else {
            console.log('❌ NO encontrado en JOIN');

            // Verificar directamente
            console.log('\n🔎 Verificando company_modules directamente...');
            const direct = await pool.query(
                "SELECT * FROM company_modules WHERE company_id = 11 AND system_module_id = '8d51ccfe-2ae5-4a13-8d8a-80fc939f31fc'"
            );
            console.log('Resultado directo:', direct.rows.length > 0 ? direct.rows[0] : 'NO EXISTE');

            console.log('\nÚltimos 5 módulos en JOIN:');
            result.rows.slice(-5).forEach(r => console.log('  -', r.module_key, ':', r.name, '| activo:', r.is_active));
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
debug();
