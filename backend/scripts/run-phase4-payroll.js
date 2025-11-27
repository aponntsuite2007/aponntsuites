/**
 * Script para ejecutar Phase4 Testing del módulo Payroll
 * Usa IntelligentTestingOrchestrator directamente
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    logging: false
});

async function runPhase4Payroll() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('   PHASE 4 TESTING - PAYROLL MODULE');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL\n');

        // Import IntelligentTestingOrchestrator
        const IntelligentTestingOrchestrator = require('../src/auditor/core/IntelligentTestingOrchestrator');

        // Create orchestrator instance
        const orchestrator = new IntelligentTestingOrchestrator(
            sequelize,      // database
            null,           // systemRegistry (will be auto-created)
            null            // baseURL (not needed for DB-only tests)
        );

        // Auto-register collectors
        console.log('📝 Registrando collectors...\n');
        orchestrator.autoRegisterCollectors();

        // Check if payroll collector is registered
        if (orchestrator.collectors.has('payroll-liquidation')) {
            console.log('✅ PayrollModuleCollector registrado correctamente\n');
        } else {
            console.log('❌ PayrollModuleCollector NO está registrado');
            return;
        }

        // List all registered collectors
        console.log('📋 Collectors disponibles:');
        for (const [name, collector] of orchestrator.collectors) {
            console.log(`   - ${name}`);
        }

        // Run payroll module tests
        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('   EJECUTANDO TESTS DE PAYROLL');
        console.log('═══════════════════════════════════════════════════════════════════════\n');

        // Get PayrollModuleCollector
        const PayrollModuleCollector = orchestrator.collectors.get('payroll-liquidation');

        // Create instance with database
        const payrollCollector = new PayrollModuleCollector(
            sequelize,  // database
            null,       // systemRegistry
            null        // baseURL
        );

        // Get module config
        const config = payrollCollector.getModuleConfig();
        console.log(`📊 Módulo: ${config.moduleName}`);
        console.log(`📊 Tests: ${config.testCategories.length}\n`);

        // Run each test manually (sin navegador)
        const results = [];
        for (const testCategory of config.testCategories) {
            console.log(`🔹 Ejecutando: ${testCategory.name}...`);
            try {
                // Set database on collector for direct queries
                payrollCollector.database = sequelize;

                const result = await testCategory.func();
                results.push(result);

                if (result.status === 'passed') {
                    console.log(`   ✅ PASSED`);
                } else if (result.status === 'warning') {
                    console.log(`   ⚠️ WARNING: ${result.details?.message || ''}`);
                } else {
                    console.log(`   ❌ FAILED: ${result.details?.error || result.details?.message || ''}`);
                }
            } catch (error) {
                console.log(`   ❌ ERROR: ${error.message}`);
                results.push({
                    name: testCategory.name,
                    status: 'failed',
                    details: { error: error.message }
                });
            }
        }

        // Summary
        const passed = results.filter(r => r.status === 'passed').length;
        const warnings = results.filter(r => r.status === 'warning').length;
        const failed = results.filter(r => r.status === 'failed').length;

        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('                            RESUMEN PHASE4 PAYROLL');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log(`   ✅ Tests Pasados: ${passed}/${results.length}`);
        console.log(`   ⚠️ Warnings: ${warnings}`);
        console.log(`   ❌ Fallidos: ${failed}`);
        console.log(`   📊 Success Rate: ${Math.round((passed / results.length) * 100)}%`);

        if (failed === 0) {
            console.log('\n🎉 PHASE4 PAYROLL: TODOS LOS TESTS PASARON\n');
        } else {
            console.log('\n⚠️ PHASE4 PAYROLL: Algunos tests fallaron\n');
        }

        // Return results for external use
        return {
            module: 'payroll-liquidation',
            totalTests: results.length,
            passed,
            warnings,
            failed,
            successRate: Math.round((passed / results.length) * 100),
            results
        };

    } catch (error) {
        console.error('❌ Error crítico:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

runPhase4Payroll();
