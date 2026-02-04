/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VERIFICADOR DE MÓDULOS COMERCIALES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DEFINICIÓN FUNDAMENTAL:
 *
 *   MÓDULOS COMERCIALES = SOLO los de panel-empresa
 *                       = Los ÚNICOS que se venden a clientes
 *
 *   Todo lo demás (panel-administrativo, panel-proveedores, panel-asociados,
 *   engineering-dashboard, etc.) son herramientas INTERNAS de APONNT,
 *   NO comercializables.
 *
 * CATEGORÍAS COMERCIALES:
 *   🔵 CORE     → Incluidos en el paquete base (precio fijo por empleado)
 *   🟢 OPCIONAL → Se venden por separado (precio individual)
 *
 * FUENTE DE VERDAD:
 *   SELECT * FROM v_modules_by_panel
 *   WHERE target_panel = 'panel-empresa' AND show_as_card = true
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Client } = require('pg');

async function verify() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
    });
    await client.connect();

    console.log('\n' + '═'.repeat(70));
    console.log('  MÓDULOS COMERCIALES - CATÁLOGO OFICIAL');
    console.log('  Comercial = SOLO panel-empresa = Lo que se vende');
    console.log('═'.repeat(70));

    // ══════════════════════════════════════════════════════════════════════
    // 1. MÓDULOS COMERCIALES (panel-empresa con show_as_card=true)
    // ══════════════════════════════════════════════════════════════════════

    const comercialResult = await client.query(`
        SELECT
            module_key,
            name,
            commercial_type,
            COALESCE((SELECT base_price FROM system_modules sm WHERE sm.module_key = v.module_key), 0) as base_price
        FROM v_modules_by_panel v
        WHERE target_panel = 'panel-empresa'
          AND show_as_card = true
        ORDER BY commercial_type, name
    `);

    const coreModules = comercialResult.rows.filter(r => r.commercial_type === 'core');
    const optionalModules = comercialResult.rows.filter(r => r.commercial_type === 'opcional');
    const apkModules = comercialResult.rows.filter(r => r.commercial_type === 'apk-complementaria');

    // ══════════════════════════════════════════════════════════════════════
    // 2. MOSTRAR CATÁLOGO CORE
    // ══════════════════════════════════════════════════════════════════════

    console.log(`\n🔵 PAQUETE CORE (${coreModules.length} módulos) - Incluido en suscripción base`);
    console.log('─'.repeat(70));
    coreModules.forEach(m => {
        console.log(`   • ${m.module_key.padEnd(30)} ${m.name}`);
    });

    // ══════════════════════════════════════════════════════════════════════
    // 3. MOSTRAR CATÁLOGO OPCIONAL
    // ══════════════════════════════════════════════════════════════════════

    console.log(`\n🟢 MÓDULOS OPCIONALES (${optionalModules.length} módulos) - Venta individual`);
    console.log('─'.repeat(70));
    optionalModules.forEach(m => {
        const price = parseFloat(m.base_price) || 0;
        const priceStr = price > 0 ? `$${price.toFixed(2)}/emp` : 'Sin precio';
        console.log(`   • ${m.module_key.padEnd(30)} ${m.name.padEnd(25)} ${priceStr}`);
    });

    // ══════════════════════════════════════════════════════════════════════
    // 4. MOSTRAR APKs COMPLEMENTARIAS
    // ══════════════════════════════════════════════════════════════════════

    if (apkModules.length > 0) {
        console.log(`\n📱 APKs COMPLEMENTARIAS (${apkModules.length}) - Incluidas con CORE`);
        console.log('─'.repeat(70));
        apkModules.forEach(m => {
            console.log(`   • ${m.module_key.padEnd(30)} ${m.name}`);
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. MÓDULOS NO COMERCIALES (para referencia)
    // ══════════════════════════════════════════════════════════════════════

    const noComercialResult = await client.query(`
        SELECT target_panel, COUNT(*) as cnt
        FROM v_modules_by_panel
        WHERE target_panel != 'panel-empresa'
        GROUP BY target_panel
        ORDER BY target_panel
    `);

    console.log(`\n⚙️  MÓDULOS NO COMERCIALES (internos APONNT)`);
    console.log('─'.repeat(70));
    noComercialResult.rows.forEach(r => {
        console.log(`   • ${r.target_panel.padEnd(25)} ${r.cnt} módulos`);
    });

    // ══════════════════════════════════════════════════════════════════════
    // 6. VERIFICAR EMPRESAS Y SUS MÓDULOS COMERCIALES
    // ══════════════════════════════════════════════════════════════════════

    const empresasResult = await client.query(`
        SELECT
            c.company_id,
            c.name,
            COUNT(DISTINCT CASE WHEN v.commercial_type = 'core' THEN cm.id END) as core_count,
            COUNT(DISTINCT CASE WHEN v.commercial_type = 'opcional' THEN cm.id END) as optional_count
        FROM companies c
        LEFT JOIN company_modules cm ON c.company_id = cm.company_id AND cm.activo = true
        LEFT JOIN system_modules sm ON cm.system_module_id = sm.id
        LEFT JOIN v_modules_by_panel v ON sm.module_key = v.module_key
            AND v.target_panel = 'panel-empresa'
            AND v.show_as_card = true
        WHERE c.is_active = true
        GROUP BY c.company_id, c.name
        ORDER BY c.name
    `);

    console.log(`\n🏢 EMPRESAS ACTIVAS - MÓDULOS COMERCIALES ASIGNADOS`);
    console.log('─'.repeat(70));
    console.log(`   ${'Empresa'.padEnd(30)} | CORE | Opcionales`);
    console.log('─'.repeat(70));

    let empresasIncompletas = 0;
    for (const e of empresasResult.rows) {
        const status = e.core_count >= coreModules.length ? '✅' : '⚠️';
        if (e.core_count < coreModules.length) empresasIncompletas++;
        console.log(`   ${status} ${e.name.substring(0, 28).padEnd(28)} | ${String(e.core_count).padStart(4)} | ${String(e.optional_count).padStart(10)}`);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 7. RESUMEN FINAL
    // ══════════════════════════════════════════════════════════════════════

    console.log('\n' + '═'.repeat(70));
    console.log('  RESUMEN CATÁLOGO COMERCIAL');
    console.log('═'.repeat(70));
    console.log(`
  📦 PRODUCTOS COMERCIALIZABLES (panel-empresa):
     ┌────────────────────────────────────────┐
     │  🔵 CORE:      ${String(coreModules.length).padStart(2)} tarjetas            │
     │  🟢 OPCIONAL:  ${String(optionalModules.length).padStart(2)} tarjetas            │
     │  📱 APKs:       ${String(apkModules.length).padStart(2)} complementarias      │
     ├────────────────────────────────────────┤
     │  TOTAL:        ${String(coreModules.length + optionalModules.length + apkModules.length).padStart(2)} productos           │
     └────────────────────────────────────────┘

  ⚙️  NO COMERCIALIZABLES (internos):
     • panel-administrativo, panel-proveedores, panel-asociados
     • engineering-dashboard, auditor, deploy-manager, etc.
     • Son herramientas de gestión APONNT, NO se venden
`);

    if (empresasIncompletas > 0) {
        console.log(`  ⚠️  ATENCIÓN: ${empresasIncompletas} empresas no tienen todos los módulos CORE`);
    } else {
        console.log(`  ✅ Todas las empresas tienen los ${coreModules.length} módulos CORE asignados`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');

    await client.end();
}

verify().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
