'use strict';

/**
 * DOCUMENT REQUEST WORKFLOW SERVICE v1.0
 *
 * Gestiona el flujo completo de solicitud-carga-validación-confirmación de documentos
 * integrado con el sistema de notificaciones enterprise.
 *
 * FLUJO:
 * 1. Sistema/RRHH solicita documento al empleado (crea thread de notificaciones)
 * 2. Empleado recibe notificación proactiva
 * 3. Empleado sube documento desde dashboard/APK
 * 4. Documento queda en estado "pending_review" (NO en vigencia)
 * 5. RRHH recibe notificación en el mismo hilo
 * 6. RRHH valida el documento
 * 7. Si aprueba: doc anterior → histórico, nuevo doc → vigente
 * 8. Sistema envía acuse de recibo al empleado
 * 9. Se cierra el hilo
 *
 * @version 1.0
 * @date 2025-12-06
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

class DocumentRequestWorkflowService {
  constructor(options = {}) {
    this.models = options.models;
    this.sequelize = options.sequelize;
    this.documentService = options.documentService;
    this.storageService = options.storageService;
    this.notificationService = options.notificationService;

    // Tipos de solicitud de documentos
    this.REQUEST_TYPES = {
      // Documentos personales
      DNI: { code: 'DNI', name: 'Documento de Identidad', category: 'HR', retention_days: 3650 },
      PASSPORT: { code: 'PASSPORT', name: 'Pasaporte', category: 'HR', retention_days: 3650 },
      DRIVER_LICENSE: { code: 'DRIVER_LICENSE', name: 'Licencia de Conducir', category: 'HR', retention_days: 1825 },

      // Certificados escolares hijos
      SCHOOL_CERT: { code: 'SCHOOL_CERT', name: 'Certificado Escolaridad Hijo/a', category: 'HR', retention_days: 365 },

      // Médicos
      MEDICAL_CERT: { code: 'MEDICAL_CERT', name: 'Certificado Médico', category: 'MED', retention_days: 365 },
      FIT_FOR_WORK: { code: 'FIT_FOR_WORK', name: 'Apto Físico', category: 'MED', retention_days: 365 },

      // Capacitación
      TRAINING_CERT: { code: 'TRAINING_CERT', name: 'Certificado de Capacitación', category: 'TRN', retention_days: 1825 },

      // Legales
      BACKGROUND_CHECK: { code: 'BACKGROUND_CHECK', name: 'Antecedentes Penales', category: 'LEG', retention_days: 365 },

      // Financieros
      BANK_ACCOUNT: { code: 'BANK_ACCOUNT', name: 'Constancia Cuenta Bancaria', category: 'FIN', retention_days: 365 }
    };

    // Estados de solicitud
    this.REQUEST_STATUS = {
      PENDING: 'pending',           // Esperando que empleado suba documento
      UPLOADED: 'uploaded',         // Empleado subió, pendiente validación RRHH
      APPROVED: 'approved',         // RRHH aprobó, documento en vigencia
      REJECTED: 'rejected',         // RRHH rechazó, requiere re-subida
      EXPIRED: 'expired',           // Vencida sin respuesta
      CANCELLED: 'cancelled'        // Cancelada por sistema/admin
    };
  }

  // =====================================================
  // CREAR SOLICITUD DE DOCUMENTO
  // =====================================================

  /**
   * Crear una solicitud de documento para un empleado
   * Inicia el workflow y crea el thread de notificaciones
   */
  async createDocumentRequest(data) {
    const {
      company_id,
      employee_id,       // UUID del empleado
      employee_name,     // Para mostrar en notificaciones
      requested_by,      // UUID de quien solicita (RRHH/sistema)
      requested_by_name,
      document_type,     // Código del tipo (DNI, PASSPORT, etc.)
      custom_title,      // Título personalizado (opcional)
      description,       // Descripción/instrucciones
      due_date,          // Fecha límite
      priority = 'normal', // low, normal, high, urgent
      notify_channels = ['internal'], // Canales de notificación
      related_document_id = null, // Si es renovación, ID del doc anterior
      metadata = {}
    } = data;

    const t = await this.sequelize.transaction();

    try {
      // Obtener info del tipo de documento
      const docTypeInfo = this.REQUEST_TYPES[document_type] || {
        code: document_type,
        name: custom_title || document_type,
        category: 'GEN'
      };

      // Generar thread_id único para todo este flujo
      const thread_id = `DOC-REQ-${company_id}-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Crear la solicitud en dms_document_requests
      const request = await this.models.DocumentRequest.create({
        company_id,
        type_code: docTypeInfo.code,
        title: custom_title || `Solicitud: ${docTypeInfo.name}`,
        description,
        requested_from_type: 'employee',
        requested_from_id: employee_id,
        requested_from_name: employee_name,
        requested_by,
        requested_by_name,
        priority,
        due_date,
        status: this.REQUEST_STATUS.PENDING,
        metadata: {
          ...metadata,
          thread_id, // Guardar el thread_id en metadata
          document_type_info: docTypeInfo,
          related_document_id,
          notify_channels
        }
      }, { transaction: t });

      // Crear notificación proactiva para el empleado
      const notification = await this._createThreadNotification({
        thread_id,
        company_id,
        from_user_id: requested_by,
        to_user_id: employee_id,
        to_role: 'employee',
        type: 'document_request',
        title: `📄 Solicitud de documento: ${docTypeInfo.name}`,
        message: this._buildRequestMessage(docTypeInfo, description, due_date, priority),
        priority,
        metadata: {
          request_id: request.id,
          document_type: docTypeInfo.code,
          due_date,
          action_required: true,
          action_type: 'upload_document',
          action_url: `/employee/documents/upload/${request.id}`
        },
        channels: notify_channels
      }, t);

      // Crear alerta en DMS
      await this.models.DocumentAlert.create({
        request_id: request.id,
        company_id,
        user_id: employee_id,
        alert_type: 'pending_upload',
        severity: priority === 'urgent' ? 'critical' : priority === 'high' ? 'error' : 'warning',
        title: `Documento pendiente: ${docTypeInfo.name}`,
        message: description || `Se requiere que suba su ${docTypeInfo.name}`,
        trigger_date: due_date
      }, { transaction: t });

      await t.commit();

      console.log(`📄 [DOC-WORKFLOW] Solicitud creada: ${request.id} - Thread: ${thread_id}`);

      return {
        success: true,
        request_id: request.id,
        thread_id,
        notification_id: notification.id,
        status: this.REQUEST_STATUS.PENDING,
        message: `Solicitud enviada a ${employee_name}`
      };

    } catch (error) {
      await t.rollback();
      console.error('[DOC-WORKFLOW] Error creando solicitud:', error);
      throw error;
    }
  }

  // =====================================================
  // EMPLEADO SUBE DOCUMENTO
  // =====================================================

  /**
   * El empleado sube el documento solicitado
   * El documento queda en estado "pending_review" (NO en vigencia)
   */
  async uploadRequestedDocument(data) {
    const {
      request_id,
      employee_id,
      file,              // Archivo subido (multer format)
      notes = '',        // Notas del empleado
      additional_metadata = {}
    } = data;

    const t = await this.sequelize.transaction();

    try {
      // Obtener la solicitud
      const request = await this.models.DocumentRequest.findOne({
        where: { id: request_id, requested_from_id: employee_id }
      });

      if (!request) {
        throw new Error('Solicitud no encontrada o no pertenece al empleado');
      }

      if (request.status !== this.REQUEST_STATUS.PENDING &&
          request.status !== this.REQUEST_STATUS.REJECTED) {
        throw new Error(`No se puede subir documento. Estado actual: ${request.status}`);
      }

      const thread_id = request.metadata?.thread_id;
      const docTypeInfo = request.metadata?.document_type_info || {};

      // Crear el documento en DMS con estado pending_review
      const document = await this.documentService.createDocument({
        folder_id: null, // Se asigna después según categoría
        document_type_id: null, // Se resuelve por type_code
        title: request.title,
        description: notes || request.description,
        tags: [docTypeInfo.code, 'solicitud', 'pendiente-validacion'],
        metadata: {
          ...additional_metadata,
          request_id: request.id,
          thread_id,
          uploaded_by_employee: true,
          requires_hr_validation: true
        },
        owner_type: 'employee',
        owner_id: employee_id,
        access_level: 'private',
        expiration_date: this._calculateExpirationDate(docTypeInfo.retention_days)
      }, file, employee_id, request.company_id, t);

      // Actualizar documento a estado pending_review
      await this.models.Document.update({
        status: 'pending_review'
      }, {
        where: { id: document.id },
        transaction: t
      });

      // Actualizar la solicitud
      await request.update({
        status: this.REQUEST_STATUS.UPLOADED,
        document_id: document.id,
        uploaded_at: new Date()
      }, { transaction: t });

      // Notificar a RRHH en el mismo hilo
      const hrNotification = await this._createThreadNotification({
        thread_id,
        company_id: request.company_id,
        from_user_id: employee_id,
        to_role: 'hr', // Notificar a todos los de RRHH
        type: 'document_uploaded',
        title: `📥 Documento recibido: ${docTypeInfo.name}`,
        message: `${request.requested_from_name} ha subido el documento solicitado.\n\n` +
                 `📄 ${docTypeInfo.name}\n` +
                 `📝 Notas: ${notes || 'Sin notas'}\n\n` +
                 `⚠️ Requiere validación para entrar en vigencia.`,
        priority: request.priority,
        metadata: {
          request_id: request.id,
          document_id: document.id,
          document_type: docTypeInfo.code,
          action_required: true,
          action_type: 'validate_document',
          action_url: `/hr/documents/validate/${document.id}`
        },
        requires_response: true
      }, t);

      // Actualizar alerta del empleado
      await this.models.DocumentAlert.update({
        alert_type: 'pending_review',
        title: 'Documento enviado - Pendiente validación',
        message: 'Su documento fue recibido y está siendo revisado por RRHH.',
        severity: 'info'
      }, {
        where: { request_id: request.id, user_id: employee_id },
        transaction: t
      });

      await t.commit();

      console.log(`📥 [DOC-WORKFLOW] Documento subido: ${document.id} - Request: ${request_id}`);

      return {
        success: true,
        document_id: document.id,
        request_id,
        status: this.REQUEST_STATUS.UPLOADED,
        message: 'Documento enviado. Pendiente validación de RRHH.'
      };

    } catch (error) {
      await t.rollback();
      console.error('[DOC-WORKFLOW] Error subiendo documento:', error);
      throw error;
    }
  }

  // =====================================================
  // RRHH VALIDA DOCUMENTO
  // =====================================================

  /**
   * RRHH valida el documento subido por el empleado
   * Si aprueba: doc anterior → histórico, nuevo doc → vigente
   */
  async validateDocument(data) {
    const {
      request_id,
      hr_user_id,
      hr_user_name,
      action,           // 'approve' | 'reject'
      rejection_reason, // Si rechaza
      validation_notes  // Notas del validador
    } = data;

    const t = await this.sequelize.transaction();

    try {
      // Obtener la solicitud con documento
      const request = await this.models.DocumentRequest.findOne({
        where: { id: request_id },
        include: [{
          model: this.models.Document,
          as: 'document'
        }]
      });

      if (!request) {
        throw new Error('Solicitud no encontrada');
      }

      if (request.status !== this.REQUEST_STATUS.UPLOADED) {
        throw new Error(`No se puede validar. Estado actual: ${request.status}`);
      }

      const thread_id = request.metadata?.thread_id;
      const docTypeInfo = request.metadata?.document_type_info || {};
      const relatedDocId = request.metadata?.related_document_id;

      if (action === 'approve') {
        // APROBAR: Documento entra en vigencia

        // Si hay documento anterior relacionado, archivarlo
        if (relatedDocId) {
          await this.models.Document.update({
            status: 'archived',
            archived_at: new Date(),
            archived_by: hr_user_id
          }, {
            where: { id: relatedDocId },
            transaction: t
          });

          // Log de auditoría para el documento anterior
          await this.models.DocumentAccessLog.create({
            document_id: relatedDocId,
            company_id: request.company_id,
            user_id: hr_user_id,
            action: 'archived',
            action_details: {
              reason: 'Reemplazado por nuevo documento',
              replacement_document_id: request.document_id
            }
          }, { transaction: t });
        }

        // Actualizar nuevo documento a estado 'approved' o 'published'
        await this.models.Document.update({
          status: 'approved',
          approved_by: hr_user_id,
          approved_at: new Date()
        }, {
          where: { id: request.document_id },
          transaction: t
        });

        // Actualizar solicitud
        await request.update({
          status: this.REQUEST_STATUS.APPROVED
        }, { transaction: t });

        // Notificar al empleado - ACUSE DE RECIBO
        await this._createThreadNotification({
          thread_id,
          company_id: request.company_id,
          from_user_id: hr_user_id,
          to_user_id: request.requested_from_id,
          to_role: 'employee',
          type: 'document_approved',
          title: `✅ Documento aprobado: ${docTypeInfo.name}`,
          message: `Su documento ha sido validado y está en vigencia.\n\n` +
                   `📄 ${docTypeInfo.name}\n` +
                   `✅ Validado por: ${hr_user_name}\n` +
                   `📝 ${validation_notes || 'Sin observaciones'}\n\n` +
                   `Este hilo de solicitud ha sido cerrado.`,
          priority: 'low',
          metadata: {
            request_id: request.id,
            document_id: request.document_id,
            thread_closed: true
          }
        }, t);

        // Actualizar/crear alerta final
        await this.models.DocumentAlert.update({
          alert_type: 'approved',
          title: '✅ Documento aprobado',
          message: `Su ${docTypeInfo.name} ha sido validado y está en vigencia.`,
          severity: 'info',
          is_read: false
        }, {
          where: { request_id: request.id, user_id: request.requested_from_id },
          transaction: t
        });

        await t.commit();

        console.log(`✅ [DOC-WORKFLOW] Documento aprobado: ${request.document_id}`);

        return {
          success: true,
          action: 'approved',
          request_id,
          document_id: request.document_id,
          archived_document_id: relatedDocId,
          thread_closed: true,
          message: 'Documento aprobado y en vigencia. Hilo cerrado.'
        };

      } else if (action === 'reject') {
        // RECHAZAR: Empleado debe re-subir

        // Actualizar documento a estado 'rejected'
        await this.models.Document.update({
          status: 'rejected',
          rejection_reason: rejection_reason
        }, {
          where: { id: request.document_id },
          transaction: t
        });

        // Actualizar solicitud para permitir re-subida
        await request.update({
          status: this.REQUEST_STATUS.REJECTED,
          document_id: null, // Limpiar para permitir nueva subida
          reminder_count: (request.reminder_count || 0) + 1
        }, { transaction: t });

        // Notificar al empleado - RECHAZO
        await this._createThreadNotification({
          thread_id,
          company_id: request.company_id,
          from_user_id: hr_user_id,
          to_user_id: request.requested_from_id,
          to_role: 'employee',
          type: 'document_rejected',
          title: `❌ Documento rechazado: ${docTypeInfo.name}`,
          message: `Su documento no fue aprobado y requiere corrección.\n\n` +
                   `📄 ${docTypeInfo.name}\n` +
                   `❌ Motivo: ${rejection_reason}\n` +
                   `📝 ${validation_notes || ''}\n\n` +
                   `Por favor, suba nuevamente el documento corregido.`,
          priority: 'high',
          metadata: {
            request_id: request.id,
            document_id: request.document_id,
            action_required: true,
            action_type: 'reupload_document',
            action_url: `/employee/documents/upload/${request.id}`
          }
        }, t);

        // Actualizar alerta
        await this.models.DocumentAlert.update({
          alert_type: 'rejected',
          title: '❌ Documento rechazado - Acción requerida',
          message: `Su ${docTypeInfo.name} fue rechazado: ${rejection_reason}`,
          severity: 'error',
          is_read: false
        }, {
          where: { request_id: request.id, user_id: request.requested_from_id },
          transaction: t
        });

        await t.commit();

        console.log(`❌ [DOC-WORKFLOW] Documento rechazado: ${request.document_id}`);

        return {
          success: true,
          action: 'rejected',
          request_id,
          document_id: request.document_id,
          thread_closed: false,
          message: 'Documento rechazado. Empleado notificado para re-subida.'
        };
      }

    } catch (error) {
      await t.rollback();
      console.error('[DOC-WORKFLOW] Error validando documento:', error);
      throw error;
    }
  }

  // =====================================================
  // ENVIAR RECORDATORIO
  // =====================================================

  /**
   * Enviar recordatorio a empleado que no ha subido documento
   */
  async sendReminder(request_id, hr_user_id) {
    const request = await this.models.DocumentRequest.findByPk(request_id);

    if (!request || request.status !== this.REQUEST_STATUS.PENDING) {
      throw new Error('Solicitud no válida para recordatorio');
    }

    const thread_id = request.metadata?.thread_id;
    const docTypeInfo = request.metadata?.document_type_info || {};

    await request.update({
      reminder_sent_at: new Date(),
      reminder_count: (request.reminder_count || 0) + 1
    });

    await this._createThreadNotification({
      thread_id,
      company_id: request.company_id,
      from_user_id: hr_user_id,
      to_user_id: request.requested_from_id,
      to_role: 'employee',
      type: 'document_reminder',
      title: `⏰ Recordatorio: ${docTypeInfo.name}`,
      message: `Recordamos que tiene pendiente subir: ${docTypeInfo.name}\n\n` +
               `📅 Fecha límite: ${request.due_date || 'Sin fecha límite'}\n` +
               `📝 ${request.description || ''}\n\n` +
               `Este es el recordatorio #${request.reminder_count + 1}`,
      priority: 'high',
      metadata: {
        request_id: request.id,
        reminder_number: request.reminder_count + 1,
        action_required: true,
        action_type: 'upload_document'
      }
    });

    return {
      success: true,
      reminder_count: request.reminder_count + 1,
      message: 'Recordatorio enviado'
    };
  }

  // =====================================================
  // CONSULTAS
  // =====================================================

  /**
   * Obtener solicitudes pendientes de un empleado
   */
  async getEmployeePendingRequests(employee_id, company_id) {
    return this.models.DocumentRequest.findAll({
      where: {
        company_id,
        requested_from_id: employee_id,
        status: {
          [Op.in]: [this.REQUEST_STATUS.PENDING, this.REQUEST_STATUS.REJECTED]
        }
      },
      order: [['due_date', 'ASC'], ['priority', 'DESC']]
    });
  }

  /**
   * Obtener solicitudes pendientes de validación (para RRHH)
   */
  async getPendingValidationRequests(company_id) {
    return this.models.DocumentRequest.findAll({
      where: {
        company_id,
        status: this.REQUEST_STATUS.UPLOADED
      },
      include: [{
        model: this.models.Document,
        as: 'document'
      }],
      order: [['uploaded_at', 'ASC']]
    });
  }

  /**
   * Obtener historial de thread completo
   */
  async getThreadHistory(thread_id, company_id) {
    // Obtener todas las notificaciones del thread
    const notifications = await this.sequelize.query(`
      SELECT
        id, title, message, notification_type as type,
        from_user_id, to_user_id, status, priority,
        metadata, created_at, read_at
      FROM notifications_enterprise
      WHERE company_id = :company_id
        AND metadata->>'thread_id' = :thread_id
      ORDER BY created_at ASC
    `, {
      replacements: { company_id, thread_id },
      type: this.sequelize.QueryTypes.SELECT
    });

    // Obtener la solicitud asociada
    const [request] = await this.sequelize.query(`
      SELECT * FROM dms_document_requests
      WHERE company_id = :company_id
        AND metadata->>'thread_id' = :thread_id
    `, {
      replacements: { company_id, thread_id },
      type: this.sequelize.QueryTypes.SELECT
    });

    return {
      thread_id,
      request,
      notifications,
      is_closed: request?.status === this.REQUEST_STATUS.APPROVED ||
                 request?.status === this.REQUEST_STATUS.CANCELLED
    };
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  /**
   * Crear notificación en el thread
   * @private
   */
  async _createThreadNotification(data, transaction = null) {
    const {
      thread_id,
      company_id,
      from_user_id,
      to_user_id,
      to_role,
      type,
      title,
      message,
      priority = 'medium',
      metadata = {},
      requires_response = false,
      channels = ['internal']
    } = data;

    // Crear la notificación con el thread_id en metadata
    const notificationData = {
      id: uuidv4(),
      companyId: company_id,
      notificationCode: `${type}-${thread_id}`,
      fromModule: 'hr',
      fromUserId: from_user_id,
      toUserId: to_user_id || 'role:' + to_role,
      toRole: to_role || 'employee',
      title,
      message,
      notificationType: type,
      status: 'pending',
      priority,
      channels,
      metadata: {
        ...metadata,
        thread_id
      },
      requiresResponse: requires_response
    };

    // Si el notificationService está disponible, usarlo
    if (this.notificationService) {
      return this.notificationService.createNotification(notificationData);
    }

    // Fallback: insertar directamente
    const [notification] = await this.sequelize.query(`
      INSERT INTO notifications_enterprise (
        id, company_id, notification_code, from_module,
        from_user_id, to_user_id, to_role, title, message,
        notification_type, status, priority, channels, metadata,
        requires_response, created_at, updated_at
      ) VALUES (
        :id, :company_id, :notification_code, :from_module,
        :from_user_id, :to_user_id, :to_role, :title, :message,
        :notification_type, :status, :priority, :channels, :metadata,
        :requires_response, NOW(), NOW()
      )
      RETURNING *
    `, {
      replacements: {
        id: notificationData.id,
        company_id: notificationData.companyId,
        notification_code: notificationData.notificationCode,
        from_module: notificationData.fromModule,
        from_user_id: notificationData.fromUserId,
        to_user_id: notificationData.toUserId,
        to_role: notificationData.toRole,
        title: notificationData.title,
        message: notificationData.message,
        notification_type: notificationData.notificationType,
        status: notificationData.status,
        priority: notificationData.priority,
        channels: JSON.stringify(notificationData.channels),
        metadata: JSON.stringify(notificationData.metadata),
        requires_response: notificationData.requiresResponse
      },
      transaction,
      type: this.sequelize.QueryTypes.INSERT
    });

    return { id: notificationData.id, ...notificationData };
  }

  /**
   * Construir mensaje de solicitud
   * @private
   */
  _buildRequestMessage(docTypeInfo, description, due_date, priority) {
    const priorityEmoji = {
      urgent: '🚨',
      high: '⚠️',
      normal: '📝',
      low: 'ℹ️'
    };

    let msg = `${priorityEmoji[priority] || '📝'} Se requiere que presente:\n\n`;
    msg += `📄 **${docTypeInfo.name}**\n`;

    if (description) {
      msg += `📋 ${description}\n`;
    }

    if (due_date) {
      msg += `\n📅 Fecha límite: ${new Date(due_date).toLocaleDateString('es-AR')}\n`;
    }

    msg += `\n👉 Ingrese a su dashboard para subir el documento.`;

    return msg;
  }

  /**
   * Calcular fecha de expiración
   * @private
   */
  _calculateExpirationDate(retention_days) {
    if (!retention_days) return null;
    const date = new Date();
    date.setDate(date.getDate() + retention_days);
    return date;
  }
}

module.exports = DocumentRequestWorkflowService;
