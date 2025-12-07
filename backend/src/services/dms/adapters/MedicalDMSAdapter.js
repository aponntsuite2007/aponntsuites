'use strict';

/**
 * ADAPTER: Médico/Salud Ocupacional → DMS
 *
 * Este adaptador maneja TODOS los documentos médicos:
 * - Certificados médicos (subidos por empleados - requieren validación)
 * - Resultados de exámenes (generados por el sistema)
 * - Recetas médicas
 * - Certificados de aptitud
 * - Exámenes pre-ocupacionales, periódicos, egreso
 *
 * IMPORTANTE: Documentos médicos son CONFIDENCIALES
 * Solo accesibles por: el empleado, médico ocupacional, RRHH autorizado
 */

class MedicalDMSAdapter {
  constructor(dmsIntegrationService) {
    this.dms = dmsIntegrationService;
    this.MODULE = 'medical';
    this.OH_MODULE = 'occupational-health';
  }

  // ==========================================
  // CERTIFICADOS MÉDICOS (subidos por empleado)
  // ==========================================

  /**
   * Registrar certificado médico (REQUIERE VALIDACIÓN)
   * El empleado sube, RRHH valida antes de que impacte asistencia
   */
  async registerCertificate(params) {
    const {
      companyId,
      employeeId,
      file,
      startDate,
      endDate,
      diagnosis,
      doctorName,
      licenseNumber,
      metadata = {}
    } = params;

    const sourceEntityId = `cert_${employeeId}_${Date.now()}`;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'certificate', // requiresValidation: true
      companyId,
      employeeId,
      createdById: employeeId,
      sourceEntityType: 'medical_certificate',
      sourceEntityId,
      file,
      title: `Certificado Médico - ${startDate} a ${endDate}`,
      description: `Certificado por ${doctorName}`,
      metadata: {
        ...metadata,
        startDate,
        endDate,
        daysOff: this._calculateDays(startDate, endDate),
        diagnosis: diagnosis ? this._encryptSensitive(diagnosis) : null,
        doctorName,
        licenseNumber,
        submittedAt: new Date().toISOString(),
        requiresHRValidation: true,
        isConfidential: true
      }
    });
  }

  /**
   * Solicitar certificado médico a empleado
   */
  async requestCertificateFromEmployee(params) {
    const {
      companyId,
      employeeId,
      employeeName,
      requestedById,
      requestedByName,
      dueDate,
      absenceDate,
      reason
    } = params;

    return this.dms.requestDocumentFromEmployee({
      module: this.MODULE,
      documentType: 'certificate',
      companyId,
      employeeId,
      employeeName,
      requestedById,
      requestedByName,
      sourceEntityType: 'absence_justification',
      sourceEntityId: `abs_${employeeId}_${absenceDate}`,
      dueDate,
      priority: 'high',
      description: `Se requiere certificado médico para justificar ausencia del ${absenceDate}.\n\nMotivo: ${reason}`,
      notifyChannels: ['in_app', 'push']
    });
  }

  // ==========================================
  // SALUD OCUPACIONAL
  // ==========================================

  /**
   * Registrar examen pre-ocupacional
   */
  async registerPreEmploymentExam(params) {
    const {
      companyId,
      employeeId,
      examId,
      createdById,
      file,
      result, // 'apt' | 'apt_with_restrictions' | 'not_apt'
      restrictions,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.OH_MODULE,
      documentType: 'pre-employment',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'occupational_exam',
      sourceEntityId: examId,
      file,
      title: `Examen Pre-Ocupacional - ${employeeId}`,
      metadata: {
        ...metadata,
        examType: 'pre-employment',
        result,
        restrictions,
        examDate: new Date().toISOString(),
        isConfidential: true
      }
    });
  }

  /**
   * Registrar examen periódico
   */
  async registerPeriodicExam(params) {
    const {
      companyId,
      employeeId,
      examId,
      createdById,
      file,
      result,
      nextExamDate,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.OH_MODULE,
      documentType: 'periodic',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'occupational_exam',
      sourceEntityId: examId,
      file,
      title: `Examen Periódico - ${new Date().getFullYear()}`,
      expirationDate: nextExamDate, // El documento "vence" cuando toca el próximo examen
      metadata: {
        ...metadata,
        examType: 'periodic',
        result,
        nextExamDate,
        examDate: new Date().toISOString(),
        isConfidential: true
      }
    });
  }

  /**
   * Registrar examen de egreso
   */
  async registerEgressExam(params) {
    const {
      companyId,
      employeeId,
      examId,
      createdById,
      file,
      terminationDate,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.OH_MODULE,
      documentType: 'egress',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'occupational_exam',
      sourceEntityId: examId,
      file,
      title: `Examen de Egreso - ${terminationDate}`,
      metadata: {
        ...metadata,
        examType: 'egress',
        terminationDate,
        examDate: new Date().toISOString(),
        isConfidential: true
      }
    });
  }

  /**
   * Registrar certificado de aptitud
   */
  async registerAptitudeCertificate(params) {
    const {
      companyId,
      employeeId,
      createdById,
      file,
      position,
      validUntil,
      restrictions,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.OH_MODULE,
      documentType: 'aptitude',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'aptitude_certificate',
      sourceEntityId: `apt_${employeeId}_${Date.now()}`,
      file,
      title: `Certificado de Aptitud - ${position}`,
      expirationDate: validUntil,
      metadata: {
        ...metadata,
        position,
        validUntil,
        restrictions,
        issuedAt: new Date().toISOString(),
        isConfidential: true
      }
    });
  }

  // ==========================================
  // CONSENTIMIENTO INFORMADO
  // ==========================================

  /**
   * Registrar consentimiento informado firmado
   */
  async registerInformedConsent(params) {
    const {
      companyId,
      employeeId,
      consentType, // 'biometric' | 'medical' | 'data_processing' | 'general'
      file,
      metadata = {}
    } = params;

    const typeMap = {
      'biometric': 'biometric',
      'medical': 'medical',
      'data_processing': 'data-processing',
      'general': 'general'
    };

    return this.dms.registerDocument({
      module: 'informed-consent',
      documentType: typeMap[consentType] || 'general',
      companyId,
      employeeId,
      createdById: employeeId,
      sourceEntityType: 'informed_consent',
      sourceEntityId: `consent_${consentType}_${employeeId}`,
      file,
      title: `Consentimiento Informado - ${this._getConsentTypeName(consentType)}`,
      metadata: {
        ...metadata,
        consentType,
        signedAt: new Date().toISOString(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    });
  }

  // ==========================================
  // CONSULTAS
  // ==========================================

  /**
   * Obtener todos los documentos médicos de un empleado
   */
  async getEmployeeMedicalDocuments(companyId, employeeId, options = {}) {
    const medicalDocs = await this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.MODULE,
      status: options.status,
      limit: options.limit || 100
    });

    const ohDocs = await this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.OH_MODULE,
      status: options.status,
      limit: options.limit || 100
    });

    return {
      certificates: medicalDocs,
      occupationalHealth: ohDocs,
      total: medicalDocs.length + ohDocs.length
    };
  }

  /**
   * Verificar si empleado tiene examen periódico vigente
   */
  async hasValidPeriodicExam(companyId, employeeId) {
    const docs = await this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.OH_MODULE,
      documentType: 'periodic',
      status: 'active',
      limit: 1
    });

    if (docs.length === 0) {
      return { valid: false, reason: 'no_exam_found' };
    }

    const lastExam = docs[0];
    const expirationDate = new Date(lastExam.expiration_date);

    if (expirationDate < new Date()) {
      return { valid: false, reason: 'expired', lastExamDate: lastExam.created_at };
    }

    return {
      valid: true,
      expiresAt: expirationDate,
      documentId: lastExam.id
    };
  }

  // ==========================================
  // HELPERS PRIVADOS
  // ==========================================

  _calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  _encryptSensitive(text) {
    // En producción: usar encriptación real
    // Por ahora solo indicamos que es dato sensible
    return `[ENCRYPTED:${Buffer.from(text).toString('base64')}]`;
  }

  _getConsentTypeName(type) {
    const names = {
      'biometric': 'Datos Biométricos',
      'medical': 'Información Médica',
      'data_processing': 'Tratamiento de Datos',
      'general': 'General'
    };
    return names[type] || type;
  }
}

module.exports = MedicalDMSAdapter;
