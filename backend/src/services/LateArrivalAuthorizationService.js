/**
 * Servicio de Autorización de Llegadas Tardías
 * Sistema jerárquico multi-canal (Email, WhatsApp, WebSocket)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database-postgresql');
const { QueryTypes } = require('sequelize');
const websocket = require('../config/websocket');
const nodemailer = require('nodemailer');

class LateArrivalAuthorizationService {
  constructor() {
    // Configuración WhatsApp Business API
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.whatsappToken = process.env.WHATSAPP_API_TOKEN;
    this.whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Configuración Email (nodemailer)
    this.emailTransporter = null;
    this._initializeEmailTransporter();

    // URL base del servidor para links de autorización
    this.serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Inicializar transporter de email
   */
  _initializeEmailTransporter() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransport(emailConfig);
        console.log('✅ Email transporter initialized');
      } else {
        console.log('⚠️ Email credentials not configured, email notifications disabled');
      }
    } catch (error) {
      console.error('❌ Error initializing email transporter:', error.message);
    }
  }

  /**
   * Buscar autorizadores disponibles para un departamento específico
   * @param {number} departmentId - ID del departamento del empleado
   * @param {number} companyId - ID de la empresa
   * @returns {Array} Lista de autorizadores elegibles
   */
  async findAuthorizersForDepartment(departmentId, companyId) {
    try {
      const query = `
        SELECT
          user_id,
          first_name,
          last_name,
          email,
          whatsapp_number,
          notification_preference_late_arrivals,
          authorized_departments,
          role
        FROM users
        WHERE
          company_id = $1
          AND is_active = true
          AND can_authorize_late_arrivals = true
          AND (
            authorized_departments @> $2::jsonb
            OR authorized_departments = '[]'::jsonb
          )
        ORDER BY
          CASE
            WHEN role = 'admin' THEN 1
            WHEN role = 'supervisor' THEN 2
            ELSE 3
          END,
          first_name ASC
      `;

      const authorizers = await sequelize.query(query, {
        bind: [companyId, JSON.stringify([departmentId])],
        type: QueryTypes.SELECT
      });

      console.log(`🔍 Found ${authorizers.length} authorizers for department ${departmentId}`);
      return authorizers;

    } catch (error) {
      console.error('❌ Error finding authorizers:', error);
      return [];
    }
  }

  /**
   * Enviar solicitud de autorización multi-canal
   * @param {Object} params - Parámetros de la solicitud
   * @returns {Object} Resultado del envío
   */
  async sendAuthorizationRequest({
    employeeData,
    attendanceId,
    authorizationToken,
    shiftData,
    lateMinutes,
    companyId
  }) {
    try {
      console.log(`📤 Sending authorization request for employee ${employeeData.first_name} ${employeeData.last_name}`);

      // 1. Buscar autorizadores para el departamento del empleado
      const authorizers = await this.findAuthorizersForDepartment(
        employeeData.department_id,
        companyId
      );

      if (authorizers.length === 0) {
        // No hay autorizadores, usar fallback de empresa
        console.log('⚠️ No authorizers found, using company fallback');
        return await this._sendFallbackNotification({
          employeeData,
          attendanceId,
          authorizationToken,
          shiftData,
          lateMinutes,
          companyId
        });
      }

      // 2. Enviar notificaciones a todos los autorizadores
      const notificationResults = [];
      const notifiedUserIds = [];

      for (const authorizer of authorizers) {
        const preference = authorizer.notification_preference_late_arrivals || 'email';

        let result;
        switch (preference) {
          case 'email':
            result = await this._sendEmailNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes
            });
            break;

          case 'whatsapp':
            result = await this._sendWhatsAppNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes
            });
            break;

          case 'both':
            const emailResult = await this._sendEmailNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes
            });
            const whatsappResult = await this._sendWhatsAppNotification({
              authorizer,
              employeeData,
              authorizationToken,
              shiftData,
              lateMinutes
            });
            result = {
              email: emailResult,
              whatsapp: whatsappResult,
              success: emailResult.success || whatsappResult.success
            };
            break;

          default:
            result = { success: false, error: 'Invalid preference' };
        }

        notificationResults.push({
          authorizerId: authorizer.user_id,
          authorizerName: `${authorizer.first_name} ${authorizer.last_name}`,
          preference,
          result
        });

        if (result.success || (result.email?.success || result.whatsapp?.success)) {
          notifiedUserIds.push(authorizer.user_id);
        }
      }

      // 3. Enviar notificación WebSocket a todos los autorizadores conectados
      await this._sendWebSocketNotification({
        authorizers,
        employeeData,
        authorizationToken,
        shiftData,
        lateMinutes,
        attendanceId
      });

      // 4. Registrar autorizadores notificados en la BD
      await this._updateNotifiedAuthorizers(attendanceId, notifiedUserIds);

      return {
        success: notificationResults.some(r => r.result.success || r.result.email?.success || r.result.whatsapp?.success),
        notificationResults,
        notifiedCount: notifiedUserIds.length,
        authorizationToken
      };

    } catch (error) {
      console.error('❌ Error sending authorization request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificación por Email con botones HTML
   */
  async _sendEmailNotification({ authorizer, employeeData, authorizationToken, shiftData, lateMinutes }) {
    try {
      if (!this.emailTransporter) {
        return { success: false, error: 'Email transporter not configured' };
      }

      const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
      const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

      const htmlContent = this._buildEmailHTML({
        authorizerName: authorizer.first_name,
        employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
        employeeLegajo: employeeData.legajo,
        departmentName: employeeData.department_name || 'N/A',
        shiftName: shiftData.name,
        shiftStartTime: shiftData.startTime,
        lateMinutes,
        approveUrl,
        rejectUrl,
        currentTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: authorizer.email,
        subject: `⚠️ Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
        html: htmlContent
      };

      const info = await this.emailTransporter.sendMail(mailOptions);

      console.log(`✅ Email sent to ${authorizer.email}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        recipient: authorizer.email
      };

    } catch (error) {
      console.error('❌ Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificación por WhatsApp Business API
   */
  async _sendWhatsAppNotification({ authorizer, employeeData, authorizationToken, shiftData, lateMinutes }) {
    try {
      if (!this.whatsappToken || !this.whatsappPhoneNumberId) {
        return { success: false, error: 'WhatsApp API not configured' };
      }

      const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
      const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

      const message = this._buildWhatsAppMessage({
        authorizerName: authorizer.first_name,
        employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
        employeeLegajo: employeeData.legajo,
        departmentName: employeeData.department_name || 'N/A',
        shiftName: shiftData.name,
        shiftStartTime: shiftData.startTime,
        lateMinutes,
        approveUrl,
        rejectUrl
      });

      const phoneNumber = this._formatPhoneNumber(authorizer.whatsapp_number);

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      };

      const response = await axios.post(
        `${this.whatsappApiUrl}/${this.whatsappPhoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.whatsappToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp sent to ${phoneNumber}: ${response.data.messages?.[0]?.id}`);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        recipient: phoneNumber
      };

    } catch (error) {
      console.error('❌ Error sending WhatsApp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Enviar notificación por WebSocket (tiempo real)
   */
  async _sendWebSocketNotification({ authorizers, employeeData, authorizationToken, shiftData, lateMinutes, attendanceId }) {
    try {
      const notificationData = {
        type: 'late_arrival_authorization_request',
        attendanceId,
        authorizationToken,
        employee: {
          name: `${employeeData.first_name} ${employeeData.last_name}`,
          legajo: employeeData.legajo,
          department: employeeData.department_name || 'N/A'
        },
        shift: {
          name: shiftData.name,
          startTime: shiftData.startTime
        },
        lateMinutes,
        timestamp: new Date().toISOString()
      };

      // Enviar a cada autorizador conectado
      for (const authorizer of authorizers) {
        websocket.sendToUser(authorizer.user_id, 'authorization_request', notificationData);
      }

      console.log(`✅ WebSocket notification sent to ${authorizers.length} authorizers`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error sending WebSocket notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar notificación fallback cuando no hay autorizadores
   */
  async _sendFallbackNotification({ employeeData, authorizationToken, shiftData, lateMinutes, companyId }) {
    try {
      // Obtener datos de fallback de la empresa
      const company = await sequelize.query(
        `SELECT fallback_notification_email, fallback_notification_whatsapp, name
         FROM companies WHERE company_id = $1`,
        {
          bind: [companyId],
          type: QueryTypes.SELECT,
          plain: true
        }
      );

      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      const results = [];

      // Email fallback
      if (company.fallback_notification_email && this.emailTransporter) {
        const approveUrl = `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`;
        const rejectUrl = `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`;

        const htmlContent = this._buildEmailHTML({
          authorizerName: 'RRHH',
          employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
          employeeLegajo: employeeData.legajo,
          departmentName: employeeData.department_name || 'N/A',
          shiftName: shiftData.name,
          shiftStartTime: shiftData.startTime,
          lateMinutes,
          approveUrl,
          rejectUrl,
          currentTime: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
        });

        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: company.fallback_notification_email,
          subject: `⚠️ [FALLBACK] Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
          html: htmlContent
        };

        const info = await this.emailTransporter.sendMail(mailOptions);
        results.push({ type: 'email', success: true, messageId: info.messageId });
      }

      // WhatsApp fallback
      if (company.fallback_notification_whatsapp && this.whatsappToken) {
        const result = await this._sendWhatsAppNotification({
          authorizer: {
            first_name: 'RRHH',
            whatsapp_number: company.fallback_notification_whatsapp
          },
          employeeData,
          authorizationToken,
          shiftData,
          lateMinutes
        });
        results.push({ type: 'whatsapp', ...result });
      }

      return {
        success: results.some(r => r.success),
        fallback: true,
        results
      };

    } catch (error) {
      console.error('❌ Error sending fallback notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar lista de autorizadores notificados en BD
   */
  async _updateNotifiedAuthorizers(attendanceId, userIds) {
    try {
      await sequelize.query(
        `UPDATE attendances
         SET notified_authorizers = $1,
             authorization_requested_at = NOW()
         WHERE id = $2`,
        {
          bind: [JSON.stringify(userIds), attendanceId],
          type: QueryTypes.UPDATE
        }
      );
      console.log(`✅ Updated notified authorizers for attendance ${attendanceId}`);
    } catch (error) {
      console.error('❌ Error updating notified authorizers:', error);
    }
  }

  /**
   * Construir HTML para email con botones de autorización
   */
  _buildEmailHTML({ authorizerName, employeeName, employeeLegajo, departmentName, shiftName, shiftStartTime, lateMinutes, approveUrl, rejectUrl, currentTime }) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorización de Llegada Tardía</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    .alert-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .alert-box strong {
      color: #856404;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-table td {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    .info-table td:first-child {
      font-weight: 600;
      color: #666;
      width: 40%;
    }
    .info-table td:last-child {
      color: #333;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
      display: flex;
      gap: 15px;
      justify-content: center;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s ease;
      flex: 1;
      max-width: 200px;
    }
    .btn-approve {
      background-color: #28a745;
      color: white;
    }
    .btn-approve:hover {
      background-color: #218838;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }
    .btn-reject {
      background-color: #dc3545;
      color: white;
    }
    .btn-reject:hover {
      background-color: #c82333;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Autorización de Llegada Tardía</h1>
    </div>

    <div class="content">
      <p class="greeting">Hola <strong>${authorizerName}</strong>,</p>

      <div class="alert-box">
        <strong>Se requiere tu autorización para un ingreso fuera de horario</strong>
      </div>

      <p>Un empleado ha marcado ingreso fuera del horario de tolerancia de su turno y requiere autorización para registrar su asistencia.</p>

      <table class="info-table">
        <tr>
          <td>👤 Empleado:</td>
          <td><strong>${employeeName}</strong></td>
        </tr>
        <tr>
          <td>🆔 Legajo:</td>
          <td>${employeeLegajo}</td>
        </tr>
        <tr>
          <td>🏢 Departamento:</td>
          <td>${departmentName}</td>
        </tr>
        <tr>
          <td>🕐 Turno:</td>
          <td>${shiftName} (inicio: ${shiftStartTime})</td>
        </tr>
        <tr>
          <td>⏰ Retraso:</td>
          <td><strong style="color: #dc3545;">${lateMinutes} minutos</strong></td>
        </tr>
        <tr>
          <td>📅 Hora actual:</td>
          <td>${currentTime}</td>
        </tr>
      </table>

      <div class="button-container">
        <a href="${approveUrl}" class="btn btn-approve">✅ AUTORIZAR</a>
        <a href="${rejectUrl}" class="btn btn-reject">❌ RECHAZAR</a>
      </div>

      <p style="font-size: 13px; color: #666; text-align: center; margin-top: 20px;">
        Al hacer clic en uno de los botones, se registrará tu decisión con fecha y hora.
      </p>
    </div>

    <div class="footer">
      <p><strong>Sistema de Asistencia Biométrico APONNT</strong></p>
      <p>Esta es una notificación automática del sistema</p>
      <p>© 2025 - Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Construir mensaje para WhatsApp
   */
  _buildWhatsAppMessage({ authorizerName, employeeName, employeeLegajo, departmentName, shiftName, shiftStartTime, lateMinutes, approveUrl, rejectUrl }) {
    return `⚠️ *AUTORIZACIÓN REQUERIDA - LLEGADA TARDÍA*

Hola ${authorizerName},

Se requiere tu autorización para un ingreso fuera de horario.

👤 *Empleado:* ${employeeName}
🆔 *Legajo:* ${employeeLegajo}
🏢 *Departamento:* ${departmentName}
🕐 *Turno:* ${shiftName} (inicio: ${shiftStartTime})
⏰ *Retraso:* ${lateMinutes} minutos

*Para autorizar o rechazar, haz clic en los siguientes enlaces:*

✅ Autorizar: ${approveUrl}
❌ Rechazar: ${rejectUrl}

_Sistema de Asistencia Biométrico APONNT_`;
  }

  /**
   * Formatear número de teléfono para WhatsApp (Argentina)
   */
  _formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    let formattedNumber = phoneNumber.replace(/\D/g, '');

    if (formattedNumber.startsWith('0')) {
      formattedNumber = formattedNumber.substring(1);
    }

    if (!formattedNumber.startsWith('54')) {
      formattedNumber = '54' + formattedNumber;
    }

    return formattedNumber;
  }

  /**
   * Notificar resultado de autorización (aprobado/rechazado)
   * Envía WebSocket al kiosco y a administradores
   */
  async notifyAuthorizationResult({
    attendanceId,
    employeeData,
    authorizerData,
    status,
    notes = ''
  }) {
    try {
      const resultData = {
        type: 'authorization_result',
        attendanceId,
        status, // 'approved' or 'rejected'
        employee: {
          userId: employeeData.user_id,
          name: `${employeeData.first_name} ${employeeData.last_name}`,
          legajo: employeeData.legajo
        },
        authorizer: {
          userId: authorizerData.user_id,
          name: `${authorizerData.first_name} ${authorizerData.last_name}`
        },
        notes,
        timestamp: new Date().toISOString()
      };

      // Enviar al empleado (si está conectado en kiosco)
      websocket.sendToUser(employeeData.user_id, 'authorization_result', resultData);

      // Enviar a administradores y supervisores
      websocket.sendToSupervisors('late_arrival_decision', resultData);

      console.log(`✅ Authorization result sent: ${status} by ${authorizerData.first_name} ${authorizerData.last_name}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error notifying authorization result:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new LateArrivalAuthorizationService();
