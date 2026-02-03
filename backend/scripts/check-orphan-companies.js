/**
 * Script para eliminar empresas huérfanas (sin presupuesto)
 * EXCLUYE: Empresa ID=1 (APONNT Suite - master del sistema)
 *
 * Usa session_replication_role = 'replica' para deshabilitar FK temporalmente
 */
const { sequelize } = require('../src/config/database');

async function checkAndDeleteOrphans() {
    try {
        console.log('=== ANÁLISIS DE EMPRESAS HUÉRFANAS ===\n');

        // Empresas SIN presupuesto (excluye ID=1 que es APONNT master)
        const orphans = await sequelize.query(`
            SELECT c.company_id as id, c.name, c.is_active, c.onboarding_status
            FROM companies c
            LEFT JOIN quotes q ON q.company_id = c.company_id
            WHERE q.id IS NULL
              AND c.company_id != 1
            ORDER BY c.company_id
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('EMPRESAS SIN PRESUPUESTO (huérfanas):', orphans.length);
        console.log('(Excluye APONNT Suite ID=1 - empresa master)');
        console.log('----------------------------------------');
        orphans.forEach(c => {
            console.log(`ID: ${c.id} | ${c.name} | Active: ${c.is_active}`);
        });

        if (orphans.length === 0) {
            console.log('\n✅ No hay empresas huérfanas para eliminar.');
            await sequelize.close();
            return;
        }

        const orphanIds = orphans.map(c => c.id);
        console.log('\nIDs a eliminar:', orphanIds.join(', '));

        // Contar usuarios afectados
        const userCount = await sequelize.query(`
            SELECT COUNT(*) as count FROM users
            WHERE company_id = ANY(ARRAY[:ids]::int[])
              AND (is_core_user IS NULL OR is_core_user = false)
        `, { replacements: { ids: orphanIds }, type: sequelize.QueryTypes.SELECT });
        console.log('Usuarios a eliminar (no-CORE):', userCount[0].count);

        // Verificar empresas con usuarios CORE
        const coreUsers = await sequelize.query(`
            SELECT company_id, COUNT(*) as count FROM users
            WHERE company_id = ANY(ARRAY[:ids]::int[]) AND is_core_user = true
            GROUP BY company_id
        `, { replacements: { ids: orphanIds }, type: sequelize.QueryTypes.SELECT });

        const idsWithCore = coreUsers.map(r => r.company_id);
        const safeIds = orphanIds.filter(id => !idsWithCore.includes(id));

        if (coreUsers.length > 0) {
            console.log('\n⚠️ Empresas con usuarios CORE (se mantienen):');
            coreUsers.forEach(r => console.log(`  - Company ${r.company_id}: ${r.count} usuarios CORE`));
            console.log(`\nEmpresas que SÍ se pueden eliminar: ${safeIds.length}`);
        }

        if (safeIds.length === 0) {
            console.log('\n❌ No hay empresas que se puedan eliminar (todas tienen usuarios CORE)');
            await sequelize.close();
            return;
        }

        console.log('\n🔄 Iniciando eliminación...');

        // Deshabilitar FK constraints temporalmente
        console.log('  → Deshabilitando FK constraints...');
        await sequelize.query(`SET session_replication_role = 'replica'`);

        try {
            // Obtener user_ids de usuarios a eliminar
            const users = await sequelize.query(`
                SELECT user_id FROM users
                WHERE company_id = ANY(ARRAY[:ids]::int[])
            `, { replacements: { ids: safeIds }, type: sequelize.QueryTypes.SELECT });
            const userIds = users.map(u => u.user_id);

            // Eliminar usuarios (excepto CORE)
            if (userIds.length > 0) {
                console.log(`  → Eliminando ${userIds.length} usuarios...`);
                await sequelize.query(`
                    DELETE FROM users
                    WHERE company_id = ANY(ARRAY[:ids]::int[])
                      AND (is_core_user IS NULL OR is_core_user = false)
                `, { replacements: { ids: safeIds } });
            }

            // Eliminar empresas
            console.log(`  → Eliminando ${safeIds.length} empresas...`);
            await sequelize.query(`
                DELETE FROM companies WHERE company_id = ANY(ARRAY[:ids]::int[])
            `, { replacements: { ids: safeIds } });

            console.log('  ✓ Eliminación completada');

        } finally {
            // IMPORTANTE: Restaurar FK constraints
            console.log('  → Restaurando FK constraints...');
            await sequelize.query(`SET session_replication_role = 'origin'`);
        }

        console.log(`\n✅ LIMPIEZA COMPLETADA - ${safeIds.length} empresas eliminadas`);

        // Estado final
        const remaining = await sequelize.query(`SELECT COUNT(*) as count FROM companies`,
            { type: sequelize.QueryTypes.SELECT });
        const withQuotes = await sequelize.query(`
            SELECT COUNT(DISTINCT c.company_id) as count FROM companies c
            INNER JOIN quotes q ON q.company_id = c.company_id
        `, { type: sequelize.QueryTypes.SELECT });

        console.log(`\n📊 Estado final:`);
        console.log(`   - Empresas totales: ${remaining[0].count}`);
        console.log(`   - Con presupuesto: ${withQuotes[0].count}`);
        console.log(`   - Sin presupuesto: ${remaining[0].count - withQuotes[0].count} (incluyendo APONNT master)`);

        await sequelize.close();
    } catch (err) {
        // Restaurar FK en caso de error
        try {
            await sequelize.query(`SET session_replication_role = 'origin'`);
        } catch (e) {}

        console.error('❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

checkAndDeleteOrphans();
