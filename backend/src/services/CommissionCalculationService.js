/**
 * SERVICE: CommissionCalculationService
 *
 * Servicio para cálculo automático de comisiones al registrar pagos.
 * Genera 3 tipos de comisiones:
 * 1. Comisión de VENTA (al vendedor)
 * 2. Comisión de SOPORTE (al partner soporte)
 * 3. Comisión de LÍDER (si el vendedor tiene líder)
 *
 * REGLAS:
 * - Comisión de venta: % sobre total factura (definido en company.seller_commission_rate)
 * - Comisión de soporte: % sobre total factura (definido en company.support_commission_rate)
 * - Comisión de líder: % sobre comisión de venta del liderado (definido en partner.leader_commission_rate)
 */

const { sequelize } = require('../config/database');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const db = require('../config/database');

class CommissionCalculationService {
  /**
   * Genera todas las comisiones para un pago registrado
   * @param {Object} payment - Objeto de pago
   * @param {Object} invoice - Objeto de factura
   * @param {Object} company - Objeto de empresa
   * @returns {Promise<Array>} Array de comisiones creadas
   */
  async generateCommissionsForPayment(payment, invoice, company) {
    try {
      console.log(`\n💰 [COMMISSIONS] Generando comisiones para pago ID ${payment.id}`);
      console.log(`   Factura: ${invoice.invoice_number}`);
      console.log(`   Empresa: ${company.name} (ID: ${company.company_id})`);
      console.log(`   Monto pagado: ${payment.amount} ${payment.currency}`);

      const commissionsCreated = [];

      // 1. Comisión de VENTA (al vendedor)
      if (company.seller_id && company.seller_commission_rate > 0) {
        const saleCommission = await this.createSaleCommission({
          payment,
          invoice,
          company,
          partnerId: company.seller_id,
          rate: company.seller_commission_rate
        });

        if (saleCommission) {
          commissionsCreated.push(saleCommission);
          console.log(`   ✅ Comisión de VENTA creada: ${saleCommission.commission_amount} ${saleCommission.currency} (Partner ${company.seller_id})`);

          // 3. Comisión de LÍDER (si el vendedor tiene líder)
          const leaderCommission = await this.createLeaderCommission({
            payment,
            invoice,
            company,
            sellerPartnerId: company.seller_id,
            saleCommissionAmount: saleCommission.commission_amount
          });

          if (leaderCommission) {
            commissionsCreated.push(leaderCommission);
            console.log(`   ✅ Comisión de LÍDER creada: ${leaderCommission.commission_amount} ${leaderCommission.currency}`);
          }
        }
      } else {
        console.log(`   ⚠️  Sin comisión de venta (seller_id: ${company.seller_id}, rate: ${company.seller_commission_rate}%)`);
      }

      // 2. Comisión de SOPORTE (al partner soporte)
      if (company.support_id && company.support_commission_rate > 0) {
        const supportCommission = await this.createSupportCommission({
          payment,
          invoice,
          company,
          partnerId: company.support_id,
          rate: company.support_commission_rate
        });

        if (supportCommission) {
          commissionsCreated.push(supportCommission);
          console.log(`   ✅ Comisión de SOPORTE creada: ${supportCommission.commission_amount} ${supportCommission.currency} (Partner ${company.support_id})`);
        }
      } else {
        console.log(`   ⚠️  Sin comisión de soporte (support_id: ${company.support_id}, rate: ${company.support_commission_rate}%)`);
      }

      console.log(`\n💰 [COMMISSIONS] Total comisiones generadas: ${commissionsCreated.length}`);
      return commissionsCreated;

    } catch (error) {
      console.error('❌ [COMMISSIONS] Error generando comisiones:', error);
      throw error;
    }
  }

  /**
   * Crea comisión de VENTA
   */
  async createSaleCommission({ payment, invoice, company, partnerId, rate }) {
    try {
      const baseAmount = parseFloat(payment.amount);
      const commissionAmount = (baseAmount * parseFloat(rate)) / 100;

      const commission = await Commission.create({
        partner_id: partnerId,
        commission_type: 'sale',
        invoice_id: invoice.id,
        payment_id: payment.id,
        company_id: company.company_id,
        base_amount: baseAmount,
        commission_rate: rate,
        commission_amount: commissionAmount.toFixed(2),
        currency: payment.currency,
        originated_from_partner_id: null,
        billing_period_month: invoice.billing_period_month,
        billing_period_year: invoice.billing_period_year,
        status: 'pending',
        notes: `Comisión de venta para ${company.name} - Factura ${invoice.invoice_number}`
      });

      return commission;
    } catch (error) {
      console.error('❌ Error creando comisión de venta:', error);
      throw error;
    }
  }

