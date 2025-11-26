const { Client } = require('pg');

async function simpleEnableSiac() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    });

    try {
        await client.connect();
        console.log('🔗 Connected to PostgreSQL database');

        // Obtener la empresa ISI
        const isiResult = await client.query(`
            SELECT id, name, slug, active_modules
            FROM companies
            WHERE slug ILIKE '%isi%' OR name ILIKE '%isi%'
            ORDER BY id
        `);

        if (isiResult.rows.length === 0) {
            console.log('❌ No se encontró la empresa ISI');
            return;
        }

        const isiCompany = isiResult.rows[0];
        console.log('🏢 ISI Company found:', isiCompany);

        // Crear la lista de módulos activos incluyendo SIAC
        const siacModules = ['clientes', 'facturacion'];

        // Actualizar directamente con los módulos SIAC
        await client.query(`
            UPDATE companies
            SET active_modules = $1,
                updated_at = NOW()
            WHERE id = $2
        `, [JSON.stringify(siacModules), isiCompany.id]);

        console.log('✅ ISI company updated with SIAC modules:', siacModules);

        // Verificar el resultado
        const verifyResult = await client.query(`
            SELECT id, name, active_modules
            FROM companies
            WHERE id = $1
        `, [isiCompany.id]);

        console.log('🔍 Verification - Updated company:', verifyResult.rows[0]);

        console.log('🎉 SIAC modules successfully enabled for ISI!');

    } catch (error) {
        console.error('❌ Error enabling SIAC modules:', error);
    } finally {
        await client.end();
    }
}

simpleEnableSiac();