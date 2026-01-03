/**
 * DependencyManager - Inyección Inteligente de Dependencias
 *
 * Resuelve dependencias entre módulos automáticamente.
 * Si módulo no está activo, inyecta null o servicio fallback.
 *
 * Patrón: Dependency Injection + Service Locator
 *
 * @author Sistema Médico Enterprise
 * @version 2.0.0
 */

const ModuleRegistry = require('./ModuleRegistry');
const logger = require('../utils/logger');

class DependencyManager {
  constructor() {
    this.fallbacks = new Map(); // Servicios fallback
  }

  /**
   * Inyectar dependencias en servicio/clase
   *
   * @param {Array<string>} dependencies - Lista de módulos requeridos
   * @param {object} options - Opciones de inyección
   * @returns {object} Objeto con servicios inyectados
   */
  inject(dependencies = [], options = {}) {
    const injected = {};
    const { required = false, fallback = null } = options;

    dependencies.forEach(dep => {
      const service = ModuleRegistry.getService(dep);

      if (service) {
        injected[dep] = service;
        logger.debug(`✅ [DEPENDENCY] Inyectado: ${dep}`);
      } else {
        // Servicio no disponible
        if (required) {
          throw new Error(`[DEPENDENCY] Módulo requerido no disponible: ${dep}`);
        }

        // Usar fallback si existe
        const fallbackService = this.fallbacks.get(dep) || fallback;

        injected[dep] = fallbackService;

        if (fallbackService) {
          logger.warn(`⚠️  [DEPENDENCY] Usando fallback para: ${dep}`);
        } else {
          logger.warn(`⚠️  [DEPENDENCY] No disponible: ${dep} (módulo inactivo o no instalado)`);
        }
      }
    });

    return injected;
  }

  /**
   * Crear instancia de servicio con dependencias inyectadas
   *
   * @param {Function} ServiceClass - Clase del servicio
   * @param {Array<string>} dependencies - Dependencias opcionales
   * @param {object} options - Opciones adicionales
   * @returns {object} Instancia del servicio
   */
  createService(ServiceClass, dependencies = [], options = {}) {
    const injectedDeps = this.inject(dependencies, options);

    try {
      const instance = new ServiceClass(injectedDeps);
      logger.info(`✅ [DEPENDENCY] Servicio creado: ${ServiceClass.name}`);
      return instance;
    } catch (error) {
      logger.error(`❌ [DEPENDENCY] Error creando servicio ${ServiceClass.name}:`, error);
      throw error;
    }
  }

  /**
   * Wrapper para llamadas condicionales
   *
   * Permite llamar servicios que pueden no existir sin romper
   *
   * @param {string} moduleKey - Identificador del módulo
   * @param {string} methodName - Nombre del método
   * @param  {...any} args - Argumentos del método
   * @returns {Promise<any>} Resultado o null
   */
  async safeCall(moduleKey, methodName, ...args) {
    const service = ModuleRegistry.getService(moduleKey);

    if (service && typeof service[methodName] === 'function') {
      try {
        const result = await service[methodName](...args);
        logger.debug(`✅ [SAFE CALL] ${moduleKey}.${methodName}() ejecutado`);
        return result;
      } catch (error) {
        logger.error(`❌ [SAFE CALL] Error en ${moduleKey}.${methodName}():`, error);
        return null;
      }
    } else {
      logger.debug(`⚠️  [SAFE CALL] ${moduleKey}.${methodName}() no disponible`);
      return null;
    }
  }

