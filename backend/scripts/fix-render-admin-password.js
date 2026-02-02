const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// External URL with SSL
const connectionString = 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com:5432/attendance_system_866u?sslmode=require';

async function connectWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const client = new Client({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 20000
            });
            await client.connect();
            return client;
        } catch (err) {
            console.log(`Intento ${i + 1} fallido:`, err.message);
            if (i < maxRetries - 1) {
                console.log('Reintentando en 2s...');
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    throw new Error('No se pudo conectar después de ' + maxRetries + ' intentos');
}

(async () => {
    let client;
    try {
        client = await connectWithRetry();
        console.log('Conectado a Render DB');

        // Check current users in DEMO company
        const result = await client.query(`
            SELECT u.id, u.username, u.email, u.role, c.name as company_name, c.slug
            FROM users u
            JOIN companies c ON u.company_id = c.id
            WHERE c.slug = 'aponnt-demo'
        `);

        console.log('\nUsers en empresa DEMO:', result.rows.length);
        result.rows.forEach(u => {
            console.log('  -', u.id, u.username, '/', u.role);
        });

        if (result.rows.length > 0) {
            // Generate correct bcrypt hash
            const newHash = await bcrypt.hash('admin123', 10);
            console.log('\nNuevo hash generado para admin123');

            // Update the admin user password
            const updateResult = await client.query(`
                UPDATE users
                SET password = $1
                WHERE company_id = (SELECT id FROM companies WHERE slug = 'aponnt-demo')
                AND username = 'admin'
                RETURNING id, username
            `, [newHash]);

            console.log('Rows updated:', updateResult.rowCount);
            if (updateResult.rows.length > 0) {
                console.log('Password actualizado para:', updateResult.rows[0].username);
            }
        } else {
            console.log('\nNo se encontraron usuarios en empresa DEMO');
        }

        console.log('\n--- Verificando empresa DEMO ---');
        const companies = await client.query(`
            SELECT id, name, slug FROM companies WHERE slug = 'aponnt-demo'
        `);
        console.log('Empresa:', companies.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (client) await client.end();
    }
})();
