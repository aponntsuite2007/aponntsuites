const cluster = require('cluster');
const os = require('os');
const path = require('path');

// 🎭 ORQUESTADOR DE MICROSERVICIOS NEXT-GEN
class NextGenOrchestrator {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.servicePorts = {
      'api-gateway': 3000,
      'auth-service': 3001,
      'notification-service': 3002,
      'analytics-service': 3003,
      'monitoring-service': 3004
    };

    this.serviceFiles = {
      'api-gateway': './api-gateway.js',
      'auth-service': './auth-service.js',
      'notification-service': './notification-service.js',
      'analytics-service': './analytics-service.js',
      'monitoring-service': './monitoring-service.js'
    };

    this.restartCounts = new Map();
    this.maxRestarts = 5;
    this.restartWindow = 60000; // 1 minuto

    this.initializeOrchestrator();
  }

  // 🚀 INICIALIZAR ORQUESTADOR
  initializeOrchestrator() {
    if (cluster.isMaster) {
      console.log(`🎭 Orquestador iniciado - PID: ${process.pid}`);
      console.log(`💻 CPUs disponibles: ${os.cpus().length}`);
      this.startMasterProcess();
    } else {
      this.startWorkerProcess();
    }
  }

  // 👑 PROCESO MASTER
  startMasterProcess() {
    // Configurar manejo de señales
    this.setupSignalHandlers();

    // Iniciar servicios según configuración
    this.startAllServices();

    // Configurar health checks
    this.setupHealthChecking();

    // Configurar auto-escalado
    this.setupAutoScaling();

    // Eventos de cluster
    cluster.on('exit', (worker, code, signal) => {
      console.log(`💀 Worker ${worker.process.pid} murió (${signal || code})`);
      this.handleWorkerExit(worker);
    });

    cluster.on('online', (worker) => {
      console.log(`✅ Worker ${worker.process.pid} iniciado`);
    });

    cluster.on('disconnect', (worker) => {
      console.log(`🔌 Worker ${worker.process.pid} desconectado`);
    });

    // Mostrar estado inicial
    this.displayServiceStatus();
  }

  // 👷 PROCESO WORKER
  startWorkerProcess() {
    const serviceName = process.env.SERVICE_NAME;
    const servicePort = process.env.SERVICE_PORT;

    if (!serviceName || !servicePort) {
      console.error('❌ SERVICE_NAME y SERVICE_PORT son requeridos para workers');
      process.exit(1);
    }

    try {
      console.log(`🚀 Iniciando servicio ${serviceName} en puerto ${servicePort}`);

      // Importar y iniciar el servicio específico
      const serviceModule = require(this.serviceFiles[serviceName]);
      const serviceInstance = serviceModule[this.getServiceClassName(serviceName)];

      if (serviceInstance && typeof serviceInstance.start === 'function') {
        serviceInstance.start(parseInt(servicePort));
      } else {
        console.error(`❌ No se pudo iniciar el servicio ${serviceName}`);
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Error iniciando servicio ${serviceName}:`, error);
      process.exit(1);
    }
  }

  // 🚀 INICIAR TODOS LOS SERVICIOS
  startAllServices() {
    // Configuración de servicios y sus instancias
    const serviceConfig = {
      'monitoring-service': { instances: 1, priority: 1 },
      'auth-service': { instances: 2, priority: 2 },
      'notification-service': { instances: 2, priority: 3 },
      'analytics-service': { instances: 1, priority: 4 },
      'api-gateway': { instances: 2, priority: 5 }
    };

    // Iniciar servicios en orden de prioridad
    const sortedServices = Object.entries(serviceConfig)
      .sort(([,a], [,b]) => a.priority - b.priority);

    for (const [serviceName, config] of sortedServices) {
      setTimeout(() => {
        this.startService(serviceName, config.instances);
      }, config.priority * 2000); // Escalonamiento de 2 segundos
    }
  }

  // 🔄 INICIAR SERVICIO ESPECÍFICO
  startService(serviceName, instances = 1) {
    console.log(`🚀 Iniciando ${serviceName} con ${instances} instancia(s)...`);

    const serviceWorkers = [];
    const basePort = this.servicePorts[serviceName];

    for (let i = 0; i < instances; i++) {
      const port = basePort + i;
      const worker = cluster.fork({
        SERVICE_NAME: serviceName,
        SERVICE_PORT: port,
        WORKER_ID: i
      });

      worker.serviceName = serviceName;
      worker.servicePort = port;
      worker.startTime = Date.now();

      serviceWorkers.push(worker);
    }

    this.services.set(serviceName, {
      workers: serviceWorkers,
      instances,
      basePort,
      status: 'starting',
      startTime: Date.now()
    });

    // Verificar que el servicio se inició correctamente
    setTimeout(() => {
      this.verifyServiceHealth(serviceName);
    }, 10000);
  }

  // ❌ MANEJAR MUERTE DE WORKER
  handleWorkerExit(worker) {
    const serviceName = worker.serviceName;
    if (!serviceName) return;

    const service = this.services.get(serviceName);
    if (!service) return;

    // Remover worker muerto de la lista
    service.workers = service.workers.filter(w => w.id !== worker.id);

    // Verificar límite de reinicios
    const restartKey = `${serviceName}-${Date.now()}`;
    const now = Date.now();

    // Limpiar reinicios antiguos
    for (const [key, timestamp] of this.restartCounts.entries()) {
      if (now - timestamp > this.restartWindow) {
        this.restartCounts.delete(key);
      }
    }

    // Contar reinicios recientes para este servicio
    const recentRestarts = Array.from(this.restartCounts.keys())
      .filter(key => key.startsWith(serviceName)).length;

    if (recentRestarts >= this.maxRestarts) {
      console.error(`❌ ${serviceName} ha excedido el límite de reinicios (${this.maxRestarts})`);
      this.handleServiceFailure(serviceName);
      return;
    }

    // Reiniciar worker
    console.log(`🔄 Reiniciando worker para ${serviceName}...`);
    this.restartCounts.set(restartKey, now);

    const newWorker = cluster.fork({
      SERVICE_NAME: serviceName,
      SERVICE_PORT: worker.servicePort,
      WORKER_ID: worker.env.WORKER_ID
    });

    newWorker.serviceName = serviceName;
    newWorker.servicePort = worker.servicePort;
    newWorker.startTime = Date.now();

    service.workers.push(newWorker);
  }

  // 💥 MANEJAR FALLA DE SERVICIO
  handleServiceFailure(serviceName) {
    console.error(`💥 Falla crítica en ${serviceName} - Notificando administradores...`);

    const service = this.services.get(serviceName);
    if (service) {
      service.status = 'failed';
      service.failureTime = Date.now();
    }

    // Aquí se podría implementar notificación a administradores
    // enviar emails, webhooks, etc.

    // Intentar recuperación después de un tiempo
    setTimeout(() => {
      this.attemptServiceRecovery(serviceName);
    }, 30000); // 30 segundos
  }

  // 🛠️ INTENTAR RECUPERACIÓN DE SERVICIO
  attemptServiceRecovery(serviceName) {
    console.log(`🛠️ Intentando recuperar ${serviceName}...`);

    // Limpiar contadores de reinicio
    for (const key of this.restartCounts.keys()) {
      if (key.startsWith(serviceName)) {
        this.restartCounts.delete(key);
      }
    }

    // Reiniciar servicio
    const serviceConfig = this.services.get(serviceName);
    if (serviceConfig) {
      this.startService(serviceName, serviceConfig.instances);
    }
  }

  // 🏥 CONFIGURAR HEALTH CHECKING
  setupHealthChecking() {
    // Health check cada 30 segundos
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    // Health check detallado cada 5 minutos
    setInterval(() => {
      this.performDetailedHealthCheck();
    }, 300000);
  }

  // 🏥 REALIZAR HEALTH CHECKS
  async performHealthChecks() {
    console.log('🏥 Realizando health checks...');

    for (const [serviceName, service] of this.services.entries()) {
      try {
        const isHealthy = await this.checkServiceHealth(serviceName, service.basePort);
        service.lastHealthCheck = Date.now();
        service.healthy = isHealthy;

        if (!isHealthy && service.status !== 'failed') {
          console.warn(`⚠️ ${serviceName} no responde a health check`);
          service.status = 'unhealthy';
        } else if (isHealthy && service.status === 'unhealthy') {
          console.log(`✅ ${serviceName} se ha recuperado`);
          service.status = 'healthy';
        }

      } catch (error) {
        console.error(`❌ Error en health check de ${serviceName}:`, error);
        service.healthy = false;
        service.status = 'error';
      }
    }
  }

  // 🔍 VERIFICAR SALUD DE SERVICIO
  async checkServiceHealth(serviceName, port) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // 🏥 HEALTH CHECK DETALLADO
  async performDetailedHealthCheck() {
    console.log('🔍 Realizando health check detallado...');

    const overallHealth = {
      timestamp: new Date(),
      services: {},
      systemHealth: {
        cpu: os.loadavg(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        },
        uptime: os.uptime()
      }
    };

    for (const [serviceName, service] of this.services.entries()) {
      overallHealth.services[serviceName] = {
        status: service.status,
        instances: service.workers.length,
        healthy: service.healthy,
        uptime: Date.now() - service.startTime,
        lastHealthCheck: service.lastHealthCheck
      };
    }

    // Guardar reporte de salud
    this.saveHealthReport(overallHealth);

    // Verificar si necesitamos escalar
    this.checkAutoScaling(overallHealth);
  }

  // 💾 GUARDAR REPORTE DE SALUD
  saveHealthReport(healthReport) {
    // Implementar guardado del reporte de salud
    // Podría guardarse en base de datos, archivo, etc.
    console.log('💾 Reporte de salud guardado');
  }

  // ⚖️ CONFIGURAR AUTO-ESCALADO
  setupAutoScaling() {
    // Verificar cada 2 minutos si necesitamos escalar
    setInterval(() => {
      this.evaluateScaling();
    }, 120000);
  }

  // 📊 EVALUAR ESCALADO
  evaluateScaling() {
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();

    console.log(`📊 CPU: ${cpuUsage.toFixed(2)}%, Memory: ${memoryUsage.toFixed(2)}%`);

    // Escalar si el uso es alto
    if (cpuUsage > 80 || memoryUsage > 85) {
      this.scaleUpCriticalServices();
    }

    // Reducir escala si el uso es muy bajo
    if (cpuUsage < 30 && memoryUsage < 40) {
      this.scaleDownServices();
    }
  }

  // 📈 ESCALAR HACIA ARRIBA SERVICIOS CRÍTICOS
  scaleUpCriticalServices() {
    const criticalServices = ['api-gateway', 'auth-service'];

    for (const serviceName of criticalServices) {
      const service = this.services.get(serviceName);
      if (service && service.workers.length < 4) {
        console.log(`📈 Escalando ${serviceName}...`);
        this.addServiceInstance(serviceName);
      }
    }
  }

  // 📉 REDUCIR ESCALA DE SERVICIOS
  scaleDownServices() {
    const scalableServices = ['api-gateway', 'auth-service', 'notification-service'];

    for (const serviceName of scalableServices) {
      const service = this.services.get(serviceName);
      if (service && service.workers.length > 1) {
        console.log(`📉 Reduciendo escala de ${serviceName}...`);
        this.removeServiceInstance(serviceName);
      }
    }
  }

  // ➕ AGREGAR INSTANCIA DE SERVICIO
  addServiceInstance(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return;

    const newPort = service.basePort + service.workers.length;
    const worker = cluster.fork({
      SERVICE_NAME: serviceName,
      SERVICE_PORT: newPort,
      WORKER_ID: service.workers.length
    });

    worker.serviceName = serviceName;
    worker.servicePort = newPort;
    worker.startTime = Date.now();

    service.workers.push(worker);
    service.instances = service.workers.length;

    console.log(`➕ Nueva instancia de ${serviceName} agregada en puerto ${newPort}`);
  }

  // ➖ REMOVER INSTANCIA DE SERVICIO
  removeServiceInstance(serviceName) {
    const service = this.services.get(serviceName);
    if (!service || service.workers.length <= 1) return;

    const worker = service.workers.pop();
    worker.kill('SIGTERM');

    service.instances = service.workers.length;

    console.log(`➖ Instancia de ${serviceName} removida (PID: ${worker.process.pid})`);
  }

  // 🔍 VERIFICAR SALUD DE SERVICIO
  async verifyServiceHealth(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return;

    try {
      const isHealthy = await this.checkServiceHealth(serviceName, service.basePort);
      if (isHealthy) {
        service.status = 'healthy';
        console.log(`✅ ${serviceName} iniciado correctamente`);
      } else {
        service.status = 'unhealthy';
        console.warn(`⚠️ ${serviceName} no responde a health check inicial`);
      }
    } catch (error) {
      service.status = 'error';
      console.error(`❌ Error verificando ${serviceName}:`, error);
    }
  }

  // 📊 MOSTRAR ESTADO DE SERVICIOS
  displayServiceStatus() {
    console.log('\n🎭 ESTADO DE MICROSERVICIOS');
    console.log('================================');

    for (const [serviceName, service] of this.services.entries()) {
      const status = this.getStatusIcon(service.status);
      console.log(`${status} ${serviceName.padEnd(20)} | Instancias: ${service.instances} | Puerto base: ${service.basePort}`);
    }

    console.log('================================\n');

    // Mostrar estado cada 5 minutos
    setTimeout(() => {
      this.displayServiceStatus();
    }, 300000);
  }

  // 🎨 OBTENER ICONO DE ESTADO
  getStatusIcon(status) {
    const icons = {
      'starting': '🟡',
      'healthy': '🟢',
      'unhealthy': '🟠',
      'failed': '🔴',
      'error': '❌'
    };
    return icons[status] || '❓';
  }

  // 📊 OBTENER USO DE CPU
  getCpuUsage() {
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
    return 100 - ~~(100 * idle / total);
  }

  // 💾 OBTENER USO DE MEMORIA
  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    return ((total - free) / total) * 100;
  }

  // 🏷️ OBTENER NOMBRE DE CLASE DE SERVICIO
  getServiceClassName(serviceName) {
    const classNames = {
      'api-gateway': 'NextGenAPIGateway',
      'auth-service': 'NextGenAuthService',
      'notification-service': 'NextGenNotificationService',
      'analytics-service': 'NextGenAnalyticsService',
      'monitoring-service': 'NextGenMonitoringService'
    };
    return classNames[serviceName] || serviceName;
  }

  // 🛡️ CONFIGURAR MANEJO DE SEÑALES
  setupSignalHandlers() {
    // Manejo de cierre limpio
    const shutdown = (signal) => {
      console.log(`\n🛡️ Recibida señal ${signal}, cerrando servicios...`);
      this.gracefulShutdown();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => {
      console.log('🔄 Recargando configuración...');
      this.reloadConfiguration();
    });

    // Manejo de errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('❌ Error no capturado:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rechazada no manejada:', reason);
    });
  }

  // 🔄 RECARGAR CONFIGURACIÓN
  reloadConfiguration() {
    console.log('🔄 Recargando configuración de servicios...');
    // Implementar recarga de configuración
  }

  // 👋 CIERRE LIMPIO
  gracefulShutdown() {
    console.log('👋 Iniciando cierre limpio de servicios...');

    // Cerrar todos los workers
    for (const worker of Object.values(cluster.workers)) {
      worker.send('shutdown');
      worker.disconnect();

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        worker.kill('SIGKILL');
      }, 10000);
    }

    // Cerrar proceso master después de que todos los workers terminen
    setTimeout(() => {
      console.log('👋 Cierre completo');
      process.exit(0);
    }, 15000);
  }

  // 📊 API DE CONTROL
  startControlAPI() {
    const express = require('express');
    const app = express();
    app.use(express.json());

    // Estado general
    app.get('/orchestrator/status', (req, res) => {
      const status = {};
      for (const [name, service] of this.services.entries()) {
        status[name] = {
          status: service.status,
          instances: service.workers.length,
          healthy: service.healthy,
          uptime: Date.now() - service.startTime
        };
      }
      res.json(status);
    });

    // Escalar servicio
    app.post('/orchestrator/scale/:service', (req, res) => {
      const { service } = req.params;
      const { action } = req.body; // 'up' o 'down'

      if (action === 'up') {
        this.addServiceInstance(service);
      } else if (action === 'down') {
        this.removeServiceInstance(service);
      }

      res.json({ success: true, action, service });
    });

    // Reiniciar servicio
    app.post('/orchestrator/restart/:service', (req, res) => {
      const { service } = req.params;
      this.restartService(service);
      res.json({ success: true, action: 'restart', service });
    });

    app.listen(9000, () => {
      console.log('🎛️ API de control del orquestador iniciada en puerto 9000');
    });
  }

  // 🔄 REINICIAR SERVICIO
  restartService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return;

    console.log(`🔄 Reiniciando ${serviceName}...`);

    // Matar todos los workers del servicio
    service.workers.forEach(worker => {
      worker.kill('SIGTERM');
    });

    // Limpiar workers
    service.workers = [];

    // Reiniciar después de un momento
    setTimeout(() => {
      this.startService(serviceName, service.instances);
    }, 2000);
  }
}

// 🚀 INICIALIZAR ORQUESTADOR
const orchestrator = new NextGenOrchestrator();

// Iniciar API de control si es el proceso master
if (cluster.isMaster) {
  setTimeout(() => {
    orchestrator.startControlAPI();
  }, 5000);
}

module.exports = {
  NextGenOrchestrator,
  orchestrator
};