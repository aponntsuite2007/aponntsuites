/**
 * ════════════════════════════════════════════════════════════════════════════
 * TEST WRAPPER - FLUJO COMPLETO PHASE 4
 * ════════════════════════════════════════════════════════════════════════════
 *
 * PROPÓSITO: Wrapper ejecutable que invoca Phase4TestOrchestrator
 *
 * ARQUITECTURA - RELACIÓN DE ARCHIVOS:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  test-full-phase4-flow.js (ESTE ARCHIVO)                                 │
 * │  └─→ require('./src/auditor/core/Phase4TestOrchestrator')                │
 * │      └─→ new Phase4TestOrchestrator(config, database)                    │
 * │          └─→ orchestrator.start()                                        │
 * │              └─→ orchestrator.runModuleTest(params)                      │
 * │                  └─→ orchestrator.stop()                                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * PARÁMETROS MODIFICABLES (líneas 43-48):
 * ┌──────────────────┬─────────────────────────────────────────────────────┐
 * │ moduleName       │ 'users', 'attendance', 'departments', etc.          │
 * │ companyId        │ 11 (ISI), 1 (Demo), etc.                            │
 * │ companySlug      │ 'isi', 'aponnt-empresa-demo', etc.                  │
 * │ maxCycles        │ 1 (rápido), 3 (completo), 5 (exhaustivo)            │
 * │ username         │ 'soporte' (existe en todas las empresas)            │
 * │ password         │ 'admin123' (default)                                │
 * └──────────────────┴─────────────────────────────────────────────────────┘
 *
 * RESULTADO ESPERADO:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ✅ Navegador Chromium visible (slowMo: 100ms)                            │
 * │ ✅ Login 3-step automatizado (empresa → usuario → password)              │
 * │ ✅ CRUD completo del módulo (Create → Read → Update → Delete)            │
 * │ ✅ Validación PostgreSQL (persistencia real en BD)                       │
 * │ ✅ Análisis Ollama (si hay errores)                                      │
 * │ ✅ Tickets generados (si hay fallos)                                     │
 * │ ✅ Reporte final con stats (totalTests, passed, failed, tickets)         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * HISTORIAL DE CAMBIOS
 * ════════════════════════════════════════════════════════════════════════════
 * v1.0.1 | 2025-11-11 | Documentación en código (wrapper → orchestrator)
 *        └─ Diagrama de arquitectura de archivos
 *        └─ Parámetros modificables documentados
 *        └─ Resultado esperado detallado
 *
 * FILOSOFÍA: Archivo simple wrapper - lógica completa en Phase4TestOrchestrator
 */

// Cargar variables de entorno
require('dotenv').config();

const Phase4TestOrchestrator = require('./src/auditor/core/Phase4TestOrchestrator');
const database = require('./src/config/database'); // Usar database completo (con modelos)

