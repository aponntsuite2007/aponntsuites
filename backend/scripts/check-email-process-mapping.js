/**
 * Script para verificar si existe tabla de mapeo email→proceso
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function checkMapping() {
    console.log('🔍 Verificando tablas de mapeo email-proceso...\n');

    try {
        // 1. Buscar tablas relacionadas con email_process o process_email
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND (
                table_name LIKE '%email%process%'
                OR table_name LIKE '%process%email%'
                OR table_name = 'company_email_config'
              )
            ORDER BY table_name
        `);

        console.log('📋 Tablas relacionadas encontradas:');
        console.table(tables);

        // 2. Ver estructura de company_email_config si existe
        const emailConfigExists = tables.some(t => t.table_name === 'company_email_config');

        if (emailConfigExists) {
            console.log('\n📊 Estructura de company_email_config:');
            const [columns] = await sequelize.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'company_email_config'
                ORDER BY ordinal_position
            `);
            console.table(columns);

            // Ver datos
            const [data] = await sequelize.query(`
                SELECT * FROM company_email_config LIMIT 5
            `);
            console.log(`\n📊 Datos en company_email_config: ${data.length} registros`);
            if (data.length > 0) {
                console.table(data);
            }
        } else {
            console.log('\n⚠️  NO existe tabla company_email_config');
        }

        // 3. Verificar si notification_workflows tiene campo email asignado
        const [nwColumns] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'notification_workflows'
              AND (column_name LIKE '%email%' OR column_name LIKE '%from%')
            ORDER BY ordinal_position
        `);

        console.log('\n🔔 Columnas de email en notification_workflows:');
        console.table(nwColumns);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkMapping();
