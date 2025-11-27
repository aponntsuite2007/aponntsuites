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
    console.log('Conectado\n');

    // Ver FK de user_salary_config_v2
    const [fks] = await sequelize.query(`
        SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'user_salary_config_v2'
    `);
    console.log('=== FKs de user_salary_config_v2 ===');
    fks.forEach(fk => console.log(`  ${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`));

    // Verificar si existe tabla salary_categories
    const [tables] = await sequelize.query(`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'salary%' ORDER BY table_name`);
    console.log('\n=== Tablas de salarios ===');
    tables.forEach(t => console.log('  - ' + t.table_name));

    // Ver estructura de salary_categories (sin v2)
    const [cols] = await sequelize.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'salary_categories' ORDER BY ordinal_position
    `);
    console.log('\n=== Estructura salary_categories ===');
    cols.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

    await sequelize.close();
}
run();
