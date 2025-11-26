/**
 * ============================================================================
 * TEST PHASE4 - DEPARTMENTS CRUD (Método Directo)
 * ============================================================================
 *
 * Ejecuta tests E2E completos del módulo de Departamentos usando:
 * - Playwright (navegador visible, headless: false)
 * - Phase4TestOrchestrator.runDepartmentsCRUDTest() - MÉTODO DIRECTO
 * - Validación PostgreSQL
 *
 * TESTS INCLUIDOS:
 * 1. Navegación al módulo
 * 2. Listar departamentos
 * 3. CREATE - Crear departamento (nombre, descripción, GPS, radio)
 * 4. READ - Verificar en lista y BD
 * 5. UPDATE - Editar departamento
 * 6. DELETE - Eliminar departamento
 * 7. Validación campos requeridos
 *
 * USO:
 * cd backend
 * node test-phase4-departments.js
 *
 * @version 2.0.0
 * @date 2025-11-25
 * ============================================================================
 */

const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');

async function testDepartmentsCRUD() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE4 DEPARTMENTS CRUD TEST - Método Directo (Playwright)    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Configuración del orchestrator
    const orchestrator = new Phase4TestOrchestrator({
        headless: false,   // Navegador visible para ver los tests
        slowMo: 100,       // Velocidad de las acciones (ms entre cada paso)
        timeout: 30000     // Timeout global de 30 segundos
    });

    try {
        // ============================================================
        // PASO 1: Iniciar el sistema
        // ============================================================
        console.log('🚀 Iniciando Phase4TestOrchestrator...\n');
        console.log('   • Playwright (Chromium visible)');
        console.log('   • PostgreSQL (validación de persistencia)');
        console.log('   • WebSocket Server');
        console.log('   • Ollama (análisis de errores)\n');

        await orchestrator.start();
        console.log('✅ Sistema iniciado correctamente\n');

        // ============================================================
        // PASO 2: Ejecutar tests CRUD directos de DEPARTMENTS
        // ============================================================
        console.log('\n🧪 EJECUTANDO DEPARTMENTS CRUD TEST (Método Directo)...\n');

        /**
         * runDepartmentsCRUDTest ejecuta DIRECTAMENTE:
         * - Login
         * - Navegación al módulo
         * - CREATE (con validación PostgreSQL)
         * - READ (verificación en lista)
         * - UPDATE (edición y persistencia)
         * - DELETE (soft/hard delete)
         * - Validación de campos requeridos
         *
         * Sin usar collectors externos - todo dentro de Phase4TestOrchestrator
         */
        const results = await orchestrator.runDepartmentsCRUDTest(
            11,      // Company ID (ISI)
            'isi'    // Company slug para login
        );

        // ============================================================
        // PASO 3: Mostrar resultados finales
        // ============================================================
        console.log('\n\n' + '═'.repeat(70));
        console.log('📊 RESULTADOS FINALES - DEPARTMENTS CRUD TEST');
        console.log('═'.repeat(70) + '\n');

        results.tests.forEach((test, index) => {
            const icon = test.status === 'passed' ? '✅' :
                        test.status === 'warning' ? '⚠️' : '❌';
            console.log(`   ${index + 1}. ${icon} ${test.name}: ${test.status.toUpperCase()}`);
            if (test.error) {
                console.log(`      └─ Error: ${test.error}`);
            }
            if (test.departmentId) {
                console.log(`      └─ Department ID: ${test.departmentId}`);
            }
        });

        console.log('\n' + '─'.repeat(70));
        console.log(`📈 ESTADÍSTICAS FINALES:`);
        console.log(`   Total tests: ${results.tests.length}`);
        console.log(`   ✅ Passed: ${results.passed}`);
        console.log(`   ❌ Failed: ${results.failed}`);
        console.log(`   📊 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
        console.log('─'.repeat(70) + '\n');

        // ============================================================
        // PASO 4: Generar reporte del orchestrator
        // ============================================================
        orchestrator.generateReport('departments');

        // ============================================================
        // PASO 5: Detener el sistema
        // ============================================================
        console.log('\n🛑 Cerrando sistema...');
        await orchestrator.stop();
        console.log('✅ Sistema cerrado correctamente\n');

        // Exit code basado en resultados
        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ ERROR EJECUTANDO PHASE4 DEPARTMENTS:');
        console.error('═'.repeat(70));
        console.error(`   Error: ${error.message}`);
        if (error.stack) {
            console.error('\n   Stack trace:');
            console.error(error.stack.split('\n').slice(0, 5).join('\n'));
        }
        console.error('═'.repeat(70) + '\n');

        // Asegurar que el browser se cierre en caso de error
        try {
            await orchestrator.stop();
            console.log('✅ Sistema cerrado después del error\n');
        } catch (stopError) {
            console.error('⚠️ Error adicional al cerrar orchestrator:', stopError.message);
        }

        process.exit(1);
    }
}

// Ejecutar
testDepartmentsCRUD();
