/**
 * Script para verificar estructura de labor_agreements_v2 y su relación con payroll_templates
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: false
});

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // 1. Ver estructura de labor_agreements_v2
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'labor_agreements_v2'
            ORDER BY ordinal_position
        `);
        console.log('=== ESTRUCTURA labor_agreements_v2 ===');
        cols.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

        // 2. Ver datos existentes
        const [data] = await sequelize.query('SELECT * FROM labor_agreements_v2 LIMIT 5');
        console.log('\n=== DATOS labor_agreements_v2 ===');
        console.log('Total registros:', data.length);
        if (data.length > 0) {
            data.forEach(d => console.log(JSON.stringify(d, null, 2)));
        } else {
            console.log('(vacía)');
        }

        // 3. Ver FK constraint
        const [fk] = await sequelize.query(`
            SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'payroll_templates' AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'labor_agreement_id'
        `);
        console.log('\n=== FK de payroll_templates.labor_agreement_id ===');
        if (fk.length > 0) {
            fk.forEach(f => console.log(JSON.stringify(f)));
        } else {
            console.log('No hay FK para labor_agreement_id (puede ser nullable)');
        }

        // 4. Ver si labor_agreement_id es nullable en payroll_templates
        const [nullable] = await sequelize.query(`
            SELECT column_name, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'payroll_templates' AND column_name = 'labor_agreement_id'
        `);
        console.log('\n=== Nullable de payroll_templates.labor_agreement_id ===');
        nullable.forEach(n => console.log(JSON.stringify(n)));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

check();
