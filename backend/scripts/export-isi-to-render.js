/**
 * Export ISI company data for Render production
 * Run on Render: node scripts/import-isi-data.js
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

async function exportISI() {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: process.env.DATABASE_URL?.includes('render.com') ? {
            ssl: { require: true, rejectUnauthorized: false }
        } : {}
    });

    try {
        await sequelize.authenticate();
        console.log('Connected to database');

        // Get ISI company
        const [companies] = await sequelize.query(`
            SELECT * FROM companies WHERE id = 11
        `);
        console.log('\n=== COMPANY ===');
        console.log(JSON.stringify(companies[0], null, 2));

        // Get company modules
        const [modules] = await sequelize.query(`
            SELECT * FROM company_modules WHERE company_id = 11
        `);
        console.log('\n=== COMPANY MODULES ===');
        console.log('Total modules:', modules.length);
        console.log(JSON.stringify(modules.slice(0, 5), null, 2));

        // Get users for ISI
        const [users] = await sequelize.query(`
            SELECT id, "firstName", "lastName", email, role, "companyId", username 
            FROM users WHERE "companyId" = 11 LIMIT 10
        `);
        console.log('\n=== USERS (first 10) ===');
        console.log(JSON.stringify(users, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

exportISI();
