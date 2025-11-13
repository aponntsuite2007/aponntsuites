/**
 * ============================================================================
 * CLAUDE CODE WEBSOCKET SERVER
 * ============================================================================
 *
 * Servidor WebSocket para comunicación bidireccional con Claude Code.
 * Permite enviar tickets de reparación y recibir confirmaciones de fixes aplicados.
 *
 * PROTOCOLO:
 *
 * Cliente → Servidor:
 * {
 *   type: 'repair_ticket',
 *   ticket_id: 'ticket-123',
 *   payload: { ...ticketData }
 * }
 *
 * Servidor → Claude Code (escribir en archivo):
 * .claude-repairs/ticket-123.repair.md
 *
 * Claude Code → Servidor (leer cambios en archivos):
 * Monitorear directorio .claude-repairs para respuestas
 *
 * @version 2.0.0 (Real WebSocket)
 * @date 2025-10-30
 * ============================================================================
 */

const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const EventEmitter = require('events');

class ClaudeCodeWebSocketServer extends EventEmitter {
    constructor(port = 8765) {
        super();
        this.port = port;
        this.wss = null;
        this.clients = new Set();
        this.ticketsDir = path.join(__dirname, '../../.claude-repairs');
        this.watcher = null;
        this.pendingTickets = new Map(); // ticket_id → { resolve, reject, timestamp }
    }

    /**
     * Iniciar servidor WebSocket
     */
    async start() {
        console.log('\n🚀 [WEBSOCKET SERVER] Iniciando servidor...');

        // Crear directorio de tickets si no existe
        await this.ensureTicketsDirectory();

        // Iniciar servidor WebSocket
        this.wss = new WebSocket.Server({ port: this.port });

        this.wss.on('connection', (ws, req) => {
            const clientIp = req.socket.remoteAddress;
            console.log(`✅ [WEBSOCKET] Cliente conectado desde ${clientIp}`);
            this.clients.add(ws);

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    await this.handleMessage(ws, data);
                } catch (error) {
                    console.error('❌ [WEBSOCKET] Error parseando mensaje:', error.message);
                    this.sendError(ws, 'Invalid JSON format');
                }
            });

            ws.on('close', () => {
                console.log(`🔌 [WEBSOCKET] Cliente desconectado (${clientIp})`);
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('❌ [WEBSOCKET] Error:', error.message);
                this.clients.delete(ws);
            });

