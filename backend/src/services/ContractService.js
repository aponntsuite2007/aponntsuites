/**
 * CONTRACT SERVICE
 *
 * Gestión completa de contratos digitales (EULA) en el workflow de Alta de Empresa.
 * Implementa FASE 2: CONTRATO DIGITAL del circuito comercial.
 *
 * RESPONSABILIDADES:
 * - Generación de contratos a partir de presupuestos aceptados
 * - Gestión de firma digital (EULA) con captura de IP y user agent
 * - Modificación de contratos (upgrade/downgrade de módulos)
 * - Suspensión por falta de pago
 * - Reactivación tras pago
 * - Terminación y cancelación
 * - Generación de PDF del contrato
 * - Renovación automática
 *
 * TRACE ID: ONBOARDING-{UUID}
 *
 * INTEGRACIÓN:
 * - Usado por: OnboardingService (orchestrator)
 * - Usa: Contract model, Budget model, Company model
 * - Notifica: NotificationExternalService
 *
 * ⚠️ NOTA: El modelo Contract actual tiene inconsistencias:
 * - Usa 'quote_id' pero el workflow usa 'budgets' table
 * - Falta campos: signed_ip, signed_user_agent, status (PENDING_SIGNATURE, SIGNED)
 * - Usar 'seller_id' pero workflow usa 'vendor_id' (aponnt_staff)
 *
 * TODO: Alinear modelo Contract con el workflow actual
 */

const { v4: uuidv4 } = require('uuid');
const { Contract, Budget, Company, sequelize } = require('../config/database');

class ContractService {

  /**
   * ============================================
   * GENERATE - Generar contrato desde presupuesto aceptado
   * ============================================
   */
  async generate(contractData) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Validar que el presupuesto exista y esté aceptado
      const budget = await Budget.findByPk(contractData.budget_id, { transaction });
      if (!budget) {
        throw new Error(`Budget ID ${contractData.budget_id} no encontrado`);
      }

      if (budget.status !== 'ACCEPTED') {
        throw new Error(`Budget debe estar ACEPTADO para generar contrato. Estado actual: ${budget.status}`);
      }

      // 2. Validar que la empresa exista
      const company = await Company.findByPk(budget.company_id, { transaction });
      if (!company) {
        throw new Error(`Company ID ${budget.company_id} no encontrada`);
      }

      // 3. Verificar que no exista contrato activo para esta empresa
      const existingContract = await Contract.findOne({
        where: {
          company_id: budget.company_id,
          status: 'active'
        },
        transaction
      });

      if (existingContract) {
        throw new Error(`La empresa ${company.name} ya tiene un contrato activo: ${existingContract.contract_number}`);
      }

      // 4. Auto-generar contract_number (se genera en hook beforeCreate)
      // 5. Crear contrato
      const contract = await Contract.create({
        company_id: budget.company_id,
        quote_id: contractData.budget_id, // ⚠️ quote_id apunta a budgets table
        seller_id: budget.vendor_id, // ⚠️ seller_id es vendor_id (aponnt_staff)
        support_partner_id: contractData.support_partner_id || budget.vendor_id, // Default: mismo vendedor
        modules_data: this.buildModulesData(budget.selected_modules, budget),
        monthly_total: budget.total_monthly,
        start_date: contractData.start_date || new Date(),
        end_date: contractData.end_date || null, // null = indefinido
        status: contractData.status || 'active', // ⚠️ workflow espera 'PENDING_SIGNATURE'
        billing_cycle: budget.payment_terms === 'ANUAL' ? 'yearly' : 'monthly',
        payment_day: contractData.payment_day || 10,
        payment_terms_days: contractData.payment_terms_days || 10,
        seller_commission_percentage: contractData.seller_commission_percentage || 10.00,
        seller_sale_commission_percentage: contractData.seller_sale_commission_percentage || 15.00,
        seller_support_commission_percentage: contractData.seller_support_commission_percentage || 5.00,
        support_commission_percentage: contractData.support_commission_percentage || 0.00,
        terms_and_conditions: this.getDefaultTermsAndConditions(),
        sla_terms: this.getDefaultSLATerms(),
        created_by: budget.vendor_id,
        notes: `Contrato generado desde presupuesto ${budget.budget_code} (Trace: ${contractData.trace_id})`
      }, { transaction });

