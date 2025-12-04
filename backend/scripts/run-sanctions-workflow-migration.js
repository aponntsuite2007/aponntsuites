/**
 * Script para ejecutar la migración del sistema de workflow de sanciones
 * Ejecutar con: node scripts/run-sanctions-workflow-migration.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sistema_asistencia',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('EJECUTANDO MIGRACIÓN: sanctions_workflow_complete');
    console.log('═══════════════════════════════════════════════════════════════');

    const client = await pool.connect();

    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251203_sanctions_workflow_complete.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Leyendo migración desde:', migrationPath);
        console.log('📊 Tamaño del SQL:', (migrationSQL.length / 1024).toFixed(2), 'KB');

        // Ejecutar migración
        console.log('\n⏳ Ejecutando migración...\n');
        await client.query(migrationSQL);

        // Verificar resultados
        console.log('\n📋 VERIFICANDO RESULTADOS:');
        console.log('─────────────────────────────────────────');

        // Verificar tabla sanction_types
        const typesResult = await client.query(`
            SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_system = true) as system_types
            FROM sanction_types
        `);
        console.log(`✅ sanction_types: ${typesResult.rows[0].total} tipos (${typesResult.rows[0].system_types} del sistema)`);

        // Verificar nuevas columnas en sanctions
        const colsResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'sanctions'
            AND column_name IN ('workflow_status', 'sanction_type_id', 'requester_id', 'lawyer_id', 'hr_confirmation_id', 'suspension_days')
        `);
        console.log(`✅ Nuevas columnas en sanctions: ${colsResult.rows.map(r => r.column_name).join(', ')}`);

        // Verificar tabla sanction_history
        const historyExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'sanction_history'
            ) as exists
        `);
        console.log(`✅ Tabla sanction_history: ${historyExists.rows[0].exists ? 'CREADA' : 'NO EXISTE'}`);

        // Verificar tabla suspension_blocks
        const blocksExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'suspension_blocks'
            ) as exists
        `);
        console.log(`✅ Tabla suspension_blocks: ${blocksExists.rows[0].exists ? 'CREADA' : 'NO EXISTE'}`);

        // Verificar funciones
        const functionsResult = await client.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name IN ('calculate_suspension_end_date', 'is_employee_suspended', 'get_employee_disciplinary_history', 'get_sanction_stats')
        `);
        console.log(`✅ Funciones helper: ${functionsResult.rows.map(r => r.routine_name).join(', ')}`);

        // Mostrar tipos de sanción creados
        console.log('\n📋 TIPOS DE SANCIÓN DISPONIBLES:');
        console.log('─────────────────────────────────────────');
        const typesListResult = await client.query(`
            SELECT code, name, category, default_severity
            FROM sanction_types
            WHERE is_system = true
            ORDER BY sort_order
        `);
        typesListResult.rows.forEach(row => {
            console.log(`  • [${row.code}] ${row.name} (${row.category}, ${row.default_severity})`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('\n❌ ERROR EN MIGRACIÓN:', error.message);
        console.error('Detalle:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
