const express = require('express');
const prometheus = require('prom-client');
const winston = require('winston');
const ElasticAPM = require('elastic-apm-node');
const { performance } = require('perf_hooks');
const os = require('os');
const { dbManager } = require('../config/database-next-gen');
const cron = require('node-cron');

// 📊 SERVICIO DE MONITORING NEXT-GEN
class NextGenMonitoringService {
  constructor() {
    this.app = express();
    this.metrics = {};
    this.alerts = [];
    this.healthChecks = new Map();

    this.initializeAPM();
    this.initializeLogger();
    this.initializePrometheusMetrics();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeHealthChecks();
    this.initializeCronJobs();
    this.initializeSystemMonitoring();
  }

  // 🔍 INICIALIZAR APM
  initializeAPM() {
    if (process.env.ELASTIC_APM_SERVER_URL) {
      this.apm = ElasticAPM.start({
        serviceName: 'biometric-attendance-system',
        serverUrl: process.env.ELASTIC_APM_SERVER_URL,
        environment: process.env.NODE_ENV || 'development',
        captureBody: 'all',
        captureHeaders: true,
        logLevel: 'info'
      });
      console.log('🔍 Elastic APM inicializado');
    }
  }

  // 📝 INICIALIZAR LOGGER
  initializeLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10485760, // 10MB
          maxFiles: 10
        })
      ]
    });

    // Stream para Morgan
    this.logStream = {
      write: (message) => {
        this.logger.info(message.trim());
      }
    };
  }

  // 📊 MÉTRICAS PROMETHEUS
  initializePrometheusMetrics() {
    // Registro por defecto
    prometheus.register.clear();
    prometheus.collectDefaultMetrics({ timeout: 5000 });

    // Métricas personalizadas
    this.metrics = {
      // Métricas de HTTP
      httpRequests: new prometheus.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code', 'tenant_id']
      }),

      httpDuration: new prometheus.Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.5, 1, 2, 5, 10]
      }),

      // Métricas de base de datos
      dbConnections: new prometheus.Gauge({
        name: 'database_connections_active',
        help: 'Number of active database connections',
        labelNames: ['tenant_id', 'shard']
      }),

      dbQueryDuration: new prometheus.Histogram({
        name: 'database_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['query_type', 'tenant_id'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
      }),

      // Métricas biométricas
      biometricScans: new prometheus.Counter({
        name: 'biometric_scans_total',
        help: 'Total number of biometric scans processed',
        labelNames: ['tenant_id', 'scan_type', 'status']
      }),

      biometricProcessingTime: new prometheus.Histogram({
        name: 'biometric_processing_duration_seconds',
        help: 'Biometric processing duration in seconds',
        labelNames: ['tenant_id', 'processing_type'],
        buckets: [0.5, 1, 2, 5, 10, 30]
      }),

      // Métricas de IA
      aiModelInference: new prometheus.Histogram({
        name: 'ai_model_inference_duration_seconds',
        help: 'AI model inference duration in seconds',
        labelNames: ['model_type', 'tenant_id'],
        buckets: [0.1, 0.5, 1, 2, 5, 10]
      }),

      aiModelAccuracy: new prometheus.Gauge({
        name: 'ai_model_accuracy_score',
        help: 'AI model accuracy score',
        labelNames: ['model_type', 'tenant_id']
      }),

      // Métricas de alertas
      alertsGenerated: new prometheus.Counter({
        name: 'alerts_generated_total',
        help: 'Total number of alerts generated',
        labelNames: ['alert_type', 'severity', 'tenant_id']
      }),

      // Métricas de sistema
      systemMemoryUsage: new prometheus.Gauge({
        name: 'system_memory_usage_bytes',
        help: 'System memory usage in bytes',
        labelNames: ['type']
      }),

      systemCpuUsage: new prometheus.Gauge({
        name: 'system_cpu_usage_percent',
        help: 'System CPU usage percentage'
      }),

      // Métricas de WebSocket
      websocketConnections: new prometheus.Gauge({
        name: 'websocket_connections_active',
        help: 'Number of active WebSocket connections',
        labelNames: ['tenant_id']
      }),

      // Métricas de colas
      queueJobs: new prometheus.Gauge({
        name: 'queue_jobs_total',
        help: 'Number of jobs in queue',
        labelNames: ['queue_name', 'status']
      })
    };
  }

  // 🚀 MIDDLEWARE
  initializeMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));

    // Middleware de métricas
    this.app.use((req, res, next) => {
      const start = performance.now();

      res.on('finish', () => {
        const duration = (performance.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const tenantId = req.headers['x-tenant-id'] || 'unknown';

        // Registrar métricas
        this.metrics.httpRequests.inc({
          method: req.method,
          route,
          status_code: res.statusCode,
          tenant_id: tenantId
        });

        this.metrics.httpDuration.observe({
          method: req.method,
          route,
          status_code: res.statusCode
        }, duration);

        // Log de request
        this.logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration.toFixed(3)}s`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          tenantId,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
      });

      next();
    });

    // Middleware de errores
    this.app.use((error, req, res, next) => {
      this.logger.error('Request error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        headers: req.headers
      });

      if (this.apm) {
        this.apm.captureError(error);
      }

      res.status(500).json({
        error: 'Internal server error',
        requestId: req.id
      });
    });
  }

  // 🌐 RUTAS
  initializeRoutes() {
    // 📊 MÉTRICAS PROMETHEUS
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', prometheus.register.contentType);
        const metrics = await prometheus.register.metrics();
        res.end(metrics);
      } catch (error) {
        res.status(500).end(error.message);
      }
    });

    // 🏥 HEALTH CHECK PRINCIPAL
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.performHealthCheck();
        const status = health.status === 'healthy' ? 200 : 503;
        res.status(status).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date()
        });
      }
    });

    // 🔍 HEALTH CHECK DETALLADO
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const detailed = await this.performDetailedHealthCheck();
        const status = detailed.overallStatus === 'healthy' ? 200 : 503;
        res.status(status).json(detailed);
      } catch (error) {
        res.status(503).json({
          overallStatus: 'unhealthy',
          error: error.message,
          timestamp: new Date()
        });
      }
    });

    // 📊 MÉTRICAS PERSONALIZADAS
    this.app.get('/monitoring/metrics/:tenantId', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { period = '1h' } = req.query;

        const metrics = await this.getTenantMetrics(tenantId, period);
        res.json({
          success: true,
          tenantId,
          period,
          metrics,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🚨 ALERTAS
    this.app.get('/monitoring/alerts', async (req, res) => {
      try {
        const { severity, status = 'active', limit = 100 } = req.query;
        const alerts = await this.getAlerts(severity, status, limit);
        res.json({
          success: true,
          alerts,
          count: alerts.length,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📈 ESTADÍSTICAS DE RENDIMIENTO
    this.app.get('/monitoring/performance', async (req, res) => {
      try {
        const performance = await this.getPerformanceStats();
        res.json({
          success: true,
          performance,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🔥 LOGS EN TIEMPO REAL
    this.app.get('/monitoring/logs', async (req, res) => {
      try {
        const { level = 'info', limit = 100, since } = req.query;
        const logs = await this.getLogs(level, limit, since);
        res.json({
          success: true,
          logs,
          count: logs.length,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📊 DASHBOARD DE MONITOREO
    this.app.get('/monitoring/dashboard', async (req, res) => {
      try {
        const dashboard = await this.generateMonitoringDashboard();
        res.json({
          success: true,
          dashboard,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🔄 FORZAR HEALTH CHECK
    this.app.post('/monitoring/health-check', async (req, res) => {
      try {
        const { component } = req.body;
        const result = await this.forceHealthCheck(component);
        res.json({
          success: true,
          result,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  // 🏥 HEALTH CHECKS
  initializeHealthChecks() {
    // Health check de base de datos
    this.healthChecks.set('database', async () => {
      try {
        const health = await dbManager.healthCheck();
        return {
          status: health.redis.status === 'healthy' && Object.values(health.database).every(s => s === 'healthy') ? 'healthy' : 'unhealthy',
          details: health,
          latency: health.redis.latency || 0
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          latency: -1
        };
      }
    });

    // Health check de AI Engine
    this.healthChecks.set('ai-engine', async () => {
      try {
        const models = require('../services/ai-biometric-engine').healthCheck();
        const modelCount = Object.values(models).filter(m => m !== null).length;
        return {
          status: modelCount > 0 ? 'healthy' : 'unhealthy',
          details: { loadedModels: modelCount, totalModels: Object.keys(models).length },
          latency: 0
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          latency: -1
        };
      }
    });

    // Health check de memoria
    this.healthChecks.set('memory', async () => {
      const usage = process.memoryUsage();
      const total = os.totalmem();
      const free = os.freemem();
      const usedPercent = ((total - free) / total) * 100;

      return {
        status: usedPercent < 90 ? 'healthy' : 'unhealthy',
        details: {
          rss: usage.rss,
          heapTotal: usage.heapTotal,
          heapUsed: usage.heapUsed,
          external: usage.external,
          systemUsedPercent: usedPercent
        },
        latency: 0
      };
    });

    // Health check de CPU
    this.healthChecks.set('cpu', async () => {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      const load1min = loadAvg[0];
      const cpuCount = cpus.length;
      const loadPercent = (load1min / cpuCount) * 100;

      return {
        status: loadPercent < 80 ? 'healthy' : 'unhealthy',
        details: {
          cores: cpuCount,
          loadAverage: loadAvg,
          loadPercent
        },
        latency: 0
      };
    });
  }

  // ⏰ CRON JOBS
  initializeCronJobs() {
    // Actualizar métricas del sistema cada 30 segundos
    cron.schedule('*/30 * * * * *', () => {
      this.updateSystemMetrics();
    });

    // Health check cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.performScheduledHealthCheck();
      } catch (error) {
        this.logger.error('Error en health check programado:', error);
      }
    });

    // Limpieza de logs antiguos cada hora
    cron.schedule('0 * * * *', () => {
      this.cleanupOldLogs();
    });

    // Generar reporte de métricas cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      try {
        await this.generateMetricsReport();
      } catch (error) {
        this.logger.error('Error generando reporte de métricas:', error);
      }
    });
  }

  // 📊 MONITOREO DEL SISTEMA
  initializeSystemMonitoring() {
    // Monitorear uso de memoria
    setInterval(() => {
      const usage = process.memoryUsage();
      this.metrics.systemMemoryUsage.set({ type: 'rss' }, usage.rss);
      this.metrics.systemMemoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
      this.metrics.systemMemoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
      this.metrics.systemMemoryUsage.set({ type: 'external' }, usage.external);
    }, 10000); // Cada 10 segundos

    // Monitorear CPU
    setInterval(() => {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);

      this.metrics.systemCpuUsage.set(usage);
    }, 5000); // Cada 5 segundos
  }

  // 🏥 REALIZAR HEALTH CHECK
  async performHealthCheck() {
    const checks = await Promise.allSettled(
      Array.from(this.healthChecks.entries()).map(async ([name, check]) => {
        const start = performance.now();
        const result = await check();
        const duration = performance.now() - start;
        return { name, ...result, duration };
      })
    );

    const results = checks.map(check =>
      check.status === 'fulfilled' ? check.value :
      { name: 'unknown', status: 'unhealthy', error: check.reason.message }
    );

    const allHealthy = results.every(result => result.status === 'healthy');
    const avgLatency = results.reduce((sum, result) => sum + (result.latency || 0), 0) / results.length;

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: results,
      averageLatency: avgLatency,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  // 🔍 HEALTH CHECK DETALLADO
  async performDetailedHealthCheck() {
    const basicHealth = await this.performHealthCheck();

    // Métricas adicionales
    const systemInfo = {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      freemem: os.freemem(),
      totalmem: os.totalmem()
    };

    // Estado de servicios
    const services = {
      apiGateway: await this.checkServiceHealth('api-gateway', 3000),
      authService: await this.checkServiceHealth('auth-service', 3001),
      notificationService: await this.checkServiceHealth('notification-service', 3002),
      analyticsService: await this.checkServiceHealth('analytics-service', 3003)
    };

    return {
      ...basicHealth,
      overallStatus: basicHealth.status,
      systemInfo,
      services,
      metrics: {
        requestsPerMinute: await this.getRequestsPerMinute(),
        averageResponseTime: await this.getAverageResponseTime(),
        errorRate: await this.getErrorRate()
      }
    };
  }

  // 🔍 VERIFICAR SALUD DE SERVICIO
  async checkServiceHealth(serviceName, port) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        timeout: 5000
      });
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status,
        latency: response.headers.get('x-response-time') || 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency: -1
      };
    }
  }

  // 📊 MÉTRICAS POR TENANT
  async getTenantMetrics(tenantId, period) {
    // Implementar obtención de métricas específicas por tenant
    return {
      requests: await this.getTenantRequests(tenantId, period),
      biometricScans: await this.getTenantBiometricScans(tenantId, period),
      alerts: await this.getTenantAlerts(tenantId, period),
      performance: await this.getTenantPerformance(tenantId, period)
    };
  }

  // 🚨 OBTENER ALERTAS
  async getAlerts(severity, status, limit) {
    return this.alerts
      .filter(alert => !severity || alert.severity === severity)
      .filter(alert => !status || alert.status === status)
      .slice(0, limit);
  }

  // 📈 ESTADÍSTICAS DE RENDIMIENTO
  async getPerformanceStats() {
    return {
      responseTime: await this.getAverageResponseTime(),
      throughput: await this.getRequestsPerMinute(),
      errorRate: await this.getErrorRate(),
      systemLoad: os.loadavg(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // 📊 DASHBOARD DE MONITOREO
  async generateMonitoringDashboard() {
    const health = await this.performHealthCheck();
    const performance = await this.getPerformanceStats();
    const recentAlerts = await this.getAlerts(null, 'active', 10);

    return {
      overview: {
        status: health.status,
        uptime: health.uptime,
        version: health.version
      },
      performance,
      health: health.checks,
      alerts: recentAlerts,
      timestamp: new Date()
    };
  }

  // 🔄 ACTUALIZAR MÉTRICAS DEL SISTEMA
  updateSystemMetrics() {
    // Actualizar métricas de conexiones de base de datos
    if (dbManager.connections) {
      dbManager.connections.forEach((connection, key) => {
        const [tenantId, shard] = key.split('_');
        this.metrics.dbConnections.set(
          { tenant_id: tenantId, shard },
          connection.pool ? connection.pool.size : 0
        );
      });
    }
  }

  // 🧹 LIMPIAR LOGS ANTIGUOS
  cleanupOldLogs() {
    // Implementar limpieza de logs antiguos
    this.logger.info('Ejecutando limpieza de logs antiguos');
  }

  // 📊 GENERAR REPORTE DE MÉTRICAS
  async generateMetricsReport() {
    const metrics = await prometheus.register.metrics();
    this.logger.info('Reporte de métricas generado', { metricsSize: metrics.length });
  }

  // 🚀 MÉTODOS DE UTILIDAD

  async getRequestsPerMinute() {
    // Implementar cálculo de requests por minuto
    return 0;
  }

  async getAverageResponseTime() {
    // Implementar cálculo de tiempo promedio de respuesta
    return 0;
  }

  async getErrorRate() {
    // Implementar cálculo de tasa de errores
    return 0;
  }

  async getTenantRequests(tenantId, period) {
    // Implementar obtención de requests por tenant
    return 0;
  }

  async getTenantBiometricScans(tenantId, period) {
    // Implementar obtención de scans biométricos por tenant
    return 0;
  }

  async getTenantAlerts(tenantId, period) {
    // Implementar obtención de alertas por tenant
    return 0;
  }

  async getTenantPerformance(tenantId, period) {
    // Implementar obtención de performance por tenant
    return {};
  }

  async performScheduledHealthCheck() {
    const health = await this.performHealthCheck();
    if (health.status === 'unhealthy') {
      this.logger.warn('Health check failed:', health);
      // Aquí se podrían enviar alertas
    }
  }

  async forceHealthCheck(component) {
    if (component && this.healthChecks.has(component)) {
      return await this.healthChecks.get(component)();
    }
    return await this.performHealthCheck();
  }

  async getLogs(level, limit, since) {
    // Implementar obtención de logs
    return [];
  }

  // 🚀 INICIAR SERVICIO
  start(port = 3004) {
    this.app.listen(port, () => {
      console.log(`📊 Monitoring Service iniciado en puerto ${port}`);
      this.logger.info(`Monitoring Service iniciado en puerto ${port}`);
    });
  }
}

// 🌟 EXPORT SINGLETON
const monitoringService = new NextGenMonitoringService();

module.exports = {
  NextGenMonitoringService,
  monitoringService,

  // Funciones de utilidad para otros servicios
  recordMetric: (metricName, value, labels) => {
    if (monitoringService.metrics[metricName]) {
      if (typeof monitoringService.metrics[metricName].set === 'function') {
        monitoringService.metrics[metricName].set(labels || {}, value);
      } else if (typeof monitoringService.metrics[metricName].inc === 'function') {
        monitoringService.metrics[metricName].inc(labels || {}, value || 1);
      }
    }
  },

  recordTiming: (metricName, duration, labels) => {
    if (monitoringService.metrics[metricName] && typeof monitoringService.metrics[metricName].observe === 'function') {
      monitoringService.metrics[metricName].observe(labels || {}, duration);
    }
  },

  logEvent: (level, message, meta) => {
    monitoringService.logger[level](message, meta);
  },

  createAlert: (type, severity, message, metadata) => {
    const alert = {
      id: Date.now().toString(),
      type,
      severity,
      message,
      metadata,
      status: 'active',
      createdAt: new Date()
    };
    monitoringService.alerts.push(alert);
    monitoringService.logger.warn(`Alert created: ${type} - ${message}`, alert);
    return alert;
  }
};