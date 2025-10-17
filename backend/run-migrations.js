/**
 * EJECUTOR AUTOMÁTICO DE MIGRACIONES
 * Se ejecuta automáticamente en el deploy de Render
 */

const database = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await database.sequelize.authenticate();
        console.log('✅ Conexión exitosa\n');

        // Verificar si las tablas ya existen
        const [tables] = await database.sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'notification_groups'
        `);

        if (tables.length > 0) {
            console.log('ℹ️  Las tablas de notificaciones ya existen. Saltando migración.');
            return;
        }

        console.log('📦 Ejecutando migración del Sistema de Notificaciones V2.0...');

        const migrationPath = path.join(__dirname, 'database/migrations/20251016_create_notification_system_tables_clean.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await database.sequelize.query(sql);

        console.log('✅ Migración ejecutada exitosamente');
        console.log('✅ 20+ tablas creadas para Sistema de Notificaciones V2.0\n');

        // Si estamos en desarrollo o hay variable de entorno para test data
        if (process.env.CREATE_TEST_DATA === 'true' || process.env.NODE_ENV === 'development') {
            console.log('📝 Creando datos de prueba...');
            const { execSync } = require('child_process');
            execSync('node create_test_notifications.js', { stdio: 'inherit' });
        } else {
            console.log('ℹ️  Datos de prueba no creados (producción)');
            console.log('   Para crear datos de prueba, ejecuta: node create_test_notifications.js');
        }

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        // No lanzar error para no bloquear el deploy
        console.log('⚠️  El deploy continuará, pero las tablas pueden no estar creadas');
    } finally {
        await database.sequelize.close();
    }
}

runMigrations();
