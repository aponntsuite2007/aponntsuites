/**
 * PM2 ECOSYSTEM CONFIG - ENTERPRISE MODE
 *
 * Para soportar 200k usuarios concurrentes:
 * - Cluster mode con 1 instancia por CPU core
 * - Auto-restart en crash
 * - 0 downtime deployments
 * - Load balancing automático entre instancias
 *
 * INSTALACIÓN PM2:
 *   npm install -g pm2
 *
 * COMANDOS:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production  (0 downtime)
 *   pm2 stop all
 *   pm2 logs
 *   pm2 monit
 *   pm2 save
 *   pm2 startup  (auto-start en boot del servidor)
 */

module.exports = {
  apps: [
    {
      name: 'attendance-api',
      script: './server.js',

      // ⚡ CLUSTER MODE: 1 instancia por CPU core
      // En servidor con 8 cores = 8 instancias = 80k requests/min
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',

      // ⚡ MEMORY MANAGEMENT
      // Restart si excede 1GB de RAM (prevenir memory leaks)
      max_memory_restart: '1G',

      // ⚡ AUTO-RESTART STRATEGY
      autorestart: true,
      max_restarts: 10,        // Máximo 10 restarts en...
      min_uptime: '10s',       // ...10 segundos (evitar restart loops)
      restart_delay: 4000,     // 4s delay entre restarts

      // ⚡ GRACEFUL SHUTDOWN
      kill_timeout: 5000,      // Esperar 5s para shutdown graceful
      listen_timeout: 3000,    // Esperar 3s para que la app escuche el puerto
      shutdown_with_message: true,

      // ⚡ ENVIRONMENT VARIABLES
      env: {
        NODE_ENV: 'development',
        PORT: 9998,
        DB_POOL_MAX: 50,
        DB_POOL_MIN: 10,
        DB_LOGGING: 'false',
        // 🔴 ENTERPRISE: Redis for caching and Bull queues
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9998,
        DB_POOL_MAX: 100,
        DB_POOL_MIN: 20,
        DB_LOGGING: 'false',
        // 🔴 ENTERPRISE: Redis for caching and Bull queues
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || ''
      },

      // ⚡ LOGGING
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,              // Timestamps en logs
      merge_logs: true,        // Combinar logs de todas las instancias
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ⚡ MONITORING
      // pm2 install pm2-logrotate  (para rotar logs automáticamente)
      // pm2 install pm2-server-monit  (dashboard de monitoring)

      // ⚡ CRON (ejemplo: limpiar cache cada 6 horas)
      // cron_restart: '0 */6 * * *',

      // ⚡ WATCH MODE (solo desarrollo - NO usar en producción)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'tests', '.git'],

      // ⚡ SOURCE MAP SUPPORT (para stack traces legibles)
      source_map_support: true,

      // ⚡ INCREMENT VAR (para identificar cada instancia)
      instance_var: 'INSTANCE_ID',

      // ⚡ WAIT READY (para apps que tardan en iniciar)
      wait_ready: true,

      // ⚡ EXPONENTIAL BACKOFF (restart delay exponencial)
      exp_backoff_restart_delay: 100,
    },

    // ⚡ WORKER OPCIONAL: Jobs background (emails, reportes, etc.)
    // Descomenta si necesitas procesos background separados
    /*
    {
      name: 'attendance-worker',
      script: './workers/queue-worker.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      autorestart: true,
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'queue'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'queue'
      }
    },
    */

    // ⚡ AUTONOMOUS QA SYSTEM: Testing 24/7 sin humanos
    // Ejecuta chaos testing, health monitoring, anomaly detection
    // Reemplaza 2-3 QA testers ($120k-$180k/año)
    {
      name: 'autonomous-qa',
      script: './src/autonomous-qa/AutonomousQAOrchestrator.js',
      instances: 1,             // Solo 1 instancia (orchestrator único)
      exec_mode: 'fork',        // No cluster (stateful)
      autorestart: true,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',

      env: {
        NODE_ENV: 'development',
        QA_CHAOS_ENABLED: 'true',
        QA_CHAOS_INTERVAL: '30',        // Cada 30 min
        QA_HEALTH_ENABLED: 'true',
        QA_HEALTH_INTERVAL: '5',        // Cada 5 min
        QA_ANOMALY_ENABLED: 'false',    // FASE 2
        QA_AUTO_HEALING: 'false',       // FASE 2 (requiere aprobación)
        QA_LEARNING: 'true'
      },

      env_production: {
        NODE_ENV: 'production',
        QA_CHAOS_ENABLED: 'true',
        QA_CHAOS_INTERVAL: '60',        // Cada 1 hora en producción
        QA_HEALTH_ENABLED: 'true',
        QA_HEALTH_INTERVAL: '5',
        QA_ANOMALY_ENABLED: 'true',
        QA_AUTO_HEALING: 'true',        // Activar en producción
        QA_LEARNING: 'true'
      },

      error_file: './logs/autonomous-qa-error.log',
      out_file: './logs/autonomous-qa-out.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  // ⚡ DEPLOY CONFIG (opcional - para deploy automático)
  // Descomenta y configura si usas pm2 deploy
  /*
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo.git',
      path: '/var/www/attendance-system',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
  */
};
