const { Client } = require('pg');

async function fixCompanyModules(slug) {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    // Ver tipo de columna
    const colType = await client.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'active_modules'");
    console.log('Tipo de columna active_modules:', colType.rows[0]?.data_type);

    // Obtener módulos CORE
    const coreResult = await client.query('SELECT module_key FROM system_modules WHERE is_core = true');
    const coreModules = coreResult.rows.map(r => r.module_key);

    // Obtener módulos actuales de la empresa
    const company = await client.query('SELECT company_id, name, active_modules FROM companies WHERE slug = $1', [slug]);

    if (company.rows.length === 0) {
        console.log('❌ Empresa no encontrada:', slug);
        await client.end();
        return;
    }

    // Parsear active_modules si es string
    let currentModules = company.rows[0].active_modules || [];
    if (typeof currentModules === 'string') {
        try {
            currentModules = JSON.parse(currentModules);
        } catch (e) {
            currentModules = [];
        }
    }

    // Combinar (CORE + actuales, sin duplicados)
    const allModules = [...new Set([...coreModules, ...currentModules])];

    // Actualizar como JSONB array (no string)
    await client.query('UPDATE companies SET active_modules = $1::jsonb WHERE slug = $2', [JSON.stringify(allModules), slug]);

    // Verificar
    const verify = await client.query('SELECT active_modules FROM companies WHERE slug = $1', [slug]);
    const finalModules = verify.rows[0].active_modules;

    console.log('✅', company.rows[0].name, 'actualizada');
    console.log('   Módulos CORE:', coreModules.length);
    console.log('   Módulos anteriores:', currentModules.length);
    console.log('   Total módulos ahora:', Array.isArray(finalModules) ? finalModules.length : 'ERROR - no es array');

    await client.end();
}

// Ejecutar para FMIATELLO
fixCompanyModules('fmiatello');
