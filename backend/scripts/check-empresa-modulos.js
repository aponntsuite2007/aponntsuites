const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system'
    });
    await client.connect();

    try {
        // Get commercial modules for panel-empresa
        const comerciales = await client.query(`
            SELECT module_key FROM v_modules_by_panel
            WHERE target_panel = 'panel-empresa' AND show_as_card = true
        `);
        const modulosComerciales = comerciales.rows.map(m => m.module_key);
        console.log('Módulos comerciales (panel-empresa):', modulosComerciales.length);

        // Check WFTEST empresa (company_id = 24)
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  EMPRESA: WFTEST_Empresa Demo SA (company_id=24)');
        console.log('═══════════════════════════════════════════════════════════\n');

        const wftestModulos = await client.query(`
            SELECT sm.module_key, sm.name
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = 24 AND cm.activo = true
            ORDER BY sm.name
        `);

        console.log('Módulos activos:', wftestModulos.rows.length);

        // Check which commercial modules are missing
        const wftestKeys = wftestModulos.rows.map(m => m.module_key);
        const faltantes = modulosComerciales.filter(m => !wftestKeys.includes(m));

        if (faltantes.length > 0) {
            console.log('\n❌ Módulos comerciales FALTANTES:');
            faltantes.forEach(m => console.log('  - ' + m));
        } else {
            console.log('\n✅ WFTEST tiene TODOS los módulos comerciales');
        }

        // Get users for WFTEST
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  USUARIOS DISPONIBLES PARA LOGIN');
        console.log('═══════════════════════════════════════════════════════════\n');

        const usuarios = await client.query(`
            SELECT username, role, email
            FROM users
            WHERE company_id = 24 AND is_active = true
            ORDER BY role DESC
        `);

        usuarios.rows.forEach(u => {
            console.log(`👤 ${u.username} [${u.role}] - ${u.email || 'sin email'}`);
        });

        // Verify login credentials
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  CREDENCIALES RECOMENDADAS PARA TEST');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('EMPRESA: wftest-empresa-demo');
        console.log('USUARIO: soporte (o administrador si existe)');
        console.log('PASSWORD: admin123');

    } finally {
        await client.end();
    }
}

main().catch(console.error);
