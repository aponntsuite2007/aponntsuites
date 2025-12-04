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
        // 0. Verificar columnas de company_modules
        console.log('=== 0. Schema de company_modules ===');
        const columns = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'company_modules'
        `);
        console.log('Columnas:', columns.rows.map(r => r.column_name).join(', '));

        // 1. Verificar si el módulo existe en system_modules
        console.log('\n=== 1. system_modules ===');
        const sysModule = await client.query(`
            SELECT id, module_key, name, category, is_active
            FROM system_modules
            WHERE module_key = 'organizational-structure'
        `);
        console.log(sysModule.rows);

        if (sysModule.rows.length === 0) {
            console.log('⚠️ El módulo NO existe en system_modules. Creándolo...');
            const insert = await client.query(`
                INSERT INTO system_modules (module_key, name, description, category, is_active, base_price)
                VALUES ('organizational-structure', 'Estructura Organizacional', 'Gestión de sectores, convenios laborales, categorías salariales y roles adicionales', 'rrhh', true, 5)
                RETURNING id, module_key, name
            `);
            console.log('✅ Módulo creado:', insert.rows[0]);
        }

        // Obtener el ID del módulo
        const moduleId = sysModule.rows.length > 0 ? sysModule.rows[0].id :
            (await client.query(`SELECT id FROM system_modules WHERE module_key = 'organizational-structure'`)).rows[0].id;

        console.log('\n=== 2. company_modules para company_id=11 ===');
        // La columna se llama "activo" (en español)
        const companyModule = await client.query(`
            SELECT cm.id, cm.company_id, sm.module_key, cm.activo
            FROM company_modules cm
            JOIN system_modules sm ON sm.id = cm.system_module_id
            WHERE sm.module_key = 'organizational-structure' AND cm.company_id = 11
        `);
        console.log(companyModule.rows);

        if (companyModule.rows.length === 0) {
            console.log('⚠️ El módulo NO está habilitado para company_id=11. Habilitándolo...');
            const enableModule = await client.query(`
                INSERT INTO company_modules (company_id, system_module_id, activo, precio_mensual)
                VALUES (11, $1, true, 5)
                RETURNING id, company_id, activo
            `, [moduleId]);
            console.log('✅ Módulo habilitado para company 11:', enableModule.rows[0]);
        } else if (!companyModule.rows[0].activo) {
            console.log('⚠️ El módulo existe pero está deshabilitado. Habilitándolo...');
            await client.query(`UPDATE company_modules SET activo = true WHERE id = $1`, [companyModule.rows[0].id]);
            console.log('✅ Módulo habilitado');
        } else {
            console.log('✅ El módulo YA está habilitado para company_id=11');
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
