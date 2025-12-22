/**
 * Script para ejecutar la migración de campos de visualización de email config
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔄 Ejecutando migración de email config display fields...\n');

    try {
        // Leer SQL
        const sqlPath = path.join(__dirname, '../migrations/20251221_add_display_fields_to_email_config.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar
        await sequelize.query(sqlContent);

        // Verificar resultado
        const [result] = await sequelize.query(`
            SELECT
                email_type,
                icon,
                color,
                description,
                from_name,
                is_active
            FROM aponnt_email_config
            WHERE is_active = true
            ORDER BY email_type
        `);

        console.log('\n✅ Migración completada!\n');
        console.log('📊 Email types con información de visualización:');
        console.table(result);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

runMigration();
