/**
 * PerformanceService.js
 * Servicio para gestión de evaluaciones de desempeño
 */

const PerformanceNotifications = require('./integrations/performance-notifications');

class PerformanceService {
  /**
   * Notificar nueva evaluación de desempeño
   */
  static async notifyEvaluationCreated({ companyId, recipientId, evaluationData }) {
    try {
      await PerformanceNotifications.notifyEvaluationCreated({
        companyId,
        recipientId,
        data: {
          originId: evaluationData.id || Date.now().toString(),
          message: `Nueva evaluación de desempeño asignada`,
          evaluation_period: evaluationData.period,
          employee_name: evaluationData.employeeName,
          ...evaluationData
        }
      });

      console.log(`✅ [PERFORMANCE] Notificación de evaluación creada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [PERFORMANCE] Error notificando evaluación:`, error);
      throw error;
    }
  }

  /**
   * Notificar evaluación completada
   */
  static async notifyEvaluationCompleted({ companyId, recipientId, evaluationData }) {
    try {
      await PerformanceNotifications.notifyEvaluationCompleted({
        companyId,
        recipientId,
        data: {
          originId: evaluationData.id || Date.now().toString(),
          message: `Evaluación de desempeño completada`,
          score: evaluationData.score,
          ...evaluationData
        }
      });

      console.log(`✅ [PERFORMANCE] Notificación de evaluación completada`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [PERFORMANCE] Error notificando evaluación completada:`, error);
      throw error;
    }
  }

  /**
   * Notificar recordatorio de evaluación
   */
  static async notifyEvaluationReminder({ companyId, recipientId, evaluationData }) {
    try {
      await PerformanceNotifications.notifyEvaluationReminder({
        companyId,
        recipientId,
        data: {
          originId: evaluationData.id || Date.now().toString(),
          message: `Recordatorio: Evaluación de desempeño pendiente`,
          due_date: evaluationData.dueDate,
          ...evaluationData
        }
      });

      console.log(`✅ [PERFORMANCE] Recordatorio de evaluación enviado`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [PERFORMANCE] Error enviando recordatorio:`, error);
      throw error;
    }
  }
}

module.exports = PerformanceService;
