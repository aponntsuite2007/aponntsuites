/**
 * Sincroniza la base de datos de Render con la local
 * Ejecuta la migración de ux_discoveries en Render
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Credenciales de PostgreSQL en Render
const RENDER_DB_CONFIG = {
    host: process.env.RENDER_DB_HOST || 'dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com',
    port: process.env.RENDER_DB_PORT || 5432,
    database: process.env.RENDER_DB_NAME || 'aponnt_db',
    user: process.env.RENDER_DB_USER || 'aponnt_db_user',
    password: process.env.RENDER_DB_PASSWORD || 'G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY',
    ssl: {
        rejectUnauthorized: false
    }
};

async function syncDatabase() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  SINCRONIZACIÓN DE BASE DE DATOS - LOCAL → RENDER        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const client = new Client(RENDER_DB_CONFIG);

    try {
        // 1. CONECTAR A RENDER DB
        console.log('🔌 Conectando a PostgreSQL de Render...');
        console.log(`   Host: ${RENDER_DB_CONFIG.host}`);
        console.log(`   Database: ${RENDER_DB_CONFIG.database}\n`);

        await client.connect();
        console.log('✅ Conexión establecida\n');

        // 2. VERIFICAR SI ux_discoveries YA EXISTE
        console.log('🔍 Verificando si tabla ux_discoveries existe...');

        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'ux_discoveries'
            );
        `;

        const tableExists = await client.query(checkTableQuery);
        const exists = tableExists.rows[0].exists;

        if (exists) {
            console.log('   ✅ Tabla ux_discoveries ya existe\n');

            // Obtener estadísticas de la tabla
            const statsQuery = `
                SELECT
                    COUNT(*) as total_discoveries,
                    COUNT(DISTINCT module_key) as total_modules,
                    COUNT(CASE WHEN validation_status = 'validated' THEN 1 END) as validated_count
                FROM ux_discoveries;
            `;

            const stats = await client.query(statsQuery);
            const { total_discoveries, total_modules, validated_count } = stats.rows[0];

            console.log('📊 Estadísticas actuales en Render:');
            console.log(`   - Total discoveries: ${total_discoveries}`);
            console.log(`   - Módulos con discoveries: ${total_modules}`);
            console.log(`   - Discoveries validados: ${validated_count}\n`);

        } else {
            console.log('   ⚠️  Tabla ux_discoveries NO existe, ejecutando migración...\n');

            // 3. LEER MIGRACIÓN
            const migrationPath = path.join(__dirname, '../migrations/20251210_create_ux_discoveries.sql');
            console.log(`📄 Leyendo migración: ${path.basename(migrationPath)}\n`);

            const migrationSQL = await fs.readFile(migrationPath, 'utf8');

            // 4. EJECUTAR MIGRACIÓN
            console.log('⚙️  Ejecutando migración en Render...\n');

            try {
                await client.query(migrationSQL);
                console.log('✅ Migración ejecutada exitosamente\n');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log('✅ Tabla ya existía (migración ya ejecutada)\n');
                } else {
                    throw error;
                }
            }
        }

        // 5. VERIFICAR ESTRUCTURA DE LA TABLA
        console.log('🔍 Verificando estructura de ux_discoveries...\n');

        const structureQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'ux_discoveries'
            ORDER BY ordinal_position;
        `;

        const structure = await client.query(structureQuery);

        console.log('📋 Columnas en ux_discoveries:');
        structure.rows.forEach((col, idx) => {
            console.log(`   ${idx + 1}. ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        console.log('');

        // 6. VERIFICAR ÍNDICES
        console.log('🔍 Verificando índices...\n');

        const indexQuery = `
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'ux_discoveries';
        `;

        const indexes = await client.query(indexQuery);

        console.log('📋 Índices en ux_discoveries:');
        indexes.rows.forEach((idx, i) => {
            console.log(`   ${i + 1}. ${idx.indexname}`);
        });
        console.log('');

        // 7. RESUMEN FINAL
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  SINCRONIZACIÓN COMPLETADA                                ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log('║  ✅ Base de datos de Render sincronizada                  ║');
        console.log('║  ✅ Tabla ux_discoveries lista                            ║');
        console.log(`║  ✅ ${structure.rows.length} columnas verificadas`);
        console.log(`║  ✅ ${indexes.rows.length} índices verificados`);
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        console.log('🎉 Sistema de Bidirectional Feedback Loop listo en Render\n');

        await client.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR en sincronización de BD:', error.message);
        console.error(error.stack);

        try {
            await client.end();
        } catch (e) {
            // Ignorar errores al cerrar
        }

        process.exit(1);
    }
}

// Ejecutar sincronización
syncDatabase();
