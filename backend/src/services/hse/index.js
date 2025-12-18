/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HSE SERVICES - Índice de exportación
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Servicios para el módulo de Seguridad e Higiene Laboral (HSE)
 * con integración de detección de EPP mediante IA.
 */

const HSEViolationCatalogService = require('./HSEViolationCatalogService');
const CountryRegulationService = require('./CountryRegulationService');
const PPEDetectionService = require('./PPEDetectionService');
const HSECaseService = require('./HSECaseService');

/**
 * Factory para crear instancias de servicios HSE con dependencias inyectadas
 */
function createHSEServices(database, config = {}) {
  // Crear instancias
  const violationCatalog = new HSEViolationCatalogService(database);
  const countryRegulation = new CountryRegulationService(database);
  const ppeDetection = new PPEDetectionService(database, config);
  const caseService = new HSECaseService(database);

  // Inyectar dependencias
  ppeDetection.setDependencies({
    violationCatalog,
    countryRegulation,
    notificationService: config.notificationService
  });

  caseService.setDependencies({
    violationCatalog,
    notificationService: config.notificationService
  });

  return {
    violationCatalog,
    countryRegulation,
    ppeDetection,
    caseService
  };
}

module.exports = {
  HSEViolationCatalogService,
  CountryRegulationService,
  PPEDetectionService,
  HSECaseService,
  createHSEServices
};
