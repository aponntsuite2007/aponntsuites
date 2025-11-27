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

async function find() {
    const [users] = await sequelize.query(`
        SELECT user_id, "employeeId", "firstName", "lastName", role, position
        FROM users
        WHERE company_id = 11 AND is_active = true
        ORDER BY "firstName"
        LIMIT 10
    `);
    console.log('Usuarios ISI existentes:');
    users.forEach((u, i) => {
        console.log(`${i+1}. ${u.firstName} ${u.lastName} (${u.employeeId}) - ${u.role} - ${u.position || 'sin posición'}`);
        console.log(`   ID: ${u.user_id}`);
    });
    await sequelize.close();
}
find();
