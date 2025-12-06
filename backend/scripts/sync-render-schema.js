/**
 * Script para sincronizar esquema de BD en Render (Producción)
 * Ejecutar: node scripts/sync-render-schema.js
 *
 * Este script detecta automáticamente columnas faltantes en la BD de Render
 * y las agrega usando ALTER TABLE ADD COLUMN IF NOT EXISTS
 */

const { Sequelize, QueryTypes } = require('sequelize');

// Configuración de conexión a Render (usar URL EXTERNA, sin el -a)
const RENDER_DATABASE_URL = process.env.DATABASE_URL ||
    'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g.oregon-postgres.render.com:5432/attendance_system_866u?sslmode=require';

// Helper functions
function getSequelizeTypeName(type) {
    if (!type) return 'UNKNOWN';
    return type.key || type.constructor?.key || type.toString();
}

function mapSequelizeToPostgres(sequelizeType) {
    if (!sequelizeType) return 'TEXT';

    const typeName = getSequelizeTypeName(sequelizeType).toUpperCase();

    // Tipos VIRTUAL no se crean en BD
    if (typeName === 'VIRTUAL') return null;

    const mapping = {
        'STRING': 'VARCHAR',
        'TEXT': 'TEXT',
        'INTEGER': 'INTEGER',
        'BIGINT': 'BIGINT',
        'FLOAT': 'REAL',
        'DOUBLE': 'DOUBLE PRECISION',
        'DECIMAL': 'NUMERIC',
        'BOOLEAN': 'BOOLEAN',
        'DATE': 'TIMESTAMP',
        'DATEONLY': 'DATE',
        'UUID': 'UUID',
        'JSONB': 'JSONB',
        'JSON': 'JSON',
        'ARRAY': 'TEXT[]',
        'ENUM': 'VARCHAR',
        'GEOMETRY': 'TEXT',
        'INET': 'VARCHAR(45)',
        'CIDR': 'VARCHAR(50)',
        'MACADDR': 'VARCHAR(17)',
        'BLOB': 'BYTEA',
        'REAL': 'REAL',
        'SMALLINT': 'SMALLINT',
        'TINYINT': 'SMALLINT',
        'MEDIUMINT': 'INTEGER',
        'CITEXT': 'TEXT',
        'HSTORE': 'JSONB',
        'RANGE': 'TEXT'
    };

    return mapping[typeName] || 'TEXT';
}

function generateAddColumnSql(tableName, columnName, attrDef) {
    let pgType = mapSequelizeToPostgres(attrDef.type);

    if (pgType === null) return null; // VIRTUAL type

    // Agregar longitud para VARCHAR
    if (pgType === 'VARCHAR' && attrDef.type?.options?.length) {
        pgType = `VARCHAR(${attrDef.type.options.length})`;
    } else if (pgType === 'VARCHAR') {
        pgType = 'VARCHAR(255)';
    }

    // Agregar precisión para NUMERIC
    if (pgType === 'NUMERIC' && attrDef.type?.options) {
        const { precision = 10, scale = 2 } = attrDef.type.options;
        pgType = `NUMERIC(${precision},${scale})`;
    }

    let sql = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" ${pgType}`;

    // Default value
    if (attrDef.defaultValue !== undefined && attrDef.defaultValue !== null) {
        const defaultVal = formatDefaultValue(attrDef.defaultValue, pgType);
        if (defaultVal !== null) {
            sql += ` DEFAULT ${defaultVal}`;
        }
    }

    return sql;
}

function formatDefaultValue(value, pgType) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'function') {
        if (value.toString().includes('NOW')) return 'NOW()';
        if (value.toString().includes('UUIDV4')) return 'gen_random_uuid()';
        return null;
    }

    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (Array.isArray(value)) return `'${JSON.stringify(value)}'::jsonb`;
    if (typeof value === 'object') return `'${JSON.stringify(value)}'::jsonb`;

    return null;
}

async function main() {
    console.log('🔄 Sincronizando esquema con Render...');
    console.log('📍 Conectando a:', RENDER_DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

    const sequelize = new Sequelize(RENDER_DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: { rejectUnauthorized: false }
        },
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a Render PostgreSQL');

        // Importar modelos locales
        const localSequelize = require('../src/config/database').sequelize;
        const models = localSequelize.models;

        console.log(`📦 Modelos locales cargados: ${Object.keys(models).length}`);

        // Obtener tablas de Render
        const dbTables = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `, { type: QueryTypes.SELECT });

        const dbTableNames = dbTables.map(t => {
            if (typeof t === 'string') return t.toLowerCase();
            if (Array.isArray(t) && t.length > 0) return t[0]?.toLowerCase?.() || null;
            if (t && t.table_name) return t.table_name.toLowerCase();
            return null;
        }).filter(Boolean);

        console.log(`📊 Tablas en Render: ${dbTableNames.length}`);

        let columnsAdded = 0;
        let skipped = 0;
        let errors = 0;

        // Procesar cada modelo
        for (const [modelName, model] of Object.entries(models)) {
            const tableName = model.tableName || model.name;
            const tableNameLower = tableName.toLowerCase();

            if (!dbTableNames.includes(tableNameLower)) {
                // Tabla no existe - skip (la sincronización de tablas es más compleja)
                continue;
            }

            // Obtener columnas existentes en Render
            const dbColumnsResult = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = :tableName AND table_schema = 'public'
            `, { replacements: { tableName: tableNameLower }, type: QueryTypes.SELECT });

            const dbColumnNames = dbColumnsResult.map(c => {
                if (typeof c === 'string') return c.toLowerCase();
                return c?.column_name?.toLowerCase() || null;
            }).filter(Boolean);

            // Procesar atributos del modelo
            const modelAttributes = model.rawAttributes || {};

            for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
                const dbColumnName = attrDef.field || attrName;
                const dbColumnNameLower = dbColumnName.toLowerCase();

                // Saltar VIRTUAL
                const pgType = mapSequelizeToPostgres(attrDef.type);
                if (pgType === null) continue;

                if (!dbColumnNames.includes(dbColumnNameLower)) {
                    const sql = generateAddColumnSql(tableNameLower, dbColumnName, attrDef);

                    if (sql) {
                        try {
                            await sequelize.query(sql);
                            console.log(`  ✅ ${tableNameLower}.${dbColumnName}`);
                            columnsAdded++;
                        } catch (e) {
                            if (e.message.includes('already exists')) {
                                skipped++;
                            } else {
                                console.log(`  ❌ ${tableNameLower}.${dbColumnName}: ${e.message.substring(0, 50)}`);
                                errors++;
                            }
                        }
                    }
                }
            }
        }

        console.log('\n=================================');
        console.log('📊 RESUMEN DE SINCRONIZACIÓN');
        console.log('=================================');
        console.log(`✅ Columnas agregadas: ${columnsAdded}`);
        console.log(`⏭️  Saltadas (ya existen): ${skipped}`);
        console.log(`❌ Errores: ${errors}`);

        // Verificar conteo final de columnas en users (tabla crítica)
        const [userCols] = await sequelize.query(`
            SELECT COUNT(*) as cnt FROM information_schema.columns
            WHERE table_name = 'users' AND table_schema = 'public'
        `);
        console.log(`\n📋 Columnas en tabla 'users': ${userCols[0].cnt}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('\n✅ Conexión cerrada');
    }
}

main();
