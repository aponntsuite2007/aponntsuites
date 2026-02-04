/**
 * Obtener credenciales de producción (Render)
 */
const { Client } = require('pg');

const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db';

async function getCredentials() {
    const client = new Client({ connectionString: RENDER_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log('='.repeat(70));
        console.log('CREDENCIALES DE PRODUCCION (RENDER)');
        console.log('='.repeat(70));

        // 1. Panel Administrativo (aponnt_staff)
        console.log('\n** PANEL-ADMINISTRATIVO (aponnt_staff) **');
        console.log('-'.repeat(50));
        const staff = await client.query(`
            SELECT staff_id, email, username, first_name, last_name, role_id, is_active
            FROM aponnt_staff
            WHERE is_active = true
            ORDER BY role_id, email
            LIMIT 10
        `);
        if (staff.rows.length > 0) {
            staff.rows.forEach(s => {
                console.log('   Email:', s.email);
                console.log('   Username:', s.username || 'N/A');
                console.log('   Nombre:', s.first_name, s.last_name);
                console.log('   Role ID:', s.role_id);
                console.log('   Password: [probar admin123 o password123]');
                console.log('');
            });
        } else {
            console.log('   No hay staff activo');
        }

        // 2. Panel Empresa (users + companies)
        console.log('\n** PANEL-EMPRESA (empresas) **');
        console.log('-'.repeat(50));

        // Primero buscar empresas demo/test
        let companies = await client.query(`
            SELECT company_id, name, slug, is_active
            FROM companies
            WHERE is_active = true
              AND (slug LIKE '%test%' OR slug LIKE '%demo%' OR name ILIKE '%test%' OR name ILIKE '%demo%')
            ORDER BY name
            LIMIT 5
        `);

        // Si no hay, mostrar las primeras
        if (companies.rows.length === 0) {
            companies = await client.query(`
                SELECT company_id, name, slug, is_active
                FROM companies
                WHERE is_active = true
                ORDER BY company_id
                LIMIT 5
            `);
        }

        for (const company of companies.rows) {
            console.log('\n   Empresa:', company.name);
            console.log('   Slug:', company.slug);
            console.log('   ID:', company.company_id);

            // Buscar admin de esta empresa
            const admins = await client.query(`
                SELECT email, role, "firstName", "lastName"
                FROM users
                WHERE company_id = $1 AND role = 'admin' AND is_active = true
                LIMIT 3
            `, [company.company_id]);

            if (admins.rows.length > 0) {
                admins.rows.forEach(a => {
                    console.log('   -> Admin:', a.email);
                    console.log('      Nombre:', a.firstName, a.lastName);
                    console.log('      Password: [probar admin123]');
                });
            } else {
                // Buscar cualquier usuario
                const anyUser = await client.query(`
                    SELECT email, role, "firstName", "lastName"
                    FROM users
                    WHERE company_id = $1 AND is_active = true
                    LIMIT 1
                `, [company.company_id]);
                if (anyUser.rows.length > 0) {
                    console.log('   -> Usuario:', anyUser.rows[0].email);
                    console.log('      Role:', anyUser.rows[0].role);
                } else {
                    console.log('   -> Sin usuarios activos');
                }
            }
        }

        // 3. Panel Asociados (associates)
        console.log('\n\n** PANEL-ASOCIADOS **');
        console.log('-'.repeat(50));
        try {
            const associates = await client.query(`
                SELECT * FROM associates WHERE status = 'active' LIMIT 5
            `);
            if (associates.rows.length > 0) {
                associates.rows.forEach(a => {
                    console.log('   Email:', a.email);
                    console.log('   Nombre:', a.name || a.first_name);
                    console.log('');
                });
            } else {
                console.log('   No hay asociados activos');
            }
        } catch (e) {
            // Intentar otra estructura
            try {
                const assoc = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'associates' LIMIT 5`);
                console.log('   Tabla existe, columnas:', assoc.rows.map(r => r.column_name).join(', '));
            } catch (e2) {
                console.log('   Tabla associates no existe');
            }
        }

        // 4. Panel Proveedores (vendors)
        console.log('\n** PANEL-PROVEEDORES **');
        console.log('-'.repeat(50));
        try {
            const vendors = await client.query(`
                SELECT vendor_id, email, company_name, contact_name, is_active
                FROM vendors
                WHERE is_active = true
                LIMIT 5
            `);
            if (vendors.rows.length > 0) {
                vendors.rows.forEach(v => {
                    console.log('   Email:', v.email);
                    console.log('   Empresa:', v.company_name);
                    console.log('   Contacto:', v.contact_name);
                    console.log('   Password: [probar admin123]');
                    console.log('');
                });
            } else {
                console.log('   No hay proveedores activos');
            }
        } catch (e) {
            console.log('   Error en vendors:', e.message);
        }

        console.log('\n' + '='.repeat(70));
        console.log('PASSWORDS COMUNES PARA TESTING:');
        console.log('  - admin123');
        console.log('  - password123');
        console.log('  - Admin123!');
        console.log('  - 123456');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

getCredentials();
