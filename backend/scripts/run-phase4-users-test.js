#!/usr/bin/env node
/**
 * ============================================================================
 * RUNNER PHASE4 PARA TEST DE USUARIOS
 * ============================================================================
 *
 * Este script integra el test completo de usuarios con el Phase4 Orquestador.
 *
 * USO:
 *   node scripts/run-phase4-users-test.js
 *
 * OPCIONES:
 *   --headless    Ejecutar sin mostrar browser
 *   --company=X   Company ID a usar (default: 11 = ISI)
 *   --slow=X      SlowMo en ms (default: 100)
 *
 * ============================================================================
 */

require('dotenv').config();
const path = require('path');

// Parsear argumentos
const args = process.argv.slice(2);
const isHeadless = args.includes('--headless');
const companyArg = args.find(a => a.startsWith('--company='));
const slowArg = args.find(a => a.startsWith('--slow='));

const config = {
    headless: isHeadless,
    companyId: companyArg ? parseInt(companyArg.split('=')[1]) : 11,
    slowMo: slowArg ? parseInt(slowArg.split('=')[1]) : 100
};

console.log('');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  PHASE 4 - TEST COMPLETO MÓDULO USUARIOS                       ║');
console.log('║  Integración con Phase4TestOrchestrator                        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Configuración:');
console.log(`  - Headless: ${config.headless}`);
console.log(`  - Company ID: ${config.companyId}`);
console.log(`  - SlowMo: ${config.slowMo}ms`);
console.log('');

// Cargar el test completo
const UsersModuleCRUDTestPath = path.join(__dirname, 'test-users-crud-complete.js');

// Modificar CONFIG antes de ejecutar
process.env.TEST_HEADLESS = config.headless ? 'true' : 'false';
process.env.TEST_COMPANY_ID = config.companyId.toString();
process.env.TEST_SLOW_MO = config.slowMo.toString();

async function runPhase4UsersTest() {
    try {
        // Limpiar cache para que tome las env vars actualizadas
        delete require.cache[require.resolve(UsersModuleCRUDTestPath)];

        console.log('🚀 Ejecutando test de usuarios via Phase4...\n');

        // Importar la clase
        const UsersModuleCRUDTest = require(UsersModuleCRUDTestPath);

        // Crear instancia y ejecutar
        const test = new UsersModuleCRUDTest();
        const results = await test.run();

        console.log('');
        console.log('═'.repeat(60));
        console.log('📊 RESUMEN FINAL - PHASE4 USERS TEST');
        console.log('═'.repeat(60));
        console.log(`   ✅ Tests pasados: ${results.passed}`);
        console.log(`   ❌ Tests fallidos: ${results.failed}`);
        console.log(`   ⏭️ Tests saltados: ${results.skipped}`);
        console.log(`   📋 Total tests: ${results.tests.length}`);
        console.log('═'.repeat(60));
        console.log('');

        if (results.failed > 0) {
            console.log('⚠️ Algunos tests fallaron. Revisar errores arriba.');
            process.exit(1);
        } else {
            console.log('✅ Todos los tests pasaron exitosamente!');
            process.exit(0);
        }

    } catch (error) {
        console.error('');
        console.error('❌ Error en Phase4 Users Test:', error.message);
        console.error('');
        process.exit(1);
    }
}

// Ejecutar
runPhase4UsersTest();
