/**
 * NotificationBillingService.js
 *
 * Servicio centralizado para gestión de tarifación y facturación de canales de notificación
 * Aponnt gestiona TODAS las cuentas (Twilio, Firebase) y factura a empresas según consumo
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class NotificationBillingService {
  /**
   * Verificar si una empresa puede enviar notificación por un canal
   *
   * @param {number} companyId
   * @param {string} channel - 'sms', 'whatsapp', 'push', 'email'
   * @returns {Promise<{canSend: boolean, reason: string, usage: object}>}
   */
  static async canCompanySend(companyId, channel) {
    try {
      const [result] = await sequelize.query(`
        SELECT * FROM can_company_send_notification(:companyId, :channel)
      `, {
        replacements: { companyId, channel },
        type: QueryTypes.SELECT
      });

      return {
        canSend: result.can_send,
        reason: result.reason,
        usage: {
          current: result.current_usage || 0,
          quota: result.monthly_quota,
          remaining: result.remaining
        }
      };
    } catch (error) {
      console.error(`❌ [BILLING] Error verificando permiso de envío:`, error);
      // En caso de error, permitir envío (fail-open)
      return {
        canSend: true,
        reason: 'error_checking_quota',
        usage: { current: 0, quota: null, remaining: null }
      };
    }
  }

  /**
   * Registrar envío de notificación y acumular costo
   *
   * @param {number} companyId
   * @param {number} notificationId
   * @param {string} channel
   * @param {string} status - 'pending', 'delivered', 'failed', 'suspended'
   * @returns {Promise<{billingId: number, unitPrice: number, totalCost: number}>}
   */
  static async registerBilling(companyId, notificationId, channel, status = 'pending') {
    try {
      const [result] = await sequelize.query(`
        SELECT * FROM register_notification_billing(
          :companyId,
          :notificationId,
          :channel,
          :status
        )
      `, {
        replacements: { companyId, notificationId, channel, status },
        type: QueryTypes.SELECT
      });

      console.log(`💰 [BILLING] Registrado: Empresa ${companyId}, Canal ${channel}, Costo $${result.total_cost}`);

      return {
        billingId: result.billing_id,
        unitPrice: parseFloat(result.unit_price),
        totalCost: parseFloat(result.total_cost),
        success: result.success
      };
    } catch (error) {
      console.error(`❌ [BILLING] Error registrando billing:`, error);
      throw error;
    }
  }

  /**
   * Obtener consumo mensual de una empresa
   *
   * @param {number} companyId
   * @param {number} year
   * @param {number} month
   * @returns {Promise<Array>}
   */
  static async getMonthlyUsage(companyId, year = null, month = null) {
    try {
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || (new Date().getMonth() + 1);

      const usage = await sequelize.query(`
        SELECT
          channel,
          total_sent,
          total_delivered,
          total_failed,
          total_cost,
          is_invoiced,
          invoice_id,
          last_updated
        FROM company_notification_usage
        WHERE company_id = :companyId
          AND year = :year
          AND month = :month
        ORDER BY total_cost DESC
      `, {
        replacements: { companyId, year: currentYear, month: currentMonth },
        type: QueryTypes.SELECT
      });

      return usage.map(u => ({
        channel: u.channel,
        totalSent: parseInt(u.total_sent),
        totalDelivered: parseInt(u.total_delivered),
        totalFailed: parseInt(u.total_failed),
        totalCost: parseFloat(u.total_cost),
        isInvoiced: u.is_invoiced,
        invoiceId: u.invoice_id,
        lastUpdated: u.last_updated
      }));
    } catch (error) {
      console.error(`❌ [BILLING] Error obteniendo consumo mensual:`, error);
      return [];
    }
  }

  /**
   * Obtener resumen de facturación para TODAS las empresas (Aponnt)
   *
   * @param {number} year
   * @param {number} month
   * @returns {Promise<Array>}
   */
  static async getMonthlyBillingSummary(year = null, month = null) {
    try {
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || (new Date().getMonth() + 1);

      const summary = await sequelize.query(`
        SELECT * FROM get_monthly_billing_summary(:year, :month)
      `, {
        replacements: { year: currentYear, month: currentMonth },
        type: QueryTypes.SELECT
      });

      return summary.map(s => ({
        companyId: s.company_id,
        companyName: s.company_name,
        channel: s.channel,
        totalSent: parseInt(s.total_sent),
        totalDelivered: parseInt(s.total_delivered),
        totalFailed: parseInt(s.total_failed),
        totalCost: parseFloat(s.total_cost),
        isInvoiced: s.is_invoiced,
        invoiceId: s.invoice_id
      }));
    } catch (error) {
      console.error(`❌ [BILLING] Error obteniendo resumen de facturación:`, error);
      return [];
    }
  }

  /**
   * Obtener tarifas configuradas para una empresa
   *
   * @param {number} companyId
   * @returns {Promise<Array>}
   */
  static async getCompanyPricing(companyId) {
    try {
      const pricing = await sequelize.query(`
        SELECT
          channel,
          price_per_unit,
          currency,
          monthly_quota,
          is_enabled,
          suspension_reason,
          suspended_at,
          updated_at
        FROM company_notification_pricing
        WHERE company_id = :companyId
        ORDER BY channel
      `, {
        replacements: { companyId },
        type: QueryTypes.SELECT
      });

      return pricing.map(p => ({
        channel: p.channel,
        pricePerUnit: parseFloat(p.price_per_unit),
        currency: p.currency,
        monthlyQuota: p.monthly_quota,
        isEnabled: p.is_enabled,
        suspensionReason: p.suspension_reason,
        suspendedAt: p.suspended_at,
        updatedAt: p.updated_at
      }));
    } catch (error) {
      console.error(`❌ [BILLING] Error obteniendo pricing:`, error);
      return [];
    }
  }

  /**
   * Configurar tarifa para una empresa y canal
   *
   * @param {number} companyId
   * @param {string} channel
   * @param {number} pricePerUnit
   * @param {number} monthlyQuota - null = ilimitado
   * @param {boolean} isEnabled
   * @returns {Promise<boolean>}
   */
  static async setCompanyPricing(companyId, channel, pricePerUnit, monthlyQuota = null, isEnabled = true) {
    try {
      await sequelize.query(`
        INSERT INTO company_notification_pricing (
          company_id,
          channel,
          price_per_unit,
          monthly_quota,
          is_enabled,
          updated_at
        ) VALUES (
          :companyId,
          :channel,
          :pricePerUnit,
          :monthlyQuota,
          :isEnabled,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (company_id, channel)
        DO UPDATE SET
          price_per_unit = EXCLUDED.price_per_unit,
          monthly_quota = EXCLUDED.monthly_quota,
          is_enabled = EXCLUDED.is_enabled,
          updated_at = CURRENT_TIMESTAMP
      `, {
        replacements: {
          companyId,
          channel,
          pricePerUnit,
          monthlyQuota,
          isEnabled
        },
        type: QueryTypes.INSERT
      });

      console.log(`✅ [BILLING] Tarifa configurada: Empresa ${companyId}, Canal ${channel}, Precio $${pricePerUnit}`);
      return true;
    } catch (error) {
      console.error(`❌ [BILLING] Error configurando tarifa:`, error);
      return false;
    }
  }

  /**
   * Suspender canal para una empresa
   *
   * @param {number} companyId
   * @param {string} channel
   * @param {string} reason - 'non_payment', 'request', 'abuse', etc.
   * @param {number} suspendedBy - user ID
   * @returns {Promise<boolean>}
   */
  static async suspendChannel(companyId, channel, reason = 'non_payment', suspendedBy = null) {
    try {
      await sequelize.query(`
        UPDATE company_notification_pricing
        SET
          is_enabled = false,
          suspension_reason = :reason,
          suspended_at = CURRENT_TIMESTAMP,
          suspended_by = :suspendedBy,
          updated_at = CURRENT_TIMESTAMP
        WHERE company_id = :companyId
          AND channel = :channel
      `, {
        replacements: { companyId, channel, reason, suspendedBy },
        type: QueryTypes.UPDATE
      });

      console.log(`🚫 [BILLING] Canal suspendido: Empresa ${companyId}, Canal ${channel}, Razón: ${reason}`);
      return true;
    } catch (error) {
      console.error(`❌ [BILLING] Error suspendiendo canal:`, error);
      return false;
    }
  }

  /**
   * Habilitar canal para una empresa
   *
   * @param {number} companyId
   * @param {string} channel
   * @returns {Promise<boolean>}
   */
  static async enableChannel(companyId, channel) {
    try {
      await sequelize.query(`
        UPDATE company_notification_pricing
        SET
          is_enabled = true,
          suspension_reason = NULL,
          suspended_at = NULL,
          suspended_by = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE company_id = :companyId
          AND channel = :channel
      `, {
        replacements: { companyId, channel },
        type: QueryTypes.UPDATE
      });

      console.log(`✅ [BILLING] Canal habilitado: Empresa ${companyId}, Canal ${channel}`);
      return true;
    } catch (error) {
      console.error(`❌ [BILLING] Error habilitando canal:`, error);
      return false;
    }
  }

  /**
   * Marcar período como facturado
   *
   * @param {number} companyId
   * @param {number} year
   * @param {number} month
   * @param {string} invoiceId
   * @returns {Promise<boolean>}
   */
  static async markAsInvoiced(companyId, year, month, invoiceId) {
    try {
      const [result] = await sequelize.query(`
        SELECT mark_period_as_invoiced(:companyId, :year, :month, :invoiceId) as success
      `, {
        replacements: { companyId, year, month, invoiceId },
        type: QueryTypes.SELECT
      });

      if (result.success) {
        console.log(`📄 [BILLING] Período facturado: Empresa ${companyId}, ${year}-${month}, Factura ${invoiceId}`);
      }

      return result.success;
    } catch (error) {
      console.error(`❌ [BILLING] Error marcando como facturado:`, error);
      return false;
    }
  }

  /**
   * Obtener totales de consumo de Aponnt (para pagar a Twilio/Firebase)
   *
   * @param {number} year
   * @param {number} month
   * @returns {Promise<{totalSent: number, totalCost: number, byChannel: object}>}
   */
  static async getAponntTotals(year = null, month = null) {
    try {
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || (new Date().getMonth() + 1);

      const [totals] = await sequelize.query(`
        SELECT
          SUM(total_sent) as total_sent,
          SUM(total_cost) as total_cost,
          COUNT(DISTINCT company_id) as total_companies
        FROM company_notification_usage
        WHERE year = :year
          AND month = :month
      `, {
        replacements: { year: currentYear, month: currentMonth },
        type: QueryTypes.SELECT
      });

      const byChannel = await sequelize.query(`
        SELECT
          channel,
          SUM(total_sent) as total_sent,
          SUM(total_delivered) as total_delivered,
          SUM(total_failed) as total_failed,
          SUM(total_cost) as total_cost
        FROM company_notification_usage
        WHERE year = :year
          AND month = :month
        GROUP BY channel
        ORDER BY total_cost DESC
      `, {
        replacements: { year: currentYear, month: currentMonth },
        type: QueryTypes.SELECT
      });

      return {
        totalSent: parseInt(totals.total_sent) || 0,
        totalCost: parseFloat(totals.total_cost) || 0,
        totalCompanies: parseInt(totals.total_companies) || 0,
        byChannel: byChannel.map(c => ({
          channel: c.channel,
          totalSent: parseInt(c.total_sent),
          totalDelivered: parseInt(c.total_delivered),
          totalFailed: parseInt(c.total_failed),
          totalCost: parseFloat(c.total_cost)
        }))
      };
    } catch (error) {
      console.error(`❌ [BILLING] Error obteniendo totales de Aponnt:`, error);
      return {
        totalSent: 0,
        totalCost: 0,
        totalCompanies: 0,
        byChannel: []
      };
    }
  }

  /**
   * Obtener log detallado de billing para una empresa
   *
   * @param {number} companyId
   * @param {object} filters - {year, month, channel, limit, offset}
   * @returns {Promise<Array>}
   */
  static async getBillingLog(companyId, filters = {}) {
    try {
      const {
        year = new Date().getFullYear(),
        month = new Date().getMonth() + 1,
        channel = null,
        limit = 100,
        offset = 0
      } = filters;

      const channelFilter = channel ? 'AND channel = :channel' : '';

      const log = await sequelize.query(`
        SELECT
          id,
          notification_id,
          channel,
          unit_price,
          total_cost,
          status,
          suspension_reason,
          created_at
        FROM company_notification_billing_log
        WHERE company_id = :companyId
          AND billing_year = :year
          AND billing_month = :month
          ${channelFilter}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { companyId, year, month, channel, limit, offset },
        type: QueryTypes.SELECT
      });

      return log.map(l => ({
        id: l.id,
        notificationId: l.notification_id,
        channel: l.channel,
        unitPrice: parseFloat(l.unit_price),
        totalCost: parseFloat(l.total_cost),
        status: l.status,
        suspensionReason: l.suspension_reason,
        createdAt: l.created_at
      }));
    } catch (error) {
      console.error(`❌ [BILLING] Error obteniendo log de billing:`, error);
      return [];
    }
  }
}

module.exports = NotificationBillingService;
