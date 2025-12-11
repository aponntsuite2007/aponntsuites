/**
 * Script para verificar empresa Asociados APONNT en Render
 */
const { Client } = require('pg');

async function checkModules() {
    const client = new Client({
        connectionString: 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com/aponnt_db',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Conectado a Render PostgreSQL\n');

        // Mostrar TODAS las empresas
        const all = await client.query('SELECT id, name, slug, active_modules FROM companies ORDER BY id');

        console.log('=== TODAS LAS EMPRESAS EN RENDER ===\n');

        for (const row of all.rows) {
            let modules = row.active_modules || [];
            if (typeof modules === 'string') {
                try { modules = JSON.parse(modules); } catch(e) {}
            }

            const hasMarketplace = Array.isArray(modules) && modules.includes('associate-marketplace');

            console.log(`ID: ${row.id}`);
            console.log(`  Name: ${row.name}`);
            console.log(`  Slug: ${row.slug}`);
            console.log(`  Modules: ${Array.isArray(modules) ? modules.length : 0}`);
            console.log(`  Has associate-marketplace: ${hasMarketplace ? 'SI ✓' : 'NO ✗'}`);
            console.log('');
        }

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkModules();
