/**
 * Script para ejecutar migración de hierarchy_level en organizational_positions
 * Esta migración agrega las columnas necesarias para el organigrama jerárquico
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Ejecutando migración de jerarquía organizacional...\n');

        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '../migrations/20251209_organizational_hierarchy_tree.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Ejecutar migración
        await client.query(migrationSQL);

        console.log('✅ Migración ejecutada exitosamente!\n');

        // Verificar columnas agregadas
        const { rows: columns } = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'organizational_positions'
            AND column_name IN ('hierarchy_level', 'branch_code', 'branch_order', 'full_path',
                               'is_escalation_point', 'can_approve_permissions', 'max_approval_days', 'color_hex')
            ORDER BY column_name;
        `);

        console.log('📋 Columnas verificadas en organizational_positions:');
        columns.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
        });

        // Contar posiciones
        const { rows: [count] } = await client.query(`
            SELECT COUNT(*) as total FROM organizational_positions;
        `);
        console.log(`\n📊 Total de posiciones en la tabla: ${count.total}`);

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);

        // Si el error es por columna que ya existe, mostrar mensaje más amigable
        if (error.message.includes('already exists')) {
            console.log('\n💡 Las columnas ya existían, la migración no era necesaria.');
        }

        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
    .then(() => {
        console.log('\n🎉 Proceso completado!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n💥 Proceso fallido:', err.message);
        process.exit(1);
    });
