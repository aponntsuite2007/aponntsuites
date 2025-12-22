/**
 * Script para ejecutar migración de company_email_process_mapping
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔄 Ejecutando migración de company_email_process_mapping...\n');

    try {
        // Leer SQL
        const sqlPath = path.join(__dirname, '../migrations/20251221_create_company_email_process_mapping.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar
        await sequelize.query(sqlContent);

        // Verificar resultado
        const [columns] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'company_email_process_mapping'
            ORDER BY ordinal_position
        `);

        console.log('\n✅ Tabla creada exitosamente!\n');
        console.log('📋 Estructura de company_email_process_mapping:');
        console.table(columns);

        // Verificar constraints
        const [constraints] = await sequelize.query(`
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conrelid = 'company_email_process_mapping'::regclass
        `);

        console.log('\n🔒 Constraints:');
        console.table(constraints);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runMigration();
