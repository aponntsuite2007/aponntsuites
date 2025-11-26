/**
 * ============================================================================
 * SESSION COORDINATOR - Coordinación Multi-Sesión Claude/Humanos
 * ============================================================================
 *
 * Sistema para coordinar múltiples sesiones de Claude Code y programadores
 * humanos trabajando simultáneamente sin interferencias.
 *
 * FEATURES:
 * - Registro de sesiones activas (tokens únicos)
 * - Lock de archivos y tablas de BD
 * - Detección de conflictos por dependencies
 * - Heartbeat para detectar sesiones muertas
 * - Visibilidad total del estado del equipo
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SessionCoordinator {
  constructor() {
    this.metadataPath = path.join(__dirname, '../../engineering-metadata.js');
    this.SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos sin heartbeat = sesión muerta
    this.HEARTBEAT_INTERVAL_MS = 60 * 1000; // Heartbeat cada 1 minuto
  }

  /**
   * Cargar metadata actualizada
   */
  loadMetadata() {
    delete require.cache[require.resolve(this.metadataPath)];
    return require(this.metadataPath);
  }

  /**
   * Guardar metadata
   */
  saveMetadata(metadata) {
    const content = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(metadata, null, 2)};
`;
    fs.writeFileSync(this.metadataPath, content, 'utf8');
  }

  /**
   * Inicializar estructura de coordinación si no existe
   */
  ensureCoordinationStructure(metadata) {
    if (!metadata.coordination) {
      metadata.coordination = {
        activeSessions: {},
        fileLocks: {},
        tableLocks: {},
        taskAssignments: {},
        conflictLog: [],
        lastCleanup: new Date().toISOString()
      };
    }
    return metadata;
  }

  /**
   * Generar token único de sesión
   */
  generateSessionToken() {
    return crypto.randomBytes(16).toString('hex').toUpperCase().slice(0, 8);
  }

  /**
   * Registrar nueva sesión (Claude o Humano)
   */
  registerSession({ type, name, description }) {
    const metadata = this.loadMetadata();
    this.ensureCoordinationStructure(metadata);
    this.cleanupDeadSessions(metadata);

    const token = this.generateSessionToken();
    const now = new Date().toISOString();

    metadata.coordination.activeSessions[token] = {
      token,
      type, // 'claude' | 'human'
      name, // 'Claude Session 1' | 'Juan Pérez'
      description: description || null,
      registeredAt: now,
      lastHeartbeat: now,
      status: 'active', // 'active' | 'working' | 'idle' | 'dead'
      currentTask: null,
      lockedFiles: [],
      lockedTables: [],
      completedTasks: [],
      stats: {
        tasksCompleted: 0,
        filesModified: 0,
        errorsEncountered: 0
      }
    };

    this.saveMetadata(metadata);

    console.log(`\n🔐 [COORDINATOR] Nueva sesión registrada: ${name} (${type}) - Token: ${token}`);

    return {
      token,
      session: metadata.coordination.activeSessions[token],
      instructions: this.getSessionInstructions(token, metadata)
    };
  }

  /**
   * Heartbeat - mantener sesión viva
   */
  heartbeat(token) {
    const metadata = this.loadMetadata();
    this.ensureCoordinationStructure(metadata);

    const session = metadata.coordination.activeSessions[token];
    if (!session) {
      return { success: false, error: 'Sesión no encontrada o expirada' };
    }

    session.lastHeartbeat = new Date().toISOString();
    this.saveMetadata(metadata);

    return {
      success: true,
      session,
      activeSessions: Object.keys(metadata.coordination.activeSessions).length
    };
  }

  /**
   * Limpiar sesiones muertas (sin heartbeat reciente)
   */
  cleanupDeadSessions(metadata) {
    const now = Date.now();
    const deadTokens = [];

    for (const [token, session] of Object.entries(metadata.coordination.activeSessions || {})) {
      const lastBeat = new Date(session.lastHeartbeat).getTime();
      if (now - lastBeat > this.SESSION_TIMEOUT_MS) {
        deadTokens.push(token);

        // Liberar locks de la sesión muerta
        this.releaseAllLocks(token, metadata);

        console.log(`\n💀 [COORDINATOR] Sesión muerta detectada y limpiada: ${session.name} (${token})`);
      }
    }

    // Eliminar sesiones muertas
    for (const token of deadTokens) {
      delete metadata.coordination.activeSessions[token];
    }

    metadata.coordination.lastCleanup = new Date().toISOString();
    return deadTokens.length;
  }

  /**
   * Liberar todos los locks de una sesión
   */
  releaseAllLocks(token, metadata) {
    // Liberar file locks
    for (const [file, lockInfo] of Object.entries(metadata.coordination.fileLocks || {})) {
      if (lockInfo.token === token) {
        delete metadata.coordination.fileLocks[file];
      }
    }

    // Liberar table locks
    for (const [table, lockInfo] of Object.entries(metadata.coordination.tableLocks || {})) {
      if (lockInfo.token === token) {
        delete metadata.coordination.tableLocks[table];
      }
    }

    // Liberar task assignment
    for (const [taskId, assignment] of Object.entries(metadata.coordination.taskAssignments || {})) {
      if (assignment.token === token) {
        delete metadata.coordination.taskAssignments[taskId];
      }
    }
  }

  /**
   * Adquirir lock de tarea (incluye archivos y tablas relacionadas)
   */
  acquireTaskLock(token, taskId, phaseKey) {
    const metadata = this.loadMetadata();
    this.ensureCoordinationStructure(metadata);
    this.cleanupDeadSessions(metadata);

    // Verificar que la sesión existe
    const session = metadata.coordination.activeSessions[token];
    if (!session) {
      return { success: false, error: 'Sesión no válida o expirada' };
    }

    // Verificar que la tarea existe y obtener sus recursos
    const phase = metadata.roadmap?.[phaseKey];
    if (!phase) {
      return { success: false, error: `Fase ${phaseKey} no encontrada` };
    }

    const task = phase.tasks?.find(t => t.id === taskId);
    if (!task) {
      return { success: false, error: `Tarea ${taskId} no encontrada en fase ${phaseKey}` };
    }

    // Verificar si la tarea ya está completada
    if (task.done) {
      return { success: false, error: `Tarea ${taskId} ya está completada` };
    }

    // Verificar si la tarea ya está asignada a otra sesión
    const existingAssignment = metadata.coordination.taskAssignments[taskId];
    if (existingAssignment && existingAssignment.token !== token) {
      const assignedSession = metadata.coordination.activeSessions[existingAssignment.token];
      return {
        success: false,
        error: `Tarea ${taskId} ya asignada a ${assignedSession?.name || 'otra sesión'}`,
        assignedTo: assignedSession?.name,
        assignedToken: existingAssignment.token
      };
    }

    // Verificar dependencies no completadas
    const blockedBy = this.checkDependencies(taskId, phaseKey, metadata);
    if (blockedBy.length > 0) {
      return {
        success: false,
        error: `Tarea ${taskId} bloqueada por dependencies incompletas`,
        blockedBy
      };
    }

    // Obtener archivos y tablas que toca esta tarea (desde metadata del módulo)
    const resources = this.getTaskResources(taskId, phaseKey, metadata);

    // Verificar conflictos de recursos
    const conflicts = this.checkResourceConflicts(token, resources, metadata);
    if (conflicts.length > 0) {
      return {
        success: false,
        error: 'Conflicto de recursos con otras sesiones',
        conflicts
      };
    }

    // Adquirir locks
    const now = new Date().toISOString();

    // Lock de tarea
    metadata.coordination.taskAssignments[taskId] = {
      token,
      sessionName: session.name,
      phaseKey,
      assignedAt: now,
      status: 'in_progress'
    };

    // Lock de archivos
    for (const file of resources.files) {
      metadata.coordination.fileLocks[file] = {
        token,
        sessionName: session.name,
        taskId,
        lockedAt: now
      };
    }

    // Lock de tablas
    for (const table of resources.tables) {
      metadata.coordination.tableLocks[table] = {
        token,
        sessionName: session.name,
        taskId,
        lockedAt: now
      };
    }

    // Actualizar sesión
    session.currentTask = taskId;
    session.status = 'working';
    session.lockedFiles = resources.files;
    session.lockedTables = resources.tables;

    this.saveMetadata(metadata);

    console.log(`\n🔒 [COORDINATOR] Lock adquirido: ${session.name} → ${taskId}`);
    console.log(`   📁 Archivos: ${resources.files.join(', ') || 'ninguno'}`);
    console.log(`   🗄️ Tablas: ${resources.tables.join(', ') || 'ninguna'}`);

    return {
      success: true,
      taskId,
      task,
      resources,
      message: `Lock adquirido para tarea ${taskId}`
    };
  }

  /**
   * Liberar lock de tarea (al completar o cancelar)
   */
  releaseTaskLock(token, taskId, completed = false) {
    const metadata = this.loadMetadata();
    this.ensureCoordinationStructure(metadata);

    const session = metadata.coordination.activeSessions[token];
    if (!session) {
      return { success: false, error: 'Sesión no válida' };
    }

    const assignment = metadata.coordination.taskAssignments[taskId];
    if (!assignment || assignment.token !== token) {
      return { success: false, error: 'Esta sesión no tiene lock de esta tarea' };
    }

    // Liberar locks de archivos de esta tarea
    for (const [file, lock] of Object.entries(metadata.coordination.fileLocks)) {
      if (lock.taskId === taskId && lock.token === token) {
        delete metadata.coordination.fileLocks[file];
      }
    }

    // Liberar locks de tablas de esta tarea
    for (const [table, lock] of Object.entries(metadata.coordination.tableLocks)) {
      if (lock.taskId === taskId && lock.token === token) {
        delete metadata.coordination.tableLocks[table];
      }
    }

    // Liberar assignment de tarea
    delete metadata.coordination.taskAssignments[taskId];

    // Actualizar sesión
    session.currentTask = null;
    session.status = 'idle';
    session.lockedFiles = [];
    session.lockedTables = [];

    if (completed) {
      session.completedTasks.push(taskId);
      session.stats.tasksCompleted++;
    }

    this.saveMetadata(metadata);

    console.log(`\n🔓 [COORDINATOR] Lock liberado: ${session.name} → ${taskId} (${completed ? 'completada' : 'cancelada'})`);

    return { success: true, message: `Lock liberado para tarea ${taskId}` };
  }

  /**
   * Verificar dependencies de una tarea
   */
  checkDependencies(taskId, phaseKey, metadata) {
    const phase = metadata.roadmap?.[phaseKey];
    if (!phase) return [];

    const task = phase.tasks?.find(t => t.id === taskId);
    if (!task || !task.dependencies) return [];

    const blockedBy = [];
    for (const depId of task.dependencies) {
      // Buscar la dependency en la misma fase o en otras
      let depTask = phase.tasks?.find(t => t.id === depId);

      if (!depTask) {
        // Buscar en otras fases
        for (const [key, p] of Object.entries(metadata.roadmap || {})) {
          depTask = p.tasks?.find(t => t.id === depId);
          if (depTask) break;
        }
      }

      if (depTask && !depTask.done) {
        blockedBy.push({
          taskId: depId,
          taskName: depTask.name,
          reason: 'Dependency no completada'
        });
      }
    }

    return blockedBy;
  }

  /**
   * Obtener recursos (archivos y tablas) que toca una tarea
   */
  getTaskResources(taskId, phaseKey, metadata) {
    // Por ahora, mapeo básico basado en prefijos de taskId
    // TODO: Mejorar con análisis real del código

    const resources = { files: [], tables: [] };
    const prefix = taskId.split('-')[0];

    // Mapeo de prefijos a recursos típicos
    const resourceMap = {
      'VH': {
        files: ['src/models/AponntStaff.js', 'src/routes/aponntDashboard.js'],
        tables: ['aponnt_staff', 'vendor_statistics']
      },
      'BC': {
        files: ['src/models/Budget.js', 'src/models/Contract.js', 'src/routes/budgetRoutes.js'],
        tables: ['budgets', 'contracts', 'budget_approvals']
      },
      'INV': {
        files: ['src/models/Invoice.js', 'src/routes/invoiceRoutes.js'],
        tables: ['invoices', 'payment_confirmations']
      },
      'LIQ': {
        files: ['src/models/CommissionLiquidation.js', 'src/routes/liquidationRoutes.js'],
        tables: ['commission_liquidations', 'transfers']
      },
      'MOB': {
        files: [], // Mobile es repo separado
        tables: []
      },
      'PH4': {
        files: ['src/auditor/collectors/*.js'],
        tables: ['audit_logs']
      },
      'VC': {
        files: ['public/js/modules/user-calendar-tab.js', 'src/routes/user-calendar-routes.js'],
        tables: ['user_shift_assignments']
      },
      'PDF': {
        files: ['src/services/ReportGenerator.js', 'src/routes/reportRoutes.js'],
        tables: ['report_logs']
      }
    };

    if (resourceMap[prefix]) {
      resources.files = resourceMap[prefix].files;
      resources.tables = resourceMap[prefix].tables;
    }

    return resources;
  }

  /**
   * Verificar conflictos de recursos con otras sesiones
   */
  checkResourceConflicts(token, resources, metadata) {
    const conflicts = [];

    // Verificar conflictos de archivos
    for (const file of resources.files) {
      const lock = metadata.coordination.fileLocks[file];
      if (lock && lock.token !== token) {
        conflicts.push({
          type: 'file',
          resource: file,
          lockedBy: lock.sessionName,
          lockedByToken: lock.token,
          taskId: lock.taskId
        });
      }
    }

    // Verificar conflictos de tablas
    for (const table of resources.tables) {
      const lock = metadata.coordination.tableLocks[table];
      if (lock && lock.token !== token) {
        conflicts.push({
          type: 'table',
          resource: table,
          lockedBy: lock.sessionName,
          lockedByToken: lock.token,
          taskId: lock.taskId
        });
      }
    }

    return conflicts;
  }

  /**
   * Obtener estado completo de coordinación
   */
  getCoordinationStatus(token = null) {
    const metadata = this.loadMetadata();
    this.ensureCoordinationStructure(metadata);
    this.cleanupDeadSessions(metadata);
    this.saveMetadata(metadata);

    const status = {
      activeSessions: Object.values(metadata.coordination.activeSessions),
      totalActiveSessions: Object.keys(metadata.coordination.activeSessions).length,
      fileLocks: metadata.coordination.fileLocks,
      tableLocks: metadata.coordination.tableLocks,
      taskAssignments: metadata.coordination.taskAssignments,
      lastCleanup: metadata.coordination.lastCleanup
    };

    // Si se proporciona token, incluir info específica de esa sesión
    if (token) {
      status.mySession = metadata.coordination.activeSessions[token] || null;
      status.availableTasks = this.getAvailableTasks(token, metadata);
    }

    return status;
  }

  /**
   * Obtener tareas disponibles para una sesión (no bloqueadas, dependencies ok)
   */
  getAvailableTasks(token, metadata) {
    const available = [];

    for (const [phaseKey, phase] of Object.entries(metadata.roadmap || {})) {
      if (!phase.tasks) continue;

      for (const task of phase.tasks) {
        if (task.done) continue;

        // Verificar si ya está asignada
        const assignment = metadata.coordination.taskAssignments[task.id];
        if (assignment && assignment.token !== token) continue;

        // Verificar dependencies
        const blockedBy = this.checkDependencies(task.id, phaseKey, metadata);
        if (blockedBy.length > 0) continue;

        // Verificar conflictos de recursos
        const resources = this.getTaskResources(task.id, phaseKey, metadata);
        const conflicts = this.checkResourceConflicts(token, resources, metadata);
        if (conflicts.length > 0) continue;

        available.push({
          taskId: task.id,
          taskName: task.name,
          phaseKey,
          phaseName: phase.name,
          priority: phase.priority || 'MEDIUM',
          resources
        });
      }
    }

    return available;
  }

  /**
   * Obtener instrucciones para una sesión de Claude
   */
  getSessionInstructions(token, metadata) {
    const session = metadata.coordination.activeSessions[token];
    const status = this.getCoordinationStatus(token);

    return `
