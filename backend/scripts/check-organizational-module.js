require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('=== Módulo organizational-structure en system_modules ===');
        const module = await client.query(`
            SELECT id, module_key, name, category, is_active
            FROM system_modules
            WHERE module_key = 'organizational-structure'
        `);
        console.log(module.rows);

        if (module.rows.length > 0) {
            console.log('\n=== Módulo habilitado para company_id=11? ===');
            const enabled = await client.query(`
                SELECT cm.*, sm.module_key
                FROM company_modules cm
                JOIN system_modules sm ON sm.id = cm.system_module_id
                WHERE cm.company_id = 11 AND sm.module_key = 'organizational-structure'
            `);
            console.log(enabled.rows);
        }

        console.log('\n=== modules-registry.json tiene organizational-structure? ===');
        const fs = require('fs');
        const registryPath = './src/config/modules-registry.json';
        if (fs.existsSync(registryPath)) {
            const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            const orgModule = registry.modules?.find(m => m.key === 'organizational-structure');
            console.log(orgModule ? 'SÍ existe en registry' : 'NO existe en registry');
            if (orgModule) console.log(orgModule);
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
