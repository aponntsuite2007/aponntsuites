/**
 * Script para crear tabla additional_role_types
 * Ejecutar: node scripts/run-additional-role-types-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de conexión
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function runMigration() {
    console.log('🚀 Iniciando migración de additional_role_types...\n');

    const client = await pool.connect();

    try {
        // Leer archivo SQL
        const sqlPath = path.join(__dirname, '..', 'migrations', '20250130_create_additional_role_types.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Ejecutando SQL de migración...\n');

        // Ejecutar SQL
        await client.query(sql);

        // Verificar creación
        const checkTable = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'additional_role_types'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('✅ Tabla additional_role_types creada exitosamente\n');

            // Mostrar registros insertados
            const count = await client.query('SELECT COUNT(*) FROM additional_role_types');
            console.log(`📊 Roles insertados: ${count.rows[0].count}\n`);

            // Listar roles
            const roles = await client.query(`
                SELECT role_key, role_name, category, icon, color
                FROM additional_role_types
                ORDER BY category, role_name
            `);

            console.log('📋 Roles disponibles:');
            console.log('─'.repeat(80));
            roles.rows.forEach(role => {
                console.log(`   ${role.icon} ${role.role_name} (${role.role_key}) - ${role.category}`);
            });
            console.log('─'.repeat(80));

        } else {
            console.log('❌ Error: La tabla no fue creada');
        }

        console.log('\n✅ Migración completada exitosamente');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\n⚠️ La tabla o el ENUM ya existen. Verificando estado actual...');

            const count = await client.query('SELECT COUNT(*) FROM additional_role_types');
            console.log(`📊 Registros existentes: ${count.rows[0].count}`);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
