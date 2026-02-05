const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const { EventEmitter } = require('events');
const Bull = require('bull');
const nodemailer = require('nodemailer');
const { dbManager } = require('../config/database-next-gen');
const { getBaseUrl } = require('../utils/urlHelper');

// 📡 SERVICIO DE NOTIFICACIONES NEXT-GEN
class NextGenNotificationService extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.clients = new Map(); // tenant -> Map(userId -> WebSocket)
    this.rooms = new Map(); // roomId -> Set(WebSocket)

    // Colas de trabajo para notificaciones
    this.emailQueue = new Bull('email notifications', {
      redis: { host: 'localhost', port: 6379 }
    });
    this.pushQueue = new Bull('push notifications', {
      redis: { host: 'localhost', port: 6379 }
    });
    this.webhookQueue = new Bull('webhook notifications', {
      redis: { host: 'localhost', port: 6379 }
    });

    this.initializeMiddleware();
    this.initializeWebSocketServer();
    this.initializeEmailTransporter();
    this.initializeJobProcessors();
    this.initializeRoutes();
    this.initializeBiometricAlerts();
  }

  // 🚀 MIDDLEWARE
  initializeMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  // 🌐 SERVIDOR WEBSOCKET AVANZADO
  initializeWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 Nueva conexión WebSocket');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleWebSocketMessage(ws, data);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Mensaje inválido'
          }));
        }
      });

      ws.on('close', () => {
        this.removeClientFromAllRooms(ws);
        console.log('❌ Conexión WebSocket cerrada');
      });

      ws.on('error', (error) => {
        console.error('❌ Error WebSocket:', error);
        this.removeClientFromAllRooms(ws);
      });

      // Ping/Pong para mantener conexión viva
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
    });

    // Heartbeat para limpiar conexiones muertas
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.removeClientFromAllRooms(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // 📧 CONFIGURACIÓN EMAIL
  initializeEmailTransporter() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // ⚙️ PROCESADORES DE COLAS
  initializeJobProcessors() {
    // Procesador de emails
    this.emailQueue.process('send-email', 10, async (job) => {
      const { to, subject, html, tenantId } = job.data;

      try {
        const result = await this.emailTransporter.sendMail({
          from: process.env.FROM_EMAIL || 'sistema@aponnt.com',
          to,
          subject,
          html
        });

        // Log en base de datos
        await this.logNotification(tenantId, 'email', to, subject, 'sent');
        return result;

      } catch (error) {
        await this.logNotification(tenantId, 'email', to, subject, 'failed', error.message);
        throw error;
      }
    });

    // Procesador de push notifications
    this.pushQueue.process('send-push', 5, async (job) => {
      const { userId, tenantId, title, body, data } = job.data;

      try {
        // Implementar envío de push notification
        // (Firebase, OneSignal, etc.)
        console.log(`📱 Push enviado a usuario ${userId}: ${title}`);

        await this.logNotification(tenantId, 'push', userId, title, 'sent');
        return { success: true };

      } catch (error) {
        await this.logNotification(tenantId, 'push', userId, title, 'failed', error.message);
        throw error;
      }
    });

    // Procesador de webhooks
    this.webhookQueue.process('send-webhook', 3, async (job) => {
      const { url, payload, tenantId } = job.data;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        await this.logNotification(tenantId, 'webhook', url, 'webhook_call', 'sent');
        return { success: true, status: response.status };

      } catch (error) {
        await this.logNotification(tenantId, 'webhook', url, 'webhook_call', 'failed', error.message);
        throw error;
      }
    });
  }

  // 🌐 RUTAS REST API
  initializeRoutes() {
    // 📨 ENVIAR NOTIFICACIÓN
    this.app.post('/notifications/send', async (req, res) => {
      try {
        const {
          tenantId,
          userId,
          type,
          title,
          message,
          channels = ['websocket'],
          priority = 'normal',
          metadata = {}
        } = req.body;

        if (!tenantId || !userId || !title || !message) {
          return res.status(400).json({
            error: 'tenantId, userId, title y message son requeridos'
          });
        }

        const notificationId = await this.sendNotification({
          tenantId,
          userId,
          type,
          title,
          message,
          channels,
          priority,
          metadata
        });

        res.json({
          success: true,
          notificationId,
          message: 'Notificación enviada'
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📢 BROADCAST A TODOS LOS USUARIOS DE UN TENANT
    this.app.post('/notifications/broadcast', async (req, res) => {
      try {
        const {
          tenantId,
          title,
          message,
          type = 'broadcast',
          channels = ['websocket'],
          targetRoles = [],
          targetCompanies = []
        } = req.body;

        if (!tenantId || !title || !message) {
          return res.status(400).json({
            error: 'tenantId, title y message son requeridos'
          });
        }

        const result = await this.broadcastToTenant({
          tenantId,
          title,
          message,
          type,
          channels,
          targetRoles,
          targetCompanies
        });

        res.json({
          success: true,
          sentCount: result.sentCount,
          message: 'Broadcast enviado'
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🔔 OBTENER NOTIFICACIONES DE USUARIO
    this.app.get('/notifications/:tenantId/:userId', async (req, res) => {
      try {
        const { tenantId, userId } = req.params;
        const { limit = 50, offset = 0, unreadOnly = false } = req.query;

        const connection = await dbManager.getTenantConnection(tenantId);
        const whereClause = unreadOnly === 'true' ? 'AND read_at IS NULL' : '';

        const notifications = await connection.query(`
          SELECT id, type, title, message, metadata, priority,
                 read_at, created_at, expires_at
          FROM notifications
          WHERE tenant_id = :tenantId AND user_id = :userId ${whereClause}
          ORDER BY created_at DESC
          LIMIT :limit OFFSET :offset
        `, {
          replacements: { tenantId, userId, limit: parseInt(limit), offset: parseInt(offset) },
          type: connection.QueryTypes.SELECT
        });

        const unreadCount = await connection.query(`
          SELECT COUNT(*) as count
          FROM notifications
          WHERE tenant_id = :tenantId AND user_id = :userId AND read_at IS NULL
        `, {
          replacements: { tenantId, userId },
          type: connection.QueryTypes.SELECT
        });

        res.json({
          success: true,
          notifications,
          unreadCount: unreadCount[0].count,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: notifications.length
          }
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ✅ MARCAR NOTIFICACIÓN COMO LEÍDA
    this.app.patch('/notifications/:tenantId/:notificationId/read', async (req, res) => {
      try {
        const { tenantId, notificationId } = req.params;

        const connection = await dbManager.getTenantConnection(tenantId);
        await connection.query(`
          UPDATE notifications
          SET read_at = NOW()
          WHERE id = :notificationId AND tenant_id = :tenantId AND read_at IS NULL
        `, {
          replacements: { notificationId, tenantId },
          type: connection.QueryTypes.UPDATE
        });

        res.json({
          success: true,
          message: 'Notificación marcada como leída'
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📊 ESTADÍSTICAS DE NOTIFICACIONES
    this.app.get('/notifications/stats/:tenantId', async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { period = '24h' } = req.query;

        const connection = await dbManager.getTenantConnection(tenantId);

        let timeFilter = '';
        switch (period) {
          case '1h':
            timeFilter = "AND created_at >= NOW() - INTERVAL '1 hour'";
            break;
          case '24h':
            timeFilter = "AND created_at >= NOW() - INTERVAL '1 day'";
            break;
          case '7d':
            timeFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
            break;
          case '30d':
            timeFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
            break;
        }

        const stats = await connection.query(`
          SELECT
            COUNT(*) as total_sent,
            COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as total_read,
            COUNT(CASE WHEN type = 'biometric_alert' THEN 1 END) as biometric_alerts,
            COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
            AVG(EXTRACT(EPOCH FROM (read_at - created_at))) as avg_read_time_seconds
          FROM notifications
          WHERE tenant_id = :tenantId ${timeFilter}
        `, {
          replacements: { tenantId },
          type: connection.QueryTypes.SELECT
        });

        res.json({
          success: true,
          period,
          stats: stats[0]
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📊 HEALTH CHECK
    this.app.get('/notifications/health', (req, res) => {
      res.json({
        service: 'notification-service',
        status: 'healthy',
        timestamp: new Date(),
        websocketClients: this.wss.clients.size,
        emailQueueWaiting: this.emailQueue.waiting(),
        pushQueueWaiting: this.pushQueue.waiting(),
        webhookQueueWaiting: this.webhookQueue.waiting()
      });
    });
  }

  // 🧠 ALERTAS BIOMÉTRICAS IA
  initializeBiometricAlerts() {
    // Escuchar eventos del motor IA biométrico
    this.on('biometric_alert', async (alertData) => {
      await this.handleBiometricAlert(alertData);
    });

    this.on('emotional_pattern_detected', async (patternData) => {
      await this.handleEmotionalPattern(patternData);
    });

    this.on('anomaly_detected', async (anomalyData) => {
      await this.handleAnomalyDetection(anomalyData);
    });
  }

  // 📨 ENVIAR NOTIFICACIÓN PRINCIPAL
  async sendNotification({
    tenantId,
    userId,
    type = 'general',
    title,
    message,
    channels = ['websocket'],
    priority = 'normal',
    metadata = {},
    expiresIn = '7d'
  }) {
    try {
      // Guardar en base de datos
      const connection = await dbManager.getTenantConnection(tenantId);
      const notificationResult = await connection.query(`
        INSERT INTO notifications (tenant_id, user_id, type, title, message, metadata, priority, expires_at, created_at)
        VALUES (:tenantId, :userId, :type, :title, :message, :metadata, :priority,
                NOW() + INTERVAL :expiresIn, NOW())
        RETURNING id
      `, {
        replacements: {
          tenantId,
          userId,
          type,
          title,
          message,
          metadata: JSON.stringify(metadata),
          priority,
          expiresIn
        },
        type: connection.QueryTypes.INSERT
      });

      const notificationId = notificationResult[0][0].id;

      // Enviar por canales solicitados
      const promises = channels.map(channel => {
        switch (channel) {
          case 'websocket':
            return this.sendWebSocketNotification(tenantId, userId, {
              id: notificationId,
              type,
              title,
              message,
              metadata,
              priority,
              timestamp: new Date()
            });

          case 'email':
            if (metadata.email) {
              return this.emailQueue.add('send-email', {
                to: metadata.email,
                subject: title,
                html: this.generateEmailTemplate(title, message, metadata),
                tenantId
              });
            }
            break;

          case 'push':
            return this.pushQueue.add('send-push', {
              userId,
              tenantId,
              title,
              body: message,
              data: metadata
            });

          case 'webhook':
            if (metadata.webhookUrl) {
              return this.webhookQueue.add('send-webhook', {
                url: metadata.webhookUrl,
                payload: { type, title, message, userId, tenantId, metadata },
                tenantId
              });
            }
            break;
        }
      });

      await Promise.allSettled(promises);
      return notificationId;

    } catch (error) {
      console.error('Error enviando notificación:', error);
      throw error;
    }
  }

  // 📢 BROADCAST A TENANT
  async broadcastToTenant({
    tenantId,
    title,
    message,
    type = 'broadcast',
    channels = ['websocket'],
    targetRoles = [],
    targetCompanies = []
  }) {
    try {
      // Obtener usuarios objetivo
      const connection = await dbManager.getTenantConnection(tenantId);

      let roleFilter = '';
      let companyFilter = '';

      if (targetRoles.length > 0) {
        roleFilter = `AND role IN (${targetRoles.map(r => `'${r}'`).join(',')})`;
      }

      if (targetCompanies.length > 0) {
        companyFilter = `AND company_id IN (${targetCompanies.join(',')})`;
      }

      const users = await connection.query(`
        SELECT id, email, first_name, last_name
        FROM users
        WHERE tenant_id = :tenantId AND active = true ${roleFilter} ${companyFilter}
      `, {
        replacements: { tenantId },
        type: connection.QueryTypes.SELECT
      });

      // Enviar a cada usuario
      const promises = users.map(user =>
        this.sendNotification({
          tenantId,
          userId: user.user_id,
          type,
          title,
          message,
          channels,
          metadata: { email: user.email, broadcast: true }
        })
      );

      await Promise.allSettled(promises);

      return { sentCount: users.length };

    } catch (error) {
      console.error('Error en broadcast:', error);
      throw error;
    }
  }

  // 🌐 WEBSOCKET MESSAGING
  async handleWebSocketMessage(ws, data) {
    const { type, payload } = data;

    switch (type) {
      case 'authenticate':
        await this.authenticateWebSocket(ws, payload);
        break;

      case 'join_room':
        this.joinRoom(ws, payload.roomId);
        break;

      case 'leave_room':
        this.leaveRoom(ws, payload.roomId);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Tipo de mensaje no reconocido: ${type}`
        }));
    }
  }

  // 🔐 AUTENTICACIÓN WEBSOCKET
  async authenticateWebSocket(ws, payload) {
    try {
      const { token, tenantId, userId } = payload;

      // Validar token JWT (implementar validación real)
      if (!token || !tenantId || !userId) {
        throw new Error('Token, tenantId y userId requeridos');
      }

      // Agregar cliente autenticado
      if (!this.clients.has(tenantId)) {
        this.clients.set(tenantId, new Map());
      }

      this.clients.get(tenantId).set(userId, ws);
      ws.tenantId = tenantId;
      ws.userId = userId;
      ws.authenticated = true;

      ws.send(JSON.stringify({
        type: 'authenticated',
        message: 'Conexión autenticada exitosamente'
      }));

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: error.message
      }));
    }
  }

  // 📨 ENVIAR WEBSOCKET NOTIFICATION
  async sendWebSocketNotification(tenantId, userId, notification) {
    try {
      const tenantClients = this.clients.get(tenantId);
      if (!tenantClients) return;

      const userSocket = tenantClients.get(userId);
      if (!userSocket || userSocket.readyState !== WebSocket.OPEN) return;

      userSocket.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));

    } catch (error) {
      console.error('Error enviando WebSocket notification:', error);
    }
  }

  // 🚨 MANEJO DE ALERTAS BIOMÉTRICAS
  async handleBiometricAlert(alertData) {
    const { tenantId, userId, alertType, severity, data } = alertData;

    let title = '';
    let message = '';
    let priority = 'normal';

    switch (alertType) {
      case 'fatigue':
        title = '😴 Alerta de Fatiga Detectada';
        message = `Nivel ${severity} de fatiga detectado en el empleado`;
        priority = severity === 'critical' ? 'high' : 'normal';
        break;

      case 'stress':
        title = '😰 Alerta de Estrés Detectada';
        message = `Nivel ${severity} de estrés detectado en el empleado`;
        priority = severity === 'high' || severity === 'critical' ? 'high' : 'normal';
        break;

      case 'emotional_anomaly':
        title = '🧠 Anomalía Emocional Detectada';
        message = `Patrón emocional anómalo detectado: ${data.pattern}`;
        priority = 'high';
        break;
    }

    await this.sendNotification({
      tenantId,
      userId,
      type: 'biometric_alert',
      title,
      message,
      channels: ['websocket', 'email'],
      priority,
      metadata: {
        alertType,
        severity,
        biometricData: data,
        requiresAction: priority === 'high'
      }
    });

    // Notificar también a supervisores
    await this.notifySupervisors(tenantId, userId, alertType, severity, data);
  }

  // 🧠 MANEJO DE PATRONES EMOCIONALES
  async handleEmotionalPattern(patternData) {
    const { tenantId, userId, pattern, confidence, timeline } = patternData;

    await this.sendNotification({
      tenantId,
      userId,
      type: 'emotional_pattern',
      title: '📊 Patrón Emocional Detectado',
      message: `Se ha detectado un patrón de ${pattern} con ${confidence}% de confianza`,
      channels: ['websocket'],
      priority: 'normal',
      metadata: {
        pattern,
        confidence,
        timeline,
        analysisType: 'emotional_pattern'
      }
    });
  }

  // 🚨 NOTIFICAR SUPERVISORES
  async notifySupervisors(tenantId, employeeId, alertType, severity, data) {
    try {
      const connection = await dbManager.getTenantConnection(tenantId);

      // Obtener supervisores de la empresa del empleado
      const supervisors = await connection.query(`
        SELECT DISTINCT s.id, s.email, s.first_name, s.last_name
        FROM users s
        JOIN users e ON s.company_id = e.company_id
        WHERE e.id = :employeeId AND e.tenant_id = :tenantId
          AND s.role IN ('supervisor', 'manager', 'admin')
          AND s.active = true
      `, {
        replacements: { employeeId, tenantId },
        type: connection.QueryTypes.SELECT
      });

      // Obtener datos del empleado
      const employees = await connection.query(`
        SELECT first_name, last_name, email, employee_id
        FROM users
        WHERE id = :employeeId AND tenant_id = :tenantId
      `, {
        replacements: { employeeId, tenantId },
        type: connection.QueryTypes.SELECT
      });

      const employee = employees[0];

      // Enviar notificaciones a supervisores
      const promises = supervisors.map(supervisor =>
        this.sendNotification({
          tenantId,
          userId: supervisor.id,
          type: 'supervisor_alert',
          title: `🚨 Alerta Biométrica - ${employee.first_name} ${employee.last_name}`,
          message: `Se detectó ${alertType} nivel ${severity} en el empleado ${employee.employee_id}`,
          channels: ['websocket', 'email'],
          priority: 'high',
          metadata: {
            employeeId,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            employeeEmail: employee.email,
            alertType,
            severity,
            data,
            email: supervisor.email
          }
        })
      );

      await Promise.allSettled(promises);

    } catch (error) {
      console.error('Error notificando supervisores:', error);
    }
  }

  // 📧 PLANTILLA EMAIL
  generateEmailTemplate(title, message, metadata = {}) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🤖 APONNT Sistema Biométrico</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="color: #333;">${title}</h2>
            <p style="color: #666; line-height: 1.6;">${message}</p>
            ${metadata.biometricData ? `
              <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">
                <h3>Datos Biométricos:</h3>
                <pre style="background: #f1f3f4; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(metadata.biometricData, null, 2)}
                </pre>
              </div>
            ` : ''}
            <div style="margin-top: 20px; text-align: center;">
              <a href="${getBaseUrl()}/dashboard"
                 style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Ver Dashboard
              </a>
            </div>
          </div>
          <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
            Sistema APONNT - Gestión Inteligente de Asistencia Biométrica
          </div>
        </body>
      </html>
    `;
  }

  // 📝 LOG DE NOTIFICACIONES
  async logNotification(tenantId, channel, recipient, subject, status, error = null) {
    try {
      const connection = await dbManager.getTenantConnection(tenantId);
      await connection.query(`
        INSERT INTO notification_logs (tenant_id, channel, recipient, subject, status, error_message, timestamp)
        VALUES (:tenantId, :channel, :recipient, :subject, :status, :error, NOW())
      `, {
        replacements: { tenantId, channel, recipient, subject, status, error },
        type: connection.QueryTypes.INSERT
      });
    } catch (logError) {
      console.error('Error logging notification:', logError);
    }
  }

  // 🏠 MANEJO DE ROOMS
  joinRoom(ws, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(ws);
    ws.rooms = ws.rooms || new Set();
    ws.rooms.add(roomId);

    ws.send(JSON.stringify({
      type: 'room_joined',
      roomId
    }));
  }

  leaveRoom(ws, roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    if (ws.rooms) {
      ws.rooms.delete(roomId);
    }

    ws.send(JSON.stringify({
      type: 'room_left',
      roomId
    }));
  }

  removeClientFromAllRooms(ws) {
    // Remover de rooms
    if (ws.rooms) {
      ws.rooms.forEach(roomId => {
        const room = this.rooms.get(roomId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      });
    }

    // Remover de clientes por tenant
    if (ws.tenantId && ws.userId) {
      const tenantClients = this.clients.get(ws.tenantId);
      if (tenantClients) {
        tenantClients.delete(ws.userId);
        if (tenantClients.size === 0) {
          this.clients.delete(ws.tenantId);
        }
      }
    }
  }

  // 🚀 INICIAR SERVICIO
  start(port = 3002) {
    this.server.listen(port, () => {
      console.log(`📡 Notification Service iniciado en puerto ${port}`);
      console.log(`🌐 WebSocket server disponible en ws://localhost:${port}`);
    });
  }
}

// 🌟 EXPORT SINGLETON
const notificationService = new NextGenNotificationService();

module.exports = {
  NextGenNotificationService,
  notificationService,

  // Funciones de utilidad para otros servicios
  sendBiometricAlert: (alertData) => notificationService.handleBiometricAlert(alertData),
  sendNotification: (params) => notificationService.sendNotification(params),
  broadcastToTenant: (params) => notificationService.broadcastToTenant(params)
};