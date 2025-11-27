/**
 * Script para verificar tipos de columnas en tablas payroll
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    logging: false
});

async function run() {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL\n');

    // Verificar tipos de columnas críticas
    const [cols] = await sequelize.query(`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name IN ('company_branches', 'payroll_templates', 'users', 'user_salary_config_v2', 'companies')
        AND column_name IN ('id', 'branch_id', 'user_id', 'company_id')
        ORDER BY table_name, column_name
    `);

    console.log('=== TIPOS DE COLUMNAS CRÍTICAS ===\n');
    cols.forEach(c => console.log(`${c.table_name}.${c.column_name}: ${c.data_type} (${c.udt_name})`));

    // También verificar FKs de user_salary_config_v2
    const [fks] = await sequelize.query(`
        SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('user_salary_config_v2', 'payroll_templates', 'company_branches')
    `);

    console.log('\n=== FOREIGN KEYS ===\n');
    fks.forEach(fk => console.log(`${fk.constraint_name}: ${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`));

    await sequelize.close();
}
run();
