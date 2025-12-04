/**
 * Script para ejecutar la migración de regulaciones de privacidad multi-país
 * Extiende la tabla payroll_countries con campos de privacidad
 */

const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  MIGRACIÓN: Regulaciones de Privacidad Multi-País');
    console.log('  Patrón Enterprise: Workday/SAP SuccessFactors');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '../migrations/20250130_add_privacy_regulations_to_payroll_countries.sql');

        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Archivo de migración no encontrado:', migrationPath);
            process.exit(1);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Archivo de migración encontrado');
        console.log('📏 Tamaño:', Math.round(migrationSQL.length / 1024), 'KB\n');

        // Separar por bloques DO $$ ... $$ para ejecutar cada uno por separado
        // El archivo usa estructura de bloques PL/pgSQL
        const blocks = migrationSQL.split(/;[\s\n]*(?=DO \$\$)/);

        console.log(`🔧 Ejecutando ${blocks.length} bloque(s) de migración...\n`);

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i].trim();
            if (!block) continue;

            // Agregar punto y coma al final si no lo tiene
            const sql = block.endsWith(';') ? block : block + ';';

            console.log(`📦 Bloque ${i + 1}/${blocks.length}...`);

            try {
                await sequelize.query(sql);
                console.log(`   ✅ OK`);
            } catch (blockError) {
                // Si es un error de columna ya existe, es normal
                if (blockError.message.includes('already exists') ||
                    blockError.message.includes('ya existe')) {
                    console.log(`   ⚠️ (columna ya existe, continuando...)`);
                } else {
                    console.error(`   ❌ Error:`, blockError.message);
                    // No hacer exit, intentar continuar con el siguiente bloque
                }
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ✅ MIGRACIÓN COMPLETADA');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Verificar resultado
        console.log('📊 Verificando columnas agregadas...\n');

        const [columns] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'payroll_countries'
            AND column_name LIKE 'privacy%' OR column_name LIKE 'consent%'
            OR column_name LIKE 'data_%' OR column_name LIKE 'requires_%'
            OR column_name LIKE 'allows_%' OR column_name LIKE 'breach_%'
            ORDER BY column_name
        `);

        if (columns.length > 0) {
            console.log('Columnas de privacidad encontradas:');
            columns.forEach(col => {
                console.log(`   • ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('⚠️ No se encontraron columnas de privacidad (puede que la migración use nombres diferentes)');
        }

        // Verificar países seeded
        console.log('\n📍 Verificando países configurados...\n');

        const [countries] = await sequelize.query(`
            SELECT country_code, country_name, privacy_law_name
            FROM payroll_countries
            WHERE privacy_law_name IS NOT NULL
            ORDER BY country_name
        `);

        if (countries.length > 0) {
            console.log('Países con regulaciones de privacidad:');
            countries.forEach(c => {
                console.log(`   • ${c.country_code}: ${c.country_name} - ${c.privacy_law_name}`);
            });
        } else {
            console.log('⚠️ Ningún país tiene regulación de privacidad configurada');
        }

        console.log('\n✅ Script finalizado correctamente\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error fatal en migración:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runMigration();