════════════════════════════════════════════════════════════════════════════════
🤖 SESIÓN DE CLAUDE CODE REGISTRADA
════════════════════════════════════════════════════════════════════════════════

📋 TU INFORMACIÓN:
   Token: ${token}
   Nombre: ${session.name}
   Tipo: ${session.type}
   Estado: ${session.status}

👥 EQUIPO ACTIVO:
   ${status.totalActiveSessions} sesiones activas
${status.activeSessions.map(s => `   - ${s.name} (${s.type}): ${s.currentTask || 'idle'}`).join('\n')}

🔒 RECURSOS BLOQUEADOS:
   Archivos: ${Object.keys(metadata.coordination.fileLocks).length}
   Tablas: ${Object.keys(metadata.coordination.tableLocks).length}

📋 TAREAS DISPONIBLES PARA TI: ${status.availableTasks?.length || 0}

════════════════════════════════════════════════════════════════════════════════
⚠️ REGLAS DE COORDINACIÓN:
════════════════════════════════════════════════════════════════════════════════

1. ANTES de trabajar en una tarea:
   POST /api/coordination/acquire-lock
   { "token": "${token}", "taskId": "XXX-1", "phaseKey": "fase_xxx" }

2. CADA 1 MINUTO, enviar heartbeat:
   POST /api/coordination/heartbeat
   { "token": "${token}" }

3. AL COMPLETAR tarea:
   POST /api/coordination/release-lock
   { "token": "${token}", "taskId": "XXX-1", "completed": true }

4. PARA VER ESTADO DEL EQUIPO:
   GET /api/coordination/status?token=${token}

5. NO TOCAR archivos/tablas que aparezcan en "RECURSOS BLOQUEADOS"

════════════════════════════════════════════════════════════════════════════════
`;
  }

  /**
   * Cerrar sesión (logout)
   */
  closeSession(token) {
    const metadata = this.loadMetadata();
    this.ensureCoordinationStructure(metadata);

    const session = metadata.coordination.activeSessions[token];
    if (!session) {
      return { success: false, error: 'Sesión no encontrada' };
    }

    // Liberar todos los locks
    this.releaseAllLocks(token, metadata);

    // Eliminar sesión
    delete metadata.coordination.activeSessions[token];

    this.saveMetadata(metadata);

    console.log(`\n👋 [COORDINATOR] Sesión cerrada: ${session.name} (${token})`);

    return {
      success: true,
      message: `Sesión ${session.name} cerrada correctamente`,
      stats: session.stats
    };
  }
}

module.exports = new SessionCoordinator();
