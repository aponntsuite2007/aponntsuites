/**
 * Script para insertar los 8 workflows faltantes (procesos 71-78)
 * - Performance Reviews (3)
 * - Documents (3)
 * - Procedures (2)
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function insertMissingWorkflows() {
    console.log('🔄 Insertando workflows faltantes (procesos 71-78)...\n');

    try {
        // Leer archivo SQL
        const sqlPath = path.join(__dirname, '../migrations/20251222_seed_notification_workflows.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar SQL
        await sequelize.query(sqlContent);

        // Verificar resultados
        const [result] = await sequelize.query(`
            SELECT scope, COUNT(*) as total
            FROM notification_workflows
            GROUP BY scope
            ORDER BY scope
        `);

        console.log('\n✅ Workflows insertados correctamente!\n');
        console.log('📊 Resumen por scope:');
        console.table(result);

        // Verificar total
        const [totalResult] = await sequelize.query(`
            SELECT COUNT(*) as total FROM notification_workflows
        `);
        const total = totalResult[0].total;

        console.log(`\n🎯 Total de workflows en BD: ${total}`);
        console.log(`   Esperado: 78`);
        console.log(`   ${total === 78 ? '✅ CORRECTO' : '❌ FALTAN ' + (78 - total)}\n`);

        // Verificar nuevos módulos
        const [newModules] = await sequelize.query(`
            SELECT module, COUNT(*) as total
            FROM notification_workflows
            WHERE module IN ('performance', 'documents', 'procedures')
            GROUP BY module
            ORDER BY module
        `);

        if (newModules.length > 0) {
            console.log('📂 Nuevos módulos agregados:');
            console.table(newModules);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al insertar workflows:', error);
        process.exit(1);
    }
}

insertMissingWorkflows();
