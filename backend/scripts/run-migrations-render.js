/**
 * Ejecutar migraciones pendientes en RENDER
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db?sslmode=require';

// Migraciones a ejecutar (en orden)
const MIGRATIONS = [
    '20260201_rationalize_commercial_modules.sql',
    '20260201_add_system_user_fields.sql',
    '20260201_create_notifications_enterprise_view.sql',
    '20260201_enhance_marketing_leads.sql',
    '20260202_add_bcc_to_email_configs.sql',
    '20260202_manual_company_status_control.sql',
    '20260202_sync_quotes_table.sql',
    '20260203_fix_create_core_user_function.sql',
    '20260203_unique_usuario_and_improved_core_user.sql'
];

async function run() {
    const client = new Client({
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  EJECUTANDO MIGRACIONES EN RENDER');
    console.log('══════════════════════════════════════════════════════════════\n');

    try {
        await client.connect();
        console.log('✅ Conectado a RENDER\n');

        for (const migration of MIGRATIONS) {
            const filePath = path.join(__dirname, '..', 'migrations', migration);

            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  Archivo no encontrado: ${migration}`);
                continue;
            }

            console.log(`📄 Ejecutando: ${migration}`);

            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await client.query(sql);
                console.log(`   ✅ OK\n`);
            } catch (err) {
                // Si el error es "already exists", continuar
                if (err.message.includes('already exists') || err.message.includes('ya existe')) {
                    console.log(`   ⚠️  Ya existe (ignorado)\n`);
                } else {
                    console.log(`   ❌ Error: ${err.message}\n`);
                }
            }
        }

        console.log('══════════════════════════════════════════════════════════════');
        console.log('  MIGRACIONES COMPLETADAS');
        console.log('══════════════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('❌ Error de conexión:', err.message);
    } finally {
        await client.end();
    }
}

run();
