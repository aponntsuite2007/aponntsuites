const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    const client = new Client({
        connectionString: 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Conectando a la base de datos de Render...');
        await client.connect();
        console.log('✅ Conectado exitosamente\n');

        // Ejecutar primera migración (create tables)
        console.log('📋 Ejecutando 20251016_create_final.sql...');
        const createTablesSql = fs.readFileSync(
            path.join(__dirname, 'database/migrations/20251016_create_final.sql'),
            'utf-8'
        );
        await client.query(createTablesSql);
        console.log('✅ Tablas creadas exitosamente\n');

        // Ejecutar segunda migración (insert data)
        console.log('📋 Ejecutando 20251016_insert_notification_system_data.sql...');
        const insertDataSql = fs.readFileSync(
            path.join(__dirname, 'database/migrations/20251016_insert_notification_system_data.sql'),
            'utf-8'
        );
        await client.query(insertDataSql);
        console.log('✅ Datos insertados exitosamente\n');

        console.log('🎉 Migraciones completadas con éxito');

    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Conexión cerrada');
    }
}

runMigrations();
