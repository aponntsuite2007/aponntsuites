#!/usr/bin/env node
/**
 * ============================================================================
 * RUNNER - Test Phase 4 Modulo Vacaciones
 * ============================================================================
 *
 * Script runner para ejecutar el test completo CRUD del modulo vacaciones.
 * Soporta opciones de linea de comandos para personalizar la ejecucion.
 *
 * OPCIONES:
 *   --headless     Ejecutar sin ventana de navegador visible
 *   --company=X    Cambiar empresa (default: isi)
 *   --slow=X       Cambiar velocidad en ms (default: 100)
 *   --help         Mostrar ayuda
 *
 * EJEMPLOS:
 *   node scripts/run-phase4-vacation-test.js
 *   node scripts/run-phase4-vacation-test.js --headless
 *   node scripts/run-phase4-vacation-test.js --slow=200
 *   node scripts/run-phase4-vacation-test.js --company=demo --headless
 *
 * @usage node scripts/run-phase4-vacation-test.js [options]
 * @version 1.0.0
 * @date 2025-11-30
 * ============================================================================
 */

const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    headless: args.includes('--headless'),
    slow: 100,
    company: 'isi',
    help: args.includes('--help') || args.includes('-h')
};

// Parse --slow=X
const slowArg = args.find(a => a.startsWith('--slow='));
if (slowArg) {
    options.slow = parseInt(slowArg.split('=')[1]) || 100;
}

// Parse --company=X
const companyArg = args.find(a => a.startsWith('--company='));
if (companyArg) {
    options.company = companyArg.split('=')[1] || 'isi';
}

// Show help
if (options.help) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  TEST PHASE 4 - MODULO VACACIONES                              ║
║  Runner con opciones de linea de comandos                      ║
╚════════════════════════════════════════════════════════════════╝

OPCIONES:
  --headless     Ejecutar sin ventana de navegador visible
  --company=X    Cambiar empresa (default: isi)
  --slow=X       Cambiar velocidad en ms (default: 100)
  --help, -h     Mostrar esta ayuda

EJEMPLOS:
  node scripts/run-phase4-vacation-test.js
  node scripts/run-phase4-vacation-test.js --headless
  node scripts/run-phase4-vacation-test.js --slow=200
  node scripts/run-phase4-vacation-test.js --company=demo --headless

REQUISITOS:
  - Backend corriendo (puerto 9998, 9997, 9999, 3000 u 8080)
  - PostgreSQL accesible
  - Playwright instalado (npm install playwright)
    `);
    process.exit(0);
}

// Banner
console.log(`
╔════════════════════════════════════════════════════════════════╗
║  TEST PHASE 4 - MODULO VACACIONES                              ║
║  Playwright E2E + PostgreSQL Validation                        ║
╚════════════════════════════════════════════════════════════════╝

Opciones:
  - Headless:  ${options.headless ? 'Si' : 'No (ventana visible)'}
  - Empresa:   ${options.company}
  - Velocidad: ${options.slow}ms entre acciones
`);

// Load and run test
const VacationModuleCRUDTest = require('./test-vacation-crud-complete');

async function main() {
    const startTime = Date.now();

    try {
        // Create test instance
        const test = new VacationModuleCRUDTest();

        // Override config if needed
        if (options.headless) {
            console.log('[CONFIG] Modo headless activado\n');
        }

        // Run the test
        const results = await test.run();

        // Calculate duration
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`
═══════════════════════════════════════════════════════════════
                    RESUMEN FINAL
═══════════════════════════════════════════════════════════════
  Duracion total: ${duration} segundos
  Tests pasados:  ${results.passed}
  Tests fallidos: ${results.failed}
  Tests saltados: ${results.skipped}
  Tasa de exito:  ${((results.passed / results.tests.length) * 100).toFixed(1)}%
═══════════════════════════════════════════════════════════════
`);

        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`
═══════════════════════════════════════════════════════════════
                    ERROR FATAL
═══════════════════════════════════════════════════════════════
  Duracion: ${duration} segundos
  Error:    ${error.message}
═══════════════════════════════════════════════════════════════
`);
        process.exit(1);
    }
}

main();
