/**
 * ============================================================================
 * TEST COMPLETO DE TODOS LOS MÓDULOS - Sistema 100% VIVO
 * ============================================================================
 *
 * Ejecuta tests UX completos en TODOS los módulos detectados automáticamente
 * usando el nuevo sistema bidirectional feedback loop.
 *
 * - Auto-detecta módulos desde código (Brain Service)
 * - Ejecuta tests UX en cada módulo
 * - Persiste discoveries en ux_discoveries
 * - Genera metadata viva actualizada
 * - Calcula progress real desde tests
 *
 * @version 2.0.0-live
 * @date 2025-12-10
 * ============================================================================
 */

const EcosystemBrainService = require('../src/services/EcosystemBrainService');
const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  TEST COMPLETO TODOS LOS MÓDULOS - Sistema 100% VIVO     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    try {
        // 1. INICIALIZAR BRAIN SERVICE (auto-detección)
        console.log('🧠 [BRAIN] Inicializando EcosystemBrainService...\n');
        const brain = new EcosystemBrainService(database.sequelize);

        // 2. AUTO-DETECTAR MÓDULOS desde código
        console.log('🔍 [AUTO-DISCOVERY] Detectando módulos desde código...\n');
        const fullMetadata = await brain.generateFullEngineeringMetadata();

        const moduleNames = Object.keys(fullMetadata.modules);
        console.log(`\n✅ ${moduleNames.length} módulos detectados automáticamente:\n`);

        moduleNames.forEach((name, idx) => {
            const mod = fullMetadata.modules[name];
            console.log(`   ${idx + 1}. ${name.padEnd(30)} → ${mod.apiEndpoints.length} endpoints, ${mod.databaseTables.length} tablas`);
        });

        // 3. CONFIGURAR CREDENCIALES DE TEST
        // Usar empresa demo para tests (puedes cambiar)
        const testCompanyId = 1;
        const testCompanySlug = 'aponnt-empresa-demo';
        const testUsername = 'administrador';
        const testPassword = 'admin123';

        console.log(`\n🔐 Credenciales de test:`);
        console.log(`   Empresa: ${testCompanySlug} (ID: ${testCompanyId})`);
        console.log(`   Usuario: ${testUsername}\n`);

        // 4. INICIALIZAR PHASE4 ORCHESTRATOR
        console.log('🚀 [PHASE4] Inicializando Test Orchestrator...\n');

        const orchestrator = new Phase4TestOrchestrator({
            headless: true,  // Sin UI para tests masivos
            slowMo: 50,      // Más rápido
            timeout: 30000
        }, database.sequelize);

        await orchestrator.start();

        // 5. EJECUTAR TESTS EN TODOS LOS MÓDULOS
        const results = {
            total: moduleNames.length,
            tested: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            details: []
        };

        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  EJECUTANDO TESTS UX EN TODOS LOS MÓDULOS                ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        for (let i = 0; i < moduleNames.length; i++) {
            const moduleName = moduleNames[i];
            const moduleInfo = fullMetadata.modules[moduleName];

            console.log(`\n[${ i + 1}/${moduleNames.length}] 🧪 Testing módulo: ${moduleName}`);
            console.log(`   Archivos: ${moduleInfo.files.backend.length} backend, ${moduleInfo.files.frontend.length} frontend`);
            console.log(`   APIs: ${moduleInfo.apiEndpoints.length} endpoints`);
            console.log(`   BD: ${moduleInfo.databaseTables.length} tablas`);
            console.log(`   Progress actual: ${moduleInfo.progress}%\n`);

            try {
                // Determinar qué test ejecutar según el módulo
                let testResult;

                // Módulos con tests específicos implementados
                if (moduleName === 'departments' || moduleName === 'department') {
                    console.log('   → Ejecutando CRUD completo departments...');
                    testResult = await orchestrator.runDepartmentsCRUDTest(
                        testCompanyId,
                        testCompanySlug
                    );
                }
                else if (moduleName === 'users' || moduleName === 'user') {
                    console.log('   → Ejecutando CRUD completo users...');
                    testResult = await orchestrator.runUsersCRUDTest(
                        testCompanyId,
                        testCompanySlug
                    );
                }
                else {
                    console.log('   → Ejecutando test genérico UX...');
                    testResult = await orchestrator.runModuleTest(
                        moduleName,
                        testCompanyId,
                        2, // maxCycles
                        testCompanySlug,
                        testUsername,
                        testPassword
                    );
                }

                results.tested++;

                if (testResult && testResult.passed > 0) {
                    results.passed++;
                    console.log(`   ✅ PASSED: ${testResult.passed} tests exitosos`);
                } else if (testResult && testResult.failed > 0) {
                    results.failed++;
                    console.log(`   ❌ FAILED: ${testResult.failed} tests fallaron`);
                } else {
                    results.skipped++;
                    console.log(`   ⏭️  SKIPPED: No se pudieron ejecutar tests`);
                }

                results.details.push({
                    module: moduleName,
                    status: testResult && testResult.passed > 0 ? 'PASSED' : 'FAILED',
                    testsPassed: testResult?.passed || 0,
                    testsFailed: testResult?.failed || 0,
                    testsTotal: testResult?.tests?.length || 0
                });

            } catch (error) {
                results.failed++;
                results.details.push({
                    module: moduleName,
                    status: 'ERROR',
                    error: error.message
                });
                console.log(`   ❌ ERROR: ${error.message}`);
            }

            // Pequeña pausa entre módulos
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 6. CERRAR ORCHESTRATOR
        await orchestrator.stop();

        // 7. REGENERAR METADATA CON NUEVOS RESULTADOS
        console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  REGENERANDO METADATA CON RESULTADOS DE TESTS            ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const updatedMetadata = await brain.generateFullEngineeringMetadata();

        // 8. RESUMEN FINAL
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

        console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  RESUMEN FINAL - TESTS COMPLETOS                         ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  Total módulos:        ${results.total}`);
        console.log(`║  Módulos testeados:    ${results.tested}`);
        console.log(`║  Tests PASSED:         ${results.passed} ✅`);
        console.log(`║  Tests FAILED:         ${results.failed} ❌`);
        console.log(`║  Tests SKIPPED:        ${results.skipped} ⏭️`);
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  Duración total:       ${duration} minutos`);
        console.log(`║  Progress promedio:    ${updatedMetadata.stats.averageProgress}%`);
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // 9. DETALLE POR MÓDULO
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  DETALLE POR MÓDULO                                       ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        results.details.forEach((detail, idx) => {
            const status = detail.status === 'PASSED' ? '✅' :
                          detail.status === 'FAILED' ? '❌' : '⚠️';

            console.log(`${idx + 1}. ${status} ${detail.module.padEnd(25)} → ` +
                `${detail.testsPassed || 0}/${detail.testsTotal || 0} tests passed`);

            if (detail.error) {
                console.log(`   Error: ${detail.error}`);
            }
        });

        console.log('\n');

        // 10. GUARDAR REPORTE
        const fs = require('fs').promises;
        const reportPath = require('path').join(__dirname, '../test-results-live.json');

        await fs.writeFile(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            duration: `${duration} minutes`,
            summary: results,
            metadata: updatedMetadata.stats
        }, null, 2));

        console.log(`📄 Reporte guardado en: ${reportPath}\n`);

        // Exit code basado en resultados
        process.exit(results.failed === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR FATAL en test suite:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar
main();
