/**
 * Actualizar DEV ticket - Marcar CK-11 completado (Dashboard)
 */

const fs = require('fs');
const path = require('path');

const METADATA_PATH = path.join(__dirname, '../engineering-metadata.js');

async function updateDevTicket() {
    try {
        console.log('🔄 Actualizando DEV ticket DEV-E2E-ADVANCED-001 (CK-11)...\n');

        // Leer metadata
        const absolutePath = path.resolve(METADATA_PATH);
        delete require.cache[absolutePath];
        const metadata = require(absolutePath);

        const ticket = metadata.activeDevTickets['DEV-E2E-ADVANCED-001'];

        if (!ticket) {
            throw new Error('Ticket DEV-E2E-ADVANCED-001 no encontrado');
        }

        // 1. Marcar CK-10 como completado (API REST - ya existía)
        const ck10 = ticket.checklist.find(c => c.id === 'CK-10');
        if (ck10 && !ck10.done) {
            ck10.done = true;
            ck10.completedAt = new Date().toISOString();
            ck10.notes = 'API REST ya existía completamente implementada (681 líneas)';
            console.log('✅ CK-10 marcado como completado (API REST)');
        }

        // 2. Marcar CK-11 como completado (Dashboard)
        const ck11 = ticket.checklist.find(c => c.id === 'CK-11');
        if (ck11 && !ck11.done) {
            ck11.done = true;
            ck11.completedAt = new Date().toISOString();
            ck11.notes = 'Dashboard completo con 8 tabs (overview + 7 phases), WebSocket real-time, Chart.js, integración en panel-empresa.html';
            console.log('✅ CK-11 marcado como completado (Dashboard)');
        }

        // 3. Actualizar currentStep a CK-12
        ticket.currentStep = 'CK-12';
        console.log('📍 currentStep actualizado a CK-12 (Integration Testing)');

        // 4. Actualizar métricas
        ticket.metrics.completedTasks = ticket.checklist.filter(c => c.done).length;
        ticket.metrics.progressPercent = Math.round((ticket.metrics.completedTasks / ticket.metrics.totalTasks) * 100);
        console.log(`📊 Progreso: ${ticket.metrics.progressPercent}% (${ticket.metrics.completedTasks}/${ticket.metrics.totalTasks})`);

        // 5. Agregar session history
        ticket.sessionHistory.push({
            sessionId: `sess-${new Date().toISOString().split('T')[0]}-003`,
            startedAt: new Date().toISOString(),
            endedAt: null, // Sesión activa
            tasksCompleted: ['CK-10', 'CK-11'],
            linesWritten: 1150 + 100, // Dashboard (1,150L) + integración HTML (100L)
            summary: 'E2E Advanced Dashboard implementado: 8 tabs (overview + 7 phases), WebSocket real-time, Chart.js, historial ejecuciones, confidence score viz, drill-down por módulo/phase, export functionality. Integrado en panel-empresa.html. API REST verificada (681L ya existía). PRÓXIMO: Integration testing + DB persistence.'
        });
        console.log('📜 Session history actualizado');

        // 6. Actualizar nextSteps con tareas restantes
        ticket.nextSteps = [
            '1. INTEGRATION TESTING (CK-12):',
            '   - Crear backend/tests/e2e-advanced-integration.test.js',
            '   - Test 1: Ejecutar suite completo con módulo "users"',
            '   - Test 2: Verificar WebSocket envía progress updates',
            '   - Test 3: Verificar API REST /api/e2e-advanced/run funciona',
            '   - Test 4: Verificar persistence en PostgreSQL',
            '   - Test 5: Verificar confidence score calculation (weights correcto)',
            '   - Test 6: Verificar dashboard renderiza resultados',
            '   - Test 7: End-to-end completo (API → WS → DB → Dashboard)',
            '',
            '2. DB PERSISTENCE (CK-13):',
            '   - Verificar migración test_executions existe',
            '   - Verificar modelo TestExecution registrado',
            '   - Test guardar ejecución en DB',
            '   - Test recuperar ejecuciones desde dashboard',
            '   - Test confidence score persistence',
            '',
            '3. FINALIZAR Y DOCUMENTAR:',
            '   - Ejecutar test suite completo (todas las phases)',
            '   - Verificar confidence score >= 90%',
            '   - Marcar DEV ticket como COMPLETE',
            '   - Actualizar skill actualiza-ingenieria con resumen final'
        ];
        console.log('🚀 nextSteps actualizado con 13 pasos para CK-12 y CK-13');

        // 7. Actualizar context
        ticket.context.totalLinesImplemented = 3545 + 681 + 1150; // Phases + API + Dashboard
        console.log(`📝 totalLinesImplemented: ${ticket.context.totalLinesImplemented}`);

        // 8. Agregar archivos nuevos creados
        ticket.filesInvolved.push(
            'backend/src/testing/e2e-advanced/dashboard/e2e-advanced-dashboard.js',
            'backend/public/panel-empresa.html (integración dashboard)'
        );

        // 9. Escribir de vuelta a metadata
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
        console.log(`   Próxima tarea: ${ticket.checklist.find(c => c.id === 'CK-12').task}\n`);
        console.log('💡 Ver estado:');
        console.log('   node backend/scripts/read-active-tickets.js --resume\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updateDevTicket();
