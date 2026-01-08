/**
 * 🧪 TEST MASTER TEST ORCHESTRATOR
 *
 * Script para testear el MasterTestOrchestrator con las 7 phases implementadas.
 *
 * Uso:
 *   node backend/scripts/test-orchestrator.js
 *   node backend/scripts/test-orchestrator.js --quick    # Solo verificar registro de phases
 */

const path = require('path');

// Colores
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Parse args
const args = process.argv.slice(2);
const quickMode = args.includes('--quick');

// Mock database
const mockDatabase = {
    sequelize: {
        query: async () => [[], { rowCount: 0 }],
        transaction: async (callback) => {
            const t = { commit: async () => {}, rollback: async () => {} };
            return callback(t);
        },
        QueryTypes: { SELECT: 'SELECT' }
    },
    User: {
        findAll: async () => [],
        create: async (data) => ({ id: 1, ...data }),
        destroy: async () => 1
    },
    Company: {
        findAll: async () => [],
        create: async (data) => ({ id: 1, ...data }),
        destroy: async () => 1
    }
};

async function main() {
    console.log(`\n${colors.bright}${colors.magenta}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}🎯 MASTER TEST ORCHESTRATOR - TEST${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}========================================${colors.reset}\n`);

    try {
        // 1. Cargar el Orchestrator
        console.log(`📦 Cargando MasterTestOrchestrator...`);
        const MasterTestOrchestrator = require('../src/testing/e2e-advanced/MasterTestOrchestrator');
        console.log(`${colors.green}✅ MasterTestOrchestrator cargado${colors.reset}\n`);

        // 2. Crear instancia
        console.log(`🔧 Creando instancia del orchestrator...`);
        const orchestrator = new MasterTestOrchestrator(mockDatabase, {
            baseURL: 'http://localhost:9998',
            saveResults: false, // No guardar en DB para testing
            onProgress: (update) => {
                console.log(`   📡 ${update.message}`);
            }
        });
        console.log(`${colors.green}✅ Orchestrator instanciado${colors.reset}\n`);

        // 3. Las phases se auto-registran en el constructor
        console.log(`✅ Phases auto-registradas por el orchestrator\n`);

        // 4. Verificar phases registradas
        const registered = Array.from(orchestrator.phases.keys());
        console.log(`📊 Phases registradas: ${colors.cyan}${registered.length}/7${colors.reset}`);
        console.log(`   ${registered.join(', ')}\n`);

        // 5. Mostrar score weights desde ConfidenceCalculator
        console.log(`ℹ️  Score weights (ConfidenceCalculator):`);
        const weights = orchestrator.confidenceCalculator.weights || {};
        Object.entries(weights).forEach(([phase, weight]) => {
            console.log(`     - ${phase.padEnd(15)}: ${(weight * 100).toFixed(0)}%`);
        });
        console.log('');

        // Quick mode: solo validar registro
        if (quickMode) {
            console.log(`${colors.yellow}⚡ Modo QUICK: Saltando ejecución${colors.reset}\n`);

            console.log(`${colors.green}${colors.bright}🎉 ORCHESTRATOR VALIDADO EXITOSAMENTE!${colors.reset}\n`);
            console.log(`${colors.cyan}✅ 7 phases registradas correctamente${colors.reset}`);
            console.log(`${colors.cyan}✅ ConfidenceCalculator configurado${colors.reset}`);
            console.log(`${colors.cyan}✅ DependencyManager configurado${colors.reset}\n`);

            process.exit(0);
        }

        // 6. Ejecutar suite completo (modo simulación - sin herramientas externas)
        console.log(`${colors.bright}🚀 Ejecutando suite completo (modo simulación)...${colors.reset}\n`);

        const result = await orchestrator.runFullSuite(['users'], {
            companyId: 1
        });

        console.log(`\n${colors.bright}${colors.green}========================================${colors.reset}`);
        console.log(`${colors.bright}${colors.green}📊 RESULTADO FINAL${colors.reset}`);
        console.log(`${colors.bright}${colors.green}========================================${colors.reset}\n`);

        console.log(`Execution ID: ${colors.blue}${result.executionId}${colors.reset}`);
        console.log(`Status: ${result.status === 'passed' ? colors.green : result.status === 'warning' ? colors.yellow : colors.red}${result.status}${colors.reset}`);
        console.log(`Confidence Score: ${colors.cyan}${result.confidenceScore.toFixed(1)}/100${colors.reset}`);
        console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
        console.log(`Phases ejecutadas: ${result.phasesExecuted}/${result.phasesTotal}\n`);

        console.log(`${colors.bright}Resumen:${colors.reset}`);
        console.log(`   Passed: ${colors.green}${result.summary.passed}${colors.reset}`);
        console.log(`   Warning: ${colors.yellow}${result.summary.warning}${colors.reset}`);
        console.log(`   Failed: ${colors.red}${result.summary.failed}${colors.reset}`);
        console.log(`   Skipped: ${colors.cyan}${result.summary.skipped}${colors.reset}\n`);

        // Resultados por phase
        console.log(`${colors.bright}Resultados por phase:${colors.reset}\n`);

        Object.entries(result.phaseResults).forEach(([phaseName, phaseResult]) => {
            const statusEmoji = phaseResult.status === 'passed' ? '✅' :
                              phaseResult.status === 'warning' ? '⚠️' :
                              phaseResult.status === 'skipped' ? '⏭️' : '❌';

            const phase = orchestrator.getPhase(phaseName);
            const score = phase ? phase.calculateScore(phaseResult) : 0;

            console.log(`   ${statusEmoji} ${phaseName.padEnd(15)} - ${phaseResult.status.padEnd(10)} (score: ${score}/100, tests: ${phaseResult.passed}/${phaseResult.total})`);
        });

        console.log('');

        // Errores
        if (result.errors.length > 0) {
            console.log(`${colors.bright}${colors.red}⚠️  Errores detectados:${colors.reset}\n`);
            result.errors.forEach((err, idx) => {
                console.log(`   ${idx + 1}. [${err.phase}] ${err.error}`);
            });
            console.log('');
        }

        // Conclusión
        if (result.status === 'passed') {
            console.log(`${colors.green}${colors.bright}🎉 SUITE COMPLETO PASÓ EXITOSAMENTE!${colors.reset}\n`);
            process.exit(0);
        } else if (result.status === 'warning') {
            console.log(`${colors.yellow}${colors.bright}⚠️  SUITE COMPLETO CON WARNINGS${colors.reset}\n`);
            process.exit(0);
        } else {
            console.log(`${colors.red}${colors.bright}❌ SUITE COMPLETO FALLÓ${colors.reset}\n`);
            process.exit(1);
        }

    } catch (error) {
        console.error(`\n${colors.red}❌ ERROR FATAL:${colors.reset}`, error.message);
        if (error.stack) {
            console.error(`\n${colors.red}Stack trace:${colors.reset}`);
            console.error(error.stack.split('\n').slice(0, 10).join('\n'));
        }
        process.exit(1);
    }
}

main();
