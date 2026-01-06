/**
 * CONFIGURACIÓN E2E - RISK INTELLIGENCE DASHBOARD
 * ⭐ AUTO-GENERADO por inspector de frontend
 * Sistema SYNAPSE - Selectores REALES extraídos del código
 */

module.exports = {
  skipE2ETesting: true,
  isDelegated: true,
  delegationReason: 'Dashboard de visualizacion',
  moduleKey: 'compliance-dashboard',
  moduleName: 'Inteligencia de Riesgos',
  category: 'empresa',
  baseUrl: 'http://localhost:9998/panel-empresa.html',

  navigation: {
    listContainerSelector: '.ri-container',
    createButtonSelector: 'button.btn-create, button[onclick*="create"]',
    openModalSelector: 'button[data-action="open"], button.btn-create, button[onclick*="create"]',
    viewButtonSelector: 'button.btn-view, button[onclick*="view"]',
    editButtonSelector: 'button.btn-edit, button[onclick*="edit"]',
    deleteButtonSelector: 'button.btn-delete, button[onclick*="delete"]',
    modalSelector: '.modal',
    closeModalSelector: 'button.close, button[onclick*="close"]'
  },

  tabs: [
    {
      key: 'general',
      label: 'General',
      tabSelector: 'button[data-tab="general"], .tab-button.active',
      isDefault: true,
      fields: [
        // NOTA: Campos detectados automáticamente - revisar manualmente

      ]
    }
  ],

  database: {
    table: 'compliance-dashboard',
    primaryKey: 'id',
    testDataFactory: async (db) => {
      // Factory genérico - personalizar según tabla real
      return null; // Deshabilitado hasta configurar manualmente
    },
    testDataCleanup: async (db, id) => {
      // await db.query('DELETE FROM compliance-dashboard WHERE id = $1', [id]);
    }
  },

  chaosConfig: {
    enabled: false, // Dashboard READ-ONLY - sin CRUD fields: [] },
    raceConditions: { enabled: false },
    stressTest: { enabled: false, createMultipleRecords: 0 }
  },

  brainIntegration: {
    enabled: false
  }
};
