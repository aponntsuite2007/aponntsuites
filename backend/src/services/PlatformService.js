/**
 * PlatformService.js
 * Servicio para notificaciones de plataforma (mantenimiento, actualizaciones, etc.)
 */

const PlatformNotifications = require('./integrations/platform-notifications');

class PlatformService {
  /**
   * Notificar mantenimiento programado
   */
  static async notifyMaintenance({ companyId, recipientId, maintenanceData }) {
    try {
      await PlatformNotifications.notifyMaintenanceScheduled({
        companyId,
        recipientId,
        data: {
          originId: maintenanceData.id || Date.now().toString(),
          message: `Mantenimiento programado: ${maintenanceData.title}`,
          scheduled_date: maintenanceData.scheduledDate,
          duration: maintenanceData.duration,
          affected_services: maintenanceData.affectedServices,
          ...maintenanceData
        }
      });

      console.log(`✅ [PLATFORM] Notificación de mantenimiento enviada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [PLATFORM] Error notificando mantenimiento:`, error);
      throw error;
    }
  }

  /**
   * Notificar nueva versión disponible
   */
  static async notifyNewVersion({ companyId, recipientId, versionData }) {
    try {
      await PlatformNotifications.notifyVersionUpdate({
        companyId,
        recipientId,
        data: {
          originId: versionData.version || Date.now().toString(),
          message: `Nueva versión disponible: ${versionData.version}`,
          version: versionData.version,
          features: versionData.features,
          release_notes: versionData.releaseNotes,
          ...versionData
        }
      });

      console.log(`✅ [PLATFORM] Notificación de nueva versión enviada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [PLATFORM] Error notificando versión:`, error);
      throw error;
    }
  }

  /**
   * Notificar evento del sistema
   */
  static async notifySystemEvent({ companyId, recipientId, eventData }) {
    try {
      await PlatformNotifications.notifySystemEvent({
        companyId,
        recipientId,
        data: {
          originId: eventData.id || Date.now().toString(),
          message: `Evento del sistema: ${eventData.title}`,
          event_type: eventData.type,
          severity: eventData.severity,
          ...eventData
        }
      });

      console.log(`✅ [PLATFORM] Notificación de evento del sistema enviada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [PLATFORM] Error notificando evento:`, error);
      throw error;
    }
  }
}

module.exports = PlatformService;
