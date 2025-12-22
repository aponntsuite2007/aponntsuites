/**
 * Script para limpiar workflows duplicados
 * Mantiene solo 1 registro por (process_key, scope, company_id)
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function cleanDuplicates() {
    console.log('🔍 Detectando workflows duplicados...\n');

    try {
        // 1. Detectar duplicados
        const [duplicates] = await sequelize.query(`
            SELECT process_key, scope, COUNT(*) as total
            FROM notification_workflows
            WHERE company_id IS NULL
            GROUP BY process_key, scope
            HAVING COUNT(*) > 1
            ORDER BY total DESC, process_key
        `);

        if (duplicates.length === 0) {
            console.log('✅ No hay duplicados detectados.\n');
        } else {
            console.log(`⚠️  Se encontraron ${duplicates.length} process_keys duplicados:\n`);
            console.table(duplicates);

            console.log('\n🗑️  Eliminando duplicados (manteniendo el más reciente)...\n');

            // 2. Eliminar duplicados (mantener el id más alto = más reciente)
            await sequelize.query(`
                DELETE FROM notification_workflows a
                USING notification_workflows b
                WHERE
                    a.id < b.id
                    AND a.process_key = b.process_key
                    AND a.scope = b.scope
                    AND (a.company_id IS NULL AND b.company_id IS NULL
                         OR a.company_id = b.company_id)
            `);

            console.log('✅ Duplicados eliminados.\n');
        }

        // 3. Verificar resultado final
        const [result] = await sequelize.query(`
            SELECT scope, COUNT(*) as total
            FROM notification_workflows
            GROUP BY scope
            ORDER BY scope
        `);

        console.log('📊 Workflows después de limpieza:');
        console.table(result);

        const [totalResult] = await sequelize.query(`
            SELECT COUNT(*) as total FROM notification_workflows
        `);
        const total = totalResult[0].total;

        console.log(`\n🎯 Total de workflows en BD: ${total}`);
        console.log(`   Esperado: 78`);
        console.log(`   ${total === 78 ? '✅ CORRECTO ¡Ahora sí!' : total > 78 ? '⚠️  Todavía hay duplicados' : '❌ FALTAN ' + (78 - total)}\n`);

        // 4. Verificar que tenemos los 8 nuevos workflows
        const [newWorkflows] = await sequelize.query(`
            SELECT process_key, process_name, module
            FROM notification_workflows
            WHERE module IN ('performance', 'documents', 'procedures')
            ORDER BY module, process_key
        `);

        console.log('📂 Workflows nuevos (Performance, Documents, Procedures):');
        console.table(newWorkflows);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanDuplicates();
