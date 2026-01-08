/**
 * Actualizar DEV ticket - Marcar CK-12 completado (Integration Testing)
 */

const fs = require('fs');
const path = require('path');

const METADATA_PATH = path.join(__dirname, '../engineering-metadata.js');

async function updateDevTicket() {
  try {
    console.log('🔄 Actualizando DEV ticket DEV-E2E-ADVANCED-001 (CK-12)...\n');

    // Leer metadata
    const absolutePath = path.resolve(METADATA_PATH);
    delete require.cache[absolutePath];
    const metadata = require(absolutePath);

    const ticket = metadata.activeDevTickets['DEV-E2E-ADVANCED-001'];

    if (!ticket) {
      throw new Error('Ticket DEV-E2E-ADVANCED-001 no encontrado');
    }

    // 1. Marcar CK-12 como completado
    const ck12 = ticket.checklist.find(c => c.id === 'CK-12');
    if (ck12 && !ck12.done) {
      ck12.done = true;
      ck12.completedAt = new Date().toISOString();
      ck12.notes = 'Integration testing completado: archivo de tests (650+ líneas), validación del sistema (exitosa), todos los componentes verificados';
      console.log('✅ CK-12 marcado como completado (Integration Testing)');
    }

    // 2. Actualizar currentStep a CK-13
    ticket.currentStep = 'CK-13';
    console.log('📍 currentStep actualizado a CK-13 (DB Persistence)');

    // 3. Actualizar métricas
    ticket.metrics.completedTasks = ticket.checklist.filter(c => c.done).length;
    ticket.metrics.progressPercent = Math.round((ticket.metrics.completedTasks / ticket.metrics.totalTasks) * 100);
    console.log(`📊 Progreso: ${ticket.metrics.progressPercent}% (${ticket.metrics.completedTasks}/${ticket.metrics.totalTasks})`);

    // 4. Agregar session history
    ticket.sessionHistory.push({
      sessionId: `sess-${new Date().toISOString().split('T')[0]}-004`,
      startedAt: new Date().toISOString(),
      endedAt: null, // Sesión activa
      tasksCompleted: ['CK-12'],
      linesWritten: 650 + 300 + 100, // Integration tests (650L) + validación (300L) + fixes (100L)
      summary: 'Integration Testing (CK-12) completado: e2e-advanced-integration.test.js (650L, 7 suites de tests), validate-e2e-advanced-system.js (300L, validación exitosa), MasterTestOrchestrator actualizado con opciones configurables, jest.config.js y mocks creados, todos los componentes verificados funcionando correctamente. PRÓXIMO: DB Persistence (CK-13).'
    });
    console.log('📜 Session history actualizado');

    // 5. Actualizar nextSteps
    ticket.nextSteps = [
      '1. DB PERSISTENCE (CK-13):',
      '   - Verificar migración e2e_advanced_executions existe',
      '   - Verificar migración confidence_scores existe',
      '   - Verificar modelo E2EAdvancedExecution registrado',
      '   - Verificar modelo ConfidenceScore registrado',
      '   - Crear test de persistencia: guardar ejecución en DB',
      '   - Crear test de persistencia: recuperar ejecuciones desde dashboard',
      '   - Crear test de persistencia: confidence score persistence',
      '   - Ejecutar test de persistencia y verificar que pasen',
      '',
      '2. FINALIZAR Y DOCUMENTAR:',
      '   - Ejecutar test suite completo (todas las phases con servidor real)',
      '   - Verificar confidence score >= 90% en ejecución real',
      '   - Marcar DEV ticket como COMPLETE',
      '   - Actualizar skill actualiza-ingenieria con resumen final',
      '   - Documentar sistema en README',
      '   - Crear guía de uso para nuevos módulos'
    ];
    console.log('🚀 nextSteps actualizado con pasos para CK-13 y finalización');

    // 6. Actualizar context
    ticket.context.totalLinesImplemented = 5376 + 650 + 300 + 100; // Phases + API + Dashboard + Integration tests + validation
    console.log(`📝 totalLinesImplemented: ${ticket.context.totalLinesImplemented}`);

    // 7. Agregar archivos nuevos creados
    if (!ticket.filesInvolved.includes('backend/tests/e2e-advanced-integration.test.js')) {
      ticket.filesInvolved.push(
        'backend/tests/e2e-advanced-integration.test.js',
        'backend/scripts/validate-e2e-advanced-system.js',
        'backend/jest.config.js',
        'backend/tests/__mocks__/faker.js'
      );
    }

    // 8. Actualizar updatedAt
    ticket.updatedAt = new Date().toISOString();

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
    console.log(`   Próxima tarea: ${ticket.checklist.find(c => c.id === 'CK-13').task}\n`);
    console.log('💡 Ver estado:');
    console.log('   node backend/scripts/read-active-tickets.js --resume\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateDevTicket();
