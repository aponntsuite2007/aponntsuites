/**
 * COMPANY DATA PURGE SERVICE
 * Borrado en cascada de datos operacionales de una empresa.
 * Ejecuta en orden de dependencias FK (hijos antes que padres).
 * CONSERVA datos administrativos/financieros (facturas, contratos, pagos).
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Definición de las fases de borrado en orden de dependencias.
 * Cada fase contiene tablas que pueden borrarse una vez que las fases anteriores se completaron.
 */
const PURGE_PHASES = [
  {
    name: 'Fase 1: Datos biométricos y privacidad',
    tables: [
      { table: 'biometric_data', condition: 'user_id IN (SELECT user_id FROM users WHERE company_id = :companyId)' },
      { table: 'facial_biometric_data', fk: 'company_id' },
      { table: 'biometric_consents', fk: 'company_id' },
      { table: 'biometric_templates', fk: 'company_id' },
      { table: 'consent_audit_logs', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 2: Datos médicos',
    tables: [
      { table: 'user_medical_documents', fk: 'company_id' },
      { table: 'user_medical_exams', fk: 'company_id' },
      { table: 'user_medical_advanced', fk: 'company_id' },
      { table: 'medical_records', fk: 'company_id' },
      { table: 'user_allergies', fk: 'company_id' },
      { table: 'user_chronic_conditions', fk: 'company_id' },
      { table: 'user_vaccinations', fk: 'company_id' },
      { table: 'employee_medical_records', fk: 'company_id' },
      { table: 'medical_statistics', fk: 'company_id' },
      { table: 'medical_exam_templates', fk: 'company_id' },
      { table: 'medical_edit_authorizations', fk: 'company_id' },
      { table: 'art_configurations', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 3: Datos de empleados dependientes',
    tables: [
      { table: 'user_documents', fk: 'company_id' },
      { table: 'user_work_history', fk: 'company_id' },
      { table: 'user_education', fk: 'company_id' },
      { table: 'user_professional_licenses', fk: 'company_id' },
      { table: 'user_driver_licenses', fk: 'company_id' },
      { table: 'user_children', fk: 'company_id' },
      { table: 'user_family_members', fk: 'company_id' },
      { table: 'employee_dependency_documents', fk: 'company_id' },
      { table: 'user_shift_assignments', fk: 'company_id' },
      { table: 'user_salary_configs', fk: 'company_id' },
      { table: 'user_salary_advanced', fk: 'company_id' },
      { table: 'user_payroll_assignments', fk: 'company_id' },
      { table: 'user_payroll_bonuses', fk: 'company_id' },
      { table: 'user_work_restrictions', fk: 'company_id' },
      { table: 'user_activity_restrictions', fk: 'company_id' },
      { table: 'user_union_affiliations', fk: 'company_id' },
      { table: 'user_disciplinary_actions', fk: 'company_id' },
      { table: 'user_legal_issues', fk: 'company_id' },
      { table: 'user_assigned_tasks', fk: 'company_id' },
      { table: 'contract_onboardings', fk: 'company_id' },
      { table: 'dependency_evaluations', fk: 'company_id' },
      { table: 'legal_edit_authorizations', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 4: Asistencia y operaciones de tiempo',
    tables: [
      { table: 'attendance_analytics_caches', fk: 'company_id' },
      { table: 'attendance_patterns', fk: 'company_id' },
      { table: 'attendance_profiles', fk: 'company_id' },
      { table: 'attendance_batches', fk: 'company_id' },
      { table: 'attendances', fk: 'company_id' },
      { table: 'sanctions', fk: 'company_id' },
      { table: 'vacation_requests', fk: 'company_id' },
      { table: 'extraordinary_licenses', fk: 'company_id' },
      { table: 'access_notifications', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 5: Operaciones y experiencia',
    tables: [
      { table: 'visitors', fk: 'company_id' },
      { table: 'visitor_gps_trackings', fk: 'company_id' },
      { table: 'employee_locations', fk: 'company_id' },
      { table: 'experience_comments', fk: 'company_id' },
      { table: 'experience_recognitions', fk: 'company_id' },
      { table: 'employee_experiences', fk: 'company_id' },
      { table: 'experience_clusters', fk: 'company_id' },
      { table: 'emotional_analyses', fk: 'company_id' },
      { table: 'scoring_histories', fk: 'company_id' },
      { table: 'comparative_analytics', fk: 'company_id' },
      { table: 'process_chain_analytics', fk: 'company_id' },
      { table: 'support_tickets', fk: 'company_id' },
      { table: 'support_ticket_v2s', fk: 'company_id' },
      { table: 'support_activity_logs', fk: 'company_id' },
      { table: 'company_tasks', fk: 'company_id' },
      { table: 'administrative_tasks', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 6: Capacitación y documentos',
    tables: [
      { table: 'training_progresses', fk: 'company_id' },
      { table: 'training_assignments', fk: 'company_id' },
      { table: 'trainings', fk: 'company_id' },
      { table: 'document_access_logs', fk: 'company_id' },
      { table: 'document_alerts', fk: 'company_id' },
      { table: 'document_requests', fk: 'company_id' },
      { table: 'document_permissions', fk: 'company_id' },
      { table: 'document_metadata', fk: 'company_id' },
      { table: 'document_versions', fk: 'company_id' },
      { table: 'documents', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 7: EPP y seguridad laboral',
    tables: [
      { table: 'epp_deliveries', fk: 'company_id' },
      { table: 'epp_inspections', fk: 'company_id' },
      { table: 'epp_role_requirements', fk: 'company_id' },
      { table: 'epp_catalogs', fk: 'company_id' },
      { table: 'epp_categories', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 8: Payroll y compensaciones',
    tables: [
      { table: 'commission_payments', fk: 'company_id' },
      { table: 'commission_liquidations', fk: 'company_id' },
      { table: 'commissions', fk: 'company_id' },
      { table: 'payroll_runs', fk: 'company_id' },
      { table: 'payroll_templates', fk: 'company_id' },
      { table: 'payroll_entities', fk: 'company_id' },
      { table: 'payroll_concept_types', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 9: Finanzas operativas (caja, contabilidad interna)',
    tables: [
      { table: 'finance_authorization_logs', fk: 'company_id' },
      { table: 'finance_cash_adjustments', fk: 'company_id' },
      { table: 'finance_cash_counts', fk: 'company_id' },
      { table: 'finance_cash_transfers', fk: 'company_id' },
      { table: 'finance_cash_movements', fk: 'company_id' },
      { table: 'finance_cash_egress_requests', fk: 'company_id' },
      { table: 'finance_cash_register_sessions', fk: 'company_id' },
      { table: 'finance_cash_registers', fk: 'company_id' },
      { table: 'finance_issued_checks', fk: 'company_id' },
      { table: 'finance_check_books', fk: 'company_id' },
      { table: 'finance_budget_executions', fk: 'company_id' },
      { table: 'finance_budgets', fk: 'company_id' },
      { table: 'finance_journal_entry_lines', fk: 'company_id' },
      { table: 'finance_journal_entries', fk: 'company_id' },
      { table: 'finance_account_balances', fk: 'company_id' },
      { table: 'finance_balance_carryovers', fk: 'company_id' },
      { table: 'finance_bank_transactions', fk: 'company_id' },
      { table: 'finance_bank_accounts', fk: 'company_id' },
      { table: 'finance_cash_flow_forecasts', fk: 'company_id' },
      { table: 'finance_cash_integration_configs', fk: 'company_id' },
      { table: 'finance_chart_of_accounts', fk: 'company_id' },
      { table: 'finance_cost_centers', fk: 'company_id' },
      { table: 'finance_dimensions', fk: 'company_id' },
      { table: 'finance_currencies', fk: 'company_id' },
      { table: 'finance_currency_exchanges', fk: 'company_id' },
      { table: 'finance_exchange_rates', fk: 'company_id' },
      { table: 'finance_inflation_rates', fk: 'company_id' },
      { table: 'finance_fiscal_periods', fk: 'company_id' },
      { table: 'finance_payment_methods', fk: 'company_id' },
      { table: 'finance_responsible_configs', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 10: Procurement operativo',
    tables: [
      { table: 'procurement_payments', fk: 'company_id' },
      { table: 'procurement_invoices', fk: 'company_id' },
      { table: 'procurement_internal_receipts', fk: 'company_id' },
      { table: 'procurement_receipts', fk: 'company_id' },
      { table: 'procurement_rfq_quotes', fk: 'company_id' },
      { table: 'procurement_rfq_suppliers', fk: 'company_id' },
      { table: 'procurement_rfq_items', fk: 'company_id' },
      { table: 'procurement_rfqs', fk: 'company_id' },
      { table: 'procurement_requisition_items', fk: 'company_id' },
      { table: 'procurement_requisitions', fk: 'company_id' },
      { table: 'procurement_orders', fk: 'company_id' },
      { table: 'procurement_supplier_item_mappings', fk: 'company_id' },
      { table: 'procurement_contracts', fk: 'company_id' },
      { table: 'procurement_items', fk: 'company_id' },
      { table: 'procurement_categories', fk: 'company_id' },
      { table: 'procurement_suppliers', fk: 'company_id' },
      { table: 'procurement_exchange_rates', fk: 'company_id' },
      { table: 'procurement_approval_configs', fk: 'company_id' },
      { table: 'procurement_accounting_configs', fk: 'company_id' },
      { table: 'procurement_sectors', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 11: Notificaciones y comunicaciones',
    tables: [
      { table: 'notification_actions_logs', fk: 'company_id' },
      { table: 'notifications', fk: 'company_id' },
      { table: 'notification_templates', fk: 'company_id' },
      { table: 'notification_workflows', fk: 'company_id' },
      { table: 'communication_logs', fk: 'company_id' },
      { table: 'user_audit_logs', fk: 'company_id' },
      { table: 'assistant_conversations', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 12: Estructura organizacional',
    tables: [
      { table: 'kiosks', fk: 'company_id' },
      { table: 'shifts', fk: 'company_id' },
      { table: 'departments', fk: 'company_id' },
      { table: 'branches', fk: 'company_id' },
      { table: 'organizational_positions', fk: 'company_id' },
      { table: 'additional_role_types', fk: 'company_id' },
      { table: 'labor_agreement_v2s', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 13: Usuarios (último - todas las dependencias ya borradas)',
    tables: [
      { table: 'users', fk: 'company_id' }
    ]
  },
  {
    name: 'Fase 14: Configuraciones restantes',
    tables: [
      { table: 'company_modules', fk: 'company_id' },
      { table: 'company_risk_configs', fk: 'company_id' },
      { table: 'hse_company_configs', fk: 'company_id' },
      { table: 'consent_definitions', fk: 'company_id' },
      { table: 'vacation_configurations', fk: 'company_id' },
      { table: 'vacation_scales', fk: 'company_id' },
      { table: 'module_trials', fk: 'company_id' },
      { table: 'task_compatibilities', fk: 'company_id' },
      { table: 'company_dependencies', fk: 'company_id' },
      { table: 'support_packages', fk: 'company_id' },
      { table: 'company_support_assignments', fk: 'company_id' }
    ]
  }
];

// Tablas que NO se borran (administrativas/financieras del panel de Aponnt)
const PRESERVED_TABLES = [
  'companies',                    // La ficha queda (con status='cancelled')
  'invoices',                     // Historial de facturación
  'finance_payment_orders',       // Órdenes de pago a Aponnt
  'aponnt_staff_companies',       // Asignaciones de staff interno
  'company_offboarding_events',   // Auditoría del proceso de baja
  'budgets',                      // Presupuestos
  'audit_test_logs'               // Logs del auditor del sistema
];

class CompanyDataPurgeService {

  /**
   * Ejecuta la purga completa de datos operacionales
   * @param {number} companyId - ID de la empresa
   * @param {Object} options
   * @param {Function} options.onPhaseComplete - Callback por fase completada
   * @param {boolean} options.dryRun - Si true, solo cuenta registros sin borrar
   * @returns {Object} { success, totalDeleted, deletedByTable, phases, errors }
   */
  async purgeAll(companyId, options = {}) {
    const onPhaseComplete = options.onPhaseComplete || (() => {});
    const dryRun = options.dryRun || false;

    const result = {
      success: false,
      companyId,
      dryRun,
      totalDeleted: 0,
      deletedByTable: {},
      phases: [],
      errors: [],
      startedAt: new Date(),
      completedAt: null
    };

    // Verificar que la empresa existe y está en proceso de baja
    const [company] = await sequelize.query(
      'SELECT company_id, name, offboarding_status, is_active FROM companies WHERE company_id = :companyId',
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!company) {
      throw new Error(`Empresa ${companyId} no encontrada`);
    }

    if (!dryRun && company.offboarding_status !== 'purging') {
      throw new Error(`Empresa ${companyId} no está en estado 'purging'. Estado actual: ${company.offboarding_status}`);
    }

    const transaction = dryRun ? null : await sequelize.transaction();

    try {
      for (let phaseIdx = 0; phaseIdx < PURGE_PHASES.length; phaseIdx++) {
        const phase = PURGE_PHASES[phaseIdx];
        const phaseResult = {
          name: phase.name,
          tables: [],
          totalDeleted: 0,
          errors: []
        };

        for (const tableDef of phase.tables) {
          try {
            const count = await this._purgeTable(companyId, tableDef, transaction, dryRun);
            phaseResult.tables.push({ table: tableDef.table, deleted: count });
            phaseResult.totalDeleted += count;
            result.totalDeleted += count;
            result.deletedByTable[tableDef.table] = count;
          } catch (tableError) {
            // Si la tabla no existe, continuar sin error fatal
            const errorMsg = `${tableDef.table}: ${tableError.message}`;
            if (tableError.message.includes('does not exist') || tableError.message.includes('no existe')) {
              phaseResult.tables.push({ table: tableDef.table, deleted: 0, skipped: true });
            } else {
              phaseResult.errors.push(errorMsg);
              result.errors.push(errorMsg);
              console.error(`❌ [Purge] Error en ${tableDef.table}:`, tableError.message);
            }
          }
        }

        result.phases.push(phaseResult);
        onPhaseComplete(phaseIdx + 1, PURGE_PHASES.length, phase.name, phaseResult.totalDeleted);
      }

      // Fase final: Actualizar empresa (NO borrar)
      if (!dryRun) {
        await sequelize.query(`
          UPDATE companies SET
            is_active = false,
            status = 'cancelled',
            offboarding_status = 'completed',
            offboarding_confirmed_at = NOW()
          WHERE company_id = :companyId
        `, { replacements: { companyId }, transaction });

        await transaction.commit();
      }

      result.success = true;
      result.completedAt = new Date();

      console.log(`✅ [Purge] Empresa ${companyId} (${company.name}): ${result.totalDeleted} registros ${dryRun ? 'contados' : 'eliminados'} en ${PURGE_PHASES.length} fases`);

      return result;

    } catch (error) {
      if (transaction) await transaction.rollback();
      result.errors.push(`Fatal: ${error.message}`);
      console.error(`❌ [Purge] Error fatal en empresa ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta dry-run para contar registros sin borrar
   * @param {number} companyId
   * @returns {Object} Mismo formato que purgeAll pero sin borrar
   */
  async dryRun(companyId) {
    return this.purgeAll(companyId, { dryRun: true });
  }

  /**
   * Borra/cuenta registros de una tabla específica
   * @private
   */
  async _purgeTable(companyId, tableDef, transaction, dryRun) {
    let condition;

    if (tableDef.condition) {
      condition = tableDef.condition;
    } else if (tableDef.fk) {
      condition = `${tableDef.fk} = :companyId`;
    } else {
      return 0;
    }

    if (dryRun) {
      // Solo contar
      const [result] = await sequelize.query(
        `SELECT COUNT(*) as count FROM ${tableDef.table} WHERE ${condition}`,
        { replacements: { companyId }, type: QueryTypes.SELECT }
      );
      return parseInt(result.count) || 0;
    } else {
      // Borrar
      const [, metadata] = await sequelize.query(
        `DELETE FROM ${tableDef.table} WHERE ${condition}`,
        { replacements: { companyId }, transaction }
      );
      return metadata.rowCount || 0;
    }
  }

  /**
   * Obtiene un resumen de cuántos registros tiene una empresa por tabla
   * @param {number} companyId
   * @returns {Object} { totalRecords, byTable: { table: count, ... } }
   */
  async getDataSummary(companyId) {
    const summary = { totalRecords: 0, byTable: {} };

    for (const phase of PURGE_PHASES) {
      for (const tableDef of phase.tables) {
        try {
          const condition = tableDef.condition
            ? tableDef.condition
            : `${tableDef.fk} = :companyId`;

          const [result] = await sequelize.query(
            `SELECT COUNT(*) as count FROM ${tableDef.table} WHERE ${condition}`,
            { replacements: { companyId }, type: QueryTypes.SELECT }
          );

          const count = parseInt(result.count) || 0;
          if (count > 0) {
            summary.byTable[tableDef.table] = count;
            summary.totalRecords += count;
          }
        } catch (err) {
          // Tabla no existe, skip
        }
      }
    }

    return summary;
  }

  /**
   * Lista las tablas que se conservan (no se borran)
   */
  getPreservedTables() {
    return PRESERVED_TABLES;
  }

  /**
   * Obtiene el total de fases de purga
   */
  getTotalPhases() {
    return PURGE_PHASES.length;
  }
}

module.exports = new CompanyDataPurgeService();
