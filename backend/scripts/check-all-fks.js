/**
 * Script para verificar todas las FKs relacionadas con labor_agreement
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

        // Buscar todas las FK que referencien labor_agreement
        const [fks] = await sequelize.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND (kcu.column_name LIKE '%labor%' OR ccu.table_name LIKE '%labor%')
        `);

        console.log('=== FKs relacionadas con labor_agreement ===');
        fks.forEach(f => {
            console.log(`  ${f.table_name}.${f.column_name} → ${f.foreign_table_name}`);
        });

        // Verificar user_salary_config_v2
        const [userSalaryFks] = await sequelize.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'user_salary_config_v2' AND tc.constraint_type = 'FOREIGN KEY'
        `);

        console.log('\n=== FKs de user_salary_config_v2 ===');
        userSalaryFks.forEach(f => {
            console.log(`  ${f.column_name} → ${f.foreign_table_name}`);
        });

        // Verificar salary_categories
        const [salCatFks] = await sequelize.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'salary_categories' AND tc.constraint_type = 'FOREIGN KEY'
        `);

        console.log('\n=== FKs de salary_categories ===');
        if (salCatFks.length === 0) {
            console.log('  (no tiene FKs definidas)');
        } else {
            salCatFks.forEach(f => {
                console.log(`  ${f.column_name} → ${f.foreign_table_name}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

check();
