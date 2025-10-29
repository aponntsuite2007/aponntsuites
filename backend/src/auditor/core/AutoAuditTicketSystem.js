/**
 * AUTO AUDIT TICKET SYSTEM
 *
 * Sistema de tickets automáticos para errores de auditoría.
 * Circuito cerrado: Auditor → Ticket → Ollama → Claude Code → Fix → Re-test
 *
 * Características:
 * - Tickets únicos (AUDIT-2025-000001)
 * - Sin intervención humana
 * - No escala a supervisor
 * - Thread de conversación automática con Ollama + Claude Code
 * - Re-test automático después de cada fix
 * - Máximo 3 intentos de reparación
 * - Visible en panel-administrativo
 *
 * @version 1.0.0
 * @date 2025-01-23
 */

const database = require('../../config/database');
const { SupportTicketV2, SupportTicketMessage, User, Company } = database;
const OllamaAnalyzer = require('./OllamaAnalyzer');
const ClaudeCodeRepairAgent = require('./ClaudeCodeRepairAgent');

class AutoAuditTicketSystem {
  constructor() {
    this.ollamaAnalyzer = new OllamaAnalyzer();
    this.claudeRepairAgent = new ClaudeCodeRepairAgent();
    this.systemUserId = null; // Usuario "Auditor System"
    this.maxRepairAttempts = 3;
  }

  /**
   * Inicializar: Crear usuario "Auditor System" si no existe
   */
  async init() {
    try {
      // Buscar o crear usuario "Auditor System"
      let systemUser = await User.findOne({
        where: { email: 'auditor-system@aponnt.internal' },
        attributes: ['user_id', 'email', 'firstName', 'lastName', 'role']
      });

      if (!systemUser) {
        systemUser = await User.create({
          company_id: 1, // Aponnt
          email: 'auditor-system@aponnt.internal',
          password: 'N/A', // No tiene password real
          firstName: 'Auditor',
          lastName: 'System',
          role: 'support', // Rol de soporte para poder ser asignado a tickets
          is_active: true,
          phone: '000000000'
        });
        console.log('✅ [AUTO-AUDIT] Usuario "Auditor System" creado');
      }

      this.systemUserId = systemUser.user_id;
      console.log(`✅ [AUTO-AUDIT] Sistema inicializado - User ID: ${this.systemUserId}`);
    } catch (error) {
      console.error('❌ [AUTO-AUDIT] Error inicializando sistema:', error);
    }
  }

  /**
   * Crear ticket automático de auditoría
   *
   * @param {Object} errorData - Datos del error detectado
   * @param {String} errorData.execution_id - ID de ejecución de auditoría
   * @param {String} errorData.module_name - Módulo con error
   * @param {Array} errorData.errors - Lista de errores detectados
   * @param {Object} errorData.error_context - Contexto completo del error
   * @param {Number} errorData.company_id - ID de empresa afectada
   */
  async createAutoTicket(errorData) {
    try {
      const { execution_id, module_name, errors, error_context, company_id } = errorData;

      if (!this.systemUserId) {
        await this.init();
      }

      // Generar número único de ticket AUDIT-2025-000001
      const ticketNumber = await this.generateAuditTicketNumber();

      // Formatear descripción detallada
      const description = this.formatErrorDescription(module_name, errors, error_context);

      // Crear ticket
      const ticket = await SupportTicketV2.create({
        ticket_number: ticketNumber,
        company_id: company_id,
        created_by_user_id: this.systemUserId, // Creado por Auditor System
        module_name: 'auditor',
        module_display_name: 'Sistema de Auditoría',
        subject: `Error automático detectado en módulo: ${module_name}`,
        description: description,
        priority: 'high', // Siempre alta prioridad
        status: 'in_progress', // Automáticamente en progreso
        assigned_to_vendor_id: this.systemUserId, // Asignado a sí mismo
        assigned_at: new Date(),
        allow_support_access: false, // No requiere acceso temporal
        // Campos específicos de auditoría
        assistant_attempted: true,
        assistant_resolved: false
      });

      console.log(`🎫 [AUTO-AUDIT] Ticket creado: ${ticketNumber} para módulo ${module_name}`);

      // Mensaje inicial con detalles completos
      await SupportTicketMessage.create({
        ticket_id: ticket.ticket_id,
        user_id: this.systemUserId,
        user_role: 'support',
        message: this.formatInitialMessage(execution_id, module_name, errors, error_context),
        is_internal: false
      });

      // Iniciar proceso de análisis y reparación automática
      await this.startAutoRepairProcess(ticket.ticket_id, errorData);

      return ticket;
    } catch (error) {
      console.error('❌ [AUTO-AUDIT] Error creando ticket automático:', error);
      throw error;
    }
  }