            // Enviar confirmación de conexión
            this.send(ws, {
                type: 'connection_success',
                message: 'Connected to Claude Code WebSocket Server',
                server_version: '2.0.0'
            });
        });

        // Iniciar watcher de archivos para respuestas de Claude Code
        await this.startFileWatcher();

        console.log(`✅ [WEBSOCKET SERVER] Escuchando en ws://localhost:${this.port}`);
        console.log(`📁 [WEBSOCKET SERVER] Monitoreando tickets en: ${this.ticketsDir}\n`);
    }

    /**
     * Crear directorio de tickets si no existe
     */
    async ensureTicketsDirectory() {
        try {
            await fs.mkdir(this.ticketsDir, { recursive: true });
            console.log(`📁 [WEBSOCKET] Directorio de tickets: ${this.ticketsDir}`);
        } catch (error) {
            console.error('❌ [WEBSOCKET] Error creando directorio:', error.message);
            throw error;
        }
    }

    /**
     * Iniciar watcher de archivos para detectar respuestas de Claude Code
     */
    async startFileWatcher() {
        this.watcher = chokidar.watch(`${this.ticketsDir}/*.response.md`, {
            persistent: true,
            ignoreInitial: true
        });

        this.watcher.on('add', async (filePath) => {
            console.log(`📨 [WEBSOCKET] Nueva respuesta detectada: ${path.basename(filePath)}`);
            await this.handleClaudeCodeResponse(filePath);
        });

        this.watcher.on('change', async (filePath) => {
            console.log(`📝 [WEBSOCKET] Respuesta actualizada: ${path.basename(filePath)}`);
            await this.handleClaudeCodeResponse(filePath);
        });

        console.log(`👀 [WEBSOCKET] Watcher activo para: ${this.ticketsDir}/*.response.md`);
    }

    /**
     * Manejar respuesta de Claude Code (archivo .response.md)
     */
    async handleClaudeCodeResponse(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const ticketId = path.basename(filePath, '.response.md');

            console.log(`📋 [WEBSOCKET] Procesando respuesta para ticket: ${ticketId}`);

            // Parsear respuesta (Markdown con metadata)
            const response = this.parseClaudeCodeResponse(content);
            response.ticket_id = ticketId;

            // Resolver promise pendiente
            const pending = this.pendingTickets.get(ticketId);
            if (pending) {
                pending.resolve(response);
                this.pendingTickets.delete(ticketId);
            }

            // Broadcast a todos los clientes conectados
            this.broadcast({
                type: 'ticket_response',
                ticket_id: ticketId,
                payload: response
            });

            // Emitir evento local
            this.emit('repair_completed', { ticket_id: ticketId, response });

            console.log(`✅ [WEBSOCKET] Respuesta procesada: ${response.status} - ${response.message}`);
        } catch (error) {
            console.error('❌ [WEBSOCKET] Error procesando respuesta:', error.message);
        }
    }

    /**
     * Parsear respuesta de Claude Code desde Markdown
     */
    parseClaudeCodeResponse(content) {
        const lines = content.split('\n');
        const response = {
            status: 'unknown',
            message: '',
            files_modified: [],
            changes_summary: '',
            timestamp: new Date().toISOString()
        };

        // Buscar metadata en el contenido
        const statusMatch = content.match(/## Status:\s*(.+)/i);
        if (statusMatch) {
            response.status = statusMatch[1].trim().toLowerCase();
        }

        const messageMatch = content.match(/## Message:\s*(.+)/i);
        if (messageMatch) {
            response.message = messageMatch[1].trim();
        }

        const filesMatch = content.match(/## Files Modified:\s*\n([\s\S]+?)(?=\n##|$)/i);
        if (filesMatch) {
            response.files_modified = filesMatch[1]
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.replace(/^-\s*/, '').trim());
        }

        const summaryMatch = content.match(/## Changes Summary:\s*\n([\s\S]+?)(?=\n##|$)/i);
        if (summaryMatch) {
            response.changes_summary = summaryMatch[1].trim();
        }

        return response;
    }

    /**
     * Manejar mensaje entrante de un cliente
     */
    async handleMessage(ws, data) {
        console.log(`📨 [WEBSOCKET] Mensaje recibido: ${data.type}`);

        switch (data.type) {
            case 'repair_ticket':
                await this.handleRepairTicket(ws, data);
                break;

            case 'ping':
                this.send(ws, { type: 'pong', timestamp: Date.now() });
                break;

            case 'get_status':
                this.send(ws, {
                    type: 'status',
                    connected_clients: this.clients.size,
                    pending_tickets: this.pendingTickets.size,
                    tickets_dir: this.ticketsDir
                });
                break;

            default:
                console.log(`⚠️ [WEBSOCKET] Tipo de mensaje desconocido: ${data.type}`);
                this.sendError(ws, `Unknown message type: ${data.type}`);
        }
    }

    /**
     * Manejar ticket de reparación
     */
    async handleRepairTicket(ws, data) {
        try {
            const { ticket_id, payload } = data;

            if (!ticket_id || !payload) {
                throw new Error('Missing ticket_id or payload');
            }

            console.log(`🎫 [WEBSOCKET] Procesando ticket: ${ticket_id}`);

            // Escribir archivo .repair.md para que Claude Code lo lea
            const ticketFilePath = path.join(this.ticketsDir, `${ticket_id}.repair.md`);
            const ticketContent = this.generateRepairTicketMarkdown(payload);

            await fs.writeFile(ticketFilePath, ticketContent, 'utf-8');
            console.log(`✅ [WEBSOCKET] Ticket escrito: ${path.basename(ticketFilePath)}`);

            // Registrar ticket pendiente con timeout
            const timeoutMs = parseInt(process.env.REPAIR_TIMEOUT) || 120000;
            const ticketPromise = new Promise((resolve, reject) => {
                this.pendingTickets.set(ticket_id, {
                    resolve,
                    reject,
                    timestamp: Date.now()
                });

                // Timeout
                setTimeout(() => {
                    if (this.pendingTickets.has(ticket_id)) {
                        this.pendingTickets.delete(ticket_id);
                        reject(new Error(`Timeout waiting for Claude Code response (${timeoutMs}ms)`));
                    }
                }, timeoutMs);
            });

            // Enviar confirmación al cliente
            this.send(ws, {
                type: 'ticket_received',
                ticket_id,
                message: 'Ticket created. Waiting for Claude Code response...',
                file_path: ticketFilePath
            });

            // Broadcast a otros clientes
            this.broadcast({
                type: 'new_ticket',
                ticket_id,
                module: payload.test?.module || 'unknown'
            }, ws);

        } catch (error) {
            console.error('❌ [WEBSOCKET] Error manejando ticket:', error.message);
            this.sendError(ws, error.message);
        }
    }

    /**
     * Generar contenido Markdown del ticket de reparación
     */
    generateRepairTicketMarkdown(payload) {
        const { test, diagnosis } = payload;

        return `# 🔧 TICKET DE REPARACIÓN AUTOMÁTICA

## Información del Ticket
- **ID**: ${payload.id}
- **Fecha**: ${new Date().toISOString()}
- **Severidad**: ${diagnosis.severity}
- **Módulo**: ${test.module}
- **Test**: ${test.test_name}

---

## 🐛 Error Detectado

### Tipo de Error
\`${test.error_type}\`

### Mensaje de Error
\`\`\`
${test.error_message}
\`\`\`

### Stack Trace
\`\`\`
${test.error_stack}
\`\`\`

---

## 🔍 Diagnóstico (Ollama AI)

### Categoría del Problema
**${diagnosis.issue_category}**

### Análisis Completo
${diagnosis.analysis}

### Archivos Afectados
${diagnosis.files_to_modify.map(file => `- \`${file}\``).join('\n')}

---

## 💡 Solución Sugerida

${diagnosis.suggested_fix}

---

## 📋 Instrucciones para Claude Code

Por favor, aplica los siguientes cambios para resolver el error:

1. Revisa los archivos listados en "Archivos Afectados"
2. Aplica la solución sugerida
3. Verifica que el código compile/ejecute sin errores
4. Crea un archivo \`.response.md\` con el resultado:

\`\`\`markdown
## Status: fixed | failed | partial
## Message: Descripción breve del resultado
## Files Modified:
- archivo1.js
- archivo2.js
## Changes Summary:
Resumen de los cambios aplicados
\`\`\`

---

**⚠️ IMPORTANTE**: Este ticket fue generado automáticamente. Revisa cuidadosamente antes de aplicar cambios.
`;
    }

    /**
     * Enviar mensaje a un cliente específico
     */
    send(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    /**
     * Enviar mensaje a todos los clientes conectados
     */
    broadcast(data, excludeWs = null) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    /**
     * Enviar error a un cliente
     */
    sendError(ws, errorMessage) {
        this.send(ws, {
            type: 'error',
            message: errorMessage,
            timestamp: Date.now()
        });
    }

    /**
     * Detener servidor
     */
    async stop() {
        console.log('\n🛑 [WEBSOCKET SERVER] Deteniendo servidor...');

        // Cerrar watcher
        if (this.watcher) {
            await this.watcher.close();
            console.log('👀 [WEBSOCKET] File watcher cerrado');
        }

        // Cerrar todas las conexiones
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close(1000, 'Server shutting down');
            }
        });
        this.clients.clear();

        // Cerrar servidor
        if (this.wss) {
            this.wss.close(() => {
                console.log('✅ [WEBSOCKET SERVER] Servidor cerrado correctamente\n');
            });
        }
    }

    /**
     * Obtener estadísticas del servidor
     */
    getStats() {
        return {
            connected_clients: this.clients.size,
            pending_tickets: this.pendingTickets.size,
            tickets_dir: this.ticketsDir,
            uptime: process.uptime()
        };
    }
}

module.exports = ClaudeCodeWebSocketServer;
