/**
 * OLLAMA TICKET REPORTER - Crea tickets cuando encuentra errores
 *
 * Este componente se ejecuta DESPUÉS de cada ciclo de testing de Ollama
 * y crea tickets en la BD para que Claude Code los repare.
 *
 * FLUJO:
 * 1. Ollama ejecuta tests → encuentra errores
 * 2. OllamaTicketReporter analiza errores
 * 3. Crea tickets en BD (testing_tickets)
 * 4. Actualiza .claude-notifications/latest-report.json
 * 5. Claude Code lee el archivo al abrir sesión
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

const fs = require('fs');
const path = require('path');

class OllamaTicketReporter {
  constructor(database, websocket = null) {
    this.database = database;
    this.websocket = websocket;
    this.notificationsDir = path.join(__dirname, '../../../.claude-notifications');
    this.reportFile = path.join(this.notificationsDir, 'latest-report.json');

    // Crear directorio si no existe
    if (!fs.existsSync(this.notificationsDir)) {
      fs.mkdirSync(this.notificationsDir, { recursive: true });
    }

    console.log('🎫 [TICKET-REPORTER] Inicializado');

    if (this.websocket) {
      console.log('🎫 [TICKET-REPORTER] WebSocket integrado - Notificaciones en tiempo real ACTIVAS');
    }
  }

  /**
   * FUNCIÓN PRINCIPAL: Analizar resultados de tests y crear tickets
   *
   * @param {Object} testResults - Resultados del ciclo de testing
   * @param {Array} testResults.failures - Tests que fallaron
   * @param {Object} testResults.stats - Estadísticas generales
   */
  async processTestResults(testResults) {
    const { failures, stats } = testResults;

    console.log(`\n🎫 [TICKET-REPORTER] Procesando ${failures.length} errores...`);

    const ticketsCreated = [];

    for (const failure of failures) {
      try {
        // Verificar si ya existe ticket para este error
        const existingTicket = await this.findExistingTicket(failure);

        if (existingTicket) {
          console.log(`   ⏭️  Ticket ya existe: ${existingTicket.ticket_number}`);

          // Si el ticket está cerrado pero el error sigue, reabrirlo
          if (existingTicket.status === 'CLOSED') {
            await this.reopenTicket(existingTicket, failure);
            ticketsCreated.push(existingTicket);
          }

          continue;
        }

        // Crear nuevo ticket
        const ticket = await this.createTicket(failure);
        ticketsCreated.push(ticket);

        console.log(`   ✅ Ticket creado: ${ticket.ticket_number} [${ticket.priority}]`);
      } catch (error) {
        console.error(`   ❌ Error creando ticket:`, error.message);
      }
    }

    // Actualizar archivo de notificaciones para Claude Code
    await this.updateNotificationFile(ticketsCreated);

    console.log(`\n🎫 [TICKET-REPORTER] ${ticketsCreated.length} tickets procesados`);

    // Notificar vía WebSocket si está disponible
    if (this.websocket && ticketsCreated.length > 0) {
      this.websocket.notifyTicketsCreated({
        count: ticketsCreated.length,
        tickets: ticketsCreated.map(t => ({
          ticket_number: t.ticket_number,
          priority: t.priority,
          module: t.module_name,
          error: t.error_message
        })),
        message: `${ticketsCreated.length} nuevos tickets creados`
      });

      console.log(`📡 [WEBSOCKET] Notificación enviada a Claude Code`);
    }

    return {
      ticketsCreated: ticketsCreated.length,
      tickets: ticketsCreated
    };
  }

  /**
   * Buscar si ya existe un ticket para este error
   */
  async findExistingTicket(failure) {
    const { sequelize } = this.database;

    const [results] = await sequelize.query(`
      SELECT *
      FROM testing_tickets
      WHERE module_name = :moduleName
        AND error_message = :errorMessage
        AND status IN ('PENDING_REPAIR', 'IN_REPAIR', 'FIXED', 'RETESTING', 'CLOSED')
      ORDER BY created_at DESC
      LIMIT 1
    `, {
      replacements: {
        moduleName: failure.module || failure.moduleName || 'unknown',
        errorMessage: failure.error_message || failure.errorMessage || failure.message
      }
    });

    return results[0] || null;
  }

  /**
   * Crear nuevo ticket en BD
   */
  async createTicket(failure) {
    const { sequelize } = this.database;

    // Generar número de ticket
    const [[{ ticket_number }]] = await sequelize.query(`
      SELECT generate_ticket_number() AS ticket_number
    `);

    // Determinar prioridad basada en el tipo de error
    const priority = this.determinePriority(failure);

    // Insertar ticket
    const [result] = await sequelize.query(`
      INSERT INTO testing_tickets (
        ticket_number,
        status,
        priority,
        module_name,
        error_type,
        error_message,
        error_stack,
        error_details,
        file_path,
        line_number,
        function_name,
        test_name,
        test_type,
        test_context,
        created_by,
        assigned_to
      ) VALUES (
        :ticketNumber,
        'PENDING_REPAIR',
        :priority,
        :moduleName,
        :errorType,
        :errorMessage,
        :errorStack,
        :errorDetails::jsonb,
        :filePath,
        :lineNumber,
        :functionName,
        :testName,
        :testType,
        :testContext::jsonb,
        'ollama-auditor',
        'claude-code'
      )
      RETURNING *
    `, {
      replacements: {
        ticketNumber: ticket_number,
        priority,
        moduleName: failure.module || failure.moduleName || 'unknown',
        errorType: failure.error_type || this.classifyErrorType(failure),
        errorMessage: failure.error_message || failure.errorMessage || failure.message,
        errorStack: failure.error_stack || failure.stack || null,
        errorDetails: JSON.stringify(failure.details || {}),
        filePath: failure.file_path || failure.filePath || null,
        lineNumber: failure.line_number || failure.lineNumber || null,
        functionName: failure.function_name || failure.functionName || null,
        testName: failure.test_name || failure.testName || null,
        testType: failure.test_type || failure.testType || 'frontend',
        testContext: JSON.stringify(failure.context || {})
      }
    });

    return result[0];
  }

  /**
   * Reabrir ticket que estaba cerrado
   */
  async reopenTicket(ticket, failure) {
    const { sequelize } = this.database;

    await sequelize.query(`
      UPDATE testing_tickets
      SET
        status = 'REOPENED',
        retest_count = retest_count + 1,
        updated_at = NOW(),
        last_message = :message,
        conversation_log = conversation_log || :newMessage::jsonb
      WHERE ticket_number = :ticketNumber
    `, {
      replacements: {
        ticketNumber: ticket.ticket_number,
        message: `Error volvió a ocurrir después de fix. Re-test count: ${ticket.retest_count + 1}`,
        newMessage: JSON.stringify([{
          timestamp: new Date().toISOString(),
          from: 'ollama-auditor',
          message: `Error detectado nuevamente en testing`,
          error: failure.error_message || failure.message
        }])
      }
    });

    console.log(`   🔄 Ticket reabierto: ${ticket.ticket_number}`);
  }

  /**
   * Determinar prioridad del ticket
   */
  determinePriority(failure) {
    const errorMessage = (failure.error_message || failure.message || '').toLowerCase();

    // Critical: Errores que bloquean funcionalidad principal
    if (
      errorMessage.includes('cannot read') ||
      errorMessage.includes('undefined is not') ||
      errorMessage.includes('500') ||
      errorMessage.includes('fatal') ||
      errorMessage.includes('crash')
    ) {
      return 'critical';
    }

    // High: Errores que afectan UX
    if (
      errorMessage.includes('modal') ||
      errorMessage.includes('button') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('404')
    ) {
      return 'high';
    }

    // Medium: Errores cosméticos o de validación
    if (
      errorMessage.includes('warning') ||
      errorMessage.includes('validation')
    ) {
      return 'medium';
    }

    // Low: Todo lo demás
    return 'low';
  }

  /**
   * Clasificar tipo de error
   */
  classifyErrorType(failure) {
    const errorMessage = (failure.error_message || failure.message || '').toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network_error';
    }

    if (errorMessage.includes('http') || /\d{3}/.test(errorMessage)) {
      return 'http_error';
    }

    if (
      errorMessage.includes('undefined') ||
      errorMessage.includes('null') ||
      errorMessage.includes('is not a function')
    ) {
      return 'js_error';
    }

    return 'unknown_error';
  }

  /**
   * Actualizar archivo de notificaciones para Claude Code
   *
   * Este archivo se lee cuando Claude Code inicia una sesión
   */
  async updateNotificationFile(tickets) {
    const { sequelize } = this.database;

    // Obtener todos los tickets pendientes (no solo los recién creados)
    const [pendingTickets] = await sequelize.query(`
      SELECT ticket_number, priority, module_name, error_message,
             file_path, line_number, created_at
      FROM testing_tickets
      WHERE status IN ('PENDING_REPAIR', 'REOPENED', 'IN_REPAIR')
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at ASC
      LIMIT 50
    `);

    // Contar por prioridad
    const criticalCount = pendingTickets.filter(t => t.priority === 'critical').length;
    const highCount = pendingTickets.filter(t => t.priority === 'high').length;

    // Crear reporte para Claude Code
    const report = {
      generated_at: new Date().toISOString(),
      pending_tickets_count: pendingTickets.length,
      critical_count: criticalCount,
      high_count: highCount,
      tickets: pendingTickets.map(t => ({
        ticket_number: t.ticket_number,
        priority: t.priority,
        module: t.module_name,
        error: t.error_message,
        file: t.file_path ? `${t.file_path}:${t.line_number || '?'}` : 'unknown',
        created_at: t.created_at
      })),
      message_for_claude: this.generateMessageForClaude(pendingTickets)
    };

    // Escribir archivo
    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));

    console.log(`\n📝 [NOTIFICATION] Archivo actualizado: ${this.reportFile}`);
    console.log(`   Tickets pendientes: ${pendingTickets.length}`);
    console.log(`   Critical: ${criticalCount}, High: ${highCount}`);
  }

  /**
   * Generar mensaje personalizado para Claude Code
   */
  generateMessageForClaude(tickets) {
    if (tickets.length === 0) {
      return '✅ No hay tickets pendientes. El sistema está funcionando correctamente.';
    }

    const criticalCount = tickets.filter(t => t.priority === 'critical').length;
    const highCount = tickets.filter(t => t.priority === 'high').length;

    let message = `🎫 Hay ${tickets.length} tickets pendientes de reparación:\n\n`;

    if (criticalCount > 0) {
      message += `⚠️  ${criticalCount} CRITICAL - Requieren atención inmediata\n`;
    }

    if (highCount > 0) {
      message += `⚡ ${highCount} HIGH - Afectan experiencia de usuario\n`;
    }

    message += `\nPara iniciar la reparación automática, ejecuta:\n`;
    message += `node claude-ticket-processor.js\n\n`;
    message += `O revisa los tickets manualmente en:\n`;
    message += `SELECT * FROM testing_tickets WHERE status = 'PENDING_REPAIR' ORDER BY priority;`;

    return message;
  }

  /**
   * Obtener estadísticas de tickets
   */
  async getStats() {
    const { sequelize } = this.database;

    const [stats] = await sequelize.query(`
      SELECT * FROM get_ticket_stats()
    `);

    return stats[0];
  }
}

module.exports = OllamaTicketReporter;
