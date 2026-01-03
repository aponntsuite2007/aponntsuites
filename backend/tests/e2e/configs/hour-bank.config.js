/**
 * CONFIGURACIÓN E2E - BANCO DE HORAS
 * ⭐ AUTO-GENERADO por inspector de frontend
 * Sistema SYNAPSE - Selectores REALES extraídos del código
 */

module.exports = {
  skipE2ETesting: true,
  isDelegated: true,
  delegationReason: 'Config incompleto - requiere actions CRUD',
  moduleKey: 'hour-bank',
  moduleName: 'Banco de Horas',
  category: 'empresa',
  baseUrl: 'http://localhost:9998/panel-empresa.html',

  navigation: {
    listContainerSelector: '.hb-tx-list',
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
    table: 'hour-bank',
    primaryKey: 'id',
    testDataFactory: async (db) => {
      // Factory genérico - personalizar según tabla real
      return null; // Deshabilitado hasta configurar manualmente
    },
    testDataCleanup: async (db, id) => {
      // await db.query('DELETE FROM hour-bank WHERE id = $1', [id]);
    }
  },

  chaosConfig: {
    enabled: true,
    monkeyTest: { duration: 15000, maxActions: 50 },
    fuzzing: { enabled: true, fields: [] },
    raceConditions: { enabled: false },
    stressTest: { enabled: false, createMultipleRecords: 0 }
  },

  brainIntegration: {
    enabled: false
  }
};
