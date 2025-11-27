/**
 * Check user_salary_config_v2 structure and required columns
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

        // Get columns that are NOT NULL
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'user_salary_config_v2'
            AND is_nullable = 'NO'
            ORDER BY ordinal_position
        `);

        console.log('=== Columnas NOT NULL en user_salary_config_v2 ===');
        cols.forEach(c => {
            console.log(`  ${c.column_name} (${c.data_type}) - default: ${c.column_default || 'NONE'}`);
        });

        // Get an example record
        const [sample] = await sequelize.query(`
            SELECT * FROM user_salary_config_v2 LIMIT 1
        `);

        if (sample.length > 0) {
            console.log('\n=== Ejemplo de registro existente ===');
            console.log(JSON.stringify(sample[0], null, 2));
        } else {
            console.log('\n=== No hay registros existentes ===');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

check();
