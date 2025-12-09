/**
 * BUDGET SERVICE
 *
 * Gestión completa de presupuestos en el workflow de Alta de Empresa.
 * Implementa FASE 1: PRESUPUESTO del circuito comercial.
 *
 * RESPONSABILIDADES:
 * - Creación de presupuestos con budget_code autogenerado (PPTO-YYYY-NNNN)
 * - Gestión de estados (PENDING, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, MODIFIED)
 * - Tracking de eventos (sent_at, viewed_at, accepted_at, rejected_at)
 * - Solicitudes de modificación del cliente
 * - Expiración automática de presupuestos vencidos
 * - Generación de PDF (futuro)
 * - Cálculo de pricing con descuentos
 *
 * TRACE ID: ONBOARDING-{UUID}
 *
 * INTEGRACIÓN:
 * - Usado por: OnboardingService (orchestrator)
 * - Usa: Budget model, Company model
 * - Notifica: NotificationExternalService
 */

const { v4: uuidv4 } = require('uuid');
const { Budget, Company, sequelize } = require('../config/database');

class BudgetService {

  /**
   * ============================================
   * CREATE - Crear nuevo presupuesto
   * ============================================
   */
  async create(budgetData) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Generar budget_code autogenerado
      const budget_code = await this.generateBudgetCode();

      // 2. Calcular totales con descuentos
      const pricing = this.calculatePricing(budgetData);

