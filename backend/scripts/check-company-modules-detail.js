const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    const companyId = 124; // FMIATELLO

    // 1. Ver módulos en company_modules (FUENTE DE VERDAD)
    const modules = await client.query(`
        SELECT cm.id, cm.activo, sm.module_key, sm.name
        FROM company_modules cm
        JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = $1
        ORDER BY sm.module_key
    `, [companyId]);

    console.log('=== MÓDULOS EN company_modules PARA FMIATELLO (124) ===');
    console.log('Total:', modules.rows.length);
    if (modules.rows.length > 0) {
        modules.rows.forEach(m => console.log('  ', m.activo ? '✅' : '❌', m.module_key, '-', m.name));
    } else {
        console.log('  ❌ NO HAY REGISTROS EN company_modules');
    }

    // 2. Ver quote activo para FMIATELLO
    const quote = await client.query(`
        SELECT id, quote_number, status, modules_data
        FROM quotes
        WHERE company_id = $1
        ORDER BY created_at DESC LIMIT 1
    `, [companyId]);

    if (quote.rows.length > 0) {
        console.log('\n=== ÚLTIMO QUOTE PARA FMIATELLO ===');
        console.log('Quote:', quote.rows[0].quote_number, '| Status:', quote.rows[0].status);
        const modulesData = quote.rows[0].modules_data;
        if (modulesData && modulesData.length > 0) {
            console.log('modules_data (' + modulesData.length + ' módulos):');
            modulesData.forEach(m => console.log('  -', m.module_key || m.key, ':', m.module_name || m.name));
        } else {
            console.log('modules_data: VACÍO o NULL');
        }
    } else {
        console.log('\n❌ No hay quotes para FMIATELLO');
    }

    // 3. Ver qué devuelve el endpoint (simulado)
    const apiQuery = await client.query(`
        SELECT
            cm.id,
            cm.company_id,
            cm.system_module_id,
            cm.activo as is_active,
            sm.module_key,
            sm.name
        FROM company_modules cm
        INNER JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = $1
          AND cm.activo = true
        ORDER BY sm.name ASC
    `, [companyId]);

    console.log('\n=== LO QUE DEVOLVERÍA EL API (company_modules activos) ===');
    console.log('Total activos:', apiQuery.rows.length);

    await client.end();
}

check().catch(e => console.error('Error:', e.message));
