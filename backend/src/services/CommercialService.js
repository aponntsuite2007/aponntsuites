/**
 * CommercialService.js
 * Servicio para gestión comercial y ventas
 */

const CommercialNotifications = require('./integrations/commercial-notifications');

class CommercialService {
  /**
   * Notificar nueva oportunidad comercial
   */
  static async notifyNewOpportunity({ companyId, recipientId, opportunityData }) {
    try {
      await CommercialNotifications.notifyOpportunityCreated({
        companyId,
        recipientId,
        data: {
          originId: opportunityData.id || Date.now().toString(),
          message: `Nueva oportunidad comercial: ${opportunityData.name}`,
          ...opportunityData
        }
      });

      console.log(`✅ [COMMERCIAL] Notificación de oportunidad enviada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [COMMERCIAL] Error notificando oportunidad:`, error);
      throw error;
    }
  }

  /**
   * Notificar cambio en pipeline comercial
   */
  static async notifyPipelineUpdate({ companyId, recipientId, pipelineData }) {
    try {
      await CommercialNotifications.notifyPipelineUpdated({
        companyId,
        recipientId,
        data: {
          originId: pipelineData.id || Date.now().toString(),
          message: `Actualización en pipeline comercial`,
          ...pipelineData
        }
      });

      console.log(`✅ [COMMERCIAL] Notificación de pipeline enviada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [COMMERCIAL] Error notificando pipeline:`, error);
      throw error;
    }
  }

  /**
   * Notificar cierre de venta
   */
  static async notifySaleClosed({ companyId, recipientId, saleData }) {
    try {
      await CommercialNotifications.notifySaleClosed({
        companyId,
        recipientId,
        data: {
          originId: saleData.id || Date.now().toString(),
          message: `Venta cerrada exitosamente`,
          ...saleData
        }
      });

      console.log(`✅ [COMMERCIAL] Notificación de venta cerrada enviada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [COMMERCIAL] Error notificando venta:`, error);
      throw error;
    }
  }
}

module.exports = CommercialService;
