'use strict';

/**
 * ADAPTER: Legal/Comunicaciones → DMS
 *
 * Este adaptador maneja:
 * - Comunicaciones legales (notificaciones, memos, circulares)
 * - Acuses de recibo
 * - Contratos y adendas
 * - Documentos de compliance
 */

class LegalDMSAdapter {
  constructor(dmsIntegrationService) {
    this.dms = dmsIntegrationService;
    this.MODULE = 'legal-communications';
    this.CONTRACT_MODULE = 'contracts';
  }

  // ==========================================
  // COMUNICACIONES LEGALES
  // ==========================================

  /**
   * Registrar notificación legal
   */
  async registerNotification(params) {
    const {
      communicationId,
      companyId,
      employeeId,
      createdById,
      file,
      notificationType, // 'warning' | 'policy_change' | 'mandatory' | 'general'
      title,
      requiresAcknowledgment = true,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'notification',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'legal_communication',
      sourceEntityId: communicationId,
      file,
      title: title || `Notificación Legal #${communicationId}`,
      metadata: {
        ...metadata,
        notificationType,
        requiresAcknowledgment,
        sentAt: new Date().toISOString()
      }
    });
  }

  /**
   * Registrar acuse de recibo (REQUIERE VALIDACIÓN)
   * El empleado firma/acepta la comunicación
   */
  async registerAcknowledgment(params) {
    const {
      communicationId,
      companyId,
      employeeId,
      file,
      signatureData,
      ipAddress,
      userAgent,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'acknowledgment', // requiresValidation: true
      companyId,
      employeeId,
      createdById: employeeId,
      sourceEntityType: 'legal_acknowledgment',
      sourceEntityId: `ack_${communicationId}_${employeeId}`,
      file,
      title: `Acuse de Recibo - Comunicación #${communicationId}`,
      metadata: {
        ...metadata,
        originalCommunicationId: communicationId,
        signatureData: signatureData ? '[SIGNATURE_CAPTURED]' : null,
        acknowledgedAt: new Date().toISOString(),
        ipAddress,
        userAgent,
        legallyBinding: true
      }
    });
  }

  /**
   * Registrar memo o circular
   */
  async registerMemo(params) {
    const {
      memoId,
      companyId,
      createdById,
      file,
      memoType, // 'memo' | 'circular' | 'policy'
      title,
      targetAudience, // 'all' | 'department' | 'specific'
      targetIds, // Array de IDs según targetAudience
      effectiveDate,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: memoType === 'circular' ? 'circular' : 'memo',
      companyId,
      employeeId: null, // Documento corporativo
      createdById,
      sourceEntityType: 'corporate_memo',
      sourceEntityId: memoId,
      file,
      title,
      metadata: {
        ...metadata,
        memoType,
        targetAudience,
        targetIds,
        effectiveDate,
        publishedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Solicitar acuse de recibo a empleado
   */
  async requestAcknowledgmentFromEmployee(params) {
    const {
      communicationId,
      companyId,
      employeeId,
      employeeName,
      requestedById,
      requestedByName,
      dueDate,
      communicationTitle
    } = params;

    return this.dms.requestDocumentFromEmployee({
      module: this.MODULE,
      documentType: 'acknowledgment',
      companyId,
      employeeId,
      employeeName,
      requestedById,
      requestedByName,
      sourceEntityType: 'legal_communication',
      sourceEntityId: communicationId,
      dueDate,
      priority: 'high',
      description: `Se requiere su acuse de recibo para la comunicación: "${communicationTitle}".\n\nEsta es una notificación de carácter legal.`,
      notifyChannels: ['in_app', 'push', 'email']
    });
  }

  // ==========================================
  // CONTRATOS
  // ==========================================

  /**
   * Registrar contrato laboral
   */
  async registerContract(params) {
    const {
      contractId,
      companyId,
      employeeId,
      createdById,
      file,
      contractType, // 'initial' | 'amendment' | 'termination' | 'confidentiality'
      startDate,
      endDate,
      position,
      salary,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.CONTRACT_MODULE,
      documentType: contractType,
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'employment_contract',
      sourceEntityId: contractId,
      file,
      title: this._getContractTitle(contractType, employeeId),
      expirationDate: endDate,
      metadata: {
        ...metadata,
        contractType,
        startDate,
        endDate,
        position,
        salary: salary ? '[CONFIDENTIAL]' : null,
        signedAt: new Date().toISOString(),
        isLegalDocument: true
      }
    });
  }

  /**
   * Registrar NDA / Acuerdo de confidencialidad
   */
  async registerNDA(params) {
    const {
      ndaId,
      companyId,
      employeeId,
      file,
      ndaType, // 'standard' | 'project' | 'departure'
      effectiveDate,
      duration, // En años
      metadata = {}
    } = params;

    const expirationDate = new Date(effectiveDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + (duration || 999));

    return this.dms.registerDocument({
      module: this.CONTRACT_MODULE,
      documentType: 'confidentiality', // requiresValidation: true
      companyId,
      employeeId,
      createdById: employeeId,
      sourceEntityType: 'nda_agreement',
      sourceEntityId: ndaId,
      file,
      title: `Acuerdo de Confidencialidad - ${ndaType}`,
      expirationDate,
      metadata: {
        ...metadata,
        ndaType,
        effectiveDate,
        duration,
        signedAt: new Date().toISOString(),
        isLegalDocument: true
      }
    });
  }

  // ==========================================
  // CONSULTAS
  // ==========================================

  /**
   * Obtener contratos de un empleado
   */
  async getEmployeeContracts(companyId, employeeId, options = {}) {
    return this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.CONTRACT_MODULE,
      documentType: options.contractType,
      status: options.status,
      limit: options.limit || 50
    });
  }

  /**
   * Obtener comunicaciones legales de un empleado
   */
  async getEmployeeLegalCommunications(companyId, employeeId, options = {}) {
    return this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.MODULE,
      status: options.status,
      limit: options.limit || 100
    });
  }

  /**
   * Verificar si empleado tiene contrato vigente
   */
  async hasActiveContract(companyId, employeeId) {
    const contracts = await this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.CONTRACT_MODULE,
      documentType: 'initial',
      status: 'active',
      limit: 1
    });

    if (contracts.length === 0) {
      return { hasContract: false };
    }

    const contract = contracts[0];
    return {
      hasContract: true,
      documentId: contract.id,
      startDate: contract.metadata?.startDate,
      endDate: contract.expiration_date,
      position: contract.metadata?.position
    };
  }

  /**
   * Obtener acuses de recibo pendientes para un empleado
   */
  async getPendingAcknowledgments(companyId, employeeId) {
    const { Document, DocumentRequest } = this.dms.models;
    const { Op } = require('sequelize');

    // Buscar solicitudes de acuse pendientes
    const pendingRequests = await DocumentRequest.findAll({
      where: {
        company_id: companyId,
        requested_from_id: employeeId,
        type_code: 'LEGAL_ACKNOWLEDGMENT',
        status: {
          [Op.in]: ['pending', 'overdue']
        }
      },
      order: [['due_date', 'ASC']]
    });

    return pendingRequests;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  _getContractTitle(type, employeeId) {
    const titles = {
      'initial': `Contrato de Trabajo - Empleado ${employeeId}`,
      'amendment': `Adenda Contractual - Empleado ${employeeId}`,
      'termination': `Finiquito - Empleado ${employeeId}`,
      'confidentiality': `Acuerdo de Confidencialidad - Empleado ${employeeId}`
    };
    return titles[type] || `Documento Contractual - ${employeeId}`;
  }
}

module.exports = LegalDMSAdapter;
