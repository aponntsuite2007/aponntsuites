/**
 * Script: Ejecutar migración de Parametrización Total de Payroll
 * Fecha: 2025-11-30
 *
 * Este script ejecuta la migración que:
 * 1. Crea payroll_entity_categories (categorías parametrizables)
 * 2. Agrega category_id a payroll_entities
 * 3. Crea vistas y funciones para consolidación
 */

const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('========================================');
    console.log('MIGRACIÓN: Parametrización Total Payroll v4.0');
    console.log('========================================\n');

    try {
        // Leer archivo SQL
        const migrationPath = path.join(__dirname, '../migrations/20251130_payroll_full_parametrization.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Leyendo migración:', migrationPath);
        console.log('📏 Tamaño:', sql.length, 'caracteres\n');

        // Dividir en statements (PostgreSQL no ejecuta múltiples statements de una vez)
        // Separamos por ; que no esté dentro de funciones o strings
        const statements = [];
        let current = '';
        let inFunction = false;
        let depth = 0;

        const lines = sql.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();

            // Detectar inicio de función
            if (trimmed.includes('CREATE OR REPLACE FUNCTION') ||
                trimmed.includes('CREATE FUNCTION') ||
                trimmed.match(/^DO\s*\$\$/)) {
                inFunction = true;
                depth = 0;
            }

            // Contar $$ para funciones
            const dollars = (line.match(/\$\$/g) || []).length;
            if (dollars > 0) {
                depth += dollars;
            }

            current += line + '\n';

            // Si termina con ; y no estamos en una función
            if (trimmed.endsWith(';') && !inFunction) {
                if (current.trim() && !current.trim().startsWith('--')) {
                    statements.push(current.trim());
                }
                current = '';
            }

            // Detectar fin de función (terminado con $$ y luego ;)
            if (inFunction && depth >= 2 && trimmed.endsWith(';')) {
                statements.push(current.trim());
                current = '';
                inFunction = false;
                depth = 0;
            }
        }

        // Agregar lo que quede
        if (current.trim() && !current.trim().startsWith('--')) {
            statements.push(current.trim());
        }

        console.log(`📋 Encontrados ${statements.length} statements SQL\n`);

        // Ejecutar cada statement
        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // Saltar comentarios
            if (stmt.startsWith('--') || stmt.startsWith('/*')) {
                skipped++;
                continue;
            }

            // Extraer tipo de statement para log
            const firstWord = stmt.split(/[\s\n]/)[0].toUpperCase();
            const secondWord = stmt.split(/[\s\n]/)[1]?.toUpperCase() || '';
            const stmtType = firstWord === 'CREATE' ? `${firstWord} ${secondWord}` : firstWord;

            try {
                await sequelize.query(stmt);
                console.log(`✅ [${i + 1}/${statements.length}] ${stmtType.substring(0, 40)}`);
                success++;
            } catch (error) {
                // Ignorar errores de "ya existe"
                if (error.message.includes('already exists') ||
                    error.message.includes('ya existe') ||
                    error.message.includes('duplicate key') ||
                    error.message.includes('does not exist')) {
                    console.log(`⏭️  [${i + 1}/${statements.length}] ${stmtType.substring(0, 40)} - Ya existe/omitido`);
                    skipped++;
                } else {
                    console.error(`❌ [${i + 1}/${statements.length}] ${stmtType.substring(0, 40)}`);
                    console.error(`   Error: ${error.message.substring(0, 100)}`);
                    failed++;
                }
            }
        }

        console.log('\n========================================');
        console.log('RESUMEN DE MIGRACIÓN');
        console.log('========================================');
        console.log(`✅ Exitosos: ${success}`);
        console.log(`⏭️  Omitidos: ${skipped}`);
        console.log(`❌ Fallidos: ${failed}`);

        if (failed === 0) {
            console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
            console.log('\nAhora puedes:');
            console.log('1. Crear categorías de entidades en Payroll > Entidades');
            console.log('2. Crear entidades de destino con categoría asignada');
            console.log('3. Asignar entidades a conceptos en las plantillas');
            console.log('4. Generar liquidaciones consolidadas por entidad');
        } else {
            console.log('\n⚠️  Migración completada con errores');
            console.log('Revisa los errores arriba y ejecuta manualmente si es necesario');
        }

    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

// Ejecutar
runMigration();
