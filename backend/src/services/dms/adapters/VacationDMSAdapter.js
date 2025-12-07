'use strict';

/**
 * ADAPTER: Vacaciones → DMS
 *
 * Este adaptador conecta el módulo de vacaciones con el DMS.
 * Todos los documentos de vacaciones (solicitudes, aprobaciones, certificados)
 * se almacenan en el DMS y NO en tablas propias del módulo.
 *
 * Uso desde el módulo de vacaciones:
 *   const vacationDMS = require('./adapters/VacationDMSAdapter');
 *   await vacationDMS.registerRequest(vacationRequestId, file, userId);
 */

class VacationDMSAdapter {
  constructor(dmsIntegrationService) {
    this.dms = dmsIntegrationService;
    this.MODULE = 'vacations';
  }

  /**
   * Registrar solicitud de vacaciones como documento
   */
  async registerRequest(params) {
    const {
      vacationRequestId,
      companyId,
      employeeId,
      createdById,
      file,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'request',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'vacation_request',
      sourceEntityId: vacationRequestId,
      file,
      title: `Solicitud de Vacaciones #${vacationRequestId}`,
      metadata: {
        ...metadata,
        startDate: metadata.startDate,
        endDate: metadata.endDate,
        days: metadata.days
      }
    });
  }

  /**
   * Registrar aprobación de vacaciones
   */
  async registerApproval(params) {
    const {
      vacationRequestId,
      companyId,
      employeeId,
      approvedById,
      file,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'approval',
      companyId,
      employeeId,
      createdById: approvedById,
      sourceEntityType: 'vacation_request',
      sourceEntityId: vacationRequestId,
      file,
      title: `Aprobación de Vacaciones #${vacationRequestId}`,
      metadata: {
        ...metadata,
        approvedBy: approvedById,
        approvedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Registrar rechazo de vacaciones
   */
  async registerRejection(params) {
    const {
      vacationRequestId,
      companyId,
      employeeId,
      rejectedById,
      file,
      rejectionReason,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'rejection',
      companyId,
      employeeId,
      createdById: rejectedById,
      sourceEntityType: 'vacation_request',
      sourceEntityId: vacationRequestId,
      file,
      title: `Rechazo de Vacaciones #${vacationRequestId}`,
      metadata: {
        ...metadata,
        rejectedBy: rejectedById,
        rejectionReason,
        rejectedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Registrar certificado de vacaciones (PDF generado)
   */
  async registerCertificate(params) {
    const {
      vacationRequestId,
      companyId,
      employeeId,
      createdById,
      file,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'certificate',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'vacation_request',
      sourceEntityId: vacationRequestId,
      file,
      title: `Certificado de Vacaciones #${vacationRequestId}`,
      metadata: {
        ...metadata,
        certificateType: 'vacation_period'
      }
    });
  }

  /**
   * Obtener todos los documentos de una solicitud de vacaciones
   */
  async getRequestDocuments(companyId, vacationRequestId) {
    return this.dms.getEntityDocuments({
      companyId,
      sourceEntityType: 'vacation_request',
      sourceEntityId: vacationRequestId
    });
  }

  /**
   * Obtener historial de documentos de vacaciones de un empleado
   */
  async getEmployeeVacationDocuments(companyId, employeeId, options = {}) {
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

module.exports = VacationDMSAdapter;
