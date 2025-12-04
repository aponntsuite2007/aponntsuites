/**
 * Script para ejecutar el Test Phase4 de Notificaciones
 *
 * Ejecuta CRUD completo con datos reales y escenarios de SLA
 *
 * Uso: node scripts/run-notification-phase4-test.js [--cleanup]
 */

const NotificationModuleCollector = require('../src/auditor/collectors/NotificationModuleCollector');

async function main() {
    const args = process.argv.slice(2);
    const shouldCleanup = args.includes('--cleanup');

    console.log('\n🚀 Iniciando Test Phase4 de Notificaciones...\n');

    const collector = new NotificationModuleCollector();

    try {
        const results = await collector.runAllTests();

        if (results.success) {
            console.log('✅ Todos los tests pasaron exitosamente!\n');
        } else {
            console.log('⚠️ Algunos tests fallaron. Revisar resultados.\n');
        }

        // Mostrar datos creados
        console.log('📦 Datos creados:');
        console.log(`   - Grupos de notificación: ${results.createdData.groups.length}`);
        console.log(`   - Mensajes: ${results.createdData.messages.length}`);
        console.log(`   - Empleados utilizados: ${results.createdData.employees.length}`);

        if (shouldCleanup) {
            await collector.cleanup();
            console.log('\n🧹 Datos de prueba eliminados.\n');
        } else {
            console.log('\n💡 Ejecuta con --cleanup para eliminar datos de prueba\n');
        }

        process.exit(results.success ? 0 : 1);

    } catch (error) {
        console.error('\n❌ Error ejecutando tests:', error);
        process.exit(1);
    }
}

main();
