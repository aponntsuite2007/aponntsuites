/**
 * FIX: Insertar módulos de FMIATELLO en company_modules
 *
 * FMIATELLO (company_id=124) tiene:
 * - Quote aceptado con 2 módulos: my-procedures, voice-platform
 * - 0 registros en company_modules (el bug)
 *
 * Este script inserta:
 * - Todos los módulos CORE (is_core=true)
 * - Los módulos del quote (my-procedures, voice-platform)
 */

const { Client } = require('pg');

async function fix() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302'
    });
    await client.connect();

    const companyId = 124; // FMIATELLO

    try {
        await client.query('BEGIN');

        // 1. Obtener módulos CORE
        const coreResult = await client.query(`
            SELECT module_key FROM system_modules WHERE is_core = true
        `);
        const coreModules = coreResult.rows.map(r => r.module_key);
        console.log(`\n=== MÓDULOS CORE (${coreModules.length}) ===`);
        coreModules.forEach(m => console.log(`  ✅ ${m}`));

        // 2. Obtener módulos del quote
        const quoteResult = await client.query(`
            SELECT modules_data
            FROM quotes
            WHERE company_id = $1 AND status IN ('active', 'accepted', 'in_trial')
            ORDER BY created_at DESC LIMIT 1
        `, [companyId]);

        let contractedModules = [];
        if (quoteResult.rows.length > 0 && quoteResult.rows[0].modules_data) {
            const modulesData = quoteResult.rows[0].modules_data;
            contractedModules = modulesData.map(m => m.key || m.module_key || m);
        }
        console.log(`\n=== MÓDULOS DEL QUOTE (${contractedModules.length}) ===`);
        contractedModules.forEach(m => console.log(`  📦 ${m}`));

        // 3. Combinar sin duplicados
        const allModules = [...new Set([...coreModules, ...contractedModules])];
        console.log(`\n=== TOTAL A INSERTAR: ${allModules.length} módulos ===`);

        // 4. Eliminar registros existentes
        await client.query(`DELETE FROM company_modules WHERE company_id = $1`, [companyId]);
        console.log(`\n🗑️ Eliminados registros anteriores de company_modules`);

        // 5. Insertar módulos
        const insertResult = await client.query(`
            INSERT INTO company_modules (company_id, system_module_id, activo, created_at, updated_at)
            SELECT $1, sm.id, true, NOW(), NOW()
            FROM system_modules sm
            WHERE sm.module_key = ANY($2::varchar[])
            ON CONFLICT (company_id, system_module_id) DO UPDATE SET activo = true, updated_at = NOW()
            RETURNING id, system_module_id
        `, [companyId, allModules]);

        console.log(`\n✅ Insertados ${insertResult.rowCount} registros en company_modules`);

        // 6. Actualizar active_modules en companies (LEGACY)
        await client.query(`
            UPDATE companies SET active_modules = $2 WHERE company_id = $1
        `, [companyId, JSON.stringify(allModules)]);
        console.log(`✅ Actualizado companies.active_modules`);

        await client.query('COMMIT');

        // 7. Verificar resultado
        const verifyResult = await client.query(`
            SELECT cm.id, sm.module_key, sm.name, sm.is_core
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = $1 AND cm.activo = true
            ORDER BY sm.is_core DESC, sm.name
        `, [companyId]);

        console.log(`\n=== VERIFICACIÓN: MÓDULOS ACTIVOS EN company_modules ===`);
        console.log(`Total: ${verifyResult.rows.length}`);
        verifyResult.rows.forEach(r => {
            console.log(`  ${r.is_core ? '🔵 CORE' : '🟢 OPCIONAL'} ${r.module_key} - ${r.name}`);
        });

        console.log(`\n🎉 FMIATELLO corregida exitosamente!`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

fix();
