'use strict';

/**
 * ADAPTER: Nómina/Payroll → DMS
 *
 * Este adaptador maneja:
 * - Recibos de sueldo
 * - Comprobantes de bonificaciones
 * - Comprobantes de deducciones
 * - Liquidaciones finales
 */

class PayrollDMSAdapter {
  constructor(dmsIntegrationService) {
    this.dms = dmsIntegrationService;
    this.MODULE = 'payroll';
  }

  // ==========================================
  // RECIBOS DE SUELDO
  // ==========================================

  /**
   * Registrar recibo de sueldo
   */
  async registerPayslip(params) {
    const {
      payrollId,
      companyId,
      employeeId,
      createdById,
      file,
      period, // 'YYYY-MM'
      grossSalary,
      netSalary,
      paymentDate,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'payslip',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'payroll_record',
      sourceEntityId: payrollId,
      file,
      title: `Recibo de Sueldo - ${period}`,
      metadata: {
        ...metadata,
        period,
        grossSalary: '[CONFIDENTIAL]',
        netSalary: '[CONFIDENTIAL]',
        paymentDate,
        generatedAt: new Date().toISOString(),
        isConfidential: true
      }
    });
  }

  /**
   * Registrar recibos de sueldo en lote
   */
  async registerPayslipsBatch(params) {
    const {
      companyId,
      createdById,
      period,
      payslips // Array de { employeeId, payrollId, file, grossSalary, netSalary, paymentDate }
    } = params;

    const results = {
      success: [],
      failed: []
    };

    for (const payslip of payslips) {
      try {
        const result = await this.registerPayslip({
          payrollId: payslip.payrollId,
          companyId,
          employeeId: payslip.employeeId,
          createdById,
          file: payslip.file,
          period,
          grossSalary: payslip.grossSalary,
          netSalary: payslip.netSalary,
          paymentDate: payslip.paymentDate
        });
        results.success.push({
          employeeId: payslip.employeeId,
          documentId: result.document.id
        });
      } catch (error) {
        results.failed.push({
          employeeId: payslip.employeeId,
          error: error.message
        });
      }
    }

    return results;
  }

  // ==========================================
  // BONIFICACIONES
  // ==========================================

  /**
   * Registrar comprobante de bonificación
   */
  async registerBonus(params) {
    const {
      bonusId,
      companyId,
      employeeId,
      createdById,
      file,
      bonusType, // 'annual' | 'performance' | 'retention' | 'holiday'
      amount,
      period,
      reason,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'bonus',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'bonus_payment',
      sourceEntityId: bonusId,
      file,
      title: `Bonificación ${this._getBonusTypeName(bonusType)} - ${period}`,
      metadata: {
        ...metadata,
        bonusType,
        amount: '[CONFIDENTIAL]',
        period,
        reason,
        generatedAt: new Date().toISOString(),
        isConfidential: true
      }
    });
  }

  // ==========================================
  // DEDUCCIONES
  // ==========================================

  /**
   * Registrar comprobante de deducción
   */
  async registerDeduction(params) {
    const {
      deductionId,
      companyId,
      employeeId,
      createdById,
      file,
      deductionType, // 'loan' | 'advance' | 'benefit' | 'legal'
      amount,
      description,
      startDate,
      endDate,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'deduction',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'payroll_deduction',
      sourceEntityId: deductionId,
      file,
      title: `Deducción - ${this._getDeductionTypeName(deductionType)}`,
      metadata: {
        ...metadata,
        deductionType,
        amount: '[CONFIDENTIAL]',
        description,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        isConfidential: true
      }
    });
  }

  // ==========================================
  // LIQUIDACIONES
  // ==========================================

  /**
   * Registrar liquidación final
   */
  async registerSettlement(params) {
    const {
      settlementId,
      companyId,
      employeeId,
      createdById,
      file,
      terminationDate,
      terminationType, // 'resignation' | 'dismissal' | 'mutual' | 'contract_end'
      components, // { severance, vacationPay, proportionalBonus, etc. }
      totalAmount,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'settlement',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'final_settlement',
      sourceEntityId: settlementId,
      file,
      title: `Liquidación Final - ${terminationDate}`,
      metadata: {
        ...metadata,
        terminationDate,
        terminationType,
        components: Object.keys(components).reduce((acc, key) => {
          acc[key] = '[CONFIDENTIAL]';
          return acc;
        }, {}),
        totalAmount: '[CONFIDENTIAL]',
        generatedAt: new Date().toISOString(),
        isConfidential: true,
        isLegalDocument: true
      }
    });
  }

  // ==========================================
  // CONSULTAS
  // ==========================================

  /**
   * Obtener recibos de sueldo de un empleado
   */
  async getEmployeePayslips(companyId, employeeId, options = {}) {
    const docs = await this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.MODULE,
      documentType: options.documentType,
      status: 'active',
      limit: options.limit || 24 // Últimos 2 años por defecto
    });

    // Filtrar por tipo si se especifica
    if (options.documentType === 'payslip') {
      return docs.filter(d => d.type_code === 'PAYROLL_PAYSLIP');
    }

    return docs;
  }

  /**
   * Obtener recibos de un período específico
   */
  async getPayslipsByPeriod(companyId, period) {
    const { Document } = this.dms.models;
    const { Op } = require('sequelize');

    return Document.findAll({
      where: {
        company_id: companyId,
        source_module: this.MODULE,
        type_code: 'PAYROLL_PAYSLIP',
        is_deleted: false,
        'metadata.period': period
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Verificar si empleado tiene recibo del período actual
   */
  async hasCurrentPeriodPayslip(companyId, employeeId) {
    const currentPeriod = this._getCurrentPeriod();

    const docs = await this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.MODULE,
      documentType: 'payslip',
      status: 'active',
      limit: 1
    });

    const currentPayslip = docs.find(d => d.metadata?.period === currentPeriod);

    return {
      hasPayslip: !!currentPayslip,
      period: currentPeriod,
      documentId: currentPayslip?.id
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  _getBonusTypeName(type) {
    const names = {
      'annual': 'Anual',
      'performance': 'Por Desempeño',
      'retention': 'Retención',
      'holiday': 'Aguinaldo'
    };
    return names[type] || type;
  }

  _getDeductionTypeName(type) {
    const names = {
      'loan': 'Préstamo',
      'advance': 'Anticipo',
      'benefit': 'Beneficio',
      'legal': 'Legal'
    };
    return names[type] || type;
  }

  _getCurrentPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}

module.exports = PayrollDMSAdapter;
