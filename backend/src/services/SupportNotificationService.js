/**
 * SERVICIO: SupportNotificationService
 *
 * Envío de notificaciones para el módulo de soporte
 * Integra con sistema de notificaciones Enterprise V3.0
 *
 * @version 1.0.0
 * @date 2025-01-23
 */

const database = require('../config/database');
const { Notification, SupportTicketV2, User, Company } = database;

class SupportNotificationService {
  /**
   * Enviar notificación cuando se crea un nuevo ticket
   */
  static async notifyNewTicket(ticket_id) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['user_id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'assignedVendor',
            attributes: ['user_id', 'firstName', 'lastName', 'email']
          },
          {
            model: Company,
            as: 'company',
            attributes: ['company_id', 'name']
          }
        ]
      });

      if (!ticket) {
        console.error('[SUPPORT-NOTIF] Ticket not found:', ticket_id);
        return null;
      }

      // Notificar al vendor asignado
      if (ticket.assigned_to_vendor_id) {
        const notification = await Notification.create({
          company_id: ticket.company_id,
          module: 'support',
          category: 'info',
          notification_type: 'support_ticket_created',
          priority: ticket.priority === 'urgent' ? 'urgent' : 'high',
          recipient_user_id: ticket.assigned_to_vendor_id,
          title: `Nuevo ticket de soporte: ${ticket.ticket_number}`,
          message: `${ticket.creator?.firstName} ${ticket.creator?.lastName} ha creado un ticket de soporte sobre "${ticket.subject}" en el módulo ${ticket.module_display_name || ticket.module_name}.`,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          action_required: true,
          action_deadline: ticket.sla_first_response_deadline,
          metadata: {
            ticket_id: ticket.ticket_id,
            ticket_number: ticket.ticket_number,
            module_name: ticket.module_name,
            priority: ticket.priority,
            sla_first_response_deadline: ticket.sla_first_response_deadline,
            sla_resolution_deadline: ticket.sla_resolution_deadline
          }
        });

        console.log(`✅ [SUPPORT-NOTIF] Notificación enviada a vendor ${ticket.assigned_to_vendor_id} para ticket ${ticket.ticket_number}`);
        return notification;
      }

      return null;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying new ticket:', error);
      return null;
    }
  }

  /**
   * Enviar notificación cuando hay un nuevo mensaje
   */
  static async notifyNewMessage(ticket_id, message_id, from_user_id) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['user_id', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'assignedVendor',
            attributes: ['user_id', 'firstName', 'lastName']
          }
        ]
      });

      if (!ticket) return null;

      const fromUser = await User.findByPk(from_user_id, {
        attributes: ['user_id', 'firstName', 'lastName', 'role']
      });

      // Determinar destinatario (quien NO envió el mensaje)
      let recipient_user_id = null;
      if (fromUser.role === 'vendor' || fromUser.role === 'support') {
        // Mensaje del soporte → notificar al cliente
        recipient_user_id = ticket.created_by_user_id;
      } else {
        // Mensaje del cliente → notificar al soporte
        recipient_user_id = ticket.assigned_to_vendor_id;
      }

      if (!recipient_user_id) return null;

      const notification = await Notification.create({
        company_id: ticket.company_id,
        module: 'support',
        category: 'info',
        notification_type: 'support_message_received',
        priority: 'medium',
        recipient_user_id,
        title: `Nuevo mensaje en ticket ${ticket.ticket_number}`,
        message: `${fromUser.firstName} ${fromUser.lastName} ha respondido en el ticket de soporte.`,
        action_url: `/support/tickets/${ticket.ticket_id}`,
        action_required: true,
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          from_user_id,
          message_id
        }
      });

      console.log(`✅ [SUPPORT-NOTIF] Notificación de mensaje enviada a ${recipient_user_id}`);
      return notification;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying new message:', error);
      return null;
    }
  }

  /**
   * Enviar notificación cuando un ticket es escalado
   */
  static async notifyEscalation(ticket_id, escalation_id) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['user_id', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'assignedVendor',
            attributes: ['user_id', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'escalatedSupervisor',
            attributes: ['user_id', 'firstName', 'lastName']
          }
        ]
      });

      if (!ticket || !ticket.escalated_to_supervisor_id) return null;

      // Notificar al supervisor
      const notification = await Notification.create({
        company_id: ticket.company_id,
        module: 'support',
        category: 'alert',
        notification_type: 'support_ticket_escalated',
        priority: 'urgent',
        recipient_user_id: ticket.escalated_to_supervisor_id,
        title: `Ticket escalado: ${ticket.ticket_number}`,
        message: `El ticket de soporte "${ticket.subject}" ha sido escalado por ${ticket.assignedVendor?.firstName} ${ticket.assignedVendor?.lastName}. Requiere atención urgente.`,
        action_url: `/support/tickets/${ticket.ticket_id}`,
        action_required: true,
        action_deadline: ticket.sla_resolution_deadline,
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          escalation_id,
          original_vendor_id: ticket.assigned_to_vendor_id,
          priority: 'urgent'
        }
      });

      console.log(`✅ [SUPPORT-NOTIF] Notificación de escalamiento enviada a supervisor ${ticket.escalated_to_supervisor_id}`);
      return notification;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying escalation:', error);
      return null;
    }
  }

  /**
   * Enviar notificación cuando un ticket está por vencer SLA
   */
  static async notifySLADeadlineApproaching(ticket_id, deadline_type = 'first_response') {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id, {
        include: [
          {
            model: User,
            as: 'assignedVendor',
            attributes: ['user_id', 'firstName', 'lastName']
          }
        ]
      });

      if (!ticket || !ticket.assigned_to_vendor_id) return null;

      let deadline_field = '';
      let deadline_name = '';

      if (deadline_type === 'first_response') {
        deadline_field = ticket.sla_first_response_deadline;
        deadline_name = 'Primera Respuesta';
      } else if (deadline_type === 'resolution') {
        deadline_field = ticket.sla_resolution_deadline;
        deadline_name = 'Resolución';
      } else if (deadline_type === 'escalation') {
        deadline_field = ticket.sla_escalation_deadline;
        deadline_name = 'Escalamiento Automático';
      }

      if (!deadline_field) return null;

      const notification = await Notification.create({
        company_id: ticket.company_id,
        module: 'support',
        category: 'warning',
        notification_type: 'support_sla_deadline_approaching',
        priority: 'high',
        recipient_user_id: ticket.assigned_to_vendor_id,
        title: `SLA próximo a vencer: ${ticket.ticket_number}`,
        message: `El deadline de ${deadline_name} para el ticket "${ticket.subject}" está próximo a vencer.`,
        action_url: `/support/tickets/${ticket.ticket_id}`,
        action_required: true,
        action_deadline: deadline_field,
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          deadline_type,
          deadline: deadline_field
        }
      });

      console.log(`⚠️  [SUPPORT-NOTIF] Notificación de SLA enviada para ticket ${ticket.ticket_number}`);
      return notification;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying SLA deadline:', error);
      return null;
    }
  }

  /**
   * Enviar notificación cuando un ticket es cerrado
   */
  static async notifyTicketClosed(ticket_id) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id, {
        include: [
          {
            model: User,
            as: 'assignedVendor',
            attributes: ['user_id', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'closedBy',
            attributes: ['user_id', 'firstName', 'lastName']
          }
        ]
      });

      if (!ticket || !ticket.assigned_to_vendor_id) return null;

      // Notificar al vendor que su ticket fue cerrado
      const notification = await Notification.create({
        company_id: ticket.company_id,
        module: 'support',
        category: 'info',
        notification_type: 'support_ticket_closed',
        priority: 'low',
        recipient_user_id: ticket.assigned_to_vendor_id,
        title: `Ticket cerrado: ${ticket.ticket_number}`,
        message: `El ticket "${ticket.subject}" ha sido cerrado por ${ticket.closedBy?.firstName} ${ticket.closedBy?.lastName}.`,
        action_url: `/support/tickets/${ticket.ticket_id}`,
        action_required: false,
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          closed_by_user_id: ticket.closed_by_user_id,
          rating: ticket.rating
        }
      });

      console.log(`✅ [SUPPORT-NOTIF] Notificación de cierre enviada a vendor ${ticket.assigned_to_vendor_id}`);
      return notification;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying ticket closed:', error);
      return null;
    }
  }

  /**
   * Enviar notificación cuando se solicita evaluación
   */
  static async notifyRatingRequest(ticket_id) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['user_id', 'firstName', 'lastName']
          }
        ]
      });

      if (!ticket || ticket.status !== 'closed' || ticket.rating) return null;

      // Notificar al creador para que evalúe
      const notification = await Notification.create({
        company_id: ticket.company_id,
        module: 'support',
        category: 'info',
        notification_type: 'support_rating_request',
        priority: 'low',
        recipient_user_id: ticket.created_by_user_id,
        title: `Evalúa el soporte recibido: ${ticket.ticket_number}`,
        message: `Tu ticket de soporte ha sido cerrado. Por favor, evalúa la atención recibida para ayudarnos a mejorar.`,
        action_url: `/support/tickets/${ticket.ticket_id}/rate`,
        action_required: true,
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number
        }
      });

      console.log(`⭐ [SUPPORT-NOTIF] Solicitud de evaluación enviada al cliente ${ticket.created_by_user_id}`);
      return notification;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying rating request:', error);
      return null;
    }
  }

  /**
   * Notificar a admin de Aponnt sobre actividad de soporte
   */
  static async notifyAponntAdmin(ticket_id, event_type, details = {}) {
    try {
      const ticket = await SupportTicketV2.findByPk(ticket_id, {
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['company_id', 'name']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['user_id', 'firstName', 'lastName']
          }
        ]
      });

      if (!ticket) return null;

      // Buscar admins de Aponnt (company_id = 1 o role = 'admin')
      const aponntAdmins = await User.findAll({
        where: {
          role: 'admin',
          is_active: true
        },
        attributes: ['user_id']
      });

      if (aponntAdmins.length === 0) return null;

      let title = '';
      let message = '';
      let priority = 'low';

      switch (event_type) {
        case 'escalation':
          title = `Escalamiento: ${ticket.ticket_number}`;
          message = `Ticket escalado a supervisor en empresa ${ticket.company?.name}`;
          priority = 'medium';
          break;
        case 'sla_timeout':
          title = `SLA Timeout: ${ticket.ticket_number}`;
          message = `SLA excedido en empresa ${ticket.company?.name}`;
          priority = 'high';
          break;
        case 'low_rating':
          title = `Baja evaluación: ${ticket.ticket_number}`;
          message = `Ticket evaluado con ${details.rating} estrellas en ${ticket.company?.name}`;
          priority = 'medium';
          break;
        default:
          return null;
      }

      // Crear notificación para cada admin
      const notifications = await Promise.all(
        aponntAdmins.map(admin =>
          Notification.create({
            company_id: 1, // Aponnt
            module: 'support',
            category: 'alert',
            notification_type: `support_admin_${event_type}`,
            priority,
            recipient_user_id: admin.user_id,
            title,
            message,
            action_url: `/admin/support/tickets/${ticket.ticket_id}`,
            action_required: priority === 'high',
            metadata: {
              ticket_id: ticket.ticket_id,
              ticket_number: ticket.ticket_number,
              company_id: ticket.company_id,
              company_name: ticket.company?.name,
              event_type,
              ...details
            }
          })
        )
      );

      console.log(`📢 [SUPPORT-NOTIF] ${notifications.length} notificaciones enviadas a admins de Aponnt`);
      return notifications;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying Aponnt admin:', error);
      return null;
    }
  }
}

module.exports = SupportNotificationService;
