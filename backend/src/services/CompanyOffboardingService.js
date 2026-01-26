/**
 * COMPANY OFFBOARDING SERVICE - Orquestador Principal
 * Coordina todo el proceso de baja de una empresa:
 * Warning → Grace Period → Export → Drive Upload → Confirmation → Purge
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const CompanyDataExportService = require('./CompanyDataExportService');
const CompanyDataPurgeService = require('./CompanyDataPurgeService');
const GoogleDriveService = require('./GoogleDriveService');
const OffboardingNotificationService = require('./OffboardingNotificationService');

// Roles que pueden confirmar la baja
const ALLOWED_ROLES = ['gerente', 'director', 'ceo', 'admin', 'superadmin'];

class CompanyOffboardingService {

  /**
   * Calcula la fecha límite del grace period (7 días hábiles desde startDate)
   * Excluye sábados y domingos.
   * @param {Date} startDate
   * @returns {Date} Fecha deadline
   */
  calculateGraceDeadline(startDate = new Date()) {
    const deadline = new Date(startDate);
    let businessDays = 0;

    while (businessDays < 7) {
      deadline.setDate(deadline.getDate() + 1);
      const dayOfWeek = deadline.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingo ni sábado
        businessDays++;
      }
    }

    return deadline;
  }

  /**
   * PASO 1: Inicia el proceso de offboarding con warning al cliente
   * Se dispara automáticamente cuando una factura tiene > 30 días de vencida
   * o manualmente por un gerente desde el panel.
   *
   * @param {number} companyId
   * @param {number} invoiceId - Factura que originó el proceso
   * @param {number|null} staffId - Staff que inició manualmente (null si automático)
   * @returns {Object} Resultado del warning
   */
  async initiateWarning(companyId, invoiceId, staffId = null) {
    // Verificar que la empresa no esté ya en proceso de baja
    const [company] = await sequelize.query(
      `SELECT company_id, name, offboarding_status, is_active, contact_email
       FROM companies WHERE company_id = :companyId`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!company) throw new Error(`Empresa ${companyId} no encontrada`);
    if (!company.is_active) throw new Error(`Empresa ${companyId} ya está inactiva`);
    if (company.offboarding_status) {
      throw new Error(`Empresa ${companyId} ya está en proceso de baja (estado: ${company.offboarding_status})`);
    }

    // Obtener datos de la factura
    const [invoice] = await sequelize.query(
      `SELECT id, invoice_number, total_amount, due_date, status
       FROM invoices WHERE id = :invoiceId AND company_id = :companyId`,
      { replacements: { invoiceId, companyId }, type: QueryTypes.SELECT }
    );

    if (!invoice) throw new Error(`Factura ${invoiceId} no encontrada para empresa ${companyId}`);

    const graceDeadline = this.calculateGraceDeadline();
    const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));

    // Actualizar empresa
    await sequelize.query(`
      UPDATE companies SET
        offboarding_status = 'warning_sent',
        offboarding_initiated_at = NOW(),
        offboarding_warning_sent_at = NOW(),
        offboarding_grace_deadline = :graceDeadline,
        cancellation_invoice_id = :invoiceId
      WHERE company_id = :companyId
    `, {
      replacements: { companyId, invoiceId, graceDeadline: graceDeadline.toISOString().split('T')[0] }
    });

    // Registrar evento
    await this._logEvent({
      companyId,
      eventType: 'warning_sent',
      staffId,
      invoiceId,
      metadata: {
        days_overdue: daysOverdue,
        grace_deadline: graceDeadline.toISOString().split('T')[0],
        invoice_amount: invoice.total_amount,
        invoice_number: invoice.invoice_number
      }
    });

    // Enviar notificación al cliente
    try {
      await OffboardingNotificationService.notifyInvoiceOverdueWarning(companyId, {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        amount: invoice.total_amount,
        due_date: invoice.due_date,
        days_overdue: daysOverdue,
        grace_deadline: graceDeadline.toLocaleDateString('es-AR')
      });
    } catch (notifError) {
      console.error(`⚠️ [Offboarding] Error al enviar notificación warning:`, notifError.message);
    }

    console.log(`⚠️ [Offboarding] Warning enviado a empresa ${companyId} (${company.name}). Grace deadline: ${graceDeadline.toLocaleDateString('es-AR')}`);

    return {
      success: true,
      companyId,
      companyName: company.name,
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      daysOverdue,
      graceDeadline: graceDeadline.toISOString().split('T')[0],
      status: 'warning_sent'
    };
  }

  /**
   * PASO 2: Inicia la exportación de datos y subida a Drive
   * Se ejecuta cuando el grace period ha vencido sin pago.
   *
   * @param {number} companyId
   * @param {number|null} staffId - Staff que forzó manualmente (null si automático por cron)
   * @returns {Object} Resultado de la exportación
   */
  async initiateExport(companyId, staffId = null) {
    const [company] = await sequelize.query(
      `SELECT company_id, name, slug, offboarding_status, contact_email, data_export_url
       FROM companies WHERE company_id = :companyId`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!company) throw new Error(`Empresa ${companyId} no encontrada`);

    // Verificar estado válido para exportar
    const validStates = ['warning_sent', 'grace_period', 'export_pending'];
    if (!validStates.includes(company.offboarding_status) && !staffId) {
      throw new Error(`Empresa ${companyId} no está en estado válido para exportar (actual: ${company.offboarding_status})`);
    }

    // Actualizar estado
    await sequelize.query(
      `UPDATE companies SET offboarding_status = 'export_pending' WHERE company_id = :companyId`,
      { replacements: { companyId } }
    );

    await this._logEvent({
      companyId,
      eventType: 'export_started',
      staffId,
      metadata: { triggered_by: staffId ? 'manual' : 'cron' }
    });

    // Notificar a admins que comenzó
    try {
      await OffboardingNotificationService.notifyExportStarted(companyId);
    } catch (e) { /* non-blocking */ }

    let exportResult;
    let driveResult;

    try {
      // Ejecutar exportación
      exportResult = await CompanyDataExportService.exportAll(companyId);

      await this._logEvent({
        companyId,
        eventType: 'export_completed',
        staffId,
        exportFilePath: exportResult.zipPath,
        recordsExported: exportResult.recordsByTable,
        metadata: {
          total_records: exportResult.totalRecords,
          size_mb: exportResult.sizeMB,
          zip_file: exportResult.zipFileName
        }
      });

      // Subir a Google Drive
      if (GoogleDriveService.enabled) {
        await GoogleDriveService.init();

        // Crear carpeta para la empresa
        const folder = await GoogleDriveService.createCompanyFolder(company.name);

        // Subir ZIP
        const upload = await GoogleDriveService.uploadFile(
          exportResult.zipPath,
          exportResult.zipFileName,
          folder.folderId
        );

        // Generar link público
        const publicUrl = await GoogleDriveService.generatePublicLink(upload.fileId);

        driveResult = {
          fileId: upload.fileId,
          folderId: folder.folderId,
          driveUrl: publicUrl,
          webViewLink: upload.webViewLink
        };

        // Compartir con email del cliente si existe
        if (company.contact_email) {
          try {
            await GoogleDriveService.shareWithEmail(upload.fileId, company.contact_email);
          } catch (shareErr) {
            console.warn(`⚠️ [Offboarding] No se pudo compartir con ${company.contact_email}:`, shareErr.message);
          }
        }

        await this._logEvent({
          companyId,
          eventType: 'drive_uploaded',
          staffId,
          driveUrl: publicUrl,
          driveFileId: upload.fileId,
          metadata: { folder_id: folder.folderId }
        });

      } else {
        // Drive deshabilitado: usar URL local
        driveResult = {
          driveUrl: `/api/offboarding/${companyId}/export/download`,
          fileId: null,
          local: true
        };
      }

      // Actualizar empresa con URL del export
      await sequelize.query(`
        UPDATE companies SET
          offboarding_status = 'pending_confirmation',
          data_export_url = :driveUrl,
          data_export_generated_at = NOW()
        WHERE company_id = :companyId
      `, {
        replacements: { companyId, driveUrl: driveResult.driveUrl }
      });

      // Notificar al cliente
      try {
        await OffboardingNotificationService.notifyExportReadyClient(companyId, {
          driveUrl: driveResult.driveUrl,
          totalRecords: exportResult.totalRecords,
          sizeMB: exportResult.sizeMB
        });
      } catch (e) { /* non-blocking */ }

      // Notificar a admins
      try {
        await OffboardingNotificationService.notifyExportReadyAdmin(companyId, {
          driveUrl: driveResult.driveUrl,
          totalRecords: exportResult.totalRecords,
          sizeMB: exportResult.sizeMB
        });
      } catch (e) { /* non-blocking */ }

      console.log(`📦 [Offboarding] Export completo para empresa ${companyId}: ${exportResult.totalRecords} registros, ${exportResult.sizeMB} MB`);

      return {
        success: true,
        companyId,
        companyName: company.name,
        export: {
          totalRecords: exportResult.totalRecords,
          sizeMB: exportResult.sizeMB,
          zipPath: exportResult.zipPath
        },
        drive: driveResult,
        status: 'pending_confirmation'
      };

    } catch (error) {
      await this._logEvent({
        companyId,
        eventType: 'export_failed',
        staffId,
        errorMessage: error.message,
        metadata: { stack: error.stack?.substring(0, 500) }
      });

      // Revertir estado
      await sequelize.query(
        `UPDATE companies SET offboarding_status = 'warning_sent' WHERE company_id = :companyId`,
        { replacements: { companyId } }
      );

      throw error;
    }
  }

  /**
   * PASO 3: Confirma la baja definitiva y ejecuta la purga
   * SOLO puede ser ejecutado por gerentes o roles superiores.
   *
   * @param {number} companyId
   * @param {number} staffId - ID del staff que confirma
   * @param {string} reason - Razón de la baja
   * @param {string} confirmationCode - Últimos 4 dígitos del CUIT para confirmación
   * @returns {Object} Resultado de la purga
   */
  async confirmOffboarding(companyId, staffId, reason, confirmationCode) {
    // Validar rol del staff
    const [staff] = await sequelize.query(
      `SELECT id, name, role FROM aponnt_staff WHERE id = :staffId`,
      { replacements: { staffId }, type: QueryTypes.SELECT }
    );

    if (!staff) throw new Error('Staff no encontrado');
    if (!ALLOWED_ROLES.includes(staff.role?.toLowerCase())) {
      throw new Error(`Rol insuficiente. Se requiere: ${ALLOWED_ROLES.join(', ')}. Rol actual: ${staff.role}`);
    }

    // Verificar empresa
    const [company] = await sequelize.query(
      `SELECT company_id, name, offboarding_status, tax_id, data_export_url
       FROM companies WHERE company_id = :companyId`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!company) throw new Error(`Empresa ${companyId} no encontrada`);
    if (company.offboarding_status !== 'pending_confirmation') {
      throw new Error(`Empresa no está en estado 'pending_confirmation'. Estado actual: ${company.offboarding_status}`);
    }

    // Validar código de confirmación (últimos 4 dígitos del CUIT)
    if (confirmationCode && company.tax_id) {
      const lastFour = company.tax_id.replace(/\D/g, '').slice(-4);
      if (confirmationCode !== lastFour) {
        throw new Error('Código de confirmación inválido. Debe ingresar los últimos 4 dígitos del CUIT de la empresa.');
      }
    }

    // Cambiar estado a 'purging'
    await sequelize.query(
      `UPDATE companies SET
        offboarding_status = 'purging',
        offboarding_confirmed_by = :staffId,
        offboarding_confirmed_at = NOW(),
        cancellation_reason = :reason
      WHERE company_id = :companyId`,
      { replacements: { companyId, staffId, reason } }
    );

    await this._logEvent({
      companyId,
      eventType: 'baja_confirmed',
      staffId,
      metadata: {
        reason,
        confirmed_by_name: staff.name,
        confirmed_by_role: staff.role
      }
    });

    // Ejecutar purga
    let purgeResult;
    try {
      await this._logEvent({ companyId, eventType: 'purge_started', staffId });

      purgeResult = await CompanyDataPurgeService.purgeAll(companyId, {
        onPhaseComplete: async (current, total, phaseName, deleted) => {
          console.log(`  [Purge] Fase ${current}/${total}: ${phaseName} - ${deleted} registros`);
        }
      });

      await this._logEvent({
        companyId,
        eventType: 'purge_completed',
        staffId,
        recordsDeleted: purgeResult.deletedByTable,
        metadata: {
          total_deleted: purgeResult.totalDeleted,
          phases: purgeResult.phases.length,
          errors: purgeResult.errors
        }
      });

    } catch (purgeError) {
      await this._logEvent({
        companyId,
        eventType: 'purge_failed',
        staffId,
        errorMessage: purgeError.message
      });
      throw purgeError;
    }

    // Notificaciones post-baja
    try {
      await OffboardingNotificationService.notifyBajaConfirmedClient(companyId, {
        reason,
        confirmedBy: staffId,
        driveUrl: company.data_export_url
      });
    } catch (e) { /* non-blocking */ }

    try {
      await OffboardingNotificationService.notifyBajaConfirmedInternal(companyId, {
        reason,
        confirmedBy: staffId,
        totalDeleted: purgeResult.totalDeleted
      });
    } catch (e) { /* non-blocking */ }

    console.log(`🔴 [Offboarding] Baja completada: empresa ${companyId} (${company.name}). ${purgeResult.totalDeleted} registros eliminados.`);

    return {
      success: true,
      companyId,
      companyName: company.name,
      confirmedBy: { id: staffId, name: staff.name, role: staff.role },
      reason,
      purge: {
        totalDeleted: purgeResult.totalDeleted,
        phases: purgeResult.phases.length,
        errors: purgeResult.errors
      },
      status: 'completed'
    };
  }

  /**
   * Cancela un proceso de offboarding en curso (ej: el cliente pagó)
   *
   * @param {number} companyId
   * @param {number} staffId - Staff que cancela
   * @param {string} reason - Razón de cancelación
   */
  async cancelOffboarding(companyId, staffId, reason) {
    const [company] = await sequelize.query(
      `SELECT company_id, name, offboarding_status FROM companies WHERE company_id = :companyId`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );

    if (!company) throw new Error(`Empresa ${companyId} no encontrada`);
    if (!company.offboarding_status) {
      throw new Error(`Empresa ${companyId} no tiene un proceso de baja activo`);
    }
    if (company.offboarding_status === 'completed') {
      throw new Error(`La baja de empresa ${companyId} ya fue completada y no puede revertirse`);
    }
    if (company.offboarding_status === 'purging') {
      throw new Error(`La purga está en progreso para empresa ${companyId} y no puede cancelarse`);
    }

    await sequelize.query(`
      UPDATE companies SET
        offboarding_status = NULL,
        offboarding_initiated_at = NULL,
        offboarding_warning_sent_at = NULL,
        offboarding_grace_deadline = NULL,
        cancellation_invoice_id = NULL
      WHERE company_id = :companyId
    `, { replacements: { companyId } });

    await this._logEvent({
      companyId,
      eventType: 'offboarding_cancelled',
      staffId,
      metadata: { reason, previous_status: company.offboarding_status }
    });

    console.log(`✅ [Offboarding] Proceso cancelado para empresa ${companyId} (${company.name}). Razón: ${reason}`);

    return { success: true, companyId, companyName: company.name, reason };
  }

  /**
   * Obtiene el estado actual del proceso de offboarding
   * @param {number} companyId
   * @returns {Object} Estado completo con timeline
   */
  async getOffboardingStatus(companyId) {
    const [company] = await sequelize.query(`
      SELECT company_id, name, slug, is_active, status,
             offboarding_status, offboarding_initiated_at, offboarding_warning_sent_at,
             offboarding_grace_deadline, offboarding_confirmed_by, offboarding_confirmed_at,
             data_export_url, data_export_generated_at, cancellation_reason, cancellation_invoice_id,
             contact_email, tax_id
      FROM companies WHERE company_id = :companyId
    `, { replacements: { companyId }, type: QueryTypes.SELECT });

    if (!company) throw new Error(`Empresa ${companyId} no encontrada`);

    // Obtener timeline de eventos
    const events = await sequelize.query(`
      SELECT id, event_type, triggered_by_staff_id, invoice_id,
             drive_url, records_exported, records_deleted, error_message, metadata, created_at
      FROM company_offboarding_events
      WHERE company_id = :companyId
      ORDER BY created_at DESC
      LIMIT 50
    `, { replacements: { companyId }, type: QueryTypes.SELECT });

    // Obtener resumen de datos (solo si no fue purgado)
    let dataSummary = null;
    if (company.offboarding_status && company.offboarding_status !== 'completed') {
      try {
        dataSummary = await CompanyDataPurgeService.getDataSummary(companyId);
      } catch (e) { /* ignore */ }
    }

    return {
      company: {
        id: company.company_id,
        name: company.name,
        isActive: company.is_active,
        status: company.status,
        contactEmail: company.contact_email,
        taxId: company.tax_id
      },
      offboarding: {
        status: company.offboarding_status,
        initiatedAt: company.offboarding_initiated_at,
        warningSentAt: company.offboarding_warning_sent_at,
        graceDeadline: company.offboarding_grace_deadline,
        confirmedBy: company.offboarding_confirmed_by,
        confirmedAt: company.offboarding_confirmed_at,
        exportUrl: company.data_export_url,
        exportGeneratedAt: company.data_export_generated_at,
        cancellationReason: company.cancellation_reason,
        invoiceId: company.cancellation_invoice_id
      },
      timeline: events,
      dataSummary
    };
  }

  /**
   * Obtiene lista de empresas en riesgo (facturas vencidas > 30 días)
   * @returns {Array} Lista de empresas con facturas vencidas
   */
  async getCompaniesAtRisk() {
    return sequelize.query(`
      SELECT
        c.company_id AS company_id,
        c.name AS company_name,
        c.contact_email,
        c.offboarding_status,
        i.id AS invoice_id,
        i.invoice_number,
        i.total_amount AS amount,
        i.due_date,
        (CURRENT_DATE - i.due_date::DATE) AS days_overdue
      FROM invoices i
      JOIN companies c ON c.company_id = i.company_id
      WHERE i.status IN ('overdue', 'sent')
        AND i.due_date < CURRENT_DATE - INTERVAL '30 days'
        AND c.is_active = true
        AND c.status != 'cancelled'
      ORDER BY days_overdue DESC
    `, { type: QueryTypes.SELECT });
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPER PRIVADO
  // ═══════════════════════════════════════════════════════════════════

  async _logEvent(data) {
    try {
      await sequelize.query(`
        INSERT INTO company_offboarding_events
          (company_id, event_type, triggered_by_staff_id, invoice_id,
           export_file_path, drive_url, drive_file_id,
           records_exported, records_deleted, error_message, metadata)
        VALUES
          (:companyId, :eventType, :staffId, :invoiceId,
           :exportFilePath, :driveUrl, :driveFileId,
           :recordsExported, :recordsDeleted, :errorMessage, :metadata)
      `, {
        replacements: {
          companyId: data.companyId,
          eventType: data.eventType,
          staffId: data.staffId || null,
          invoiceId: data.invoiceId || null,
          exportFilePath: data.exportFilePath || null,
          driveUrl: data.driveUrl || null,
          driveFileId: data.driveFileId || null,
          recordsExported: JSON.stringify(data.recordsExported || {}),
          recordsDeleted: JSON.stringify(data.recordsDeleted || {}),
          errorMessage: data.errorMessage || null,
          metadata: JSON.stringify(data.metadata || {})
        }
      });
    } catch (error) {
      console.error(`⚠️ [Offboarding] Error al registrar evento:`, error.message);
    }
  }
}

module.exports = new CompanyOffboardingService();
