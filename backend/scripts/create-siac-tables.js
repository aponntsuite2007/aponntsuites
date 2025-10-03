/**
 * Script para crear tablas SIAC en PostgreSQL
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar configuración de base de datos
const { Sequelize } = require('sequelize');

// Configurar conexión a PostgreSQL
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: console.log
    }
);

async function createSiacTables() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conexión establecida');

        // Leer archivo SQL
        const sqlFile = path.join(__dirname, '../sql/001_create_siac_tables.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        console.log('🔄 Ejecutando script SQL para tablas SIAC...');

        // Dividir el SQL en statements individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await sequelize.query(statement);
                    console.log('✅ Ejecutado:', statement.substring(0, 50) + '...');
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log('⚠️ Ya existe:', statement.substring(0, 50) + '...');
                    } else {
                        console.error('❌ Error:', error.message);
                        console.error('Statement:', statement);
                    }
                }
            }
        }

        console.log('✅ Tablas SIAC creadas exitosamente');

        // Verificar que las tablas se crearon
        const [results] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'siac_%'
            ORDER BY table_name;
        `);

        console.log('📋 Tablas SIAC creadas:');
        results.forEach(table => {
            console.log(`   ✓ ${table.table_name}`);
        });

    } catch (error) {
        console.error('❌ Error creando tablas SIAC:', error);
    } finally {
        await sequelize.close();
        console.log('🔒 Conexión cerrada');
    }
}

// Ejecutar script
createSiacTables();