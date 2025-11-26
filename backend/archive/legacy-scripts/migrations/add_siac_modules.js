const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function addSiacModules() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL database');

        // Read the SQL file
        const sqlContent = fs.readFileSync(path.join(__dirname, 'add_siac_modules.sql'), 'utf8');

        // Execute the SQL
        const result = await client.query(sqlContent);
        console.log('✅ SIAC modules added successfully');
        console.log('Affected rows:', result.rowCount);

    } catch (error) {
        console.error('❌ Error adding SIAC modules:', error);
    } finally {
        await client.end();
    }
}

addSiacModules();