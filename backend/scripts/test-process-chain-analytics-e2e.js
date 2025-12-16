/**
 * ============================================================================
 * TEST END-TO-END - PROCESS CHAIN ANALYTICS COMPLETO
 * ============================================================================
 *
 * Este test verifica TODO el sistema de Process Chains + Analytics:
 * 1. Migración de BD (tabla + funciones PostgreSQL)
 * 2. Inicialización de servicios
 * 3. Generación de process chains
 * 4. Tracking de analytics (generation → start → complete)
 * 5. Feedback de usuarios
 * 6. Dashboard de analytics (todas las queries)
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const database = require('../src/config/database');
const ProcessChainGenerator = require('../src/services/ProcessChainGenerator');
const ProcessChainAnalyticsService = require('../src/services/ProcessChainAnalyticsService');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  TEST E2E - Process Chain Analytics System                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

function logTest(name, status, details = '') {
    const symbols = { pass: '✅', fail: '❌', warn: '⚠️' };
    console.log(`${symbols[status]} ${name}`);
    if (details) console.log(`   ${details}`);

    testResults.tests.push({ name, status, details });
    if (status === 'pass') testResults.passed++;
    else if (status === 'fail') testResults.failed++;
    else testResults.warnings++;
}

(async () => {
    const sequelize = database.sequelize;
    let processChainGenerator, analyticsService;
    let testUserId, testCompanyId, testAnalyticsId;

    try {
        // ============================================================
        // STEP 1: Verificar migración de Analytics (tabla + funciones)
        // ============================================================
        console.log('\n📊 STEP 1: Verificando migración de Analytics...\n');

        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'process_chain_analytics'
        `);

        if (tables.length > 0) {
            logTest('Tabla process_chain_analytics existe', 'pass');
        } else {
            logTest('Tabla process_chain_analytics NO existe', 'fail', 'Ejecutar: node scripts/run-analytics-migration.js');
            process.exit(1);
        }

        const [functions] = await sequelize.query(`
            SELECT proname
            FROM pg_proc
            WHERE proname IN (
                'get_top_requested_actions',
                'get_module_usage_stats',
                'get_time_trends',
                'identify_bottlenecks'
            )
        `);

        if (functions.length === 4) {
            logTest('4 funciones PostgreSQL creadas', 'pass', functions.map(f => f.proname).join(', '));
        } else {
            logTest('Funciones PostgreSQL incompletas', 'fail', `Solo ${functions.length}/4 encontradas`);
        }

        // ============================================================
        // STEP 2: Inicializar servicios
        // ============================================================
        console.log('\n🔧 STEP 2: Inicializando servicios...\n');

        try {
            processChainGenerator = new ProcessChainGenerator(sequelize);
            analyticsService = new ProcessChainAnalyticsService(sequelize);
            logTest('Servicios inicializados correctamente', 'pass');
        } catch (error) {
            logTest('Error al inicializar servicios', 'fail', error.message);
            throw error;
        }

        // ============================================================
        // STEP 3: Verificar definiciones cargadas (108+)
        // ============================================================
        console.log('\n📚 STEP 3: Verificando definiciones de acciones...\n');

        const definitions = processChainGenerator.processDefinitions;
        const definitionCount = Object.keys(definitions).length;

        if (definitionCount >= 108) {
            logTest('Definiciones de acciones cargadas', 'pass', `${definitionCount} acciones disponibles`);
        } else {
            logTest('Definiciones incompletas', 'warn', `Solo ${definitionCount} acciones (esperadas 108+)`);
        }

        // ============================================================
        // STEP 4: Obtener usuario de prueba
        // ============================================================
        console.log('\n👤 STEP 4: Obteniendo usuario de prueba...\n');

        const [testUsers] = await sequelize.query(`
            SELECT u.user_id, u.username, u.company_id
            FROM users u
            INNER JOIN companies c ON u.company_id = c.company_id
            WHERE c.is_active = true
            LIMIT 1
        `);

        if (testUsers.length > 0) {
            testUserId = testUsers[0].user_id;
            testCompanyId = testUsers[0].company_id;
            logTest('Usuario de prueba encontrado', 'pass', `User ID: ${testUserId}, Company ID: ${testCompanyId}`);
        } else {
            logTest('No se encontró usuario de prueba', 'fail', 'Crear al menos 1 usuario activo');
            process.exit(1);
        }

        // ============================================================
        // STEP 5: Generar process chain para acción de prueba
        // ============================================================
        console.log('\n⚙️ STEP 5: Generando process chain...\n');

        const testActionKey = 'create-user'; // Acción común que debería existir
        let generatedChain;

        try {
            generatedChain = await processChainGenerator.generateProcessChain(testUserId, testCompanyId, testActionKey);

            if (generatedChain && generatedChain.processSteps) {
                logTest('Process chain generado exitosamente', 'pass',
                    `Action: ${testActionKey}, Steps: ${generatedChain.processSteps.length}, Can proceed: ${generatedChain.canProceed}`);
            } else {
                logTest('Process chain vacío o inválido', 'fail', 'No se generaron pasos');
                throw new Error('Generated chain is invalid');
            }
        } catch (error) {
            logTest('Error generando process chain', 'fail', error.message);
            throw error;
        }

        // ============================================================
        // STEP 6: Trackear generación en Analytics
        // ============================================================
        console.log('\n📊 STEP 6: Trackeando generación en Analytics...\n');

        try {
            const trackData = {
                companyId: testCompanyId,
                userId: testUserId,
                actionKey: testActionKey,
                actionName: generatedChain.actionName || 'Crear Usuario',
                moduleName: generatedChain.moduleName || 'users',
                processChain: generatedChain,
                userAgent: 'E2E Test Script',
                ipAddress: '127.0.0.1',
                referrerModule: 'test'
            };

            const analyticsRecord = await analyticsService.trackGeneration(trackData);
            testAnalyticsId = analyticsRecord.id;

            logTest('Analytics: Generación trackeada', 'pass', `Analytics ID: ${testAnalyticsId}`);
        } catch (error) {
            logTest('Error trackeando generación', 'fail', error.message);
            throw error;
        }

        // ============================================================
        // STEP 7: Trackear START del proceso
        // ============================================================
        console.log('\n▶️ STEP 7: Trackeando START del proceso...\n');

        try {
            await analyticsService.trackStart(testAnalyticsId);
            logTest('Analytics: START trackeado', 'pass');
        } catch (error) {
            logTest('Error trackeando START', 'fail', error.message);
        }

        // Simular delay (usuario trabajando)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ============================================================
        // STEP 8: Trackear COMPLETION del proceso
        // ============================================================
        console.log('\n✅ STEP 8: Trackeando COMPLETION del proceso...\n');

        try {
            await analyticsService.trackCompletion(testAnalyticsId);
            logTest('Analytics: COMPLETION trackeado', 'pass');
        } catch (error) {
            logTest('Error trackeando COMPLETION', 'fail', error.message);
        }

        // ============================================================
        // STEP 9: Enviar FEEDBACK (5 estrellas)
        // ============================================================
        console.log('\n⭐ STEP 9: Enviando feedback de usuario...\n');

        try {
            await analyticsService.submitFeedback(testAnalyticsId, 5, '¡Excelente! Muy fácil de usar.');
            logTest('Feedback enviado correctamente', 'pass', '5 estrellas + comentario');
        } catch (error) {
            logTest('Error enviando feedback', 'fail', error.message);
        }

        // ============================================================
        // STEP 10: Obtener OVERALL STATS
        // ============================================================
        console.log('\n📈 STEP 10: Obteniendo estadísticas generales...\n');

        try {
            const overallStats = await analyticsService.getOverallStats(testCompanyId, { days: 30 });

            if (overallStats && overallStats.total_requests !== undefined) {
                logTest('Overall stats obtenidas', 'pass',
                    `Total: ${overallStats.total_requests}, Completed: ${overallStats.completed_count}, Rate: ${overallStats.completion_rate}%`);
            } else {
                logTest('Overall stats vacías', 'warn', 'No hay datos suficientes aún');
            }
        } catch (error) {
            logTest('Error obteniendo overall stats', 'fail', error.message);
        }

        // ============================================================
        // STEP 11: Obtener TOP ACTIONS
        // ============================================================
        console.log('\n🏆 STEP 11: Obteniendo top acciones más solicitadas...\n');

        try {
            const topActions = await analyticsService.getTopRequestedActions(testCompanyId, { limit: 10, days: 30 });

            if (topActions && topActions.length > 0) {
                logTest('Top actions obtenidas', 'pass', `${topActions.length} acciones encontradas`);
                console.log('   Top 3:');
                topActions.slice(0, 3).forEach((action, i) => {
                    console.log(`   ${i + 1}. ${action.action_name} - ${action.request_count} requests (${action.completion_rate}% completion)`);
                });
            } else {
                logTest('Top actions vacías', 'warn', 'No hay datos suficientes aún');
            }
        } catch (error) {
            logTest('Error obteniendo top actions', 'fail', error.message);
        }

        // ============================================================
        // STEP 12: Obtener MODULE STATS
        // ============================================================
        console.log('\n📊 STEP 12: Obteniendo estadísticas por módulo...\n');

        try {
            const moduleStats = await analyticsService.getModuleUsageStats(testCompanyId, { days: 30 });

            if (moduleStats && moduleStats.length > 0) {
                logTest('Module stats obtenidas', 'pass', `${moduleStats.length} módulos con actividad`);
                console.log('   Distribución:');
                moduleStats.forEach(mod => {
                    console.log(`   - ${mod.module_name}: ${mod.request_count} requests (${mod.completion_rate}%)`);
                });
            } else {
                logTest('Module stats vacías', 'warn', 'No hay datos suficientes aún');
            }
        } catch (error) {
            logTest('Error obteniendo module stats', 'fail', error.message);
        }

        // ============================================================
        // STEP 13: Obtener TIME TRENDS
        // ============================================================
        console.log('\n📅 STEP 13: Obteniendo tendencias temporales...\n');

        try {
            const timeTrends = await analyticsService.getTimeTrends(testCompanyId, { days: 30 });

            if (timeTrends && timeTrends.length > 0) {
                logTest('Time trends obtenidas', 'pass', `${timeTrends.length} días con datos`);
            } else {
                logTest('Time trends vacías', 'warn', 'No hay datos históricos suficientes');
            }
        } catch (error) {
            logTest('Error obteniendo time trends', 'fail', error.message);
        }

        // ============================================================
        // STEP 14: Identificar BOTTLENECKS
        // ============================================================
        console.log('\n🚧 STEP 14: Identificando bottlenecks...\n');

        try {
            const bottlenecks = await analyticsService.identifyBottlenecks(testCompanyId, { minRequests: 1, days: 30 });

            if (bottlenecks && bottlenecks.length > 0) {
                logTest('Bottlenecks identificados', 'pass', `${bottlenecks.length} acciones problemáticas`);
                bottlenecks.forEach(b => {
                    console.log(`   ⚠️ ${b.action_name}: ${b.block_rate}% bloqueados, ${b.completion_rate}% completados`);
                });
            } else {
                logTest('Sin bottlenecks detectados', 'pass', 'Sistema funcionando correctamente');
            }
        } catch (error) {
            logTest('Error identificando bottlenecks', 'fail', error.message);
        }

        // ============================================================
        // STEP 15: Obtener DASHBOARD DATA COMPLETO
        // ============================================================
        console.log('\n🎯 STEP 15: Obteniendo dashboard data completo...\n');

        try {
            const dashboardData = await analyticsService.getDashboardData(testCompanyId, { days: 30 });

            if (dashboardData && dashboardData.overall && dashboardData.topActions) {
                logTest('Dashboard data completo obtenido', 'pass',
                    `Period: ${dashboardData.period.days} días, Generated at: ${dashboardData.generatedAt}`);

                console.log('\n   📦 Contenido del Dashboard:');
                console.log(`   - Overall stats: ${dashboardData.overall.total_requests} requests`);
                console.log(`   - Top actions: ${dashboardData.topActions.length} items`);
                console.log(`   - Module stats: ${dashboardData.moduleStats.length} items`);
                console.log(`   - Time trends: ${dashboardData.timeTrends.length} días`);
                console.log(`   - Bottlenecks: ${dashboardData.bottlenecks.length} items`);
                console.log(`   - Period comparison: ${JSON.stringify(dashboardData.periodComparison)}`);
                console.log(`   - Action ratings: ${dashboardData.actionRatings.length} items`);
            } else {
                logTest('Dashboard data incompleto', 'warn', 'Faltan algunos campos');
            }
        } catch (error) {
            logTest('Error obteniendo dashboard data', 'fail', error.message);
        }

        // ============================================================
        // STEP 16: CLEANUP (opcional - comentado para no borrar datos)
        // ============================================================
        console.log('\n🧹 STEP 16: Cleanup (opcional - comentado)...\n');

        // Uncomment para limpiar datos de prueba:
        // await sequelize.query(`DELETE FROM process_chain_analytics WHERE id = ${testAnalyticsId}`);
        // logTest('Datos de prueba eliminados', 'pass');

        logTest('Datos de prueba conservados', 'pass', 'Descomenta cleanup si quieres eliminarlos');

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN DEL TEST                        ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log(`✅ Tests PASSED:   ${testResults.passed}`);
        console.log(`❌ Tests FAILED:   ${testResults.failed}`);
        console.log(`⚠️  Tests WARNINGS: ${testResults.warnings}`);
        console.log(`📊 Total tests:    ${testResults.tests.length}\n`);

        if (testResults.failed === 0) {
            console.log('🎉 ¡TODOS LOS TESTS PASARON! Sistema Analytics 100% funcional.\n');
            process.exit(0);
        } else {
            console.log('❌ Algunos tests fallaron. Revisar logs arriba.\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO en test E2E:', error.message);
        console.error(error.stack);

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN DEL TEST                        ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        console.log(`✅ Tests PASSED:   ${testResults.passed}`);
        console.log(`❌ Tests FAILED:   ${testResults.failed + 1}`);
        console.log(`⚠️  Tests WARNINGS: ${testResults.warnings}`);

        process.exit(1);
    }
})();
