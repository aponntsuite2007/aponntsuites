require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function checkEnum() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado\n');

        const result = await sequelize.query(`
            SELECT unnest(enum_range(NULL::enum_system_modules_category)) AS category
        `, { type: QueryTypes.SELECT });

        console.log('📊 Valores válidos del ENUM category:\n');
        result.forEach(row => {
            console.log(`   - ${row.category}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkEnum();
