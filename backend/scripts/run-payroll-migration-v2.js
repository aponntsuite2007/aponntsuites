/**
 * Script para ejecutar migración de propagación automática payroll
 * Ejecuta cada sección de forma independiente para mayor robustez
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

// Dividir SQL por secciones comentadas
function splitSQLBySections(sql) {
    const sections = [];
    const lines = sql.split('\n');
    let currentSection = '';
    let currentName = 'Inicio';

    for (const line of lines) {
        // Detectar nuevo encabezado de sección
        if (line.match(/^-- =+$/)) {
            if (currentSection.trim()) {
                sections.push({ name: currentName, sql: currentSection });
            }
            currentSection = '';
        } else if (line.match(/^-- \d+\./)) {
            // Nueva sección numerada
            currentName = line.replace(/^-- /, '').trim();
            currentSection = '';
        } else {
            currentSection += line + '\n';
        }
    }

    // Agregar última sección
    if (currentSection.trim()) {
        sections.push({ name: currentName, sql: currentSection });
    }

    return sections;
}

async function runMigration() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('   MIGRACIÓN: Sistema de Propagación Automática Payroll');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        const migrationPath = path.join(__dirname, '..', 'migrations', '20251127_payroll_auto_propagation.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Dividir por CREATE y DO
        const statements = sql.split(/(?=CREATE OR REPLACE|DROP TRIGGER|DO \$\$|COMMENT ON|CREATE INDEX)/i);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt || stmt.startsWith('--')) continue;

            // Obtener nombre del objeto siendo creado
            let objName = 'Statement ' + i;
            const funcMatch = stmt.match(/FUNCTION\s+(\w+)/i);
            const trigMatch = stmt.match(/TRIGGER\s+(\w+)/i);
            const viewMatch = stmt.match(/VIEW\s+(\w+)/i);
            const indexMatch = stmt.match(/INDEX\s+IF NOT EXISTS\s+(\w+)/i);
            const commentMatch = stmt.match(/COMMENT ON\s+\w+\s+(\w+)/i);

            if (funcMatch) objName = 'Función: ' + funcMatch[1];
            else if (trigMatch) objName = 'Trigger: ' + trigMatch[1];
            else if (viewMatch) objName = 'Vista: ' + viewMatch[1];
            else if (indexMatch) objName = 'Índice: ' + indexMatch[1];
            else if (commentMatch) objName = 'Comment: ' + commentMatch[1];
            else if (stmt.startsWith('DO')) objName = 'DO Block (ALTER columns)';

            try {
                await sequelize.query(stmt);
                console.log(`   ✅ ${objName}`);
                successCount++;
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('ya existe')) {
                    console.log(`   ⏩ ${objName} (ya existe)`);
                    skipCount++;
                } else if (error.message.includes('does not exist') || error.message.includes('no existe')) {
                    console.log(`   ⏩ ${objName} (dependencia no existe - skip)`);
                    skipCount++;
                } else {
                    console.log(`   ❌ ${objName}: ${error.message}`);
                    errorCount++;
                }
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('                            RESUMEN');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log(`   ✅ Exitosos: ${successCount}`);
        console.log(`   ⏩ Omitidos: ${skipCount}`);
        console.log(`   ❌ Errores: ${errorCount}`);

        // Verificar TRIGGERs creados
        console.log('\n📊 TRIGGERs verificados:');
        const [triggers] = await sequelize.query(`
            SELECT trigger_name, event_object_table, event_manipulation
            FROM information_schema.triggers
            WHERE trigger_schema = 'public' AND trigger_name LIKE 'trg_%'
        `);

        if (triggers.length > 0) {
            triggers.forEach(t => {
                console.log(`   ✅ ${t.trigger_name} ON ${t.event_object_table} (${t.event_manipulation})`);
            });
        } else {
            console.log('   ⚠️ No se encontraron triggers');
        }

        // Verificar funciones creadas
        console.log('\n📊 Funciones de payroll:');
        const [functions] = await sequelize.query(`
            SELECT routine_name FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name LIKE 'fn_%'
            AND routine_name LIKE '%payroll%' OR routine_name LIKE '%salary%' OR routine_name LIKE '%propagate%' OR routine_name LIKE '%clone%'
            ORDER BY routine_name
        `);

        if (functions.length > 0) {
            functions.forEach(f => console.log(`   ✅ ${f.routine_name}()`));
        }

        // Verificar vista creada
        console.log('\n📊 Vistas creadas:');
        const [views] = await sequelize.query(`
            SELECT table_name FROM information_schema.views
            WHERE table_schema = 'public' AND table_name LIKE 'vw_%'
        `);

        if (views.length > 0) {
            views.forEach(v => console.log(`   ✅ ${v.table_name}`));
        }

        console.log('\n✅ MIGRACIÓN COMPLETADA\n');

    } catch (error) {
        console.error('❌ Error crítico:', error.message);
    } finally {
        await sequelize.close();
    }
}

runMigration();
