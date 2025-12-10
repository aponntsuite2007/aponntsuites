/**
 * Script para asignar módulo a empresa en Render
 */
const { Client } = require('pg');

async function assignModule() {
    const client = new Client({
        connectionString: 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com/aponnt_db',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Conectado a Render PostgreSQL');

        // Obtener módulos actuales
        const current = await client.query('SELECT active_modules FROM companies WHERE id = 1');
        let modules = current.rows[0].active_modules || [];

        console.log('Módulos actuales:', modules.length);

        // Verificar si ya existe
        if (modules.includes('associate-marketplace')) {
            console.log('El módulo associate-marketplace YA existe');
            await client.end();
            return;
        }

        // Agregar el módulo
        modules.push('associate-marketplace');

        // Actualizar
        const updateResult = await client.query(
            'UPDATE companies SET active_modules = $1, updated_at = NOW() WHERE id = 1 RETURNING name',
            [JSON.stringify(modules)]
        );

        console.log('Módulo associate-marketplace ASIGNADO a:', updateResult.rows[0].name);
        console.log('Total módulos:', modules.length);

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

assignModule();
