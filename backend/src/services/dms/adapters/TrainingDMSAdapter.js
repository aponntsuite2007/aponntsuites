'use strict';

/**
 * ADAPTER: Capacitaciones → DMS
 *
 * Este adaptador maneja:
 * - Materiales de capacitación (PDFs, videos, presentaciones)
 * - Certificados de finalización
 * - Evaluaciones y resultados
 * - Listas de asistencia
 */

class TrainingDMSAdapter {
  constructor(dmsIntegrationService) {
    this.dms = dmsIntegrationService;
    this.MODULE = 'training';
  }

  // ==========================================
  // MATERIALES DE CAPACITACIÓN
  // ==========================================

  /**
   * Registrar material de capacitación
   */
  async registerMaterial(params) {
    const {
      trainingId,
      companyId,
      createdById,
      file,
      materialType, // 'presentation' | 'document' | 'video' | 'exercise'
      title,
      description,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'material',
      companyId,
      employeeId: null, // Material es de la empresa, no de un empleado
      createdById,
      sourceEntityType: 'training_course',
      sourceEntityId: trainingId,
      file,
      title: title || `Material - Capacitación #${trainingId}`,
      description,
      metadata: {
        ...metadata,
        materialType,
        uploadedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Obtener materiales de una capacitación
   */
  async getTrainingMaterials(companyId, trainingId) {
    return this.dms.getEntityDocuments({
      companyId,
      sourceEntityType: 'training_course',
      sourceEntityId: trainingId
    });
  }

  // ==========================================
  // CERTIFICADOS DE CAPACITACIÓN
  // ==========================================

  /**
   * Registrar certificado de capacitación completada
   */
  async registerCertificate(params) {
    const {
      trainingId,
      enrollmentId,
      companyId,
      employeeId,
      createdById,
      file,
      courseName,
      completionDate,
      score,
      validUntil,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'certificate',
      companyId,
      employeeId,
      createdById,
      sourceEntityType: 'training_enrollment',
      sourceEntityId: enrollmentId,
      file,
      title: `Certificado - ${courseName}`,
      expirationDate: validUntil,
      metadata: {
        ...metadata,
        trainingId,
        courseName,
        completionDate,
        score,
        validUntil,
        issuedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Verificar si empleado tiene certificación vigente
   */
  async hasValidCertification(companyId, employeeId, trainingType) {
    const docs = await this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.MODULE,
      documentType: 'certificate',
      status: 'active',
      limit: 100
    });

    // Filtrar por tipo si se especifica
    const relevantDocs = trainingType
      ? docs.filter(d => d.metadata?.trainingType === trainingType)
      : docs;

    const validCerts = relevantDocs.filter(d => {
      if (!d.expiration_date) return true; // Sin vencimiento = siempre válido
      return new Date(d.expiration_date) > new Date();
    });

    return {
      hasCertification: validCerts.length > 0,
      certificates: validCerts.map(c => ({
        id: c.id,
        courseName: c.metadata?.courseName,
        completionDate: c.metadata?.completionDate,
        expiresAt: c.expiration_date,
        score: c.metadata?.score
      }))
    };
  }

  // ==========================================
  // EVALUACIONES
  // ==========================================

  /**
   * Registrar evaluación de capacitación
   */
  async registerEvaluation(params) {
    const {
      trainingId,
      enrollmentId,
      companyId,
      employeeId,
      evaluatedById,
      file,
      evaluationType, // 'pre_test' | 'post_test' | 'practical' | 'final'
      score,
      passed,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'evaluation',
      companyId,
      employeeId,
      createdById: evaluatedById,
      sourceEntityType: 'training_evaluation',
      sourceEntityId: `${enrollmentId}_${evaluationType}`,
      file,
      title: `Evaluación ${this._getEvaluationTypeName(evaluationType)} - Capacitación #${trainingId}`,
      metadata: {
        ...metadata,
        trainingId,
        enrollmentId,
        evaluationType,
        score,
        passed,
        evaluatedAt: new Date().toISOString()
      }
    });
  }

  // ==========================================
  // LISTAS DE ASISTENCIA
  // ==========================================

  /**
   * Registrar lista de asistencia a sesión de capacitación
   */
  async registerAttendanceList(params) {
    const {
      trainingId,
      sessionId,
      companyId,
      createdById,
      file,
      sessionDate,
      attendeeCount,
      metadata = {}
    } = params;

    return this.dms.registerDocument({
      module: this.MODULE,
      documentType: 'attendance',
      companyId,
      employeeId: null,
      createdById,
      sourceEntityType: 'training_session',
      sourceEntityId: sessionId,
      file,
      title: `Lista de Asistencia - Sesión ${sessionDate}`,
      metadata: {
        ...metadata,
        trainingId,
        sessionId,
        sessionDate,
        attendeeCount,
        registeredAt: new Date().toISOString()
      }
    });
  }

  // ==========================================
  // CONSULTAS AGREGADAS
  // ==========================================

  /**
   * Obtener todos los documentos de capacitación de un empleado
   */
  async getEmployeeTrainingDocuments(companyId, employeeId, options = {}) {
    return this.dms.getEmployeeModuleDocuments({
      companyId,
      employeeId,
      module: this.MODULE,
      documentType: options.documentType,
      status: options.status,
      limit: options.limit || 100
    });
  }

  /**
   * Obtener certificaciones próximas a vencer
   */
  async getExpiringCertifications(companyId, daysAhead = 60) {
    const { Document } = this.dms.models;
    const { Op } = require('sequelize');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return Document.findAll({
      where: {
        company_id: companyId,
        source_module: this.MODULE,
        type_code: 'TRAINING_CERTIFICATE',
        is_deleted: false,
        expiration_date: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      order: [['expiration_date', 'ASC']]
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  _getEvaluationTypeName(type) {
    const names = {
      'pre_test': 'Pre-Test',
      'post_test': 'Post-Test',
      'practical': 'Práctica',
      'final': 'Final'
    };
    return names[type] || type;
  }
}

module.exports = TrainingDMSAdapter;
