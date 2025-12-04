#!/usr/bin/env node
/**
 * Script para ejecutar la migracion de tablas de vacaciones
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function runMigration() {
    console.log('Ejecutando migracion de tablas de vacaciones...\n');

    try {
        const sqlPath = path.join(__dirname, '..', 'migrations', '20251130_create_vacation_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar todo el SQL como una transaccion
        console.log('Ejecutando SQL...');
        await pool.query(sql);
        console.log('OK - Migracion ejecutada\n');

        // Verificar tablas creadas
        const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND (table_name LIKE 'vacation%' OR table_name = 'extraordinary_licenses' OR table_name = 'task_compatibility')
            ORDER BY table_name
        `);

        console.log('Tablas de vacaciones existentes:');
        tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
            console.log('\n(Las tablas ya existen, esto es OK)');
        }
    } finally {
        await pool.end();
    }
}

runMigration();
