/**
 * Database Schema Sync Routes
 * Sistema inteligente de sincronización de esquema BD
 *
 * Detecta diferencias entre modelos Sequelize y BD real,
 * permite sincronizar de forma segura y controlada.
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// ============================================================================
// CONTRASEÑA DE AUTORIZACIÓN - Solo el administrador puede ejecutar estas acciones
// ============================================================================
const DB_ADMIN_PASSWORD = 'Aedr15150302';

/**
 * Middleware de autorización para operaciones de BD
 * Requiere header 'x-db-admin-password' o query param 'adminKey'
 */
const requireDbAdminAuth = (req, res, next) => {
    const providedPassword = req.headers['x-db-admin-password'] || req.query.adminKey || req.body?.adminKey;

    if (!providedPassword) {
        return res.status(401).json({
            success: false,
            error: 'Autorización requerida. Proporcione adminKey.',
            requiresAuth: true
        });
    }

    if (providedPassword !== DB_ADMIN_PASSWORD) {
        console.warn(`⚠️ [DB-SYNC] Intento de acceso con contraseña incorrecta desde ${req.ip}`);
        return res.status(403).json({
            success: false,
            error: 'Contraseña de administrador incorrecta.',
            requiresAuth: true
        });
    }

    console.log(`🔐 [DB-SYNC] Acceso autorizado para operación: ${req.method} ${req.path}`);
    next();
};

