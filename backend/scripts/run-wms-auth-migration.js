/**
 * Ejecutar migración de autorizaciones y documentos WMS
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function runMigration() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        const migrationPath = path.join(__dirname, '..', 'migrations', '20251231_wms_authorization_documents.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Ejecutando migración de autorizaciones y documentos WMS...');
        await client.query(sql);

        console.log('✅ Migración completada exitosamente');

        // Verificar tablas creadas
        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'wms_%'
            ORDER BY table_name
        `);

        console.log(`\n📊 Total tablas WMS: ${tables.rows.length}`);

        // Contar nuevas tablas
        const newTables = [
            'wms_authorization_levels',
            'wms_authorization_requests',
            'wms_authorization_history',
            'wms_authorization_delegations',
            'wms_document_types',
            'wms_documents',
            'wms_document_links',
            'wms_digital_signatures',
            'wms_recall_requests',
            'wms_recall_tracking',
            'wms_environmental_config',
            'wms_environmental_logs',
            'wms_cold_chain_incidents',
            'wms_retention_policies',
            'wms_retention_actions'
        ];

        let found = 0;
        for (const t of newTables) {
            const exists = tables.rows.find(r => r.table_name === t);
            console.log(`  ${exists ? '✅' : '❌'} ${t}`);
            if (exists) found++;
        }

        console.log(`\n✅ Nuevas tablas creadas: ${found}/${newTables.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

runMigration();
