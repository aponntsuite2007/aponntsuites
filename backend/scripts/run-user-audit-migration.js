/**
 * Script para ejecutar la migración de user_audit_logs
 *
 * Uso: node scripts/run-user-audit-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN: user_audit_logs - Sistema de Auditoría de Usuarios ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const pool = new Pool({
        host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
        user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.POSTGRES_DB || process.env.DB_NAME || 'attendance_system'
    });

    try {
        // Verificar si la tabla ya existe
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'user_audit_logs'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('ℹ️  La tabla user_audit_logs ya existe');

            // Verificar cantidad de registros
            const count = await pool.query('SELECT COUNT(*) FROM user_audit_logs');
            console.log(`   Registros actuales: ${count.rows[0].count}`);

            await pool.end();
            return;
        }

        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20250125_create_user_audit_logs.sql');

        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Archivo de migración no encontrado:', migrationPath);
            await pool.end();
            process.exit(1);
        }

        console.log('📄 Leyendo migración:', migrationPath);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🔄 Ejecutando migración...\n');
        await pool.query(migrationSQL);

        console.log('✅ Migración ejecutada exitosamente\n');

        // Verificar tabla creada
        const verifyTable = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'user_audit_logs'
            ORDER BY ordinal_position;
        `);

        console.log('📊 Columnas de la tabla user_audit_logs:');
        verifyTable.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });

        // Verificar funciones creadas
        const verifyFunctions = await pool.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_name IN ('log_user_change', 'get_user_audit_history', 'get_user_audit_stats')
            AND routine_type = 'FUNCTION';
        `);

        console.log('\n📋 Funciones PostgreSQL creadas:');
        verifyFunctions.rows.forEach(fn => {
            console.log(`   ✅ ${fn.routine_name}()`);
        });

        console.log('\n✅ Sistema de Auditoría de Usuarios listo para usar');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        if (error.detail) console.error('   Detalle:', error.detail);
    } finally {
        await pool.end();
    }
}

runMigration();
