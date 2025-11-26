/**
 * ============================================================================
 * COORDINATION ROUTES - API para coordinación multi-sesión
 * ============================================================================
 *
 * ENDPOINTS:
 *
 * SESIONES:
 * - POST /api/coordination/register - Registrar nueva sesión (obtener token)
 * - POST /api/coordination/heartbeat - Mantener sesión viva
 * - POST /api/coordination/close - Cerrar sesión
 *
 * LOCKS:
 * - POST /api/coordination/acquire-lock - Adquirir lock de tarea
 * - POST /api/coordination/release-lock - Liberar lock de tarea
 *
 * ESTADO:
 * - GET /api/coordination/status - Estado completo de coordinación
 * - GET /api/coordination/my-tasks - Tareas disponibles para mi sesión
 * - GET /api/coordination/team - Ver equipo activo
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const SessionCoordinator = require('../services/SessionCoordinator');

/**
 * POST /api/coordination/register
 * Registrar nueva sesión y obtener token
 *
 * Body:
 * {
 *   "type": "claude" | "human",
 *   "name": "Claude Session 1" | "Juan Pérez",
 *   "description": "Trabajando en módulo de reportes" (opcional)
 * }
 */
router.post('/register', (req, res) => {
  try {
    const { type, name, description } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: type ("claude" | "human"), name'
      });
    }

    if (!['claude', 'human'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type debe ser "claude" o "human"'
      });
    }

    const result = SessionCoordinator.registerSession({ type, name, description });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error(`❌ Error registrando sesión: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/coordination/heartbeat
 * Mantener sesión viva (llamar cada 1 minuto)
 *
 * Body:
 * { "token": "ABC12345" }
 */
router.post('/heartbeat', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Campo requerido: token'
      });
    }

    const result = SessionCoordinator.heartbeat(token);
    res.json(result);

  } catch (error) {
    console.error(`❌ Error en heartbeat: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/coordination/close
 * Cerrar sesión y liberar todos los locks
 *
 * Body:
 * { "token": "ABC12345" }
 */
router.post('/close', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Campo requerido: token'
      });
    }

    const result = SessionCoordinator.closeSession(token);
    res.json(result);

  } catch (error) {
    console.error(`❌ Error cerrando sesión: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/coordination/acquire-lock
 * Adquirir lock de una tarea (incluye archivos y tablas)
 *
 * Body:
 * {
 *   "token": "ABC12345",
 *   "taskId": "PDF-1",
 *   "phaseKey": "sistema_reportes_pdf"
 * }
 */
router.post('/acquire-lock', (req, res) => {
  try {
    const { token, taskId, phaseKey } = req.body;

    if (!token || !taskId || !phaseKey) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: token, taskId, phaseKey'
      });
    }

    const result = SessionCoordinator.acquireTaskLock(token, taskId, phaseKey);

    if (!result.success) {
      return res.status(409).json(result); // 409 Conflict
    }

    res.json(result);

  } catch (error) {
    console.error(`❌ Error adquiriendo lock: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/coordination/release-lock
 * Liberar lock de una tarea
 *
 * Body:
 * {
 *   "token": "ABC12345",
 *   "taskId": "PDF-1",
 *   "completed": true | false
 * }
 */
router.post('/release-lock', (req, res) => {
  try {
    const { token, taskId, completed } = req.body;

    if (!token || !taskId) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: token, taskId'
      });
    }

    const result = SessionCoordinator.releaseTaskLock(token, taskId, completed === true);
    res.json(result);

  } catch (error) {
    console.error(`❌ Error liberando lock: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/coordination/status
 * Estado completo de coordinación
 *
 * Query params:
 * - token (opcional): incluye tareas disponibles para esa sesión
 */
router.get('/status', (req, res) => {
  try {
    const { token } = req.query;
    const status = SessionCoordinator.getCoordinationStatus(token);

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error(`❌ Error obteniendo status: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/coordination/my-tasks
 * Tareas disponibles para mi sesión (no bloqueadas, dependencies ok)
 *
 * Query params:
 * - token: token de sesión
 */
router.get('/my-tasks', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Query param requerido: token'
      });
    }

    const status = SessionCoordinator.getCoordinationStatus(token);

    if (!status.mySession) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada o expirada'
      });
    }

    res.json({
      success: true,
      session: status.mySession,
      availableTasks: status.availableTasks,
      totalAvailable: status.availableTasks?.length || 0
    });

  } catch (error) {
    console.error(`❌ Error obteniendo mis tareas: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/coordination/team
 * Ver equipo activo
 */
router.get('/team', (req, res) => {
  try {
    const status = SessionCoordinator.getCoordinationStatus();

    const team = status.activeSessions.map(s => ({
      name: s.name,
      type: s.type,
      status: s.status,
      currentTask: s.currentTask,
      lockedFiles: s.lockedFiles?.length || 0,
      lockedTables: s.lockedTables?.length || 0,
      tasksCompleted: s.stats?.tasksCompleted || 0,
      lastHeartbeat: s.lastHeartbeat
    }));

    res.json({
      success: true,
      totalMembers: team.length,
      claudeSessions: team.filter(t => t.type === 'claude').length,
      humanSessions: team.filter(t => t.type === 'human').length,
      team
    });

  } catch (error) {
    console.error(`❌ Error obteniendo equipo: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/coordination/locks
 * Ver todos los locks activos
 */
router.get('/locks', (req, res) => {
  try {
    const status = SessionCoordinator.getCoordinationStatus();

    res.json({
      success: true,
      fileLocks: status.fileLocks,
      tableLocks: status.tableLocks,
      taskAssignments: status.taskAssignments,
      totalFileLocks: Object.keys(status.fileLocks).length,
      totalTableLocks: Object.keys(status.tableLocks).length,
      totalTasksInProgress: Object.keys(status.taskAssignments).length
    });

  } catch (error) {
    console.error(`❌ Error obteniendo locks: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/coordination/check-conflicts
 * Verificar si una tarea tendría conflictos antes de asignarla
 *
 * Body:
 * {
 *   "token": "ABC12345",
 *   "taskId": "PDF-1",
 *   "phaseKey": "sistema_reportes_pdf"
 * }
 */
router.post('/check-conflicts', (req, res) => {
  try {
    const { token, taskId, phaseKey } = req.body;

    if (!token || !taskId || !phaseKey) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: token, taskId, phaseKey'
      });
    }

    // Usar la misma lógica pero sin adquirir el lock
    const metadata = SessionCoordinator.loadMetadata();
    SessionCoordinator.ensureCoordinationStructure(metadata);

    // Verificar dependencies
    const blockedBy = SessionCoordinator.checkDependencies(taskId, phaseKey, metadata);

    // Obtener recursos
    const resources = SessionCoordinator.getTaskResources(taskId, phaseKey, metadata);

    // Verificar conflictos
    const conflicts = SessionCoordinator.checkResourceConflicts(token, resources, metadata);

    // Verificar si ya está asignada
    const assignment = metadata.coordination.taskAssignments[taskId];
    const alreadyAssigned = assignment && assignment.token !== token;

    res.json({
      success: true,
      taskId,
      canAcquire: blockedBy.length === 0 && conflicts.length === 0 && !alreadyAssigned,
      blockedBy,
      conflicts,
      alreadyAssigned: alreadyAssigned ? {
        sessionName: assignment?.sessionName,
        token: assignment?.token
      } : null,
      resources
    });

  } catch (error) {
    console.error(`❌ Error verificando conflictos: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/coordination/force-release
 * Forzar liberación de una sesión (admin) - Para cuando se corta la luz, etc.
 *
 * Body:
 * { "tokenToRelease": "ABC12345" }
 */
router.post('/force-release', (req, res) => {
  try {
    const { tokenToRelease } = req.body;

    if (!tokenToRelease) {
      return res.status(400).json({
        success: false,
        error: 'Campo requerido: tokenToRelease'
      });
    }

    const result = SessionCoordinator.closeSession(tokenToRelease);

    if (result.success) {
      console.log(`\n⚠️ [COORDINATOR] Sesión liberada forzosamente: ${tokenToRelease}`);
    }

    res.json({
      ...result,
      forcedRelease: true
    });

  } catch (error) {
    console.error(`❌ Error liberando sesión forzosamente: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/coordination/force-release-task
 * Forzar liberación de una tarea específica sin cerrar la sesión
 *
 * Body:
 * { "taskId": "BC-1" }
 */
router.post('/force-release-task', (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Campo requerido: taskId'
      });
    }

    const metadata = SessionCoordinator.loadMetadata();
    SessionCoordinator.ensureCoordinationStructure(metadata);

    const assignment = metadata.coordination.taskAssignments[taskId];
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: `Tarea ${taskId} no tiene lock activo`
      });
    }

    const sessionName = assignment.sessionName;
    const token = assignment.token;

    // Liberar locks de archivos de esta tarea
    for (const [file, lock] of Object.entries(metadata.coordination.fileLocks || {})) {
      if (lock.taskId === taskId) {
        delete metadata.coordination.fileLocks[file];
      }
    }

    // Liberar locks de tablas de esta tarea
    for (const [table, lock] of Object.entries(metadata.coordination.tableLocks || {})) {
      if (lock.taskId === taskId) {
        delete metadata.coordination.tableLocks[table];
      }
    }

    // Liberar assignment de tarea
    delete metadata.coordination.taskAssignments[taskId];

    // Actualizar sesión si existe
    const session = metadata.coordination.activeSessions[token];
    if (session && session.currentTask === taskId) {
      session.currentTask = null;
      session.status = 'idle';
      session.lockedFiles = [];
      session.lockedTables = [];
    }

    SessionCoordinator.saveMetadata(metadata);

    console.log(`\n⚠️ [COORDINATOR] Tarea ${taskId} liberada forzosamente (era de ${sessionName})`);

    res.json({
      success: true,
      message: `Tarea ${taskId} liberada forzosamente`,
      previousOwner: sessionName,
      previousToken: token
    });

  } catch (error) {
    console.error(`❌ Error liberando tarea forzosamente: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/coordination/sessions-with-tasks
 * Obtener todas las sesiones activas con sus tareas y detalles del roadmap
 */
router.get('/sessions-with-tasks', (req, res) => {
  try {
    const metadata = SessionCoordinator.loadMetadata();
    SessionCoordinator.ensureCoordinationStructure(metadata);

    const sessions = [];

    for (const [token, session] of Object.entries(metadata.coordination.activeSessions || {})) {
      const sessionInfo = {
        token,
        name: session.name,
        type: session.type,
        status: session.status,
        currentTask: null,
        lastHeartbeat: session.lastHeartbeat,
        tasksCompleted: session.stats?.tasksCompleted || 0
      };

      // Si tiene tarea asignada, obtener detalles del roadmap
      if (session.currentTask) {
        const taskId = session.currentTask;
        const assignment = metadata.coordination.taskAssignments[taskId];

        if (assignment) {
          const phase = metadata.roadmap?.[assignment.phaseKey];
          const task = phase?.tasks?.find(t => t.id === taskId);

          sessionInfo.currentTask = {
            taskId,
            taskName: task?.name || 'Unknown',
            phaseKey: assignment.phaseKey,
            phaseName: phase?.name || 'Unknown',
            phaseDescription: phase?.description || null,
            assignedAt: assignment.assignedAt,
            lockedFiles: session.lockedFiles || [],
            lockedTables: session.lockedTables || []
          };
        }
      }

      sessions.push(sessionInfo);
    }

    res.json({
      success: true,
      totalSessions: sessions.length,
      sessions
    });

  } catch (error) {
    console.error(`❌ Error obteniendo sesiones con tareas: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
