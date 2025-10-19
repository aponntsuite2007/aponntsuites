/**
 * SERVICIO: NotificationWorkflowService
 * Motor central del sistema de notificaciones enterprise
 *
 * Responsabilidades:
 * - Crear notificaciones con workflows
 * - Procesar acciones (aprobar/rechazar/escalar)
 * - Renderizar templates
 * - Gestionar escalamiento automático
 * - Enviar notificaciones por múltiples canales
 */

const {
  Notification,
  NotificationWorkflow,
  NotificationActionsLog,
  NotificationTemplate,
  UserNotificationPreference,
  User,
  Department,
  Shift
} = require('../config/database');

const workflowConfigHelper = require('../utils/workflowConfigHelper');
const { isModuleActive } = require('../utils/moduleHelper');

class NotificationWorkflowService {

  /**
   * Crear notificación con workflow automático
   *
   * @param {Object} data - Datos de la notificación
   * @param {String} data.module - Módulo (attendance, medical, legal, etc.)
   * @param {String} data.notificationType - Tipo específico
   * @param {Number} data.companyId - ID de la empresa
   * @param {String} data.category - Categoría (approval_request, alert, info, etc.)
   * @param {String} data.priority - Prioridad (low, medium, high, critical, urgent)
   * @param {Object} data.entity - Entidad relacionada (attendance, etc.)
   * @param {Object} data.variables - Variables para renderizar template
   * @param {String} [data.templateKey] - Clave del template a usar
   * @param {Object} [data.recipient] - Destinatario específico
   * @returns {Promise<Notification>}
   */
  async createNotification(data) {
    try {
      // 1. Buscar workflow aplicable
      const workflow = await NotificationWorkflow.findApplicable(
        data.module,
        data.entity || {},
        data.companyId
      );

      // 2. Determinar destinatario inicial
      const recipientData = await this.resolveRecipient(
        data,
        workflow,
        1 // Paso 1 del workflow
      );

      // 3. Renderizar template si se especifica
      let content = {};
      if (data.templateKey) {
        const template = await NotificationTemplate.findByKey(
          data.templateKey,
          data.companyId
        );

        if (template) {
          content = template.render(data.variables || {});
        }
      }

      // 4. Crear notificación
      const notification = await Notification.create({
        company_id: data.companyId,
        module: data.module,
        category: data.category || 'info',
        notification_type: data.notificationType,
        priority: data.priority || 'medium',

        // Destinatario (NUEVO: soporta múltiples con recipient_custom_list)
        recipient_user_id: recipientData.userId,
        recipient_role: recipientData.role,
        recipient_department_id: recipientData.departmentId,
        recipient_shift_id: recipientData.shiftId,
        recipient_custom_list: recipientData.userIds || [],  // NUEVO: Array de user IDs
        is_broadcast: recipientData.isBroadcast || false,

        // Contenido
        title: content.title || data.title,
        message: content.message || data.message,
        short_message: content.short_message || data.shortMessage,
        email_body: content.email_body,

        // Relaciones
        related_entity_type: data.relatedEntityType,
        related_entity_id: data.relatedEntityId,
        related_user_id: data.relatedUserId,
        related_department_id: data.relatedDepartmentId,
        related_kiosk_id: data.relatedKioskId,
        related_attendance_id: data.relatedAttendanceId,

        // Metadata
        metadata: data.metadata || {},

        // Workflow
        requires_action: workflow ? true : false,
        action_status: workflow ? 'pending' : null,
        action_type: data.actionType || (workflow ? 'approve_reject' : null),
        action_deadline: workflow ? this.calculateDeadline(workflow.getFirstStep()) : null,
        action_options: data.actionOptions || (workflow ? ['approve', 'reject'] : []),

        // Canales
        sent_via_app: true,
        sent_via_email: data.sendEmail || false,
        sent_via_whatsapp: data.sendWhatsApp || false,
        sent_via_sms: data.sendSms || false,

        created_by: data.createdBy || null
      });

      // 5. Registrar en log de acciones
      await NotificationActionsLog.log({
        notificationId: notification.id,
        companyId: data.companyId,
        action: 'created',
        userId: data.createdBy,
        newStatus: workflow ? 'pending' : 'sent',
        metadata: {
          workflow_id: workflow?.id,
          step: 1,
          template_key: data.templateKey
        }
      });

      // 6. Enviar por canales configurados
      await this.sendViaChannels(notification, data);

      // 7. Programar recordatorio si aplica
      if (workflow && notification.action_deadline) {
        this.scheduleReminder(notification);
      }

      return notification;

    } catch (error) {
      console.error('[NotificationWorkflowService] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Procesar acción sobre una notificación
   *
   * @param {Number} notificationId - ID de la notificación
   * @param {String} action - Acción (approve, reject, request_more_info, etc.)
   * @param {String} userId - ID del usuario que realiza la acción
   * @param {String} [response] - Respuesta o notas
   * @param {Object} [metadata] - Metadata adicional
   * @returns {Promise<Notification>}
   */
  async processAction(notificationId, action, userId, response = null, metadata = {}) {
    try {
      const notification = await Notification.findByPk(notificationId);

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (!notification.requires_action) {
        throw new Error('This notification does not require action');
      }

      if (notification.action_status !== 'pending') {
        throw new Error(`Cannot process action on notification with status: ${notification.action_status}`);
      }

      const previousStatus = notification.action_status;

      // Buscar workflow
      const workflow = await NotificationWorkflow.findApplicable(
        notification.module,
        { requires_authorization: true },
        notification.company_id
      );

      // Registrar acción
      await notification.recordAction(action, response, userId);

      // Registrar en log
      await NotificationActionsLog.log({
        notificationId: notification.id,
        companyId: notification.company_id,
        action: action,
        userId: userId,
        previousStatus: previousStatus,
        newStatus: notification.action_status,
        notes: response,
        metadata: metadata
      });

      // Determinar siguiente paso basado en la acción
      if (action === 'approve' || action === 'approved') {
        await this.handleApproval(notification, workflow, userId, response);
      } else if (action === 'reject' || action === 'rejected') {
        await this.handleRejection(notification, workflow, userId, response);
      } else if (action === 'escalate') {
        await this.escalateToNextStep(notification, workflow, metadata);
      }

      return notification;

    } catch (error) {
      console.error('[NotificationWorkflowService] Error processing action:', error);
      throw error;
    }
  }

  /**
   * Manejar aprobación
   */
  async handleApproval(notification, workflow, userId, response) {
    if (!workflow) {
      // Sin workflow, simplemente aprobar
      notification.action_status = 'approved';
      await notification.save();

      // Notificar al usuario relacionado
      if (notification.related_user_id) {
        await this.notifyDecision(notification, 'approved', response);
      }
      return;
    }

    // Verificar si hay más pasos en el workflow
    const currentStep = notification.escalation_level || 1;
    const nextStep = workflow.getNextStep(currentStep);

    if (nextStep) {
      // Escalar al siguiente nivel
      await this.escalateToNextStep(notification, workflow, { approved_by: userId, notes: response });
    } else {
      // Es el último paso, aprobar definitivamente
      notification.action_status = 'final_approved';
      await notification.save();

      // Ejecutar acciones de aprobación
      if (workflow.on_approval_actions && workflow.on_approval_actions.length > 0) {
        await this.executeWorkflowActions(notification, workflow.on_approval_actions);
      }

      // Notificar decisión final al usuario
      if (notification.related_user_id) {
        await this.notifyDecision(notification, 'approved', response);
      }
    }
  }

  /**
   * Manejar rechazo
   */
  async handleRejection(notification, workflow, userId, response) {
    notification.action_status = 'final_rejected';
    await notification.save();

    // Ejecutar acciones de rechazo
    if (workflow && workflow.on_rejection_actions && workflow.on_rejection_actions.length > 0) {
      await this.executeWorkflowActions(notification, workflow.on_rejection_actions);
    }

    // Notificar decisión final al usuario
    if (notification.related_user_id) {
      await this.notifyDecision(notification, 'rejected', response);
    }
  }

  /**
   * Escalar notificación al siguiente nivel del workflow
   */
  async escalateToNextStep(notification, workflow, metadata = {}) {
    const currentStep = notification.escalation_level || 1;
    const nextStep = workflow.getNextStep(currentStep);

    if (!nextStep) {
      throw new Error('No next step in workflow');
    }

    // Resolver destinatario del siguiente nivel
    const recipientData = await this.resolveRecipient(
      {
        module: notification.module,
        companyId: notification.company_id
      },
      workflow,
      nextStep.step
    );

    // Crear nueva notificación para el siguiente nivel
    const escalatedNotification = await Notification.create({
      company_id: notification.company_id,
      module: notification.module,
      category: notification.category,
      notification_type: notification.notification_type,
      priority: notification.priority,

      // Destinatario del siguiente nivel
      recipient_user_id: recipientData.userId,
      recipient_role: recipientData.role,

      // Contenido (heredado de notificación original)
      title: `[ESCALADO] ${notification.title}`,
      message: notification.message + `\n\n📈 Escalado desde: ${notification.recipient_role || 'supervisor'}`,

      // Relaciones (heredadas)
      related_entity_type: notification.related_entity_type,
      related_entity_id: notification.related_entity_id,
      related_user_id: notification.related_user_id,
      metadata: { ...notification.metadata, ...metadata },

      // Workflow
      requires_action: true,
      action_status: 'pending',
      action_deadline: this.calculateDeadline(nextStep),
      escalation_level: nextStep.step,
      escalated_from_notification_id: notification.id,

      // Canales
      sent_via_app: true
    });

    // Actualizar notificación original
    notification.escalated_to_notification_id = escalatedNotification.id;
    notification.action_status = 'escalated';
    notification.escalation_reason = metadata.reason || 'workflow_progression';
    await notification.save();

    // Enviar notificación escalada
    await this.sendViaChannels(escalatedNotification, {});

    return escalatedNotification;
  }

  /**
   * Resolver destinatario según workflow y paso
   * NUEVO: Usa configuración dinámica en vez de hardcodear
   */
  async resolveRecipient(data, workflow, stepNumber) {
    try {
      // 1. Si no hay workflow, usar destinatario manual
      if (!workflow) {
        return {
          userId: data.recipient?.userId,
          role: data.recipient?.role,
          departmentId: data.recipient?.departmentId,
          shiftId: data.recipient?.shiftId,
          isBroadcast: data.recipient?.isBroadcast || false,
          userIds: data.recipient?.userId ? [data.recipient.userId] : []
        };
      }

      const step = workflow.getStep(stepNumber);
      if (!step) {
        throw new Error(`Step ${stepNumber} not found in workflow`);
      }

      // 2. NUEVO: Intentar resolver con configuración dinámica
      const workflowKey = workflow.workflow_key;

      let resolvedUserIds = [];

      if (stepNumber === 1) {
        // Paso inicial: usar recipients configurados
        resolvedUserIds = await workflowConfigHelper.resolveRecipients(
          data.companyId,
          workflowKey,
          {
            relatedUserId: data.relatedUserId,
            entity: data.entity,
            specificUserId: data.recipient?.userId
          }
        );
      } else {
        // Paso de escalamiento: usar escalation_chain
        const escalationStep = await workflowConfigHelper.resolveEscalationStep(
          data.companyId,
          workflowKey,
          stepNumber - 1,  // escalation_chain es 0-indexed
          {
            relatedUserId: data.relatedUserId,
            entity: data.entity
          }
        );

        if (escalationStep) {
          resolvedUserIds = escalationStep.recipients;
        }
      }

      // 3. Si se resolvieron usuarios dinámicamente, usarlos
      if (resolvedUserIds && resolvedUserIds.length > 0) {
        console.log(`✅ [WORKFLOW] Resueltos ${resolvedUserIds.length} destinatarios dinámicamente`);

        return {
          userId: resolvedUserIds[0],  // Compatibilidad con código legacy
          userIds: resolvedUserIds,     // NUEVO: Lista completa
          role: null,
          departmentId: null,
          shiftId: null,
          isBroadcast: resolvedUserIds.length > 1  // Si hay múltiples, es broadcast
        };
      }

      // 4. FALLBACK: Usar lógica legacy (approver_role, approver_field)
      console.log(`⚠️  [WORKFLOW] Sin config dinámica, usando lógica legacy`);

      // Resolver por rol (legacy)
      if (step.approver_role) {
        const users = await User.findAll({
          where: {
            company_id: data.companyId,
            role: step.approver_role,
            is_active: true
          },
          attributes: ['id']
        });

        const userIds = users.map(u => u.id);

        return {
          userId: userIds[0] || null,
          userIds: userIds,
          role: step.approver_role,
          departmentId: null,
          shiftId: null,
          isBroadcast: userIds.length > 1
        };
      }

      // Resolver por campo específico (legacy - ej: supervisor_id)
      if (step.approver_field && data.relatedUserId) {
        const employee = await User.findByPk(data.relatedUserId, {
          attributes: ['id', step.approver_field]
        });

        const supervisorId = employee?.[step.approver_field];

        if (supervisorId) {
          return {
            userId: supervisorId,
            userIds: [supervisorId],
            role: null,
            departmentId: null,
            shiftId: null,
            isBroadcast: false
          };
        }
      }

      // 5. No se pudo resolver ningún destinatario
      console.warn(`⚠️  [WORKFLOW] No se pudieron resolver destinatarios para paso ${stepNumber}`);
      return {
        userId: null,
        userIds: [],
        role: null,
        departmentId: null,
        shiftId: null,
        isBroadcast: false
      };

    } catch (error) {
      console.error(`❌ [WORKFLOW] Error resolviendo destinatarios:`, error.message);
      throw error;
    }
  }

  /**
   * Calcular deadline basándose en timeout del paso
   */
  calculateDeadline(step) {
    if (!step || !step.timeout_minutes) return null;

    const now = new Date();
    now.setMinutes(now.getMinutes() + step.timeout_minutes);
    return now;
  }

  /**
   * Enviar notificación por múltiples canales
   */
  async sendViaChannels(notification, options = {}) {
    const promises = [];

    // App (siempre se envía)
    // Ya está creada en la base de datos, no requiere acción adicional

    // Email
    if (notification.sent_via_email && notification.email_body) {
      promises.push(this.sendEmail(notification));
    }

    // WhatsApp
    if (notification.sent_via_whatsapp && notification.short_message) {
      promises.push(this.sendWhatsApp(notification));
    }

    // SMS
    if (notification.sent_via_sms && notification.short_message) {
      promises.push(this.sendSMS(notification));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Enviar email (placeholder - implementar con nodemailer)
   */
  async sendEmail(notification) {
    console.log('[NotificationWorkflowService] Sending email:', notification.id);
    // TODO: Implementar con nodemailer
    notification.email_sent_at = new Date();
    await notification.save();
  }

  /**
   * Enviar WhatsApp (placeholder - implementar con Twilio/Meta API)
   */
  async sendWhatsApp(notification) {
    console.log('[NotificationWorkflowService] Sending WhatsApp:', notification.id);
    // TODO: Implementar con Twilio o Meta WhatsApp API
    notification.whatsapp_sent_at = new Date();
    await notification.save();
  }

  /**
   * Enviar SMS (placeholder - implementar con Twilio)
   */
  async sendSMS(notification) {
    console.log('[NotificationWorkflowService] Sending SMS:', notification.id);
    // TODO: Implementar con Twilio
    notification.sms_sent_at = new Date();
    await notification.save();
  }

  /**
   * Notificar decisión final al usuario afectado
   */
  async notifyDecision(originalNotification, decision, notes) {
    const decisionNotification = await this.createNotification({
      module: originalNotification.module,
      notificationType: `${originalNotification.notification_type}_${decision}`,
      companyId: originalNotification.company_id,
      category: 'info',
      priority: 'medium',
      title: decision === 'approved' ? '✅ Solicitud Aprobada' : '❌ Solicitud Rechazada',
      message: `Tu solicitud ha sido ${decision === 'approved' ? 'aprobada' : 'rechazada'}.\n\nNotas: ${notes || 'Sin comentarios'}`,
      recipient: {
        userId: originalNotification.related_user_id
      }
    });

    return decisionNotification;
  }

  /**
   * Ejecutar acciones del workflow
   */
  async executeWorkflowActions(notification, actions) {
    for (const action of actions) {
      try {
        console.log(`[NotificationWorkflowService] Executing action: ${action}`);
        // TODO: Implementar acciones específicas
        // Ejemplos:
        // - update_attendance_final_approved
        // - notify_employee_approved
        // - grant_access
        // - update_record_status
      } catch (error) {
        console.error(`[NotificationWorkflowService] Error executing action ${action}:`, error);
      }
    }
  }

  /**
   * Programar recordatorio
   */
  scheduleReminder(notification) {
    // TODO: Implementar con cron job o bull queue
    console.log('[NotificationWorkflowService] Scheduling reminder for:', notification.id);
  }

  /**
   * Verificar timeouts y escalar automáticamente
   * (Debe ejecutarse cada 5 minutos via cron)
   */
  async checkTimeouts() {
    try {
      const expiredNotifications = await Notification.getPastDeadline(null);

      for (const notification of expiredNotifications) {
        const workflow = await NotificationWorkflow.findApplicable(
          notification.module,
          { requires_authorization: true },
          notification.company_id
        );

        if (workflow) {
          const currentStep = workflow.getStep(notification.escalation_level || 1);

          if (currentStep && currentStep.escalate_on_timeout) {
            await this.escalateToNextStep(notification, workflow, {
              reason: 'timeout',
              original_deadline: notification.action_deadline
            });
          }
        }
      }

    } catch (error) {
      console.error('[NotificationWorkflowService] Error checking timeouts:', error);
    }
  }
}

module.exports = new NotificationWorkflowService();
