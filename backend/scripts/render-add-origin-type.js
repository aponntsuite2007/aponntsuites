/**
 * Agregar columnas faltantes a quotes en Render
 * Con retry agresivo y conexiones individuales
 */
const { Client } = require('pg');

const connectionString = 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com:5432/attendance_system_866u';

const queries = [
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_type VARCHAR(30) DEFAULT 'manual'",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_detail JSONB",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS seller_assigned_at TIMESTAMP",
    // Otras columnas importantes
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lead_id UUID",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sales_lead_id UUID",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS modules_data JSONB DEFAULT '[]'",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS has_trial BOOLEAN DEFAULT false",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS trial_modules JSONB",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'",
    "ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_status VARCHAR(20) DEFAULT 'none'"
];

async function runQuery(sql) {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 20000,
        query_timeout: 15000
    });

    try {
        await client.connect();
        await client.query(sql);
        await client.end();
        return { success: true };
    } catch (e) {
        try { await client.end(); } catch (_) {}
        return { success: false, error: e.message };
    }
}

async function main() {
    console.log('=== AGREGAR COLUMNAS A quotes EN RENDER ===\n');

    let success = 0;
    let failed = 0;

    for (let i = 0; i < queries.length; i++) {
        const sql = queries[i];
        const colName = sql.match(/IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        process.stdout.write(`${String(i + 1).padStart(2)}. ${colName.padEnd(25)} `);

        // Intentar hasta 3 veces
        let result = { success: false };
        for (let retry = 0; retry < 3; retry++) {
            result = await runQuery(sql);
            if (result.success) break;
            await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
        }

        if (result.success) {
            console.log('✅');
            success++;
        } else {
            if (result.error?.includes('already exists') || result.error?.includes('ya existe')) {
                console.log('✅ (ya existe)');
                success++;
            } else {
                console.log(`❌ ${result.error?.substring(0, 40) || 'error'}`);
                failed++;
            }
        }
    }

    console.log('\n=== RESULTADO ===');
    console.log(`✅ Éxitos: ${success}`);
    console.log(`❌ Fallos: ${failed}`);

    if (failed > 0) {
        console.log('\n⚠️ Algunas columnas no se pudieron agregar.');
        console.log('   Ejecutar manualmente en Render Dashboard > Database > Query');
    }
}

main();
