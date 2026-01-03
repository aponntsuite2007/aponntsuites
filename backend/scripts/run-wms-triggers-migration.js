/**
 * Script para ejecutar migración de triggers WMS auto-defaults
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

async function runMigration() {
    console.log('🏭 [WMS] Instalando triggers de auto-creación...\n');

    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL\n');

        const sqlPath = path.join(__dirname, '..', 'migrations', '20251231_wms_auto_defaults_triggers.sql');

        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await client.query(sql);
            console.log('✅ Triggers instalados correctamente\n');

            // Verificar triggers creados
            const result = await client.query(`
                SELECT trigger_name, event_object_table, event_manipulation
                FROM information_schema.triggers
                WHERE trigger_name LIKE 'trg_%'
                AND (trigger_name LIKE '%branch%' OR trigger_name LIKE '%warehouse%' OR trigger_name LIKE '%wms%')
                ORDER BY event_object_table
            `);

            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📋 Triggers WMS instalados:');
            console.log('═══════════════════════════════════════════════════════════════');

            result.rows.forEach(row => {
                console.log(`   ✓ ${row.trigger_name}`);
                console.log(`     Tabla: ${row.event_object_table}`);
                console.log(`     Evento: ${row.event_manipulation}\n`);
            });

        } else {
            console.log('❌ Archivo de migración no encontrado:', sqlPath);
            process.exit(1);
        }

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ Configuración completada');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('\n📌 Comportamiento automático:');
        console.log('   1. Al crear empresa → Se crea Sucursal "Central"');
        console.log('   2. Al activar WMS   → Se crea Almacén "Depósito 1"');
        console.log('                        → Se crea Zona "General"');
        console.log('                        → Se crea Ubicación "A-01-01"');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.position) console.error('   Posición:', error.position);
        if (error.detail) console.error('   Detalle:', error.detail);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