  /**
   * Crea comisión de SOPORTE
   */
  async createSupportCommission({ payment, invoice, company, partnerId, rate }) {
    try {
      const baseAmount = parseFloat(payment.amount);
      const commissionAmount = (baseAmount * parseFloat(rate)) / 100;

      const commission = await Commission.create({
        partner_id: partnerId,
        commission_type: 'support',
        invoice_id: invoice.id,
        payment_id: payment.id,
        company_id: company.company_id,
        base_amount: baseAmount,
        commission_rate: rate,
        commission_amount: commissionAmount.toFixed(2),
        currency: payment.currency,
        originated_from_partner_id: null,
        billing_period_month: invoice.billing_period_month,
        billing_period_year: invoice.billing_period_year,
        status: 'pending',
        notes: `Comisión de soporte para ${company.name} - Factura ${invoice.invoice_number}`
      });

      return commission;
    } catch (error) {
      console.error('❌ Error creando comisión de soporte:', error);
      throw error;
    }
  }

  /**
   * Crea comisión de LÍDER (si el vendedor tiene un líder)
   */
  async createLeaderCommission({ payment, invoice, company, sellerPartnerId, saleCommissionAmount }) {
    try {
      // Obtener datos del partner vendedor
      const [sellerData] = await sequelize.query(
        'SELECT leader_id, leader_commission_rate FROM partners WHERE id = :partnerId',
        {
          replacements: { partnerId: sellerPartnerId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (!sellerData || !sellerData.leader_id || sellerData.leader_commission_rate <= 0) {
        console.log(`   ℹ️  Partner ${sellerPartnerId} no tiene líder o rate = 0`);
        return null;
      }

      const leaderId = sellerData.leader_id;
      const leaderRate = parseFloat(sellerData.leader_commission_rate);

      // Base amount para líder es la comisión de venta del liderado
      const baseAmount = parseFloat(saleCommissionAmount);
      const leaderCommissionAmount = (baseAmount * leaderRate) / 100;

      const commission = await Commission.create({
        partner_id: leaderId,
        commission_type: 'leader',
        invoice_id: invoice.id,
        payment_id: payment.id,
        company_id: company.company_id,
        base_amount: baseAmount,
        commission_rate: leaderRate,
        commission_amount: leaderCommissionAmount.toFixed(2),
        currency: payment.currency,
        originated_from_partner_id: sellerPartnerId,
        billing_period_month: invoice.billing_period_month,
        billing_period_year: invoice.billing_period_year,
        status: 'pending',
        notes: `Comisión de líder por venta de Partner ${sellerPartnerId} - Empresa ${company.name}`
      });

      return commission;
    } catch (error) {
      console.error('❌ Error creando comisión de líder:', error);
      throw error;
    }
  }

  /**
   * Calcula el total de comisiones pendientes de un partner
   * @param {number} partnerId - ID del partner
   * @param {string} status - Estado de comisiones (default: 'pending')
   * @returns {Promise<Object>} Total de comisiones por tipo
   */
  async getPartnerPendingCommissions(partnerId, status = 'pending') {
    try {
      const [result] = await sequelize.query(
        `SELECT
          commission_type,
          COUNT(*) as count,
          SUM(commission_amount) as total_amount,
          currency
        FROM commissions
        WHERE partner_id = :partnerId AND status = :status
        GROUP BY commission_type, currency
        ORDER BY commission_type`,
        {
          replacements: { partnerId, status },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return result || [];
    } catch (error) {
      console.error('❌ Error obteniendo comisiones pendientes:', error);
      throw error;
    }
  }

  /**
   * Marca comisiones como pagadas
   * @param {Array<number>} commissionIds - IDs de comisiones a marcar
   * @returns {Promise<number>} Cantidad de comisiones actualizadas
   */
  async markCommissionsAsPaid(commissionIds) {
    try {
      const [result] = await sequelize.query(
        `UPDATE commissions
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP
        WHERE id = ANY(:ids::bigint[])
        RETURNING id`,
        {
          replacements: { ids: commissionIds },
          type: sequelize.QueryTypes.UPDATE
        }
      );

      console.log(`✅ [COMMISSIONS] ${result.length} comisiones marcadas como pagadas`);
      return result.length;
    } catch (error) {
      console.error('❌ Error marcando comisiones como pagadas:', error);
      throw error;
    }
  }

  /**
   * Obtiene resumen de comisiones por período
   * @param {number} year - Año
   * @param {number} month - Mes
   * @returns {Promise<Array>} Resumen de comisiones
   */
  async getCommissionsSummaryByPeriod(year, month) {
    try {
      const summary = await sequelize.query(
        `SELECT
          p.id as partner_id,
          p.name as partner_name,
          p.email as partner_email,
          c.commission_type,
          COUNT(c.id) as commissions_count,
          SUM(c.commission_amount) as total_amount,
          c.currency,
          c.status
        FROM commissions c
        INNER JOIN partners p ON p.id = c.partner_id
        WHERE c.billing_period_year = :year AND c.billing_period_month = :month
        GROUP BY p.id, p.name, p.email, c.commission_type, c.currency, c.status
        ORDER BY p.name, c.commission_type`,
        {
          replacements: { year, month },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return summary;
    } catch (error) {
      console.error('❌ Error obteniendo resumen de comisiones:', error);
      throw error;
    }
  }
}

module.exports = new CommissionCalculationService();
