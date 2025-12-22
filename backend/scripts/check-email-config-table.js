/**
 * Script para verificar la estructura de la tabla aponnt_email_config
 */

require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function checkEmailConfigTable() {
    console.log('🔍 Verificando tabla aponnt_email_config...\n');

    try {
        // 1. Verificar si la tabla existe
        const [tableExists] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'aponnt_email_config'
            ) as exists
        `);

        if (!tableExists[0].exists) {
            console.log('❌ La tabla aponnt_email_config NO existe.\n');
            console.log('💡 Se necesita crear la tabla primero.\n');
            process.exit(0);
        }

        console.log('✅ La tabla aponnt_email_config existe.\n');

        // 2. Ver estructura
        const [columns] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'aponnt_email_config'
            ORDER BY ordinal_position
        `);

        console.log('📋 Estructura de la tabla:');
        console.table(columns);

        // 3. Ver datos existentes
        const [data] = await sequelize.query(`
            SELECT * FROM aponnt_email_config
            ORDER BY id
        `);

        console.log(`\n📊 Registros existentes: ${data.length}\n`);
        if (data.length > 0) {
            console.table(data);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkEmailConfigTable();
