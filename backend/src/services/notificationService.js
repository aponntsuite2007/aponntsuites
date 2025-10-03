const axios = require('axios');
const ARTConfiguration = require('../models/ARTConfiguration');
const { User, CommunicationLog } = require('../config/database');

class NotificationService {
  constructor() {
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send';
    this.smsApiUrl = process.env.SMS_API_URL || 'https://api.sms-service.com/send';
    this.whatsappToken = process.env.WHATSAPP_API_TOKEN;
    this.smsToken = process.env.SMS_API_TOKEN;
  }

  async sendWhatsAppMessage(phoneNumber, message, templateData = null) {
    try {
      if (!this.whatsappToken) {
        console.log('WhatsApp API token not configured, skipping notification');
        return { success: false, message: 'WhatsApp API not configured' };
      }

      const payload = {
        messaging_product: "whatsapp",
        to: this._formatPhoneNumber(phoneNumber),
        type: templateData ? "template" : "text",
      };

      if (templateData) {
        payload.template = {
          name: templateData.templateName,
          language: { code: "es" },
          components: templateData.components || []
        };
      } else {
        payload.text = { body: message };
      }

      const response = await axios.post(
        `${this.whatsappApiUrl}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.whatsappToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { 
        success: true, 
        messageId: response.data.messages?.[0]?.id,
        response: response.data 
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  async sendSMS(phoneNumber, message) {
    try {
      if (!this.smsToken) {
        console.log('SMS API token not configured, skipping notification');
        return { success: false, message: 'SMS API not configured' };
      }

      const payload = {
        to: this._formatPhoneNumber(phoneNumber),
        message: message,
        from: process.env.SMS_SENDER_ID || 'MedSystem'
      };

      const response = await axios.post(
        this.smsApiUrl,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.smsToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { 
        success: true, 
        messageId: response.data.messageId,
        response: response.data 
      };
    } catch (error) {
      console.error('Error sending SMS:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async notifyMedicalCertificateSubmitted(employeeData, certificateData) {
    const messages = [];

    try {
      const message = this._buildMedicalCertificateMessage(employeeData, certificateData, 'submitted');
      
      if (employeeData.medicalStaffPhone) {
        const whatsappResult = await this.sendWhatsAppMessage(
          employeeData.medicalStaffPhone, 
          message
        );
        messages.push({ 
          type: 'whatsapp', 
          recipient: 'medical_staff', 
          result: whatsappResult 
        });

        if (!whatsappResult.success) {
          const smsResult = await this.sendSMS(employeeData.medicalStaffPhone, message);
          messages.push({ 
            type: 'sms_fallback', 
            recipient: 'medical_staff', 
            result: smsResult 
          });
        }
      }

      if (employeeData.hrPhone && employeeData.hrPhone !== employeeData.medicalStaffPhone) {
        const hrMessage = this._buildMedicalCertificateMessage(employeeData, certificateData, 'hr_notification');
        
        const whatsappResult = await this.sendWhatsAppMessage(employeeData.hrPhone, hrMessage);
        messages.push({ 
          type: 'whatsapp', 
          recipient: 'hr', 
          result: whatsappResult 
        });

        if (!whatsappResult.success) {
          const smsResult = await this.sendSMS(employeeData.hrPhone, hrMessage);
          messages.push({ 
            type: 'sms_fallback', 
            recipient: 'hr', 
            result: smsResult 
          });
        }
      }

      return { success: true, messages };
    } catch (error) {
      console.error('Error in medical certificate notification:', error);
      return { success: false, error: error.message, messages };
    }
  }

  async notifyPhotoRequested(employeeData, photoRequestData) {
    try {
      const message = this._buildPhotoRequestMessage(employeeData, photoRequestData);
      
      const whatsappResult = await this.sendWhatsAppMessage(
        employeeData.phone || employeeData.personalPhone, 
        message
      );

      if (!whatsappResult.success && employeeData.phone) {
        const smsResult = await this.sendSMS(employeeData.phone, message);
        return { 
          success: smsResult.success, 
          whatsapp: whatsappResult, 
          sms: smsResult 
        };
      }

      return { success: whatsappResult.success, whatsapp: whatsappResult };
    } catch (error) {
      console.error('Error in photo request notification:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyPhotoUploaded(medicalStaffData, photoData) {
    try {
      const message = this._buildPhotoUploadedMessage(photoData);
      
      const whatsappResult = await this.sendWhatsAppMessage(
        medicalStaffData.phone, 
        message
      );

      if (!whatsappResult.success) {
        const smsResult = await this.sendSMS(medicalStaffData.phone, message);
        return { 
          success: smsResult.success, 
          whatsapp: whatsappResult, 
          sms: smsResult 
        };
      }

      return { success: whatsappResult.success, whatsapp: whatsappResult };
    } catch (error) {
      console.error('Error in photo uploaded notification:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyMedicalReview(employeeData, certificateData, reviewData) {
    try {
      const message = this._buildMedicalReviewMessage(certificateData, reviewData);
      
      const whatsappResult = await this.sendWhatsAppMessage(
        employeeData.phone || employeeData.personalPhone, 
        message
      );

      if (!whatsappResult.success && employeeData.phone) {
        const smsResult = await this.sendSMS(employeeData.phone, message);
        return { 
          success: smsResult.success, 
          whatsapp: whatsappResult, 
          sms: smsResult 
        };
      }

      return { success: whatsappResult.success, whatsapp: whatsappResult };
    } catch (error) {
      console.error('Error in medical review notification:', error);
      return { success: false, error: error.message };
    }
  }

  _buildMedicalCertificateMessage(employeeData, certificateData, type) {
    const employeeName = `${employeeData.firstName} ${employeeData.lastName}`;
    const startDate = new Date(certificateData.startDate).toLocaleDateString('es-ES');
    const endDate = new Date(certificateData.endDate).toLocaleDateString('es-ES');
    
    switch (type) {
      case 'submitted':
        return `🏥 *Nueva Licencia Médica*\n\n` +
               `👤 Empleado: ${employeeName}\n` +
               `📅 Período: ${startDate} - ${endDate}\n` +
               `🔍 Diagnóstico: ${certificateData.primaryDiagnosis}\n` +
               `⏰ Días: ${certificateData.totalDays}\n\n` +
               `Por favor revise la solicitud en el sistema médico.`;
               
      case 'hr_notification':
        return `📋 *Notificación de Licencia Médica*\n\n` +
               `👤 Empleado: ${employeeName}\n` +
               `📅 Período: ${startDate} - ${endDate}\n` +
               `⏰ Días: ${certificateData.totalDays}\n\n` +
               `Licencia médica enviada para revisión.`;
               
      default:
        return `Licencia médica de ${employeeName} del ${startDate} al ${endDate}.`;
    }
  }

  _buildPhotoRequestMessage(employeeData, photoRequestData) {
    const doctorName = photoRequestData.doctorName || 'el médico';
    
    return `📸 *Solicitud de Foto Médica*\n\n` +
           `Hola ${employeeData.firstName},\n\n` +
           `${doctorName} ha solicitado una foto de tu ${photoRequestData.bodyPart.toLowerCase()} ` +
           `(${photoRequestData.photoTypeText.toLowerCase()}) para completar tu evaluación médica.\n\n` +
           `📋 Motivo: ${photoRequestData.requestReason}\n\n` +
           `Por favor ingresa a la aplicación para subir la foto solicitada.\n\n` +
           `${photoRequestData.isRequired ? '⚠️ Esta foto es obligatoria para continuar el proceso.' : ''}`;
  }

  _buildPhotoUploadedMessage(photoData) {
    return `📸 *Foto Médica Recibida*\n\n` +
           `El empleado ha subido la foto solicitada de ${photoData.bodyPart.toLowerCase()}.\n\n` +
           `📋 Tipo: ${photoData.photoTypeText}\n` +
           `📅 Subida: ${new Date(photoData.photoDate).toLocaleString('es-ES')}\n\n` +
           `Revise la foto en el sistema médico.`;
  }

  _buildMedicalReviewMessage(certificateData, reviewData) {
    const status = reviewData.status === 'approved' ? 'Aprobada' : 'Rechazada';
    const statusEmoji = reviewData.status === 'approved' ? '✅' : '❌';
    
    return `${statusEmoji} *Licencia Médica ${status}*\n\n` +
           `Su licencia médica ha sido ${status.toLowerCase()}.\n\n` +
           `📅 Período: ${new Date(certificateData.startDate).toLocaleDateString('es-ES')} - ` +
           `${new Date(certificateData.endDate).toLocaleDateString('es-ES')}\n\n` +
           `${reviewData.comments ? `💬 Comentarios: ${reviewData.comments}\n\n` : ''}` +
           `Para más detalles, revise la aplicación.`;
  }

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

  async testConnection() {
    const testResults = {};
    
    if (this.whatsappToken) {
      try {
        const response = await axios.get(`${this.whatsappApiUrl}/health`, {
          headers: { 'Authorization': `Bearer ${this.whatsappToken}` }
        });
        testResults.whatsapp = { 
          available: true, 
          status: response.status 
        };
      } catch (error) {
        testResults.whatsapp = { 
          available: false, 
          error: error.message 
        };
      }
    } else {
      testResults.whatsapp = { 
        available: false, 
        error: 'API token not configured' 
      };
    }
    
    if (this.smsToken) {
      try {
        const response = await axios.get(`${this.smsApiUrl}/status`, {
          headers: { 'Authorization': `Bearer ${this.smsToken}` }
        });
        testResults.sms = { 
          available: true, 
          status: response.status 
        };
      } catch (error) {
        testResults.sms = { 
          available: false, 
          error: error.message 
        };
      }
    } else {
      testResults.sms = { 
        available: false, 
        error: 'API token not configured' 
      };
    }
    
    return testResults;
  }

  async notifyART(certificateData, employeeData, companyId = null) {
    try {
      // Obtener configuración de ART
      const artConfig = await ARTConfiguration.findOne({
        where: {
          isActive: true,
          ...(companyId && { companyId })
        }
      });

      if (!artConfig) {
        console.log('No ART configuration found');
        return { success: false, error: 'No ART configuration found' };
      }

      // Verificar si este tipo de caso requiere notificación
      const triggers = artConfig.notificationTriggers || {};
      const shouldNotify = this._shouldNotifyART(certificateData, triggers);

      if (!shouldNotify) {
        console.log('Case does not meet ART notification criteria');
        return { success: false, error: 'Case does not meet notification criteria' };
      }

      // Construir mensaje
      const message = this._buildARTNotificationMessage(certificateData, employeeData, artConfig);

      const notifications = [];
      const preferences = artConfig.notificationPreferences || {};

      // Enviar WhatsApp si está configurado
      if (preferences.whatsapp && artConfig.whatsappNumber) {
        const whatsappResult = await this.sendWhatsAppMessage(
          artConfig.whatsappNumber,
          message
        );
        notifications.push({
          type: 'whatsapp',
          success: whatsappResult.success,
          result: whatsappResult
        });
      }

      // Enviar SMS si está configurado
      if (preferences.sms && artConfig.phone) {
        const smsResult = await this.sendSMS(artConfig.phone, message);
        notifications.push({
          type: 'sms',
          success: smsResult.success,
          result: smsResult
        });
      }

      // Enviar email si está configurado
      if (preferences.email && artConfig.email) {
        const emailResult = await this.sendEmail(
          artConfig.email,
          'Notificación ART - Nuevo Caso Médico',
          message
        );
        notifications.push({
          type: 'email',
          success: emailResult.success,
          result: emailResult
        });
      }

      // Actualizar estadísticas
      await artConfig.update({
        lastNotificationSent: new Date(),
        totalNotificationsSent: (artConfig.totalNotificationsSent || 0) + 1
      });

      return {
        success: notifications.some(n => n.success),
        notifications,
        artConfig: {
          name: artConfig.artName,
          code: artConfig.artCode
        }
      };

    } catch (error) {
      console.error('Error notifying ART:', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmail(to, subject, message) {
    try {
      // Implementación básica de email usando un servicio externo
      // En producción, usar servicios como SendGrid, AWS SES, etc.
      const emailApiUrl = process.env.EMAIL_API_URL;
      const emailApiToken = process.env.EMAIL_API_TOKEN;

      if (!emailApiUrl || !emailApiToken) {
        console.log('Email service not configured');
        return { success: false, error: 'Email service not configured' };
      }

      const response = await axios.post(emailApiUrl, {
        to,
        subject,
        text: message,
        from: process.env.EMAIL_FROM || 'sistema@empresa.com'
      }, {
        headers: {
          'Authorization': `Bearer ${emailApiToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        messageId: response.data.messageId,
        response: response.data
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  _shouldNotifyART(certificateData, triggers) {
    // Verificar si es accidente de trabajo
    if (certificateData.isWorkRelated && triggers.work_related_injuries) {
      return true;
    }

    // Verificar si es accidente
    if (certificateData.episodeType === 'accident' && triggers.accidents) {
      return true;
    }

    // Verificar si es enfermedad ocupacional
    if (certificateData.isOccupationalDisease && triggers.occupational_diseases) {
      return true;
    }

    // Verificar ausencias largas
    const threshold = triggers.long_absence_threshold || 15;
    if (certificateData.requestedDays >= threshold && triggers.long_absences) {
      return true;
    }

    // TODO: Implementar lógica para casos recurrentes
    // Requiere consultar historial médico del empleado

    return false;
  }

  async notifyDocumentRequested(employeeData, requestData) {
    try {
      // Usar el nuevo método de comunicación fehaciente
      return await this.sendFehacienteNotification({
        employeeId: employeeData.employeeId || employeeData.id,
        senderId: requestData.requestedById,
        subject: `Solicitud de ${requestData.documentType}`,
        content: this._buildDocumentRequestMessage(employeeData, requestData),
        relatedRequestId: requestData.requestId,
        relatedRequestType: this._mapDocumentType(requestData.documentType),
        priority: requestData.urgency || 'normal'
      });
    } catch (error) {
      console.error('Error in document request notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendFehacienteNotification({
    employeeId,
    senderId,
    subject,
    content,
    relatedRequestId = null,
    relatedRequestType = null,
    priority = 'normal'
  }) {
    try {
      // Obtener datos completos del empleado
      const employee = await User.findByPk(employeeId);
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }

      const results = [];
      const logEntries = [];

      // 1. Mensaje interno (siempre se envía)
      const internalResult = await this._sendInternalMessage({
        employee,
        senderId,
        subject,
        content,
        relatedRequestId,
        relatedRequestType
      });
      results.push({ type: 'internal', ...internalResult });

      // 2. Email (si acepta notificaciones por email)
      if (employee.acceptsEmailNotifications && employee.email) {
        const emailResult = await this._sendFehacienteEmail({
          employee,
          senderId,
          subject,
          content,
          relatedRequestId,
          relatedRequestType
        });
        results.push({ type: 'email', ...emailResult });
      }

      // 3. WhatsApp (si acepta y tiene número configurado)
      if (employee.acceptsWhatsappNotifications && employee.whatsappNumber) {
        const whatsappResult = await this._sendFehacienteWhatsApp({
          employee,
          senderId,
          subject,
          content,
          relatedRequestId,
          relatedRequestType
        });
        results.push({ type: 'whatsapp', ...whatsappResult });
      }

      // 4. SMS (si acepta y tiene teléfono)
      if (employee.acceptsSmsNotifications && (employee.personalPhone || employee.phone)) {
        const smsResult = await this._sendFehacienteSMS({
          employee,
          senderId,
          subject,
          content,
          relatedRequestId,
          relatedRequestType
        });
        results.push({ type: 'sms', ...smsResult });
      }

      // Si no se envió ninguna notificación externa, registrar como advertencia
      const externalNotifications = results.filter(r => r.type !== 'internal');
      if (externalNotifications.length === 0) {
        console.warn(`⚠️ Empleado ${employee.firstName} ${employee.lastName} no tiene configurada ninguna forma de comunicación fehaciente`);
      }

      return {
        success: results.some(r => r.success),
        results,
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          acceptedChannels: {
            email: employee.acceptsEmailNotifications,
            whatsapp: employee.acceptsWhatsappNotifications,
            sms: employee.acceptsSmsNotifications
          }
        }
      };

    } catch (error) {
      console.error('Error in fehaciente notification:', error);
      return { success: false, error: error.message };
    }
  }

  _buildDocumentRequestMessage(employeeData, requestData) {
    const urgencyEmoji = requestData.urgency === 'high' ? '🚨' : '📋';
    const requestDate = new Date(requestData.requestDate).toLocaleDateString('es-ES');
    
    return `${urgencyEmoji} *Solicitud de ${requestData.documentType}*\n\n` +
           `Hola ${employeeData.firstName},\n\n` +
           `${requestData.requestedBy} ha solicitado que envíes un ${requestData.documentType}.\n\n` +
           `📅 Fecha de solicitud: ${requestDate}\n` +
           `⚡ Urgencia: ${requestData.urgency === 'high' ? 'Alta' : 'Normal'}\n\n` +
           `📝 Instrucciones:\n${requestData.instructions}\n\n` +
           `Por favor ingresa a la aplicación para completar esta solicitud.\n\n` +
           `${requestData.urgency === 'high' ? '⚠️ Esta solicitud requiere atención prioritaria.' : ''}`;
  }

  _buildARTNotificationMessage(certificateData, employeeData, artConfig) {
    const employeeName = `${employeeData.firstName} ${employeeData.lastName}`;
    const startDate = new Date(certificateData.startDate).toLocaleDateString('es-ES');
    const endDate = new Date(certificateData.endDate).toLocaleDateString('es-ES');
    
    let notificationType = 'Ausencia médica';
    if (certificateData.isWorkRelated) notificationType = 'Accidente/Enfermedad laboral';
    if (certificateData.episodeType === 'accident') notificationType = 'Accidente';

    return `🏥 *NOTIFICACIÓN ART - ${artConfig.artName}*\n\n` +
           `📋 Tipo: ${notificationType}\n` +
           `👤 Empleado: ${employeeName}\n` +
           `🆔 DNI: ${employeeData.dni || 'N/A'}\n` +
           `📅 Período: ${startDate} - ${endDate}\n` +
           `⏰ Días: ${certificateData.requestedDays}\n` +
           `🔍 Diagnóstico: ${certificateData.primaryDiagnosis || certificateData.diagnosis}\n\n` +
           `${certificateData.treatingPhysician ? `👨‍⚕️ Médico: ${certificateData.treatingPhysician}\n` : ''}` +
           `${certificateData.treatingPhysicianLicense ? `📋 Matrícula: ${certificateData.treatingPhysicianLicense}\n` : ''}` +
           `${certificateData.medicalInstitution ? `🏥 Institución: ${certificateData.medicalInstitution}\n` : ''}` +
           `\n📞 Contacto empresa: ${process.env.COMPANY_PHONE || 'N/A'}\n` +
           `📧 Email: ${process.env.COMPANY_EMAIL || 'N/A'}\n\n` +
           `⚠️ Notificación automática del sistema médico empresarial.`;
  }

  // === MÉTODOS PARA COMUNICACIÓN FEHACIENTE ===

  async _sendInternalMessage({ employee, senderId, subject, content, relatedRequestId, relatedRequestType }) {
    try {
      const { Message } = require('../config/database');
      
      await Message.create({
        senderId: senderId,
        receiverId: employee.id,
        title: subject,
        content: content,
        type: 'document_request_fehaciente',
        priority: 'high'
      });

      // Log de comunicación
      await this._logCommunication({
        userId: employee.id,
        senderId: senderId,
        communicationType: 'internal_message',
        communicationChannel: 'sistema_interno',
        subject: subject,
        content: content,
        relatedRequestId: relatedRequestId,
        relatedRequestType: relatedRequestType,
        status: 'sent'
      });

      return { success: true, channel: 'sistema_interno' };
    } catch (error) {
      console.error('Error sending internal message:', error);
      return { success: false, error: error.message };
    }
  }

  async _sendFehacienteEmail({ employee, senderId, subject, content, relatedRequestId, relatedRequestType }) {
    try {
      const emailContent = this._buildFehacienteEmailContent(employee, subject, content);
      const result = await this.sendEmail(employee.email, subject, emailContent);

      await this._logCommunication({
        userId: employee.id,
        senderId: senderId,
        communicationType: 'email',
        communicationChannel: employee.email,
        subject: subject,
        content: emailContent,
        relatedRequestId: relatedRequestId,
        relatedRequestType: relatedRequestType,
        status: result.success ? 'sent' : 'failed',
        deliveryConfirmation: result
      });

      return { success: result.success, channel: employee.email, result };
    } catch (error) {
      console.error('Error sending fehaciente email:', error);
      return { success: false, error: error.message };
    }
  }

  async _sendFehacienteWhatsApp({ employee, senderId, subject, content, relatedRequestId, relatedRequestType }) {
    try {
      const whatsappContent = this._buildFehacienteWhatsAppContent(employee, subject, content);
      const result = await this.sendWhatsAppMessage(employee.whatsappNumber, whatsappContent);

      await this._logCommunication({
        userId: employee.id,
        senderId: senderId,
        communicationType: 'whatsapp',
        communicationChannel: employee.whatsappNumber,
        subject: subject,
        content: whatsappContent,
        relatedRequestId: relatedRequestId,
        relatedRequestType: relatedRequestType,
        status: result.success ? 'sent' : 'failed',
        deliveryConfirmation: result
      });

      return { success: result.success, channel: employee.whatsappNumber, result };
    } catch (error) {
      console.error('Error sending fehaciente WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  async _sendFehacienteSMS({ employee, senderId, subject, content, relatedRequestId, relatedRequestType }) {
    try {
      const phoneNumber = employee.personalPhone || employee.phone;
      const smsContent = this._buildFehacienteSMSContent(employee, subject, content);
      const result = await this.sendSMS(phoneNumber, smsContent);

      await this._logCommunication({
        userId: employee.id,
        senderId: senderId,
        communicationType: 'sms',
        communicationChannel: phoneNumber,
        subject: subject,
        content: smsContent,
        relatedRequestId: relatedRequestId,
        relatedRequestType: relatedRequestType,
        status: result.success ? 'sent' : 'failed',
        deliveryConfirmation: result
      });

      return { success: result.success, channel: phoneNumber, result };
    } catch (error) {
      console.error('Error sending fehaciente SMS:', error);
      return { success: false, error: error.message };
    }
  }

  async _logCommunication(logData) {
    try {
      const { CommunicationLog } = require('../config/database');
      await CommunicationLog.create(logData);
    } catch (error) {
      console.error('Error logging communication:', error);
    }
  }

  _buildFehacienteEmailContent(employee, subject, content) {
    const timestamp = new Date().toLocaleString('es-ES');
    
    return `
📧 COMUNICACIÓN FEHACIENTE - SISTEMA MÉDICO APONNT

Estimado/a ${employee.firstName} ${employee.lastName},

${content}

==========================================
INFORMACIÓN LEGAL:
Esta comunicación constituye una notificación fehaciente bajo los términos del acuerdo de comunicaciones electrónicas aceptado en fecha ${employee.communicationConsentDate ? new Date(employee.communicationConsentDate).toLocaleDateString('es-ES') : 'No registrada'}.

DATOS DE LA COMUNICACIÓN:
- Fecha y hora: ${timestamp}
- Destinatario: ${employee.firstName} ${employee.lastName} (${employee.email})
- Legajo: ${employee.legajo}
- ID de comunicación: Se generará automáticamente

Para consultas, contacte a Pablo Rivas Jordan: +54 2657 673741
==========================================

Sistema de Asistencia Biométrico APONNT v2.3
`;
  }

  _buildFehacienteWhatsAppContent(employee, subject, content) {
    const timestamp = new Date().toLocaleString('es-ES');
    
    return `📱 *COMUNICACIÓN FEHACIENTE*\n\n` +
           `Hola ${employee.firstName},\n\n` +
           `${content}\n\n` +
           `⚖️ *Validez Legal:*\nEsta comunicación es fehaciente según acuerdo firmado.\n\n` +
           `📅 Enviado: ${timestamp}\n` +
           `📞 Consultas: +54 2657 673741\n\n` +
           `🏢 *APONNT* - Sistema Médico v2.3`;
  }

  _buildFehacienteSMSContent(employee, subject, content) {
    const timestamp = new Date().toLocaleString('es-ES');
    
    return `APONNT FEHACIENTE: ${employee.firstName}, ${content.substring(0, 100)}... Consultas: +54 2657 673741. ${timestamp}`;
  }

  _mapDocumentType(documentType) {
    const mapping = {
      'certificates': 'certificate',
      'recipes': 'recipe', 
      'studies': 'study',
      'photos': 'photo'
    };
    return mapping[documentType] || documentType;
  }

  // Método para notificar cumplimiento de solicitud
  async notifyRequestCompleted({ employeeId, senderId, requestType, completionNotes, originalRequestId }) {
    try {
      const employee = await User.findByPk(employeeId);
      if (!employee) {
        throw new Error('Empleado no encontrado');
      }

      const subject = `✅ Solicitud Completada - ${requestType}`;
      const content = this._buildCompletionMessage(employee, requestType, completionNotes);

      return await this.sendFehacienteNotification({
        employeeId: employeeId,
        senderId: senderId,
        subject: subject,
        content: content,
        relatedRequestId: originalRequestId,
        relatedRequestType: this._mapDocumentType(requestType),
        priority: 'normal'
      });

    } catch (error) {
      console.error('Error notifying request completion:', error);
      return { success: false, error: error.message };
    }
  }

  _buildCompletionMessage(employee, requestType, completionNotes) {
    const timestamp = new Date().toLocaleString('es-ES');

    return `Estimado/a ${employee.firstName},\n\n` +
           `Le informamos que su solicitud de ${requestType} ha sido COMPLETADA exitosamente por el personal médico.\n\n` +
           `📋 **Detalles del cumplimiento:**\n` +
           `${completionNotes || 'Solicitud procesada y aprobada por el área médica.'}\n\n` +
           `📅 **Fecha de finalización:** ${timestamp}\n\n` +
           `Esta comunicación confirma el cumplimiento de la solicitud previamente realizada. ` +
           `Si tiene consultas adicionales, puede contactar al área médica.\n\n` +
           `Gracias por su colaboración.`;
  }

  // === SISTEMA DE NOTIFICACIONES PARA VENDEDORES ===

  async notifyVendorRatingDrop(vendorData, companyData, ratingData) {
    try {
      const message = this._buildRatingDropMessage(vendorData, companyData, ratingData);

      const notifications = [];

      // WhatsApp al vendedor
      if (vendorData.whatsappNumber) {
        const whatsappResult = await this.sendWhatsAppMessage(vendorData.whatsappNumber, message);
        notifications.push({ type: 'whatsapp', success: whatsappResult.success, result: whatsappResult });
      }

      // SMS de respaldo
      if (vendorData.phone) {
        const smsResult = await this.sendSMS(vendorData.phone, message);
        notifications.push({ type: 'sms', success: smsResult.success, result: smsResult });
      }

      // Email si está configurado
      if (vendorData.email) {
        const emailResult = await this.sendEmail(
          vendorData.email,
          '⚠️ Alerta: Calificación Baja - Acción Requerida',
          message
        );
        notifications.push({ type: 'email', success: emailResult.success, result: emailResult });
      }

      return { success: notifications.some(n => n.success), notifications };
    } catch (error) {
      console.error('Error notifying vendor rating drop:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyAuctionStarted(auctionData, eligibleVendors) {
    try {
      const results = [];

      for (const vendor of eligibleVendors) {
        const message = this._buildAuctionStartMessage(auctionData, vendor);

        const vendorResults = [];

        // WhatsApp preferido
        if (vendor.whatsappNumber) {
          const whatsappResult = await this.sendWhatsAppMessage(vendor.whatsappNumber, message);
          vendorResults.push({ type: 'whatsapp', success: whatsappResult.success, result: whatsappResult });
        }

        // SMS de respaldo
        if (vendor.phone) {
          const smsResult = await this.sendSMS(vendor.phone, message);
          vendorResults.push({ type: 'sms', success: smsResult.success, result: smsResult });
        }

        results.push({
          vendorId: vendor.id,
          vendorName: `${vendor.firstName} ${vendor.lastName}`,
          notifications: vendorResults,
          success: vendorResults.some(r => r.success)
        });
      }

      return { success: results.some(r => r.success), vendorResults: results };
    } catch (error) {
      console.error('Error notifying auction start:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyAuctionWinner(auctionData, winnerVendor, companyData) {
    try {
      const message = this._buildAuctionWinnerMessage(auctionData, winnerVendor, companyData);

      const notifications = [];

      // WhatsApp al ganador
      if (winnerVendor.whatsappNumber) {
        const whatsappResult = await this.sendWhatsAppMessage(winnerVendor.whatsappNumber, message);
        notifications.push({ type: 'whatsapp', success: whatsappResult.success, result: whatsappResult });
      }

      // SMS de respaldo
      if (winnerVendor.phone) {
        const smsResult = await this.sendSMS(winnerVendor.phone, message);
        notifications.push({ type: 'sms', success: smsResult.success, result: smsResult });
      }

      // Email con detalles completos
      if (winnerVendor.email) {
        const emailResult = await this.sendEmail(
          winnerVendor.email,
          '🎉 ¡Felicitaciones! Has ganado un paquete de soporte',
          this._buildAuctionWinnerEmailMessage(auctionData, winnerVendor, companyData)
        );
        notifications.push({ type: 'email', success: emailResult.success, result: emailResult });
      }

      return { success: notifications.some(n => n.success), notifications };
    } catch (error) {
      console.error('Error notifying auction winner:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyPackageLoss(originalVendor, companyData, lossReason) {
    try {
      const message = this._buildPackageLossMessage(originalVendor, companyData, lossReason);

      const notifications = [];

      // WhatsApp al vendedor que perdió el paquete
      if (originalVendor.whatsappNumber) {
        const whatsappResult = await this.sendWhatsAppMessage(originalVendor.whatsappNumber, message);
        notifications.push({ type: 'whatsapp', success: whatsappResult.success, result: whatsappResult });
      }

      // SMS de respaldo
      if (originalVendor.phone) {
        const smsResult = await this.sendSMS(originalVendor.phone, message);
        notifications.push({ type: 'sms', success: smsResult.success, result: smsResult });
      }

      // Email con plan de mejora
      if (originalVendor.email) {
        const emailResult = await this.sendEmail(
          originalVendor.email,
          '📉 Pérdida de Paquete de Soporte - Plan de Mejora',
          this._buildPackageLossEmailMessage(originalVendor, companyData, lossReason)
        );
        notifications.push({ type: 'email', success: emailResult.success, result: emailResult });
      }

      return { success: notifications.some(n => n.success), notifications };
    } catch (error) {
      console.error('Error notifying package loss:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyCommissionChange(vendorData, commissionData, changeType) {
    try {
      const message = this._buildCommissionChangeMessage(vendorData, commissionData, changeType);

      const notifications = [];

      // WhatsApp al vendedor
      if (vendorData.whatsappNumber) {
        const whatsappResult = await this.sendWhatsAppMessage(vendorData.whatsappNumber, message);
        notifications.push({ type: 'whatsapp', success: whatsappResult.success, result: whatsappResult });
      }

      // SMS de respaldo
      if (vendorData.phone) {
        const smsResult = await this.sendSMS(vendorData.phone, message);
        notifications.push({ type: 'sms', success: smsResult.success, result: smsResult });
      }

      return { success: notifications.some(n => n.success), notifications };
    } catch (error) {
      console.error('Error notifying commission change:', error);
      return { success: false, error: error.message };
    }
  }

  // === CONSTRUCTORES DE MENSAJES PARA VENDEDORES ===

  _buildRatingDropMessage(vendorData, companyData, ratingData) {
    return `⚠️ *ALERTA CALIFICACIÓN BAJA*\n\n` +
           `Hola ${vendorData.firstName},\n\n` +
           `Tu calificación para la empresa "${companyData.name}" ha bajado a ${ratingData.rating} estrellas.\n\n` +
           `📊 **Detalle de calificación:**\n` +
           `⏱️ Tiempo de respuesta: ${ratingData.responseTimeScore}/5\n` +
           `✅ Calidad de resolución: ${ratingData.resolutionQualityScore}/5\n` +
           `😊 Satisfacción cliente: ${ratingData.customerSatisfactionScore}/5\n\n` +
           `${ratingData.rating < 2.0 ?
             '🚨 **CRÍTICO**: Tu calificación está por debajo de 2.0 estrellas. ' +
             'El paquete de soporte entrará en subasta automática en las próximas 24 horas.\n\n' +
             '📋 **Acciones requeridas:**\n' +
             '• Contacta al cliente inmediatamente\n' +
             '• Revisa y mejora tus tiempos de respuesta\n' +
             '• Implementa el plan de mejora\n\n'
             :
             '📋 **Recomendaciones:**\n' +
             '• Mejora tus tiempos de respuesta\n' +
             '• Asegúrate de la calidad en las resoluciones\n' +
             '• Mantén comunicación proactiva con el cliente\n\n'
           }` +
           `Para consultas: +54 2657 673741\n` +
           `🏢 APONNT - Sistema de Vendedores`;
  }

  _buildAuctionStartMessage(auctionData, vendor) {
    const auctionEnd = new Date(auctionData.auctionEndDate).toLocaleString('es-ES');

    return `🔔 *NUEVA SUBASTA DISPONIBLE*\n\n` +
           `Hola ${vendor.firstName},\n\n` +
           `Se ha iniciado una subasta para un paquete de soporte disponible.\n\n` +
           `🏢 **Empresa:** ${auctionData.companyName}\n` +
           `💰 **Comisión actual:** ${auctionData.monthlyCommissionValue}% mensual\n` +
           `⏰ **Cierre de subasta:** ${auctionEnd}\n` +
           `⭐ **Tu calificación global:** ${vendor.globalRating || 'Calculando...'}\n\n` +
           `${vendor.acceptsAuctions ?
             '✅ Puedes participar en esta subasta.\n\n' +
             '📋 **Para participar:**\n' +
             '• Ingresa al panel de vendedores\n' +
             '• Revisa los detalles de la empresa\n' +
             '• Presenta tu oferta antes del cierre\n\n'
             :
             '❌ Tu perfil no acepta subastas actualmente.\n' +
             'Para participar, actualiza tus preferencias.\n\n'
           }` +
           `🏆 La selección se basa en calificación (70%) y comisión competitiva (30%).\n\n` +
           `💼 Panel: ${process.env.VENDOR_PANEL_URL || 'Contacta administración'}\n` +
           `🏢 APONNT - Sistema de Subasta`;
  }

  _buildAuctionWinnerMessage(auctionData, winnerVendor, companyData) {
    return `🎉 *¡FELICITACIONES! HAS GANADO*\n\n` +
           `Hola ${winnerVendor.firstName},\n\n` +
           `¡Has sido seleccionado para brindar soporte a "${companyData.name}"!\n\n` +
           `🏆 **Detalles del paquete:**\n` +
           `🏢 Empresa: ${companyData.name}\n` +
           `💰 Comisión: ${auctionData.monthlyCommissionValue}% mensual\n` +
           `📅 Inicio: Inmediato\n` +
           `⭐ Tu puntuación ganadora: ${auctionData.winnerScore || 'Excelente'}\n\n` +
           `📋 **Próximos pasos:**\n` +
           `• Contacta a la empresa en las próximas 24 horas\n` +
           `• Revisa el historial de tickets pendientes\n` +
           `• Configura tus horarios de atención\n\n` +
           `📞 **Contacto empresa:**\n` +
           `Tel: ${companyData.phone || 'Ver panel'}\n` +
           `Email: ${companyData.email || 'Ver panel'}\n\n` +
           `¡Gracias por tu excelencia en el servicio!\n` +
           `🏢 APONNT - Sistema de Vendedores`;
  }

  _buildAuctionWinnerEmailMessage(auctionData, winnerVendor, companyData) {
    return `🎉 FELICITACIONES - NUEVO PAQUETE DE SOPORTE ASIGNADO\n\n` +
           `Estimado/a ${winnerVendor.firstName} ${winnerVendor.lastName},\n\n` +
           `Le informamos que ha sido seleccionado/a para brindar soporte técnico a la empresa "${companyData.name}" ` +
           `como resultado del proceso de subasta automatizada.\n\n` +
           `DETALLES DEL PAQUETE:\n` +
           `• Empresa: ${companyData.name}\n` +
           `• Comisión mensual: ${auctionData.monthlyCommissionValue}%\n` +
           `• Fecha de inicio: ${new Date().toLocaleDateString('es-ES')}\n` +
           `• Razón de selección: ${auctionData.winnerReason || 'Mejor puntuación general'}\n\n` +
           `INFORMACIÓN DE CONTACTO DE LA EMPRESA:\n` +
           `• Teléfono: ${companyData.phone || 'Disponible en el panel'}\n` +
           `• Email: ${companyData.email || 'Disponible en el panel'}\n` +
           `• Dirección: ${companyData.address || 'Disponible en el panel'}\n\n` +
           `RESPONSABILIDADES:\n` +
           `• Responder tickets en un máximo de 30 minutos\n` +
           `• Resolver problemas en un máximo de 24 horas\n` +
           `• Mantener comunicación proactiva con el cliente\n` +
           `• Documentar todas las resoluciones\n\n` +
           `ACCESO AL SISTEMA:\n` +
           `Panel de vendedores: ${process.env.VENDOR_PANEL_URL || 'Solicitar acceso'}\n` +
           `Usuario: Su email registrado\n` +
           `Tickets pendientes: Revisar inmediatamente\n\n` +
           `Para cualquier consulta, contacte a:\n` +
           `Pablo Rivas Jordan: +54 2657 673741\n\n` +
           `¡Gracias por su compromiso con la excelencia en el servicio!\n\n` +
           `APONNT - Sistema de Gestión de Vendedores v2.3`;
  }

  _buildPackageLossMessage(originalVendor, companyData, lossReason) {
    return `📉 *PÉRDIDA DE PAQUETE DE SOPORTE*\n\n` +
           `Hola ${originalVendor.firstName},\n\n` +
           `Lamentamos informarte que has perdido el paquete de soporte de "${companyData.name}".\n\n` +
           `📋 **Motivo:** ${lossReason}\n` +
           `📅 **Fecha:** ${new Date().toLocaleDateString('es-ES')}\n\n` +
           `🔄 **Plan de mejora obligatorio:**\n` +
           `• Capacitación en tiempos de respuesta\n` +
           `• Revisión de procesos de soporte\n` +
           `• Mentoring con vendedor senior\n` +
           `• Seguimiento semanal de métricas\n\n` +
           `⏰ **Período de mejora:** 30 días\n` +
           `📊 **Meta:** Alcanzar mínimo 3.5 estrellas\n\n` +
           `Una vez completado el plan, podrás:\n` +
           `• Volver a participar en subastas\n` +
           `• Recibir nuevos paquetes\n` +
           `• Recuperar tu reputación\n\n` +
           `📞 Contacta inmediatamente: +54 2657 673741\n` +
           `🏢 APONNT - Programa de Mejora`;
  }

  _buildPackageLossEmailMessage(originalVendor, companyData, lossReason) {
    return `NOTIFICACIÓN DE PÉRDIDA DE PAQUETE DE SOPORTE\n\n` +
           `Estimado/a ${originalVendor.firstName} ${originalVendor.lastName},\n\n` +
           `Por medio de la presente, le informamos que el paquete de soporte correspondiente ` +
           `a la empresa "${companyData.name}" ha sido transferido a otro vendedor.\n\n` +
           `MOTIVO DE LA TRANSFERENCIA:\n${lossReason}\n\n` +
           `MÉTRICAS QUE LLEVARON A ESTA DECISIÓN:\n` +
           `• Calificación promedio inferior a 2.0 estrellas\n` +
           `• Tiempo de respuesta superior a los estándares\n` +
           `• Calidad de resolución insatisfactoria\n` +
           `• Feedback negativo del cliente\n\n` +
           `PLAN DE MEJORA OBLIGATORIO:\n\n` +
           `1. CAPACITACIÓN TÉCNICA (Semana 1-2)\n` +
           `   • Curso de atención al cliente\n` +
           `   • Entrenamiento en herramientas de soporte\n` +
           `   • Simulacros de resolución de tickets\n\n` +
           `2. MENTORING (Semana 3-4)\n` +
           `   • Asignación de mentor senior\n` +
           `   • Seguimiento diario de casos\n` +
           `   • Feedback continuo y mejoras\n\n` +
           `3. EVALUACIÓN CONTINUA (Todo el mes)\n` +
           `   • Monitoreo de tiempos de respuesta\n` +
           `   • Evaluación de calidad de resolución\n` +
           `   • Medición de satisfacción en casos piloto\n\n` +
           `CRONOGRAMA:\n` +
           `• Inicio del plan: ${new Date().toLocaleDateString('es-ES')}\n` +
           `• Evaluación intermedia: ${new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}\n` +
           `• Evaluación final: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}\n\n` +
           `CONDICIONES PARA REINCORPORACIÓN:\n` +
           `• Calificación mínima: 3.5 estrellas\n` +
           `• Tiempo máximo de respuesta: 30 minutos\n` +
           `• Tiempo máximo de resolución: 24 horas\n` +
           `• Aprobación del supervisor\n\n` +
           `Una vez completado exitosamente el plan de mejora, podrá:\n` +
           `• Participar nuevamente en subastas\n` +
           `• Recibir asignación de nuevos paquetes\n` +
           `• Recuperar su reputación en el sistema\n\n` +
           `Para iniciar el plan o consultas:\n` +
           `Pablo Rivas Jordan: +54 2657 673741\n` +
           `Email: soporte@aponnt.com\n\n` +
           `Estamos comprometidos con su crecimiento profesional y esperamos su pronta recuperación.\n\n` +
           `APONNT - Programa de Mejora Continua v2.3`;
  }

  _buildCommissionChangeMessage(vendorData, commissionData, changeType) {
    const changeEmoji = changeType === 'increase' ? '📈' : changeType === 'decrease' ? '📉' : '🔄';
    const changeText = changeType === 'increase' ? 'AUMENTO' : changeType === 'decrease' ? 'REDUCCIÓN' : 'CAMBIO';

    return `${changeEmoji} *${changeText} DE COMISIÓN*\n\n` +
           `Hola ${vendorData.firstName},\n\n` +
           `Te informamos sobre un cambio en tus comisiones:\n\n` +
           `🏢 **Empresa:** ${commissionData.companyName}\n` +
           `💰 **Nueva comisión:** ${commissionData.percentage}%\n` +
           `📅 **Vigencia:** Desde ${new Date(commissionData.effectiveDate).toLocaleDateString('es-ES')}\n` +
           `📋 **Motivo:** ${commissionData.reason || 'Ajuste de rendimiento'}\n\n` +
           `${changeType === 'increase' ?
             '🎉 ¡Felicitaciones por tu excelente desempeño!' :
             changeType === 'decrease' ?
             '📋 Este ajuste responde a las métricas de performance. Te recomendamos revisar tu plan de mejora.' :
             'Este cambio es parte del ajuste regular de comisiones.'
           }\n\n` +
           `Para consultas: +54 2657 673741\n` +
           `🏢 APONNT - Sistema de Vendedores`;
  }
}

module.exports = new NotificationService();