/**
 * Script para ejecutar migraciones SQL en la base de datos de Render
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// BASE DE PRODUCCIÓN (tiene empresa DEMO)
const RENDER_DB_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com/aponnt_db';

// Migraciones a ejecutar en orden
const MIGRATIONS = [
    '20250120_parametrize_tax_field_names.sql',
    '20250120_enhance_siac_clientes.sql',
    '20250120_create_fiscal_config_tables.sql',
    '20250120_create_siac_productos.sql',
    '20250120_create_siac_presupuestos.sql',
    '20250120_add_afip_fields_to_facturas.sql',
    '20250120_add_company_id_to_facturas.sql',
    '20251208_create_partner_commissions.sql',
    '20251208_data_integrity_constraints.sql'
];

async function runMigrations() {
    const client = new Client({
        connectionString: RENDER_DB_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Conectando a Render PostgreSQL...');
        await client.connect();
        console.log('✅ Conexión establecida\n');

        for (const migrationFile of MIGRATIONS) {
            const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

            if (!fs.existsSync(migrationPath)) {
                console.log(`⚠️  Saltando ${migrationFile} (no existe)`);
                continue;
            }

            console.log(`📄 Ejecutando ${migrationFile}...`);
            const sql = fs.readFileSync(migrationPath, 'utf-8');

            try {
                await client.query(sql);
                console.log(`   ✅ ${migrationFile} ejecutada correctamente\n`);
            } catch (error) {
                if (error.message.includes('ya existe') ||
                    error.message.includes('already exists') ||
                    error.message.includes('duplicate column')) {
                    console.log(`   ⚠️  ${migrationFile} - ya aplicada (saltando)\n`);
                } else {
                    console.error(`   ❌ Error en ${migrationFile}:`, error.message);
                    console.log(`   ⚠️  Continuando con siguiente migración...\n`);
                }
            }
        }

        console.log('\n🎉 Proceso de migraciones completado');

        // Verificar tablas creadas
        console.log('\n📊 Verificando tablas SIAC en Render:');
        const result = await client.query(`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename LIKE '%siac%'
            OR tablename LIKE 'tax_%'
            ORDER BY tablename
        `);

        console.log(`   Total tablas SIAC/Tax: ${result.rows.length}`);
        result.rows.forEach(row => {
            console.log(`   - ${row.tablename}`);
        });

    } catch (error) {
        console.error('❌ Error general:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Conexión cerrada');
    }
}

runMigrations();