  /**
   * Wrapper sincrónico para llamadas condicionales
   *
   * @param {string} moduleKey - Identificador del módulo
   * @param {string} methodName - Nombre del método
   * @param  {...any} args - Argumentos del método
   * @returns {any} Resultado o null
   */
  safeCallSync(moduleKey, methodName, ...args) {
    const service = ModuleRegistry.getService(moduleKey);

    if (service && typeof service[methodName] === 'function') {
      try {
        const result = service[methodName](...args);
        logger.debug(`✅ [SAFE CALL] ${moduleKey}.${methodName}() ejecutado`);
        return result;
      } catch (error) {
        logger.error(`❌ [SAFE CALL] Error en ${moduleKey}.${methodName}():`, error);
        return null;
      }
    } else {
      logger.debug(`⚠️  [SAFE CALL] ${moduleKey}.${methodName}() no disponible`);
      return null;
    }
  }

  /**
   * Verificar si todas las dependencias están satisfechas
   *
   * @param {Array<string>} dependencies - Lista de módulos
   * @returns {object} Estado de dependencias
   */
  check(dependencies = []) {
    const status = {
      satisfied: true,
      available: [],
      missing: []
    };

    dependencies.forEach(dep => {
      if (ModuleRegistry.isActive(dep)) {
        status.available.push(dep);
      } else {
        status.satisfied = false;
        status.missing.push(dep);
      }
    });

    return status;
  }

  /**
   * Registrar servicio fallback para módulo
   *
   * @param {string} moduleKey - Identificador del módulo
   * @param {object} fallbackService - Servicio de respaldo
   */
  registerFallback(moduleKey, fallbackService) {
    this.fallbacks.set(moduleKey, fallbackService);
    logger.info(`✅ [DEPENDENCY] Fallback registrado para: ${moduleKey}`);
  }

  /**
   * Obtener servicio (con fallback automático)
   *
   * @param {string} moduleKey - Identificador del módulo
   * @returns {object|null}
   */
  getService(moduleKey) {
    const service = ModuleRegistry.getService(moduleKey);

    if (service) return service;

    // Intentar fallback
    const fallback = this.fallbacks.get(moduleKey);
    if (fallback) {
      logger.warn(`⚠️  [DEPENDENCY] Usando fallback para: ${moduleKey}`);
      return fallback;
    }

    return null;
  }

  /**
   * Decorador para métodos que usan módulos opcionales
   *
   * Ejemplo:
   * @withOptionalModule('telemedicine')
   * async createAppointment(data) {
   *   // this.telemedicine estará disponible si módulo activo
   * }
   *
   * @param {string} moduleKey - Módulo requerido
   * @returns {Function} Decorador
   */
  withOptionalModule(moduleKey) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function(...args) {
        // Inyectar módulo en this[moduleKey]
        this[moduleKey] = ModuleRegistry.getService(moduleKey);

        // Ejecutar método original
        return await originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  /**
   * Ejecutar callback solo si módulo está disponible
   *
   * @param {string} moduleKey - Identificador del módulo
   * @param {Function} callback - Función a ejecutar
   * @param {Function} fallbackCallback - Función alternativa (opcional)
   * @returns {Promise<any>}
   */
  async ifAvailable(moduleKey, callback, fallbackCallback = null) {
    const service = ModuleRegistry.getService(moduleKey);

    if (service) {
      return await callback(service);
    } else if (fallbackCallback) {
      return await fallbackCallback();
    } else {
      logger.debug(`⚠️  [DEPENDENCY] Módulo no disponible: ${moduleKey}, callback omitido`);
      return null;
    }
  }

  /**
   * Obtener lista de servicios disponibles
   *
   * @param {Array<string>} moduleKeys - Lista de módulos
   * @returns {object} Servicios disponibles
   */
  getAvailableServices(moduleKeys) {
    const services = {};

    moduleKeys.forEach(key => {
      const service = this.getService(key);
      if (service) {
        services[key] = service;
      }
    });

    return services;
  }

  /**
   * Obtener estadísticas de inyección
   *
   * @returns {object}
   */
  getStats() {
    return {
      fallbacksRegistered: this.fallbacks.size,
      fallbacks: Array.from(this.fallbacks.keys())
    };
  }
}

// Exportar singleton
module.exports = new DependencyManager();
