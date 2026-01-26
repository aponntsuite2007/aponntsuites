/**
 * OFFBOARDING NOTIFICATION SERVICE
 * Maneja todas las notificaciones del proceso de baja de empresa.
 * Usa NotificationCentralExchange (NCE) como canal.
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class OffboardingNotificationService {

  constructor() {
    this.NCE = null;
  }

  /**
   * Inicializa con referencia al NCE (lazy-loaded para evitar circular deps)
   */
  _getNCE() {
    if (!this.NCE) {
      try {
        this.NCE = require('./NotificationCentralExchange');
      } catch (e) {
        console.warn('⚠️ [OffboardingNotif] NCE no disponible, notificaciones deshabilitadas');
        this.NCE = { send: async () => ({ success: false, reason: 'NCE not available' }) };
      }
    }
    return this.NCE;
  }

  /**
   * 1. WARNING: Factura vencida > 30 días - Primer aviso al cliente
   */
  async notifyInvoiceOverdueWarning(companyId, invoiceData) {
    const company = await this._getCompanyInfo(companyId);
    const NCE = this._getNCE();

    const daysOverdue = invoiceData.days_overdue || 30;
    const graceDeadline = invoiceData.grace_deadline;

    return NCE.send({
      companyId,
      module: 'offboarding',
      workflowKey: 'offboarding.invoice_overdue_warning',
      originType: 'invoice',
      originId: invoiceData.invoice_id,

      recipientType: 'email',
      recipientId: company.contact_email || company.fallback_notification_email,

      title: `⚠️ Aviso: Factura ${invoiceData.invoice_number} vencida - Acción requerida`,
      message: this._renderWarningMessage(company, invoiceData, daysOverdue, graceDeadline),
      shortMessage: `Factura ${invoiceData.invoice_number} vencida hace ${daysOverdue} días. Regularice dentro de 7 días hábiles.`,

      metadata: {
        workflow: 'offboarding',
        phase: 'WARNING',
        invoice_id: invoiceData.invoice_id,
        days_overdue: daysOverdue,
        grace_deadline: graceDeadline,
        company_name: company.name
      },

      priority: 'high',
      channels: ['email', 'whatsapp'],
      requiresAction: true,
      slaHours: 168 // 7 días
    });
  }

  /**
   * 2. GRACE REMINDER: Recordatorio día 5 de 7 del grace period
   */
  async notifyGracePeriodReminder(companyId, invoiceData) {
    const company = await this._getCompanyInfo(companyId);
    const NCE = this._getNCE();

    return NCE.send({
      companyId,
      module: 'offboarding',
      workflowKey: 'offboarding.grace_period_reminder',
      originType: 'invoice',
      originId: invoiceData.invoice_id,

      recipientType: 'email',
      recipientId: company.contact_email || company.fallback_notification_email,

      title: `🔴 URGENTE: Quedan 2 días para regularizar factura ${invoiceData.invoice_number}`,
      message: this._renderReminderMessage(company, invoiceData),
      shortMessage: `URGENTE: 2 días restantes para regularizar factura ${invoiceData.invoice_number}. Luego se procederá con la baja.`,

      metadata: {
        workflow: 'offboarding',
        phase: 'GRACE_REMINDER',
        invoice_id: invoiceData.invoice_id,
        company_name: company.name
      },

      priority: 'urgent',
      channels: ['email', 'whatsapp'],
      requiresAction: true,
      slaHours: 48
    });
  }

  /**
   * 3. EXPORT STARTED: Notificar al staff Aponnt que comenzó la exportación
   */
  async notifyExportStarted(companyId) {
    const company = await this._getCompanyInfo(companyId);
    const NCE = this._getNCE();

    return NCE.send({
      companyId,
      module: 'offboarding',
      workflowKey: 'offboarding.export_started',
      originType: 'offboarding_process',
      originId: companyId,

      recipientType: 'role',
      recipientId: 'gerente',

      title: `📦 Exportación de datos iniciada: ${company.name}`,
      message: `Se inició la exportación de datos operacionales de la empresa "${company.name}" (ID: ${companyId}). Será notificado cuando esté lista para revisión.`,

      metadata: {
        workflow: 'offboarding',
        phase: 'EXPORT_STARTED',
        company_name: company.name
      },

      priority: 'normal',
      channels: ['inbox']
    });
  }

  /**
   * 4. EXPORT READY (cliente): Datos exportados, link de descarga
   */
  async notifyExportReadyClient(companyId, exportData) {
    const company = await this._getCompanyInfo(companyId);
    const NCE = this._getNCE();

    return NCE.send({
      companyId,
      module: 'offboarding',
      workflowKey: 'offboarding.export_ready_client',
      originType: 'data_export',
      originId: companyId,

      recipientType: 'email',
      recipientId: company.contact_email || company.fallback_notification_email,

      title: `📦 Sus datos están listos para descarga - ${company.name}`,
      message: this._renderExportReadyClientMessage(company, exportData),
      shortMessage: `Sus datos han sido exportados. Acceda al link para descargarlos.`,

      metadata: {
        workflow: 'offboarding',
        phase: 'EXPORT_READY_CLIENT',
        drive_url: exportData.driveUrl,
        total_records: exportData.totalRecords,
        size_mb: exportData.sizeMB,
        company_name: company.name
      },

      priority: 'high',
      channels: ['email']
    });
  }

  /**
   * 5. EXPORT READY (admin): Notificar a gerentes que el export está listo
   */
  async notifyExportReadyAdmin(companyId, exportData) {
    const company = await this._getCompanyInfo(companyId);
    const NCE = this._getNCE();

    return NCE.send({
      companyId,
      module: 'offboarding',
      workflowKey: 'offboarding.export_ready_admin',
      originType: 'data_export',
      originId: companyId,

      recipientType: 'role',
      recipientId: 'gerente',

      title: `✅ Export listo: ${company.name} - Pendiente confirmación de baja`,
      message: `La exportación de datos de "${company.name}" está completa.\n\n` +
        `📊 Registros: ${exportData.totalRecords}\n` +
        `📦 Tamaño: ${exportData.sizeMB} MB\n` +
        `🔗 Drive: ${exportData.driveUrl}\n\n` +
        `Para confirmar la baja definitiva, ingrese al Panel Administrativo → Empresas → ${company.name} → Baja.`,

      metadata: {
        workflow: 'offboarding',
        phase: 'EXPORT_READY_ADMIN',
        company_name: company.name,
        total_records: exportData.totalRecords
      },

      priority: 'high',
      channels: ['inbox', 'email']
    });
  }

  /**
   * 6. BAJA CONFIRMED (cliente): Confirmación de baja enviada al cliente
   */
  async notifyBajaConfirmedClient(companyId, bajaData) {
    const company = await this._getCompanyInfo(companyId);
    const NCE = this._getNCE();

    return NCE.send({
      companyId,
      module: 'offboarding',
      workflowKey: 'offboarding.baja_confirmed_client',
      originType: 'offboarding_process',
      originId: companyId,

      recipientType: 'email',
      recipientId: company.contact_email || company.fallback_notification_email,

      title: `Confirmación de baja - ${company.name}`,
      message: this._renderBajaConfirmedClientMessage(company, bajaData),

      metadata: {
        workflow: 'offboarding',
        phase: 'BAJA_CONFIRMED',
        company_name: company.name,
        confirmed_by: bajaData.confirmedBy,
        drive_url: bajaData.driveUrl
      },

      priority: 'medium',
      channels: ['email']
    });
  }

  /**
   * 7. BAJA CONFIRMED (internal): Broadcast a admins/gerentes
   */
  async notifyBajaConfirmedInternal(companyId, bajaData) {
    const company = await this._getCompanyInfo(companyId);
    const NCE = this._getNCE();

    return NCE.send({
      companyId,
      module: 'offboarding',
      workflowKey: 'offboarding.baja_confirmed_internal',
      originType: 'offboarding_process',
      originId: companyId,

      recipientType: 'role',
      recipientId: 'admin_aponnt',

      title: `🔴 Empresa dada de baja: ${company.name}`,
      message: `La empresa "${company.name}" (ID: ${companyId}) ha sido dada de baja definitiva.\n\n` +
        `👤 Confirmado por: Staff ID ${bajaData.confirmedBy}\n` +
        `📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n` +
        `📊 Registros eliminados: ${bajaData.totalDeleted || 'N/A'}\n` +
        `💡 Razón: ${bajaData.reason || 'Factura impaga > 30 días'}\n\n` +
        `Los datos administrativos (facturas, contratos, pagos) se conservan en el sistema.`,

      metadata: {
        workflow: 'offboarding',
        phase: 'BAJA_CONFIRMED_INTERNAL',
        company_name: company.name,
        total_deleted: bajaData.totalDeleted
      },

      priority: 'normal',
      channels: ['inbox']
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════

  async _getCompanyInfo(companyId) {
    const [company] = await sequelize.query(
      `SELECT company_id, name, slug, contact_email, fallback_notification_email,
              fallback_notification_whatsapp, phone, tax_id
       FROM companies WHERE company_id = :companyId`,
      { replacements: { companyId }, type: QueryTypes.SELECT }
    );
    if (!company) throw new Error(`Empresa ${companyId} no encontrada`);
    return company;
  }

  _renderWarningMessage(company, invoiceData, daysOverdue, graceDeadline) {
    return `Estimado/a cliente de ${company.name},

Le informamos que la factura #${invoiceData.invoice_number} se encuentra vencida hace ${daysOverdue} días corridos.

📋 Detalles de la factura:
- Número: ${invoiceData.invoice_number}
- Monto: $${invoiceData.amount}
- Fecha de vencimiento original: ${invoiceData.due_date}
- Días de mora: ${daysOverdue}

⚠️ Acción requerida:
De acuerdo con nuestros términos de servicio, si la factura no es regularizada dentro de los próximos 7 días hábiles (hasta el ${graceDeadline}), se procederá con el siguiente proceso:

1. Se exportarán todos sus datos operacionales a un archivo compactado
2. Se subirá dicho archivo a un Drive al cual tendrá acceso
3. Se procederá a la baja definitiva de su cuenta y liberación de recursos

Para regularizar su situación, por favor proceda al pago de la factura mencionada.

Si ya realizó el pago, por favor ignore este mensaje o contáctenos para actualizar el estado.

Atentamente,
Equipo de Administración`;
  }

  _renderReminderMessage(company, invoiceData) {
    return `AVISO URGENTE - ${company.name}

Le recordamos que quedan SOLO 2 DÍAS HÁBILES para regularizar la factura #${invoiceData.invoice_number} por $${invoiceData.amount}.

Si no se recibe el pago, se procederá con:
1. Exportación de sus datos
2. Baja definitiva de su cuenta

Para evitar la interrupción del servicio, regularice su situación a la brevedad.

Atentamente,
Equipo de Administración`;
  }

  _renderExportReadyClientMessage(company, exportData) {
    return `Estimado/a cliente de ${company.name},

Debido a la falta de regularización de su factura pendiente, hemos procedido a exportar todos sus datos operacionales.

📦 Detalles de la exportación:
- Registros exportados: ${exportData.totalRecords}
- Tamaño del archivo: ${exportData.sizeMB} MB
- Formato: ZIP (JSON)

🔗 Acceda a sus datos en el siguiente enlace:
${exportData.driveUrl}

⚠️ IMPORTANTE:
- El archivo estará disponible por 90 días
- Luego del período de retención, será eliminado del Drive
- Su cuenta será dada de baja una vez que un gerente confirme el proceso

Si desea revertir este proceso, contacte a nuestro equipo de soporte inmediatamente y regularice su factura pendiente.

Atentamente,
Equipo de Administración`;
  }

  _renderBajaConfirmedClientMessage(company, bajaData) {
    return `Estimado/a cliente de ${company.name},

Le confirmamos que su cuenta ha sido dada de baja definitiva en nuestro sistema.

📋 Detalles:
- Fecha de baja: ${new Date().toLocaleDateString('es-AR')}
- Razón: ${bajaData.reason || 'Factura impaga superior a 30 días'}

📦 Sus datos:
${bajaData.driveUrl ? `Sus datos exportados están disponibles en: ${bajaData.driveUrl}\nEl archivo estará disponible por 90 días.` : 'Sus datos fueron previamente exportados y notificados.'}

📌 Datos conservados:
Los datos administrativos (facturas, contratos, pagos) se conservan en nuestro sistema por obligaciones legales y fiscales.

Si tiene alguna consulta sobre este proceso, no dude en contactarnos.

Atentamente,
Equipo de Administración`;
  }
}

module.exports = new OffboardingNotificationService();
