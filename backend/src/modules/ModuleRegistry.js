/**
 * ModuleRegistry - Auto-Discovery de Módulos
 *
 * Sistema centralizado de registro y gestión de módulos.
 * Cada módulo se auto-registra al iniciar el servidor.
 *
 * Características:
 * - Auto-discovery de módulos
 * - Verificación de dependencias
 * - Control de acceso por plan de empresa
 * - Estado de módulos (activo/inactivo)
 *
 * @author Sistema Médico Enterprise
 * @version 2.0.0
 */

const logger = require('../utils/logger');

class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.dependencies = new Map();
    this.initialized = false;
  }

  /**
   * Registrar módulo en el sistema
   *
   * @param {string} moduleKey - Identificador único (ej: 'telemedicine')
   * @param {object} config - Configuración del módulo
   */
  register(moduleKey, config) {
    // Validar configuración mínima
    if (!config.name || !config.version || !config.type) {
      throw new Error(`[MODULE REGISTRY] Configuración inválida para módulo: ${moduleKey}`);
    }

    this.modules.set(moduleKey, {
      key: moduleKey,
      name: config.name,
      version: config.version,
      type: config.type, // 'core' | 'premium' | 'enterprise'
      dependencies: config.dependencies || [],
      provides: config.provides || [],
      service: config.service,
      routes: config.routes,
      models: config.models || [],
      enabled: config.enabled !== false,
      plan: config.plan || 'basic', // 'basic' | 'premium' | 'enterprise'
      icon: config.icon || 'fa-puzzle-piece',
      description: config.description || '',
      registeredAt: new Date()
    });

    // Registrar dependencias
    if (config.dependencies && config.dependencies.length > 0) {
      this.dependencies.set(moduleKey, config.dependencies);
    }

    const emoji = config.type === 'core' ? '🔧' : config.type === 'premium' ? '⭐' : '💎';
    logger.info(`${emoji} [MODULE REGISTRY] Módulo registrado: ${config.name} v${config.version} (${config.type})`);
  }

  /**
   * Verificar si módulo está activo globalmente
   *
   * @param {string} moduleKey - Identificador del módulo
   * @returns {boolean}
   */
  isActive(moduleKey) {
    const module = this.modules.get(moduleKey);
    if (!module) return false;

    // Módulos core siempre activos
    if (module.type === 'core') return true;

    // Verificar si está habilitado
    return module.enabled;
  }

  /**
   * Verificar si empresa tiene acceso al módulo
   *
   * @param {number} companyId - ID de la empresa
   * @param {string} moduleKey - Identificador del módulo
   * @returns {Promise<boolean>}
   */
  async hasAccess(companyId, moduleKey) {
    const module = this.modules.get(moduleKey);
    if (!module) return false;

    // Core siempre disponible
    if (module.type === 'core') return true;

    // Verificar plan de empresa
    const company = await this.getCompanyPlan(companyId);

    // Mapeo de planes
    const planHierarchy = {
      'basic': 1,
      'premium': 2,
      'enterprise': 3
    };

    const companyPlanLevel = planHierarchy[company.plan] || 1;
    const modulePlanLevel = planHierarchy[module.plan] || 1;

    // Empresa debe tener plan igual o superior al requerido por módulo
    if (companyPlanLevel >= modulePlanLevel) {
      return true;
    }

    // Verificar si empresa compró módulo específico (a la carta)
    if (company.activeModules && company.activeModules.includes(moduleKey)) {
      return true;
    }

    return false;
  }

  /**
   * Obtener servicio de módulo (si está activo)
   *
   * @param {string} moduleKey - Identificador del módulo
   * @returns {object|null} Instancia del servicio o null
   */
  getService(moduleKey) {
    if (!this.isActive(moduleKey)) {
      logger.warn(`⚠️  [MODULE REGISTRY] Intento de acceder a módulo inactivo: ${moduleKey}`);
      return null;
    }

    const module = this.modules.get(moduleKey);
    return module ? module.service : null;
  }

  /**
   * Obtener configuración de módulo
   *
   * @param {string} moduleKey - Identificador del módulo
   * @returns {object|null}
   */
  getModule(moduleKey) {
    return this.modules.get(moduleKey) || null;
  }

  /**
   * Verificar dependencias de módulo
   *
   * @param {string} moduleKey - Identificador del módulo
   * @returns {object} Estado de dependencias
   */
  checkDependencies(moduleKey) {
    const deps = this.dependencies.get(moduleKey);

    if (!deps || deps.length === 0) {
      return { satisfied: true, missing: [] };
    }

    const missing = deps.filter(dep => !this.isActive(dep));

    return {
      satisfied: missing.length === 0,
      missing,
      required: deps
    };
  }

  /**
   * Listar todos los módulos registrados
   *
   * @param {object} filters - Filtros opcionales
   * @returns {Array<object>}
   */
  listModules(filters = {}) {
    let modules = Array.from(this.modules.values());

    // Filtrar por tipo
    if (filters.type) {
      modules = modules.filter(m => m.type === filters.type);
    }

    // Filtrar por estado
    if (filters.enabled !== undefined) {
      modules = modules.filter(m => m.enabled === filters.enabled);
    }

    // Filtrar por plan
    if (filters.plan) {
      modules = modules.filter(m => m.plan === filters.plan);
    }

    return modules;
  }

  /**
   * Listar módulos activos
   *
   * @returns {Array<object>}
   */
  getActiveModules() {
    return Array.from(this.modules.values()).filter(m => m.enabled);
  }

  /**
   * Listar módulos por tipo
   *
   * @param {string} type - 'core' | 'premium' | 'enterprise'
   * @returns {Array<object>}
   */
  getModulesByType(type) {
    return Array.from(this.modules.values()).filter(m => m.type === type);
  }

  /**
   * Obtener plan de empresa desde BD
   *
   * @param {number} companyId - ID de la empresa
   * @returns {Promise<object>}
   */
  async getCompanyPlan(companyId) {
    try {
      const { Company } = require('../config/database');

      const company = await Company.findByPk(companyId, {
        attributes: ['id', 'plan', 'active_modules', 'name']
      });

      if (!company) {
        logger.warn(`⚠️  [MODULE REGISTRY] Empresa no encontrada: ${companyId}`);
        return { plan: 'basic', activeModules: [] };
      }

      return {
        id: company.id,
        name: company.name,
        plan: company.plan || 'basic',
        activeModules: company.active_modules || []
      };
    } catch (error) {
      logger.error('[MODULE REGISTRY] Error al obtener plan de empresa:', error);
      return { plan: 'basic', activeModules: [] };
    }
  }

  /**
   * Activar módulo
   *
   * @param {string} moduleKey - Identificador del módulo
   */
  enableModule(moduleKey) {
    const module = this.modules.get(moduleKey);
    if (module) {
      module.enabled = true;
      logger.info(`✅ [MODULE REGISTRY] Módulo activado: ${moduleKey}`);
    }
  }

  /**
   * Desactivar módulo
   *
   * @param {string} moduleKey - Identificador del módulo
   */
  disableModule(moduleKey) {
    const module = this.modules.get(moduleKey);
    if (module) {
      module.enabled = false;
      logger.warn(`⚠️  [MODULE REGISTRY] Módulo desactivado: ${moduleKey}`);
    }
  }

  /**
   * Obtener estadísticas del registry
   *
   * @returns {object}
   */
  getStats() {
    const modules = Array.from(this.modules.values());

    return {
      total: modules.length,
      core: modules.filter(m => m.type === 'core').length,
      premium: modules.filter(m => m.type === 'premium').length,
      enterprise: modules.filter(m => m.type === 'enterprise').length,
      active: modules.filter(m => m.enabled).length,
      inactive: modules.filter(m => !m.enabled).length
    };
  }

  /**
   * Validar integridad del registry
   *
   * Verifica que todos los módulos con dependencias
   * tengan sus dependencias satisfechas.
   *
   * @returns {object} Reporte de validación
   */
  validate() {
    const report = {
      valid: true,
      errors: [],
      warnings: []
    };

    for (const [moduleKey, module] of this.modules) {
      // Verificar dependencias
      if (module.dependencies && module.dependencies.length > 0) {
        for (const dep of module.dependencies) {
          if (!this.modules.has(dep)) {
            report.valid = false;
            report.errors.push({
              module: moduleKey,
              type: 'missing_dependency',
              message: `Dependencia no encontrada: ${dep}`
            });
          } else if (!this.isActive(dep) && module.enabled) {
            report.warnings.push({
              module: moduleKey,
              type: 'inactive_dependency',
              message: `Dependencia inactiva: ${dep}`
            });
          }
        }
      }

      // Verificar que tenga servicio si está activo
      if (module.enabled && !module.service) {
        report.warnings.push({
          module: moduleKey,
          type: 'missing_service',
          message: 'Módulo activo sin servicio registrado'
        });
      }
    }

    return report;
  }

  /**
   * Inicializar registry
   *
   * Carga todos los módulos disponibles
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('⚠️  [MODULE REGISTRY] Ya está inicializado');
      return;
    }

    logger.info('🚀 [MODULE REGISTRY] Inicializando...');

    // Los módulos se auto-registran al ser importados
    // Ver server.js donde se importan todos los módulos

    this.initialized = true;

    const stats = this.getStats();
    logger.info(`✅ [MODULE REGISTRY] Inicializado con ${stats.total} módulos (${stats.core} core, ${stats.premium} premium, ${stats.enterprise} enterprise)`);

    // Validar integridad
    const validation = this.validate();
    if (!validation.valid) {
      logger.error('❌ [MODULE REGISTRY] Errores de validación:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      logger.warn('⚠️  [MODULE REGISTRY] Advertencias:', validation.warnings);
    }
  }
}

// Exportar singleton
module.exports = new ModuleRegistry();
