/**
 * Script para ejecutar la migración de Entidades y Consolidación
 * Fecha: 2025-11-26
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/config/database');

async function runMigration() {
    console.log('🚀 Iniciando migración: Sistema de Entidades y Consolidación v1.0');
    console.log('=' .repeat(70));

    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251126_payroll_entities_and_consolidation.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Archivo de migración cargado');
        console.log('🔄 Ejecutando migración...\n');

        // Ejecutar migración
        await sequelize.query(migrationSQL);

        console.log('\n✅ Migración completada exitosamente!\n');

        // Verificar tablas creadas
        const [tablesCheck] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'payroll_entities',
                'payroll_entity_settlements',
                'payroll_entity_settlement_details',
                'payroll_payslip_templates'
            )
            ORDER BY table_name
        `);

        console.log('📊 Tablas verificadas:');
        tablesCheck.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Verificar entidades creadas
        const [[entitiesCheck]] = await sequelize.query(`SELECT COUNT(*) as count FROM payroll_entities`);
        console.log(`\n🏢 Entidades configuradas: ${entitiesCheck.count}`);

        // Listar entidades por país
        const [entities] = await sequelize.query(`
            SELECT pe.entity_code, pe.entity_name, pe.entity_type, pc.country_code
            FROM payroll_entities pe
            LEFT JOIN payroll_countries pc ON pe.country_id = pc.id
            ORDER BY pc.country_code, pe.entity_type, pe.entity_name
        `);

        console.log('\n🗺️ Entidades por país:');
        let currentCountry = '';
        entities.forEach(e => {
            if (e.country_code !== currentCountry) {
                currentCountry = e.country_code || 'GLOBAL';
                console.log(`\n   📍 ${currentCountry}:`);
            }
            const icon = e.entity_type === 'TAX_AUTHORITY' ? '🏛️' :
                        e.entity_type === 'HEALTH_INSURANCE' ? '🏥' :
                        e.entity_type === 'UNION' ? '👷' :
                        e.entity_type === 'PENSION_FUND' ? '💰' : '🏢';
            console.log(`      ${icon} ${e.entity_code}: ${e.entity_name}`);
        });

        // Verificar columna entity_id en payroll_template_concepts
        const [columnCheck] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'payroll_template_concepts'
            AND column_name = 'entity_id'
        `);

        if (columnCheck.length > 0) {
            console.log('\n✅ Campo entity_id agregado a payroll_template_concepts');
        }

        console.log('\n' + '=' .repeat(70));
        console.log('🎉 Sistema de Entidades y Consolidación v1.0 instalado correctamente!');
        console.log('=' .repeat(70));

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        if (error.original) console.error('   Original:', error.original.message);
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
