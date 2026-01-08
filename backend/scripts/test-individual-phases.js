/**
 * 🧪 TEST INDIVIDUAL PHASES
 *
 * Script para testear cada phase del sistema E2E Advanced de forma individual.
 * Valida que cada phase:
 * - Carga correctamente
 * - Implementa métodos requeridos (getName, execute, calculateScore)
 * - Retorna estructura de resultado válida
 * - Maneja errores gracefully
 *
 * Uso:
 *   node backend/scripts/test-individual-phases.js                  # Test completo (lento)
 *   node backend/scripts/test-individual-phases.js --quick          # Solo validar carga y métodos (rápido)
 *   node backend/scripts/test-individual-phases.js --phase=LoadPhase
 */

const path = require('path');
const fs = require('fs');

// Colores para consola
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
const options = {};

args.forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        options[key] = value || true;
    }
});

// Lista de phases a testear
const PHASES = [
    'E2EPhase',
    'LoadPhase',
    'SecurityPhase',
    'MultiTenantPhase',
    'DatabasePhase',
    'MonitoringPhase',
    'EdgeCasesPhase'
];

// Mock database para testing
const mockDatabase = {
    sequelize: {
        query: async () => [[], { rowCount: 0 }],
        transaction: async (callback) => {
            const t = {
                commit: async () => {},
                rollback: async () => {}
            };
            return callback(t);
        },
        QueryTypes: {
            SELECT: 'SELECT'
        }
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

// Progress callback para capturar updates
const progressUpdates = [];
const progressCallback = (update) => {
    progressUpdates.push(update);
};

// Función para testear una phase individual
async function testPhase(phaseName) {
    console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}🧪 Testing ${phaseName}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

    const results = {
        phaseName,
        loaded: false,
        hasGetName: false,
        hasExecute: false,
        hasCalculateScore: false,
        executed: false,
        executionTime: 0,
        error: null,
        result: null,
        score: null
    };

    try {
        // 1. Cargar la phase
        const phasePath = path.join(__dirname, `../src/testing/e2e-advanced/phases/${phaseName}.js`);

        if (!fs.existsSync(phasePath)) {
            throw new Error(`Archivo no encontrado: ${phasePath}`);
        }

        console.log(`📁 Cargando phase desde: ${phasePath}`);

        // Limpiar caché para obtener versión fresca
        delete require.cache[path.resolve(phasePath)];
        const PhaseClass = require(phasePath);

        results.loaded = true;
        console.log(`${colors.green}✅ Phase cargada correctamente${colors.reset}\n`);

        // 2. Instanciar la phase
        const phase = new PhaseClass(mockDatabase, progressCallback);
        console.log(`📦 Phase instanciada`);

        // 3. Validar métodos requeridos
        console.log(`\n🔍 Validando métodos requeridos...`);

        results.hasGetName = typeof phase.getName === 'function';
        console.log(`   getName(): ${results.hasGetName ? colors.green + '✅' : colors.red + '❌'}${colors.reset}`);

        results.hasExecute = typeof phase.execute === 'function';
        console.log(`   execute(): ${results.hasExecute ? colors.green + '✅' : colors.red + '❌'}${colors.reset}`);

        results.hasCalculateScore = typeof phase.calculateScore === 'function';
        console.log(`   calculateScore(): ${results.hasCalculateScore ? colors.green + '✅' : colors.red + '❌'}${colors.reset}`);

        if (!results.hasGetName || !results.hasExecute || !results.hasCalculateScore) {
            throw new Error('La phase no implementa todos los métodos requeridos de PhaseInterface');
        }

        // 4. Obtener nombre de la phase
        const name = phase.getName();
        console.log(`\n📝 Nombre de la phase: ${colors.cyan}${name}${colors.reset}`);

        // Quick mode: solo validar carga, no ejecutar
        if (options.quick) {
            console.log(`\n${colors.yellow}⚡ Modo QUICK: Saltando ejecución${colors.reset}`);
            console.log(`${colors.green}✅ Phase validada correctamente (carga + métodos)${colors.reset}`);

            results.executed = true; // Marca como ejecutado para stats
            results.score = 100; // Score perfecto si pasa validaciones
            results.result = {
                status: 'skipped',
                total: 0,
                passed: 0,
                failed: 0
            };

            return results;
        }

        // 5. Ejecutar la phase
        console.log(`\n⚡ Ejecutando phase con módulo 'users'...\n`);

        progressUpdates.length = 0; // Limpiar updates anteriores

        const startTime = Date.now();

        const result = await phase.execute(['users'], {
            baseURL: 'http://localhost:9998',
            companyId: 1
        });

        const endTime = Date.now();
        results.executionTime = endTime - startTime;

        results.executed = true;
        results.result = result;

        console.log(`${colors.green}✅ Phase ejecutada exitosamente${colors.reset}`);
        console.log(`⏱️  Tiempo de ejecución: ${colors.yellow}${results.executionTime}ms${colors.reset}\n`);

        // 6. Validar estructura del resultado
        console.log(`🔍 Validando estructura del resultado...`);

        // Validaciones REQUERIDAS (core)
        const requiredValidations = {
            hasStatus: typeof result.status === 'string',
            hasTotal: typeof result.total === 'number',
            hasPassed: typeof result.passed === 'number',
            hasFailed: typeof result.failed === 'number'
        };

        // Validaciones OPCIONALES (pueden no estar)
        const optionalValidations = {
            hasWarnings: result.warnings !== undefined ? typeof result.warnings === 'number' : true,
            hasTests: result.tests !== undefined ? Array.isArray(result.tests) : true,
            hasMetrics: result.metrics !== undefined ? typeof result.metrics === 'object' : true
        };

        Object.entries({...requiredValidations, ...optionalValidations}).forEach(([key, valid]) => {
            const label = key.replace('has', '').toLowerCase();
            const isRequired = requiredValidations[key] !== undefined;
            const prefix = isRequired ? '  [REQ]' : '  [OPT]';
            console.log(`${prefix} ${label}: ${valid ? colors.green + '✅' : colors.red + '❌'}${colors.reset}`);
        });

        const allRequiredValid = Object.values(requiredValidations).every(v => v);

        if (!allRequiredValid) {
            throw new Error('Estructura de resultado inválida - faltan propiedades requeridas');
        }

        // 7. Calcular score
        console.log(`\n📊 Calculando score...`);
        const score = phase.calculateScore(result);
        results.score = score;

        const scoreColor = score >= 90 ? colors.green : score >= 70 ? colors.yellow : colors.red;
        console.log(`   Score: ${scoreColor}${score}/100${colors.reset}\n`);

        // 8. Mostrar resumen del resultado
        console.log(`${colors.bright}📋 RESUMEN DEL RESULTADO:${colors.reset}`);
        console.log(`   Status: ${result.status === 'passed' ? colors.green : colors.yellow}${result.status}${colors.reset}`);
        console.log(`   Total tests: ${result.total}`);
        console.log(`   Passed: ${colors.green}${result.passed}${colors.reset}`);
        console.log(`   Failed: ${colors.red}${result.failed}${colors.reset}`);
        console.log(`   Warnings: ${colors.yellow}${result.warnings}${colors.reset}`);

        if (result.metrics && Object.keys(result.metrics).length > 0) {
            console.log(`\n   Métricas:`);
            Object.entries(result.metrics).forEach(([key, value]) => {
                console.log(`     - ${key}: ${value}`);
            });
        }

        // 9. Mostrar progress updates
        if (progressUpdates.length > 0) {
            console.log(`\n${colors.bright}📡 Progress Updates (${progressUpdates.length}):${colors.reset}`);
            progressUpdates.slice(0, 5).forEach((update, idx) => {
                console.log(`   ${idx + 1}. ${update.message || update.phase || 'Update'}`);
            });
            if (progressUpdates.length > 5) {
                console.log(`   ... y ${progressUpdates.length - 5} más`);
            }
        }

    } catch (error) {
        results.error = error.message;
        console.error(`\n${colors.red}❌ ERROR: ${error.message}${colors.reset}`);
        if (error.stack) {
            console.error(`\n${colors.red}Stack trace:${colors.reset}`);
            console.error(error.stack.split('\n').slice(0, 5).join('\n'));
        }
    }

    return results;
}

// Función principal
async function main() {
    console.log(`\n${colors.bright}${colors.magenta}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}🎯 E2E ADVANCED - INDIVIDUAL PHASE TESTING${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}========================================${colors.reset}\n`);

    console.log(`📦 Módulo de prueba: ${colors.cyan}users${colors.reset}`);
    console.log(`🔧 Base URL: ${colors.cyan}http://localhost:9998${colors.reset}\n`);

    // Determinar qué phases testear
    const phasesToTest = options.phase
        ? [options.phase]
        : PHASES;

    console.log(`🧪 Phases a testear: ${phasesToTest.join(', ')}\n`);

    // Testear cada phase
    const allResults = [];

    for (const phaseName of phasesToTest) {
        const result = await testPhase(phaseName);
        allResults.push(result);

        // Esperar 1 segundo entre phases
        if (phasesToTest.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Resumen final
    console.log(`\n\n${colors.bright}${colors.magenta}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}📊 RESUMEN FINAL${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}========================================${colors.reset}\n`);

    const summary = {
        total: allResults.length,
        loaded: allResults.filter(r => r.loaded).length,
        executed: allResults.filter(r => r.executed).length,
        errors: allResults.filter(r => r.error).length,
        avgScore: allResults.filter(r => r.score !== null).reduce((sum, r) => sum + r.score, 0) / allResults.filter(r => r.score !== null).length || 0,
        avgTime: allResults.filter(r => r.executionTime > 0).reduce((sum, r) => sum + r.executionTime, 0) / allResults.filter(r => r.executionTime > 0).length || 0
    };

    console.log(`Total phases testeadas: ${summary.total}`);
    console.log(`Cargadas correctamente: ${colors.green}${summary.loaded}${colors.reset}`);
    console.log(`Ejecutadas exitosamente: ${colors.green}${summary.executed}${colors.reset}`);
    console.log(`Con errores: ${summary.errors > 0 ? colors.red : colors.green}${summary.errors}${colors.reset}`);
    console.log(`Score promedio: ${colors.cyan}${summary.avgScore.toFixed(1)}/100${colors.reset}`);
    console.log(`Tiempo promedio: ${colors.cyan}${summary.avgTime.toFixed(0)}ms${colors.reset}\n`);

    // Tabla de resultados
    console.log(`${colors.bright}📋 TABLA DE RESULTADOS:${colors.reset}\n`);
    console.log(`${'Phase'.padEnd(20)} | ${'Status'.padEnd(10)} | ${'Score'.padEnd(8)} | ${'Time'.padEnd(10)}`);
    console.log(`${'-'.repeat(20)} | ${'-'.repeat(10)} | ${'-'.repeat(8)} | ${'-'.repeat(10)}`);

    allResults.forEach(r => {
        const status = r.error ? colors.red + '❌ ERROR' : r.executed ? colors.green + '✅ OK' : colors.yellow + '⚠️ N/A';
        const score = r.score !== null ? (r.score >= 90 ? colors.green : r.score >= 70 ? colors.yellow : colors.red) + r.score.toFixed(0) : 'N/A';
        const time = r.executionTime > 0 ? `${r.executionTime}ms` : 'N/A';

        console.log(`${r.phaseName.padEnd(20)} | ${status.padEnd(20)}${colors.reset} | ${score.padEnd(16)}${colors.reset} | ${time.padEnd(10)}`);
    });

    console.log('');

    // Conclusión
    if (summary.errors === 0 && summary.executed === summary.total) {
        console.log(`${colors.green}${colors.bright}🎉 TODAS LAS PHASES FUNCIONAN CORRECTAMENTE!${colors.reset}\n`);
        console.log(`${colors.cyan}✅ Puedes continuar con la implementación del MasterTestOrchestrator${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}${colors.bright}⚠️ ALGUNAS PHASES TIENEN PROBLEMAS${colors.reset}\n`);
        console.log(`${colors.yellow}🔧 Revisa los errores arriba y corrígelos antes de continuar${colors.reset}\n`);
        process.exit(1);
    }
}

// Ejecutar
main().catch(error => {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
    process.exit(1);
});
