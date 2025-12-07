'use strict';

/**
 * DMS (Document Management System) Services Index
 *
 * =====================================================
 * FUENTE ÚNICA DE VERDAD DOCUMENTAL
 * =====================================================
 *
 * Este módulo es el BACKEND DOCUMENTAL para TODO el sistema.
 * Todos los módulos (vacaciones, sanciones, médico, legal, etc.)
 * deben usar el DMS para almacenar y recuperar documentos.
 *
 * ARQUITECTURA:
 * - DocumentService: CRUD básico de documentos
 * - DocumentStorageService: Almacenamiento físico (local/S3)
 * - DocumentAuditService: Auditoría inmutable
 * - DocumentRequestWorkflowService: Flujo de solicitud/validación
 * - DMSIntegrationService: API UNIFICADA para todos los módulos
 * - Adapters: Conectores específicos por módulo
 *
 * USO DESDE OTROS MÓDULOS:
 *
 *   const { createAdapters } = require('../services/dms');
 *   const adapters = createAdapters(dmsIntegrationService);
 *
 *   // Registrar documento de vacaciones
 *   await adapters.vacation.registerRequest({ ... });
 *
 *   // Registrar certificado médico (requiere validación)
 *   await adapters.medical.registerCertificate({ ... });
 *
 *   // Solicitar documento a empleado
 *   await adapters.sanction.requestDescargoFromEmployee({ ... });
 */

const DocumentService = require('./DocumentService');
const DocumentStorageService = require('./DocumentStorageService');
const DocumentAuditService = require('./DocumentAuditService');
const DocumentRequestWorkflowService = require('./DocumentRequestWorkflowService');
const DMSIntegrationService = require('./DMSIntegrationService');

// Adaptadores por módulo
const {
  createAdapters,
  createAdapter,
  getSupportedModules,
  VacationDMSAdapter,
  SanctionDMSAdapter,
  MedicalDMSAdapter,
  TrainingDMSAdapter,
  LegalDMSAdapter,
  PayrollDMSAdapter
} = require('./adapters');

module.exports = {
  // Servicios core
  DocumentService,
  DocumentStorageService,
  DocumentAuditService,
  DocumentRequestWorkflowService,
  DMSIntegrationService,

  // Adaptadores
  createAdapters,
  createAdapter,
  getSupportedModules,
  VacationDMSAdapter,
  SanctionDMSAdapter,
  MedicalDMSAdapter,
  TrainingDMSAdapter,
  LegalDMSAdapter,
  PayrollDMSAdapter
};

/**
 * Inicializar servicios DMS COMPLETOS con dependencias
 *
 * Esta función crea TODA la infraestructura DMS:
 * - Servicios core
 * - Integration service
 * - Todos los adaptadores por módulo
 *
 * @param {Object} models - Modelos Sequelize
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Servicios inicializados + adaptadores
 */
module.exports.initDMSServices = (models, options = {}) => {
  // Crear instancia de StorageService
  const storageService = new DocumentStorageService(options.storage || {});

  // Crear instancia de AuditService
  const auditService = new DocumentAuditService(models);

  // Crear instancia de DocumentService con dependencias
  const documentService = new DocumentService(models, storageService, auditService);

  // Crear instancia de WorkflowService (integra notificaciones)
  const workflowService = new DocumentRequestWorkflowService({
    models,
    sequelize: models.Document?.sequelize || options.sequelize,
    documentService,
    storageService,
    notificationService: options.notificationService
  });

  // Crear instancia de IntegrationService (API unificada)
  const integrationService = new DMSIntegrationService({
    models,
    sequelize: models.Document?.sequelize || options.sequelize,
    documentService,
    storageService,
    auditService,
    workflowService,
    notificationService: options.notificationService
  });

  // Crear todos los adaptadores
  const adapters = createAdapters(integrationService);

  return {
    // Servicios core
    documentService,
    storageService,
    auditService,
    workflowService,

    // API unificada para módulos
    integrationService,

    // Adaptadores específicos por módulo
    adapters,

    // Helper para obtener un adaptador específico
    getAdapter: (module) => adapters[module] || createAdapter(module, integrationService)
  };
};

/**
 * Inicializar SOLO el integration service (para módulos que ya tienen servicios)
 */
module.exports.initDMSIntegration = (existingServices, options = {}) => {
  const integrationService = new DMSIntegrationService({
    models: existingServices.models || options.models,
    sequelize: existingServices.sequelize || options.sequelize,
    documentService: existingServices.documentService,
    storageService: existingServices.storageService,
    auditService: existingServices.auditService,
    workflowService: existingServices.workflowService,
    notificationService: existingServices.notificationService || options.notificationService
  });

  return {
    integrationService,
    adapters: createAdapters(integrationService)
  };
};
