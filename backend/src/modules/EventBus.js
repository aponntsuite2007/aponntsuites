/**
 * EventBus - Sistema de Eventos para Comunicación Desacoplada
 *
 * Los módulos NO se llaman directamente.
 * Emiten eventos y escuchan eventos de otros módulos.
 *
 * Ventajas:
 * - Desacoplamiento total entre módulos
 * - Fácil testing (mockear eventos)
 * - Escalabilidad (agregar listeners sin tocar código existente)
 * - Auditoría (log de todos los eventos)
 *
 * @author Sistema Médico Enterprise
 * @version 2.0.0
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Permitir muchos listeners
    this.eventLog = []; // Log de eventos (debugging)
    this.metrics = new Map(); // Métricas por evento
  }

  /**
   * Emitir evento con metadata automática
   *
   * @param {string} eventName - Nombre del evento (formato: module:entity:action)
   * @param {object} data - Datos del evento
   */
  emitWithMetadata(eventName, data = {}) {
    const metadata = {
      timestamp: new Date(),
      eventName,
      data,
      source: this.detectSource()
    };

    // Logging
    this.logEvent(metadata);

    // Métricas
    this.recordMetric(eventName);

    // Emitir evento
    logger.debug(`📡 [EVENT BUS] ${eventName}`, { data });
    this.emit(eventName, data);

    // Emitir evento global de monitoreo
    this.emit('*', metadata);
  }

  /**
   * Registrar listener con auto-documentación
   *
   * @param {string} eventName - Nombre del evento
   * @param {string} moduleKey - Módulo que escucha
   * @param {Function} handler - Función manejadora
   */
  registerListener(eventName, moduleKey, handler) {
    logger.info(`👂 [EVENT BUS] ${moduleKey} escuchando: ${eventName}`);

    // Wrapper para capturar errores
    const wrappedHandler = async (data) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error(`❌ [EVENT BUS] Error en listener ${moduleKey} para evento ${eventName}:`, error);

        // Emitir evento de error
        this.emit('event:error', {
          eventName,
          moduleKey,
          error: error.message,
          stack: error.stack,
          data
        });
      }
    };

    this.on(eventName, wrappedHandler);
  }

  /**
   * Detectar módulo fuente (desde stack trace)
   *
   * @returns {string}
   */
  detectSource() {
    const stack = new Error().stack;

    // Buscar patrón: at ModuleName.method
    const match = stack.match(/at\s+([\w]+)\./);
    if (match) return match[1];

    // Buscar patrón: /modules/module-name/
    const moduleMatch = stack.match(/\/modules\/([\w-]+)\//);
    if (moduleMatch) return moduleMatch[1];

    return 'unknown';
  }

  /**
   * Logging de eventos
   *
   * @param {object} metadata - Metadata del evento
   */
  logEvent(metadata) {
    this.eventLog.push(metadata);

    // Mantener solo últimos 1000 eventos
    if (this.eventLog.length > 1000) {
      this.eventLog.shift();
    }
  }

  /**
   * Registrar métrica de evento
   *
   * @param {string} eventName - Nombre del evento
   */
  recordMetric(eventName) {
    if (!this.metrics.has(eventName)) {
      this.metrics.set(eventName, {
        count: 0,
        lastEmitted: null,
        firstEmitted: new Date()
      });
    }

    const metric = this.metrics.get(eventName);
    metric.count++;
    metric.lastEmitted = new Date();
  }

  /**
   * Obtener log de eventos (debugging)
   *
   * @param {number} limit - Número de eventos a retornar
   * @param {object} filters - Filtros opcionales
   * @returns {Array<object>}
   */
  getEventLog(limit = 100, filters = {}) {
    let log = this.eventLog;

    // Filtrar por evento
    if (filters.eventName) {
      log = log.filter(e => e.eventName === filters.eventName);
    }

    // Filtrar por módulo fuente
    if (filters.source) {
      log = log.filter(e => e.source === filters.source);
    }

    // Filtrar por rango de tiempo
    if (filters.since) {
      log = log.filter(e => e.timestamp >= filters.since);
    }

    return log.slice(-limit);
  }

  /**
   * Obtener métricas de eventos
   *
   * @returns {object}
   */
  getMetrics() {
    const metrics = {};

    for (const [eventName, data] of this.metrics) {
      metrics[eventName] = {
        count: data.count,
        lastEmitted: data.lastEmitted,
        firstEmitted: data.firstEmitted,
        avgPerHour: this.calculateAvgPerHour(data)
      };
    }

    return metrics;
  }

  /**
   * Calcular promedio de eventos por hora
   *
   * @param {object} data - Datos de métrica
   * @returns {number}
   */
  calculateAvgPerHour(data) {
    const now = new Date();
    const elapsed = (now - data.firstEmitted) / 1000 / 60 / 60; // horas

    if (elapsed < 1) return data.count;

    return Math.round(data.count / elapsed);
  }

  /**
   * Limpiar log y métricas
   */
  clear() {
    this.eventLog = [];
    this.metrics.clear();
    logger.info('🗑️  [EVENT BUS] Log y métricas limpiados');
  }

  /**
   * Obtener estadísticas generales
   *
   * @returns {object}
   */
  getStats() {
    return {
      totalEvents: this.eventLog.length,
      uniqueEvents: this.metrics.size,
      totalEmitted: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.count, 0),
      listeners: this.eventNames().length
    };
  }
}

// Exportar singleton
module.exports = new EventBus();
