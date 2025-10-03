const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require('ws');
const { dbManager } = require('../config/database-next-gen');
const { aiEngine } = require('../services/ai-biometric-engine');

// 🚀 API GATEWAY ULTRA-ESCALABLE
class NextGenAPIGateway {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    this.services = new Map();
    this.circuitBreakers = new Map();
    this.metrics = {
      requests: 0,
      errors: 0,
      latency: [],
      activeConnections: 0
    };

    this.initializeMiddleware();
    this.setupServiceRegistry();
    this.setupCircuitBreakers();
    this.setupWebSocketServer();
    this.setupRoutes();
  }

  // 🛡️ MIDDLEWARE DE SEGURIDAD AVANZADO
  initializeMiddleware() {
    // 🔒 SEGURIDAD EXTREMA
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // 🚀 COMPRESIÓN ULTRA-RÁPIDA
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      }
    }));

    // 🌐 CORS CONFIGURADO PARA MULTI-TENANT
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = this.getAllowedOrigins();
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID']
    }));

    // 📊 RATE LIMITING INTELIGENTE
    this.setupRateLimiting();

    // 🔍 REQUEST TRACKING
    this.app.use(this.requestTracker.bind(this));

    // 🧾 PARSER OPTIMIZADO
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  // 🚦 RATE LIMITING POR TENANT Y ROL
  setupRateLimiting() {
    // 🎯 LIMITE BÁSICO GLOBAL
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 1000, // límite por IP
      message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // 🏢 LIMITE POR TENANT
    const tenantLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: (req) => {
        const tenantId = req.headers['x-tenant-id'];
        return this.getTenantRateLimit(tenantId);
      },
      keyGenerator: (req) => `${req.ip}:${req.headers['x-tenant-id']}`,
      message: (req) => ({
        error: 'Tenant rate limit exceeded',
        tenantId: req.headers['x-tenant-id'],
        retryAfter: '15 minutes'
      })
    });

    // 🤖 LIMITE ESPECIAL PARA IA BIOMÉTRICA
    const biometricLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 60, // 60 scans por minuto
      keyGenerator: (req) => `biometric:${req.ip}:${req.headers['x-tenant-id']}`,
      message: {
        error: 'Biometric scan rate limit exceeded',
        message: 'Too many biometric scans. Please wait.'
      }
    });

    this.app.use(globalLimiter);
    this.app.use('/api/', tenantLimiter);
    this.app.use('/api/v2/biometric/', biometricLimiter);
  }

  // 📊 TRACKING DE REQUESTS
  requestTracker(req, res, next) {
    const start = Date.now();
    const requestId = this.generateRequestId();

    req.requestId = requestId;
    req.startTime = start;

    res.setHeader('X-Request-ID', requestId);

    // 📈 MÉTRICAS EN TIEMPO REAL
    this.metrics.requests++;
    this.metrics.activeConnections++;

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.metrics.latency.push(duration);
      this.metrics.activeConnections--;

      // Mantener solo las últimas 1000 latencias
      if (this.metrics.latency.length > 1000) {
        this.metrics.latency = this.metrics.latency.slice(-1000);
      }

      // Log requests lentas
      if (duration > 5000) {
        console.warn(`🐌 Slow request [${duration}ms]: ${req.method} ${req.url}`);
      }

      // Actualizar métricas en Redis
      this.updateMetrics(req, res, duration);
    });

    res.on('error', () => {
      this.metrics.errors++;
      this.metrics.activeConnections--;
    });

    next();
  }

  // 📋 REGISTRO DE SERVICIOS
  setupServiceRegistry() {
    this.services.set('auth', {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      healthCheck: '/health',
      weight: 1,
      status: 'healthy'
    });

    this.services.set('biometric', {
      url: process.env.BIOMETRIC_SERVICE_URL || 'http://localhost:3002',
      healthCheck: '/health',
      weight: 1,
      status: 'healthy'
    });

    this.services.set('attendance', {
      url: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3003',
      healthCheck: '/health',
      weight: 1,
      status: 'healthy'
    });

    this.services.set('analytics', {
      url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
      healthCheck: '/health',
      weight: 1,
      status: 'healthy'
    });

    this.services.set('notification', {
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
      healthCheck: '/health',
      weight: 1,
      status: 'healthy'
    });

    // 💓 HEALTH CHECK AUTOMÁTICO
    setInterval(() => this.performHealthChecks(), 30000);
  }

  // 🔌 CIRCUIT BREAKERS PARA RESILENCIA
  setupCircuitBreakers() {
    for (const [serviceName] of this.services) {
      this.circuitBreakers.set(serviceName, {
        failureCount: 0,
        lastFailureTime: null,
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        threshold: 5,
        timeout: 60000 // 1 minuto
      });
    }
  }

  // 🔍 VERIFICACIÓN DE CLIENTE WEBSOCKET
  verifyWebSocketClient(info) {
    try {
      const { req } = info;
      const tenantId = req.headers['x-tenant-id'];
      const userId = req.headers['x-user-id'];

      // Verificar que tenant ID esté presente
      if (!tenantId) {
        console.warn('🚫 WebSocket connection rejected: Missing tenant ID');
        return false;
      }

      // Verificar que user ID esté presente
      if (!userId) {
        console.warn('🚫 WebSocket connection rejected: Missing user ID');
        return false;
      }

      // Para desarrollo/testing, permitir conexiones básicas con headers válidos
      console.log(`✅ WebSocket connection verified: Tenant ${tenantId}, User ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ WebSocket verification error:', error);
      return false;
    }
  }

  // 🌐 WEBSOCKET SERVER PARA TIEMPO REAL
  setupWebSocketServer() {
    this.wss = new WebSocket.Server({
      port: 8080,
      verifyClient: this.verifyWebSocketClient.bind(this)
    });

    this.wss.on('connection', (ws, req) => {
      const tenantId = req.headers['x-tenant-id'];
      const userId = req.headers['x-user-id'];

      ws.tenantId = tenantId;
      ws.userId = userId;
      ws.isAlive = true;

      console.log(`🔌 WebSocket connected: Tenant ${tenantId}, User ${userId}`);

      // 💓 HEARTBEAT
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // 📨 MANEJO DE MENSAJES
      ws.on('message', (message) => {
        this.handleWebSocketMessage(ws, message);
      });

      // 🔌 DESCONEXIÓN
      ws.on('close', () => {
        console.log(`🔌 WebSocket disconnected: Tenant ${tenantId}, User ${userId}`);
      });
    });

    // 💓 PING INTERVAL PARA MANTENER CONEXIONES VIVAS
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // 🛣️ CONFIGURACIÓN DE RUTAS
  setupRoutes() {
    // 🏥 HEALTH CHECK ENDPOINT
    this.app.get('/health', this.healthCheckEndpoint.bind(this));

    // 📊 MÉTRICAS ENDPOINT
    this.app.get('/metrics', this.metricsEndpoint.bind(this));

    // 🤖 ENDPOINTS DE IA BIOMÉTRICA
    this.setupBiometricRoutes();

    // 🌐 PROXY PARA SERVICIOS LEGACY
    this.setupLegacyProxy();

    // 🚫 404 HANDLER
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: this.getAvailableEndpoints()
      });
    });

    // 🚨 ERROR HANDLER GLOBAL
    this.app.use(this.globalErrorHandler.bind(this));
  }

  // 🤖 RUTAS DE IA BIOMÉTRICA
  setupBiometricRoutes() {
    // 📸 PROCESAMIENTO DE IMAGEN CON IA
    this.app.post('/api/v2/biometric/scan',
      this.authenticateToken.bind(this),
      this.validateTenant.bind(this),
      async (req, res) => {
        try {
          const { tenantId } = req.tenant;
          const { userId } = req.user;
          const { image } = req.body;

          if (!image) {
            return res.status(400).json({
              error: 'Image required',
              message: 'Base64 encoded image is required'
            });
          }

          // 🧠 PROCESAMIENTO CON IA
          const imageBuffer = Buffer.from(image, 'base64');
          const result = await aiEngine.processImage(imageBuffer, tenantId, userId);

          if (!result.success) {
            return res.status(400).json({
              error: 'Processing failed',
              message: result.error
            });
          }

          // 📊 BROADCAST A CLIENTES WEBSOCKET
          this.broadcastBiometricResult(tenantId, userId, result.data);

          res.json({
            success: true,
            data: result.data,
            processingTime: Date.now() - req.startTime
          });

        } catch (error) {
          console.error('❌ Biometric scan error:', error);
          res.status(500).json({
            error: 'Internal server error',
            requestId: req.requestId
          });
        }
      }
    );

    // 📊 INSIGHTS PREDICTIVOS
    this.app.get('/api/v2/biometric/insights/:userId',
      this.authenticateToken.bind(this),
      this.validateTenant.bind(this),
      async (req, res) => {
        try {
          const { tenantId } = req.tenant;
          const { userId } = req.params;
          const { timeframe = '30d' } = req.query;

          const insights = await aiEngine.generatePredictiveInsights(tenantId, userId, timeframe);

          res.json({
            success: true,
            data: insights,
            generatedAt: new Date()
          });

        } catch (error) {
          console.error('❌ Insights error:', error);
          res.status(500).json({
            error: 'Failed to generate insights',
            requestId: req.requestId
          });
        }
      }
    );

    // 📈 ANALYTICS EN TIEMPO REAL
    this.app.get('/api/v2/biometric/realtime/:tenantId',
      this.authenticateToken.bind(this),
      this.validateTenant.bind(this),
      async (req, res) => {
        try {
          const { tenantId } = req.params;
          const stats = await dbManager.getRealtimeStats(tenantId);

          res.json({
            success: true,
            data: stats,
            timestamp: new Date()
          });

        } catch (error) {
          console.error('❌ Realtime stats error:', error);
          res.status(500).json({
            error: 'Failed to get realtime stats',
            requestId: req.requestId
          });
        }
      }
    );
  }

  // 🔒 AUTENTICACIÓN JWT AVANZADA
  authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid JWT token'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        return res.status(403).json({
          error: 'Invalid token',
          message: 'Token is invalid or expired'
        });
      }

      req.user = user;
      next();
    });
  }

  // 🏢 VALIDACIÓN MULTI-TENANT
  validateTenant(req, res, next) {
    const tenantId = req.headers['x-tenant-id'] || req.params.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID required',
        message: 'Please provide X-Tenant-ID header'
      });
    }

    // Validar que el usuario pertenece al tenant
    if (req.user && req.user.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Tenant access denied',
        message: 'User does not belong to this tenant'
      });
    }

    req.tenant = { tenantId };
    next();
  }

  // 📊 BROADCAST WEBSOCKET
  broadcastBiometricResult(tenantId, userId, data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN &&
          client.tenantId === tenantId) {

        const message = {
          type: 'biometric_result',
          userId,
          data,
          timestamp: new Date()
        };

        client.send(JSON.stringify(message));
      }
    });
  }

  // 🏥 HEALTH CHECK
  async healthCheckEndpoint(req, res) {
    const health = await dbManager.healthCheck();
    const aiHealth = aiEngine.healthCheck();

    const overall = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: health.database,
        redis: health.redis,
        ai: aiHealth,
        gateway: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      },
      metrics: this.getMetricsSummary()
    };

    // Determinar estado general
    const hasUnhealthy = Object.values(health.database).includes('unhealthy') ||
                        health.redis.status === 'unhealthy';

    if (hasUnhealthy) {
      overall.status = 'degraded';
    }

    res.status(overall.status === 'healthy' ? 200 : 503).json(overall);
  }

  // 📊 ENDPOINT DE MÉTRICAS
  metricsEndpoint(req, res) {
    const metrics = this.getMetricsSummary();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date()
    });
  }

  // 📈 RESUMEN DE MÉTRICAS
  getMetricsSummary() {
    const avgLatency = this.metrics.latency.length > 0
      ? this.metrics.latency.reduce((a, b) => a + b) / this.metrics.latency.length
      : 0;

    const p95Latency = this.metrics.latency.length > 0
      ? this.metrics.latency.sort((a, b) => a - b)[Math.floor(this.metrics.latency.length * 0.95)]
      : 0;

    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) : 0,
      activeConnections: this.metrics.activeConnections,
      averageLatency: Math.round(avgLatency),
      p95Latency: Math.round(p95Latency),
      websocketConnections: this.wss.clients.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  // 🚀 INICIAR SERVIDOR
  async start(port = process.env.PORT || 3000) {
    this.server = this.app.listen(port, () => {
      console.log(`🚀 Next-Gen API Gateway running on port ${port}`);
      console.log(`🌐 WebSocket server running on port 8080`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`📈 Metrics: http://localhost:${port}/metrics`);
    });

    // 🧹 GRACEFUL SHUTDOWN
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
  }

  // 🧹 APAGADO ELEGANTE
  async gracefulShutdown() {
    console.log('🧹 Iniciando apagado elegante...');

    // Cerrar WebSocket server
    this.wss.close();

    // Cerrar HTTP server
    this.server.close(() => {
      console.log('✅ Servidor cerrado exitosamente');
      process.exit(0);
    });

    // Timeout de emergencia
    setTimeout(() => {
      console.log('⚠️ Apagado forzado por timeout');
      process.exit(1);
    }, 10000);
  }

  // 🔧 MÉTODOS AUXILIARES
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAllowedOrigins() {
    return (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');
  }

  getTenantRateLimit(tenantId) {
    // Implementar lógica de rate limiting por tier de tenant
    const tierLimits = {
      basic: 100,
      pro: 500,
      enterprise: 2000
    };

    // TODO: Obtener tier del tenant desde base de datos
    return tierLimits.enterprise || 100;
  }

  async updateMetrics(req, res, duration) {
    const pipeline = dbManager.redis.pipeline();
    const timestamp = new Date();
    const hour = timestamp.getHours();

    pipeline.incr(`metrics:requests:${hour}`);
    pipeline.incr(`metrics:tenant:${req.tenant?.tenantId}:requests`);
    pipeline.lpush(`metrics:latency:${hour}`, duration);
    pipeline.ltrim(`metrics:latency:${hour}`, 0, 999);

    if (res.statusCode >= 400) {
      pipeline.incr(`metrics:errors:${hour}`);
    }

    await pipeline.exec();
  }

  // 🌐 PROXY PARA SERVICIOS LEGACY
  setupLegacyProxy() {
    // Redirigir llamadas legacy al servidor existente
    this.app.use('/api/v1/*', createProxyMiddleware({
      target: 'http://localhost:9999',
      changeOrigin: true,
      pathRewrite: {
        '^/api/v1': '/api/v1'
      },
      onError: (err, req, res) => {
        console.error('🚨 Proxy error:', err.message);
        res.status(503).json({
          error: 'Service unavailable',
          message: 'Legacy service is down'
        });
      }
    }));

    this.app.use('/api/aponnt/*', createProxyMiddleware({
      target: 'http://localhost:9999',
      changeOrigin: true,
      pathRewrite: {
        '^/api/aponnt': '/api/aponnt'
      }
    }));
  }

  // 📨 MANEJO DE MENSAJES WEBSOCKET
  handleWebSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      console.log(`📨 WebSocket message from ${ws.tenantId}:${ws.userId}:`, data.type);

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
          break;
        case 'subscribe':
          ws.subscriptions = data.channels || [];
          break;
        default:
          console.warn('🤔 Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  }

  // 📋 ENDPOINTS DISPONIBLES
  getAvailableEndpoints() {
    return [
      'GET /health',
      'GET /metrics',
      'POST /api/v2/biometric/scan',
      'GET /api/v2/biometric/insights/:userId',
      'GET /api/v2/biometric/realtime/:tenantId',
      'ANY /api/v1/* (proxied)',
      'ANY /api/aponnt/* (proxied)'
    ];
  }

  // 💓 HEALTH CHECKS DE SERVICIOS
  async performHealthChecks() {
    console.log('💓 Performing health checks...');
    // Implementar health checks reales aquí
  }

  globalErrorHandler(error, req, res, next) {
    console.error('🚨 Global error:', error);

    this.metrics.errors++;

    res.status(500).json({
      error: 'Internal server error',
      requestId: req.requestId,
      timestamp: new Date()
    });
  }
}

// 🌟 EXPORT Y AUTO-START
const gateway = new NextGenAPIGateway();

module.exports = {
  NextGenAPIGateway,
  gateway,
  start: (port) => gateway.start(port)
};

// 🚀 AUTO-START SI ES ARCHIVO PRINCIPAL
if (require.main === module) {
  gateway.start();
}