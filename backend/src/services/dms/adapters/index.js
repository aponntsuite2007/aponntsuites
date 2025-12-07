'use strict';

/**
 * DMS ADAPTERS INDEX
 *
 * Este archivo exporta todos los adaptadores que conectan
 * los módulos existentes con el DMS (Fuente Única de Verdad).
 *
 * CÓMO USAR:
 *
 * 1. En el módulo que necesita documentos:
 *
 *    const { createAdapters } = require('../services/dms/adapters');
 *    const adapters = createAdapters(dmsIntegrationService);
 *
 *    // Usar el adaptador específico
 *    await adapters.vacation.registerRequest({ ... });
 *    await adapters.sanction.registerDescargo({ ... });
 *    await adapters.medical.registerCertificate({ ... });
 *
 * 2. Para verificar documentos antes de una acción:
 *
 *    const isValidated = await adapters.medical.isDocumentValidated(docId);
 *    if (!isValidated) {
 *      throw new Error('El certificado médico aún no ha sido validado');
 *    }
 *
 * MÓDULOS SOPORTADOS:
 * - vacation: Solicitudes, aprobaciones, rechazos, certificados
 * - sanction: Notificaciones, descargos, resoluciones, apelaciones
 * - medical: Certificados, exámenes, consentimientos informados
 * - training: Materiales, certificados, evaluaciones
 * - legal: Comunicaciones, acuses de recibo, contratos, NDAs
 * - payroll: Recibos, bonificaciones, deducciones, liquidaciones
 */

const VacationDMSAdapter = require('./VacationDMSAdapter');
const SanctionDMSAdapter = require('./SanctionDMSAdapter');
const MedicalDMSAdapter = require('./MedicalDMSAdapter');
const TrainingDMSAdapter = require('./TrainingDMSAdapter');
const LegalDMSAdapter = require('./LegalDMSAdapter');
const PayrollDMSAdapter = require('./PayrollDMSAdapter');

/**
 * Crear instancias de todos los adaptadores
 * @param {DMSIntegrationService} dmsIntegrationService - Servicio de integración DMS
 * @returns {Object} Objeto con todos los adaptadores inicializados
 */
function createAdapters(dmsIntegrationService) {
  return {
    vacation: new VacationDMSAdapter(dmsIntegrationService),
    sanction: new SanctionDMSAdapter(dmsIntegrationService),
    medical: new MedicalDMSAdapter(dmsIntegrationService),
    training: new TrainingDMSAdapter(dmsIntegrationService),
    legal: new LegalDMSAdapter(dmsIntegrationService),
    payroll: new PayrollDMSAdapter(dmsIntegrationService)
  };
}

/**
 * Crear un adaptador específico
 * @param {string} module - Nombre del módulo
 * @param {DMSIntegrationService} dmsIntegrationService - Servicio de integración DMS
 * @returns {Object} Adaptador específico
 */
function createAdapter(module, dmsIntegrationService) {
  const adapters = {
    vacation: VacationDMSAdapter,
    vacations: VacationDMSAdapter,
    sanction: SanctionDMSAdapter,
    sanctions: SanctionDMSAdapter,
    medical: MedicalDMSAdapter,
    'occupational-health': MedicalDMSAdapter,
    training: TrainingDMSAdapter,
    legal: LegalDMSAdapter,
    'legal-communications': LegalDMSAdapter,
    contracts: LegalDMSAdapter,
    payroll: PayrollDMSAdapter
  };

  const AdapterClass = adapters[module.toLowerCase()];
  if (!AdapterClass) {
    throw new Error(`No existe adaptador para el módulo: ${module}`);
  }

  return new AdapterClass(dmsIntegrationService);
}

/**
 * Obtener lista de módulos soportados
 */
function getSupportedModules() {
  return [
    'vacation',
    'sanction',
    'medical',
    'occupational-health',
    'training',
    'legal',
    'legal-communications',
    'contracts',
    'payroll'
  ];
}

module.exports = {
  // Clases de adaptadores
  VacationDMSAdapter,
  SanctionDMSAdapter,
  MedicalDMSAdapter,
  TrainingDMSAdapter,
  LegalDMSAdapter,
  PayrollDMSAdapter,

  // Factory functions
  createAdapters,
  createAdapter,
  getSupportedModules
};
