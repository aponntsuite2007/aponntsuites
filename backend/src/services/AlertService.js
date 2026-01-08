/**
 * AlertService.js
 * Servicio para gestión de alertas del sistema
 */

const AlertsNotifications = require('./integrations/alerts-notifications');

class AlertService {
  /**
   * Enviar alerta crítica del sistema
   */
  static async sendCriticalAlert({ companyId, recipientId, alertType, message, metadata = {} }) {
    try {
      await AlertsNotifications.notifyCritical({
        companyId,
        recipientId,
        data: {
          originId: metadata.alertId || Date.now().toString(),
          message,
          alert_type: alertType,
          ...metadata
        }
      });

      console.log(`✅ [ALERTS] Alerta crítica enviada: ${alertType}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [ALERTS] Error enviando alerta:`, error);
      throw error;
    }
  }

  /**
   * Enviar recordatorio de alerta
   */
  static async sendReminderAlert({ companyId, recipientId, message, metadata = {} }) {
    try {
      await AlertsNotifications.notifyReminder({
        companyId,
        recipientId,
        data: {
          originId: metadata.alertId || Date.now().toString(),
          message,
          ...metadata
        }
      });

      console.log(`✅ [ALERTS] Recordatorio enviado`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [ALERTS] Error enviando recordatorio:`, error);
      throw error;
    }
  }

  /**
   * Enviar alerta de sistema
   */
  static async sendSystemAlert({ companyId, recipientId, message, metadata = {} }) {
    try {
      await AlertsNotifications.notifySystem({
        companyId,
        recipientId,
        data: {
          originId: metadata.alertId || Date.now().toString(),
          message,
          ...metadata
        }
      });

      console.log(`✅ [ALERTS] Alerta de sistema enviada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [ALERTS] Error enviando alerta de sistema:`, error);
      throw error;
    }
  }
}

module.exports = AlertService;
