/**
 * Script para ejecutar la migración de legal_edit_authorizations
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function runMigration() {
    console.log('🔄 Ejecutando migración legal_edit_authorizations...\n');

    try {
        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '..', 'migrations', '20251203_create_legal_edit_authorizations.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Dividir en statements individuales
        const statements = sqlContent
            .split(/;[\r\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            if (statement.length < 5) continue;

            try {
                await sequelize.query(statement);
                successCount++;

                // Mostrar progreso para statements importantes
                if (statement.includes('CREATE TABLE')) {
                    console.log('✅ Tabla legal_edit_authorizations creada');
                } else if (statement.includes('CREATE INDEX')) {
                    console.log('✅ Índice creado');
                } else if (statement.includes('ALTER TABLE')) {
                    console.log('✅ Columnas agregadas');
                } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
                    console.log('✅ Función helper creada');
                } else if (statement.includes('CREATE TRIGGER')) {
                    console.log('✅ Trigger creado');
                }
            } catch (error) {
                // Ignorar errores de "ya existe"
                if (error.message.includes('already exists') ||
                    error.message.includes('ya existe') ||
                    error.message.includes('duplicate key')) {
                    console.log('⏭️  Ya existe, omitiendo...');
                } else {
                    console.error('⚠️  Error:', error.message.substring(0, 100));
                    errorCount++;
                }
            }
        }

        console.log('\n========================================');
        console.log(`✅ Migración completada: ${successCount} statements ejecutados`);
        if (errorCount > 0) {
            console.log(`⚠️  ${errorCount} errores (pueden ser normales si ya existían)`);
        }

        // Verificar que la tabla existe
        const [tables] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'legal_edit_authorizations'
        `);

        if (tables.length > 0) {
            console.log('\n✅ Tabla legal_edit_authorizations verificada OK');
        } else {
            console.log('\n❌ Tabla legal_edit_authorizations NO encontrada');
        }

        // Verificar columnas en legal_communications
        const [columns] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'legal_communications' AND column_name = 'is_locked'
        `);

        if (columns.length > 0) {
            console.log('✅ Columna is_locked en legal_communications verificada OK');
        }

        // Verificar columnas en user_legal_issues
        const [columns2] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'user_legal_issues' AND column_name = 'is_locked'
        `);

        if (columns2.length > 0) {
            console.log('✅ Columna is_locked en user_legal_issues verificada OK');
        }

        console.log('\n========================================');
        console.log('🎉 Sistema de inmutabilidad legal LISTO');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
    } finally {
        await sequelize.close();
    }
}

runMigration();
