/**
 * Script para ejecutar la migración de Retail Analytics
 * Ejecuta el SQL completo sin dividir
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system'
});

async function runMigration(migrationFile) {
    console.log(`\n📊 Ejecutando migración: ${path.basename(migrationFile)}`);

    const sql = fs.readFileSync(migrationFile, 'utf8');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ Migración completada exitosamente`);
        return true;
    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '42P07' || error.message.includes('already exists')) {
            console.log(`⚠️ Algunos objetos ya existían - intentando sin transacción...`);

            // Try running directly without transaction
            try {
                await pool.query(sql);
                console.log(`✅ Migración completada (modo idempotente)`);
                return true;
            } catch (retryError) {
                console.log(`❌ Error: ${retryError.message}`);
                console.log(`   Position: ${retryError.position || 'N/A'}`);
                return false;
            }
        } else {
            console.log(`❌ Error: ${error.message}`);
            console.log(`   Position: ${error.position || 'N/A'}`);
            console.log(`   Code: ${error.code}`);
            return false;
        }
    } finally {
        client.release();
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RETAIL ANALYTICS - MIGRATION RUNNER v3');
    console.log('═══════════════════════════════════════════════════════════');

    const migrationsDir = path.join(__dirname, '..', 'migrations');

    const migrations = [
        '20251231_retail_analytics_core_tables.sql'
    ];

    try {
        const testResult = await pool.query('SELECT NOW()');
        console.log(`✅ Conexión establecida: ${testResult.rows[0].now}`);

        for (const migration of migrations) {
            const migrationPath = path.join(migrationsDir, migration);
            if (fs.existsSync(migrationPath)) {
                await runMigration(migrationPath);
            } else {
                console.log(`⚠️ Archivo no encontrado: ${migration}`);
            }
        }

        // Verify tables
        console.log('\n📋 Verificando tablas creadas...');
        const tablesResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'retail_%'
            ORDER BY table_name
        `);

        console.log(`\n✅ Tablas retail encontradas: ${tablesResult.rows.length}`);
        tablesResult.rows.forEach(row => {
            console.log(`   📦 ${row.table_name}`);
        });

        // Verify new columns in wms_products
        const columnsResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'wms_products'
            AND column_name IN ('gondola_section', 'reorder_point', 'abc_class', 'xyz_class', 'avg_daily_sales')
            ORDER BY column_name
        `);

        console.log(`\n✅ Columnas añadidas a wms_products: ${columnsResult.rows.length}`);
        columnsResult.rows.forEach(row => {
            console.log(`   📊 ${row.column_name}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ PROCESO COMPLETADO');
        console.log('═══════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('\n❌ Error fatal:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
