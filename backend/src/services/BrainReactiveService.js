/**
 * ============================================================================
 * BRAIN REACTIVE SERVICE - Sistema Reactivo del Cerebro
 * ============================================================================
 *
 * Este servicio implementa la reactividad del Brain:
 * - FileWatcher: Detecta cambios en archivos EN TIEMPO REAL
 * - EventBus: Propaga eventos a todos los listeners
 * - TaskDetector: Auto-detecta tareas completadas desde código
 * - WorkflowGenerator: Genera tutoriales desde código vivo
 *
 * PRINCIPIO: "Cuando pica la mano, el cerebro reacciona inmediatamente"
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const chokidar = require('chokidar');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class BrainReactiveService extends EventEmitter {
  constructor(brainService, database) {
    super();
    this.brain = brainService;
    this.db = database;
    this.baseDir = path.resolve(__dirname, '../..');
    this.watcher = null;
    this.isWatching = false;
    this.changeBuffer = new Map(); // Buffer para debounce
    this.debounceTime = 500; // ms

    // Patrones de detección de tareas
    this.taskPatterns = {
      // Patrón: Si existe un endpoint POST /xxx/approve → tarea de aprobación completada
      approve: /router\.(post|put)\s*\(\s*['"]\/([\w-]+)\/approve/gi,
      // Patrón: Si existe un endpoint para CRUD completo
      crud: {
        create: /router\.post\s*\(\s*['"]\/(?!login|logout|auth)([\w-]+)['"]/gi,
        read: /router\.get\s*\(\s*['"]\/(?!login|logout|auth)([\w-]+)\/:id['"]/gi,
        update: /router\.put\s*\(\s*['"]\/(?!login|logout|auth)([\w-]+)\/:id['"]/gi,
        delete: /router\.delete\s*\(\s*['"]\/(?!login|logout|auth)([\w-]+)\/:id['"]/gi
      },
      // Patrón: Workflow detectado
      workflow: /async\s+(\w+Workflow)\s*\(/gi,
      // Patrón: Estado de máquina
      stateMachine: /status\s*===?\s*['"](\w+)['"]/gi
    };

    console.log('🧠 [BRAIN-REACTIVE] Servicio inicializado');
  }

  /**
   * Iniciar el sistema de observación de archivos
   */
  startWatching() {
    if (this.isWatching) {
      console.log('👁️ [BRAIN-REACTIVE] Ya está observando');
      return;
    }

    const watchPaths = [
      path.join(this.baseDir, 'src/routes'),
      path.join(this.baseDir, 'src/services'),
      path.join(this.baseDir, 'src/models'),
      path.join(this.baseDir, 'public/js/modules'),
      path.join(this.baseDir, 'migrations')
    ];

    console.log('👁️ [BRAIN-REACTIVE] Iniciando observación de archivos...');
    console.log('   Directorios observados:');
    watchPaths.forEach(p => console.log(`   📂 ${p}`));

    this.watcher = chokidar.watch(watchPaths, {
      ignored: [
        /(^|[\/\\])\../, // Archivos ocultos
        /node_modules/,
        /backup/i,
        /\.log$/
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    // Eventos de archivo
    this.watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('delete', filePath))
      .on('error', (error) => {
        console.error('❌ [BRAIN-REACTIVE] Error en watcher:', error);
        this.emit('error', { type: 'watcher', error });
      })
      .on('ready', () => {
        this.isWatching = true;
        console.log('✅ [BRAIN-REACTIVE] Observación activa - Cerebro reactivo ENCENDIDO');
        this.emit('ready');
      });
  }

  /**
   * Manejar cambio de archivo con debounce
   */
  handleFileChange(eventType, filePath) {
    const relativePath = path.relative(this.baseDir, filePath);
    const key = `${eventType}:${filePath}`;

    // Debounce: Si hay un cambio pendiente para este archivo, cancelarlo
    if (this.changeBuffer.has(key)) {
      clearTimeout(this.changeBuffer.get(key));
    }

    // Programar procesamiento con debounce
    const timeoutId = setTimeout(() => {
      this.processFileChange(eventType, filePath, relativePath);
      this.changeBuffer.delete(key);
    }, this.debounceTime);

    this.changeBuffer.set(key, timeoutId);
  }

  /**
   * Procesar cambio de archivo
   */
  async processFileChange(eventType, filePath, relativePath) {
    const fileInfo = this.classifyFile(relativePath);

    console.log(`\n🔔 [BRAIN-REACTIVE] Cambio detectado:`);
    console.log(`   Evento: ${eventType.toUpperCase()}`);
    console.log(`   Archivo: ${relativePath}`);
    console.log(`   Categoría: ${fileInfo.category}`);
    console.log(`   Módulo: ${fileInfo.module || 'N/A'}`);

    // Emitir evento genérico de cambio
    this.emit('file:changed', {
      eventType,
      filePath,
      relativePath,
      ...fileInfo,
      timestamp: new Date().toISOString()
    });

    // Procesar según categoría
    switch (fileInfo.category) {
      case 'routes':
        await this.processRouteChange(filePath, relativePath, eventType);
        break;
      case 'services':
        await this.processServiceChange(filePath, relativePath, eventType);
        break;
      case 'models':
        await this.processModelChange(filePath, relativePath, eventType);
        break;
      case 'frontend':
        await this.processFrontendChange(filePath, relativePath, eventType);
        break;
      case 'migrations':
        await this.processMigrationChange(filePath, relativePath, eventType);
        break;
    }

    // Invalidar cache del Brain para esta categoría
    if (this.brain) {
      this.brain.clearCache();
      console.log('   🔄 Cache del Brain invalidado');
    }
  }

  /**
   * Clasificar archivo por su ruta
   */
  classifyFile(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');

    if (normalized.startsWith('src/routes/')) {
      const fileName = path.basename(relativePath, '.js');
      const module = fileName.replace(/Routes?$/i, '');
      return { category: 'routes', module, fileType: 'backend' };
    }
    if (normalized.startsWith('src/services/')) {
      const fileName = path.basename(relativePath, '.js');
      const module = fileName.replace(/Service$/i, '');
      return { category: 'services', module, fileType: 'backend' };
    }
    if (normalized.startsWith('src/models/')) {
      const fileName = path.basename(relativePath, '.js');
      return { category: 'models', module: fileName, fileType: 'backend' };
    }
    if (normalized.startsWith('public/js/modules/')) {
      const fileName = path.basename(relativePath, '.js');
      return { category: 'frontend', module: fileName, fileType: 'frontend' };
    }
    if (normalized.startsWith('migrations/')) {
      return { category: 'migrations', module: null, fileType: 'database' };
    }
    return { category: 'other', module: null, fileType: 'unknown' };
  }

  /**
   * Procesar cambio en archivo de rutas
   */
  async processRouteChange(filePath, relativePath, eventType) {
    if (eventType === 'delete') {
      this.emit('route:deleted', { filePath, relativePath });
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Detectar endpoints
      const endpoints = this.extractEndpoints(content);
      console.log(`   📡 Endpoints detectados: ${endpoints.length}`);

      // Detectar patrones de tareas completadas
      const completedTasks = this.detectCompletedTasks(content, relativePath);
      if (completedTasks.length > 0) {
        console.log(`   ✅ Tareas completadas detectadas: ${completedTasks.length}`);
        completedTasks.forEach(task => {
          console.log(`      - ${task.type}: ${task.name}`);
          this.emit('task:completed', task);
        });
      }

      // Detectar workflows
      const workflows = this.detectWorkflows(content, relativePath);
      if (workflows.length > 0) {
        console.log(`   🔄 Workflows detectados: ${workflows.length}`);
        this.emit('workflow:detected', { workflows, source: relativePath });
      }

      this.emit('route:changed', {
        filePath,
        relativePath,
        endpoints,
        completedTasks,
        workflows
      });
    } catch (error) {
      console.error(`   ❌ Error procesando ruta: ${error.message}`);
    }
  }

  /**
   * Procesar cambio en archivo de servicio
   */
  async processServiceChange(filePath, relativePath, eventType) {
    if (eventType === 'delete') {
      this.emit('service:deleted', { filePath, relativePath });
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Detectar workflows en servicios
      const workflows = this.detectWorkflows(content, relativePath);

      // Detectar máquinas de estado
      const stateMachines = this.detectStateMachines(content);

      if (stateMachines.length > 0) {
        console.log(`   🎭 Máquinas de estado: ${stateMachines.length}`);
        this.emit('statemachine:detected', {
          stateMachines,
          source: relativePath
        });
      }

      this.emit('service:changed', {
        filePath,
        relativePath,
        workflows,
        stateMachines
      });
    } catch (error) {
      console.error(`   ❌ Error procesando servicio: ${error.message}`);
    }
  }

  /**
   * Procesar cambio en modelo
   */
  async processModelChange(filePath, relativePath, eventType) {
    this.emit('model:changed', { filePath, relativePath, eventType });
    console.log(`   📊 Modelo ${eventType}: Actualización de schema detectada`);
  }

  /**
   * Procesar cambio en frontend
   */
  async processFrontendChange(filePath, relativePath, eventType) {
    this.emit('frontend:changed', { filePath, relativePath, eventType });
    console.log(`   🎨 Frontend ${eventType}: UI actualizada`);
  }

  /**
   * Procesar cambio en migración
   */
  async processMigrationChange(filePath, relativePath, eventType) {
    this.emit('migration:changed', { filePath, relativePath, eventType });
    console.log(`   🗄️ Migración ${eventType}: Schema de BD puede haber cambiado`);
  }

  /**
   * Extraer endpoints de un archivo de rutas
   */
  extractEndpoints(content) {
    const endpoints = [];
    const pattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"](\/[^'"]*)['"]/gi;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
    return endpoints;
  }

  /**
   * Detectar tareas completadas basándose en patrones de código
   */
  detectCompletedTasks(content, sourcePath) {
    const tasks = [];
    const moduleName = path.basename(sourcePath, '.js').replace(/Routes?$/i, '');

    // Detectar CRUD completo
    const crudOps = { create: false, read: false, update: false, delete: false };

    for (const [op, pattern] of Object.entries(this.taskPatterns.crud)) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        crudOps[op] = true;
      }
    }

    // Si tiene CRUD completo, es una tarea completada
    if (crudOps.create && crudOps.read && crudOps.update && crudOps.delete) {
      tasks.push({
        type: 'crud_complete',
        name: `CRUD completo para ${moduleName}`,
        module: moduleName,
        source: sourcePath,
        detectedAt: new Date().toISOString()
      });
    }

    // Detectar aprobaciones (workflow importante)
    this.taskPatterns.approve.lastIndex = 0;
    let approveMatch;
    while ((approveMatch = this.taskPatterns.approve.exec(content)) !== null) {
      tasks.push({
        type: 'workflow_approve',
        name: `Workflow de aprobación para ${approveMatch[2]}`,
        module: approveMatch[2],
        source: sourcePath,
        detectedAt: new Date().toISOString()
      });
    }

    return tasks;
  }

  /**
   * Detectar workflows en código
   */
  detectWorkflows(content, sourcePath) {
    const workflows = [];

    this.taskPatterns.workflow.lastIndex = 0;
    let match;
    while ((match = this.taskPatterns.workflow.exec(content)) !== null) {
      workflows.push({
        name: match[1],
        type: 'explicit',
        source: sourcePath,
        detectedAt: new Date().toISOString()
      });
    }

    return workflows;
  }

  /**
   * Detectar máquinas de estado
   */
  detectStateMachines(content) {
    const states = new Set();

    this.taskPatterns.stateMachine.lastIndex = 0;
    let match;
    while ((match = this.taskPatterns.stateMachine.exec(content)) !== null) {
      states.add(match[1].toLowerCase());
    }

    if (states.size >= 3) {
      return [{
        states: Array.from(states),
        stateCount: states.size
      }];
    }
    return [];
  }

  /**
   * Detener observación
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.isWatching = false;
      console.log('🛑 [BRAIN-REACTIVE] Observación detenida');
    }
  }

  /**
   * Obtener estado del servicio
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      pendingChanges: this.changeBuffer.size,
      eventListeners: this.eventNames().map(name => ({
        event: name,
        listeners: this.listenerCount(name)
      }))
    };
  }
}

module.exports = BrainReactiveService;
