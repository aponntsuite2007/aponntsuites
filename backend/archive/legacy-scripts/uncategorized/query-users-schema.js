const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
    // RENDER/PRODUCCIÓN
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });
} else {
    // LOCAL
    sequelize = new Sequelize(
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
}

async function getSchema() {
    try {
        console.log('🔍 Consultando esquema de la tabla users...\n');

        const [results] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('📋 Columnas de la tabla users:\n');
        console.log('COLUMN_NAME                 | DATA_TYPE              | NULLABLE');
        console.log('--------------------------- | ---------------------- | --------');

        results.forEach(col => {
            const name = col.column_name.padEnd(27);
            const type = col.data_type.padEnd(22);
            const nullable = col.is_nullable;
            console.log(`${name} | ${type} | ${nullable}`);
        });

        console.log('\n✅ Total columns:', results.length);

        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await sequelize.close();
        process.exit(1);
    }
}

getSchema();
