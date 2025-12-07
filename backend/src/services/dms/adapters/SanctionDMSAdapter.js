'use strict';

/**
 * ADAPTER: Sanciones → DMS
 *
 * Este adaptador maneja el flujo documental de sanciones:
 * 1. RRHH crea notificación de sanción → documento generado automáticamente
 * 2. Empleado sube descargo → requiere validación de RRHH
 * 3. RRHH emite resolución → documento final
 * 4. Empleado puede apelar → requiere validación
 */

class SanctionDMSAdapter {
  constructor(dmsIntegrationService) {
    this.dms = dmsIntegrationService;
    this.MODULE = 'sanctions';
  }

  /**
   * Registrar notificación de sanción (creada por RRHH)
   */
  async registerNotification(params) {
    const {
      sanctionId,
      companyId,
      employeeId,
      createdById,
      file,
      sanctionType,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'notification',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'sanction',
      sourceEntityId: sanctionId,
      file,
      title: `Notificación de Sanción #${sanctionId}`,
      metadata: {
        ...metadata,
        sanctionType,
        notificationDate: new Date().toISOString()
      }
    });
  }

  /**
   * Registrar descargo del empleado (REQUIERE VALIDACIÓN)
   * El empleado sube su descargo, pero NO impacta el expediente hasta que RRHH valide
   */
  async registerDescargo(params) {
    const {
      sanctionId,
      companyId,
      employeeId,
      file,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'descargo', // requiresValidation: true en config
      companyId,
      employeeId,
      createdById: employeeId, // El empleado lo sube
      sourceEntityType: 'sanction',
      sourceEntityId: sanctionId,
      file,
      title: `Descargo - Sanción #${sanctionId}`,
      description: 'Descargo presentado por el empleado - Pendiente de validación',
      metadata: {
        ...metadata,
        submittedAt: new Date().toISOString(),
        requiresHRValidation: true
      }
    });
  }

  /**
   * Registrar resolución de sanción (emitida por RRHH)
   */
  async registerResolution(params) {
    const {
      sanctionId,
      companyId,
      employeeId,
      resolvedById,
      file,
      resolution, // 'applied' | 'reduced' | 'dismissed'
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'resolution',
      companyId,
      employeeId,
      createdById: resolvedById,
      sourceEntityType: 'sanction',
      sourceEntityId: sanctionId,
      file,
      title: `Resolución de Sanción #${sanctionId}`,
      metadata: {
        ...metadata,
        resolution,
        resolvedBy: resolvedById,
        resolvedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Registrar apelación del empleado (REQUIERE VALIDACIÓN)
   */
  async registerAppeal(params) {
    const {
      sanctionId,
      companyId,
      employeeId,
      file,
      appealReason,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'appeal', // requiresValidation: true en config
      companyId,
      employeeId,
      createdById: employeeId,
      sourceEntityType: 'sanction',
      sourceEntityId: sanctionId,
      file,
      title: `Apelación - Sanción #${sanctionId}`,
      description: appealReason,
      metadata: {
        ...metadata,
        appealedAt: new Date().toISOString(),
        requiresHRValidation: true
      }
    });
  }

  /**
   * Solicitar descargo al empleado (crea thread de notificaciones)
   */
  async requestDescargoFromEmployee(params) {
    const {
      sanctionId,
      companyId,
      employeeId,
      employeeName,
      requestedById,
      requestedByName,
      dueDate,
      sanctionDetails
    } = params;

    return this.dms.requestDocumentFromEmployee({
      module: this.MODULE,
      documentType: 'descargo',
      companyId,
      employeeId,
      employeeName,
      requestedById,
      requestedByName,
      sourceEntityType: 'sanction',
      sourceEntityId: sanctionId,
      dueDate,
      priority: 'high',
      description: `Se le ha notificado una sanción. Tiene hasta ${dueDate} para presentar su descargo.\n\nDetalle: ${sanctionDetails}`,
      notifyChannels: ['in_app', 'push', 'email']
    });
  }

  /**
   * Obtener todos los documentos de una sanción
   */
  async getSanctionDocuments(companyId, sanctionId) {
    return this.dms.getEntityDocuments({
      companyId,
      sourceEntityType: 'sanction',
      sourceEntityId: sanctionId
    });
  }

  /**
   * Obtener historial de sanciones documentadas de un empleado
   */
  async getEmployeeSanctionDocuments(companyId, employeeId, options = {}) {
    return this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.MODULE,
      documentType: options.documentType,
      status: options.status,
      limit: options.limit || 50
    });
  }
}

module.exports = SanctionDMSAdapter;
