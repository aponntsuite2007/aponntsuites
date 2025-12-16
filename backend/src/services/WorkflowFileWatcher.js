/**
 * ============================================================================
 * WORKFLOW FILE WATCHER
 * ============================================================================
 *
 * Monitorea cambios en archivos de servicios y regenera workflows automáticamente.
 * Se integra con Brain para notificar cambios y actualizar tutoriales.
 *
 * FLUJO:
 * 1. Watcher detecta cambio en *Service.js
 * 2. Llama a UniversalWorkflowGenerator.regenerateModuleWorkflow()
 * 3. Emite evento 'workflow-updated'
 * 4. Brain recibe evento y actualiza cache/tutoriales
 * 5. Phase4 puede re-testear el módulo afectado
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class WorkflowFileWatcher extends EventEmitter {
    constructor(options = {}) {
        super();

        this.servicesDir = options.servicesDir || path.join(__dirname);
        this.watchInterval = options.watchInterval || 5000; // 5 segundos
        this.debounceTime = options.debounceTime || 1000; // 1 segundo debounce

        // Referencias a otros servicios
        this.workflowGenerator = null;
        this.brainService = null;

        // Estado interno
        this.isWatching = false;
        this.fileHashes = new Map();
        this.pendingChanges = new Map();
        this.debounceTimers = new Map();
        this.watcherInterval = null;

        // Patrones de archivos a monitorear
        this.watchPatterns = [
            /Service\.js$/,
            /Workflow.*\.js$/
        ];

        // Archivos a ignorar
        this.ignorePatterns = [
            /WorkflowFileWatcher\.js$/,
            /UniversalWorkflowGenerator\.js$/,
            /\.test\.js$/,
            /\.spec\.js$/,
            /node_modules/
        ];

        console.log('👁️ [FILE-WATCHER] Inicializado');
    }

    /**
     * Configurar referencias a otros servicios
     */
    setServices({ workflowGenerator, brainService }) {
        this.workflowGenerator = workflowGenerator;
        this.brainService = brainService;
        console.log('👁️ [FILE-WATCHER] Servicios configurados');
    }

    /**
     * Iniciar monitoreo
     */
    start() {
        if (this.isWatching) {
            console.log('👁️ [FILE-WATCHER] Ya está corriendo');
            return;
        }

        console.log('👁️ [FILE-WATCHER] Iniciando monitoreo...');
        console.log(`   Directorio: ${this.servicesDir}`);
        console.log(`   Intervalo: ${this.watchInterval}ms`);

        // Calcular hashes iniciales
        this.calculateInitialHashes();

        // Iniciar intervalo de verificación
        this.watcherInterval = setInterval(() => {
            this.checkForChanges();
        }, this.watchInterval);

        this.isWatching = true;
        this.emit('started');

        console.log('👁️ [FILE-WATCHER] Monitoreo activo');
    }

    /**
     * Detener monitoreo
     */
    stop() {
        if (!this.isWatching) {
            return;
        }

        console.log('👁️ [FILE-WATCHER] Deteniendo monitoreo...');

        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }

        // Limpiar timers de debounce
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        this.isWatching = false;
        this.emit('stopped');

        console.log('👁️ [FILE-WATCHER] Monitoreo detenido');
    }

    /**
     * Calcular hashes iniciales de todos los archivos
     */
    calculateInitialHashes() {
        const files = this.getWatchedFiles();

        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const hash = this.hashContent(content);
                this.fileHashes.set(file, hash);
            } catch (e) {
                console.error(`   Error leyendo ${file}:`, e.message);
            }
        }

        console.log(`   Archivos monitoreados: ${this.fileHashes.size}`);
    }

    /**
     * Obtener lista de archivos a monitorear
     */
    getWatchedFiles() {
        const files = [];

        const scanDir = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    // Ignorar ciertos patrones
                    if (this.shouldIgnore(fullPath)) continue;

                    if (entry.isDirectory()) {
                        // No escanear subdirectorios por defecto
                        // scanDir(fullPath);
                    } else if (entry.isFile() && this.shouldWatch(entry.name)) {
                        files.push(fullPath);
                    }
                }
            } catch (e) {
                // Ignorar errores de acceso
            }
        };

        scanDir(this.servicesDir);
        return files;
    }

    /**
     * Verificar si un archivo debe ser monitoreado
     */
    shouldWatch(filename) {
        return this.watchPatterns.some(pattern => pattern.test(filename));
    }

    /**
     * Verificar si un archivo debe ser ignorado
     */
    shouldIgnore(filepath) {
        return this.ignorePatterns.some(pattern => pattern.test(filepath));
    }

    /**
     * Verificar cambios en archivos
     */
    checkForChanges() {
        const files = this.getWatchedFiles();
        const changedFiles = [];

        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const currentHash = this.hashContent(content);
                const previousHash = this.fileHashes.get(file);

                if (currentHash !== previousHash) {
                    changedFiles.push({
                        file,
                        previousHash,
                        currentHash
                    });
                    this.fileHashes.set(file, currentHash);
                }
            } catch (e) {
                // Archivo puede haber sido eliminado
            }
        }

        // Procesar cambios con debounce
        for (const change of changedFiles) {
            this.handleFileChange(change);
        }
    }

    /**
     * Manejar cambio en archivo (con debounce)
     */
    handleFileChange(change) {
        const filename = path.basename(change.file);
        console.log(`📝 [FILE-WATCHER] Cambio detectado: ${filename}`);

        // Agregar a cambios pendientes
        this.pendingChanges.set(change.file, change);

        // Limpiar timer anterior si existe
        if (this.debounceTimers.has(change.file)) {
            clearTimeout(this.debounceTimers.get(change.file));
        }

        // Crear nuevo timer con debounce
        const timer = setTimeout(() => {
            this.processChange(change);
            this.debounceTimers.delete(change.file);
        }, this.debounceTime);

        this.debounceTimers.set(change.file, timer);
    }

    /**
     * Procesar cambio en archivo
     */
    async processChange(change) {
        const filename = path.basename(change.file);
        console.log(`🔄 [FILE-WATCHER] Procesando cambio: ${filename}`);

        // Determinar qué módulo fue afectado
        const affectedModule = this.detectAffectedModule(change.file);

        if (affectedModule && this.workflowGenerator) {
            try {
                // Regenerar workflow del módulo afectado
                console.log(`   → Regenerando workflow para: ${affectedModule}`);

                const config = this.workflowGenerator.moduleConfigs[affectedModule];
                if (config) {
                    const result = await this.workflowGenerator.regenerateModuleWorkflow(affectedModule, config);

                    // Emitir evento
                    this.emit('workflow-updated', {
                        module: affectedModule,
                        file: filename,
                        result,
                        timestamp: new Date().toISOString()
                    });

                    // Notificar a Brain si está disponible
                    if (this.brainService && typeof this.brainService.onWorkflowUpdated === 'function') {
                        await this.brainService.onWorkflowUpdated(affectedModule, result);
                    }

                    console.log(`   ✅ Workflow regenerado: ${affectedModule} (${result.stagesCount} stages)`);
                }
            } catch (error) {
                console.error(`   ❌ Error regenerando workflow:`, error.message);
                this.emit('error', { module: affectedModule, error });
            }
        } else {
            // Emitir evento genérico de cambio
            this.emit('file-changed', {
                file: filename,
                fullPath: change.file,
                timestamp: new Date().toISOString()
            });
        }

        // Limpiar de pendientes
        this.pendingChanges.delete(change.file);
    }

    /**
     * Detectar módulo afectado por el cambio
     */
    detectAffectedModule(filepath) {
        const filename = path.basename(filepath);

        if (!this.workflowGenerator) return null;

        // Buscar en configuraciones de módulos
        for (const [moduleKey, config] of Object.entries(this.workflowGenerator.moduleConfigs)) {
            if (config.sourceFiles.includes(filename)) {
                return moduleKey;
            }
        }

        // Intentar inferir por nombre de archivo
        const nameLower = filename.toLowerCase();

        if (nameLower.includes('attendance') || nameLower.includes('latearrival')) return 'attendance';
        if (nameLower.includes('legal')) return 'legal';
        if (nameLower.includes('medical')) return 'medical';
        if (nameLower.includes('vacation')) return 'vacation';
        if (nameLower.includes('sanction')) return 'sanctions';
        if (nameLower.includes('procedure')) return 'procedures';
        if (nameLower.includes('recruit') || nameLower.includes('candidate')) return 'recruitment';
        if (nameLower.includes('payroll')) return 'payroll';
        if (nameLower.includes('notification')) return 'notifications';

        return null;
    }

    /**
     * Hash de contenido
     */
    hashContent(content) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Obtener estado del watcher
     */
    getStatus() {
        return {
            isWatching: this.isWatching,
            watchedFiles: this.fileHashes.size,
            pendingChanges: this.pendingChanges.size,
            servicesDir: this.servicesDir,
            watchInterval: this.watchInterval
        };
    }

    /**
     * Forzar re-escaneo de todos los archivos
     */
    async forceRescan() {
        console.log('🔄 [FILE-WATCHER] Forzando re-escaneo...');

        // Limpiar hashes
        this.fileHashes.clear();

        // Recalcular
        this.calculateInitialHashes();

        // Regenerar todos los workflows
        if (this.workflowGenerator) {
            const result = await this.workflowGenerator.regenerateAllWorkflows();
            this.emit('all-workflows-updated', result);
            return result;
        }

        return { message: 'Rescan completed, no generator available' };
    }
}

module.exports = WorkflowFileWatcher;
