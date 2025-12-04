/**
 * =============================================================================
 * EJECUTOR DE TESTS CRUD - Todos los Módulos
 * =============================================================================
 *
 * Ejecuta tests CRUD completos para:
 * - Users (7 tests)
 * - Departments (7 tests)
 * - Shifts (7 tests)
 * - Attendance (4 tests)
 * - Payroll (5 tests)
 * - Integration (7 tests intermodulares)
 *
 * Uso:
 *   node scripts/run-all-module-tests.js
 *   node scripts/run-all-module-tests.js --module users
 *   node scripts/run-all-module-tests.js --company-id 11 --company-slug isi
 *
 * =============================================================================
 */

require('dotenv').config();
const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');

// Parsear argumentos
const args = process.argv.slice(2);
const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx > -1 ? args[idx + 1] : null;
};

const specificModule = getArg('module');
const companyId = parseInt(getArg('company-id')) || 11;
const companySlug = getArg('company-slug') || 'isi';

async function main() {
    console.log('\n' + '╔'.padEnd(79, '═') + '╗');
    console.log('║  🧪 PHASE4 MODULE TESTS RUNNER                                              ║');
    console.log('╚'.padEnd(79, '═') + '╝\n');

    console.log(`📋 Configuración:`);
    console.log(`   Company ID: ${companyId}`);
    console.log(`   Company Slug: ${companySlug}`);
    console.log(`   Módulo específico: ${specificModule || 'TODOS'}\n`);

    const orchestrator = new Phase4TestOrchestrator();

    try {
        // Inicializar
        console.log('🚀 Inicializando Phase4TestOrchestrator...\n');
        await orchestrator.start();

        let results;

        if (specificModule) {
            // Ejecutar módulo específico
            console.log(`📦 Ejecutando tests para módulo: ${specificModule}\n`);

            switch (specificModule.toLowerCase()) {
                case 'users':
                    results = await orchestrator.runUsersCRUDTest(companyId, companySlug);
                    break;
                case 'departments':
                    results = await orchestrator.runDepartmentsCRUDTest(companyId, companySlug);
                    break;
                case 'shifts':
                    results = await orchestrator.runShiftsCRUDTest(companyId, companySlug);
                    break;
                case 'attendance':
                    results = await orchestrator.runAttendanceCRUDTest(companyId, companySlug);
                    break;
                case 'payroll':
                    results = await orchestrator.runPayrollCRUDTest(companyId, companySlug);
                    break;
                case 'medical':
                    results = await orchestrator.runMedicalCasesCRUDTest(companyId, companySlug);
                    break;
                case 'integration':
                    results = await orchestrator.runIntermodularIntegrationTest(companyId, companySlug);
                    break;
                default:
                    console.error(`❌ Módulo no reconocido: ${specificModule}`);
                    console.log('\nMódulos disponibles: users, departments, shifts, attendance, payroll, medical, integration');
                    process.exit(1);
            }
        } else {
            // Ejecutar todos los tests
            console.log('📦 Ejecutando TODOS los tests CRUD...\n');
            results = await orchestrator.runAllModulesCRUDTests(companyId, companySlug);
        }

        // Guardar resultados
        const fs = require('fs');
        const path = require('path');
        const resultsPath = path.join(__dirname, '..', `TEST-RESULTS-${Date.now()}.json`);
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n📁 Resultados guardados en: ${path.basename(resultsPath)}`);

        // Cerrar
        await orchestrator.stop();

        // Exit code basado en resultados
        const failed = results.summary?.totalFailed || results.failed || 0;
        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
        console.error(error.stack);

        try {
            await orchestrator.stop();
        } catch (e) {}

        process.exit(1);
    }
}

main();
