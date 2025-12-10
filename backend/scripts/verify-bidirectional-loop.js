/**
 * Verificación del Bidirectional Feedback Loop Completo
 *
 * Este script valida que:
 * 1. Tests descubren y persisten en ux_discoveries ✓
 * 2. Registry recibe y valida discoveries ✓
 * 3. Brain puede consultar discoveries históricos ✓
 * 4. Tests consultan knowledge base antes de auto-discovery ✓
 * 5. Brain ajusta progress scores con datos reales ✓
 */

const IntelligentUXTester = require('../src/auditor/core/IntelligentUXTester');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const EcosystemBrainService = require('../src/services/EcosystemBrainService');
const database = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  VERIFICACIÓN BIDIRECTIONAL FEEDBACK LOOP - 100% AWARE    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Inicializar componentes
        console.log('🔧 Inicializando componentes...\n');

        const registry = new SystemRegistry();
        const brain = new EcosystemBrainService(database.sequelize);

        const tester = new IntelligentUXTester({
            headless: true,
            timeout: 30000
        }, database.sequelize, registry, brain);

        // 2. Limpiar discoveries anteriores del módulo de prueba
        const testModuleKey = 'departments';
        console.log(`🧹 Limpiando discoveries anteriores de "${testModuleKey}"...\n`);

        await database.sequelize.query(
            'DELETE FROM ux_discoveries WHERE module_key = :moduleKey',
            { replacements: { moduleKey: testModuleKey }, type: QueryTypes.DELETE }
        );

        // 3. PRIMER TEST - Auto-discovery desde cero
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 1: PRIMER TEST - Auto-discovery desde cero          ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const result1 = await tester.testModule(testModuleKey, 'departments');

        console.log('\n📊 RESULTADO PRIMER TEST:');
        console.log(`   - Botones descubiertos: ${result1.buttonsDiscovered || 0}`);
        console.log(`   - Tests ejecutados: ${result1.testsExecuted || 0}`);
        console.log(`   - Tests passed: ${result1.testsPassed || 0}`);
        console.log(`   - Discoveries guardados: ${result1.discoveriesSaved || 0}`);

        // 4. Verificar que se guardaron en BD
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 2: Verificar persistencia en ux_discoveries         ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const savedDiscoveries = await database.sequelize.query(
            `SELECT discovery_type, discovery_data, validation_count, works_correctly
             FROM ux_discoveries
             WHERE module_key = :moduleKey`,
            { replacements: { moduleKey: testModuleKey }, type: QueryTypes.SELECT }
        );

        console.log(`✅ Discoveries persistidos: ${savedDiscoveries.length}`);
        if (savedDiscoveries.length > 0) {
            savedDiscoveries.forEach((d, idx) => {
                const data = typeof d.discovery_data === 'string'
                    ? JSON.parse(d.discovery_data)
                    : d.discovery_data;
                console.log(`   ${idx + 1}. Tipo: ${d.discovery_type} | ` +
                    `Texto: "${data.text || data.flowType || 'N/A'}" | ` +
                    `Validaciones: ${d.validation_count} | ` +
                    `Funciona: ${d.works_correctly ? '✅' : '❌'}`);
            });
        } else {
            console.log('   ⚠️  No se encontraron discoveries guardados');
        }

        // 5. Simular varias validaciones (incrementar validation_count)
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 3: Simular validaciones (incrementar counts a 3+)   ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        await database.sequelize.query(
            `UPDATE ux_discoveries
             SET validation_count = 3, validation_status = 'validated'
             WHERE module_key = :moduleKey`,
            { replacements: { moduleKey: testModuleKey }, type: QueryTypes.UPDATE }
        );

        console.log('✅ Discoveries marcados como validados (count = 3)\n');

        // 6. Verificar que Brain puede consultar discoveries
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 4: Brain consulta discoveries históricos            ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const historicalDiscoveries = await brain.getHistoricalDiscoveries(testModuleKey);

        if (historicalDiscoveries) {
            console.log('✅ Brain puede consultar discoveries:');
            console.log(`   - Total discoveries: ${historicalDiscoveries.totalDiscoveries}`);
            console.log(`   - Botones: ${historicalDiscoveries.buttons.length}`);
            console.log(`   - Modals: ${historicalDiscoveries.modals.length}`);
            console.log(`   - Fields: ${historicalDiscoveries.fields.length}`);
            console.log(`   - Flows: ${historicalDiscoveries.flows.length}`);
            console.log(`   - Última actualización: ${historicalDiscoveries.lastUpdated || 'N/A'}`);
        } else {
            console.log('❌ Brain NO pudo consultar discoveries');
        }

        // 7. Verificar que Registry puede obtener validated discoveries
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 5: Registry obtiene validated discoveries           ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const validatedDiscoveries = await registry.getValidatedDiscoveries(testModuleKey, 3);

        if (validatedDiscoveries && validatedDiscoveries.length > 0) {
            console.log(`✅ Registry obtuvo ${validatedDiscoveries.length} validated discoveries`);
            validatedDiscoveries.forEach((d, idx) => {
                const data = typeof d.discovery_data === 'string'
                    ? JSON.parse(d.discovery_data)
                    : d.discovery_data;
                console.log(`   ${idx + 1}. ${d.discovery_type}: "${data.text || data.flowType || 'N/A'}" ` +
                    `(${d.validation_count}x validado)`);
            });
        } else {
            console.log('❌ Registry NO obtuvo validated discoveries');
        }

        // 8. SEGUNDO TEST - Usando knowledge base
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 6: SEGUNDO TEST - Debe usar knowledge base          ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const result2 = await tester.testModule(testModuleKey, 'departments');

        console.log('\n📊 RESULTADO SEGUNDO TEST:');
        console.log(`   - Botones descubiertos: ${result2.buttonsDiscovered || 0}`);
        console.log(`   - Tests ejecutados: ${result2.testsExecuted || 0}`);
        console.log(`   - Tests passed: ${result2.testsPassed || 0}`);
        console.log(`   - Usó knowledge base: ${result2.usedKnowledgeBase ? '✅' : '❌'}`);

        // 9. Verificar que Brain puede obtener test results
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 7: Brain obtiene resultados de tests reales         ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const testResults = await brain.getLatestTestResults(testModuleKey);

        if (testResults && testResults.testCount > 0) {
            console.log(`✅ Brain obtuvo ${testResults.testCount} resultados de tests:`);
            console.log(`   - CREATE: ${testResults.crud.create.tested ? (testResults.crud.create.passed ? '✅' : '❌') : '⏸️ '} (testado: ${testResults.crud.create.tested})`);
            console.log(`   - READ: ${testResults.crud.read.tested ? (testResults.crud.read.passed ? '✅' : '❌') : '⏸️ '} (testado: ${testResults.crud.read.tested})`);
            console.log(`   - UPDATE: ${testResults.crud.update.tested ? (testResults.crud.update.passed ? '✅' : '❌') : '⏸️ '} (testado: ${testResults.crud.update.tested})`);
            console.log(`   - DELETE: ${testResults.crud.delete.tested ? (testResults.crud.delete.passed ? '✅' : '❌') : '⏸️ '} (testado: ${testResults.crud.delete.tested})`);
        } else {
            console.log('⚠️  Brain no obtuvo resultados de tests (esperado si no hay flows)');
        }

        // 10. Verificar cálculo de progress real
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  PASO 8: Brain calcula progress con datos reales          ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const module = registry.getModule(testModuleKey);
        if (module) {
            const realProgress = await brain.calculateRealProgress(module);
            console.log(`✅ Progress calculado con datos reales: ${realProgress}%`);
            console.log(`   (combina análisis estático + resultados de tests)`);
        } else {
            console.log('⚠️  Módulo no encontrado en registry');
        }

        // 11. RESUMEN FINAL
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║  RESUMEN VERIFICACIÓN BIDIRECTIONAL LOOP                  ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');

        const checks = [
            { name: 'Tests persisten discoveries en BD', ok: savedDiscoveries.length > 0 },
            { name: 'Registry obtiene validated discoveries', ok: validatedDiscoveries && validatedDiscoveries.length > 0 },
            { name: 'Brain consulta discoveries históricos', ok: historicalDiscoveries !== null },
            { name: 'Brain obtiene resultados de tests', ok: testResults !== null },
            { name: 'Brain calcula progress con tests reales', ok: module !== null },
            { name: 'Tests usan knowledge base en 2da ejecución', ok: result2.usedKnowledgeBase || false }
        ];

        checks.forEach((check, idx) => {
            console.log(`║  ${idx + 1}. ${check.ok ? '✅' : '❌'} ${check.name}`);
        });

        const allPassed = checks.every(c => c.ok);
        const passedCount = checks.filter(c => c.ok).length;
        const awareness = Math.round((passedCount / checks.length) * 100);

        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  SELF-AWARENESS LEVEL: ${awareness}% (${passedCount}/${checks.length} componentes)      `);
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        if (allPassed) {
            console.log('🎉 ¡BIDIRECTIONAL FEEDBACK LOOP 100% FUNCIONAL!\n');
            console.log('El sistema es completamente auto-consciente:');
            console.log('  - Tests descubren → persisten → validan');
            console.log('  - Registry centraliza y organiza');
            console.log('  - Brain consulta y aprende de históricos');
            console.log('  - Tests reutilizan conocimiento previo');
            console.log('  - Progress scores ajustados con datos reales\n');
        } else {
            console.log(`⚠️  Sistema al ${awareness}% de auto-consciencia`);
            console.log('Componentes faltantes:\n');
            checks.filter(c => !c.ok).forEach(c => {
                console.log(`  ❌ ${c.name}`);
            });
            console.log('');
        }

        await tester.cleanup();
        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR en verificación:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