// ============================================================================
// GET /api/database/compare-schema
// Compara modelos Sequelize vs esquema real de BD
// ============================================================================
router.get('/compare-schema', requireDbAdminAuth, async (req, res) => {
    try {
        console.log('🔍 [DB-SYNC] Iniciando comparación de esquema...');

        const comparison = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            databaseUrl: process.env.DATABASE_URL ? '***CONFIGURED***' : 'LOCAL',
            models: {},
            missingTables: [],
            missingColumns: [],
            typeMismatches: [],
            extraColumnsInDb: [],
            summary: {
                totalModels: 0,
                totalDbTables: 0,
                missingTables: 0,
                missingColumns: 0,
                typeMismatches: 0,
                syncRequired: false
            }
        };

        // 1. Obtener todos los modelos registrados en Sequelize
        const models = sequelize.models;
        comparison.summary.totalModels = Object.keys(models).length;

        // 2. Obtener todas las tablas reales de la BD
        const [dbTables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        comparison.summary.totalDbTables = dbTables.length;
        const dbTableNames = dbTables.map(t => t.table_name);

        // 3. Para cada modelo, comparar con la BD
        for (const [modelName, model] of Object.entries(models)) {
            const tableName = model.tableName || model.name;

            comparison.models[modelName] = {
                tableName,
                exists: dbTableNames.includes(tableName),
                columns: {},
                missingColumns: [],
                typeMismatches: []
            };

            if (!dbTableNames.includes(tableName)) {
                comparison.missingTables.push({
                    model: modelName,
                    table: tableName
                });
                comparison.summary.missingTables++;
                continue;
            }

            // Obtener columnas del modelo
            const modelAttributes = model.rawAttributes || {};

            // Obtener columnas reales de la BD
            const [dbColumns] = await sequelize.query(`
                SELECT
                    column_name,
                    data_type,
                    udt_name,
                    is_nullable,
                    column_default,
                    character_maximum_length
                FROM information_schema.columns
                WHERE table_name = :tableName
                AND table_schema = 'public'
                ORDER BY ordinal_position
            `, { replacements: { tableName } });

            const dbColumnMap = {};
            dbColumns.forEach(col => {
                dbColumnMap[col.column_name] = col;
            });

            // Comparar cada atributo del modelo con la BD
            for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
                const dbColumnName = attrDef.field || attrName;
                const dbCol = dbColumnMap[dbColumnName];

                if (!dbCol) {
                    // Columna falta en BD
                    comparison.missingColumns.push({
                        model: modelName,
                        table: tableName,
                        column: dbColumnName,
                        sequelizeType: getSequelizeTypeName(attrDef.type),
                        suggestedSql: generateAddColumnSql(tableName, dbColumnName, attrDef)
                    });
                    comparison.models[modelName].missingColumns.push(dbColumnName);
                    comparison.summary.missingColumns++;
                } else {
                    // Columna existe, verificar tipo
                    const expectedType = mapSequelizeToPostgres(attrDef.type);
                    const actualType = normalizeDbType(dbCol);

                    if (!typesAreCompatible(expectedType, actualType)) {
                        comparison.typeMismatches.push({
                            model: modelName,
                            table: tableName,
                            column: dbColumnName,
                            expected: expectedType,
                            actual: actualType,
                            sequelizeType: getSequelizeTypeName(attrDef.type)
                        });
                        comparison.models[modelName].typeMismatches.push({
                            column: dbColumnName,
                            expected: expectedType,
                            actual: actualType
                        });
                        comparison.summary.typeMismatches++;
                    }
                }
            }
        }

        // Determinar si se requiere sincronización
        comparison.summary.syncRequired =
            comparison.summary.missingTables > 0 ||
            comparison.summary.missingColumns > 0;

        console.log(`✅ [DB-SYNC] Comparación completada:`, comparison.summary);

        res.json({
            success: true,
            comparison
        });

    } catch (error) {
        console.error('❌ [DB-SYNC] Error comparando esquema:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// POST /api/database/sync-schema
// Aplica los cambios detectados de forma segura
// ============================================================================
router.post('/sync-schema', requireDbAdminAuth, async (req, res) => {
    const { dryRun = false, onlyTables = [], onlyColumns = [] } = req.body;
    const results = {
        timestamp: new Date().toISOString(),
        dryRun,
        executed: [],
        skipped: [],
        errors: [],
        summary: {
            tablesCreated: 0,
            columnsAdded: 0,
            errors: 0
        }
    };

    try {
        console.log(`🔄 [DB-SYNC] Iniciando sincronización (dryRun=${dryRun})...`);

        // Primero obtener comparación actual
        const models = sequelize.models;

        // Obtener tablas existentes
        const [dbTables] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        const dbTableNames = dbTables.map(t => t.table_name);

        // Procesar cada modelo
        for (const [modelName, model] of Object.entries(models)) {
            const tableName = model.tableName || model.name;

            // Filtrar si se especificaron tablas específicas
            if (onlyTables.length > 0 && !onlyTables.includes(tableName)) {
                continue;
            }

            // Si la tabla no existe, crearla
            if (!dbTableNames.includes(tableName)) {
                const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (id SERIAL PRIMARY KEY)`;

                if (dryRun) {
                    results.executed.push({ type: 'CREATE_TABLE', sql: createSql, dryRun: true });
                } else {
                    try {
                        // Usar sync del modelo para crear tabla completa
                        await model.sync({ force: false });
                        results.executed.push({
                            type: 'CREATE_TABLE',
                            table: tableName,
                            success: true
                        });
                        results.summary.tablesCreated++;
                    } catch (e) {
                        results.errors.push({
                            type: 'CREATE_TABLE',
                            table: tableName,
                            error: e.message
                        });
                        results.summary.errors++;
                    }
                }
                continue;
            }

            // Tabla existe, verificar columnas
            const modelAttributes = model.rawAttributes || {};

            const [dbColumns] = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = :tableName AND table_schema = 'public'
            `, { replacements: { tableName } });
            const dbColumnNames = dbColumns.map(c => c.column_name);

            for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
                const dbColumnName = attrDef.field || attrName;

                // Filtrar si se especificaron columnas específicas
                if (onlyColumns.length > 0 && !onlyColumns.includes(`${tableName}.${dbColumnName}`)) {
                    continue;
                }

                if (!dbColumnNames.includes(dbColumnName)) {
                    const addColumnSql = generateAddColumnSql(tableName, dbColumnName, attrDef);

                    if (dryRun) {
                        results.executed.push({
                            type: 'ADD_COLUMN',
                            table: tableName,
                            column: dbColumnName,
                            sql: addColumnSql,
                            dryRun: true
                        });
                    } else {
                        try {
                            await sequelize.query(addColumnSql);
                            results.executed.push({
                                type: 'ADD_COLUMN',
                                table: tableName,
                                column: dbColumnName,
                                success: true
                            });
                            results.summary.columnsAdded++;
                        } catch (e) {
                            // Si el error es "already exists", ignorar
                            if (e.message.includes('already exists')) {
                                results.skipped.push({
                                    type: 'ADD_COLUMN',
                                    table: tableName,
                                    column: dbColumnName,
                                    reason: 'already exists'
                                });
                            } else {
                                results.errors.push({
                                    type: 'ADD_COLUMN',
                                    table: tableName,
                                    column: dbColumnName,
                                    error: e.message
                                });
                                results.summary.errors++;
                            }
                        }
                    }
                }
            }
        }

        console.log(`✅ [DB-SYNC] Sincronización completada:`, results.summary);

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('❌ [DB-SYNC] Error en sincronización:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            results
        });
    }
});

// ============================================================================
// GET /api/database/tables
// Lista todas las tablas con conteo de filas
// ============================================================================
router.get('/tables', requireDbAdminAuth, async (req, res) => {
    try {
        const [tables] = await sequelize.query(`
            SELECT
                t.table_name,
                (SELECT COUNT(*) FROM information_schema.columns c
                 WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count,
                pg_stat_user_tables.n_live_tup as row_count
            FROM information_schema.tables t
            LEFT JOIN pg_stat_user_tables ON pg_stat_user_tables.relname = t.table_name
            WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name
        `);

        res.json({
            success: true,
            tables,
            count: tables.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// GET /api/database/table/:tableName/columns
// Detalle de columnas de una tabla
// ============================================================================
router.get('/table/:tableName/columns', requireDbAdminAuth, async (req, res) => {
    try {
        const { tableName } = req.params;

        const [columns] = await sequelize.query(`
            SELECT
                column_name,
                data_type,
                udt_name,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns
            WHERE table_name = :tableName
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `, { replacements: { tableName } });

        res.json({
            success: true,
            table: tableName,
            columns,
            count: columns.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/database/execute-sql
// Ejecuta SQL personalizado (solo admin, con precauciones)
// ============================================================================
router.post('/execute-sql', requireDbAdminAuth, async (req, res) => {
    const { sql, confirm = false } = req.body;

    if (!sql) {
        return res.status(400).json({ success: false, error: 'SQL requerido' });
    }

    // Bloquear comandos peligrosos sin confirmación explícita
    const dangerousKeywords = ['DROP', 'TRUNCATE', 'DELETE FROM', 'ALTER TABLE.*DROP'];
    const isDangerous = dangerousKeywords.some(kw =>
        new RegExp(kw, 'i').test(sql)
    );

    if (isDangerous && !confirm) {
        return res.status(400).json({
            success: false,
            error: 'Comando potencialmente destructivo. Envía confirm: true para ejecutar.',
            requiresConfirmation: true
        });
    }

    try {
        const startTime = Date.now();
        const [results] = await sequelize.query(sql);
        const duration = Date.now() - startTime;

        res.json({
            success: true,
            results,
            rowCount: Array.isArray(results) ? results.length : 0,
            duration: `${duration}ms`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSequelizeTypeName(type) {
    if (!type) return 'UNKNOWN';
    return type.key || type.constructor?.key || type.toString();
}

function mapSequelizeToPostgres(sequelizeType) {
    if (!sequelizeType) return 'TEXT';

    const typeName = getSequelizeTypeName(sequelizeType).toUpperCase();

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
        'ARRAY': 'ARRAY',
        'ENUM': 'VARCHAR'
    };

    return mapping[typeName] || 'TEXT';
}

function normalizeDbType(dbColumn) {
    const type = dbColumn.udt_name || dbColumn.data_type;

    const normalization = {
        'int4': 'INTEGER',
        'int8': 'BIGINT',
        'int2': 'SMALLINT',
        'float4': 'REAL',
        'float8': 'DOUBLE PRECISION',
        'bool': 'BOOLEAN',
        'varchar': 'VARCHAR',
        'text': 'TEXT',
        'timestamp': 'TIMESTAMP',
        'timestamptz': 'TIMESTAMP',
        'date': 'DATE',
        'uuid': 'UUID',
        'jsonb': 'JSONB',
        'json': 'JSON',
        'numeric': 'NUMERIC',
        '_text': 'ARRAY',
        '_int4': 'ARRAY',
        '_varchar': 'ARRAY'
    };

    return normalization[type] || type.toUpperCase();
}

function typesAreCompatible(expected, actual) {
    // Normalizar para comparación
    const e = expected.toUpperCase().replace(/\([^)]*\)/g, '');
    const a = actual.toUpperCase().replace(/\([^)]*\)/g, '');

    // Compatibilidades conocidas
    const compatibleTypes = {
        'VARCHAR': ['VARCHAR', 'TEXT', 'CHARACTER VARYING'],
        'TEXT': ['TEXT', 'VARCHAR', 'CHARACTER VARYING'],
        'INTEGER': ['INTEGER', 'INT', 'INT4', 'BIGINT', 'SMALLINT'],
        'BIGINT': ['BIGINT', 'INT8', 'INTEGER'],
        'TIMESTAMP': ['TIMESTAMP', 'TIMESTAMPTZ', 'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP WITHOUT TIME ZONE'],
        'BOOLEAN': ['BOOLEAN', 'BOOL'],
        'NUMERIC': ['NUMERIC', 'DECIMAL'],
        'UUID': ['UUID'],
        'JSONB': ['JSONB', 'JSON'],
        'ARRAY': ['ARRAY', '_TEXT', '_INT4', '_VARCHAR']
    };

    const expectedCompatible = compatibleTypes[e] || [e];
    return expectedCompatible.some(t => a.includes(t) || t.includes(a));
}

function generateAddColumnSql(tableName, columnName, attrDef) {
    let pgType = mapSequelizeToPostgres(attrDef.type);

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
    if (attrDef.defaultValue !== undefined) {
        const defaultVal = formatDefaultValue(attrDef.defaultValue, pgType);
        if (defaultVal !== null) {
            sql += ` DEFAULT ${defaultVal}`;
        }
    }

    // NOT NULL
    if (attrDef.allowNull === false && !attrDef.primaryKey) {
        // Solo agregar NOT NULL si hay default o la tabla está vacía
        // sql += ' NOT NULL';
    }

    return sql;
}

function formatDefaultValue(value, pgType) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'function') {
        // Sequelize.NOW, etc.
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

module.exports = router;