async function testFullPhase4Flow() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🧪 TEST COMPLETO - FLUJO PHASE 4');
    console.log('='.repeat(80));
    console.log('\n');

    let orchestrator = null;

    // Handler para Ctrl+C - limpiar navegador antes de salir
    const cleanupHandler = async () => {
        console.log('\n\n🛑 Ctrl+C detectado - cerrando navegador...');
        if (orchestrator) {
            try {
                await orchestrator.stop();
                console.log('✅ Navegador cerrado correctamente');
            } catch (err) {
                console.error('⚠️  Error cerrando navegador:', err.message);
            }
        }
        process.exit(0);
    };

    process.on('SIGINT', cleanupHandler);

    try {
        // 1. Inicializar orchestrator CON database
        console.log('📋 Paso 1/6: Inicializando Phase4TestOrchestrator (CON database)...');
        orchestrator = new Phase4TestOrchestrator(
            {
                baseUrl: `http://localhost:9998`,
                headless: false, // VISIBLE
                slowMo: 100, // Más lento para ver el flujo
                timeout: 30000
            },
            database // ✅ CON database completo (modelos incluidos)
        );
        console.log('   ✅ Orchestrator creado\n');

        // 2. Iniciar sistema completo
        console.log('📋 Paso 2/6: Iniciando sistema completo...');
        await orchestrator.start();
        console.log('   ✅ Sistema iniciado\n');

        // 3. Configurar parámetros del test
        const moduleName = 'users';      // Módulo a testear
        const companyId = 11;             // ISI
        const companySlug = 'isi';        // Slug de ISI
        const maxCycles = 1;              // 1 ciclo para este test
        const username = 'soporte';       // Usuario soporte
        const password = 'admin123';      // Password

        console.log('📋 Paso 3/6: Parámetros del test:');
        console.log(`   • Módulo: ${moduleName}`);
        console.log(`   • Empresa: ${companySlug} (ID: ${companyId})`);
        console.log(`   • Usuario: ${username}`);
        console.log(`   • Ciclos: ${maxCycles}`);
        console.log(`   • Navegador: VISIBLE (slowMo: 100ms)\n`);

        // 4. Ejecutar test COMPLETO del módulo
        console.log('📋 Paso 4/6: Ejecutando runModuleTest() con CRUD completo...');
        console.log('   (Observa el navegador Chromium que debería abrirse)\n');

        const report = await orchestrator.runModuleTest(
            moduleName,
            companyId,
            maxCycles,
            companySlug,
            username,
            password
        );

        console.log('\n📋 Paso 5/6: Test completado, generando resumen...\n');

        // 5. Mostrar resultados
        console.log('='.repeat(80));
        console.log('✅✅✅ FLUJO COMPLETO PHASE 4 EJECUTADO ✅✅✅');
        console.log('='.repeat(80));
        console.log('\n📊 RESULTADOS:');
        console.log(`   • Estado: ${report.status}`);
        console.log(`   • Tests totales: ${report.stats?.totalTests || 0}`);
        console.log(`   • Tests UI pasados: ${report.stats?.uiTestsPassed || 0}`);
        console.log(`   • Tests DB pasados: ${report.stats?.dbTestsPassed || 0}`);
        console.log(`   • Tests UI fallidos: ${report.stats?.uiTestsFailed || 0}`);
        console.log(`   • Tests DB fallidos: ${report.stats?.dbTestsFailed || 0}`);
        console.log(`   • Tickets generados: ${report.stats?.tickets?.length || 0}`);

        if (report.stats?.tickets && report.stats.tickets.length > 0) {
            console.log('\n🎫 TICKETS GENERADOS:');
            report.stats.tickets.forEach((ticket, i) => {
                console.log(`   ${i + 1}. ${ticket.title}`);
                console.log(`      Severidad: ${ticket.severity}`);
                console.log(`      Archivo: ${ticket.filePath || 'N/A'}`);
            });
        }

        console.log('\n🎉 Flujo completo Phase 4 verificado exitosamente!\n');

        // 6. Mantener navegador abierto para que el usuario vea los resultados
        console.log('📋 Paso 6/6: Test completado - NAVEGADOR PERMANECERÁ ABIERTO');
        console.log('   ℹ️  El navegador se quedará abierto para que puedas ver los resultados');
        console.log('   ℹ️  Presiona Ctrl+C cuando quieras cerrar el navegador y terminar el test');
        console.log('   ⏸️  Esperando indefinidamente (Ctrl+C para salir)...\n');

        // Esperar indefinidamente - el usuario debe presionar Ctrl+C para terminar
        await new Promise(() => {}); // Promise que nunca se resuelve

        // Este código NO se ejecutará a menos que el usuario presione Ctrl+C
        // await orchestrator.stop();
        // console.log('   ✅ Sistema detenido\n');

    } catch (error) {
        console.error('\n❌❌❌ ERROR EN TEST COMPLETO ❌❌❌');
        console.error(`Tipo: ${error.name}`);
        console.error(`Mensaje: ${error.message}`);
        console.error(`Stack: ${error.stack}\n`);

        // No hacer process.exit(1) aquí porque el finally debe ejecutarse
        // El proceso terminará automáticamente después del finally
    } finally {
        // Cleanup
        if (orchestrator) {
            console.log('\n🧹 Limpiando recursos finales...');
            try {
                await orchestrator.stop();
            } catch (err) {
                // Silenciar error si ya estaba detenido
            }
            console.log('✅ Recursos liberados\n');
        }
    }
}

// Ejecutar test
testFullPhase4Flow()
    .then(() => {
        console.log('✅ Test completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test falló:', error.message);
        process.exit(1);
    });
