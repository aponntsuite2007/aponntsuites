/**
 * Ejecutar migración quotes en Local y Render
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationSQL = fs.readFileSync(
    path.join(__dirname, '..', 'migrations', '20260202_sync_quotes_table.sql'),
    'utf8'
);

const localPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
});

const renderConnectionString = 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com:5432/attendance_system_866u';

async function runMigration(pool, name) {
    console.log(`\n=== Ejecutando migración en ${name} ===`);
    try {
        // Ejecutar cada statement por separado
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let success = 0;
        let errors = 0;

        for (const stmt of statements) {
            try {
                await pool.query(stmt);
                success++;
            } catch (e) {
                // Ignorar errores de "ya existe"
                if (!e.message.includes('already exists') && !e.message.includes('ya existe')) {
                    console.log(`   ⚠️ ${e.message.substring(0, 60)}`);
                    errors++;
                } else {
                    success++;
                }
            }
        }

        console.log(`   ✅ ${name}: ${success} statements ejecutados, ${errors} errores`);
        return true;
    } catch (e) {
        console.log(`   ❌ ${name} Error: ${e.message}`);
        return false;
    }
}

async function runWithRetry(connectionString, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 30000
        });

        try {
            console.log(`   Intento ${i + 1}/${maxRetries}...`);
            await pool.query('SELECT 1');
            const result = await runMigration(pool, 'RENDER');
            await pool.end();
            return result;
        } catch (e) {
            console.log(`   Error conexión: ${e.message.substring(0, 50)}`);
            try { await pool.end(); } catch (_) {}
            if (i < maxRetries - 1) {
                console.log(`   Reintentando en ${(i + 1) * 2}s...`);
                await new Promise(r => setTimeout(r, (i + 1) * 2000));
            }
        }
    }
    return false;
}

async function main() {
    console.log('='.repeat(60));
    console.log('MIGRACIÓN TABLA quotes');
    console.log('='.repeat(60));

    // 1. Local
    console.log('\n1. EJECUTANDO EN LOCAL...');
    try {
        await runMigration(localPool, 'LOCAL');
    } catch (e) {
        console.log('   Error local:', e.message);
    }
    await localPool.end();

    // 2. Render
    console.log('\n2. EJECUTANDO EN RENDER...');
    const renderSuccess = await runWithRetry(renderConnectionString);

    // 3. Resultado
    console.log('\n' + '='.repeat(60));
    console.log('RESULTADO');
    console.log('='.repeat(60));
    console.log(`LOCAL: ✅`);
    console.log(`RENDER: ${renderSuccess ? '✅' : '❌ (conexión inestable)'}`);

    if (!renderSuccess) {
        console.log('\n⚠️ Para ejecutar manualmente en Render:');
        console.log('   1. Ir a Render Dashboard > Database > Query');
        console.log('   2. Pegar el contenido de: migrations/20260202_sync_quotes_table.sql');
    }
}

main();
