/**
 * SERVICIO: SupportNotificationService
 *
 * Envío de notificaciones para el módulo de soporte
 * Integra con sistema de notificaciones Enterprise V3.0
 *
 * EXTENSIÓN: Multi-canal (Email + Inbox panel-empresa + panel-administrativo)
 *
 * Canales de notificación:
 * 1. Email al cliente (company contact email)
 * 2. Email al vendor (vendor email)
 * 3. Inbox en panel-empresa (notifications table)
 * 4. Inbox en panel-administrativo (notifications table)
 *
 * @version 2.0.0
 * @date 2025-11-01
 */

const database = require('../config/database');
const { Notification, SupportTicketV2, User, Company, Partner } = database;
const EmailService = require('./EmailService');
const EmailTemplateRenderer = require('../utils/EmailTemplateRenderer');

// 🔥 NCE: Central Telefónica de Notificaciones - CERO BYPASS
const NCE = require('./NotificationCentralExchange');

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

      // 🔥 NCE: Notificar al vendor asignado via Central Telefónica
      if (ticket.assigned_to_vendor_id) {
        const nceResult = await NCE.send({
          companyId: ticket.company_id,
          module: 'support',
          originType: 'support_ticket_created',
          originId: `ticket-${ticket.ticket_id}`,
          workflowKey: 'support.ticket_created',
          recipientType: 'user',
          recipientId: ticket.assigned_to_vendor_id,
          title: `Nuevo ticket de soporte: ${ticket.ticket_number}`,
          message: `${ticket.creator?.firstName} ${ticket.creator?.lastName} ha creado un ticket de soporte sobre "${ticket.subject}" en el módulo ${ticket.module_display_name || ticket.module_name}.`,
          priority: ticket.priority === 'urgent' ? 'urgent' : 'high',
          requiresAction: true,
          actionType: 'response',
          metadata: {
            ticket_id: ticket.ticket_id,
            ticket_number: ticket.ticket_number,
            module_name: ticket.module_name,
            priority: ticket.priority,
            sla_first_response_deadline: ticket.sla_first_response_deadline,
            sla_resolution_deadline: ticket.sla_resolution_deadline,
            action_url: `/support/tickets/${ticket.ticket_id}`,
            category: 'info'
          },
          slaHours: ticket.sla_first_response_deadline ? Math.ceil((new Date(ticket.sla_first_response_deadline) - new Date()) / 3600000) : 24,
          channels: ['inbox'],
        });

        console.log(`✅ [SUPPORT-NOTIF] Notificación NCE enviada a vendor ${ticket.assigned_to_vendor_id} para ticket ${ticket.ticket_number}`);
        return nceResult;
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

      // 🔥 NCE: Notificación de mensaje via Central Telefónica
      const nceResult = await NCE.send({
        companyId: ticket.company_id,
        module: 'support',
        originType: 'support_message_received',
        originId: `message-${message_id}`,
        workflowKey: 'support.message_received',
        recipientType: 'user',
        recipientId: recipient_user_id,
        title: `Nuevo mensaje en ticket ${ticket.ticket_number}`,
        message: `${fromUser.firstName} ${fromUser.lastName} ha respondido en el ticket de soporte.`,
        priority: 'normal',
        requiresAction: true,
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          from_user_id,
          message_id,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          category: 'info'
        },
        channels: ['inbox'],
      });

      console.log(`✅ [SUPPORT-NOTIF] Notificación NCE de mensaje enviada a ${recipient_user_id}`);
      return nceResult;
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

      // 🔥 NCE: Notificar escalamiento al supervisor via Central Telefónica
      const nceResult = await NCE.send({
        companyId: ticket.company_id,
        module: 'support',
        originType: 'support_ticket_escalated',
        originId: `escalation-${escalation_id}`,
        workflowKey: 'support.ticket_escalated',
        recipientType: 'user',
        recipientId: ticket.escalated_to_supervisor_id,
        title: `Ticket escalado: ${ticket.ticket_number}`,
        message: `El ticket de soporte "${ticket.subject}" ha sido escalado por ${ticket.assignedVendor?.firstName} ${ticket.assignedVendor?.lastName}. Requiere atención urgente.`,
        priority: 'urgent',
        requiresAction: true,
        actionType: 'escalation',
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          escalation_id,
          original_vendor_id: ticket.assigned_to_vendor_id,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          category: 'alert'
        },
        slaHours: ticket.sla_resolution_deadline ? Math.ceil((new Date(ticket.sla_resolution_deadline) - new Date()) / 3600000) : 4,
        channels: ['inbox'],
      });

      console.log(`✅ [SUPPORT-NOTIF] Notificación NCE de escalamiento enviada a supervisor ${ticket.escalated_to_supervisor_id}`);
      return nceResult;
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

      // 🔥 NCE: Notificación SLA via Central Telefónica
      const nceResult = await NCE.send({
        companyId: ticket.company_id,
        module: 'support',
        originType: 'support_sla_deadline_approaching',
        originId: `sla-${ticket.ticket_id}-${deadline_type}`,
        workflowKey: 'support.sla_deadline',
        recipientType: 'user',
        recipientId: ticket.assigned_to_vendor_id,
        title: `SLA próximo a vencer: ${ticket.ticket_number}`,
        message: `El deadline de ${deadline_name} para el ticket "${ticket.subject}" está próximo a vencer.`,
        priority: 'high',
        requiresAction: true,
        actionType: 'sla_warning',
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          deadline_type,
          deadline: deadline_field,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          category: 'warning'
        },
        slaHours: Math.max(1, Math.ceil((new Date(deadline_field) - new Date()) / 3600000)),
        channels: ['inbox'],
      });

      console.log(`⚠️  [SUPPORT-NOTIF] Notificación NCE de SLA enviada para ticket ${ticket.ticket_number}`);
      return nceResult;
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

      // 🔥 NCE: Notificar cierre al vendor via Central Telefónica
      const nceResult = await NCE.send({
        companyId: ticket.company_id,
        module: 'support',
        originType: 'support_ticket_closed',
        originId: `closed-${ticket.ticket_id}`,
        workflowKey: 'support.ticket_closed',
        recipientType: 'user',
        recipientId: ticket.assigned_to_vendor_id,
        title: `Ticket cerrado: ${ticket.ticket_number}`,
        message: `El ticket "${ticket.subject}" ha sido cerrado por ${ticket.closedBy?.firstName} ${ticket.closedBy?.lastName}.`,
        priority: 'low',
        requiresAction: false,
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          closed_by_user_id: ticket.closed_by_user_id,
          rating: ticket.rating,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          category: 'info'
        },
        channels: ['inbox'],
      });

      console.log(`✅ [SUPPORT-NOTIF] Notificación NCE de cierre enviada a vendor ${ticket.assigned_to_vendor_id}`);
      return nceResult;
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

      // 🔥 NCE: Solicitar evaluación via Central Telefónica
      const nceResult = await NCE.send({
        companyId: ticket.company_id,
        module: 'support',
        originType: 'support_rating_request',
        originId: `rating-${ticket.ticket_id}`,
        workflowKey: 'support.rating_request',
        recipientType: 'user',
        recipientId: ticket.created_by_user_id,
        title: `Evalúa el soporte recibido: ${ticket.ticket_number}`,
        message: `Tu ticket de soporte ha sido cerrado. Por favor, evalúa la atención recibida para ayudarnos a mejorar.`,
        priority: 'low',
        requiresAction: true,
        actionType: 'feedback',
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          action_url: `/support/tickets/${ticket.ticket_id}/rate`,
          category: 'info'
        },
        channels: ['inbox'],
      });

      console.log(`⭐ [SUPPORT-NOTIF] Solicitud NCE de evaluación enviada al cliente ${ticket.created_by_user_id}`);
      return nceResult;
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

      // 🔥 NCE: Crear notificaciones para cada admin via Central Telefónica
      const nceResults = await Promise.all(
        aponntAdmins.map(admin =>
          NCE.send({
            companyId: null, // Aponnt (scope global)
            module: 'support',
            originType: `support_admin_${event_type}`,
            originId: `admin-${event_type}-${ticket.ticket_id}-${admin.user_id}`,
            workflowKey: `support.admin_${event_type}`,
            recipientType: 'user',
            recipientId: admin.user_id,
            title,
            message,
            priority: priority === 'high' ? 'high' : 'normal',
            requiresAction: priority === 'high',
            metadata: {
              ticket_id: ticket.ticket_id,
              ticket_number: ticket.ticket_number,
              company_id: ticket.company_id,
              company_name: ticket.company?.name,
              event_type,
              action_url: `/admin/support/tickets/${ticket.ticket_id}`,
              category: 'alert',
              ...details
            },
            channels: ['inbox'],
          })
        )
      );

      console.log(`📢 [SUPPORT-NOTIF] ${nceResults.length} notificaciones NCE enviadas a admins de Aponnt`);
      return nceResults;
    } catch (error) {
      console.error('[SUPPORT-NOTIF] Error notifying Aponnt admin:', error);
      return null;
    }
  }

  /**
   * ========================================================================
   * EXTENSIÓN: NOTIFICACIONES MULTI-CANAL (Email + Inbox)
   * ========================================================================
   */

  /**
   * Notificar creación de ticket (4 canales simultáneos)
   *
   * @param {object} ticket - Objeto SupportTicketV2 con relaciones
   * @param {object} company - Objeto Company
   * @param {object} vendor - Objeto Partner (vendor asignado)
   * @returns {Promise<object>} Resultado de notificaciones enviadas
   */
  static async notifyTicketCreated(ticket, company, vendor) {
    try {
      console.log(`📧 [SUPPORT-NOTIF-MULTI] Notificando creación de ticket ${ticket.ticket_number}`);

      const results = {
        emailToClient: null,
        emailToVendor: null,
        inboxClient: null,
        inboxVendor: null
      };

      // 1. Email al cliente (empresa)
      if (company.contact_email) {
        try {
          results.emailToClient = await this.sendToEmail(company.contact_email, 'ticket_created_client', {
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            moduleName: ticket.module_display_name || ticket.module_name,
            priority: ticket.priority,
            vendorName: vendor ? `${vendor.first_name} ${vendor.last_name}` : 'Por asignar',
            companyName: company.name
          });
        } catch (error) {
          console.error(`❌ [SUPPORT-NOTIF-MULTI] Error enviando email a cliente:`, error.message);
        }
      }

      // 2. Email al vendor
      if (vendor && vendor.email) {
        try {
          results.emailToVendor = await this.sendToEmail(vendor.email, 'ticket_created_vendor', {
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            description: ticket.description,
            moduleName: ticket.module_display_name || ticket.module_name,
            priority: ticket.priority,
            companyName: company.name,
            slaDeadline: ticket.sla_first_response_deadline
          });
        } catch (error) {
          console.error(`❌ [SUPPORT-NOTIF-MULTI] Error enviando email a vendor:`, error.message);
        }
      }

      // 3. Inbox en panel-empresa
      try {
        results.inboxClient = await this.sendToInbox(ticket.created_by_user_id, 'employee', {
          company_id: ticket.company_id,
          module: 'support',
          category: 'info',
          notification_type: 'support_ticket_created',
          priority: 'medium',
          title: `Ticket creado: ${ticket.ticket_number}`,
          message: `Tu ticket de soporte "${ticket.subject}" ha sido creado y asignado a ${vendor ? `${vendor.first_name} ${vendor.last_name}` : 'un agente'}.`,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          metadata: { ticket_id: ticket.ticket_id, ticket_number: ticket.ticket_number }
        });
      } catch (error) {
        console.error(`❌ [SUPPORT-NOTIF-MULTI] Error creando inbox cliente:`, error.message);
      }

      // 4. Inbox en panel-administrativo (vendor)
      if (vendor) {
        try {
          results.inboxVendor = await this.sendToInbox(vendor.partner_id, 'vendor', {
            company_id: 1, // Aponnt
            module: 'support',
            category: 'info',
            notification_type: 'support_ticket_assigned',
            priority: ticket.priority === 'urgent' ? 'urgent' : 'high',
            title: `Nuevo ticket asignado: ${ticket.ticket_number}`,
            message: `Ticket de ${company.name} sobre "${ticket.subject}". Respuesta requerida antes de ${new Date(ticket.sla_first_response_deadline).toLocaleString('es-AR')}.`,
            action_url: `/support/tickets/${ticket.ticket_id}`,
            action_required: true,
            action_deadline: ticket.sla_first_response_deadline,
            metadata: { ticket_id: ticket.ticket_id, company_id: ticket.company_id }
          });
        } catch (error) {
          console.error(`❌ [SUPPORT-NOTIF-MULTI] Error creando inbox vendor:`, error.message);
        }
      }

      console.log(`✅ [SUPPORT-NOTIF-MULTI] Notificaciones de creación enviadas`);
      return results;

    } catch (error) {
      console.error(`❌ [SUPPORT-NOTIF-MULTI] Error en notifyTicketCreated:`, error.message);
      throw error;
    }
  }

  /**
   * Notificar nuevo mensaje (Email + Inbox en ambos paneles)
   *
   * @param {object} ticket
   * @param {object} message - Objeto SupportTicketMessage
   * @param {object} sender - Usuario que envió el mensaje
   * @param {object} recipient - Usuario destinatario
   * @returns {Promise<object>}
   */
  static async notifyNewMessage(ticket, message, sender, recipient) {
    try {
      console.log(`📧 [SUPPORT-NOTIF-MULTI] Notificando nuevo mensaje en ticket ${ticket.ticket_number}`);

      const results = {
        emailToRecipient: null,
        inboxRecipient: null
      };

      // 1. Email al destinatario
      if (recipient.email) {
        try {
          results.emailToRecipient = await this.sendToEmail(recipient.email, 'ticket_new_message', {
            ticketNumber: ticket.ticket_number,
            senderName: sender.firstName || sender.first_name,
            messagePreview: message.message_content.substring(0, 200),
            ticketSubject: ticket.subject
          });
        } catch (error) {
          console.error(`❌ [SUPPORT-NOTIF-MULTI] Error enviando email:`, error.message);
        }
      }

      // 2. Inbox al destinatario
      try {
        const recipientType = recipient.role === 'vendor' || recipient.role === 'supervisor' ? 'vendor' : 'employee';
        results.inboxRecipient = await this.sendToInbox(recipient.user_id || recipient.partner_id, recipientType, {
          company_id: recipientType === 'employee' ? ticket.company_id : 1,
          module: 'support',
          category: 'info',
          notification_type: 'support_message_received',
          priority: 'medium',
          title: `Nuevo mensaje en ${ticket.ticket_number}`,
          message: `${sender.firstName || sender.first_name} ha respondido en el ticket.`,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          action_required: true,
          metadata: { ticket_id: ticket.ticket_id, message_id: message.message_id }
        });
      } catch (error) {
        console.error(`❌ [SUPPORT-NOTIF-MULTI] Error creando inbox:`, error.message);
      }

      console.log(`✅ [SUPPORT-NOTIF-MULTI] Notificaciones de mensaje enviadas`);
      return results;

    } catch (error) {
      console.error(`❌ [SUPPORT-NOTIF-MULTI] Error en notifyNewMessage:`, error.message);
      throw error;
    }
  }

  /**
   * Notificar cambio de estado (Email + Inbox)
   *
   * @param {object} ticket
   * @param {string} oldStatus
   * @param {string} newStatus
   * @param {object} company
   * @param {object} vendor
   * @returns {Promise<object>}
   */
  static async notifyStatusChanged(ticket, oldStatus, newStatus, company, vendor) {
    try {
      console.log(`📧 [SUPPORT-NOTIF-MULTI] Notificando cambio de estado: ${oldStatus} → ${newStatus}`);

      const results = { emailToClient: null, inboxClient: null };

      const statusLabels = {
        'pending': 'Pendiente',
        'in_progress': 'En Progreso',
        'waiting_client': 'Esperando Cliente',
        'escalated': 'Escalado',
        'resolved': 'Resuelto',
        'closed': 'Cerrado'
      };

      // Email + Inbox al cliente
      if (company.contact_email) {
        try {
          results.emailToClient = await this.sendToEmail(company.contact_email, 'ticket_status_changed', {
            ticketNumber: ticket.ticket_number,
            oldStatus: statusLabels[oldStatus] || oldStatus,
            newStatus: statusLabels[newStatus] || newStatus,
            subject: ticket.subject
          });
        } catch (error) {
          console.error(`❌ [SUPPORT-NOTIF-MULTI] Error enviando email:`, error.message);
        }
      }

      try {
        results.inboxClient = await this.sendToInbox(ticket.created_by_user_id, 'employee', {
          company_id: ticket.company_id,
          module: 'support',
          category: 'info',
          notification_type: 'support_status_changed',
          priority: 'low',
          title: `Estado actualizado: ${ticket.ticket_number}`,
          message: `El estado cambió de "${statusLabels[oldStatus]}" a "${statusLabels[newStatus]}".`,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          metadata: { ticket_id: ticket.ticket_id, old_status: oldStatus, new_status: newStatus }
        });
      } catch (error) {
        console.error(`❌ [SUPPORT-NOTIF-MULTI] Error creando inbox:`, error.message);
      }

      console.log(`✅ [SUPPORT-NOTIF-MULTI] Notificaciones de cambio de estado enviadas`);
      return results;

    } catch (error) {
      console.error(`❌ [SUPPORT-NOTIF-MULTI] Error en notifyStatusChanged:`, error.message);
      throw error;
    }
  }

  /**
   * Notificar escalamiento a supervisor (Email + Inbox + Alerta)
   *
   * @param {object} ticket
   * @param {object} supervisor
   * @param {object} company
   * @param {object} vendor
   * @returns {Promise<object>}
   */
  static async notifyEscalated(ticket, supervisor, company, vendor) {
    try {
      console.log(`📧 [SUPPORT-NOTIF-MULTI] Notificando escalamiento urgente`);

      const results = { emailToSupervisor: null, inboxSupervisor: null, alertSupervisor: null };

      // 1. Email al supervisor
      if (supervisor.email) {
        try {
          results.emailToSupervisor = await this.sendToEmail(supervisor.email, 'ticket_escalated', {
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            companyName: company.name,
            vendorName: `${vendor.first_name} ${vendor.last_name}`,
            escalationReason: ticket.escalation_reason || 'No especificada',
            slaDeadline: ticket.sla_resolution_deadline
          });
        } catch (error) {
          console.error(`❌ [SUPPORT-NOTIF-MULTI] Error enviando email:`, error.message);
        }
      }

      // 2. Inbox al supervisor (URGENTE)
      try {
        results.inboxSupervisor = await this.sendToInbox(supervisor.partner_id, 'supervisor', {
          company_id: 1,
          module: 'support',
          category: 'alert',
          notification_type: 'support_ticket_escalated',
          priority: 'urgent',
          title: `🚨 Ticket escalado: ${ticket.ticket_number}`,
          message: `Ticket de ${company.name} escalado por ${vendor.first_name}. Requiere atención URGENTE.`,
          action_url: `/support/tickets/${ticket.ticket_id}`,
          action_required: true,
          action_deadline: ticket.sla_resolution_deadline,
          metadata: { ticket_id: ticket.ticket_id, company_id: ticket.company_id, vendor_id: vendor.partner_id }
        });
      } catch (error) {
        console.error(`❌ [SUPPORT-NOTIF-MULTI] Error creando inbox:`, error.message);
      }

      console.log(`✅ [SUPPORT-NOTIF-MULTI] Notificaciones de escalamiento enviadas`);
      return results;

    } catch (error) {
      console.error(`❌ [SUPPORT-NOTIF-MULTI] Error en notifyEscalated:`, error.message);
      throw error;
    }
  }

  /**
   * Notificar ticket resuelto (Email + Inbox + Solicitud de rating)
   *
   * @param {object} ticket
   * @param {object} company
   * @returns {Promise<object>}
   */
  static async notifyResolved(ticket, company) {
    try {
      console.log(`📧 [SUPPORT-NOTIF-MULTI] Notificando resolución y solicitando rating`);

      const results = { emailToClient: null, inboxClient: null };

      // 1. Email al cliente con solicitud de rating
      if (company.contact_email) {
        try {
          results.emailToClient = await this.sendToEmail(company.contact_email, 'ticket_resolved', {
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            resolutionNotes: ticket.resolution_notes || 'Sin notas',
            ratingUrl: `${require('../utils/urlHelper').getBaseUrl()}/support/tickets/${ticket.ticket_id}/rate`
          });
        } catch (error) {
          console.error(`❌ [SUPPORT-NOTIF-MULTI] Error enviando email:`, error.message);
        }
      }

      // 2. Inbox al cliente con botón de rating
      try {
        results.inboxClient = await this.sendToInbox(ticket.created_by_user_id, 'employee', {
          company_id: ticket.company_id,
          module: 'support',
          category: 'success',
          notification_type: 'support_ticket_resolved',
          priority: 'low',
          title: `✅ Ticket resuelto: ${ticket.ticket_number}`,
          message: `Tu ticket ha sido resuelto. Por favor, evalúa el servicio recibido.`,
          action_url: `/support/tickets/${ticket.ticket_id}/rate`,
          action_required: true,
          metadata: { ticket_id: ticket.ticket_id, request_rating: true }
        });
      } catch (error) {
        console.error(`❌ [SUPPORT-NOTIF-MULTI] Error creando inbox:`, error.message);
      }

      console.log(`✅ [SUPPORT-NOTIF-MULTI] Notificaciones de resolución enviadas`);
      return results;

    } catch (error) {
      console.error(`❌ [SUPPORT-NOTIF-MULTI] Error en notifyResolved:`, error.message);
      throw error;
    }
  }

  /**
   * ========================================================================
   * FUNCIONES HELPER - CANALES DE ENVÍO
   * ========================================================================
   */

  /**
   * Guardar notificación en inbox (tabla notifications)
   *
   * @param {number} userId - ID del usuario (user_id o partner_id)
   * @param {string} userType - 'employee', 'vendor', 'supervisor', 'partner'
   * @param {object} notificationData - Datos de la notificación
   * @returns {Promise<object>}
   */
  static async sendToInbox(userId, userType, notificationData) {
    try {
      // 🔥 NCE: Central Telefónica de Notificaciones
      const nceResult = await NCE.send({
        companyId: notificationData.company_id,
        module: 'support',
        originType: notificationData.notification_type,
        originId: `support-${notificationData.notification_type}-${userId}-${Date.now()}`,
        workflowKey: `support.${notificationData.notification_type}`,
        recipientType: 'user',
        recipientId: userId,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'normal',
        requiresAction: notificationData.action_required || false,
        metadata: {
          ...notificationData.metadata,
          action_url: notificationData.action_url,
          category: notificationData.category,
          recipient_type: userType,
          action_deadline: notificationData.action_deadline
        },
        channels: ['inbox'],
      });

      console.log(`✅ [SUPPORT-NOTIF-INBOX] Notificación NCE guardada para ${userType} ${userId}`);
      return nceResult;

    } catch (error) {
      console.error(`❌ [SUPPORT-NOTIF-INBOX] Error guardando en NCE:`, error.message);
      throw error;
    }
  }

  /**
   * Enviar email usando EmailService de Aponnt + Handlebars templates
   *
   * @param {string} email - Email destinatario
   * @param {string} template - Nombre del template
   * @param {object} data - Datos para el template
   * @returns {Promise<object>}
   */
  static async sendToEmail(email, template, data) {
    try {
      // Mapeo de nombres de template a archivos y subjects
      const templateConfig = {
        'ticket_created_client': {
          file: 'ticket-created-client',
          subject: `Ticket de soporte creado: ${data.ticketNumber || data.ticket_number}`
        },
        'ticket_created_vendor': {
          file: 'ticket-created-vendor',
          subject: `Nuevo ticket asignado: ${data.ticketNumber || data.ticket_number}`
        },
        'ticket_new_message': {
          file: data.recipientType === 'client' ? 'ticket-new-message-client' : 'ticket-new-message-vendor',
          subject: `Nuevo mensaje en ${data.ticketNumber || data.ticket_number}`
        },
        'ticket_status_changed': {
          file: 'ticket-status-changed',
          subject: `Estado actualizado: ${data.ticketNumber || data.ticket_number}`
        },
        'ticket_escalated': {
          file: 'ticket-escalated',
          subject: `🚨 ESCALAMIENTO URGENTE: ${data.ticketNumber || data.ticket_number}`
        },
        'ticket_resolved': {
          file: 'ticket-resolved-request-rating',
          subject: `✅ Ticket resuelto: ${data.ticketNumber || data.ticket_number}`
        }
      };

      const config = templateConfig[template];
      if (!config) {
        throw new Error(`Template no encontrado: ${template}`);
      }

      // Preparar datos para el template (normalizar campos)
      const templateData = {
        ticket_number: data.ticketNumber || data.ticket_number,
        subject: data.subject,
        company_name: data.companyName || data.company_name,
        module_name: data.moduleName || data.module_name,
        module_display_name: data.moduleDisplayName || data.module_display_name || data.moduleName || data.module_name,
        priority: data.priority,
        priority_label: this._getPriorityLabel(data.priority),
        description: data.description,
        vendor_name: data.vendorName || data.vendor_name,
        vendor_email: data.vendorEmail || data.vendor_email,
        client_name: data.clientName || data.client_name,
        sender_name: data.senderName || data.sender_name,
        message_preview: data.messagePreview || data.message_preview,
        message_content: data.messageContent || data.message_content,
        old_status: data.oldStatus || data.old_status,
        new_status: data.newStatus || data.new_status,
        escalation_reason: data.escalationReason || data.escalation_reason,
        escalation_notes: data.escalationNotes || data.escalation_notes,
        resolution_notes: data.resolutionNotes || data.resolution_notes,
        sla_deadline: data.slaDeadline || data.sla_deadline,
        sla_response_time: data.slaResponseTime || data.sla_response_time,
        rating_url: data.ratingUrl || data.rating_url,
        ticket_url: data.ticketUrl || data.ticket_url,
        support_email: 'soporte@aponnt.com',
        created_at: data.createdAt || data.created_at || new Date(),
        assigned_at: data.assignedAt || data.assigned_at,
        resolved_at: data.resolvedAt || data.resolved_at
      };

      // Renderizar HTML usando EmailTemplateRenderer
      const emailHTML = await EmailTemplateRenderer.render(config.file, templateData);

      // Enviar email
      const result = await EmailService.sendFromAponnt('support', {
        to: email,
        subject: config.subject,
        html: emailHTML,
        category: 'support'
      });

      console.log(`✅ [SUPPORT-NOTIF-EMAIL] Email "${template}" (${config.file}) enviado a: ${email}`);
      return result;

    } catch (error) {
      console.error(`❌ [SUPPORT-NOTIF-EMAIL] Error enviando email:`, error.message);
      throw error;
    }
  }

  /**
   * Helper para obtener label de prioridad
   */
  static _getPriorityLabel(priority) {
    const labels = {
      'low': 'Baja',
      'normal': 'Normal',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  }
}

module.exports = SupportNotificationService;
