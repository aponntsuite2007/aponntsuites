/**
 * SERVICIO: PartnerNotificationService
 *
 * Gestiona notificaciones para el sistema de Partners/Asociados
 * Integra con el modelo Notification existente (sistema enterprise unificado)
 *
 * Funcionalidades:
 * - Notificaciones de cambio de estado a partners
 * - Notificaciones automáticas a clientes con contratos activos
 * - Registro en partner_status_history
 * - Envío multi-canal (app, email, whatsapp)
 *
 * @module PartnerNotificationService
 */

const database = require('../config/database');
const nodemailer = require('nodemailer');
const { QueryTypes } = require('sequelize');

class PartnerNotificationService {
  constructor() {
    // Configurar transporter de email (usa variables de entorno)
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Notificar cambio de estado de partner
   *
   * @param {Object} params - Parámetros de notificación
   * @param {number} params.partnerId - ID del partner
   * @param {string} params.oldStatus - Estado anterior
   * @param {string} params.newStatus - Nuevo estado
   * @param {string} params.changedByUserId - UUID del usuario que hizo el cambio
   * @param {string} params.changedByRole - Rol del usuario (gerente/administrador)
   * @param {string} params.changedByName - Nombre del usuario para display
   * @param {string} params.changeReason - Motivo del cambio (obligatorio para baja/suspendido/renuncia)
   * @param {string} params.changeNotes - Notas internas adicionales
   * @param {string} params.ipAddress - IP del usuario que hizo el cambio
   * @param {string} params.userAgent - User-Agent del navegador
   * @returns {Promise<Object>} Resultado del envío de notificaciones
   */
  async notifyPartnerStatusChange(params) {
    const {
      partnerId,
      oldStatus,
      newStatus,
      changedByUserId,
      changedByRole,
      changedByName,
      changeReason,
      changeNotes,
      ipAddress,
      userAgent
    } = params;

    try {
      console.log(`📧 [PARTNER NOTIFICATIONS] Procesando cambio de estado para partner ${partnerId}: ${oldStatus} → ${newStatus}`);

      // 1. Obtener datos del partner
      const partnerQuery = `
        SELECT p.id, p.email, p.first_name, p.last_name, p.company_name, p.phone, pr.name as role_name
        FROM partners p
        LEFT JOIN partner_roles pr ON p.role_id = pr.id
        WHERE p.id = :partnerId
      `;

      const partnerResult = await database.sequelize.query(partnerQuery, {
        replacements: { partnerId },
        type: QueryTypes.SELECT
      });

      if (partnerResult.length === 0) {
        throw new Error(`Partner ${partnerId} no encontrado`);
      }

      const partner = partnerResult[0];

      // 2. Obtener contratos activos del partner (si aplica)
      let activeContracts = [];
      let clientsToNotify = [];

      if (['suspendido', 'baja', 'renuncia'].includes(newStatus)) {
        const contractsQuery = `
          SELECT * FROM get_partner_active_contracts(:partnerId);
        `;

        const contractsResult = await database.sequelize.query(contractsQuery, {
          replacements: { partnerId },
          type: QueryTypes.SELECT
        });

        activeContracts = contractsResult;

        // Preparar lista de clientes a notificar
        clientsToNotify = activeContracts.map(contract => ({
          company_id: contract.company_id,
          company_name: contract.company_name,
          email: contract.contact_email,
          service_type: contract.service_type,
          service_request_id: contract.service_request_id
        }));

        console.log(`   📋 Contratos activos encontrados: ${activeContracts.length}`);
      }

      // 3. Crear entrada en partner_status_history
      const historyQuery = `
        INSERT INTO partner_status_history (
          partner_id, old_status, new_status,
          changed_by_user_id, changed_by_role, changed_by_name,
          change_reason, change_notes,
          notification_sent, email_sent_to,
          clients_notified, active_contracts_count,
          ip_address, user_agent, created_at
        ) VALUES (
          :partnerId, :oldStatus, :newStatus,
          :changedByUserId, :changedByRole, :changedByName,
          :changeReason, :changeNotes,
          false, :partnerEmail,
          :clientsNotified::jsonb, :contractsCount,
          :ipAddress::inet, :userAgent, NOW()
        )
        RETURNING id;
      `;

      const historyResult = await database.sequelize.query(historyQuery, {
        replacements: {
          partnerId,
          oldStatus,
          newStatus,
          changedByUserId,
          changedByRole,
          changedByName,
          changeReason,
          changeNotes,
          partnerEmail: partner.email,
          clientsNotified: JSON.stringify(clientsToNotify),
          contractsCount: activeContracts.length,
          ipAddress,
          userAgent
        },
        type: QueryTypes.INSERT
      });

      const historyId = historyResult[0][0].id;
      console.log(`   ✅ Historia registrada con ID: ${historyId}`);

      // 4. Generar contenido de notificación
      const notification = this._generateNotificationContent(partner, oldStatus, newStatus, changeReason, changedByName, activeContracts);

      // 5. Crear notificación en tabla notifications (sistema unificado)
      const Notification = database.Notification;

      const partnerNotification = await Notification.create({
        company_id: null, // Partners no tienen company_id en tabla partners (es global)
        module: 'partners',
        category: this._getNotificationCategory(newStatus),
        notification_type: `partner_status_${newStatus}`,
        priority: this._getNotificationPriority(newStatus),

        // Destinatario (el partner)
        recipient_user_id: null, // Partner no es user del sistema
        recipient_custom_list: [partner.email],

        // Contenido
        title: notification.title,
        message: notification.message,
        short_message: notification.shortMessage,
        email_body: notification.emailBody,

        // Contexto
        related_entity_type: 'partner',
        related_entity_id: partnerId,
        related_partner_id: partnerId,

        // Metadata
        metadata: {
          old_status: oldStatus,
          new_status: newStatus,
          change_reason: changeReason,
          changed_by: changedByName,
          changed_by_role: changedByRole,
          active_contracts_count: activeContracts.length,
          history_id: historyId
        },

        // Sender
        sender_user_id: changedByUserId,
        sender_type: 'admin',

        // Canales
        sent_via_app: true,
        sent_via_email: true,

        // No requiere acción del partner (solo informativa)
        requires_action: false,

        created_by: changedByUserId
      });

      console.log(`   ✅ Notificación creada con ID: ${partnerNotification.id}`);

      // 6. Enviar email al partner
      let emailSent = false;
      let emailSentAt = null;

      if (partner.email && process.env.SMTP_USER) {
        try {
          await this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'Sistema de Partners <noreply@empresa.com>',
            to: partner.email,
            subject: notification.emailSubject,
            html: notification.emailBody
          });

          emailSent = true;
          emailSentAt = new Date();

          console.log(`   ✅ Email enviado a partner: ${partner.email}`);

          // Actualizar notificación
          await partnerNotification.update({
            email_sent_at: emailSentAt
          });
        } catch (emailError) {
          console.error(`   ⚠️  Error enviando email a partner:`, emailError.message);
        }
      }

      // 7. Enviar notificaciones a clientes (si hay contratos activos)
      const clientNotifications = [];

      for (const client of clientsToNotify) {
        try {
          const clientNotificationContent = this._generateClientNotificationContent(
            partner,
            newStatus,
            changeReason,
            client
          );

          // Crear notificación para el cliente
          const clientNotif = await Notification.create({
            company_id: client.company_id,
            module: 'partners',
            category: 'alert',
            notification_type: 'partner_contract_status_change',
            priority: 'high',

            // Destinatario (la empresa cliente - broadcast a admins)
            is_broadcast: true,
            recipient_role: 'admin',

            // Contenido
            title: clientNotificationContent.title,
            message: clientNotificationContent.message,
            short_message: clientNotificationContent.shortMessage,
            email_body: clientNotificationContent.emailBody,

            // Contexto
            related_entity_type: 'partner_service_request',
            related_entity_id: client.service_request_id,
            related_partner_id: partnerId,
            related_service_request_id: client.service_request_id,

            // Metadata
            metadata: {
              partner_id: partnerId,
              partner_name: partner.company_name || `${partner.first_name} ${partner.last_name}`,
              new_status: newStatus,
              change_reason: changeReason,
              service_type: client.service_type
            },

            // Sender
            sender_user_id: changedByUserId,
            sender_type: 'system',

            // Canales
            sent_via_app: true,
            sent_via_email: true,

            // Requiere atención del cliente
            requires_action: true,
            action_type: 'acknowledge',

            created_by: changedByUserId
          });

          // Enviar email al cliente
          if (client.email && process.env.SMTP_USER) {
            try {
              await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'Sistema de Partners <noreply@empresa.com>',
                to: client.email,
                subject: clientNotificationContent.emailSubject,
                html: clientNotificationContent.emailBody
              });

              await clientNotif.update({ email_sent_at: new Date() });

              console.log(`   ✅ Email enviado a cliente: ${client.company_name} (${client.email})`);
            } catch (emailError) {
              console.error(`   ⚠️  Error enviando email a cliente ${client.company_name}:`, emailError.message);
            }
          }

          clientNotifications.push({
            company_id: client.company_id,
            company_name: client.company_name,
            email: client.email,
            sent_at: new Date(),
            notification_id: clientNotif.id
          });

        } catch (clientError) {
          console.error(`   ⚠️  Error notificando cliente ${client.company_name}:`, clientError.message);
        }
      }

      // 8. Actualizar partner_status_history con resultados de notificaciones
      const updateHistoryQuery = `
        UPDATE partner_status_history
        SET
          notification_sent = :notificationSent,
          notification_sent_at = :notificationSentAt,
          clients_notified = :clientsNotified::jsonb
        WHERE id = :historyId
      `;

      await database.sequelize.query(updateHistoryQuery, {
        replacements: {
          historyId,
          notificationSent: emailSent,
          notificationSentAt: emailSentAt,
          clientsNotified: JSON.stringify(clientNotifications)
        },
        type: QueryTypes.UPDATE
      });

      console.log(`   ✅ Historia actualizada con resultados de notificaciones`);

      return {
        success: true,
        historyId,
        partnerNotificationId: partnerNotification.id,
        emailSentToPartner: emailSent,
        clientsNotified: clientNotifications.length,
        clientNotifications
      };

    } catch (error) {
      console.error('❌ [PARTNER NOTIFICATIONS] Error:', error.message);
      throw error;
    }
  }

  /**
   * Genera contenido de notificación para el partner
   * @private
   */
  _generateNotificationContent(partner, oldStatus, newStatus, changeReason, changedByName, activeContracts) {
    const partnerName = partner.company_name || `${partner.first_name} ${partner.last_name}`;

    const statusLabels = {
      pendiente_aprobacion: 'Pendiente de Aprobación',
      activo: 'Activo',
      suspendido: 'Suspendido',
      baja: 'Dado de Baja',
      renuncia: 'Renuncia'
    };

    const title = `Estado de Partner Actualizado: ${statusLabels[newStatus]}`;

    let message = `Estimado/a ${partnerName},\n\n`;
    message += `Su estado como Partner ha sido actualizado de "${statusLabels[oldStatus]}" a "${statusLabels[newStatus]}".\n\n`;

    if (changeReason) {
      message += `Motivo: ${changeReason}\n\n`;
    }

    if (activeContracts.length > 0) {
      message += `IMPORTANTE: Usted tiene ${activeContracts.length} contrato(s) activo(s). Los clientes afectados serán notificados automáticamente.\n\n`;
    }

    message += `Responsable del cambio: ${changedByName}\n\n`;
    message += `Si tiene dudas, por favor contacte al equipo administrativo.`;

    const shortMessage = `Estado actualizado a: ${statusLabels[newStatus]}${changeReason ? ` - ${changeReason.substring(0, 50)}` : ''}`;

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
          .status { font-size: 24px; font-weight: bold; color: #667eea; }
          .reason { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          .contracts { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Actualización de Estado de Partner</h1>
          </div>
          <div class="content">
            <p>Estimado/a <strong>${partnerName}</strong>,</p>
            <p>Su estado como Partner ha sido actualizado:</p>
            <p class="status">${statusLabels[oldStatus]} → ${statusLabels[newStatus]}</p>

            ${changeReason ? `
              <div class="reason">
                <strong>Motivo del cambio:</strong><br>
                ${changeReason}
              </div>
            ` : ''}

            ${activeContracts.length > 0 ? `
              <div class="contracts">
                <strong>⚠️ IMPORTANTE:</strong><br>
                Usted tiene <strong>${activeContracts.length} contrato(s) activo(s)</strong>.
                Los clientes afectados han sido notificados automáticamente.
              </div>
            ` : ''}

            <p><strong>Responsable del cambio:</strong> ${changedByName}</p>
            <p>Si tiene dudas o desea más información, por favor contacte al equipo administrativo.</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático del Sistema de Partners</p>
            <p>Por favor no responda a este correo</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      title,
      message,
      shortMessage,
      emailSubject: `[Partners] ${title}`,
      emailBody
    };
  }

  /**
   * Genera contenido de notificación para clientes con contratos activos
   * @private
   */
  _generateClientNotificationContent(partner, partnerNewStatus, changeReason, client) {
    const partnerName = partner.company_name || `${partner.first_name} ${partner.last_name}`;

    const statusLabels = {
      suspendido: 'Suspendido',
      baja: 'Dado de Baja',
      renuncia: 'Renuncia'
    };

    const title = `Cambio de Estado en Partner Contratado: ${partnerName}`;

    let message = `Estimado equipo de ${client.company_name},\n\n`;
    message += `Le informamos que el Partner "${partnerName}" con quien tienen contratado el servicio de "${client.service_type}" ha cambiado su estado a: ${statusLabels[partnerNewStatus]}.\n\n`;

    if (changeReason) {
      message += `Motivo: ${changeReason}\n\n`;
    }

    message += `Le recomendamos contactarse con el equipo administrativo para coordinar alternativas o reemplazos.\n\n`;
    message += `ID de solicitud de servicio: #${client.service_request_id}`;

    const shortMessage = `Partner ${partnerName} cambió a estado: ${statusLabels[partnerNewStatus]}`;

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
          .alert { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0; }
          .info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Cambio de Estado en Partner Contratado</h1>
          </div>
          <div class="content">
            <p>Estimado equipo de <strong>${client.company_name}</strong>,</p>

            <div class="alert">
              <p><strong>Partner:</strong> ${partnerName}</p>
              <p><strong>Servicio contratado:</strong> ${client.service_type}</p>
              <p><strong>Nuevo estado:</strong> ${statusLabels[partnerNewStatus]}</p>
            </div>

            ${changeReason ? `
              <div class="info">
                <strong>Motivo del cambio:</strong><br>
                ${changeReason}
              </div>
            ` : ''}

            <p>Le recomendamos contactarse con el equipo administrativo para coordinar alternativas o reemplazos en caso de ser necesario.</p>

            <p><strong>ID de solicitud de servicio:</strong> #${client.service_request_id}</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático del Sistema de Partners</p>
            <p>Por favor no responda a este correo</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      title,
      message,
      shortMessage,
      emailSubject: `[IMPORTANTE] ${title}`,
      emailBody
    };
  }

  /**
   * Determina la categoría de notificación según el nuevo estado
   * @private
   */
  _getNotificationCategory(newStatus) {
    const categories = {
      pendiente_aprobacion: 'info',
      activo: 'approval_request',
      suspendido: 'warning',
      baja: 'error',
      renuncia: 'warning'
    };
    return categories[newStatus] || 'info';
  }

  /**
   * Determina la prioridad de notificación según el nuevo estado
   * @private
   */
  _getNotificationPriority(newStatus) {
    const priorities = {
      pendiente_aprobacion: 'low',
      activo: 'medium',
      suspendido: 'high',
      baja: 'urgent',
      renuncia: 'high'
    };
    return priorities[newStatus] || 'medium';
  }

  /**
   * Obtener historial de cambios de estado de un partner
   *
   * @param {number} partnerId - ID del partner
   * @returns {Promise<Array>} Timeline de cambios de estado
   */
  async getPartnerStatusTimeline(partnerId) {
    try {
      const query = `SELECT * FROM get_partner_status_timeline(:partnerId);`;

      const result = await database.sequelize.query(query, {
        replacements: { partnerId },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      console.error('❌ Error obteniendo timeline de partner:', error.message);
      throw error;
    }
  }

  /**
   * Obtener contratos activos de un partner
   *
   * @param {number} partnerId - ID del partner
   * @returns {Promise<Array>} Lista de contratos activos
   */
  async getPartnerActiveContracts(partnerId) {
    try {
      const query = `SELECT * FROM get_partner_active_contracts(:partnerId);`;

      const result = await database.sequelize.query(query, {
        replacements: { partnerId },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      console.error('❌ Error obteniendo contratos activos:', error.message);
      throw error;
    }
  }
}

module.exports = new PartnerNotificationService();
