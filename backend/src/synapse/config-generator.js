/**
 * CONFIG GENERATOR - Genera configs E2E desde Discovery JSON
 *
 * Convierte discovery JSONs en configs E2E precisos con selectores reales
 */

const fs = require('fs');
const path = require('path');

class ConfigGenerator {
  constructor() {
    this.discoveryDir = path.join(__dirname, '..', '..', 'tests', 'e2e', 'discovery-results');
    this.configsDir = path.join(__dirname, '..', '..', 'tests', 'e2e', 'configs');
  }

  /**
   * Genera config E2E desde discovery JSON
   */
  generateFromDiscovery(moduleKey) {
    const discoveryPath = path.join(this.discoveryDir, `${moduleKey}.discovery.json`);

    if (!fs.existsSync(discoveryPath)) {
      throw new Error(`Discovery JSON not found for module: ${moduleKey}`);
    }

    const discovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));

    const config = {
      moduleKey,
      moduleName: this.extractModuleName(discovery.entryPoint.text),
      generatedFrom: 'discovery',
      generatedAt: new Date().toISOString(),
      discoveryDate: discovery.discoveredAt,

      entryPoint: this.generateEntryPoint(discovery),
      actions: this.generateActions(discovery),
      validation: this.generateValidation(discovery)
    };

    return config;
  }

  /**
   * Genera configuración del entry point
   */
  generateEntryPoint(discovery) {
    const entryPoint = discovery.entryPoint;

    return {
      // Selector con fallbacks
      selector: entryPoint.selector ||
                entryPoint.id ? `#${entryPoint.id}` :
                entryPoint.onclick ? `[onclick*="${discovery.module}"]` :
                `button:has-text("${this.extractModuleName(entryPoint.text)}")`,

      waitForSelector: 'table tbody tr, .btn-add, .btn-create, .dashboard-content',
      click: true,
      timeout: 5000
    };
  }

  /**
   * Genera configuración de acciones (CREATE, VIEW, EDIT, DELETE)
   */
  generateActions(discovery) {
    const actions = {};

    discovery.modals.forEach(modal => {
      if (modal.type === 'CREATE') {
        actions.create = this.generateCreateAction(modal, discovery);
      } else if (modal.type === 'VIEW') {
        actions.view = this.generateViewAction(modal, discovery);
      } else if (modal.type === 'EDIT') {
        actions.edit = this.generateEditAction(modal, discovery);
      } else if (modal.type === 'DELETE') {
        actions.delete = this.generateDeleteAction(modal, discovery);
      }
    });

    return actions;
  }

  /**
   * Genera acción CREATE
   */
  generateCreateAction(modal, discovery) {
    // Buscar botón trigger
    const createButton = discovery.actions.find(a => a.type === 'CREATE');

    return {
      enabled: true,
      trigger: {
        selector: createButton?.className ? `.${createButton.className}` :
                  createButton?.onclick ? `[onclick="${createButton.onclick}"]` :
                  'button:has-text("Agregar"), button:has-text("Crear"), .btn-add, .btn-create',
        click: true
      },

      modal: {
        waitForSelector: '#' + this.guessModalId(modal, 'create') + ', .modal.show',

        fields: modal.fields.map((field, index) => ({
          label: field.label,
          selector: this.generateFieldSelector(field, index),
          type: field.type,
          required: field.required,
          testValue: this.generateTestValue(field, discovery.module)
        })),

        tabs: modal.tabs.map(tab => ({
          text: tab.text,
          selector: tab.onclick ? `button[onclick="${tab.onclick}"]` :
                    `button:has-text("${tab.text}")`,
          fieldsToCheck: modal.tabContents[tab.text]?.fields?.length || 0
        })),

        submitButton: 'button:has-text("Guardar"), button:has-text("Crear"), .btn-submit, [onclick*="save"]',
        cancelButton: 'button:has-text("Cancelar"), button:has-text("Cerrar"), .btn-cancel, [data-dismiss="modal"]'
      },

      validation: {
        successMessage: 'creado exitosamente, agregado correctamente, guardado con éxito',
        listShouldUpdate: true,
        checkNewRow: true
      }
    };
  }

  /**
   * Genera acción VIEW
   */
  generateViewAction(modal, discovery) {
    return {
      enabled: true,
      trigger: {
        selector: 'table tbody tr:first-child button:has-text("Ver"), table tbody tr:first-child .btn-view, table tbody tr:first-child [onclick*="view"]',
        click: true
      },

      modal: {
        waitForSelector: '#' + this.guessModalId(modal, 'view') + ', .modal.show, [data-version*="FULLSCREEN"]',

        tabs: modal.tabs.map(tab => ({
          text: tab.text,
          selector: tab.onclick ? `button[onclick="${tab.onclick}"]` :
                    tab.type === 'custom' ? `button:has-text("${tab.text}")` :
                    `[role="tab"]:has-text("${tab.text}")`,

          // Elementos a verificar en este tab
          sections: modal.tabContents[tab.text]?.sections?.slice(0, 5) || [],
          buttons: modal.tabContents[tab.text]?.buttons?.slice(0, 3).map(b => b.text) || [],
          fieldsCount: modal.tabContents[tab.text]?.fields?.length || 0
        })),

        closeButton: '[onclick*="close"], button:has-text("Cerrar"), .btn-close, [data-dismiss="modal"]'
      },

      validation: {
        allTabsVisible: true,
        minTabsExpected: modal.tabs.length
      }
    };
  }

  /**
   * Genera acción EDIT
   */
  generateEditAction(modal, discovery) {
    return {
      enabled: true,
      trigger: {
        selector: 'table tbody tr:first-child button:has-text("Editar"), table tbody tr:first-child .btn-edit, table tbody tr:first-child [onclick*="edit"]',
        click: true
      },

      modal: {
        waitForSelector: '#' + this.guessModalId(modal, 'edit') + ', .modal.show',

        fieldsToModify: modal.fields.slice(0, 3).map((field, index) => ({
          selector: this.generateFieldSelector(field, index),
          newValue: this.generateTestValue(field, discovery.module, true)
        })),

        submitButton: 'button:has-text("Guardar"), button:has-text("Actualizar"), .btn-submit',
        cancelButton: 'button:has-text("Cancelar"), [data-dismiss="modal"]'
      },

      validation: {
        successMessage: 'actualizado exitosamente, modificado correctamente',
        valuesChanged: true
      }
    };
  }

  /**
   * Genera acción DELETE
   */
  generateDeleteAction(modal, discovery) {
    return {
      enabled: true,
      trigger: {
        selector: 'table tbody tr:last-child button:has-text("Eliminar"), table tbody tr:last-child .btn-delete, table tbody tr:last-child [onclick*="delete"]',
        click: true
      },

      confirmation: {
        waitForSelector: '.swal2-popup, .modal.show, [role="alertdialog"]',
        confirmButton: 'button:has-text("Confirmar"), button:has-text("Eliminar"), button:has-text("Sí"), .swal2-confirm',
        cancelButton: 'button:has-text("Cancelar"), button:has-text("No"), .swal2-cancel'
      },

      validation: {
        successMessage: 'eliminado exitosamente, borrado correctamente',
        listShouldUpdate: true,
        rowShouldDisappear: true
      }
    };
  }

  /**
   * Genera selector para un campo
   */
  generateFieldSelector(field, index) {
    // Prioridad 1: name attribute
    if (field.name) {
      return `[name="${field.name}"]`;
    }

    // Prioridad 2: id attribute
    if (field.id) {
      return `#${field.id}`;
    }

    // Prioridad 3: placeholder
    if (field.placeholder) {
      return `${field.tagName}[placeholder*="${field.placeholder.substring(0, 20)}"]`;
    }

    // Prioridad 4: label + type
    if (field.label) {
      const labelClean = field.label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return `${field.tagName}[type="${field.type}"]:nth-of-type(${index + 1})`;
    }

    // Fallback: nth-of-type
    return `${field.tagName}[type="${field.type}"]:nth-of-type(${index + 1})`;
  }

  /**
   * Genera valor de prueba para un campo
   */
  generateTestValue(field, moduleKey, isEdit = false) {
    const prefix = isEdit ? 'EDIT_' : 'TEST_';
    const timestamp = Date.now();

    if (field.type === 'email') {
      return `${prefix}${moduleKey}_${timestamp}@test.com`;
    }

    if (field.type === 'text' && field.label?.toLowerCase().includes('nombre')) {
      return `${prefix}Nombre ${timestamp}`;
    }

    if (field.type === 'text' && field.label?.toLowerCase().includes('legajo')) {
      return `${prefix}${timestamp}`;
    }

    if (field.type === 'password') {
      return 'Test1234!';
    }

    if (field.type === 'checkbox') {
      return true;
    }

    if (field.tagName === 'select') {
      return 'option:nth-child(2)'; // Segunda opción
    }

    if (field.type === 'number') {
      return isEdit ? 999 : 123;
    }

    if (field.type === 'date') {
      return '2025-12-31';
    }

    // Default
    return `${prefix}${field.label || field.name || 'value'}_${timestamp}`;
  }

  /**
   * Adivina el ID del modal basándose en patrones comunes
   */
  guessModalId(modal, type) {
    // Patrones comunes de IDs de modales
    const patterns = {
      create: ['Modal', 'CreateModal', 'AddModal', 'NewModal'],
      view: ['ViewModal', 'DetailModal', 'ShowModal', 'FileModal'],
      edit: ['EditModal', 'UpdateModal', 'ModifyModal'],
      delete: ['DeleteModal', 'RemoveModal', 'ConfirmModal']
    };

    return patterns[type]?.[0] || 'modal';
  }

  /**
   * Extrae nombre limpio del módulo
   */
  extractModuleName(text) {
    if (!text) return '';

    // Remover emojis y caracteres especiales
    const clean = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

    // Tomar primera línea
    const firstLine = clean.split('\n')[0].trim();

    return firstLine;
  }

  /**
   * Genera configuración de validación
   */
  generateValidation(discovery) {
    return {
      expectedModals: discovery.modals.length,
      expectedActions: discovery.actions.filter(a => a.type !== 'UNKNOWN').length,
      hasCreateAction: discovery.modals.some(m => m.type === 'CREATE'),
      hasViewAction: discovery.modals.some(m => m.type === 'VIEW'),
      totalFields: discovery.modals.reduce((sum, m) => sum + (m.fields?.length || 0), 0),
      totalTabs: discovery.modals.reduce((sum, m) => sum + (m.tabs?.length || 0), 0)
    };
  }

  /**
   * Guarda config generado
   */
  saveConfig(moduleKey, config) {
    if (!fs.existsSync(this.configsDir)) {
      fs.mkdirSync(this.configsDir, { recursive: true });
    }

    const configPath = path.join(this.configsDir, `${moduleKey}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`✅ Config generado: ${configPath}`);

    return configPath;
  }

  /**
   * Genera config y guarda
   */
  generateAndSave(moduleKey) {
    const config = this.generateFromDiscovery(moduleKey);
    return this.saveConfig(moduleKey, config);
  }

  /**
   * Genera configs para todos los discovery JSONs disponibles
   */
  generateAllConfigs() {
    if (!fs.existsSync(this.discoveryDir)) {
      console.log('⚠️  No discovery results found');
      return [];
    }

    const files = fs.readdirSync(this.discoveryDir);
    const discoveryFiles = files.filter(f => f.endsWith('.discovery.json') && f !== 'discovery-summary.json');

    console.log(`📊 Generando configs para ${discoveryFiles.length} módulos...`);

    const generated = [];

    for (const file of discoveryFiles) {
      const moduleKey = file.replace('.discovery.json', '');

      try {
        const configPath = this.generateAndSave(moduleKey);
        generated.push({ moduleKey, configPath, success: true });
      } catch (error) {
        console.log(`❌ Error generando config para ${moduleKey}: ${error.message}`);
        generated.push({ moduleKey, error: error.message, success: false });
      }
    }

    const successful = generated.filter(g => g.success).length;
    console.log(`\n✅ ${successful}/${discoveryFiles.length} configs generados exitosamente`);

    return generated;
  }
}

module.exports = ConfigGenerator;

// CLI Usage
if (require.main === module) {
  const generator = new ConfigGenerator();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Generar todos
    generator.generateAllConfigs();
  } else {
    // Generar específico
    const moduleKey = args[0];
    try {
      generator.generateAndSave(moduleKey);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}
