/**
 * Script para identificar cuál base de datos tiene la empresa DEMO (producción)
 */

const { Client } = require('pg');

const DATABASES = [
    {
        name: 'aponnt_db (Base 1)',
        url: 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com/aponnt_db'
    },
    {
        name: 'attendance_system_866u (Base 2)',
        url: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u'
    }
];

async function checkDatabase(dbConfig) {
    const client = new Client({
        connectionString: dbConfig.url,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Consultar empresas
        const result = await client.query(`
            SELECT id, name, slug, is_active, created_at
            FROM companies
            ORDER BY id
            LIMIT 10
        `);

        console.log(`\n📊 ${dbConfig.name}:`);
        console.log(`   Total empresas: ${result.rows.length}`);

        if (result.rows.length > 0) {
            console.log(`   Empresas encontradas:`);
            result.rows.forEach(company => {
                const marker = company.name === 'DEMO' ? '⭐ PRODUCCIÓN' : '';
                console.log(`   - ${company.name} (slug: ${company.slug}) ${marker}`);
            });
        } else {
            console.log(`   ⚠️  Base de datos VACÍA - no hay empresas`);
        }

        return {
            dbName: dbConfig.name,
            companies: result.rows,
            hasDemo: result.rows.some(c => c.name === 'DEMO')
        };

    } catch (error) {
        console.log(`\n❌ ${dbConfig.name}:`);
        console.log(`   Error: ${error.message}`);
        return {
            dbName: dbConfig.name,
            error: error.message
        };
    } finally {
        await client.end();
    }
}

async function main() {
    console.log('🔍 Identificando base de datos de PRODUCCIÓN...\n');

    const results = [];

    for (const db of DATABASES) {
        const result = await checkDatabase(db);
        results.push(result);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN:');
    console.log('='.repeat(60));

    const productionDb = results.find(r => r.hasDemo);

    if (productionDb) {
        console.log(`\n✅ BASE DE PRODUCCIÓN IDENTIFICADA:`);
        console.log(`   ${productionDb.dbName}`);
        console.log(`\n💡 Las migraciones SIAC deben ejecutarse en esta base.`);
    } else {
        console.log(`\n⚠️  No se encontró la empresa DEMO en ninguna base.`);
    }

    console.log('');
}

main();
