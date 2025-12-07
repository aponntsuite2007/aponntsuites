/**
 * Script para ejecutar la migración del módulo HSE
 * Seguridad e Higiene Laboral - ISO 45001
 */
const fs = require('fs');
const path = require('path');

// Configurar DATABASE_URL si no está definida
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';
}

const { sequelize } = require('../src/config/database');

async function runMigration() {
    console.log('🔄 Iniciando migración del módulo HSE...');
    console.log('============================================');

    try {
        // Leer archivo SQL
        const sqlPath = path.join(__dirname, '..', 'migrations', '20251207_hse_module_complete.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Archivo SQL leído correctamente');

        // Ejecutar migración
        await sequelize.query(sql);

        console.log('');
        console.log('✅ Migración HSE completada exitosamente');
        console.log('');
        console.log('Tablas creadas:');
        console.log('  - epp_categories (categorías globales de EPP)');
        console.log('  - epp_catalog (catálogo por empresa)');
        console.log('  - epp_role_requirements (matriz rol-EPP)');
        console.log('  - epp_deliveries (entregas de EPP)');
        console.log('  - epp_inspections (inspecciones)');
        console.log('  - hse_company_config (configuración por empresa)');
        console.log('');
        console.log('Funciones creadas:');
        console.log('  - calculate_epp_replacement_date()');
        console.log('  - get_expiring_epp()');
        console.log('  - get_hse_dashboard_kpis()');
        console.log('');

        // Verificar categorías insertadas
        const [categories] = await sequelize.query('SELECT COUNT(*) as count FROM epp_categories');
        console.log(`📊 Categorías EPP insertadas: ${categories[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runMigration();
