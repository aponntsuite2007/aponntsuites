/**
 * COMMISSION SERVICE
 *
 * Gestión completa del sistema de comisiones de 2 niveles.
 * Implementa FASE 5: LIQUIDACIÓN DE COMISIONES del circuito comercial.
 *
 * RESPONSABILIDADES:
 * - Liquidación inmediata en onboarding (cliente paga primera factura)
 * - Liquidación mensual automática (cron job)
 * - Cálculo de comisiones de 2 niveles (vendedor directo + gerente general)
 * - Aprobación administrativa de liquidaciones
 * - Generación de pagos individuales
 * - Ejecución de pagos (transferencia, wallet)
 * - Reconciliación bancaria
 * - Generación de comprobantes
 * - Stats y reportes
 *
 * TRACE ID: COMMISSION-{UUID} (liquidación), PAYMENT-{UUID} (pago)
 *
 * INTEGRACIÓN:
 * - Usado por: OnboardingService, Cron Jobs
 * - Usa: CommissionLiquidation, CommissionPayment, Invoice, Contract, AponntStaff
 * - Notifica: NotificationExternalService
 *
 * SISTEMA DE 2 NIVELES (NO PIRAMIDAL):
 * - Vendedor directo:
 *   → Comisión por VENTA INICIAL: 15% (DIRECT_SALES)
 *   → Comisión por SOPORTE MENSUAL: 5% (SUPPORT_MONTHLY)
 * - Gerente general:
 *   → Comisión sobre ventas de su equipo: 3% (MANAGER_OVERRIDE)
 *
 * IMPORTANTE: NO es esquema piramidal ya que solo tiene 2 niveles jerárquicos
 */

const { v4: uuidv4 } = require('uuid');
const { CommissionLiquidation, CommissionPayment, Invoice, Contract, Company, sequelize } = require('../config/database');

class CommissionService {

  /**
   * ============================================
   * LIQUIDATE - Calcular y crear liquidación de comisiones
   * ============================================
   * Usado en onboarding (primera factura pagada) y mensualmente
   */
  async liquidate(liquidationData) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Validar factura
      const invoice = await Invoice.findByPk(liquidationData.invoice_id, { transaction });
      if (!invoice) {
        throw new Error(`Invoice ID ${liquidationData.invoice_id} no encontrada`);
      }

      if (invoice.status !== 'paid') {
        throw new Error(`Solo se pueden liquidar comisiones de facturas pagadas. Estado: ${invoice.status}`);
      }

      // 2. Verificar que no exista liquidación para esta factura
      const existingLiquidation = await CommissionLiquidation.findOne({
        where: { invoice_id: liquidationData.invoice_id },
        transaction
      });

      if (existingLiquidation) {
        console.log(`⚠️ [COMMISSION] Ya existe liquidación para factura ${invoice.invoice_number}`);
        return existingLiquidation;
      }

      // 3. Obtener contrato para comisiones
      const contract = await Contract.getActiveContract(invoice.company_id, transaction);
      if (!contract) {
        throw new Error(`No hay contrato activo para company ${invoice.company_id}`);
      }

      // 4. Calcular breakdown de comisiones (vendedor + piramidal L1-L4)
      const commissionBreakdown = await this.calculateCommissionBreakdown(
        invoice,
        contract,
        liquidationData.vendor_id,
        transaction
      );

      // 5. Calcular totales
      const totalCommissionAmount = this.sumCommissionBreakdown(commissionBreakdown);

      // 6. Generar liquidation_code
      const liquidationCode = await this.generateLiquidationCode(transaction);

