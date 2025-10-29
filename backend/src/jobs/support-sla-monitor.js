/**
 * CRON JOB: Support SLA Monitor
 *
 * Monitorea SLA deadlines y auto-escala tickets que han excedido su tiempo
 * Envía alertas de deadlines próximos a vencer
 *
 * Frecuencia recomendada: Cada 5 minutos
 *
 * @version 1.0.0
 * @date 2025-01-23
 */

const database = require('../config/database');
const SupportNotificationService = require('../services/SupportNotificationService');
const { Op } = require('sequelize');

const {
  SupportTicketV2,
  SupportEscalation,
  SupportVendorSupervisor,
  sequelize
} = database;

class SupportSLAMonitor {
  /**
   * Ejecutar monitoreo completo de SLAs
   */
  static async runMonitoring() {
    console.log('🔍 [SLA-MONITOR] Iniciando monitoreo de SLA deadlines...');

    try {
      // 1. Auto-escalar tickets que han excedido su deadline
      const escalatedCount = await this.autoEscalateTickets();
      console.log(`✅ [SLA-MONITOR] ${escalatedCount} tickets auto-escalados`);

      // 2. Alertar sobre deadlines próximos a vencer (dentro de 1 hora)
      const alertedCount = await this.alertApproachingDeadlines();
      console.log(`⚠️  [SLA-MONITOR] ${alertedCount} alertas de SLA próximo a vencer enviadas`);

      // 3. Actualizar estadísticas de vendors
      await this.updateVendorStats();
      console.log('📊 [SLA-MONITOR] Estadísticas de vendors actualizadas');

      console.log('✅ [SLA-MONITOR] Monitoreo completado exitosamente');
    } catch (error) {
      console.error('❌ [SLA-MONITOR] Error en monitoreo:', error);
    }
  }

  /**
   * Auto-escalar tickets que han excedido el deadline de escalamiento
   */
  static async autoEscalateTickets() {
    try {
      const now = new Date();

      // Buscar tickets abiertos que han excedido el deadline de escalamiento
      const ticketsToEscalate = await SupportTicketV2.findAll({
        where: {
          status: {
            [Op.in]: ['open', 'in_progress', 'waiting_customer']
          },
          escalated_to_supervisor_id: null, // No escalados aún
          sla_escalation_deadline: {
            [Op.lt]: now // Deadline pasado
          },
          assigned_to_vendor_id: {
            [Op.not]: null // Debe tener vendor asignado
          }
        }
      });

      let escalatedCount = 0;

      for (const ticket of ticketsToEscalate) {
        try {
          // Obtener supervisor del vendor
          const supervisorAssignment = await SupportVendorSupervisor.findOne({
            where: {
              vendor_id: ticket.assigned_to_vendor_id,
              is_active: true
            },
            order: [['assigned_at', 'DESC']]
          });

          if (!supervisorAssignment) {
            console.warn(`⚠️  [SLA-MONITOR] No supervisor found for vendor ${ticket.assigned_to_vendor_id} (ticket ${ticket.ticket_number})`);
            continue;
          }

          // Crear registro de escalamiento automático
          const escalation = await SupportEscalation.create({
            ticket_id: ticket.ticket_id,
            escalated_from_user_id: ticket.assigned_to_vendor_id,
            escalated_to_user_id: supervisorAssignment.supervisor_id,
            escalation_reason: 'sla_timeout',
            escalation_notes: `Auto-escalado por timeout del SLA de escalamiento (${ticket.sla_escalation_deadline})`,
            is_automatic: true
          });

          // Actualizar ticket
          await ticket.update({
            escalated_to_supervisor_id: supervisorAssignment.supervisor_id,
            auto_escalated_at: new Date()
          });

          // Enviar notificaciones
          await SupportNotificationService.notifyEscalation(ticket.ticket_id, escalation.escalation_id);
          await SupportNotificationService.notifyAponntAdmin(ticket.ticket_id, 'sla_timeout', {
            deadline_type: 'escalation',
            deadline: ticket.sla_escalation_deadline,
            elapsed_time: Math.floor((now - new Date(ticket.sla_escalation_deadline)) / 1000 / 60) + ' minutes'
          });

          escalatedCount++;
          console.log(`🔺 [SLA-MONITOR] Ticket ${ticket.ticket_number} auto-escalado a supervisor ${supervisorAssignment.supervisor_id}`);
        } catch (error) {
          console.error(`❌ [SLA-MONITOR] Error escalating ticket ${ticket.ticket_number}:`, error);
        }
      }

      return escalatedCount;
    } catch (error) {
      console.error('❌ [SLA-MONITOR] Error in autoEscalateTickets:', error);
      return 0;
    }
  }

