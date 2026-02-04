const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system'
    });
    await client.connect();

    try {
        // Check v_modules_by_panel view structure
        const cols = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'v_modules_by_panel'
        `);
        console.log('Columnas de v_modules_by_panel:', cols.rows.map(c => c.column_name));

        // Get panel-empresa modules
        const panelEmpresa = await client.query(`
            SELECT * FROM v_modules_by_panel
            WHERE target_panel = 'panel-empresa'
              AND show_as_card = true
            ORDER BY is_core DESC, name
        `);

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  MÓDULOS COMERCIALES (panel-empresa)');
        console.log('═══════════════════════════════════════════════════════════\n');

        let coreCount = 0, opcCount = 0;
        panelEmpresa.rows.forEach((m, i) => {
            const tipo = m.is_core ? '🔵 CORE' : '🟢 OPC';
            if (m.is_core) coreCount++; else opcCount++;
            console.log(`${String(i+1).padStart(2)}. [${m.module_key}] ${m.name} - ${tipo}`);
        });

        console.log(`\n📊 Total: ${coreCount} CORE + ${opcCount} OPCIONALES = ${panelEmpresa.rows.length}`);

    } finally {
        await client.end();
    }
}

main().catch(console.error);
