/**
 * Script para ejecutar la migración de Employee 360°
 * Crea todas las tablas necesarias para el módulo
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

async function runMigration() {
    // Usar configuración local si no hay DATABASE_URL
    const config = process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        }
        : {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'attendance_system',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
        };

    const pool = new Pool(config);

    try {
        console.log('🚀 Iniciando migración Employee 360°...\n');
        console.log('📦 Conectando a:', process.env.DATABASE_URL ? 'Render' : 'PostgreSQL Local');

        const client = await pool.connect();

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '..', 'migrations', '20251126_employee360_complete_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar el SQL completo
        console.log('📦 Ejecutando script de migración...\n');
        await client.query(sql);

        // Verificar que las tablas se crearon
        const checkTablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('trainings', 'training_assignments', 'sanctions', 'vacation_requests', 'medical_certificates')
            ORDER BY table_name;
        `;

        const result = await client.query(checkTablesQuery);

        console.log('✅ Tablas creadas/verificadas:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Verificar la vista
        const checkViewQuery = `
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'public'
            AND table_name = 'v_attendances_360';
        `;

        const viewResult = await client.query(checkViewQuery);
        if (viewResult.rows.length > 0) {
            console.log('   - v_attendances_360 (vista)');
        }

        // Verificar columna company_id en attendances
        const checkColumnQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'attendances'
            AND column_name = 'company_id';
        `;

        const columnResult = await client.query(checkColumnQuery);
        if (columnResult.rows.length > 0) {
            console.log('   - attendances.company_id (columna agregada)');
        }

        // Contar registros en trainings
        const countQuery = `SELECT COUNT(*) as count FROM trainings WHERE company_id = 11;`;
        const countResult = await client.query(countQuery);
        console.log(`\n📊 Capacitaciones de ejemplo para ISI: ${countResult.rows[0].count}`);

        client.release();

        console.log('\n✅ Migración completada exitosamente!\n');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);

        // Si el error es por tabla existente, no es crítico
        if (error.message.includes('already exists')) {
            console.log('\n⚠️  Algunas tablas ya existían, continuando...');
        } else {
            throw error;
        }
    } finally {
        await pool.end();
    }
}

runMigration().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
