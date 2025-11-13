/**
 * ============================================================================
 * CLAUDE CODE AUTO-REPAIR SERVICE - Servicio Persistente de Auto-Reparación
 * ============================================================================
 *
 * Sistema híbrido de auto-reparación que soporta DOS modos de operación:
 *
 * MODO 1: MANUAL (File Watcher + Cola de Tickets)
 * - Monitorea .claude-repairs/ constantemente
 * - Detecta nuevos tickets .repair.md
 * - Los agrega a cola para revisión humana
 * - Permite procesamiento batch
 * - NO requiere API de Claude Code
 *
 * MODO 2: AUTO (Integración con Claude Code API)
 * - Detecta tickets automáticamente
 * - Invoca Claude Code API/CLI para aplicar fixes
 * - Re-ejecuta tests para validar
 * - Escribe .response.md con resultados
 * - Ciclo completo sin intervención humana
 *
 * @version 1.0.0
 * @date 2025-10-30
 * @author Sistema de Testing Phase 4
 * ============================================================================
 */

const EventEmitter = require('events');
const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ClaudeCodeAutoRepairService extends EventEmitter {
    constructor(config = {}) {
        super();

        // Configuración del servicio
        this.config = {
            mode: config.mode || 'manual', // 'manual' | 'auto'
            ticketsDir: config.ticketsDir || path.join(__dirname, '../../.claude-repairs'),
            claudeCodeApiPath: config.claudeCodeApiPath || null, // Ruta a CLI de Claude Code
            claudeCodeApiUrl: config.claudeCodeApiUrl || null,   // URL de API HTTP
            pollInterval: config.pollInterval || 5000,            // 5 segundos
            maxRetries: config.maxRetries || 3,
            enabled: config.enabled !== false
        };

        // Estado del servicio
        this.state = {
            running: false,
            mode: this.config.mode,
            startedAt: null,
            ticketsProcessed: 0,
            ticketsFailed: 0,
            lastError: null
        };

        // Cola de tickets pendientes (MODO MANUAL)
        this.ticketQueue = [];

        // Historial de procesamiento
        this.processHistory = [];

        // Watcher de archivos
        this.watcher = null;

        // Intervalo de polling (MODO AUTO)
        this.pollIntervalId = null;
    }

    /**
     * ========================================================================
     * CICLO DE VIDA DEL SERVICIO
     * ========================================================================
     */

    /**
     * Iniciar servicio
     */
    async start() {
        if (this.state.running) {
            throw new Error('El servicio ya está corriendo');
        }

        console.log('\n🚀 [AUTO-REPAIR] Iniciando servicio de auto-reparación...');
        console.log(`   Modo: ${this.config.mode.toUpperCase()}`);
        console.log(`   Directorio: ${this.config.ticketsDir}`);

        // Crear directorio si no existe
        await this.ensureTicketsDirectory();

        // Iniciar file watcher
        await this.startFileWatcher();

        // Si modo AUTO, iniciar polling
        if (this.config.mode === 'auto' && this.config.claudeCodeApiPath) {
            this.startAutoPolling();
        }

        this.state.running = true;
        this.state.startedAt = new Date();

        console.log('✅ [AUTO-REPAIR] Servicio iniciado correctamente\n');
        this.emit('service:started', this.getStatus());
    }

    /**
     * Detener servicio
     */
    async stop() {
        if (!this.state.running) {
            return;
        }

        console.log('\n🛑 [AUTO-REPAIR] Deteniendo servicio...');

        // Detener watcher
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }

        // Detener polling
        if (this.pollIntervalId) {
            clearInterval(this.pollIntervalId);
            this.pollIntervalId = null;
        }

        this.state.running = false;

        console.log('✅ [AUTO-REPAIR] Servicio detenido\n');
        this.emit('service:stopped', this.getStatus());
    }

    /**
     * Reiniciar servicio
     */
    async restart() {
        await this.stop();
        await this.start();
    }

    /**
     * ========================================================================
     * FILE WATCHER (Monitoreo de Tickets)
     * ========================================================================
     */

    /**
     * Iniciar file watcher para monitorear .repair.md
     */
    async startFileWatcher() {
        const pattern = path.join(this.config.ticketsDir, '*.repair.md');

        this.watcher = chokidar.watch(pattern, {
            persistent: true,
            ignoreInitial: false, // Procesar archivos existentes al iniciar
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        });

        this.watcher.on('add', async (filePath) => {
            console.log(`📥 [AUTO-REPAIR] Nuevo ticket detectado: ${path.basename(filePath)}`);
            await this.handleNewTicket(filePath);
        });

        this.watcher.on('error', (error) => {
            console.error('❌ [AUTO-REPAIR] Error en file watcher:', error.message);
            this.state.lastError = error.message;
            this.emit('watcher:error', error);
        });

        console.log(`👀 [AUTO-REPAIR] Monitoreando: ${pattern}`);
    }

    /**
     * Manejar nuevo ticket detectado
     */
    async handleNewTicket(ticketPath) {
        try {
            const ticketId = path.basename(ticketPath, '.repair.md');

            // Leer contenido del ticket
            const ticketContent = await fs.readFile(ticketPath, 'utf-8');

            // Parsear ticket
            const ticket = this.parseTicket(ticketId, ticketContent);

            // Agregar a historial
            this.processHistory.push({
                ticketId,
                ticketPath,
                detectedAt: new Date(),
                status: 'pending',
                mode: this.config.mode
            });

            // Emitir evento
            this.emit('ticket:detected', ticket);

            // Procesar según modo
            if (this.config.mode === 'manual') {
                await this.handleManualMode(ticket, ticketPath);
            } else if (this.config.mode === 'auto') {
                await this.handleAutoMode(ticket, ticketPath);
            }

        } catch (error) {
            console.error(`❌ [AUTO-REPAIR] Error procesando ticket: ${error.message}`);
            this.state.ticketsFailed++;
            this.emit('ticket:error', { ticketPath, error: error.message });
        }
    }

    /**
     * ========================================================================
     * MODO MANUAL (Cola de Tickets para Revisión Humana)
     * ========================================================================
     */

    /**
     * Manejar ticket en modo MANUAL
     */
    async handleManualMode(ticket, ticketPath) {
        console.log(`📋 [MANUAL] Agregando ticket a cola: ${ticket.id}`);

        // Agregar a cola
        this.ticketQueue.push({
            ...ticket,
            ticketPath,
            addedToQueueAt: new Date(),
            status: 'pending',
            priority: ticket.priority || 'medium'
        });

        // Ordenar por prioridad
        this.sortQueueByPriority();

        console.log(`✅ [MANUAL] Ticket en cola (${this.ticketQueue.length} pendientes)`);

        this.emit('ticket:queued', {
            ticketId: ticket.id,
            queueLength: this.ticketQueue.length
        });
    }

    /**
     * Ordenar cola por prioridad
     */
    sortQueueByPriority() {
        const priorityOrder = { high: 0, 'medium-high': 1, medium: 2, low: 3 };

        this.ticketQueue.sort((a, b) => {
            const priorityA = priorityOrder[a.priority] ?? 2;
            const priorityB = priorityOrder[b.priority] ?? 2;
            return priorityA - priorityB;
        });
    }

    /**
     * Obtener siguiente ticket de la cola
     */
    getNextTicket() {
        return this.ticketQueue.shift();
    }

    /**
     * Marcar ticket como procesado manualmente
     */
    async markTicketAsProcessed(ticketId, result) {
        const index = this.ticketQueue.findIndex(t => t.id === ticketId);

        if (index !== -1) {
            this.ticketQueue.splice(index, 1);
        }

        // Actualizar historial
        const historyEntry = this.processHistory.find(h => h.ticketId === ticketId);
        if (historyEntry) {
            historyEntry.status = result.success ? 'completed' : 'failed';
            historyEntry.completedAt = new Date();
            historyEntry.result = result;
        }

        this.state.ticketsProcessed++;
        this.emit('ticket:processed', { ticketId, result });

        // Escribir .response.md
        await this.writeResponse(ticketId, result);
    }

    /**
     * ========================================================================
     * MODO AUTO (Integración con Claude Code API)
     * ========================================================================
     */

    /**
     * Manejar ticket en modo AUTO
     */
    async handleAutoMode(ticket, ticketPath) {
        console.log(`🤖 [AUTO] Procesando ticket automáticamente: ${ticket.id}`);

        try {
            // Validar que API esté configurada
            if (!this.config.claudeCodeApiPath && !this.config.claudeCodeApiUrl) {
                throw new Error('API de Claude Code no configurada');
            }

            // Aplicar fix usando Claude Code API
            const fixResult = await this.applyFixWithClaudeCode(ticket, ticketPath);

            // Escribir respuesta
            await this.writeResponse(ticket.id, fixResult);

            // Actualizar estado
            this.state.ticketsProcessed++;

            console.log(`✅ [AUTO] Ticket procesado: ${ticket.id}`);
            this.emit('ticket:auto-processed', { ticketId: ticket.id, result: fixResult });

        } catch (error) {
            console.error(`❌ [AUTO] Error procesando ticket: ${error.message}`);
            this.state.ticketsFailed++;

            await this.writeResponse(ticket.id, {
                success: false,
                error: error.message,
                mode: 'auto',
                processedAt: new Date().toISOString()
            });

            this.emit('ticket:auto-failed', { ticketId: ticket.id, error: error.message });
        }
    }

    /**
     * Aplicar fix usando Claude Code API/CLI
     */
    async applyFixWithClaudeCode(ticket, ticketPath) {
        const startTime = Date.now();

        try {
            // OPCIÓN 1: CLI de Claude Code
            if (this.config.claudeCodeApiPath) {
                return await this.applyFixViaCLI(ticket, ticketPath);
            }

            // OPCIÓN 2: HTTP API de Claude Code
            if (this.config.claudeCodeApiUrl) {
                return await this.applyFixViaHTTP(ticket, ticketPath);
            }

            throw new Error('Ninguna API configurada');

        } catch (error) {
            const duration = Date.now() - startTime;

            return {
                success: false,
                error: error.message,
                duration,
                mode: 'auto',
                processedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Aplicar fix mediante CLI de Claude Code
     */
    async applyFixViaCLI(ticket, ticketPath) {
        const startTime = Date.now();

        console.log(`🔧 [CLI] Ejecutando: ${this.config.claudeCodeApiPath} apply-fix ${ticketPath}`);

        try {
            const { stdout, stderr } = await execAsync(
                `"${this.config.claudeCodeApiPath}" apply-fix "${ticketPath}"`,
                { timeout: 60000 } // 1 minuto timeout
            );

            const duration = Date.now() - startTime;

            // Parsear resultado
            const success = !stderr && stdout.includes('success');

            return {
                success,
                output: stdout,
                error: stderr || null,
                duration,
                mode: 'cli',
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            return {
                success: false,
                error: error.message,
                output: error.stdout || '',
                duration,
                mode: 'cli',
                processedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Aplicar fix mediante HTTP API de Claude Code
     */
    async applyFixViaHTTP(ticket, ticketPath) {
        const startTime = Date.now();

        console.log(`🌐 [HTTP] POST ${this.config.claudeCodeApiUrl}/apply-fix`);

        try {
            const response = await fetch(`${this.config.claudeCodeApiUrl}/apply-fix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketPath,
                    ticket: ticket
                })
            });

            const result = await response.json();
            const duration = Date.now() - startTime;

            return {
                success: response.ok && result.success,
                output: result.output || result.message,
                error: result.error || null,
                duration,
                mode: 'http',
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            return {
                success: false,
                error: error.message,
                duration,
                mode: 'http',
                processedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Polling automático (modo AUTO)
     */
    startAutoPolling() {
        console.log(`🔄 [AUTO] Iniciando polling cada ${this.config.pollInterval}ms`);

        this.pollIntervalId = setInterval(async () => {
            // Verificar si hay tickets sin procesar
            const pending = this.processHistory.filter(h => h.status === 'pending');

            if (pending.length > 0) {
                console.log(`🔍 [AUTO] ${pending.length} tickets pendientes en cola`);
            }

        }, this.config.pollInterval);
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */

    /**
     * Parsear contenido de ticket .repair.md
     */
    parseTicket(ticketId, content) {
        // Extraer información básica del ticket
        const lines = content.split('\n');

        const ticket = {
            id: ticketId,
            content,
            priority: 'medium',
            module: null,
            test: null,
            error: null
        };

        // Buscar prioridad
        const priorityMatch = content.match(/\*\*Prioridad\*\*:\s*(\w+)/i);
        if (priorityMatch) {
            ticket.priority = priorityMatch[1].toLowerCase();
        }

        // Buscar módulo
        const moduleMatch = content.match(/módulo\s+\*\*(\w+)\*\*/i);
        if (moduleMatch) {
            ticket.module = moduleMatch[1];
        }

        // Buscar test
        const testMatch = content.match(/Test\s+\*\*([^*]+)\*\*/i);
        if (testMatch) {
            ticket.test = testMatch[1];
        }

        // Buscar error
        const errorMatch = content.match(/\*\*Error\*\*:\s*([^\n]+)/i);
        if (errorMatch) {
            ticket.error = errorMatch[1];
        }

        return ticket;
    }

    /**
     * Escribir archivo .response.md
     */
    async writeResponse(ticketId, result) {
        const responsePath = path.join(this.config.ticketsDir, `${ticketId}.response.md`);

        const responseContent = `# 🔧 RESPUESTA DE AUTO-REPARACIÓN

**Ticket ID**: ${ticketId}
**Procesado**: ${result.processedAt || new Date().toISOString()}
**Modo**: ${result.mode || this.config.mode}
**Estado**: ${result.success ? '✅ ÉXITO' : '❌ FALLÓ'}

## Resultado

${result.success ?
    `El fix fue aplicado exitosamente.` :
    `Error al aplicar fix: ${result.error}`
}

${result.output ? `\n## Output\n\n\`\`\`\n${result.output}\n\`\`\`\n` : ''}

${result.duration ? `\n**Duración**: ${result.duration}ms\n` : ''}

---
*Generado por ClaudeCodeAutoRepairService v1.0.0*
`;

        await fs.writeFile(responsePath, responseContent, 'utf-8');
        console.log(`📝 [AUTO-REPAIR] Respuesta escrita: ${path.basename(responsePath)}`);
    }

    /**
     * Asegurar que directorio de tickets existe
     */
    async ensureTicketsDirectory() {
        try {
            await fs.mkdir(this.config.ticketsDir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Obtener estado del servicio
     */
    getStatus() {
        return {
            running: this.state.running,
            mode: this.state.mode,
            startedAt: this.state.startedAt,
            uptime: this.state.startedAt ? Date.now() - this.state.startedAt.getTime() : 0,
            ticketsProcessed: this.state.ticketsProcessed,
            ticketsFailed: this.state.ticketsFailed,
            queueLength: this.ticketQueue.length,
            lastError: this.state.lastError,
            apiConfigured: !!(this.config.claudeCodeApiPath || this.config.claudeCodeApiUrl)
        };
    }

    /**
     * Obtener cola de tickets (MODO MANUAL)
     */
    getQueue() {
        return this.ticketQueue.map(ticket => ({
            id: ticket.id,
            module: ticket.module,
            test: ticket.test,
            priority: ticket.priority,
            addedToQueueAt: ticket.addedToQueueAt,
            status: ticket.status
        }));
    }

    /**
     * Obtener historial de procesamiento
     */
    getHistory(limit = 50) {
        return this.processHistory
            .slice(-limit)
            .reverse();
    }

    /**
     * Cambiar modo de operación
     */
    async setMode(newMode) {
        if (!['manual', 'auto'].includes(newMode)) {
            throw new Error('Modo inválido. Usar: manual | auto');
        }

        const wasRunning = this.state.running;

        if (wasRunning) {
            await this.stop();
        }

        this.config.mode = newMode;
        this.state.mode = newMode;

        console.log(`🔄 [AUTO-REPAIR] Modo cambiado a: ${newMode.toUpperCase()}`);

        if (wasRunning) {
            await this.start();
        }

        this.emit('mode:changed', { mode: newMode });
    }

    /**
     * Configurar API de Claude Code
     */
    setClaudeCodeApi(config) {
        if (config.cliPath) {
            this.config.claudeCodeApiPath = config.cliPath;
            console.log(`🔧 [CONFIG] CLI configurado: ${config.cliPath}`);
        }

        if (config.apiUrl) {
            this.config.claudeCodeApiUrl = config.apiUrl;
            console.log(`🌐 [CONFIG] HTTP API configurado: ${config.apiUrl}`);
        }

        this.emit('api:configured', {
            hasCliPath: !!this.config.claudeCodeApiPath,
            hasApiUrl: !!this.config.claudeCodeApiUrl
        });
    }
}

module.exports = ClaudeCodeAutoRepairService;
