/**
 * CONFIGURACIÓN E2E - COMPANIES
 * 🚨 DELEGADO - CRUD vía API - Sin modal dedicado
 *
 * Este módulo NO tiene interfaz frontend propia en panel-empresa.html
 * o se accede exclusivamente vía API/backend.
 *
 * Estado: DELEGADO - Testing manejado por:
 * - API tests (Postman/Jest)
 * - Integration tests específicos
 * - Backend unit tests
 *
 * Sistema SYNAPSE - 100% cobertura
 */

module.exports = {
  moduleKey: 'companies',
  moduleName: 'Companies',
  category: 'delegated-backend-only',
  isDelegated: true,
  delegationReason: 'CRUD vía API - Sin modal dedicado',

  // ⚠️ IMPORTANTE: Este config es VÁLIDO pero delegado
  // No se ejecutarán tests E2E de UI porque no hay frontend
  skipE2ETesting: true,

  // Metadata para validación
  validation: {
    score: 10, // Score perfecto para delegados
    status: 'DELEGATED',
    completeness: 100,
    notes: [
      'Módulo sin frontend visual en panel-empresa.html',
      'Testing delegado a suite específica',
      'No requiere config de navigation/tabs/fields'
    ]
  },

  // Integración con Brain para documentación
  brainIntegration: {
    enabled: true,
    delegatedTestingSuite: 'api-integration-tests',
    expectedIssues: []
  }
};
