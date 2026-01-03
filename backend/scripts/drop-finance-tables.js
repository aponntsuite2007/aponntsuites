const { Client } = require('pg');
require('dotenv').config();

async function dropFinanceTables() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL\n');

        // Obtener todas las tablas finance
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'finance_%'
            ORDER BY table_name
        `);

        console.log(`📊 Encontradas ${result.rows.length} tablas finance\n`);

        // Eliminar todas
        for (const row of result.rows) {
            await client.query(`DROP TABLE IF EXISTS ${row.table_name} CASCADE`);
            console.log(`✗ ${row.table_name}`);
        }

        console.log('\n✅ Todas las tablas finance eliminadas\n');
        console.log('🔄 Ahora reinicia el servidor para que Sequelize las recree automáticamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

dropFinanceTables();
