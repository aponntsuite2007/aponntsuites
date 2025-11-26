/**
 * ============================================================================
 * CLAUDE CODE WEBSOCKET BRIDGE - Comunicación con Claude Code
 * ============================================================================
 *
 * VERSIÓN SIMPLIFICADA para testing sin servidor WebSocket externo.
 * Simula el comportamiento de envío/recepción de tickets.
 *
 * NOTA: Para producción real, reemplazar con implementación WebSocket completa
 * conectando a un servidor que Claude Code pueda leer.
 *
 * @version 1.0.0 (Simplified)
 * @date 2025-10-29
 * ============================================================================
 */

const EventEmitter = require('events');

class ClaudeCodeWebSocketBridge extends EventEmitter {
    constructor() {
        super();
        this.connected = false;
        this.simulateMode = process.env.SIMULATE_CLAUDE_CODE !== 'false'; // Default: true
        this.pendingTickets = new Map();
    }

    /**
     * Conectar al servidor WebSocket (simulado)
     */
    async connect(url = 'ws://localhost:8765') {
        console.log(`\n🔌 [WEBSOCKET] Conectando a ${url}...`);

        if (this.simulateMode) {
            console.log('⚠️  [WEBSOCKET] MODO SIMULADO activado (no hay servidor real)');
            console.log('   Para usar WebSocket real, set SIMULATE_CLAUDE_CODE=false en .env');

            // Simular conexión exitosa
            await new Promise(resolve => setTimeout(resolve, 500));
            this.connected = true;
            console.log('✅ [WEBSOCKET] Conectado (simulado)\n');
            return;
        }

        // Código real de WebSocket (pendiente implementación)
        try {
            const WebSocket = require('ws');
            this.ws = new WebSocket(url);

            return new Promise((resolve, reject) => {
                this.ws.on('open', () => {
                    console.log('✅ [WEBSOCKET] Conectado a Claude Code (real)');
                    this.connected = true;
                    this.setupMessageHandler();
                    resolve();
                });

                this.ws.on('error', (error) => {
                    console.error('❌ [WEBSOCKET] Error de conexión:', error.message);
                    this.connected = false;
                    reject(error);
                });

                setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('Timeout conectando a WebSocket'));
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('❌ [WEBSOCKET] Error requiriendo ws:', error.message);
            console.log('   Fallback a modo simulado');
            this.simulateMode = true;
            this.connected = true;
        }
    }

    /**
     * Configurar handler de mensajes entrantes (solo modo real)
     */
    setupMessageHandler() {
        if (!this.ws) return;

        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                console.log('📨 [WEBSOCKET] Mensaje recibido:', message.type);

                if (message.type === 'ticket_response') {
                    const pendingPromise = this.pendingTickets.get(message.ticket_id);
                    if (pendingPromise) {
                        pendingPromise.resolve(message.payload);
                        this.pendingTickets.delete(message.ticket_id);
                    }
                }

                this.emit('message', message);
            } catch (error) {
                console.error('❌ [WEBSOCKET] Error parseando mensaje:', error.message);
            }
        });
    }

    /**
     * Enviar ticket a Claude Code y esperar respuesta
     */
    async sendTicket(ticket, timeout = 120000) {
        if (!this.connected) {
            await this.connect();
        }

        console.log(`\n📤 [WEBSOCKET] Enviando ticket ${ticket?.id || 'undefined'} a Claude Code...`);

        // ✅ FIX: Verificar que ticket y ticket.test existan antes de acceder a propiedades
        if (ticket && ticket.test) {
            console.log(`   Módulo: ${ticket.test.module || 'unknown'}`);
            console.log(`   Test: ${ticket.test.test_name || 'unknown'}`);
            console.log(`   Error: ${ticket.test.error_message?.substring(0, 100) || 'No error message'}...\n`);
        } else {
            console.warn(`⚠️  [WEBSOCKET] Ticket incompleto o malformado`);
            console.warn(`   ticket exists: ${!!ticket}`);
            console.warn(`   ticket.test exists: ${!!(ticket && ticket.test)}\n`);
        }

        if (this.simulateMode) {
            // MODO SIMULADO: Simular respuesta de Claude Code
            return await this.simulateClaudeCodeResponse(ticket);
        }

        // MODO REAL: Enviar por WebSocket
        return new Promise((resolve, reject) => {
            this.pendingTickets.set(ticket.id, { resolve, reject });

            const message = {
                type: 'repair_ticket',
                ticket_id: ticket.id,
                payload: ticket
            };

            this.ws.send(JSON.stringify(message));

            setTimeout(() => {
                if (this.pendingTickets.has(ticket.id)) {
                    this.pendingTickets.delete(ticket.id);
                    reject(new Error(`Timeout esperando respuesta para ticket ${ticket.id}`));
                }
            }, timeout);
        });
    }

    /**
     * Simular respuesta de Claude Code (para testing sin servidor real)
     */
    async simulateClaudeCodeResponse(ticket) {
        console.log('🤖 [CLAUDE SIMULADO] Procesando ticket...');

        // Simular tiempo de procesamiento (2-5 segundos)
        const processingTime = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Decisión aleatoria sobre el éxito del fix (80% éxito, 20% fallo)
        const success = Math.random() > 0.2;

        if (success) {
            console.log('✅ [CLAUDE SIMULADO] Fix aplicado exitosamente');
            console.log(`   Archivos modificados: ${ticket.diagnosis.files_to_modify.join(', ')}`);
            console.log(`   Solución aplicada: ${ticket.diagnosis.suggested_fix.substring(0, 100)}...\n`);

            return {
                status: 'fixed',
                ticket_id: ticket.id,
                files_modified: ticket.diagnosis.files_to_modify,
                changes_applied: ticket.diagnosis.suggested_fix,
                timestamp: new Date().toISOString(),
                message: 'Fix aplicado. Test debe pasar ahora.'
            };
        } else {
            console.log('❌ [CLAUDE SIMULADO] No se pudo aplicar fix automáticamente');
            console.log(`   Razón: Requiere intervención manual\n`);

            return {
                status: 'failed',
                ticket_id: ticket.id,
                error: 'Fix requiere intervención manual',
                timestamp: new Date().toISOString(),
                message: 'No se pudo reparar automáticamente. Revisar manualmente.'
            };
        }
    }

    /**
     * Desconectar
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
            console.log('🔌 [WEBSOCKET] Desconectado');
        }
    }

    /**
     * Verificar si está conectado
     */
    isConnected() {
        return this.connected;
    }
}

module.exports = ClaudeCodeWebSocketBridge;
