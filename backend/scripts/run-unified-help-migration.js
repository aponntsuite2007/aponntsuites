/**
 * Script para ejecutar la migración del Sistema de Ayuda Unificado
 * Ejecutar: node scripts/run-unified-help-migration.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Ejecutando migración del Sistema de Ayuda Unificado...\n');

        // Leer el archivo SQL
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251207_unified_help_system.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Ejecutar la migración
        await client.query(sql);

        console.log('✅ Migración ejecutada exitosamente\n');

        // Verificar las tablas creadas
        console.log('📊 Verificando tablas creadas...\n');

        // Verificar columnas en support_tickets
        const ticketColumns = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'support_tickets'
            AND column_name IN ('thread_id', 'notification_id', 'rating', 'feedback', 'closed_at')
        `);

        console.log('📋 Columnas agregadas a support_tickets:');
        ticketColumns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });

        // Verificar unified_help_interactions
        const helpInteractions = await client.query(`
            SELECT COUNT(*) as count FROM information_schema.tables
            WHERE table_name = 'unified_help_interactions'
        `);
        console.log(`\n📋 Tabla unified_help_interactions: ${helpInteractions.rows[0].count > 0 ? '✅ Creada' : '❌ No existe'}`);

        // Verificar contextual_help
        const contextualHelp = await client.query(`
            SELECT COUNT(*) as count FROM contextual_help
        `);
        console.log(`📋 Tabla contextual_help: ✅ Creada con ${contextualHelp.rows[0].count} registros`);

        // Verificar vista
        const view = await client.query(`
            SELECT COUNT(*) as count FROM information_schema.views
            WHERE table_name = 'unified_help_stats'
        `);
        console.log(`📋 Vista unified_help_stats: ${view.rows[0].count > 0 ? '✅ Creada' : '❌ No existe'}`);

        console.log('\n🎉 Sistema de Ayuda Unificado listo para usar!');
        console.log('\n📚 Endpoints disponibles:');
        console.log('   POST /api/v1/help/ask           - Preguntar a la IA');
        console.log('   POST /api/v1/help/ticket        - Crear ticket de soporte');
        console.log('   GET  /api/v1/help/tickets       - Ver mis tickets');
        console.log('   GET  /api/v1/help/module/:key   - Ayuda contextual');
        console.log('   GET  /api/v1/help/health        - Estado del sistema');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);

        if (error.message.includes('does not exist')) {
            console.log('\n💡 Puede que algunas tablas referenciadas no existan.');
            console.log('   Verifica que notification_threads y companies existan.');
        }

        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
