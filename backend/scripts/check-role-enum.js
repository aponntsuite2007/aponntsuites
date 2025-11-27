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
    const [enums] = await sequelize.query(`
        SELECT enumlabel FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')
    `);
    console.log('Valores válidos para role:');
    enums.forEach(e => console.log('  - ' + e.enumlabel));

    // Also check existing Juan to see his role
    const [juan] = await sequelize.query(`SELECT role FROM users WHERE "firstName" = 'Juan' AND "lastName" = 'Pérez' LIMIT 1`);
    if (juan.length > 0) console.log('\nJuan Pérez role:', juan[0].role);

    await sequelize.close();
}
check();
