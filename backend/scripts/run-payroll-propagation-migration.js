/**
 * Script para ejecutar migración de propagación automática payroll
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

async function runMigration() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        const migrationPath = path.join(__dirname, '..', 'migrations', '20251127_payroll_auto_propagation.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Dividir por comandos principales (evitando dividir dentro de funciones)
        console.log('📋 Ejecutando migración de propagación automática...\n');

        await sequelize.query(sql);

        console.log('✅ Migración completada exitosamente');
        console.log('\n📊 TRIGGERs creados:');
        console.log('   • trg_propagate_salary_category - Propaga cambios de categoría a usuarios');
        console.log('   • trg_propagate_salary_category_v2 - Sincroniza V2 con V1');
        console.log('   • trg_propagate_agreement_multipliers - Propaga multiplicadores');
        console.log('   • trg_flag_payroll_recalculation - Marca liquidaciones para recálculo');
        console.log('   • trg_auto_create_user_salary_config - Auto-crea config al asignar sucursal');

        console.log('\n📊 Funciones creadas:');
        console.log('   • fn_clone_payroll_template_for_branch() - Clonar plantilla para sucursal');
        console.log('   • fn_get_user_payroll_template() - Obtener plantilla por usuario');

        console.log('\n📊 Vista creada:');
        console.log('   • vw_user_salary_complete - Cadena completa User→Convenio→Categoría→Salario');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.original) {
            console.error('   Detalle:', error.original.message);
        }
    } finally {
        await sequelize.close();
    }
}

runMigration();
