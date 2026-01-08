/**
 * Actualizar DEV ticket - Marcar CK-8 completado y preparar CK-9
 */

const fs = require('fs');
const path = require('path');

const METADATA_PATH = path.join(__dirname, '../engineering-metadata.js');

async function updateDevTicket() {
    try {
        console.log('🔄 Actualizando DEV ticket DEV-E2E-ADVANCED-001...\n');

        // Leer metadata
        const absolutePath = path.resolve(METADATA_PATH);
        delete require.cache[absolutePath];
        const metadata = require(absolutePath);

        const ticket = metadata.activeDevTickets['DEV-E2E-ADVANCED-001'];

        if (!ticket) {
            throw new Error('Ticket DEV-E2E-ADVANCED-001 no encontrado');
        }

        // 1. Marcar CK-8 como completado
        const ck8 = ticket.checklist.find(c => c.id === 'CK-8');
        if (ck8 && !ck8.done) {
            ck8.done = true;
            ck8.completedAt = new Date().toISOString();
            console.log('✅ CK-8 marcado como completado');
        }

        // 2. Actualizar currentStep a CK-9
        ticket.currentStep = 'CK-9';
        console.log('📍 currentStep actualizado a CK-9 (MasterTestOrchestrator)');

        // 3. Actualizar métricas
        ticket.metrics.completedTasks = ticket.checklist.filter(c => c.done).length;
        ticket.metrics.progressPercent = Math.round((ticket.metrics.completedTasks / ticket.metrics.totalTasks) * 100);
        console.log(`📊 Progreso: ${ticket.metrics.progressPercent}% (${ticket.metrics.completedTasks}/${ticket.metrics.totalTasks})`);

        // 4. Agregar session history
        ticket.sessionHistory.push({
            sessionId: `sess-${new Date().toISOString().split('T')[0]}-002`,
            startedAt: new Date().toISOString(),
            endedAt: null, // Sesión activa
            tasksCompleted: ['CK-8'],
            linesWritten: 1475, // 350 test script + 575 devTicketsRoutes + 350 read-active-tickets + 200 init script
            summary: 'Sistema DEV Tickets implementado (1,125 líneas): API REST completa, script CLI helper, ticket inicial creado. Script test-individual-phases.js creado (350 líneas). Validadas 7 phases: todas cargan OK, implementan PhaseInterface correctamente. Score: 100/100. PRÓXIMO: Implementar MasterTestOrchestrator.'
        });
        console.log('📜 Session history actualizado');

        // 5. Actualizar nextSteps con instrucciones DETALLADAS para MasterTestOrchestrator
        ticket.nextSteps = [
            '1. Crear backend/src/testing/e2e-advanced/MasterTestOrchestrator.js',
            '2. Constructor: recibe database y opciones (onProgress callback)',
            '3. Método registerPhase(phase): registra las 7 phases',
            '4. Método runFullSuite(modules, options): ejecuta todas las phases en orden',
            '5. Método runPhase(phaseName, modules, options): ejecuta phase específica',
            '6. Gestión de dependencias: LoadPhase → E2EPhase debe completarse primero',
            '7. Progress reporting: callback onProgress con updates en tiempo real',
            '8. Cálculo de confidence score agregado: weighted average de las 7 phases',
            '9. Fórmula: e2e(25%) + load(15%) + security(20%) + multiTenant(15%) + database(10%) + monitoring(5%) + edgeCases(10%)',
            '10. Persistencia: guardar ejecución en PostgreSQL (tabla test_executions)',
            '11. Status determination: passed si score >= 90, warning si >= 70, failed si < 70',
            '12. Error handling: si una phase falla, continuar con las demás',
            '13. Testear con: node backend/scripts/test-orchestrator.js'
        ];
        console.log('🚀 nextSteps actualizado con 13 pasos detallados');

        // 6. Actualizar context
        ticket.context.totalLinesImplemented = 3895; // 3545 phases + 350 testing script
        console.log(`📝 totalLinesImplemented: ${ticket.context.totalLinesImplemented}`);

        // 7. Escribir de vuelta a metadata
        let content = fs.readFileSync(METADATA_PATH, 'utf-8');
        const ticketsString = `activeDevTickets: ${JSON.stringify(metadata.activeDevTickets, null, 2)}`;
        const activeDevTicketsRegex = /activeDevTickets:\s*\{[\s\S]*?\n\s*\}(?=\s*\n\};)/;

        if (activeDevTicketsRegex.test(content)) {
            content = content.replace(activeDevTicketsRegex, ticketsString);
        }

        fs.writeFileSync(METADATA_PATH, content, 'utf-8');

        console.log('\n✅ DEV ticket actualizado exitosamente!\n');
        console.log('📊 Estado actual:');
        console.log(`   Progreso: ${ticket.metrics.progressPercent}%`);
        console.log(`   Líneas implementadas: ${ticket.context.totalLinesImplemented}`);
        console.log(`   Próxima tarea: ${ticket.checklist.find(c => c.id === 'CK-9').task}\n`);
        console.log('💡 Ver estado:');
        console.log('   node backend/scripts/read-active-tickets.js --resume\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updateDevTicket();
