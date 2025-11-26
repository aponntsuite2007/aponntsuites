/**
 * Script para ejecutar la migración del Sistema de Liquidación Parametrizable v3.0
 * Fecha: 2025-11-26
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Usar la misma configuración que el resto del sistema
const { sequelize } = require('../src/config/database');

async function runMigration() {
    console.log('🚀 Iniciando migración: Sistema de Liquidación Parametrizable v3.0');
    console.log('=' .repeat(70));

    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251126_payroll_parametrizable_system.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Archivo de migración cargado');
        console.log('🔄 Ejecutando migración...\n');

        // Ejecutar migración usando sequelize
        await sequelize.query(migrationSQL);

        console.log('\n✅ Migración completada exitosamente!\n');

        // Verificar tablas creadas
        const [tablesCheck] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'payroll_countries',
                'company_branches',
                'labor_agreements_v2',
                'payroll_concept_types',
                'payroll_templates',
                'payroll_template_concepts',
                'salary_categories_v2',
                'user_payroll_assignment',
                'user_payroll_concept_overrides',
                'user_payroll_bonuses',
                'payroll_runs',
                'payroll_run_details',
                'payroll_run_concept_details'
            )
            ORDER BY table_name
        `);

        console.log('📊 Tablas verificadas:');
        tablesCheck.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Verificar países
        const [[countriesCheck]] = await sequelize.query(`SELECT COUNT(*) as count FROM payroll_countries`);
        console.log(`\n🌍 Países configurados: ${countriesCheck.count}`);

        // Verificar tipos de conceptos
        const [[conceptsCheck]] = await sequelize.query(`SELECT COUNT(*) as count FROM payroll_concept_types`);
        console.log(`📝 Tipos de conceptos: ${conceptsCheck.count}`);

        // Listar países
        const [countries] = await sequelize.query(`SELECT country_code, country_name, currency_code FROM payroll_countries ORDER BY country_name`);
        console.log('\n🗺️ Países disponibles:');
        countries.forEach(c => {
            console.log(`   - ${c.country_code}: ${c.country_name} (${c.currency_code})`);
        });

        // Listar tipos de conceptos
        const [concepts] = await sequelize.query(`SELECT type_code, type_name, is_deduction, is_employer_cost FROM payroll_concept_types ORDER BY display_order`);
        console.log('\n💰 Tipos de conceptos:');
        concepts.forEach(c => {
            const icon = c.is_employer_cost ? '🏢' : c.is_deduction ? '➖' : '➕';
            console.log(`   ${icon} ${c.type_code}: ${c.type_name}`);
        });

        console.log('\n' + '=' .repeat(70));
        console.log('🎉 Sistema de Liquidación Parametrizable v3.0 instalado correctamente!');
        console.log('=' .repeat(70));

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        if (error.original) console.error('   Original:', error.original.message);
        if (error.sql) console.error('   SQL:', error.sql.substring(0, 200));
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Ejecutar
runMigration()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