  /**
   * Generar número único de ticket de auditoría
   */
  async generateAuditTicketNumber() {
    const year = new Date().getFullYear();

    // Buscar último ticket AUDIT del año
    const lastTicket = await SupportTicketV2.findOne({
      where: {
        ticket_number: {
          [database.sequelize.Sequelize.Op.like]: `AUDIT-${year}-%`
        }
      },
      order: [['created_at', 'DESC']]
    });

    let nextNumber = 1;
    if (lastTicket) {
      const match = lastTicket.ticket_number.match(/AUDIT-\d{4}-(\d{6})/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `AUDIT-${year}-${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Formatear descripción del error
   */
  formatErrorDescription(module_name, errors, error_context) {
    let description = `# Error Automático Detectado\n\n`;
    description += `**Módulo afectado:** ${module_name}\n\n`;
    description += `## Errores Detectados\n\n`;

    errors.forEach((error, index) => {
      description += `### ${index + 1}. ${error.test}\n`;
      description += `- **Error:** ${error.error}\n`;
      if (error.suggestion) {
        description += `- **Sugerencia:** ${error.suggestion}\n`;
      }
      description += `\n`;
    });

    if (error_context) {
      if (error_context.http_errors && error_context.http_errors.length > 0) {
        description += `## Errores HTTP\n\n`;
        error_context.http_errors.forEach(err => {
          description += `- ${err.status} ${err.statusText}: ${err.url}\n`;
        });
        description += `\n`;
      }

      if (error_context.console_errors && error_context.console_errors.length > 0) {
        description += `## Errores de Consola\n\n`;
        error_context.console_errors.forEach(err => {
          description += `- ${err.message}\n`;
        });
        description += `\n`;
      }

      if (error_context.network_errors && error_context.network_errors.length > 0) {
        description += `## Errores de Red\n\n`;
        error_context.network_errors.forEach(err => {
          description += `- ${err.error}: ${err.url}\n`;
        });
        description += `\n`;
      }
    }

    description += `---\n\n`;
    description += `**Sistema:** Ticket automático generado por el sistema de auditoría.\n`;
    description += `**Proceso:** Ollama analizará este error y Claude Code intentará repararlo automáticamente.\n`;

    return description;
  }

  /**
   * Formatear mensaje inicial con contexto completo
   */
  formatInitialMessage(execution_id, module_name, errors, error_context) {
    let message = `🤖 **Ticket de Auditoría Automática**\n\n`;
    message += `**Execution ID:** ${execution_id}\n`;
    message += `**Módulo:** ${module_name}\n`;
    message += `**Timestamp:** ${new Date().toISOString()}\n\n`;
    message += `---\n\n`;
    message += `**Contexto Completo:**\n\n`;
    message += `\`\`\`json\n${JSON.stringify({ errors, error_context }, null, 2)}\n\`\`\`\n\n`;
    message += `---\n\n`;
    message += `Iniciando proceso de reparación automática...`;

    return message;
  }

  /**
   * Iniciar proceso automático de análisis y reparación
   */
  async startAutoRepairProcess(ticket_id, errorData) {
    console.log(`🔧 [AUTO-REPAIR] Iniciando proceso para ticket ${ticket_id}...`);

    let attempt = 1;
    let resolved = false;
    const { AuditLog } = database;

    while (attempt <= this.maxRepairAttempts && !resolved) {
      console.log(`  🔄 [AUTO-REPAIR] Intento ${attempt}/${this.maxRepairAttempts}...`);

      try {
        // Paso 1: Ollama analiza el error
        const analysis = await this.ollamaAnalyzer.analyzeError(errorData);

        // Guardar métricas de diagnóstico en audit_logs
        await this.saveDiagnosisMetrics(errorData, analysis, attempt);

        await this.addMessageToTicket(ticket_id,
          `🧠 **Análisis (Intento ${attempt}):**\n\n` +
          `**Fuente:** ${analysis.source} (Nivel ${analysis.level})\n` +
          `**Modelo:** ${analysis.model}\n` +
          `**Confianza:** ${(analysis.confidence * 100).toFixed(1)}%\n` +
          `**Especificidad:** ${(analysis.specificity * 100).toFixed(1)}%\n` +
          `**Accionable:** ${analysis.actionable ? 'Sí' : 'No'}\n` +
          `**Tiempo:** ${analysis.duration_ms}ms\n\n` +
          `${analysis.diagnosis}`
        );

        // Paso 2: Claude Code intenta reparar
        const repairResult = await this.claudeRepairAgent.attemptRepair(errorData, analysis);

        await this.addMessageToTicket(ticket_id,
          `🛠️ **Reparación de Claude Code:**\n\n${repairResult.actions_taken}\n\n**Archivos modificados:** ${repairResult.files_modified.length}`
        );

        // Paso 3: Re-test automático
        const retestResult = await this.retestModule(errorData.module_name, errorData.company_id);

        if (retestResult.success) {
          resolved = true;
          await this.updateRepairResult(errorData, true);
          await this.closeTicket(ticket_id, retestResult, attempt);
        } else {
          await this.updateRepairResult(errorData, false);
          await this.addMessageToTicket(ticket_id,
            `❌ **Re-test falló (Intento ${attempt}):**\n\n${retestResult.error}\n\n${attempt < this.maxRepairAttempts ? 'Reintentando...' : 'Máximo de intentos alcanzado.'}`
          );
        }

      } catch (error) {
        console.error(`❌ [AUTO-REPAIR] Error en intento ${attempt}:`, error);
        await this.addMessageToTicket(ticket_id,
          `💥 **Error en proceso de reparación (Intento ${attempt}):**\n\n${error.message}`
        );
      }

      attempt++;
    }

    if (!resolved) {
      await this.markTicketUnresolved(ticket_id, attempt - 1);
    }
  }

  /**
   * Agregar mensaje al ticket
   */
  async addMessageToTicket(ticket_id, message) {
    try {
      await SupportTicketMessage.create({
        ticket_id: ticket_id,
        user_id: this.systemUserId,
        user_role: 'support',
        message: message,
        is_internal: false
      });
    } catch (error) {
      console.error('❌ [AUTO-AUDIT] Error agregando mensaje:', error);
    }
  }

  /**
   * Re-testear módulo después de reparación
   */
  async retestModule(module_name, company_id) {
    console.log(`  🧪 [RE-TEST] Ejecutando re-test de módulo ${module_name}...`);

    try {
      // TODO: Implementar llamada real al FrontendCollector
      // Por ahora, simulación
      const FrontendCollector = require('../collectors/FrontendCollector');
      const SystemRegistry = require('../registry/SystemRegistry');

      const registry = new SystemRegistry(database);
      const frontendCollector = new FrontendCollector(database, registry);

      // Ejecutar test solo de este módulo
      const execution_id = `retest-${Date.now()}`;
      const config = {
        company_id: company_id,
        moduleFilter: module_name,
        authToken: 'TOKEN_PLACEHOLDER' // TODO: Obtener token real
      };

      const results = await frontendCollector.collect(execution_id, config);

      // Evaluar resultados
      const hasErrors = results.some(r => r.status === 'fail');

      if (hasErrors) {
        return {
          success: false,
          error: 'Módulo aún tiene errores después de la reparación',
          details: results
        };
      }

      return {
        success: true,
        message: 'Módulo pasó todos los tests',
        details: results
      };

    } catch (error) {
      console.error('❌ [RE-TEST] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cerrar ticket exitosamente
   */
  async closeTicket(ticket_id, retestResult, attempts) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id);

      await ticket.update({
        status: 'closed',
        closed_by_user_id: this.systemUserId,
        closed_at: new Date(),
        assistant_resolved: true
      });

      await this.addMessageToTicket(ticket_id,
        `✅ **TICKET RESUELTO AUTOMÁTICAMENTE**\n\n` +
        `**Intentos necesarios:** ${attempts}\n` +
        `**Re-test:** Exitoso\n` +
        `**Detalles:** ${retestResult.message}\n\n` +
        `El módulo está funcionando correctamente. Ticket cerrado automáticamente.`
      );

      console.log(`✅ [AUTO-REPAIR] Ticket ${ticket.ticket_number} resuelto en ${attempts} intento(s)`);
    } catch (error) {
      console.error('❌ [AUTO-AUDIT] Error cerrando ticket:', error);
    }
  }

  /**
   * Marcar ticket como no resuelto
   */
  async markTicketUnresolved(ticket_id, attempts) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id);

      await ticket.update({
        status: 'waiting_customer', // Requiere intervención manual
        assistant_resolved: false
      });

      await this.addMessageToTicket(ticket_id,
        `⚠️ **NO SE PUDO RESOLVER AUTOMÁTICAMENTE**\n\n` +
        `**Intentos realizados:** ${attempts}\n` +
        `**Estado:** El sistema no pudo reparar este error automáticamente.\n\n` +
        `**Acción requerida:** Un desarrollador humano debe revisar este ticket manualmente.\n\n` +
        `El ticket queda en estado "Esperando Cliente" para revisión manual.`
      );

      console.log(`⚠️ [AUTO-REPAIR] Ticket ${ticket.ticket_number} NO resuelto después de ${attempts} intentos`);
    } catch (error) {
      console.error('❌ [AUTO-AUDIT] Error marcando ticket no resuelto:', error);
    }
  }

  /**
   * Guardar métricas de diagnóstico en audit_logs
   */
  async saveDiagnosisMetrics(errorData, analysis, attempt) {
    try {
      const { AuditLog } = database;
      const { module_name, execution_id } = errorData;

      // Buscar el log de auditoría correspondiente
      const log = await AuditLog.findOne({
        where: {
          execution_id: execution_id,
          module_name: module_name,
          status: 'fail' // Solo actualizamos logs que fallaron
        },
        order: [['createdAt', 'DESC']] // El más reciente
      });

      if (log) {
        await log.update({
          diagnosis_source: analysis.source,
          diagnosis_model: analysis.model,
          diagnosis_level: analysis.level,
          diagnosis_confidence: analysis.confidence,
          diagnosis_specificity: analysis.specificity,
          diagnosis_actionable: analysis.actionable,
          diagnosis_duration_ms: analysis.duration_ms,
          diagnosis_timestamp: analysis.timestamp,
          repair_attempts: attempt
        });

        console.log(`  📊 [METRICS] Métricas de diagnóstico guardadas en audit_logs`);
      } else {
        console.warn(`  ⚠️  [METRICS] No se encontró log de auditoría para ${module_name}`);
      }
    } catch (error) {
      console.error('❌ [METRICS] Error guardando métricas:', error.message);
    }
  }

  /**
   * Actualizar resultado de reparación en audit_logs
   */
  async updateRepairResult(errorData, success) {
    try {
      const { AuditLog } = database;
      const { module_name, execution_id } = errorData;

      const log = await AuditLog.findOne({
        where: {
          execution_id: execution_id,
          module_name: module_name
        },
        order: [['createdAt', 'DESC']]
      });

      if (log) {
        await log.update({
          repair_success: success
        });

        console.log(`  📊 [METRICS] Resultado de reparación guardado: ${success ? 'ÉXITO' : 'FALLO'}`);
      }
    } catch (error) {
      console.error('❌ [METRICS] Error actualizando resultado:', error.message);
    }
  }

  /**
   * Obtener estadísticas de tickets automáticos
   */
  async getStats(company_id = null) {
    try {
      const where = {
        created_by_user_id: this.systemUserId
      };

      if (company_id) {
        where.company_id = company_id;
      }

      const tickets = await SupportTicketV2.findAll({ where });

      const stats = {
        total: tickets.length,
        resolved: tickets.filter(t => t.assistant_resolved).length,
        unresolved: tickets.filter(t => !t.assistant_resolved && t.status === 'waiting_customer').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        success_rate: 0
      };

      if (stats.total > 0) {
        stats.success_rate = ((stats.resolved / stats.total) * 100).toFixed(1);
      }

      return stats;
    } catch (error) {
      console.error('❌ [AUTO-AUDIT] Error obteniendo stats:', error);
      return null;
    }
  }
}

module.exports = new AutoAuditTicketSystem();
