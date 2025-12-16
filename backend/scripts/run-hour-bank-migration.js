/**
 * Script para ejecutar la migración del sistema de Banco de Horas
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🏦 Iniciando migración del Sistema de Banco de Horas...');

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'attendance_system',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Aedr15150302'
    });

    try {
        const client = await pool.connect();
        console.log('✅ Conectado a PostgreSQL');

        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '../migrations/20251215_hour_bank_complete_system.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Archivo de migración cargado');
        console.log('⏳ Ejecutando migración (puede tardar unos segundos)...');

        // Ejecutar migración
        await client.query(sql);

        console.log('✅ Migración ejecutada exitosamente');

        // Verificar tablas creadas
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name LIKE 'hour_bank%'
            ORDER BY table_name
        `);

        console.log('\n📊 Tablas creadas:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Verificar funciones
        const funcs = await client.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
              AND routine_name LIKE '%hour_bank%'
            ORDER BY routine_name
        `);

        if (funcs.rows.length > 0) {
            console.log('\n🔧 Funciones creadas:');
            funcs.rows.forEach(row => {
                console.log(`   ✓ ${row.routine_name}`);
            });
        }

        client.release();
        console.log('\n🎉 Migración completada exitosamente!');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        if (error.position) {
            console.error('   Posición:', error.position);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
