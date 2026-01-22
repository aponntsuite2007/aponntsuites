'use strict';

/**
 * DMS INTEGRATION SERVICE
 *
 * FUENTE ÚNICA DE VERDAD - Este servicio es el PUENTE entre TODOS los módulos
 * del sistema y el DMS. Ningún módulo debe manejar documentos directamente.
 *
 * Módulos integrados:
 * - Vacaciones (solicitudes, aprobaciones)
 * - Sanciones (descargos, resoluciones)
 * - Certificados médicos
 * - Consentimientos informados
 * - Capacitaciones (materiales, certificados, evaluaciones)
 * - Comunicaciones legales
 * - Recibos de sueldo
 * - Contratos laborales
 * - Evaluaciones de desempeño
 * - Incidentes/accidentes
 * - Y TODOS los demás módulos que generen documentos
 *
 * @author Sistema Biométrico
 * @version 2.0.0
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class DMSIntegrationService {
  constructor(options = {}) {
    this.models = options.models;
    this.sequelize = options.sequelize;
    this.documentService = options.documentService;
    this.storageService = options.storageService;
    this.auditService = options.auditService;
    this.workflowService = options.workflowService;
    this.notificationService = options.notificationService;

    // Mapeo de módulos a categorías DMS
    this.MODULE_CATEGORY_MAP = {
      // RRHH
      'vacations': 'RRHH',
      'sanctions': 'LEGAL',
      'contracts': 'LEGAL',
      'payroll': 'RRHH',
      'evaluations': 'RRHH',
      'training': 'TRAINING',
      'onboarding': 'RRHH',
      'offboarding': 'RRHH',

      // Salud Ocupacional
      'medical': 'MEDICAL',
      'occupational-health': 'MEDICAL',
      'incidents': 'MEDICAL',
      'informed-consent': 'MEDICAL',

      // Legal/Compliance
      'legal-communications': 'LEGAL',
      'compliance': 'LEGAL',
      'audit': 'LEGAL',

      // Operaciones
      'attendance': 'OPERACIONES',
      'shifts': 'OPERACIONES',
      'overtime': 'OPERACIONES',

      // Financiero
      'expenses': 'FINANCIERO',
      'benefits': 'FINANCIERO',
      'invoicing': 'FINANCIERO',

      // General
      'communications': 'COMUNICACIONES',
      'announcements': 'COMUNICACIONES',

      // ============ NUEVOS MÓDULOS - MIGRACIÓN DMS SSOT ============
      // Reclutamiento
      'job-postings': 'RRHH',
      'recruitment': 'RRHH',

      // Documentos de Empleados
      'employee-documents': 'RRHH',
      'identity-documents': 'RRHH',

      // Biométrico
      'biometric': 'OPERACIONES',
      'biometric-consent': 'LEGAL',

      // Proveedores
      'suppliers': 'PROVEEDORES',
      'rfq': 'PROVEEDORES',
      'purchase-orders': 'PROVEEDORES',
      'supplier-invoices': 'PROVEEDORES',
      'supplier-messages': 'PROVEEDORES',

      // Genérico
      'general': 'GENERAL',
      'uploads': 'GENERAL'
    };

    // Mapeo de tipos de documento por módulo
    this.MODULE_DOCUMENT_TYPES = {
      // === VACACIONES ===
      'vacations': {
        'request': { typeCode: 'VACATION_REQUEST', requiresValidation: false },
        'approval': { typeCode: 'VACATION_APPROVAL', requiresValidation: false },
        'rejection': { typeCode: 'VACATION_REJECTION', requiresValidation: false },
        'certificate': { typeCode: 'VACATION_CERTIFICATE', requiresValidation: false }
      },

      // === SANCIONES ===
      'sanctions': {
        'notification': { typeCode: 'SANCTION_NOTIFICATION', requiresValidation: false },
        'descargo': { typeCode: 'SANCTION_DESCARGO', requiresValidation: true }, // Empleado sube
        'resolution': { typeCode: 'SANCTION_RESOLUTION', requiresValidation: false },
        'appeal': { typeCode: 'SANCTION_APPEAL', requiresValidation: true }
      },

      // === CONTRATOS ===
      'contracts': {
        'initial': { typeCode: 'CONTRACT_INITIAL', requiresValidation: false },
        'amendment': { typeCode: 'CONTRACT_AMENDMENT', requiresValidation: false },
        'termination': { typeCode: 'CONTRACT_TERMINATION', requiresValidation: false },
        'confidentiality': { typeCode: 'CONTRACT_NDA', requiresValidation: true }
      },

      // === NÓMINA ===
      'payroll': {
        'payslip': { typeCode: 'PAYROLL_PAYSLIP', requiresValidation: false },
        'bonus': { typeCode: 'PAYROLL_BONUS', requiresValidation: false },
        'deduction': { typeCode: 'PAYROLL_DEDUCTION', requiresValidation: false },
        'settlement': { typeCode: 'PAYROLL_SETTLEMENT', requiresValidation: false }
      },

      // === MÉDICO ===
      'medical': {
        'certificate': { typeCode: 'MEDICAL_CERTIFICATE', requiresValidation: true },
        'exam-result': { typeCode: 'MEDICAL_EXAM', requiresValidation: false },
        'prescription': { typeCode: 'MEDICAL_PRESCRIPTION', requiresValidation: true },
        'disability': { typeCode: 'MEDICAL_DISABILITY', requiresValidation: true },
        'fit-note': { typeCode: 'MEDICAL_FIT_NOTE', requiresValidation: false },
        'case-attachment': { typeCode: 'MED_CASE_ATTACHMENT', requiresValidation: false },
        'MED_CASE_ATTACHMENT': { typeCode: 'MED_CASE_ATTACHMENT', requiresValidation: false }
      },

      // === SALUD OCUPACIONAL ===
      'occupational-health': {
        'pre-employment': { typeCode: 'OH_PRE_EMPLOYMENT', requiresValidation: false },
        'periodic': { typeCode: 'OH_PERIODIC', requiresValidation: false },
        'egress': { typeCode: 'OH_EGRESS', requiresValidation: false },
        'special': { typeCode: 'OH_SPECIAL', requiresValidation: false },
        'aptitude': { typeCode: 'OH_APTITUDE', requiresValidation: false }
      },

      // === CONSENTIMIENTO INFORMADO ===
      'informed-consent': {
        'general': { typeCode: 'CONSENT_GENERAL', requiresValidation: false },
        'biometric': { typeCode: 'CONSENT_BIOMETRIC', requiresValidation: false },
        'medical': { typeCode: 'CONSENT_MEDICAL', requiresValidation: false },
        'data-processing': { typeCode: 'CONSENT_DATA', requiresValidation: false }
      },

      // === CAPACITACIONES ===
      'training': {
        'material': { typeCode: 'TRAINING_MATERIAL', requiresValidation: false },
        'certificate': { typeCode: 'TRAINING_CERTIFICATE', requiresValidation: false },
        'evaluation': { typeCode: 'TRAINING_EVALUATION', requiresValidation: false },
        'attendance': { typeCode: 'TRAINING_ATTENDANCE', requiresValidation: false }
      },

      // === INCIDENTES ===
      'incidents': {
        'report': { typeCode: 'INCIDENT_REPORT', requiresValidation: false },
        'investigation': { typeCode: 'INCIDENT_INVESTIGATION', requiresValidation: false },
        'evidence': { typeCode: 'INCIDENT_EVIDENCE', requiresValidation: true },
        'witness-statement': { typeCode: 'INCIDENT_WITNESS', requiresValidation: true }
      },

      // === COMUNICACIONES LEGALES ===
      'legal-communications': {
        'notification': { typeCode: 'LEGAL_NOTIFICATION', requiresValidation: false },
        'acknowledgment': { typeCode: 'LEGAL_ACKNOWLEDGMENT', requiresValidation: true },
        'warning': { typeCode: 'LEGAL_WARNING', requiresValidation: false },
        'memo': { typeCode: 'LEGAL_MEMO', requiresValidation: false }
      },

      // === EVALUACIONES ===
      'evaluations': {
        'performance': { typeCode: 'EVAL_PERFORMANCE', requiresValidation: false },
        'self-assessment': { typeCode: 'EVAL_SELF', requiresValidation: true },
        'goals': { typeCode: 'EVAL_GOALS', requiresValidation: false },
        'feedback': { typeCode: 'EVAL_FEEDBACK', requiresValidation: false }
      },

      // === COMUNICACIONES GENERALES ===
      'communications': {
        'announcement': { typeCode: 'COMM_ANNOUNCEMENT', requiresValidation: false },
        'memo': { typeCode: 'COMM_MEMO', requiresValidation: false },
        'circular': { typeCode: 'COMM_CIRCULAR', requiresValidation: false }
      },

      // ============ NUEVOS MÓDULOS - MIGRACIÓN DMS SSOT ============

      // === RECLUTAMIENTO / JOB POSTINGS ===
      'job-postings': {
        'cv': { typeCode: 'RECRUIT_CV', requiresValidation: false },
        'cover-letter': { typeCode: 'RECRUIT_COVER_LETTER', requiresValidation: false },
        'portfolio': { typeCode: 'RECRUIT_PORTFOLIO', requiresValidation: false },
        'reference-letter': { typeCode: 'RECRUIT_REFERENCE', requiresValidation: false }
      },
      'recruitment': {
        'cv': { typeCode: 'RECRUIT_CV', requiresValidation: false },
        'application': { typeCode: 'RECRUIT_APPLICATION', requiresValidation: false },
        'interview-notes': { typeCode: 'RECRUIT_INTERVIEW', requiresValidation: false },
        'offer-letter': { typeCode: 'RECRUIT_OFFER', requiresValidation: false }
      },

      // === DOCUMENTOS DE EMPLEADOS ===
      'employee-documents': {
        'PROFILE_PHOTO': { typeCode: 'EMP_PROFILE_PHOTO', requiresValidation: false },
        'EMPLOYEE_DOC': { typeCode: 'EMP_GENERAL', requiresValidation: false },
        'dni': { typeCode: 'EMP_DNI', requiresValidation: false },
        'dni-front': { typeCode: 'EMP_DNI_FRONT', requiresValidation: false },
        'dni-back': { typeCode: 'EMP_DNI_BACK', requiresValidation: false },
        'passport': { typeCode: 'EMP_PASSPORT', requiresValidation: false },
        'visa': { typeCode: 'EMP_VISA', requiresValidation: false },
        'license': { typeCode: 'EMP_LICENSE', requiresValidation: false },
        'certificate': { typeCode: 'EMP_CERTIFICATE', requiresValidation: false },
        'insurance': { typeCode: 'EMP_INSURANCE', requiresValidation: false },
        'general': { typeCode: 'EMP_GENERAL', requiresValidation: false }
      },
      'identity-documents': {
        'dni': { typeCode: 'ID_DNI', requiresValidation: false },
        'passport': { typeCode: 'ID_PASSPORT', requiresValidation: false },
        'driver-license': { typeCode: 'ID_DRIVER_LICENSE', requiresValidation: false }
      },

      // === BIOMÉTRICO ===
      'biometric': {
        'photo': { typeCode: 'BIO_PHOTO', requiresValidation: false },
        'face-enrollment': { typeCode: 'BIO_FACE_ENROLL', requiresValidation: false },
        'fingerprint': { typeCode: 'BIO_FINGERPRINT', requiresValidation: false },
        'attendance-photo': { typeCode: 'BIO_ATTENDANCE_PHOTO', requiresValidation: false }
      },
      'biometric-consent': {
        'acceptance': { typeCode: 'BIO_CONSENT_ACCEPT', requiresValidation: false },
        'rejection': { typeCode: 'BIO_CONSENT_REJECT', requiresValidation: false }
      },

      // === PROVEEDORES ===
      'suppliers': {
        'document': { typeCode: 'SUPP_DOC', requiresValidation: false },
        'certification': { typeCode: 'SUPP_CERT', requiresValidation: false },
        'contract': { typeCode: 'SUPP_CONTRACT', requiresValidation: false }
      },
      'rfq': {
        'attachment': { typeCode: 'RFQ_ATTACHMENT', requiresValidation: false },
        'technical-spec': { typeCode: 'RFQ_TECH_SPEC', requiresValidation: false },
        'drawing': { typeCode: 'RFQ_DRAWING', requiresValidation: false },
        'quote': { typeCode: 'RFQ_QUOTE', requiresValidation: false }
      },
      'purchase-orders': {
        'attachment': { typeCode: 'PO_ATTACHMENT', requiresValidation: false },
        'delivery-note': { typeCode: 'PO_DELIVERY_NOTE', requiresValidation: false },
        'quality-report': { typeCode: 'PO_QUALITY_REPORT', requiresValidation: false }
      },
      'supplier-invoices': {
        'invoice': { typeCode: 'SUPP_INVOICE', requiresValidation: true },
        'credit-note': { typeCode: 'SUPP_CREDIT_NOTE', requiresValidation: true },
        'debit-note': { typeCode: 'SUPP_DEBIT_NOTE', requiresValidation: true },
        'remito': { typeCode: 'SUPP_REMITO', requiresValidation: false }
      },
      'supplier-messages': {
        'attachment': { typeCode: 'SUPP_MSG_ATTACHMENT', requiresValidation: false }
      },

      // === FACTURACIÓN / PAGOS ===
      'invoicing': {
        'receipt': { typeCode: 'INV_RECEIPT', requiresValidation: false },
        'payment-proof': { typeCode: 'INV_PAYMENT_PROOF', requiresValidation: false },
        'invoice': { typeCode: 'INV_INVOICE', requiresValidation: false }
      },

      // === GENÉRICO / UPLOADS ===
      'general': {
        'document': { typeCode: 'GEN_DOCUMENT', requiresValidation: false },
        'image': { typeCode: 'GEN_IMAGE', requiresValidation: false },
        'file': { typeCode: 'GEN_FILE', requiresValidation: false }
      },
      'uploads': {
        'licenses': { typeCode: 'UPL_LICENSE', requiresValidation: false },
        'certificates': { typeCode: 'UPL_CERTIFICATE', requiresValidation: false },
        'photos': { typeCode: 'UPL_PHOTO', requiresValidation: false },
        'documents': { typeCode: 'UPL_DOCUMENT', requiresValidation: false },
        'biometric': { typeCode: 'UPL_BIOMETRIC', requiresValidation: false },
        'tasks': { typeCode: 'UPL_TASK', requiresValidation: false },
        'general': { typeCode: 'UPL_GENERAL', requiresValidation: false }
      }
    };

    // Estados de validación
    this.VALIDATION_STATES = {
      NOT_REQUIRED: 'not_required',
      PENDING_UPLOAD: 'pending_upload',
      PENDING_REVIEW: 'pending_review',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      RESUBMIT_REQUIRED: 'resubmit_required'
    };
  }

  /**
   * ========================================================================
   * API PRINCIPAL - Métodos que usan TODOS los módulos
   * ========================================================================
   */

  /**
   * Registrar un documento desde cualquier módulo
   * Este es el método PRINCIPAL que todos los módulos deben usar
   *
   * @param {Object} params
   * @param {string} params.module - Nombre del módulo (vacations, sanctions, etc.)
   * @param {string} params.documentType - Tipo de documento dentro del módulo
   * @param {number} params.companyId - ID de la empresa
   * @param {number} params.employeeId - ID del empleado relacionado (opcional)
   * @param {number} params.createdById - ID del usuario que crea
   * @param {string} params.sourceEntityType - Tipo de entidad origen (vacation_request, sanction, etc.)
   * @param {number} params.sourceEntityId - ID de la entidad origen
   * @param {Buffer|Object} params.file - Archivo (buffer o objeto multer)
   * @param {Object} params.metadata - Metadata adicional del módulo
   * @returns {Object} Documento creado en DMS
   */
  async registerDocument(params) {
    const {
      module,
      documentType,
      companyId,
      employeeId,
      createdById,
      sourceEntityType,
      sourceEntityId,
      file,
      title,
      description,
      metadata = {},
      folderId,
      expirationDate,
      tags = []
    } = params;

    // Validar módulo
    if (!this.MODULE_DOCUMENT_TYPES[module]) {
      throw new Error(`Módulo no soportado: ${module}`);
    }

    // Obtener configuración del tipo de documento
    const typeConfig = this.MODULE_DOCUMENT_TYPES[module][documentType];
    if (!typeConfig) {
      throw new Error(`Tipo de documento no soportado: ${module}/${documentType}`);
    }

    // Obtener categoría
    const categoryCode = this.MODULE_CATEGORY_MAP[module] || 'GENERAL';

    // Generar checksum del archivo
    const fileBuffer = file.buffer || file;
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Determinar estado inicial
    let initialStatus = 'active';
    if (typeConfig.requiresValidation) {
      initialStatus = 'pending_review';
    }

    // Crear documento en DMS
    const { Document, DocumentAccessLog } = this.models;

    // Extraer nombre y extensión del archivo
    const originalFilename = file.originalname || `${module}_${documentType}_${Date.now()}.bin`;
    const fileExtension = originalFilename.includes('.')
      ? originalFilename.split('.').pop().toLowerCase()
      : 'bin';
    const storedFilename = `${require('crypto').randomUUID()}.${fileExtension}`;

    const document = await Document.create({
      company_id: companyId,
      folder_id: folderId || null,
      category_code: categoryCode,
      type_code: typeConfig.typeCode,
      title: title || this._generateTitle(module, documentType, sourceEntityId),
      description: description || '',
      // Campos de archivo corregidos para coincidir con el modelo
      original_filename: originalFilename,
      stored_filename: storedFilename,
      storage_path: '', // Se actualiza después del upload
      file_size_bytes: fileBuffer.length,
      file_extension: fileExtension,
      mime_type: file.mimetype || 'application/octet-stream',
      checksum_sha256: checksum,
      status: initialStatus,
      owner_type: 'user',
      owner_id: employeeId || createdById,
      created_by: createdById,
      expiration_date: expirationDate,
      tags: tags,
      source_module: module,
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId
    });

    // Subir archivo al storage
    try {
      // Preparar objeto file para el storage service
      const fileForStorage = {
        buffer: fileBuffer,
        originalname: file.originalname || document.original_filename,
        mimetype: file.mimetype || 'application/octet-stream'
      };

      // Generar número de documento si no existe
      const documentNumber = document.document_number ||
        `DOC-${companyId}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const storageResult = await this.storageService.uploadFile(
        fileForStorage,
        companyId,
        documentNumber,
        document.version || 1
      );

      await document.update({
        storage_path: storageResult.filePath,
        stored_filename: storageResult.fileName,
        document_number: documentNumber
      });
    } catch (storageError) {
      // Si falla el storage, marcar documento como fallido
      await document.update({
        status: 'upload_failed',
        status_reason: storageError.message
      });
      throw storageError;
    }

    // Registrar auditoría usando el método estático
    await DocumentAccessLog.logAction({
      documentId: document.id,
      companyId,
      userId: createdById,
      action: 'upload',
      details: {
        status: initialStatus,
        source: `${module}/${documentType}`,
        sourceEntity: `${sourceEntityType}:${sourceEntityId}`
      }
    });

    // Si requiere validación, crear request de workflow
    if (typeConfig.requiresValidation && this.workflowService) {
      await this._createValidationRequest({
        document,
        module,
        documentType,
        companyId,
        employeeId,
        createdById
      });
    }

    console.log(`📄 [DMS-INTEGRATION] Documento registrado: ${module}/${documentType} → ${document.id}`);

    return {
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        requiresValidation: typeConfig.requiresValidation,
        typeCode: typeConfig.typeCode,
        categoryCode
      }
    };
  }

  /**
   * Obtener documentos de una entidad específica
   * Por ejemplo: todos los documentos de una solicitud de vacaciones
   */
  async getEntityDocuments(params) {
    const {
      companyId,
      sourceEntityType,
      sourceEntityId,
      includeDeleted = false
    } = params;

    const { Document } = this.models;
    const { Op } = require('sequelize');

    const where = {
      company_id: companyId,
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId
    };

    if (!includeDeleted) {
      where.is_deleted = false;
    }

    const documents = await Document.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    return documents;
  }

  /**
   * Obtener documentos de un empleado filtrados por módulo
   */
  async getEmployeeModuleDocuments(params) {
    const {
      companyId,
      employeeId,
      module,
      documentType = null,
      status = null,
      limit = 50
    } = params;

    const { Document } = this.models;
    const { Op } = require('sequelize');

    const where = {
      company_id: companyId,
      owner_id: employeeId,
      source_module: module,
      is_deleted: false
    };

    if (documentType && this.MODULE_DOCUMENT_TYPES[module]) {
      const typeConfig = this.MODULE_DOCUMENT_TYPES[module][documentType];
      if (typeConfig) {
        where.type_code = typeConfig.typeCode;
      }
    }

    if (status) {
      where.status = status;
    }

    const documents = await Document.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit
    });

    return documents;
  }

  /**
   * Verificar si un documento está validado (para módulos que lo requieren)
   */
  async isDocumentValidated(documentId, companyId) {
    const { Document } = this.models;

    const document = await Document.findOne({
      where: {
        id: documentId,
        company_id: companyId,
        is_deleted: false
      }
    });

    if (!document) {
      return { exists: false, validated: false };
    }

    return {
      exists: true,
      validated: document.status === 'active' || document.status === 'approved',
      status: document.status,
      requiresValidation: document.metadata?.requiresValidation || false
    };
  }

  /**
   * Solicitar un documento a un empleado (desde cualquier módulo)
   */
  async requestDocumentFromEmployee(params) {
    const {
      module,
      documentType,
      companyId,
      employeeId,
      employeeName,
      requestedById,
      requestedByName,
      sourceEntityType,
      sourceEntityId,
      dueDate,
      priority = 'medium',
      description,
      notifyChannels = ['in_app', 'push']
    } = params;

    // Validar módulo y tipo
    if (!this.MODULE_DOCUMENT_TYPES[module]?.[documentType]) {
      throw new Error(`Tipo de documento no válido: ${module}/${documentType}`);
    }

    const typeConfig = this.MODULE_DOCUMENT_TYPES[module][documentType];

    // Usar el workflow service para crear la solicitud
    if (!this.workflowService) {
      throw new Error('WorkflowService no disponible');
    }

    const result = await this.workflowService.createDocumentRequest({
      company_id: companyId,
      employee_id: employeeId,
      employee_name: employeeName,
      requested_by: requestedById,
      requested_by_name: requestedByName,
      document_type: typeConfig.typeCode,
      custom_title: `${module}/${documentType}`,
      description: description || `Documento requerido por módulo ${module}`,
      due_date: dueDate,
      priority,
      notify_channels: notifyChannels,
      metadata: {
        source_module: module,
        source_document_type: documentType,
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId
      }
    });

    console.log(`📬 [DMS-INTEGRATION] Solicitud creada: ${module}/${documentType} → empleado ${employeeId}`);

    return result;
  }

  /**
   * Vincular documento existente del DMS a una entidad
   */
  async linkDocumentToEntity(params) {
    const {
      documentId,
      companyId,
      sourceEntityType,
      sourceEntityId,
      linkedById
    } = params;

    const { Document, DocumentAccessLog } = this.models;

    const document = await Document.findOne({
      where: {
        id: documentId,
        company_id: companyId,
        is_deleted: false
      }
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    // Guardar valores anteriores
    const oldValues = {
      source_entity_type: document.source_entity_type,
      source_entity_id: document.source_entity_id
    };

    // Actualizar vínculo
    await document.update({
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId
    });

    // Auditoría
    await DocumentAccessLog.logAction({
      documentId,
      companyId,
      userId: linkedById,
      action: 'metadata_update',
      details: {
        oldValues,
        newValues: {
          source_entity_type: sourceEntityType,
          source_entity_id: sourceEntityId
        }
      }
    });

    return { success: true, document };
  }

  /**
   * ========================================================================
   * MÉTODOS DE CONSULTA AGREGADA
   * ========================================================================
   */

  /**
   * Dashboard de documentos por empleado (para expediente 360)
   */
  async getEmployeeDocumentsDashboard(companyId, employeeId) {
    const { Document } = this.models;
    const { Op, fn, col, literal } = require('sequelize');

    // Documentos por categoría
    const byCategory = await Document.findAll({
      where: {
        company_id: companyId,
        owner_id: employeeId,
        is_deleted: false
      },
      attributes: [
        'category_code',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('file_size')), 'total_size']
      ],
      group: ['category_code']
    });

    // Documentos pendientes de validación
    const pendingValidation = await Document.count({
      where: {
        company_id: companyId,
        owner_id: employeeId,
        status: 'pending_review',
        is_deleted: false
      }
    });

    // Documentos próximos a vencer
    const expiringDays = 60;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + expiringDays);

    const expiring = await Document.findAll({
      where: {
        company_id: companyId,
        owner_id: employeeId,
        is_deleted: false,
        expiration_date: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      attributes: ['id', 'title', 'type_code', 'expiration_date'],
      order: [['expiration_date', 'ASC']]
    });

    // Documentos por módulo
    const byModule = await Document.findAll({
      where: {
        company_id: companyId,
        owner_id: employeeId,
        is_deleted: false
      },
      attributes: [
        'source_module',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['source_module']
    });

    // Últimos documentos
    const recent = await Document.findAll({
      where: {
        company_id: companyId,
        owner_id: employeeId,
        is_deleted: false
      },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    return {
      summary: {
        byCategory: byCategory.map(c => c.toJSON()),
        byModule: byModule.map(m => m.toJSON()),
        pendingValidation,
        expiringCount: expiring.length
      },
      expiring: expiring.map(e => e.toJSON()),
      recent: recent.map(r => ({
        id: r.id,
        title: r.title,
        type_code: r.type_code,
        status: r.status,
        created_at: r.created_at
      }))
    };
  }

  /**
   * Resumen de documentos por módulo para toda la empresa
   */
  async getCompanyModuleDocumentStats(companyId) {
    const { Document } = this.models;
    const { fn, col } = require('sequelize');

    const stats = await Document.findAll({
      where: {
        company_id: companyId,
        is_deleted: false
      },
      attributes: [
        'source_module',
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['source_module', 'status']
    });

    // Agrupar por módulo
    const byModule = {};
    stats.forEach(stat => {
      const data = stat.toJSON();
      if (!byModule[data.source_module]) {
        byModule[data.source_module] = {
          total: 0,
          byStatus: {}
        };
      }
      byModule[data.source_module].total += parseInt(data.count);
      byModule[data.source_module].byStatus[data.status] = parseInt(data.count);
    });

    return byModule;
  }

  /**
   * ========================================================================
   * MÉTODOS PRIVADOS / HELPERS
   * ========================================================================
   */

  _generateTitle(module, documentType, sourceEntityId) {
    const moduleNames = {
      'vacations': 'Vacaciones',
      'sanctions': 'Sanciones',
      'contracts': 'Contratos',
      'medical': 'Médico',
      'training': 'Capacitación',
      'payroll': 'Nómina'
    };

    const typeNames = {
      'request': 'Solicitud',
      'approval': 'Aprobación',
      'certificate': 'Certificado',
      'notification': 'Notificación',
      'descargo': 'Descargo'
    };

    const moduleName = moduleNames[module] || module;
    const typeName = typeNames[documentType] || documentType;

    return `${moduleName} - ${typeName} #${sourceEntityId || Date.now()}`;
  }

  async _createValidationRequest(params) {
    const {
      document,
      module,
      documentType,
      companyId,
      employeeId,
      createdById
    } = params;

    // Notificar a RRHH que hay documento pendiente de validación
    if (this.notificationService) {
      await this.notificationService.createWithThreadId({
        company_id: companyId,
        user_id: null, // Para todos los HR
        type: 'document_pending_validation',
        priority: 'high',
        title: 'Documento pendiente de validación',
        message: `Se ha subido un documento de tipo ${module}/${documentType} que requiere validación`,
        metadata: {
          document_id: document.id,
          module,
          documentType,
          employee_id: employeeId,
          uploaded_by: createdById
        },
        thread_id: `dms_validation_${document.id}`,
        target_roles: ['admin', 'hr'],
        channels: ['in_app']
      });
    }
  }

  /**
   * Obtener tipos de documento disponibles para un módulo
   */
  getModuleDocumentTypes(module) {
    return this.MODULE_DOCUMENT_TYPES[module] || null;
  }

  /**
   * Obtener todos los módulos soportados
   */
  getSupportedModules() {
    return Object.keys(this.MODULE_DOCUMENT_TYPES);
  }

  /**
   * Verificar si un módulo está soportado
   */
  isModuleSupported(module) {
    return !!this.MODULE_DOCUMENT_TYPES[module];
  }
}

module.exports = DMSIntegrationService;