      // 6. Actualizar presupuesto para marcar que ya tiene contrato
      await budget.update({
        notes: (budget.notes || '') + `\n✅ Contrato generado: ${contract.contract_number}`
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [CONTRACT] Contrato generado: ${contract.contract_number} (Trace: ${contractData.trace_id})`);

      return contract;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [CONTRACT] Error al generar contrato:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * SIGN - Cliente firma el contrato (EULA digital)
   * ============================================
   * ⚠️ NOTA: Modelo actual no tiene signed_ip ni signed_user_agent
   * Se usan client_signature_date y notes como workaround
   */
  async sign(contractId, signatureData) {
    const transaction = await sequelize.transaction();

    try {
      const contract = await Contract.findByPk(contractId, { transaction });
      if (!contract) {
        throw new Error(`Contract ID ${contractId} no encontrado`);
      }

      // Validar que no esté ya firmado
      if (contract.client_signature_date) {
        throw new Error(`Contrato ${contract.contract_number} ya fue firmado el ${contract.client_signature_date}`);
      }

      // Registrar firma digital con metadata
      const signatureMetadata = {
        signed_at: new Date(),
        signed_ip: signatureData.signed_ip || 'N/A',
        signed_user_agent: signatureData.signed_user_agent || 'N/A',
        signed_by_user_id: signatureData.signed_by_user_id || null,
        signature_method: 'EULA_DIGITAL'
      };

      await contract.update({
        client_signature_date: signatureMetadata.signed_at,
        status: 'active', // ⚠️ Workflow espera 'SIGNED', pero modelo tiene active/suspended/terminated
        notes: (contract.notes || '') +
          `\n📝 Firmado digitalmente: ${JSON.stringify(signatureMetadata, null, 2)}`
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [CONTRACT] Contrato FIRMADO: ${contract.contract_number}`);

      return contract;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [CONTRACT] Error al firmar contrato:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * UPDATE MODULES - Modificar módulos contratados
   * ============================================
   * Usado en workflow: Modificación de Contrato (Cliente Agrega/Quita Módulos)
   */
  async updateModules(contractId, newModulesData, modificationMetadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      const contract = await Contract.findByPk(contractId, { transaction });
      if (!contract) {
        throw new Error(`Contract ID ${contractId} no encontrado`);
      }

      // Guardar módulos anteriores para historial
      const oldModulesData = contract.modules_data;
      const oldMonthlyTotal = contract.monthly_total;

      // Actualizar módulos usando método del modelo
      await contract.updateModules(newModulesData);

      // Registrar en notas la modificación
      const modificationRecord = {
        modified_at: new Date(),
        modified_by: modificationMetadata.modified_by || 'Sistema',
        reason: modificationMetadata.reason || 'Cliente solicitó cambios',
        old_modules: oldModulesData,
        new_modules: newModulesData,
        old_monthly_total: oldMonthlyTotal,
        new_monthly_total: contract.monthly_total
      };

      contract.notes = (contract.notes || '') +
        `\n🔄 Modificación de módulos: ${JSON.stringify(modificationRecord, null, 2)}`;

      await contract.save({ transaction });

      await transaction.commit();

      console.log(`✅ [CONTRACT] Módulos actualizados: ${contract.contract_number}`);
      console.log(`   - Old total: ${oldMonthlyTotal} → New total: ${contract.monthly_total}`);

      return contract;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [CONTRACT] Error al actualizar módulos:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * SUSPEND - Suspender contrato por falta de pago
   * ============================================
   */
  async suspend(contractId, suspensionReason = 'Falta de pago') {
    try {
      const contract = await Contract.findByPk(contractId);
      if (!contract) {
        throw new Error(`Contract ID ${contractId} no encontrado`);
      }

      await contract.suspend(suspensionReason);

      console.log(`⚠️ [CONTRACT] Contrato SUSPENDIDO: ${contract.contract_number} - Razón: ${suspensionReason}`);

      return contract;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al suspender contrato:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * REACTIVATE - Reactivar contrato suspendido
   * ============================================
   */
  async reactivate(contractId, reactivationNotes = 'Pago recibido') {
    try {
      const contract = await Contract.findByPk(contractId);
      if (!contract) {
        throw new Error(`Contract ID ${contractId} no encontrado`);
      }

      if (contract.status !== 'suspended') {
        throw new Error(`Solo se pueden reactivar contratos suspendidos. Estado actual: ${contract.status}`);
      }

      await contract.reactivate(reactivationNotes);

      console.log(`✅ [CONTRACT] Contrato REACTIVADO: ${contract.contract_number}`);

      return contract;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al reactivar contrato:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * TERMINATE - Terminar contrato
   * ============================================
   */
  async terminate(contractId, terminationReason = 'Fin de vigencia') {
    try {
      const contract = await Contract.findByPk(contractId);
      if (!contract) {
        throw new Error(`Contract ID ${contractId} no encontrado`);
      }

      await contract.terminate(terminationReason);

      console.log(`🔚 [CONTRACT] Contrato TERMINADO: ${contract.contract_number} - Razón: ${terminationReason}`);

      return contract;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al terminar contrato:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CANCEL - Cancelar contrato
   * ============================================
   */
  async cancel(contractId, cancellationReason = 'Cliente solicitó cancelación') {
    try {
      const contract = await Contract.findByPk(contractId);
      if (!contract) {
        throw new Error(`Contract ID ${contractId} no encontrado`);
      }

      await contract.cancel(cancellationReason);

      console.log(`❌ [CONTRACT] Contrato CANCELADO: ${contract.contract_number} - Razón: ${cancellationReason}`);

      return contract;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al cancelar contrato:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * FIND BY ID
   * ============================================
   */
  async findById(contractId, options = {}) {
    try {
      const contract = await Contract.findByPk(contractId, {
        include: options.include || []
      });

      if (!contract) {
        throw new Error(`Contract ID ${contractId} no encontrado`);
      }

      return contract;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al buscar contrato por ID:', error);
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
      const contracts = await Contract.getCompanyHistory(companyId, {
        limit: options.limit || 50
      });

      return contracts;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al buscar contratos por empresa:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET ACTIVE CONTRACT
   * ============================================
   */
  async getActiveContract(companyId) {
    try {
      const contract = await Contract.getActiveContract(companyId);

      if (!contract) {
        throw new Error(`No hay contrato activo para company_id ${companyId}`);
      }

      return contract;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al obtener contrato activo:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CHECK EXPIRING CONTRACTS - Para cron job
   * ============================================
   * Busca contratos próximos a vencer y envía notificaciones
   */
  async checkExpiringContracts(daysThreshold = 30) {
    try {
      const expiringContracts = await Contract.getContractsEndingSoon(daysThreshold);

      console.log(`📅 [CONTRACT] Contratos próximos a vencer (${daysThreshold} días): ${expiringContracts.length}`);

      // TODO: Enviar notificaciones con NotificationExternalService

      return {
        count: expiringContracts.length,
        contracts: expiringContracts.map(c => c.toSummary())
      };

    } catch (error) {
      console.error('❌ [CONTRACT] Error al verificar contratos próximos a vencer:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CHECK OVERDUE CONTRACTS - Para cron job
   * ============================================
   * Suspende contratos con más de X días de atraso
   */
  async checkOverdueContracts() {
    try {
      // TODO: Integrar con InvoicingService para obtener facturas vencidas
      // Por ahora retorna placeholder

      console.log(`⏰ [CONTRACT] Check de contratos con facturas vencidas (placeholder)`);

      return {
        suspended: 0,
        terminated: 0
      };

    } catch (error) {
      console.error('❌ [CONTRACT] Error al verificar contratos vencidos:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET STATS - Estadísticas de contratos
   * ============================================
   */
  async getStats(options = {}) {
    try {
      const stats = await Contract.getGlobalStats();

      return stats;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET SELLER STATS - Estadísticas por vendedor
   * ============================================
   */
  async getSellerStats(sellerId, options = {}) {
    try {
      const stats = await Contract.getSellerStats(sellerId, options);

      return stats;

    } catch (error) {
      console.error('❌ [CONTRACT] Error al obtener estadísticas de vendedor:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * HELPERS - Funciones auxiliares
   * ============================================
   */

  /**
   * Construir modules_data desde selected_modules del presupuesto
   */
  buildModulesData(selectedModules, budget) {
    try {
      if (!Array.isArray(selectedModules)) {
        return [];
      }

      return selectedModules.map(moduleKey => {
        // TODO: Buscar precio real desde system_modules o usar pricing del presupuesto
        return {
          module_key: moduleKey,
          module_name: moduleKey.replace(/-/g, ' ').toUpperCase(),
          price: 0.00, // Placeholder
          quantity: 1
        };
      });

    } catch (error) {
      console.error('❌ [CONTRACT] Error al construir modules_data:', error);
      return [];
    }
  }

  /**
   * Términos y condiciones por defecto
   */
  getDefaultTermsAndConditions() {
    return `
TÉRMINOS Y CONDICIONES DE SERVICIO - APONNT

1. OBJETO DEL CONTRATO
   El presente contrato regula la prestación de servicios de software SaaS para gestión empresarial.

2. VIGENCIA
   El contrato tendrá vigencia indefinida hasta cancelación por cualquiera de las partes con 30 días de anticipación.

3. OBLIGACIONES DEL CLIENTE
   - Pago puntual de facturas mensuales
   - Uso adecuado de la plataforma
   - Custodia de credenciales de acceso

4. OBLIGACIONES DEL PROVEEDOR
   - Disponibilidad del servicio (SLA: 99.5%)
   - Soporte técnico durante horario laboral
   - Backup automático de datos

5. FACTURACIÓN Y PAGO
   - Facturación mensual adelantada
   - Vencimiento: día 10 de cada mes
   - Recargo por mora: 10% sobre saldo vencido
   - Suspensión del servicio: 20 días de atraso
   - Baja definitiva: 30 días de atraso

6. PROPIEDAD INTELECTUAL
   El software es propiedad exclusiva de Aponnt. El cliente adquiere solo una licencia de uso.

7. CONFIDENCIALIDAD
   Ambas partes se comprometen a mantener confidencialidad de la información sensible.

8. TERMINACIÓN
   Cualquiera de las partes puede terminar el contrato con 30 días de aviso previo.

9. JURISDICCIÓN
   Las partes se someten a los tribunales de [CIUDAD], [PAÍS].
    `.trim();
  }

  /**
   * SLA terms por defecto
   */
  getDefaultSLATerms() {
    return {
      uptime_percentage: 99.5,
      support_hours: 'Lunes a Viernes 9:00-18:00',
      response_time_hours: 24,
      critical_issue_response_hours: 4,
      backup_frequency: 'Diario',
      backup_retention_days: 30
    };
  }

  /**
   * ============================================
   * GENERATE PDF - Generar PDF del contrato
   * ============================================
   * FUTURO: Implementar con PDFKit o similar
   */
  async generatePDF(contractId) {
    try {
      const contract = await this.findById(contractId);

      // TODO: Implementar generación de PDF
      console.log(`📄 [CONTRACT] PDF pendiente de implementar para: ${contract.contract_number}`);

      return {
        success: false,
        message: 'Generación de PDF pendiente de implementar',
        contract_number: contract.contract_number
      };

    } catch (error) {
      console.error('❌ [CONTRACT] Error al generar PDF:', error);
      throw error;
    }
  }

}

module.exports = new ContractService();
