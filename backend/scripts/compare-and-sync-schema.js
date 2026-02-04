/**
 * ============================================================================
 * SCRIPT: Comparación de Schema LOCAL vs RENDER + Generación de ALTER TABLE
 * ============================================================================
 *
 * Este script:
 * 1. Se conecta a la BD LOCAL y obtiene TODAS las columnas de TODAS las tablas
 * 2. Se conecta a la BD de RENDER y obtiene lo mismo
 * 3. Compara columna por columna
 * 4. Genera un archivo SQL con ALTER TABLE para agregar columnas faltantes
 *
 * Uso: node scripts/compare-and-sync-schema.js
 *
 * Output: migrations/auto_sync_missing_columns_YYYYMMDD_HHMMSS.sql
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const LOCAL_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
};

// URL externa de Render (obtenida via API)
const RENDER_URL = 'postgresql://aponnt_db_user:G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY@dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com:5432/aponnt_db';

// ============================================================================
// QUERY PARA OBTENER TODAS LAS COLUMNAS
// ============================================================================

const GET_ALL_COLUMNS_QUERY = `
SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    c.udt_name
FROM information_schema.columns c
JOIN information_schema.tables t
    ON c.table_name = t.table_name
    AND c.table_schema = t.table_schema
WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.table_name NOT LIKE 'pg_%'
    AND c.table_name NOT LIKE '_prisma%'
ORDER BY c.table_name, c.ordinal_position
`;

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function buildColumnKey(table, column) {
    return `${table}.${column}`;
}

function mapDataType(col) {
    let type = col.data_type;

    // Mapear tipos especiales
    if (type === 'character varying') {
        return col.character_maximum_length
            ? `VARCHAR(${col.character_maximum_length})`
            : 'VARCHAR(255)';
    }
    if (type === 'character') {
        return col.character_maximum_length
            ? `CHAR(${col.character_maximum_length})`
            : 'CHAR(1)';
    }
    if (type === 'numeric') {
        if (col.numeric_precision && col.numeric_scale) {
            return `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
        }
        return 'NUMERIC';
    }
    if (type === 'integer') return 'INTEGER';
    if (type === 'bigint') return 'BIGINT';
    if (type === 'smallint') return 'SMALLINT';
    if (type === 'boolean') return 'BOOLEAN';
    if (type === 'text') return 'TEXT';
    if (type === 'uuid') return 'UUID';
    if (type === 'jsonb') return 'JSONB';
    if (type === 'json') return 'JSON';
    if (type === 'date') return 'DATE';
    if (type === 'time without time zone') return 'TIME';
    if (type === 'time with time zone') return 'TIMETZ';
    if (type === 'timestamp without time zone') return 'TIMESTAMP';
    if (type === 'timestamp with time zone') return 'TIMESTAMPTZ';
    if (type === 'double precision') return 'DOUBLE PRECISION';
    if (type === 'real') return 'REAL';
    if (type === 'bytea') return 'BYTEA';
    if (type === 'inet') return 'INET';
    if (type === 'ARRAY') {
        // Intentar determinar el tipo del array
        if (col.udt_name === '_text') return 'TEXT[]';
        if (col.udt_name === '_int4') return 'INTEGER[]';
        if (col.udt_name === '_varchar') return 'VARCHAR[]';
        if (col.udt_name === '_jsonb') return 'JSONB[]';
        return 'TEXT[]'; // Default
    }
    if (type === 'USER-DEFINED') {
        // Es un tipo ENUM u otro tipo definido por usuario
        return col.udt_name.toUpperCase();
    }

    return type.toUpperCase();
}

function buildDefaultValue(col) {
    if (!col.column_default) return '';

    let def = col.column_default;

    // Limpiar castings de PostgreSQL
    def = def.replace(/::[\w\s\[\]]+/g, '');

    // No incluir defaults de sequences (seriales)
    if (def.includes('nextval(')) return '';

    return ` DEFAULT ${def}`;
}

function generateAlterTable(table, column, colData) {
    const dataType = mapDataType(colData);
    const nullable = colData.is_nullable === 'YES' ? '' : ' NOT NULL';
    const defaultVal = buildDefaultValue(colData);

    // Para columnas NOT NULL sin default, necesitamos un default temporal
    let sql = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${dataType}`;

    if (nullable === ' NOT NULL' && !defaultVal) {
        // Agregar con default temporal, luego quitarlo si es necesario
        const tempDefault = getTempDefault(dataType);
        sql += ` DEFAULT ${tempDefault}`;
        sql += `;\n-- NOTA: "${table}"."${column}" debería ser NOT NULL, revisar manualmente`;
    } else {
        sql += defaultVal;
        // No agregamos NOT NULL aquí para evitar errores con datos existentes
    }

    return sql + ';';
}

function getTempDefault(dataType) {
    if (dataType.startsWith('VARCHAR') || dataType === 'TEXT') return "''";
    if (dataType.startsWith('CHAR')) return "''";
    if (dataType === 'INTEGER' || dataType === 'BIGINT' || dataType === 'SMALLINT') return '0';
    if (dataType === 'BOOLEAN') return 'false';
    if (dataType === 'NUMERIC' || dataType.startsWith('NUMERIC')) return '0';
    if (dataType === 'DOUBLE PRECISION' || dataType === 'REAL') return '0';
    if (dataType === 'UUID') return 'gen_random_uuid()';
    if (dataType === 'JSONB' || dataType === 'JSON') return "'{}'";
    if (dataType === 'DATE') return 'CURRENT_DATE';
    if (dataType === 'TIMESTAMP' || dataType === 'TIMESTAMPTZ') return 'NOW()';
    if (dataType === 'TIME' || dataType === 'TIMETZ') return "'00:00:00'";
    if (dataType.endsWith('[]')) return "'{}'";
    return 'NULL';
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('═'.repeat(70));
    console.log('🔍 COMPARADOR DE SCHEMA: LOCAL vs RENDER');
    console.log('═'.repeat(70));

    const localClient = new Client(LOCAL_CONFIG);
    const renderClient = new Client({
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Conectar a LOCAL
        console.log('\n📍 Conectando a LOCAL...');
        await localClient.connect();
        console.log('   ✅ Conectado a LOCAL');

        // Conectar a RENDER
        console.log('\n☁️  Conectando a RENDER...');
        await renderClient.connect();
        console.log('   ✅ Conectado a RENDER');

        // Obtener columnas de LOCAL
        console.log('\n📊 Obteniendo schema LOCAL...');
        const localResult = await localClient.query(GET_ALL_COLUMNS_QUERY);
        console.log(`   📋 ${localResult.rows.length} columnas encontradas`);

        // Obtener columnas de RENDER
        console.log('\n📊 Obteniendo schema RENDER...');
        const renderResult = await renderClient.query(GET_ALL_COLUMNS_QUERY);
        console.log(`   📋 ${renderResult.rows.length} columnas encontradas`);

        // Construir mapas
        const localColumns = new Map();
        const localTables = new Set();
        for (const row of localResult.rows) {
            localColumns.set(buildColumnKey(row.table_name, row.column_name), row);
            localTables.add(row.table_name);
        }

        const renderColumns = new Map();
        const renderTables = new Set();
        for (const row of renderResult.rows) {
            renderColumns.set(buildColumnKey(row.table_name, row.column_name), row);
            renderTables.add(row.table_name);
        }

        console.log(`\n📈 LOCAL: ${localTables.size} tablas, ${localColumns.size} columnas`);
        console.log(`📈 RENDER: ${renderTables.size} tablas, ${renderColumns.size} columnas`);

        // ====================================================================
        // ENCONTRAR DIFERENCIAS
        // ====================================================================

        console.log('\n' + '─'.repeat(70));
        console.log('🔎 ANALIZANDO DIFERENCIAS...');
        console.log('─'.repeat(70));

        // Tablas que faltan en RENDER
        const missingTables = [];
        for (const table of localTables) {
            if (!renderTables.has(table)) {
                missingTables.push(table);
            }
        }

        // Columnas que faltan en RENDER (de tablas que SÍ existen)
        const missingColumns = [];
        for (const [key, colData] of localColumns) {
            const table = colData.table_name;
            // Solo si la tabla existe en Render pero la columna no
            if (renderTables.has(table) && !renderColumns.has(key)) {
                missingColumns.push({ key, ...colData });
            }
        }

        // Columnas que sobran en RENDER (existen en Render pero no en Local)
        const extraColumns = [];
        for (const [key, colData] of renderColumns) {
            if (!localColumns.has(key)) {
                extraColumns.push({ key, ...colData });
            }
        }

        // ====================================================================
        // MOSTRAR RESUMEN
        // ====================================================================

        console.log(`\n🔴 TABLAS FALTANTES EN RENDER: ${missingTables.length}`);
        if (missingTables.length > 0 && missingTables.length <= 20) {
            missingTables.forEach(t => console.log(`   - ${t}`));
        } else if (missingTables.length > 20) {
            missingTables.slice(0, 20).forEach(t => console.log(`   - ${t}`));
            console.log(`   ... y ${missingTables.length - 20} más`);
        }

        console.log(`\n🟡 COLUMNAS FALTANTES EN RENDER: ${missingColumns.length}`);

        // Agrupar por tabla
        const columnsByTable = {};
        for (const col of missingColumns) {
            if (!columnsByTable[col.table_name]) {
                columnsByTable[col.table_name] = [];
            }
            columnsByTable[col.table_name].push(col);
        }

        const tableNames = Object.keys(columnsByTable).sort();
        for (const table of tableNames.slice(0, 30)) {
            const cols = columnsByTable[table];
            console.log(`   📦 ${table}: ${cols.map(c => c.column_name).join(', ')}`);
        }
        if (tableNames.length > 30) {
            console.log(`   ... y ${tableNames.length - 30} tablas más`);
        }

        console.log(`\n🟢 COLUMNAS EXTRA EN RENDER (no en local): ${extraColumns.length}`);

        // ====================================================================
        // GENERAR SQL
        // ====================================================================

        if (missingColumns.length === 0 && missingTables.length === 0) {
            console.log('\n✅ ¡Los schemas están sincronizados! No hay nada que hacer.');
            return;
        }

        console.log('\n' + '─'.repeat(70));
        console.log('📝 GENERANDO MIGRACIÓN SQL...');
        console.log('─'.repeat(70));

        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const outputFile = path.join(__dirname, '..', 'migrations', `auto_sync_missing_columns_${timestamp}.sql`);

        let sql = `-- ============================================================================
-- MIGRACIÓN AUTO-GENERADA: Sincronización de Schema LOCAL → RENDER
-- ============================================================================
-- Generado: ${new Date().toISOString()}
-- Columnas faltantes: ${missingColumns.length}
-- Tablas faltantes: ${missingTables.length}
-- ============================================================================

-- IMPORTANTE: Revisar antes de ejecutar en producción
-- Algunas columnas NOT NULL tienen defaults temporales

BEGIN;

`;

        // Primero agregar columnas faltantes (más seguro que crear tablas)
        if (missingColumns.length > 0) {
            sql += `-- ============================================================================
-- PARTE 1: AGREGAR COLUMNAS FALTANTES A TABLAS EXISTENTES
-- ============================================================================

`;
            for (const table of tableNames) {
                sql += `-- Tabla: ${table}\n`;
                for (const col of columnsByTable[table]) {
                    sql += generateAlterTable(table, col.column_name, col) + '\n';
                }
                sql += '\n';
            }
        }

        // Luego crear tablas faltantes (más complejo)
        if (missingTables.length > 0) {
            sql += `-- ============================================================================
-- PARTE 2: TABLAS FALTANTES (requiere revisión manual)
-- ============================================================================
-- NOTA: Las siguientes tablas existen en LOCAL pero no en RENDER.
-- La creación automática de tablas es más compleja (necesita PKs, FKs, índices).
-- Se recomienda exportar estas tablas con pg_dump y ejecutar manualmente.
--
-- Tablas faltantes:
`;
            for (const table of missingTables) {
                sql += `--   - ${table}\n`;
            }
            sql += `
-- Para exportar una tabla específica desde LOCAL:
-- pg_dump -h localhost -U postgres -d attendance_system -t <nombre_tabla> --schema-only > tabla.sql

`;
        }

        sql += `COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
`;

        // Guardar archivo
        fs.writeFileSync(outputFile, sql, 'utf8');
        console.log(`\n✅ Migración generada: ${outputFile}`);
        console.log(`   📊 ${missingColumns.length} ALTER TABLE statements`);

        // También generar un resumen JSON para referencia
        const summaryFile = path.join(__dirname, '..', 'migrations', `schema_diff_${timestamp}.json`);
        const summary = {
            generated: new Date().toISOString(),
            local: {
                tables: localTables.size,
                columns: localColumns.size
            },
            render: {
                tables: renderTables.size,
                columns: renderColumns.size
            },
            differences: {
                missingTables: missingTables,
                missingColumns: missingColumns.map(c => ({
                    table: c.table_name,
                    column: c.column_name,
                    type: mapDataType(c),
                    nullable: c.is_nullable
                })),
                extraColumnsInRender: extraColumns.length
            }
        };
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`✅ Resumen JSON: ${summaryFile}`);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   No se pudo conectar a la base de datos.');
            console.error('   Verifica que PostgreSQL esté corriendo.');
        }
        process.exit(1);
    } finally {
        await localClient.end();
        await renderClient.end();
        console.log('\n🔌 Conexiones cerradas');
    }
}

main();