      // 7. Determinar período
      const now = new Date();
      const periodStart = liquidationData.period_start || new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = liquidationData.period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // 8. Crear liquidación
      const liquidation = await CommissionLiquidation.create({
        id: uuidv4(),
        trace_id: liquidationData.trace_id || `COMMISSION-${uuidv4()}`,
        invoice_id: liquidationData.invoice_id,
        company_id: invoice.company_id,
        liquidation_type: liquidationData.liquidation_type || 'ONBOARDING_IMMEDIATE',
        liquidation_code: liquidationCode,
        liquidation_date: new Date(),
        period_start: periodStart,
        period_end: periodEnd,
        invoice_amount: invoice.total_amount,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.issue_date,
        total_commissionable: invoice.total_amount,
        total_commission_amount: totalCommissionAmount,
        commission_breakdown: commissionBreakdown,
        status: 'CALCULATED',
        source: liquidationData.source || 'SYSTEM',
        created_by: liquidationData.created_by || null
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [COMMISSION] Liquidación creada: ${liquidationCode}`);
      console.log(`   - Factura: ${invoice.invoice_number} | Monto: ${invoice.total_amount}`);
      console.log(`   - Comisión total: ${totalCommissionAmount} (${((totalCommissionAmount / parseFloat(invoice.total_amount)) * 100).toFixed(2)}%)`);
      console.log(`   - Vendedores beneficiados: ${this.countBeneficiaries(commissionBreakdown)}`);

      return liquidation;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [COMMISSION] Error al liquidar comisiones:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CALCULATE COMMISSION BREAKDOWN - 2 NIVELES
   * ============================================
   * Calcula comisiones de 2 niveles (vendedor directo + gerente general)
   *
   * NIVEL 1 - Vendedor directo:
   *   - Comisión por venta inicial: 15% (DIRECT_SALES)
   *   - Comisión por soporte mensual: 5% (SUPPORT_MONTHLY)
   *
   * NIVEL 2 - Gerente general:
   *   - Comisión override sobre ventas del equipo: 3% (MANAGER_OVERRIDE)
   */
  async calculateCommissionBreakdown(invoice, contract, vendorId, transaction) {
    try {
      const invoiceAmount = parseFloat(invoice.total_amount);
      const isInitialSale = invoice.invoice_type === 'INITIAL' || invoice.billing_period_month === null;

      // Obtener datos del vendedor
      const { AponntStaff } = require('../config/database');
      const vendor = await AponntStaff.findByPk(vendorId, { transaction });
      if (!vendor) {
        throw new Error(`Vendedor ${vendorId} no encontrado`);
      }

      const breakdown = {
        direct_vendor: {
          vendor_id: vendorId,
          vendor_name: `${vendor.first_name} ${vendor.last_name}`,
          commission_type: isInitialSale ? 'DIRECT_SALES' : 'SUPPORT_MONTHLY',
          percentage: isInitialSale ?
            parseFloat(contract.seller_sale_commission_percentage || 15.00) :
            parseFloat(contract.seller_support_commission_percentage || 5.00),
          commissionable_amount: invoiceAmount,
          commission_amount: 0
        },
        manager_commissions: []
      };

      // Calcular comisión vendedor directo
      breakdown.direct_vendor.commission_amount = (
        (invoiceAmount * breakdown.direct_vendor.percentage) / 100
      ).toFixed(2);

      // NIVEL 2: Gerente general (si existe)
      if (vendor.manager_id) {
        const manager = await AponntStaff.findByPk(vendor.manager_id, { transaction });

        if (manager) {
          const managerPercentage = 3.00; // Override fijo del gerente
          const managerCommission = {
            vendor_id: manager.staff_id,
            vendor_name: `${manager.first_name} ${manager.last_name}`,
            commission_type: 'MANAGER_OVERRIDE',
            percentage: managerPercentage,
            commissionable_amount: invoiceAmount,
            commission_amount: ((invoiceAmount * managerPercentage) / 100).toFixed(2),
            team_member: vendor.staff_id
          };

          breakdown.manager_commissions.push(managerCommission);

          console.log(`   → Gerente: ${manager.first_name} ${manager.last_name} - ${managerPercentage}% override`);
        }
      }

      console.log(`💰 [COMMISSION] Breakdown calculado:`);
      console.log(`   → Vendedor: ${breakdown.direct_vendor.vendor_name} - ${breakdown.direct_vendor.percentage}% (${breakdown.direct_vendor.commission_type})`);
      console.log(`   → Total beneficiarios: ${1 + breakdown.manager_commissions.length}`);

      return breakdown;

    } catch (error) {
      console.error('❌ [COMMISSION] Error al calcular breakdown:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * APPROVE - Aprobar liquidación
   * ============================================
   */
  async approve(liquidationId, approvedByUserId) {
    const transaction = await sequelize.transaction();

    try {
      const liquidation = await CommissionLiquidation.findByPk(liquidationId, { transaction });
      if (!liquidation) {
        throw new Error(`Liquidation ID ${liquidationId} no encontrada`);
      }

      if (liquidation.status !== 'CALCULATED') {
        throw new Error(`Solo se pueden aprobar liquidaciones en estado CALCULATED. Estado: ${liquidation.status}`);
      }

      await liquidation.update({
        status: 'APPROVED',
        approved_by: approvedByUserId,
        approved_at: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [COMMISSION] Liquidación APROBADA: ${liquidation.liquidation_code}`);

      return liquidation;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [COMMISSION] Error al aprobar liquidación:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * REJECT - Rechazar liquidación
   * ============================================
   */
  async reject(liquidationId, rejectionReason, rejectedByUserId) {
    const transaction = await sequelize.transaction();

    try {
      const liquidation = await CommissionLiquidation.findByPk(liquidationId, { transaction });
      if (!liquidation) {
        throw new Error(`Liquidation ID ${liquidationId} no encontrada`);
      }

      await liquidation.update({
        status: 'REJECTED',
        rejection_reason: rejectionReason,
        approved_by: rejectedByUserId,
        approved_at: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`❌ [COMMISSION] Liquidación RECHAZADA: ${liquidation.liquidation_code} - ${rejectionReason}`);

      return liquidation;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [COMMISSION] Error al rechazar liquidación:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CREATE PAYMENTS - Crear pagos individuales
   * ============================================
   * Genera CommissionPayment por cada vendedor en el breakdown
   */
  async createPayments(liquidationId) {
    const transaction = await sequelize.transaction();

    try {
      const liquidation = await CommissionLiquidation.findByPk(liquidationId, { transaction });
      if (!liquidation) {
        throw new Error(`Liquidation ID ${liquidationId} no encontrada`);
      }

      if (liquidation.status !== 'APPROVED') {
        throw new Error(`Solo se pueden crear pagos de liquidaciones aprobadas. Estado: ${liquidation.status}`);
      }

      const breakdown = liquidation.commission_breakdown;
      const payments = [];

      // 1. Pago al vendedor directo
      if (breakdown.direct_vendor) {
        const payment = await this.createSinglePayment({
          liquidation_id: liquidation.id,
          vendor_id: breakdown.direct_vendor.vendor_id,
          company_id: liquidation.company_id,
          commission_amount: breakdown.direct_vendor.commission_amount,
          commission_type: breakdown.direct_vendor.commission_type,
          commission_percentage: breakdown.direct_vendor.percentage
        }, transaction);
        payments.push(payment);
      }

      // 2. Pagos al gerente general (si existe)
      for (const managerComm of breakdown.manager_commissions || []) {
        const payment = await this.createSinglePayment({
          liquidation_id: liquidation.id,
          vendor_id: managerComm.vendor_id,
          company_id: liquidation.company_id,
          commission_amount: managerComm.commission_amount,
          commission_type: managerComm.commission_type,
          commission_percentage: managerComm.percentage
        }, transaction);
        payments.push(payment);
      }

      // 3. Actualizar estado de liquidación
      await liquidation.update({
        status: 'PAYMENT_PENDING',
        payment_scheduled_date: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [COMMISSION] Pagos creados: ${payments.length} para liquidación ${liquidation.liquidation_code}`);

      return payments;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [COMMISSION] Error al crear pagos:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CREATE SINGLE PAYMENT - Helper
   * ============================================
   */
  async createSinglePayment(paymentData, transaction) {
    try {
      const paymentCode = await this.generatePaymentCode(transaction);

      // TODO: Obtener datos bancarios del vendedor desde aponnt_staff

      const payment = await CommissionPayment.create({
        id: uuidv4(),
        trace_id: `PAYMENT-${uuidv4()}`,
        liquidation_id: paymentData.liquidation_id,
        vendor_id: paymentData.vendor_id,
        company_id: paymentData.company_id,
        payment_code: paymentCode,
        payment_date: new Date(),
        commission_amount: paymentData.commission_amount,
        tax_withholding: 0.00, // TODO: Calcular retenciones si aplica
        net_amount: paymentData.commission_amount,
        commission_type: paymentData.commission_type,
        commission_percentage: paymentData.commission_percentage,
        payment_method: 'TRANSFERENCIA',
        status: 'PENDING',
        scheduled_date: new Date(),
        retry_count: 0,
        reconciled: false,
        notification_sent: false,
        created_by: null
      }, { transaction });

      return payment;

    } catch (error) {
      console.error('❌ [COMMISSION] Error al crear pago individual:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * EXECUTE PAYMENT - Ejecutar pago
   * ============================================
   */
  async executePayment(paymentId, executionData = {}) {
    const transaction = await sequelize.transaction();

    try {
      const payment = await CommissionPayment.findByPk(paymentId, { transaction });
      if (!payment) {
        throw new Error(`Payment ID ${paymentId} no encontrado`);
      }

      if (!['PENDING', 'SCHEDULED'].includes(payment.status)) {
        throw new Error(`Solo se pueden ejecutar pagos PENDING/SCHEDULED. Estado: ${payment.status}`);
      }

      await payment.update({
        status: 'COMPLETED',
        executed_date: new Date(),
        confirmation_code: executionData.confirmation_code || `CONF-${Date.now()}`,
        transaction_id: executionData.transaction_id || null,
        notes: (payment.notes || '') + `\n✅ Pago ejecutado: ${JSON.stringify(executionData, null, 2)}`
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [COMMISSION] Pago EJECUTADO: ${payment.payment_code}`);

      // TODO: Enviar notificación al vendedor

      return payment;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [COMMISSION] Error al ejecutar pago:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * RECONCILE PAYMENT - Reconciliar con banco
   * ============================================
   */
  async reconcilePayment(paymentId, reconciledByUserId, reconciledData = {}) {
    const transaction = await sequelize.transaction();

    try {
      const payment = await CommissionPayment.findByPk(paymentId, { transaction });
      if (!payment) {
        throw new Error(`Payment ID ${paymentId} no encontrado`);
      }

      if (payment.status !== 'COMPLETED') {
        throw new Error(`Solo se pueden reconciliar pagos completados. Estado: ${payment.status}`);
      }

      await payment.update({
        reconciled: true,
        reconciled_at: new Date(),
        reconciled_by: reconciledByUserId,
        notes: (payment.notes || '') + `\n🔄 Reconciliado: ${JSON.stringify(reconciledData, null, 2)}`
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [COMMISSION] Pago RECONCILIADO: ${payment.payment_code}`);

      return payment;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [COMMISSION] Error al reconciliar pago:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET VENDOR STATS - Estadísticas por vendedor
   * ============================================
   */
  async getVendorStats(vendorId, options = {}) {
    try {
      const where = { vendor_id: vendorId };

      if (options.from_date) {
        where.payment_date = {
          [sequelize.Sequelize.Op.gte]: options.from_date
        };
      }

      const payments = await CommissionPayment.findAll({ where });

      const stats = {
        total_payments: payments.length,
        total_commission: 0,
        total_net_amount: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        by_commission_type: {}
      };

      payments.forEach(payment => {
        stats.total_commission += parseFloat(payment.commission_amount || 0);
        stats.total_net_amount += parseFloat(payment.net_amount || 0);

        if (payment.status === 'PENDING' || payment.status === 'SCHEDULED') stats.pending++;
        if (payment.status === 'COMPLETED') stats.completed++;
        if (payment.status === 'FAILED') stats.failed++;

        const type = payment.commission_type;
        if (!stats.by_commission_type[type]) {
          stats.by_commission_type[type] = { count: 0, amount: 0 };
        }
        stats.by_commission_type[type].count++;
        stats.by_commission_type[type].amount += parseFloat(payment.commission_amount || 0);
      });

      stats.total_commission = stats.total_commission.toFixed(2);
      stats.total_net_amount = stats.total_net_amount.toFixed(2);

      return stats;

    } catch (error) {
      console.error('❌ [COMMISSION] Error al obtener stats de vendedor:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET STATS - Estadísticas generales
   * ============================================
   */
  async getStats(filters = {}) {
    try {
      const where = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.liquidation_type) {
        where.liquidation_type = filters.liquidation_type;
      }

      const [total, calculated, approved, rejected, paymentPending, paid] = await Promise.all([
        CommissionLiquidation.count({ where }),
        CommissionLiquidation.count({ where: { ...where, status: 'CALCULATED' } }),
        CommissionLiquidation.count({ where: { ...where, status: 'APPROVED' } }),
        CommissionLiquidation.count({ where: { ...where, status: 'REJECTED' } }),
        CommissionLiquidation.count({ where: { ...where, status: 'PAYMENT_PENDING' } }),
        CommissionLiquidation.count({ where: { ...where, status: 'PAID' } })
      ]);

      const allLiquidations = await CommissionLiquidation.findAll({ where });
      const totalCommissions = allLiquidations.reduce(
        (sum, liq) => sum + parseFloat(liq.total_commission_amount || 0),
        0
      );

      return {
        total,
        calculated,
        approved,
        rejected,
        payment_pending: paymentPending,
        paid,
        total_commissions: totalCommissions.toFixed(2)
      };

    } catch (error) {
      console.error('❌ [COMMISSION] Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * HELPERS
   * ============================================
   */

  /**
   * Generar liquidation_code: LIQ-YYYY-MM-NNNN
   */
  async generateLiquidationCode(transaction) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `LIQ-${year}-${month}-`;

      const lastLiquidation = await CommissionLiquidation.findOne({
        where: {
          liquidation_code: {
            [sequelize.Sequelize.Op.like]: `${prefix}%`
          }
        },
        order: [['created_at', 'DESC']],
        transaction
      });

      let nextNumber = 1;
      if (lastLiquidation) {
        const match = lastLiquidation.liquidation_code.match(/LIQ-\d{4}-\d{2}-(\d{4})/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;

    } catch (error) {
      console.error('❌ [COMMISSION] Error al generar liquidation_code:', error);
      throw error;
    }
  }

  /**
   * Generar payment_code: PAY-YYYY-MM-NNNN
   */
  async generatePaymentCode(transaction) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `PAY-${year}-${month}-`;

      const lastPayment = await CommissionPayment.findOne({
        where: {
          payment_code: {
            [sequelize.Sequelize.Op.like]: `${prefix}%`
          }
        },
        order: [['created_at', 'DESC']],
        transaction
      });

      let nextNumber = 1;
      if (lastPayment) {
        const match = lastPayment.payment_code.match(/PAY-\d{4}-\d{2}-(\d{4})/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;

    } catch (error) {
      console.error('❌ [COMMISSION] Error al generar payment_code:', error);
      throw error;
    }
  }

  /**
   * Sumar todas las comisiones del breakdown
   */
  sumCommissionBreakdown(breakdown) {
    let total = parseFloat(breakdown.direct_vendor?.commission_amount || 0);

    // Sumar comisiones del gerente general (si existe)
    if (breakdown.manager_commissions) {
      breakdown.manager_commissions.forEach(comm => {
        total += parseFloat(comm.commission_amount || 0);
      });
    }

    return total.toFixed(2);
  }

  /**
   * Contar vendedores beneficiarios (máximo 2: vendedor + gerente)
   */
  countBeneficiaries(breakdown) {
    let count = breakdown.direct_vendor ? 1 : 0;
    count += breakdown.manager_commissions?.length || 0;
    return count; // Máximo 2 (vendedor + gerente)
  }

}

module.exports = new CommissionService();
