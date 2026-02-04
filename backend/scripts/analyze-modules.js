const { Client } = require('pg');

async function analyze() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    // 1. Ver módulos CORE
    const core = await client.query(`
        SELECT module_key, name, is_core, category, rubro
        FROM system_modules
        WHERE is_core = true
        ORDER BY module_key
    `);
    console.log('=== MÓDULOS CORE (' + core.rows.length + ') ===');
    core.rows.forEach(m => console.log('  ', m.module_key));

    // 2. Contar totales
    const counts = await client.query(`
        SELECT is_core, COUNT(*) as cnt
        FROM system_modules
        GROUP BY is_core
    `);
    console.log('\n=== TOTALES ===');
    counts.rows.forEach(c => console.log('  is_core=' + c.is_core + ':', c.cnt));

    // 3. Ver módulos del presupuesto de FMIATELLO
    const quote = await client.query(`
        SELECT modules_data
        FROM quotes
        WHERE company_id = 124
        ORDER BY created_at DESC
        LIMIT 1
    `);
    console.log('\n=== MÓDULOS EN QUOTE FMIATELLO ===');
    if (quote.rows.length > 0 && quote.rows[0].modules_data) {
        const modulesData = quote.rows[0].modules_data;
        console.log('Total:', modulesData.length);
        modulesData.forEach(m => console.log('  ', m.module_key || m.key, '-', m.module_name || m.name));
    } else {
        console.log('Sin módulos o sin quote');
    }

    // 4. Ver estructura de company_modules
    const cmCols = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'company_modules'
        ORDER BY ordinal_position
    `);
    console.log('\n=== ESTRUCTURA company_modules ===');
    cmCols.rows.forEach(c => console.log('  ', c.column_name, '-', c.data_type));

    await client.end();
}

analyze().catch(e => console.error('Error:', e.message));
