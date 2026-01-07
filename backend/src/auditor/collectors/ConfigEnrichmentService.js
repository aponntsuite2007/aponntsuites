/**
 * ═════════════════════════════════════════════════════════════════════════
 * CONFIG ENRICHMENT SERVICE - Sistema de Auto-Enriquecimiento
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Guarda automáticamente los descubrimientos del testing:
 * - Tabs descubiertos en modales
 * - Fields encontrados en formularios
 * - Botones detectados en la interfaz
 * - Selectores validados que funcionan
 *
 * Actualiza los archivos SYNAPSE config (ej: users.json) con los datos reales.
 *
 * @version 1.0.0
 * @date 2026-01-07
 */

const fs = require('fs').promises;
const path = require('path');

class ConfigEnrichmentService {
  constructor() {
    this.configsDir = path.join(__dirname, '../../../tests/e2e/configs');
  }

  /**
   * ENRIQUECER CONFIG de un módulo con descubrimientos del testing
   */
  async enrichModuleConfig(moduleKey, discoveries) {
    try {
      console.log(`🔍 [ENRICH] Enriqueciendo config de módulo: ${moduleKey}`);

      const configPath = path.join(this.configsDir, `${moduleKey}.json`);

      // Leer config actual (o crear vacío si no existe)
      let config = {};
      try {
        const content = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(content);
      } catch (error) {
        console.log(`   ℹ️  Config no existe, creando nuevo: ${moduleKey}.json`);
        config = {
          moduleKey,
          generatedFrom: 'auto-discovery',
          generatedAt: new Date().toISOString()
        };
      }

      // ENRIQUECER con descubrimientos
      config.lastEnriched = new Date().toISOString();
      config.discoverySource = 'FrontendCollector';

      // 1. TABS descubiertos del botón VER
      if (discoveries.viewButtonTabs && discoveries.viewButtonTabs.length > 0) {
        config.viewModal = config.viewModal || {};
        config.viewModal.tabs = discoveries.viewButtonTabs.map(tab => ({
          name: tab.tabName,
          hasContent: tab.hasContent,
          tested: tab.tested,
          selector: `a:has-text("${tab.tabName}")`,
          discoveredAt: new Date().toISOString()
        }));
        config.viewModal.tabsCount = discoveries.viewButtonTabs.length;

        console.log(`   ✅ Guardados ${discoveries.viewButtonTabs.length} tabs del botón VER`);
      }

      // 2. BOTONES descubiertos en la interfaz
      if (discoveries.allButtons && discoveries.allButtons.length > 0) {
        config.buttons = config.buttons || {};
        config.buttons.discovered = discoveries.allButtons.map(btn => ({
          text: btn.text,
          classes: btn.classes,
          onclick: btn.onclick,
          id: btn.id,
          visible: btn.visible,
          discoveredAt: new Date().toISOString()
        }));
        config.buttons.count = discoveries.allButtons.length;

        console.log(`   ✅ Guardados ${discoveries.allButtons.length} botones de interfaz`);
      }

      // 3. BOTONES en FILAS (Ver, Editar, Eliminar, etc.)
      if (discoveries.rowButtons && discoveries.rowButtons.length > 0) {
        config.rowActions = config.rowActions || {};
        config.rowActions.buttons = discoveries.rowButtons.map(btn => ({
          actionType: btn.actionType,
          text: btn.text,
          title: btn.title,
          onclick: btn.onclick,
          classes: btn.classes,
          selector: this._generateSelector(btn),
          discoveredAt: new Date().toISOString()
        }));
        config.rowActions.count = discoveries.rowButtons.length;

        console.log(`   ✅ Guardados ${discoveries.rowButtons.length} botones de fila`);
      }

      // 4. FIELDS de formulario CREATE
      if (discoveries.createFields && discoveries.createFields.length > 0) {
        config.createModal = config.createModal || {};
        config.createModal.fields = discoveries.createFields.map(field => ({
          id: field.id,
          name: field.name,
          type: field.type,
          label: field.label,
          required: field.required,
          selector: `#${field.id}`,
          discoveredAt: new Date().toISOString()
        }));
        config.createModal.fieldsCount = discoveries.createFields.length;

        console.log(`   ✅ Guardados ${discoveries.createFields.length} campos de formulario CREATE`);
      }

      // 5. SELECTORES validados que FUNCIONAN
      if (discoveries.validatedSelectors) {
        config.selectors = config.selectors || {};
        config.selectors.validated = discoveries.validatedSelectors;
        config.selectors.lastValidated = new Date().toISOString();

        console.log(`   ✅ Guardados selectores validados`);
      }

      // Guardar config enriquecido
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(`   💾 Config guardado: ${configPath}`);

      return { success: true, configPath, discoveries: config };

    } catch (error) {
      console.error(`   ❌ Error enriqueciendo config ${moduleKey}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * REGISTRAR FIX exitoso en Knowledge Base
   */
  async recordFix(fixData) {
    try {
      const { errorType, fixStrategy, success, moduleKey, executionId, details } = fixData;

      console.log(`🧠 [KB] Registrando fix: ${fixStrategy} → ${success ? '✅' : '❌'}`);

      // Aquí integrar con AuditorKnowledgeBase cuando esté disponible
      // Por ahora, guardar en archivo local
      const fixesPath = path.join(this.configsDir, '../fixes-history.json');

      let fixes = [];
      try {
        const content = await fs.readFile(fixesPath, 'utf8');
        fixes = JSON.parse(content);
      } catch (error) {
        // Archivo no existe, crear vacío
      }

      fixes.push({
        errorType,
        fixStrategy,
        success,
        moduleKey,
        executionId,
        details,
        timestamp: new Date().toISOString()
      });

      // Mantener solo últimos 1000 fixes
      if (fixes.length > 1000) {
        fixes = fixes.slice(-1000);
      }

      await fs.writeFile(fixesPath, JSON.stringify(fixes, null, 2), 'utf8');
      console.log(`   💾 Fix registrado en Knowledge Base`);

      return { success: true };

    } catch (error) {
      console.error(`   ❌ Error registrando fix:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * GENERAR SELECTOR robusto basado en propiedades del botón
   */
  _generateSelector(btn) {
    // Prioridad: ID > onclick > clase específica > texto
    if (btn.id) {
      return `#${btn.id}`;
    }
    if (btn.onclick) {
      return `[onclick*="${btn.onclick.substring(0, 20)}"]`;
    }
    if (btn.classes && btn.classes.includes('fa-')) {
      const faClass = btn.classes.split(' ').find(c => c.startsWith('fa-'));
      return `.${faClass}`;
    }
    if (btn.text) {
      return `button:has-text("${btn.text}")`;
    }
    return 'button';
  }

  /**
   * OBTENER CONFIG enriquecido de un módulo
   */
  async getEnrichedConfig(moduleKey) {
    try {
      const configPath = path.join(this.configsDir, `${moduleKey}.json`);
      const content = await fs.readFile(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * OBTENER ESTADÍSTICAS de enriquecimiento
   */
  async getEnrichmentStats() {
    try {
      const files = await fs.readdir(this.configsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('backup'));

      let stats = {
        totalConfigs: jsonFiles.length,
        enrichedConfigs: 0,
        totalTabs: 0,
        totalButtons: 0,
        totalFields: 0
      };

      for (const file of jsonFiles) {
        try {
          const config = await this.getEnrichedConfig(file.replace('.json', ''));
          if (config && config.lastEnriched) {
            stats.enrichedConfigs++;
            if (config.viewModal?.tabsCount) stats.totalTabs += config.viewModal.tabsCount;
            if (config.buttons?.count) stats.totalButtons += config.buttons.count;
            if (config.createModal?.fieldsCount) stats.totalFields += config.createModal.fieldsCount;
          }
        } catch (error) {
          // Skip invalid configs
        }
      }

      return stats;

    } catch (error) {
      console.error(`   ❌ Error obteniendo stats:`, error.message);
      return null;
    }
  }
}

module.exports = ConfigEnrichmentService;
