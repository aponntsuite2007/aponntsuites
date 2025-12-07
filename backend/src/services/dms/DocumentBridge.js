'use strict';

/**
 * DOCUMENT BRIDGE
 *
 * Este puente facilita la integración de módulos existentes con el DMS.
 * Proporciona una API simplificada que oculta la complejidad del DMS.
 *
 * =====================================================
 * CÓMO USAR EN UN MÓDULO EXISTENTE
 * =====================================================
 *
 * EJEMPLO 1: En un servicio de vacaciones
 *
 *   const DocumentBridge = require('../services/dms/DocumentBridge');
 *
 *   class VacationService {
 *     constructor(deps) {
 *       this.documentBridge = new DocumentBridge(deps.dmsServices, 'vacation');
 *     }
 *
 *     async approveVacation(vacationId, approvedBy, pdfBuffer) {
 *       // ... lógica de aprobación ...
 *
 *       // Registrar documento en DMS
 *       await this.documentBridge.save({
 *         type: 'approval',
 *         entityId: vacationId,
 *         employeeId: vacation.employee_id,
 *         file: { buffer: pdfBuffer, originalname: 'aprobacion.pdf', mimetype: 'application/pdf' },
 *         createdBy: approvedBy
 *       });
 *     }
 *   }
 *
 * EJEMPLO 2: En un servicio de sanciones (con validación)
 *
 *   async processSanction(sanctionId, employeeId) {
 *     // Solicitar descargo al empleado (le llegará notificación)
 *     await this.documentBridge.requestFromEmployee({
 *       type: 'descargo',
 *       entityId: sanctionId,
 *       employeeId,
 *       dueDate: '2025-12-15',
 *       message: 'Tiene 5 días para presentar su descargo'
 *     });
 *   }
 *
 * EJEMPLO 3: Verificar si documento está validado
 *
 *   async canProcessAbsence(absenceId, employeeId) {
 *     const { validated } = await this.documentBridge.isValidated(
 *       certificateDocumentId
 *     );
 *
 *     if (!validated) {
 *       throw new Error('El certificado médico aún no ha sido validado por RRHH');
 *     }
 *   }
 */

class DocumentBridge {
  /**
   * @param {Object} dmsServices - Servicios DMS (del initDMSServices)
   * @param {string} moduleName - Nombre del módulo (vacation, sanction, medical, etc.)
   */
  constructor(dmsServices, moduleName) {
    this.integration = dmsServices.integrationService;
    this.adapters = dmsServices.adapters;
    this.moduleName = moduleName;

    // Obtener el adaptador correcto
    this.adapter = this.adapters[moduleName];
    if (!this.adapter) {
      // Fallback al integration service directo
      console.warn(`[DocumentBridge] No hay adaptador para ${moduleName}, usando integration service directo`);
    }
  }

  /**
   * Guardar un documento
   *
   * @param {Object} params
   * @param {string} params.type - Tipo de documento (request, approval, certificate, etc.)
   * @param {number|string} params.entityId - ID de la entidad origen (vacationId, sanctionId, etc.)
   * @param {number} params.employeeId - ID del empleado relacionado
   * @param {number} params.createdBy - ID del usuario que crea
   * @param {Object} params.file - Objeto del archivo (buffer, originalname, mimetype)
   * @param {Object} [params.metadata] - Metadata adicional
   */
  async save(params) {
    const {
      type,
      entityId,
      employeeId,
      createdBy,
      file,
      title,
      description,
      expirationDate,
      metadata = {}
    } = params;

    // Usar integration service directamente
    return this.integration.registerDocument({
      module: this.moduleName,
      documentType: type,
      companyId: metadata.companyId || params.companyId,
      employeeId,
      createdById: createdBy,
      sourceEntityType: `${this.moduleName}_${type}`,
      sourceEntityId: entityId,
      file,
      title,
      description,
      expirationDate,
      metadata
    });
  }

  /**
   * Solicitar documento a un empleado
   * Crea solicitud + notificación con thread
   */
  async requestFromEmployee(params) {
    const {
      type,
      entityId,
      companyId,
      employeeId,
      employeeName,
      requestedBy,
      requestedByName,
      dueDate,
      priority = 'medium',
      message
    } = params;

    return this.integration.requestDocumentFromEmployee({
      module: this.moduleName,
      documentType: type,
      companyId,
      employeeId,
      employeeName,
      requestedById: requestedBy,
      requestedByName,
      sourceEntityType: `${this.moduleName}_${type}`,
      sourceEntityId: entityId,
      dueDate,
      priority,
      description: message
    });
  }

  /**
   * Obtener documentos de una entidad
   */
  async getEntityDocuments(companyId, entityId) {
    return this.integration.getEntityDocuments({
      companyId,
      sourceEntityType: `${this.moduleName}`,
      sourceEntityId: entityId
    });
  }

  /**
   * Obtener documentos de un empleado en este módulo
   */
  async getEmployeeDocuments(companyId, employeeId, options = {}) {
    return this.integration.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.moduleName,
      documentType: options.type,
      status: options.status,
      limit: options.limit
    });
  }

  /**
   * Verificar si documento está validado
   */
  async isValidated(documentId, companyId) {
    return this.integration.isDocumentValidated(documentId, companyId);
  }

  /**
   * Vincular documento existente a una entidad
   */
  async linkDocument(params) {
    const { documentId, companyId, entityId, linkedBy } = params;

    return this.integration.linkDocumentToEntity({
      documentId,
      companyId,
      sourceEntityType: `${this.moduleName}`,
      sourceEntityId: entityId,
      linkedById: linkedBy
    });
  }

  /**
   * Obtener dashboard de documentos para expediente 360
   */
  async getEmployeeDashboard(companyId, employeeId) {
    return this.integration.getEmployeeDocumentsDashboard(companyId, employeeId);
  }
}

/**
 * Factory function para crear bridge pre-configurado
 */
function createBridge(dmsServices, moduleName) {
  return new DocumentBridge(dmsServices, moduleName);
}

/**
 * Crear bridges para todos los módulos
 */
function createAllBridges(dmsServices) {
  return {
    vacation: new DocumentBridge(dmsServices, 'vacations'),
    sanction: new DocumentBridge(dmsServices, 'sanctions'),
    medical: new DocumentBridge(dmsServices, 'medical'),
    occupationalHealth: new DocumentBridge(dmsServices, 'occupational-health'),
    training: new DocumentBridge(dmsServices, 'training'),
    legal: new DocumentBridge(dmsServices, 'legal-communications'),
    contracts: new DocumentBridge(dmsServices, 'contracts'),
    payroll: new DocumentBridge(dmsServices, 'payroll'),
    evaluations: new DocumentBridge(dmsServices, 'evaluations'),
    incidents: new DocumentBridge(dmsServices, 'incidents')
  };
}

module.exports = DocumentBridge;
module.exports.createBridge = createBridge;
module.exports.createAllBridges = createAllBridges;
