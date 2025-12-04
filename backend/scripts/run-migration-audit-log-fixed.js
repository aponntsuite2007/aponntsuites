/**
 * Script para ejecutar la migración de OH-V6-19: Audit Log
 * Usa la misma configuración que server.js para evitar problemas de password
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Usar la misma configuración que server.js
const { Pool } = require('pg');

// Configuración exacta de server.js
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sistema_asistencia_biometrico',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || 'Aedr15150302'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

async function runMigration() {
    console.log('🚀 [OH-V6-19] Ejecutando migración de Audit Log...\n');

    const migrationPath = path.join(__dirname, '../migrations/20250121_create_oh_audit_log.sql');

    try {
        // Leer SQL de migración
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Archivo de migración leído correctamente');
        console.log('📊 Ejecutando SQL...\n');

        // Ejecutar migración
        await pool.query(migrationSQL);

        console.log('✅ Migración completada exitosamente\n');

        // Verificar tabla creada
        const checkTableQuery = `
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'oh_certification_audit_log'
            ORDER BY ordinal_position
        `;

        const result = await pool.query(checkTableQuery);

        console.log('📋 Estructura de la tabla creada:');
        console.log('=====================================');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name.padEnd(25)} : ${row.data_type}`);
        });
        console.log('=====================================\n');

        // Verificar indices
        const checkIndexesQuery = `
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'oh_certification_audit_log'
        `;

        const indexResult = await pool.query(checkIndexesQuery);

        console.log('📊 Índices creados:');
        console.log('=====================================');
        indexResult.rows.forEach(row => {
            console.log(`  ✓ ${row.indexname}`);
        });
        console.log('=====================================\n');

        // Verificar funciones
        const checkFunctionsQuery = `
            SELECT routine_name, routine_type
            FROM information_schema.routines
            WHERE routine_name IN ('get_audit_stats', 'cleanup_old_audit_logs')
            AND routine_schema = 'public'
        `;

        const functionsResult = await pool.query(checkFunctionsQuery);

        console.log('⚙️ Funciones creadas:');
        console.log('=====================================');
        functionsResult.rows.forEach(row => {
            console.log(`  ✓ ${row.routine_name} (${row.routine_type})`);
        });
        console.log('=====================================\n');

        // Verificar vista
        const checkViewQuery = `
            SELECT table_name
            FROM information_schema.views
            WHERE table_name = 'oh_certification_audit_trail'
        `;

        const viewResult = await pool.query(checkViewQuery);

        console.log('👁️ Vistas creadas:');
        console.log('=====================================');
        viewResult.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });
        console.log('=====================================\n');

        console.log('🎉 OH-V6-19: Audit Trail & Activity Log - INSTALADO CORRECTAMENTE\n');

        console.log('📚 Uso básico:');
        console.log('   - Tabla: oh_certification_audit_log');
        console.log('   - Vista: oh_certification_audit_trail');
        console.log('   - Función: get_audit_stats(company_id, days)');
        console.log('   - Función: cleanup_old_audit_logs(days_to_keep)');
        console.log('');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Ejecutar
runMigration();
