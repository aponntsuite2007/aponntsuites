/**
 * REALTIME MONITOR - Sistema de Monitoreo y Auto-Reparación en Tiempo Real
 *
 * Características:
 * - Monitoreo continuo del sistema (cada N minutos)
 * - Auto-diagnóstico cuando detecta anomalías
 * - Auto-reparación automática de errores conocidos
 * - Alertas y notificaciones de problemas críticos
 * - Dashboard en tiempo real vía WebSocket
 *
 * @version 1.0.0
 */

const EventEmitter = require('events');

class RealtimeMonitor extends EventEmitter {
  constructor(auditorEngine, database, systemRegistry) {
    super();
    this.auditorEngine = auditorEngine;
    this.database = database;
    this.systemRegistry = systemRegistry;
    this.isRunning = false;
    this.interval = null;
    this.checkInterval = 5 * 60 * 1000; // 5 minutos por defecto
    this.healthMetrics = {
      lastCheck: null,
      uptime: 0,
      totalChecks: 0,
      failuresDetected: 0,
      autoRepairsAttempted: 0,
      autoRepairsSuccessful: 0,
      currentHealth: 100
    };
    this.anomalyDetector = new AnomalyDetector();
  }

  /**
   * Iniciar monitoreo en tiempo real
   */
  start(options = {}) {
    if (this.isRunning) {
      console.log('⚠️  [MONITOR] Ya está corriendo');
      return;
    }

    this.checkInterval = options.interval || this.checkInterval;
    this.isRunning = true;
    this.healthMetrics.uptime = Date.now();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  🚨 MONITOR EN TIEMPO REAL ACTIVADO                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`⏱️  Intervalo de verificación: ${this.checkInterval / 1000}s`);
    console.log('🔍 Auto-diagnóstico: ACTIVO');
    console.log('🔧 Auto-reparación: ACTIVA\n');

    // Ejecutar primera verificación inmediatamente
    this.performHealthCheck();

