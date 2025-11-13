const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'attendance_system',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'SoyAdmin2024**',
    logging: false
});

async function checkColumns() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        // Get ALL columns from users table
        const [results] = await sequelize.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
              AND column_name LIKE '%gps%'
               OR column_name LIKE '%outside%'
               OR column_name LIKE '%radius%'
            ORDER BY ordinal_position
        `);

        console.log('\n📊 Columnas GPS/Outside/Radius en tabla users:');
        results.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) = ${col.column_default || 'NULL'}`);
        });

        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkColumns();
