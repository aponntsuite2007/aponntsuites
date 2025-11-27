/**
 * Script para analizar TODAS las tablas y generar datos para engineering-metadata
 * También ejecuta la migración de propagación automática
 */
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    logging: false
});

const CORE_TABLES = [
    'users',
    'departments',
    'shifts',
    'attendance',
    'companies',
    'company_branches',
    'kiosks',
    'payroll_templates',
    'payroll_template_concepts',
    'payroll_concept_types',
    'payroll_countries',
    'payroll_runs',
    'payroll_run_details',
    'labor_agreements_v2',
    'labor_agreements_catalog',
    'salary_categories',
    'salary_categories_v2',
    'user_salary_config_v2',
    'user_salary_config',
    'vacations',
    'sanctions',
    'art_claims',
    'training_sessions',
    'documents',
    'medical_records'
];

async function getTableSchema(tableName) {
    const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
    `, { bind: [tableName] });

    return columns;
}

async function getForeignKeys(tableName) {
    const [fks] = await sequelize.query(`
        SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table,
            ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
    `, { bind: [tableName] });

    return fks;
}

async function analyzeAllTables() {
    const results = {};

    for (const table of CORE_TABLES) {
        const columns = await getTableSchema(table);
        const fks = await getForeignKeys(table);

        if (columns.length > 0) {
            results[table] = {
                columnCount: columns.length,
                columns: columns.map(c => ({
                    name: c.column_name,
                    type: c.data_type,
                    nullable: c.is_nullable === 'YES',
                    hasDefault: c.column_default !== null
                })),
                foreignKeys: fks.map(fk => ({
                    column: fk.column_name,
                    references: `${fk.foreign_table}.${fk.foreign_column}`
                }))
            };
        }
    }

    return results;
}

async function runMigration() {
    console.log('\n📋 Ejecutando migración de propagación automática...');

    try {
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251127_payroll_auto_propagation.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await sequelize.query(sql);
        console.log('✅ Migración ejecutada exitosamente\n');
        return true;
    } catch (error) {
        console.error('⚠️ Error en migración:', error.message);
        // Continuar aunque falle (puede ser que ya existan los objetos)
        return false;
    }
}

async function generateEngineeringMetadataUpdate(schemas) {
    // Generar estructura para engineering-metadata.js
    const dbTables = {};

    for (const [tableName, schema] of Object.entries(schemas)) {
        dbTables[tableName] = {
            columns: schema.columns.map(c => c.name),
            columnCount: schema.columnCount,
            primaryKey: schema.columns.find(c => c.name.includes('id') && !c.nullable)?.name || 'id',
            foreignKeys: schema.foreignKeys.reduce((acc, fk) => {
                acc[fk.column] = fk.references;
                return acc;
            }, {}),
            indexes: [],
            lastUpdated: new Date().toISOString()
        };
    }

    return dbTables;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('   ANÁLISIS COMPLETO DE ESQUEMAS Y ACTUALIZACIÓN ENGINEERING-METADATA');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // 1. Ejecutar migración
        await runMigration();

        // 2. Analizar todas las tablas
        console.log('🔍 Analizando esquemas de tablas...\n');
        const schemas = await analyzeAllTables();

        // 3. Mostrar resumen
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('                         RESUMEN DE TABLAS');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        for (const [table, schema] of Object.entries(schemas)) {
            console.log(`📋 ${table.toUpperCase()} (${schema.columnCount} columnas, ${schema.foreignKeys.length} FKs)`);
        }

        // 4. Generar estructura para metadata
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                    DATOS PARA ENGINEERING-METADATA');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        const metadataUpdate = await generateEngineeringMetadataUpdate(schemas);

        // 5. Guardar resultado en JSON para referencia
        const outputPath = path.join(__dirname, '..', 'temp_schema_analysis.json');
        fs.writeFileSync(outputPath, JSON.stringify({
            analyzedAt: new Date().toISOString(),
            tables: schemas,
            metadataFormat: metadataUpdate
        }, null, 2));

        console.log(`✅ Análisis guardado en: ${outputPath}`);

        // 6. Mostrar columnas de tablas principales para actualizar Phase4
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                    COLUMNAS PARA PHASE4 COLLECTORS');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        const keyTables = ['users', 'departments', 'shifts', 'attendance', 'payroll_templates'];
        for (const table of keyTables) {
            if (schemas[table]) {
                console.log(`\n📋 ${table.toUpperCase()}:`);
                console.log('   Columnas:', schemas[table].columns.map(c => c.name).join(', '));
            }
        }

        // 7. Verificar TRIGGERs creados
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                         TRIGGERS VERIFICADOS');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        const [triggers] = await sequelize.query(`
            SELECT trigger_name, event_manipulation, event_object_table, action_statement
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND trigger_name LIKE 'trg_%'
            ORDER BY trigger_name
        `);

        if (triggers.length > 0) {
            triggers.forEach(t => {
                console.log(`   ✅ ${t.trigger_name} ON ${t.event_object_table} (${t.event_manipulation})`);
            });
        } else {
            console.log('   ⚠️ No se encontraron triggers personalizados');
        }

        // 8. Verificar vista creada
        const [views] = await sequelize.query(`
            SELECT table_name FROM information_schema.views
            WHERE table_schema = 'public' AND table_name LIKE 'vw_%'
        `);

        if (views.length > 0) {
            console.log('\n📊 Vistas creadas:');
            views.forEach(v => console.log(`   ✅ ${v.table_name}`));
        }

        console.log('\n✅ ANÁLISIS COMPLETADO');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

main();
