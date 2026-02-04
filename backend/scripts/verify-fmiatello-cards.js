/**
 * Verificar qué TARJETAS ve FMIATELLO en panel-empresa
 * (usando la vista v_modules_by_panel que filtra show_as_card=true)
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

    const companyId = 124; // FMIATELLO

    // Obtener tarjetas que FMIATELLO debería ver
    // (módulos en company_modules que aparecen como tarjeta en panel-empresa)
    const result = await client.query(`
        SELECT
            v.module_key,
            v.name,
            v.commercial_type,
            v.show_as_card,
            v.target_panel
        FROM v_modules_by_panel v
        JOIN company_modules cm ON cm.system_module_id = (
            SELECT id FROM system_modules WHERE module_key = v.module_key
        )
        WHERE cm.company_id = $1
          AND cm.activo = true
          AND v.show_as_card = true
          AND v.target_panel = 'panel-empresa'
        ORDER BY v.commercial_type, v.name
    `, [companyId]);

    console.log(`\n=== TARJETAS QUE VE FMIATELLO EN panel-empresa ===`);
    console.log(`Total tarjetas: ${result.rows.length}\n`);

    // Agrupar por tipo comercial
    const grouped = {};
    result.rows.forEach(r => {
        if (!grouped[r.commercial_type]) grouped[r.commercial_type] = [];
        grouped[r.commercial_type].push(r);
    });

    Object.keys(grouped).sort().forEach(type => {
        const modules = grouped[type];
        const emoji = type === 'core' ? '🔵' : type === 'opcional' ? '🟢' : '📦';
        console.log(`${emoji} ${type.toUpperCase()} (${modules.length}):`);
        modules.forEach(m => console.log(`   - ${m.module_key} : ${m.name}`));
        console.log('');
    });

    await client.end();
}

verify().catch(e => console.error('Error:', e.message));
