/**
 * CLAUDE CODE BRIDGE - WebSocket bidireccional Ollama ↔ Claude Code
 *
 * Este servicio permite comunicación en tiempo real entre:
 * - Ollama (testing daemon)
 * - Claude Code (repair agent)
 *
 * FLUJO:
 * 1. Ollama detecta error → Publica ticket vía WebSocket
 * 2. Claude Code escucha WebSocket → Recibe notificación
 * 3. Claude Code repara → Publica fix completado
 * 4. Ollama escucha → Re-testea automáticamente
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

const EventEmitter = require('events');

class ClaudeCodeBridge extends EventEmitter {
  constructor(websocketServer) {
    super();

    this.wss = websocketServer;
    this.clients = new Map(); // clientId → WebSocket
    this.subscriptions = new Map(); // topic → Set<clientId>

    console.log('🌉 [BRIDGE] Claude Code Bridge inicializado');

    this.setupWebSocketServer();
  }

  /**
   * Configurar servidor WebSocket
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`🔗 [BRIDGE] Cliente conectado: ${clientId}`);

      // Enviar mensaje de bienvenida
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        message: 'Conectado al Claude Code Bridge',
        timestamp: new Date().toISOString()
      });

      // Manejar mensajes del cliente
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`❌ [BRIDGE] Error parseando mensaje de ${clientId}:`, error.message);
        }
      });

      // Manejar desconexión
      ws.on('close', () => {
        console.log(`🔌 [BRIDGE] Cliente desconectado: ${clientId}`);
        this.clients.delete(clientId);

        // Remover suscripciones
        this.subscriptions.forEach((subscribers, topic) => {
          subscribers.delete(clientId);
        });
      });

      // Manejar errores
      ws.on('error', (error) => {
        console.error(`❌ [BRIDGE] Error en conexión ${clientId}:`, error.message);
      });
    });
  }

  /**
   * Manejar mensaje de cliente
   */
  handleClientMessage(clientId, message) {
    const { type, topic, data } = message;

    console.log(`📨 [BRIDGE] Mensaje de ${clientId}: ${type}`);

    switch (type) {
      case 'subscribe':
        this.subscribe(clientId, topic);
        break;

      case 'unsubscribe':
        this.unsubscribe(clientId, topic);
        break;

      case 'publish':
        this.publish(topic, data, clientId);
        break;

      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;

      default:
        console.warn(`⚠️ [BRIDGE] Tipo de mensaje desconocido: ${type}`);
    }
  }

  /**
   * Suscribir cliente a un topic
   */
  subscribe(clientId, topic) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }

    this.subscriptions.get(topic).add(clientId);

    console.log(`✅ [BRIDGE] ${clientId} suscrito a topic: ${topic}`);

    this.sendToClient(clientId, {
      type: 'subscribed',
      topic,
      message: `Suscrito a topic: ${topic}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Desuscribir cliente de un topic
   */
  unsubscribe(clientId, topic) {
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic).delete(clientId);

      console.log(`❌ [BRIDGE] ${clientId} desuscrito de topic: ${topic}`);
    }
  }

  /**
   * Publicar mensaje a todos los suscriptores de un topic
   */
  publish(topic, data, senderClientId = null) {
    if (!this.subscriptions.has(topic)) {
      console.warn(`⚠️ [BRIDGE] No hay suscriptores para topic: ${topic}`);
      return;
    }

    const subscribers = this.subscriptions.get(topic);

    console.log(`📢 [BRIDGE] Publicando a topic "${topic}" (${subscribers.size} suscriptores)`);

    const message = {
      type: 'message',
      topic,
      data,
      sender: senderClientId,
      timestamp: new Date().toISOString()
    };

    subscribers.forEach(clientId => {
      // No enviar mensaje al mismo cliente que lo publicó (opcional)
      // if (clientId !== senderClientId) {
      this.sendToClient(clientId, message);
      // }
    });

    // Emitir evento para uso interno
    this.emit(topic, data);
  }

  /**
   * Enviar mensaje a cliente específico
   */
  sendToClient(clientId, message) {
    const ws = this.clients.get(clientId);

    if (!ws || ws.readyState !== ws.OPEN) {
      console.warn(`⚠️ [BRIDGE] Cliente ${clientId} no disponible`);
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ [BRIDGE] Error enviando mensaje a ${clientId}:`, error.message);
      return false;
    }
  }

  /**
   * Broadcast a todos los clientes conectados
   */
  broadcast(message) {
    console.log(`📢 [BRIDGE] Broadcasting a ${this.clients.size} clientes`);

    this.clients.forEach((ws, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  /**
   * Generar ID único para cliente
   */
  generateClientId() {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtener estadísticas del bridge
   */
  getStats() {
    return {
      clients_connected: this.clients.size,
      topics: Array.from(this.subscriptions.keys()),
      subscriptions: Array.from(this.subscriptions.entries()).map(([topic, subs]) => ({
        topic,
        subscribers: subs.size
      }))
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTODOS ESPECÍFICOS PARA OLLAMA ↔ CLAUDE CODE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Ollama notifica que encontró errores (crea tickets)
   */
  notifyTicketsCreated(tickets) {
    console.log(`🎫 [BRIDGE] Ollama notifica ${tickets.length} tickets creados`);

    this.publish('tickets:created', {
      count: tickets.length,
      tickets,
      action: 'repair_requested',
      message: `Se crearon ${tickets.length} tickets pendientes de reparación`
    });
  }

  /**
   * Claude Code notifica que reparó tickets
   */
  notifyTicketsFixed(tickets) {
    console.log(`✅ [BRIDGE] Claude Code notifica ${tickets.length} tickets reparados`);

    this.publish('tickets:fixed', {
      count: tickets.length,
      tickets,
      action: 'retest_requested',
      message: `Se repararon ${tickets.length} tickets, listos para re-test`
    });
  }

  /**
   * Ollama notifica que re-testeó tickets
   */
  notifyRetestCompleted(results) {
    console.log(`🔄 [BRIDGE] Ollama notifica re-test completado`);

    this.publish('tickets:retested', {
      passed: results.passed,
      failed: results.failed,
      results,
      message: `Re-test completado: ${results.passed} pasaron, ${results.failed} fallaron`
    });
  }

  /**
   * Cualquier agente solicita diagnóstico de un módulo
   */
  requestDiagnostic(moduleName, requestedBy) {
    console.log(`🔍 [BRIDGE] ${requestedBy} solicita diagnóstico de: ${moduleName}`);

    this.publish('diagnostic:requested', {
      module: moduleName,
      requested_by: requestedBy,
      action: 'run_diagnostic',
      message: `Diagnóstico solicitado para módulo: ${moduleName}`
    });
  }
}

module.exports = ClaudeCodeBridge;
