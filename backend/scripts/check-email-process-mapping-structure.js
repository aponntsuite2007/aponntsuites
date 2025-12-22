/**
 * Script para ver estructura de email_process_mapping
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function checkStructure() {
    console.log('🔍 Analizando email_process_mapping...\n');

    try {
        // 1. Ver estructura
        const [columns] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'email_process_mapping'
            ORDER BY ordinal_position
        `);

        console.log('📋 Estructura de email_process_mapping:');
        console.table(columns);

        // 2. Ver constraints
        const [constraints] = await sequelize.query(`
            SELECT
                conname as constraint_name,
                contype as constraint_type,
                pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'email_process_mapping'::regclass
        `);

        console.log('\n🔒 Constraints:');
        console.table(constraints);

        // 3. Ver índices
        const [indexes] = await sequelize.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'email_process_mapping'
        `);

        console.log('\n📊 Índices:');
        console.table(indexes);

        // 4. Ver datos de ejemplo
        const [data] = await sequelize.query(`
            SELECT * FROM email_process_mapping LIMIT 10
        `);

        console.log(`\n📊 Datos en email_process_mapping: ${data.length} registros`);
        if (data.length > 0) {
            console.table(data);
        }

        // 5. Ver si hay mapeos por empresa
        const [stats] = await sequelize.query(`
            SELECT
                company_id,
                COUNT(*) as total_mappings
            FROM email_process_mapping
            GROUP BY company_id
            ORDER BY company_id
        `);

        console.log('\n📊 Mapeos por empresa:');
        console.table(stats);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkStructure();
