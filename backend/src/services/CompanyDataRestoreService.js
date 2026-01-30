/**
 * COMPANY DATA RESTORE SERVICE
 * Restaura los datos de una empresa desde un ZIP de export.
 * SOLO para re-contrataciones después de una baja completada.
 *
 * SEGURIDAD:
 * - Solo roles superadmin/director (level 0)
 * - Requiere validación de compatibilidad >= 90%
 * - Requiere código de confirmación (CUIT completo)
 * - Requiere que exista contrato nuevo activo
 * - Audit trail completo
 *
 * @version 1.0.0
 * @date 2026-01-28
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const CompanyDataExportService = require('./CompanyDataExportService');

// Solo nivel 0 puede restaurar (superadmin, director, ceo)
const MAX_ALLOWED_LEVEL = 0;

// Orden de restauración (inverso al orden de purga)
const RESTORE_ORDER = [
  // Fase 1: Estructura organizacional (primero, porque otros dependen de estos)
  'departments',
  'branches',
  'shifts',
  'kiosks',
  'additional_role_types',
  'organizational_positions',

  // Fase 2: Usuarios (antes que datos de usuario)
  'users',

  // Fase 3: Configuraciones
  'company_modules',
  'notification_templates',
  'notification_workflows',
  'vacation_configurations',
  'vacation_scales',
  'payroll_templates',
  'payroll_concept_types',
  'company_risk_configs',
  'hse_company_configs',
  'consent_definitions',

  // Fase 4: Datos de empleados
  'user_documents',
  'user_work_history',
  'user_education',
  'user_professional_licenses',
  'user_driver_licenses',
  'user_children',
  'user_family_members',
  'user_shift_assignments',
  'user_salary_configs',
  'user_salary_advanced',
  'user_work_restrictions',
  'user_activity_restrictions',
  'user_union_affiliations',
  'user_disciplinary_actions',
  'user_legal_issues',

  // Fase 5: Datos biométricos y médicos
  'biometric_data',
  'facial_biometric_data',
  'biometric_consents',
  'medical_records',
  'user_medical_exams',
  'user_medical_advanced',
  'user_medical_documents',
  'user_allergies',
  'user_chronic_conditions',
  'user_vaccinations',

  // Fase 6: Operaciones
  'attendances',
  'attendance_batches',
  'attendance_patterns',
  'attendance_profiles',
  'attendance_analytics_caches',
  'sanctions',
  'vacation_requests',
  'extraordinary_licenses',
  'visitors',
  'visitor_gps_trackings',
  'access_notifications',
  'employee_locations',

  // Fase 7: Training y documentos
  'trainings',
  'training_assignments',
  'training_progresses',
  'documents',
  'document_versions',
  'document_metadata',
  'document_permissions',
  'document_requests',
  'document_alerts',

  // Fase 8: EPP y seguridad
  'epp_catalogs',
  'epp_categories',
  'epp_role_requirements',
  'epp_deliveries',
  'epp_inspections',

  // Fase 9: Payroll
  'commissions',
  'commission_liquidations',
  'commission_payments',
  'payroll_runs',
  'user_payroll_assignments',
  'user_payroll_bonuses',

  // Fase 10: Otros
  'notifications',
  'notification_actions_logs',
  'document_access_logs',
  'user_audit_logs',
  'support_tickets',
  'company_tasks',
  'administrative_tasks',
  'experience_recognitions',
  'experience_comments',
  'emotional_analyses',
  'scoring_histories',
  'assistant_conversations'
];

class CompanyDataRestoreService {

  /**
   * Valida que se puede proceder con la restauración
   * @param {number} companyId - ID de la empresa a restaurar
   * @param {number} staffId - ID del staff que solicita
   * @param {string} zipPath - Ruta al archivo ZIP
   * @returns {Object} { canRestore, errors, warnings, compatibility }
   */
  async validateRestoration(companyId, staffId, zipPath) {
    const result = {
      canRestore: false,
      errors: [],
      warnings: [],
      compatibility: null,
      company: null,
      staff: null
    };

    // 1. Validar staff y permisos
    const [staff] = await sequelize.query(
      `SELECT s.staff_id, s.first_name, s.last_name, s.level,
              r.role_code, r.role_name
       FROM aponnt_staff s
       LEFT JOIN aponnt_staff_roles r ON r.role_id = s.role_id
       WHERE s.staff_id = :staffId`,
      { replacements: { staffId }, type: QueryTypes.SELECT }
    );

    if (!staff) {
      result.errors.push('Staff no encontrado');
      return result;
    }

    result.staff = staff;

    if (staff.level === null || staff.level === undefined || staff.level > MAX_ALLOWED_LEVEL) {
      result.errors.push(
        `Permiso denegado. Se requiere nivel director o superior (level 0). Nivel actual: ${staff.level}`
      );
      return result;
    }

    // 2. Validar empresa
    const [company] = await sequelize.query(
      `SELECT company_id, name, status, is_active, offboarding_status, tax_id
       FROM companies WHERE company_id = :companyId`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!company) {
      result.errors.push(`Empresa ${companyId} no encontrada`);
      return result;
    }

    result.company = company;

    if (company.status !== 'cancelled') {
      result.errors.push(
        `La empresa debe tener status 'cancelled' para restaurar. Status actual: ${company.status}`
      );
    }

    if (company.offboarding_status !== 'completed') {
      result.errors.push(
        `El proceso de baja debe estar completado. Estado actual: ${company.offboarding_status || 'ninguno'}`
      );
    }

    // 3. Verificar que existe contrato nuevo activo
    const [activeContract] = await sequelize.query(
      `SELECT id, contract_number, start_date, status
       FROM procurement_contracts
       WHERE company_id = :companyId
         AND status = 'active'
         AND start_date >= (SELECT offboarding_confirmed_at FROM companies WHERE company_id = :companyId)
       ORDER BY start_date DESC
       LIMIT 1`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!activeContract) {
      result.errors.push(
        'No existe un contrato nuevo activo posterior a la fecha de baja. ' +
        'Debe crear un presupuesto y contrato antes de restaurar.'
      );
    } else {
      result.warnings.push(
        `Contrato encontrado: ${activeContract.contract_number} (${activeContract.start_date})`
      );
    }

    // 4. Validar archivo ZIP existe
    if (!fs.existsSync(zipPath)) {
      result.errors.push(`Archivo ZIP no encontrado: ${zipPath}`);
      return result;
    }

    // 5. Validar compatibilidad del schema
    result.compatibility = await CompanyDataExportService.validateCompatibility(zipPath);

    if (!result.compatibility.compatible) {
      result.errors.push(
        `ZIP incompatible con el sistema actual. Score: ${result.compatibility.score}%, ` +
        `mínimo requerido: ${result.compatibility.minRequired}%`
      );

      // Agregar errores específicos de compatibilidad
      for (const err of result.compatibility.errors) {
        result.errors.push(`[Compatibilidad] ${err}`);
      }
    }

    // Agregar warnings de compatibilidad
    for (const warn of result.compatibility.warnings || []) {
      result.warnings.push(`[Compatibilidad] ${warn}`);
    }

    // 6. Verificar que la empresa no tiene datos operacionales actuales
    const [userCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM users WHERE company_id = :companyId`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (parseInt(userCount.count) > 0) {
      result.warnings.push(
        `La empresa tiene ${userCount.count} usuarios actuales. ` +
        `Estos serán reemplazados por los datos del ZIP.`
      );
    }

    // Resultado final
    result.canRestore = result.errors.length === 0;

    return result;
  }

  /**
   * Ejecuta la restauración completa de una empresa desde ZIP
   *
   * @param {number} companyId - ID de la empresa
   * @param {number} staffId - ID del staff que ejecuta
   * @param {string} zipPath - Ruta al ZIP de export
   * @param {string} confirmationCode - CUIT completo de la empresa
   * @param {Object} options - Opciones adicionales
   * @returns {Object} Resultado de la restauración
   */
  async restoreFromZip(companyId, staffId, zipPath, confirmationCode, options = {}) {
    const dryRun = options.dryRun || false;

    const result = {
      success: false,
      dryRun,
      companyId,
      tablesRestored: 0,
      recordsRestored: 0,
      recordsByTable: {},
      skippedTables: [],
      errors: [],
      warnings: [],
      startedAt: new Date(),
      completedAt: null
    };

    // 1. Validar todo primero
    const validation = await this.validateRestoration(companyId, staffId, zipPath);

    if (!validation.canRestore) {
      result.errors = validation.errors;
      result.warnings = validation.warnings;
      return result;
    }

    // 2. Validar código de confirmación (CUIT completo)
    const company = validation.company;
    const normalizedCuit = company.tax_id?.replace(/\D/g, '') || '';
    const normalizedCode = confirmationCode?.replace(/\D/g, '') || '';

    if (normalizedCuit !== normalizedCode) {
      result.errors.push(
        'Código de confirmación inválido. Debe ingresar el CUIT completo de la empresa.'
      );
      return result;
    }

    // 3. Abrir ZIP y extraer datos
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Leer manifest
    const summaryEntry = zipEntries.find(e => e.entryName === 'EXPORT_SUMMARY.json');
    if (!summaryEntry) {
      result.errors.push('ZIP no contiene EXPORT_SUMMARY.json');
      return result;
    }

    const summary = JSON.parse(summaryEntry.getData().toString('utf8'));

    // Verificar que el ZIP corresponde a esta empresa
    if (summary.company_id !== companyId) {
      result.errors.push(
        `El ZIP pertenece a empresa ID ${summary.company_id}, no a empresa ${companyId}`
      );
      return result;
    }

    console.log(`🔄 [Restore] Iniciando restauración de empresa ${companyId} (${company.name})...`);
    console.log(`   ZIP generado: ${summary.export_date}`);
    console.log(`   Registros a restaurar: ${summary.total_records}`);
    console.log(`   Modo: ${dryRun ? 'DRY RUN (simulación)' : 'REAL'}`);

    const transaction = dryRun ? null : await sequelize.transaction();

    try {
      // 4. Limpiar datos existentes de la empresa (si los hay)
      if (!dryRun) {
        await this._cleanExistingData(companyId, transaction);
      }

      // 5. Restaurar tablas en orden
      for (const tableName of RESTORE_ORDER) {
        try {
          const count = await this._restoreTable(
            zip,
            zipEntries,
            tableName,
            companyId,
            transaction,
            dryRun
          );

          if (count > 0) {
            result.recordsByTable[tableName] = count;
            result.recordsRestored += count;
            result.tablesRestored++;
            console.log(`   ✅ ${tableName}: ${count} registros`);
          } else if (count === 0) {
            result.skippedTables.push(tableName);
          }
        } catch (tableError) {
          const msg = `Error restaurando ${tableName}: ${tableError.message}`;
          result.warnings.push(msg);
          console.warn(`   ⚠️ ${msg}`);
        }
      }

      // 6. Reactivar empresa
      if (!dryRun) {
        await sequelize.query(`
          UPDATE companies SET
            is_active = true,
            status = 'active',
            offboarding_status = NULL,
            offboarding_initiated_at = NULL,
            offboarding_warning_sent_at = NULL,
            offboarding_grace_deadline = NULL,
            offboarding_confirmed_at = NULL,
            offboarding_confirmed_by = NULL,
            cancellation_reason = NULL,
            cancellation_invoice_id = NULL
          WHERE company_id = :companyId
        `, { replacements: { companyId }, transaction });

        await transaction.commit();
      }

      // 7. Registrar evento de auditoría
      if (!dryRun) {
        await this._logRestoreEvent(companyId, staffId, {
          zipPath,
          summary,
          result
        });
      }

      result.success = true;
      result.completedAt = new Date();

      console.log(`\n✅ [Restore] Empresa ${companyId} restaurada exitosamente`);
      console.log(`   Tablas: ${result.tablesRestored}, Registros: ${result.recordsRestored}`);

      return result;

    } catch (error) {
      if (transaction && !dryRun) {
        await transaction.rollback();
      }

      result.errors.push(`Error fatal: ${error.message}`);
      console.error(`❌ [Restore] Error:`, error);

      return result;
    }
  }

  /**
   * Limpia datos existentes de la empresa antes de restaurar
   * @private
   */
  async _cleanExistingData(companyId, transaction) {
    // Usar orden inverso al de restauración
    const tablesToClean = [...RESTORE_ORDER].reverse();

    for (const tableName of tablesToClean) {
      try {
        // Verificar si la tabla existe
        const [exists] = await sequelize.query(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = :tableName
          ) as exists`,
          { replacements: { tableName }, type: QueryTypes.SELECT }
        );

        if (!exists.exists) continue;

        // Verificar si tiene company_id
        const [hasCompanyId] = await sequelize.query(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = :tableName AND column_name = 'company_id'
          ) as exists`,
          { replacements: { tableName }, type: QueryTypes.SELECT }
        );

        if (hasCompanyId.exists) {
          await sequelize.query(
            `DELETE FROM ${tableName} WHERE company_id = :companyId`,
            { replacements: { companyId }, transaction }
          );
        }
      } catch (err) {
        // Ignorar errores de tablas que no existen o no tienen company_id
      }
    }
  }

  /**
   * Restaura una tabla individual desde el ZIP
   * @private
   */
  async _restoreTable(zip, zipEntries, tableName, companyId, transaction, dryRun) {
    // Buscar archivo JSON de la tabla en cualquier subdirectorio
    const tableEntry = zipEntries.find(e =>
      e.entryName.endsWith(`/${tableName}.json`) || e.entryName === `${tableName}.json`
    );

    if (!tableEntry) {
      return 0; // Tabla no estaba en el export
    }

    const data = JSON.parse(tableEntry.getData().toString('utf8'));

    if (!Array.isArray(data) || data.length === 0) {
      return 0;
    }

    if (dryRun) {
      return data.length; // En dry run, solo contar
    }

    // Verificar que la tabla existe en el sistema actual
    const [exists] = await sequelize.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = :tableName
      ) as exists`,
      { replacements: { tableName }, type: QueryTypes.SELECT }
    );

    if (!exists.exists) {
      throw new Error(`Tabla ${tableName} no existe en el sistema actual`);
    }

    // Obtener columnas actuales de la tabla
    const currentColumns = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = :tableName`,
      { replacements: { tableName }, type: QueryTypes.SELECT }
    );

    const currentColNames = new Set(currentColumns.map(c => c.column_name));

    // Insertar registros
    let inserted = 0;

    for (const record of data) {
      // Filtrar solo columnas que existen en la tabla actual
      const filteredRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (currentColNames.has(key)) {
          filteredRecord[key] = value;
        }
      }

      // Forzar company_id correcto (por seguridad)
      if (currentColNames.has('company_id')) {
        filteredRecord.company_id = companyId;
      }

      const columns = Object.keys(filteredRecord);
      const values = Object.values(filteredRecord);

      if (columns.length === 0) continue;

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = columns.map(c => `"${c}"`).join(', ');

      try {
        await sequelize.query(
          `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})
           ON CONFLICT DO NOTHING`,
          {
            bind: values,
            transaction
          }
        );
        inserted++;
      } catch (insertError) {
        // Log pero continuar con otros registros
        if (inserted === 0) {
          console.warn(`   ⚠️ ${tableName}: Error en primer registro: ${insertError.message}`);
        }
      }
    }

    return inserted;
  }

  /**
   * Registra evento de restauración en auditoría
   * @private
   */
  async _logRestoreEvent(companyId, staffId, data) {
    try {
      await sequelize.query(`
        INSERT INTO company_offboarding_events
        (company_id, event_type, triggered_by_staff_id, metadata, created_at)
        VALUES (:companyId, 'company_restored', :staffId, :metadata, NOW())
      `, {
        replacements: {
          companyId,
          staffId,
          metadata: JSON.stringify({
            zip_file: data.zipPath,
            original_export_date: data.summary?.export_date,
            tables_restored: data.result?.tablesRestored,
            records_restored: data.result?.recordsRestored,
            restored_at: new Date().toISOString()
          })
        }
      });
    } catch (err) {
      console.warn('⚠️ [Restore] No se pudo registrar evento de auditoría:', err.message);
    }
  }

  /**
   * Ejecuta dry-run para previsualizar restauración
   */
  async dryRun(companyId, staffId, zipPath) {
    return this.restoreFromZip(companyId, staffId, zipPath, 'DRYRUN', { dryRun: true });
  }
}

module.exports = new CompanyDataRestoreService();
