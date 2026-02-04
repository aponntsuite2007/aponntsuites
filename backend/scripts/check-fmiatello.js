const { Client } = require('pg');
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db';
const LOCAL = { host: 'localhost', port: 5432, database: 'attendance_system', user: 'postgres', password: 'Aedr15150302' };

async function check() {
    const render = new Client({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });
    const local = new Client(LOCAL);

    await render.connect();
    await local.connect();

    console.log('=== EMPRESAS EN RENDER (últimas 10) ===');
    const renderCo = await render.query('SELECT company_id, name, slug, is_active FROM companies ORDER BY company_id DESC LIMIT 10');
    renderCo.rows.forEach(c => console.log(c.company_id, '|', c.name, '|', c.slug, '| activa:', c.is_active));

    console.log('\n=== BUSCANDO FMIATELLO EN LOCAL ===');
    const localCo = await local.query("SELECT company_id as id, name, slug, is_active FROM companies WHERE name ILIKE '%fmiatello%' OR slug ILIKE '%fmiatello%'");

    if (localCo.rows.length > 0) {
        console.log('ENCONTRADA EN LOCAL:');
        localCo.rows.forEach(c => console.log(c.id, '|', c.name, '|', c.slug, '| activa:', c.is_active));

        const companyId = localCo.rows[0].id;

        // Buscar usuarios - nota: en local puede ser "id" o "user_id"
        try {
            const users = await local.query('SELECT user_id, email, "firstName", "lastName", role, is_active FROM users WHERE company_id = $1', [companyId]);
            console.log('\nUsuarios en LOCAL:', users.rows.length);
            users.rows.forEach(u => console.log('  -', u.email, '|', u.firstName, u.lastName, '|', u.role, '| activo:', u.is_active));
        } catch (e) {
            console.log('Error buscando usuarios:', e.message);
        }
    } else {
        console.log('NO encontrada en LOCAL');

        // Mostrar últimas empresas en local
        console.log('\nUltimas 10 empresas en LOCAL:');
        const lastLocal = await local.query('SELECT company_id as id, name, slug, is_active FROM companies ORDER BY company_id DESC LIMIT 10');
        lastLocal.rows.forEach(c => console.log(c.id, '|', c.name, '|', c.slug, '| activa:', c.is_active));
    }

    // También buscar en render por si acaso
    console.log('\n=== BUSCANDO FMIATELLO EN RENDER ===');
    const renderSearch = await render.query("SELECT company_id, name, slug FROM companies WHERE name ILIKE '%fmiatello%' OR slug ILIKE '%fmiatello%'");
    if (renderSearch.rows.length > 0) {
        console.log('ENCONTRADA EN RENDER:');
        renderSearch.rows.forEach(c => console.log(c.company_id, '|', c.name, '|', c.slug));
    } else {
        console.log('NO encontrada en RENDER');
    }

    await render.end();
    await local.end();
}
check();
