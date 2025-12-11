/**
 * Run ux_discoveries migration via Node.js
 */

const fs = require('fs').promises;
const path = require('path');
const { Sequelize } = require('sequelize');

async function main() {
    console.log('\n🚀 Ejecutando migración ux_discoveries...');

    try {
        // Database connection
        const dbUser = process.env.POSTGRES_USER || 'postgres';
        const dbPassword = process.env.POSTGRES_PASSWORD || 'Aedr15150302';
        const dbHost = process.env.POSTGRES_HOST || 'localhost';
        const dbPort = process.env.POSTGRES_PORT || '5432';
        const dbName = process.env.POSTGRES_DB || 'attendance_system';
        const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

        const sequelize = new Sequelize(process.env.DATABASE_URL || connectionString, {
            dialect: 'postgres',
            logging: false
        });

        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        // Read migration file
        const migrationPath = path.join(__dirname, '../migrations/20251210_create_ux_discoveries.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');

        // Execute migration
        console.log('📝 Ejecutando SQL...');
        await sequelize.query(migrationSQL);

        console.log('✅ Migración completada exitosamente!');
        console.log('   - Tabla ux_discoveries creada');
        console.log('   - Índices creados');
        console.log('   - Funciones PostgreSQL creadas');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
