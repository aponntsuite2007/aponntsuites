/**
 * WebSocketManager - Gestiona streaming en tiempo real vía WebSocket
 *
 * RESPONSABILIDADES:
 * - Broadcast de eventos de ejecución a clientes conectados
 * - Gestión de conexiones WebSocket
 * - Streaming de progreso de phases
 *
 * EVENTOS:
 * - execution:started
 * - phase:started
 * - phase:progress
 * - phase:completed
 * - phase:failed
 * - execution:completed
 * - execution:failed
 *
 * @module WebSocketManager
 * @version 2.0.0
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
  constructor() {
    super();

    // WebSocket server instance (se inicializa cuando se llama setup())
    this.wss = null;

    // Set de clientes conectados
    this.clients = new Set();

    // Cola de mensajes (para cuando no hay servidor iniciado)
    this.messageQueue = [];
    this.maxQueueSize = 100;
  }

  /**
   * Inicializa WebSocket server
   *
   * @param {Object} server - HTTP server instance
   * @param {string} path - WebSocket path (default: /ws/e2e-advanced)
   */
  setup(server, path = '/ws/e2e-advanced') {
    if (this.wss) {
      console.log('⚠️  [WS] WebSocket server ya está inicializado');
      return;
    }

    this.wss = new WebSocket.Server({
      server,
      path,
      clientTracking: true
    });

    console.log(`🌐 [WS] WebSocket server inicializado en ${path}`);

    // Event handlers
    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('❌ [WS] Error en WebSocket server:', error);
    });

    // Procesar mensajes en cola
    if (this.messageQueue.length > 0) {
      console.log(`📨 [WS] Procesando ${this.messageQueue.length} mensajes en cola`);
      this.messageQueue.forEach(msg => this.broadcast(msg.type, msg.data));
      this.messageQueue = [];
    }
  }

  /**
   * Maneja nueva conexión WebSocket
   * @private
   */
  _handleConnection(ws, req) {
    const clientId = this._generateClientId();
    this.clients.add(ws);

    ws.clientId = clientId;
    ws.isAlive = true;

    console.log(`🔌 [WS] Cliente conectado: ${clientId} (total: ${this.clients.size})`);

    // Enviar mensaje de bienvenida
    this._sendToClient(ws, 'connected', {
      clientId,
      message: 'Conectado a E2E Advanced Testing WebSocket',
      timestamp: new Date().toISOString()
    });

    // Ping/Pong para keep-alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Mensaje del cliente
    ws.on('message', (message) => {
      this._handleMessage(ws, message);
    });

    // Desconexión
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`🔌 [WS] Cliente desconectado: ${clientId} (total: ${this.clients.size})`);
    });

    // Error
    ws.on('error', (error) => {
      console.error(`❌ [WS] Error en cliente ${clientId}:`, error.message);
      this.clients.delete(ws);
    });
  }

  /**
   * Maneja mensajes del cliente
   * @private
   */
  _handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      // Cliente puede subscribirse a ejecutiones específicas
      if (data.type === 'subscribe') {
        ws.subscribedTo = data.executionId;
        console.log(`📡 [WS] Cliente ${ws.clientId} subscrito a execution ${data.executionId}`);
      }

      if (data.type === 'unsubscribe') {
        ws.subscribedTo = null;
        console.log(`📡 [WS] Cliente ${ws.clientId} desubscrito`);
      }

      if (data.type === 'ping') {
        this._sendToClient(ws, 'pong', { timestamp: new Date().toISOString() });
      }

    } catch (error) {
      console.error(`❌ [WS] Error parseando mensaje:`, error.message);
    }
  }

  /**
   * Broadcast evento a TODOS los clientes conectados
   *
   * @param {string} type - Tipo de evento
   * @param {Object} data - Datos del evento
   */
  broadcast(type, data) {
    const message = {
      type,
      payload: data,
      timestamp: new Date().toISOString()
    };

    if (!this.wss) {
      // Si no hay servidor, agregar a cola
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message);
      }
      return;
    }

    const messageStr = JSON.stringify(message);
    let sent = 0;

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        // Si cliente está subscrito a una ejecución específica, solo enviar eventos de esa ejecución
        if (client.subscribedTo && data.executionId && client.subscribedTo !== data.executionId) {
          return;
        }

        try {
          client.send(messageStr);
          sent++;
        } catch (error) {
          console.error(`❌ [WS] Error enviando a cliente:`, error.message);
        }
      }
    });

    if (sent > 0) {
      console.log(`📡 [WS] Broadcast ${type} → ${sent} clientes`);
    }
  }

  /**
   * Envía mensaje a cliente específico
   * @private
   */
  _sendToClient(ws, type, data) {
    if (ws.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      type,
      payload: data,
      timestamp: new Date().toISOString()
    });

    try {
      ws.send(message);
    } catch (error) {
      console.error(`❌ [WS] Error enviando a cliente:`, error.message);
    }
  }

  /**
   * Genera ID único para cliente
   * @private
   */
  _generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Inicia keep-alive ping/pong
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      return;  // Ya está iniciado
    }

    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach(ws => {
        if (!ws.isAlive) {
          console.log(`💀 [WS] Cliente ${ws.clientId} no respondió al ping - cerrando conexión`);
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);  // Ping cada 30 segundos

    console.log('💓 [WS] Heartbeat iniciado (ping cada 30s)');
  }

  /**
   * Detiene keep-alive ping/pong
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💔 [WS] Heartbeat detenido');
    }
  }

  /**
   * Cierra todas las conexiones y detiene servidor
   */
  shutdown() {
    console.log('🔌 [WS] Cerrando WebSocket server...');

    this.stopHeartbeat();

    this.clients.forEach(client => {
      try {
        client.close(1000, 'Server shutting down');
      } catch (error) {
        console.error('❌ [WS] Error cerrando cliente:', error.message);
      }
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close(() => {
        console.log('✅ [WS] WebSocket server cerrado');
      });
      this.wss = null;
    }
  }

  /**
   * Obtiene estadísticas de conexiones
   *
   * @returns {Object} Stats
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      queuedMessages: this.messageQueue.length,
      serverActive: !!this.wss
    };
  }
}

module.exports = WebSocketManager;
