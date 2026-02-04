/**
 * VERIFICADOR DE CONSISTENCIA DE MÓDULOS
 *
 * Verifica que todo el ecosistema use los mismos módulos CORE y opcionales
 * basándose en system_modules como única fuente de verdad.
 */

const { Client } = require('pg');

async function verify() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    console.log('\n' + '═'.repeat(70));
    console.log('  VERIFICACIÓN DE CONSISTENCIA DE MÓDULOS');
    console.log('  Fuente de verdad: system_modules');
    console.log('═'.repeat(70));

    // 1. MÓDULOS CORE en system_modules
    const coreResult = await client.query(`
        SELECT module_key, name, parent_module_key
        FROM system_modules
        WHERE is_core = true AND is_active = true
        ORDER BY parent_module_key NULLS FIRST, name
    `);

    const coreTarjetas = coreResult.rows.filter(r => !r.parent_module_key);
    const coreSubmodulos = coreResult.rows.filter(r => r.parent_module_key);

    console.log(`\n📦 MÓDULOS CORE (is_core=true): ${coreResult.rows.length} total`);
    console.log(`   ├── Tarjetas (parent_module_key IS NULL): ${coreTarjetas.length}`);
    console.log(`   └── Submódulos (tienen parent): ${coreSubmodulos.length}`);

    // 2. MÓDULOS OPCIONALES en system_modules
    const optionalResult = await client.query(`
        SELECT module_key, name, parent_module_key
        FROM system_modules
        WHERE is_core = false AND is_active = true
        ORDER BY parent_module_key NULLS FIRST, name
    `);

    const optTarjetas = optionalResult.rows.filter(r => !r.parent_module_key);
    const optSubmodulos = optionalResult.rows.filter(r => r.parent_module_key);

    console.log(`\n💰 MÓDULOS OPCIONALES (is_core=false): ${optionalResult.rows.length} total`);
    console.log(`   ├── Tarjetas (parent_module_key IS NULL): ${optTarjetas.length}`);
    console.log(`   └── Submódulos (tienen parent): ${optSubmodulos.length}`);

    // 3. Verificar vista v_modules_by_panel
    const vistaResult = await client.query(`
        SELECT commercial_type, COUNT(*) as cnt
        FROM v_modules_by_panel
        WHERE show_as_card = true AND target_panel = 'panel-empresa'
        GROUP BY commercial_type
        ORDER BY commercial_type
    `);

    console.log(`\n🖼️  VISTA v_modules_by_panel (tarjetas panel-empresa):`);
    vistaResult.rows.forEach(r => {
        const emoji = r.commercial_type === 'core' ? '🔵' :
                      r.commercial_type === 'opcional' ? '🟢' : '📦';
        console.log(`   ${emoji} ${r.commercial_type}: ${r.cnt}`);
    });

    // 4. Verificar empresas activas y sus módulos
    const empresasResult = await client.query(`
        SELECT
            c.company_id,
            c.name,
            c.is_active,
            COUNT(cm.id) as modules_count,
            COUNT(CASE WHEN sm.is_core THEN 1 END) as core_count,
            COUNT(CASE WHEN NOT sm.is_core THEN 1 END) as optional_count
        FROM companies c
        LEFT JOIN company_modules cm ON c.company_id = cm.company_id AND cm.activo = true
        LEFT JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE c.is_active = true
        GROUP BY c.company_id, c.name, c.is_active
        ORDER BY c.name
    `);

    console.log(`\n🏢 EMPRESAS ACTIVAS Y SUS MÓDULOS:`);
    console.log('   ' + '-'.repeat(65));
    console.log(`   ${'Empresa'.padEnd(30)} | Total | CORE | Opcional`);
    console.log('   ' + '-'.repeat(65));

    let empresasSinModulos = 0;
    for (const e of empresasResult.rows) {
        if (e.modules_count == 0) empresasSinModulos++;
        const status = e.modules_count == 0 ? '⚠️' : '✅';
        console.log(`   ${status} ${e.name.substring(0, 28).padEnd(28)} | ${String(e.modules_count).padStart(5)} | ${String(e.core_count).padStart(4)} | ${String(e.optional_count).padStart(8)}`);
    }

    if (empresasSinModulos > 0) {
        console.log(`\n   ⚠️  HAY ${empresasSinModulos} EMPRESAS SIN MÓDULOS EN company_modules!`);
    }

    // 5. Resumen final
    console.log('\n' + '═'.repeat(70));
    console.log('  RESUMEN');
    console.log('═'.repeat(70));
    console.log(`\n  📊 TOTALES EN system_modules:`);
    console.log(`     • Módulos CORE: ${coreResult.rows.length} (${coreTarjetas.length} tarjetas + ${coreSubmodulos.length} submódulos)`);
    console.log(`     • Módulos OPCIONALES: ${optionalResult.rows.length} (${optTarjetas.length} tarjetas + ${optSubmodulos.length} submódulos)`);
    console.log(`     • TOTAL: ${coreResult.rows.length + optionalResult.rows.length}`);

    console.log(`\n  🎯 CONSISTENCIA:`);
    if (empresasSinModulos === 0) {
        console.log(`     ✅ Todas las empresas activas tienen módulos asignados`);
    } else {
        console.log(`     ❌ ${empresasSinModulos} empresas sin módulos - REQUIERE CORRECCIÓN`);
    }

    // 6. Listar tarjetas CORE (las que importan comercialmente)
    console.log(`\n  🔵 TARJETAS CORE (${coreTarjetas.length}) - Incluidas en paquete base:`);
    coreTarjetas.forEach(m => console.log(`     • ${m.module_key}`));

    // 7. Listar tarjetas OPCIONALES
    console.log(`\n  🟢 TARJETAS OPCIONALES (${optTarjetas.length}) - Se venden por separado:`);
    optTarjetas.forEach(m => console.log(`     • ${m.module_key}`));

    console.log('\n' + '═'.repeat(70) + '\n');

    await client.end();
}

verify().catch(e => console.error('Error:', e.message));