    // Programar verificaciones periódicas
    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    this.emit('started');
  }

  /**
   * Detener monitoreo
   */
  stop() {
    if (!this.isRunning) return;

    clearInterval(this.interval);
    this.isRunning = false;

    console.log('\n⏸️  [MONITOR] Detenido');
    this.emit('stopped');
  }

  /**
   * Ejecutar verificación de salud del sistema
   */
  async performHealthCheck() {
    const checkId = Date.now();
    console.log(`\n🔍 [HEALTH CHECK #${this.healthMetrics.totalChecks + 1}] ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════');

    this.healthMetrics.totalChecks++;
    this.healthMetrics.lastCheck = new Date();

    try {
      // 1. Verificar estado de la base de datos
      const dbHealth = await this.checkDatabaseHealth();
      console.log(`📊 Base de Datos: ${dbHealth.status === 'healthy' ? '✅' : '❌'} (${dbHealth.responseTime}ms)`);

      // 2. Verificar estado de módulos críticos
      const modulesHealth = await this.checkCriticalModules();
      console.log(`🔧 Módulos Críticos: ${modulesHealth.healthy}/${modulesHealth.total} funcionando`);

      // 3. Detectar anomalías
      const anomalies = await this.anomalyDetector.detect({
        dbHealth,
        modulesHealth,
        metrics: this.healthMetrics
      });

      if (anomalies.length > 0) {
        console.log(`⚠️  Anomalías detectadas: ${anomalies.length}`);
        this.healthMetrics.failuresDetected += anomalies.length;

        // Auto-diagnóstico y reparación
        await this.handleAnomalies(anomalies);
      } else {
        console.log('✅ Sistema funcionando normalmente');
      }

      // 4. Calcular health score
      const healthScore = this.calculateHealthScore({ dbHealth, modulesHealth, anomalies });
      this.healthMetrics.currentHealth = healthScore;

      console.log(`\n💚 Health Score: ${healthScore}%`);
      console.log('═══════════════════════════════════════════════════════════\n');

      this.emit('health-check-complete', {
        checkId,
        timestamp: new Date(),
        health: healthScore,
        dbHealth,
        modulesHealth,
        anomalies
      });

    } catch (error) {
      console.error('❌ [HEALTH CHECK] Error:', error.message);
      this.emit('health-check-failed', { error });
    }
  }

  /**
   * Verificar salud de la base de datos
   */
  async checkDatabaseHealth() {
    const startTime = Date.now();

    try {
      await this.database.sequelize.authenticate();
      const responseTime = Date.now() - startTime;

      // Verificar conexiones activas
      const result = await this.database.sequelize.query(
        'SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()',
        { type: this.database.sequelize.QueryTypes.SELECT }
      );

      const activeConnections = parseInt(result[0].count);

      return {
        status: 'healthy',
        responseTime,
        activeConnections,
        maxConnections: 100 // Ajustar según configuración
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verificar módulos críticos del sistema
   */
  async checkCriticalModules() {
    const criticalModules = ['users', 'attendance', 'dashboard', 'auth'];
    let healthy = 0;
    const details = [];

    for (const moduleKey of criticalModules) {
      const module = this.systemRegistry.getModule(moduleKey);

      if (module) {
        // En health check global, solo verificamos existencia en registry
        // (no intentamos validar contra company_id que puede ser undefined)
        healthy++;
        details.push({
          module: moduleKey,
          status: 'healthy',
          registered: true
        });
      } else {
        details.push({
          module: moduleKey,
          status: 'missing',
          registered: false
        });
      }
    }

    return {
      total: criticalModules.length,
      healthy,
      unhealthy: criticalModules.length - healthy,
      details
    };
  }

  /**
   * Manejar anomalías detectadas (auto-diagnóstico + auto-reparación)
   */
  async handleAnomalies(anomalies) {
    console.log('\n🔧 [AUTO-REPAIR] Iniciando reparación automática...');

    for (const anomaly of anomalies) {
      console.log(`  ⚡ Procesando: ${anomaly.type}`);

      this.healthMetrics.autoRepairsAttempted++;

      try {
        // Ejecutar auditoría específica según el tipo de anomalía
        let auditResult;

        if (anomaly.type === 'module-failure') {
          // Auditar módulo específico
          auditResult = await this.auditorEngine.runModuleAudit(anomaly.module);
        } else if (anomaly.type === 'database-slow') {
          // Auditar base de datos
          auditResult = await this.auditorEngine.runFullAudit({ collectors: ['database'] });
        } else {
          // Auditoría completa
          auditResult = await this.auditorEngine.runFullAudit();
        }

        console.log(`  ✅ Auto-reparación completada para: ${anomaly.type}`);
        this.healthMetrics.autoRepairsSuccessful++;

        this.emit('auto-repair-success', { anomaly, auditResult });

      } catch (error) {
        console.error(`  ❌ Auto-reparación falló: ${error.message}`);
        this.emit('auto-repair-failed', { anomaly, error });
      }
    }
  }

  /**
   * Calcular score de salud del sistema (0-100)
   */
  calculateHealthScore({ dbHealth, modulesHealth, anomalies }) {
    let score = 100;

    // Penalización por BD no saludable
    if (dbHealth.status !== 'healthy') {
      score -= 30;
    } else if (dbHealth.responseTime > 1000) {
      score -= 10; // BD lenta
    }

    // Penalización por módulos no funcionales
    const moduleHealthPercentage = (modulesHealth.healthy / modulesHealth.total) * 100;
    score = score * (moduleHealthPercentage / 100);

    // Penalización por anomalías
    score -= anomalies.length * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics() {
    return {
      ...this.healthMetrics,
      uptimeSeconds: Math.floor((Date.now() - this.healthMetrics.uptime) / 1000),
      isRunning: this.isRunning,
      successRate: this.healthMetrics.autoRepairsAttempted > 0 ?
        ((this.healthMetrics.autoRepairsSuccessful / this.healthMetrics.autoRepairsAttempted) * 100).toFixed(1) :
        100
    };
  }
}

/**
 * DETECTOR DE ANOMALÍAS - Detecta patrones anormales en el sistema
 */
class AnomalyDetector {
  constructor() {
    this.baselines = {
      dbResponseTime: 500, // ms
      moduleHealthThreshold: 0.8 // 80%
    };
  }

  async detect(systemState) {
    const anomalies = [];

    // Anomalía 1: Base de datos lenta
    if (systemState.dbHealth.responseTime > this.baselines.dbResponseTime) {
      anomalies.push({
        type: 'database-slow',
        severity: 'warning',
        value: systemState.dbHealth.responseTime,
        threshold: this.baselines.dbResponseTime,
        message: `BD respondiendo lento (${systemState.dbHealth.responseTime}ms > ${this.baselines.dbResponseTime}ms)`
      });
    }

    // Anomalía 2: Base de datos no saludable
    if (systemState.dbHealth.status !== 'healthy') {
      anomalies.push({
        type: 'database-unhealthy',
        severity: 'critical',
        message: 'Base de datos no responde correctamente',
        error: systemState.dbHealth.error
      });
    }

    // Anomalía 3: Módulos críticos no funcionales
    const moduleHealthRate = systemState.modulesHealth.healthy / systemState.modulesHealth.total;

    if (moduleHealthRate < this.baselines.moduleHealthThreshold) {
      anomalies.push({
        type: 'modules-degraded',
        severity: 'warning',
        value: moduleHealthRate,
        threshold: this.baselines.moduleHealthThreshold,
        message: `Solo ${(moduleHealthRate * 100).toFixed(0)}% de módulos críticos funcionando`,
        unhealthyModules: systemState.modulesHealth.details
          .filter(m => m.status !== 'healthy')
          .map(m => m.module)
      });
    }

    // Anomalía 4: Health score bajo
    if (systemState.metrics.currentHealth < 70) {
      anomalies.push({
        type: 'low-health-score',
        severity: systemState.metrics.currentHealth < 50 ? 'critical' : 'warning',
        value: systemState.metrics.currentHealth,
        message: `Health score bajo: ${systemState.metrics.currentHealth}%`
      });
    }

    return anomalies;
  }
}

module.exports = RealtimeMonitor;
