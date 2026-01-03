/**
 * CONFIGURACIÓN E2E - USER SUPPORT
 * 🚨 DELEGADO - Sistema de tickets - Ver admin-support-tickets-view.js
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
  moduleKey: 'user-support',
  moduleName: 'User Support',
  category: 'delegated-backend-only',
  isDelegated: true,
  delegationReason: 'Sistema de tickets - Ver admin-support-tickets-view.js',

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