  /**
   * Alertar sobre deadlines próximos a vencer
   */
  static async alertApproachingDeadlines() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora

      let alertedCount = 0;

      // 1. Alertar sobre first response deadline próximo
      const ticketsApproachingFirstResponse = await SupportTicketV2.findAll({
        where: {
          status: 'open',
          first_response_at: null, // Sin primera respuesta aún
          sla_first_response_deadline: {
            [Op.between]: [now, oneHourFromNow]
          },
          assigned_to_vendor_id: {
            [Op.not]: null
          },
          first_response_alert_sent: {
            [Op.or]: [null, false]
          }
        }
      });

      for (const ticket of ticketsApproachingFirstResponse) {
        await SupportNotificationService.notifySLADeadlineApproaching(ticket.ticket_id, 'first_response');
        await ticket.update({ first_response_alert_sent: true });
        alertedCount++;
      }

      // 2. Alertar sobre resolution deadline próximo
      const ticketsApproachingResolution = await SupportTicketV2.findAll({
        where: {
          status: {
            [Op.in]: ['open', 'in_progress', 'waiting_customer']
          },
          sla_resolution_deadline: {
            [Op.between]: [now, oneHourFromNow]
          },
          assigned_to_vendor_id: {
            [Op.not]: null
          },
          resolution_alert_sent: {
            [Op.or]: [null, false]
          }
        }
      });

      for (const ticket of ticketsApproachingResolution) {
        await SupportNotificationService.notifySLADeadlineApproaching(ticket.ticket_id, 'resolution');
        await ticket.update({ resolution_alert_sent: true });
        alertedCount++;
      }

      // 3. Alertar sobre escalation deadline próximo
      const ticketsApproachingEscalation = await SupportTicketV2.findAll({
        where: {
          status: {
            [Op.in]: ['open', 'in_progress', 'waiting_customer']
          },
          escalated_to_supervisor_id: null,
          sla_escalation_deadline: {
            [Op.between]: [now, oneHourFromNow]
          },
          assigned_to_vendor_id: {
            [Op.not]: null
          },
          escalation_alert_sent: {
            [Op.or]: [null, false]
          }
        }
      });

      for (const ticket of ticketsApproachingEscalation) {
        await SupportNotificationService.notifySLADeadlineApproaching(ticket.ticket_id, 'escalation');
        await ticket.update({ escalation_alert_sent: true });
        alertedCount++;
      }

      return alertedCount;
    } catch (error) {
      console.error('❌ [SLA-MONITOR] Error in alertApproachingDeadlines:', error);
      return 0;
    }
  }

  /**
   * Actualizar estadísticas de vendors
   */
  static async updateVendorStats() {
    try {
      // Esta función podría ejecutar queries agregadas para actualizar
      // la tabla support_vendor_stats con métricas en tiempo real

      // Por ahora, log simple
      console.log('📊 [SLA-MONITOR] Vendor stats update would run here');

      // TODO: Implementar actualización de estadísticas
      // - Tickets atendidos por vendor
      // - Tiempo promedio de primera respuesta
      // - Tiempo promedio de resolución
      // - Tasa de cumplimiento de SLA
      // - Evaluación promedio

      return true;
    } catch (error) {
      console.error('❌ [SLA-MONITOR] Error in updateVendorStats:', error);
      return false;
    }
  }
}

/**
 * Si se ejecuta directamente (node support-sla-monitor.js)
 */
if (require.main === module) {
  console.log('🚀 [SLA-MONITOR] Ejecutando monitoreo manual...');
  SupportSLAMonitor.runMonitoring()
    .then(() => {
      console.log('✅ [SLA-MONITOR] Monitoreo manual completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ [SLA-MONITOR] Error en monitoreo manual:', error);
      process.exit(1);
    });
}

module.exports = SupportSLAMonitor;
