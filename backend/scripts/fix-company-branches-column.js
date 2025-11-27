const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    logging: false
});

async function fix() {
    try {
        // Agregar la columna faltante
        await sequelize.query(`
            ALTER TABLE company_branches
            ADD COLUMN IF NOT EXISTS default_template_id INTEGER
            REFERENCES payroll_templates(id) ON DELETE SET NULL
        `);
        console.log('✅ Columna default_template_id agregada a company_branches');

        // Verificar la estructura
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'company_branches'
            ORDER BY ordinal_position
        `);
        console.log('\nColumnas de company_branches:');
        cols.forEach(c => console.log('  -', c.column_name, '(' + c.data_type + ')'));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await sequelize.close();
    }
}
fix();