      // 3. Crear presupuesto
      const budget = await Budget.create({
        id: uuidv4(),
        trace_id: budgetData.trace_id,
        company_id: budgetData.company_id,
        vendor_id: budgetData.vendor_id,
        budget_code: budget_code,
        selected_modules: budgetData.selected_modules || [],
        contracted_employees: budgetData.contracted_employees,
        total_monthly: pricing.monthly,
        total_annual: pricing.annual,
        discount_percentage: budgetData.discount_percentage || 0.00,
        discount_reason: budgetData.discount_reason || null,
        payment_terms: budgetData.payment_terms || 'MENSUAL',
        currency: budgetData.currency || 'USD',
        status: 'PENDING',
        valid_until: budgetData.valid_until || this.getDefaultValidUntil(),
        notes: budgetData.notes || null,
        created_by: budgetData.vendor_id
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [BUDGET] Presupuesto creado: ${budget_code} (Trace: ${budgetData.trace_id})`);

      return budget;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [BUDGET] Error al crear presupuesto:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * SEND - Marcar presupuesto como enviado
   * ============================================
   */
  async markAsSent(budgetId) {
    try {
      const budget = await Budget.findByPk(budgetId);
      if (!budget) {
        throw new Error(`Budget ID ${budgetId} no encontrado`);
      }

      await budget.update({
        status: 'SENT',
        sent_at: new Date()
      });

      console.log(`📤 [BUDGET] Presupuesto enviado: ${budget.budget_code}`);

      return budget;

    } catch (error) {
      console.error('❌ [BUDGET] Error al marcar como enviado:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * VIEW - Marcar presupuesto como visto
   * ============================================
   */
  async markAsViewed(budgetId) {
    try {
      const budget = await Budget.findByPk(budgetId);
      if (!budget) {
        throw new Error(`Budget ID ${budgetId} no encontrado`);
      }

      // Solo marcar si no fue visto antes
      if (!budget.viewed_at) {
        await budget.update({
          status: 'VIEWED',
          viewed_at: new Date()
        });

        console.log(`👀 [BUDGET] Presupuesto visto: ${budget.budget_code}`);
      }

      return budget;

    } catch (error) {
      console.error('❌ [BUDGET] Error al marcar como visto:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * ACCEPT - Cliente acepta presupuesto
   * ============================================
   */
  async accept(budgetId, acceptanceData = {}) {
    const transaction = await sequelize.transaction();

    try {
      const budget = await Budget.findByPk(budgetId, { transaction });
      if (!budget) {
        throw new Error(`Budget ID ${budgetId} no encontrado`);
      }

      // Validar que no esté expirado
      if (new Date() > new Date(budget.valid_until)) {
        throw new Error(`Presupuesto ${budget.budget_code} expirado. Válido hasta: ${budget.valid_until}`);
      }

      // Validar estado actual
      if (!['PENDING', 'SENT', 'VIEWED', 'MODIFIED'].includes(budget.status)) {
        throw new Error(`No se puede aceptar presupuesto en estado: ${budget.status}`);
      }

      await budget.update({
        status: 'ACCEPTED',
        accepted_at: new Date(),
        responded_at: new Date(),
        notes: acceptanceData.notes || budget.notes
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [BUDGET] Presupuesto ACEPTADO: ${budget.budget_code}`);

      return budget;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [BUDGET] Error al aceptar presupuesto:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * REJECT - Cliente rechaza presupuesto
   * ============================================
   */
  async reject(budgetId, rejectionData) {
    const transaction = await sequelize.transaction();

    try {
      const budget = await Budget.findByPk(budgetId, { transaction });
      if (!budget) {
        throw new Error(`Budget ID ${budgetId} no encontrado`);
      }

      await budget.update({
        status: 'REJECTED',
        rejected_at: new Date(),
        responded_at: new Date(),
        rejection_reason: rejectionData.reason || 'No especificado'
      }, { transaction });

      await transaction.commit();

      console.log(`❌ [BUDGET] Presupuesto RECHAZADO: ${budget.budget_code} - Razón: ${rejectionData.reason}`);

      return budget;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [BUDGET] Error al rechazar presupuesto:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * REQUEST MODIFICATION - Cliente solicita cambios
   * ============================================
   */
  async requestModification(budgetId, modificationRequest) {
    const transaction = await sequelize.transaction();

    try {
      const budget = await Budget.findByPk(budgetId, { transaction });
      if (!budget) {
        throw new Error(`Budget ID ${budgetId} no encontrado`);
      }

      // Agregar solicitud al historial
      const modifications = budget.modification_requests || [];
      modifications.push({
        requested_at: new Date(),
        requested_by: modificationRequest.requested_by,
        changes: modificationRequest.changes,
        reason: modificationRequest.reason
      });

      await budget.update({
        status: 'MODIFIED',
        modification_requests: modifications,
        responded_at: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`🔄 [BUDGET] Solicitud de modificación: ${budget.budget_code}`);

      return budget;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [BUDGET] Error al solicitar modificación:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * EXPIRE OLD BUDGETS - Expirar presupuestos vencidos
   * ============================================
   * Cron job automático: Se ejecuta diariamente
   */
  async expireOldBudgets() {
    try {
      const result = await Budget.update(
        {
          status: 'EXPIRED'
        },
        {
          where: {
            status: ['PENDING', 'SENT', 'VIEWED', 'MODIFIED'],
            valid_until: {
              [sequelize.Sequelize.Op.lt]: new Date()
            }
          }
        }
      );

      const expiredCount = result[0];
      console.log(`⏰ [BUDGET] Presupuestos expirados: ${expiredCount}`);

      return { expiredCount };

    } catch (error) {
      console.error('❌ [BUDGET] Error al expirar presupuestos:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * FIND BY ID
   * ============================================
   */
  async findById(budgetId, options = {}) {
    try {
      const budget = await Budget.findByPk(budgetId, {
        include: options.include || []
      });

      if (!budget) {
        throw new Error(`Budget ID ${budgetId} no encontrado`);
      }

      return budget;

    } catch (error) {
      console.error('❌ [BUDGET] Error al buscar presupuesto por ID:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * FIND BY TRACE ID
   * ============================================
   */
  async findByTraceId(traceId) {
    try {
      const budget = await Budget.findOne({
        where: { trace_id: traceId }
      });

      if (!budget) {
        throw new Error(`Budget con trace_id ${traceId} no encontrado`);
      }

      return budget;

    } catch (error) {
      console.error('❌ [BUDGET] Error al buscar presupuesto por trace_id:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * FIND BY COMPANY
   * ============================================
   */
  async findByCompany(companyId, options = {}) {
    try {
      const budgets = await Budget.findAll({
        where: { company_id: companyId },
        order: [['created_at', 'DESC']],
        limit: options.limit || 50
      });

      return budgets;

    } catch (error) {
      console.error('❌ [BUDGET] Error al buscar presupuestos por empresa:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * LIST ALL - Listar todos los presupuestos
   * ============================================
   */
  async listAll(filters = {}) {
    try {
      const where = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.vendor_id) {
        where.vendor_id = filters.vendor_id;
      }

      if (filters.from_date) {
        where.created_at = {
          [sequelize.Sequelize.Op.gte]: new Date(filters.from_date)
        };
      }

      const budgets = await Budget.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: filters.limit || 100
      });

      return budgets;

    } catch (error) {
      console.error('❌ [BUDGET] Error al listar presupuestos:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET STATS - Estadísticas de presupuestos
   * ============================================
   */
  async getStats(vendorId = null) {
    try {
      const where = vendorId ? { vendor_id: vendorId } : {};

      const [total, pending, sent, viewed, accepted, rejected, expired, modified] = await Promise.all([
        Budget.count({ where }),
        Budget.count({ where: { ...where, status: 'PENDING' } }),
        Budget.count({ where: { ...where, status: 'SENT' } }),
        Budget.count({ where: { ...where, status: 'VIEWED' } }),
        Budget.count({ where: { ...where, status: 'ACCEPTED' } }),
        Budget.count({ where: { ...where, status: 'REJECTED' } }),
        Budget.count({ where: { ...where, status: 'EXPIRED' } }),
        Budget.count({ where: { ...where, status: 'MODIFIED' } })
      ]);

      const conversionRate = total > 0 ? ((accepted / total) * 100).toFixed(2) : 0;

      return {
        total,
        pending,
        sent,
        viewed,
        accepted,
        rejected,
        expired,
        modified,
        conversionRate: parseFloat(conversionRate)
      };

    } catch (error) {
      console.error('❌ [BUDGET] Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GENERATE BUDGET CODE - PPTO-YYYY-NNNN
   * ============================================
   */
  async generateBudgetCode() {
    try {
      const year = new Date().getFullYear();
      const prefix = `PPTO-${year}-`;

      // Buscar último presupuesto del año
      const lastBudget = await Budget.findOne({
        where: {
          budget_code: {
            [sequelize.Sequelize.Op.like]: `${prefix}%`
          }
        },
        order: [['created_at', 'DESC']]
      });

      let nextNumber = 1;
      if (lastBudget) {
        const lastNumber = parseInt(lastBudget.budget_code.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      const budgetCode = `${prefix}${String(nextNumber).padStart(4, '0')}`;

      return budgetCode;

    } catch (error) {
      console.error('❌ [BUDGET] Error al generar budget_code:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CALCULATE PRICING - Con descuentos
   * ============================================
   */
  calculatePricing(budgetData) {
    try {
      const monthlyBase = parseFloat(budgetData.total_monthly || 0);
      const discountPercentage = parseFloat(budgetData.discount_percentage || 0);

      const discountAmount = (monthlyBase * discountPercentage) / 100;
      const monthlyFinal = monthlyBase - discountAmount;
      const annualFinal = monthlyFinal * 12;

      return {
        monthly: monthlyFinal.toFixed(2),
        annual: annualFinal.toFixed(2),
        discountAmount: discountAmount.toFixed(2)
      };

    } catch (error) {
      console.error('❌ [BUDGET] Error al calcular pricing:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET DEFAULT VALID UNTIL - 30 días desde hoy
   * ============================================
   */
  getDefaultValidUntil() {
    const today = new Date();
    const validUntil = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    return validUntil.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * ============================================
   * GENERATE PDF - Generar PDF del presupuesto
   * ============================================
   * FUTURO: Implementar con PDFKit o similar
   */
  async generatePDF(budgetId) {
    try {
      const budget = await this.findById(budgetId);

      // TODO: Implementar generación de PDF
      console.log(`📄 [BUDGET] PDF pendiente de implementar para: ${budget.budget_code}`);

      return {
        success: false,
        message: 'Generación de PDF pendiente de implementar',
        budget_code: budget.budget_code
      };

    } catch (error) {
      console.error('❌ [BUDGET] Error al generar PDF:', error);
      throw error;
    }
  }

}

module.exports = new BudgetService();
