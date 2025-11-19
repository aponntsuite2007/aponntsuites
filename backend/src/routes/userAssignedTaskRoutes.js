const express = require('express');
const router = express.Router();
const { UserAssignedTask, User, CompanyTask } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/users/:userId/assigned-tasks
 * @desc Obtener todas las tareas asignadas a un usuario
 * @access Private
 */
router.get('/:userId/assigned-tasks', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, priority, includeCompleted } = req.query;

    // Verificar que el usuario existe
    const user = await User.findOne({
      where: { user_id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Solo supervisores/admins o el propio usuario pueden ver sus tareas
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    // Construir filtros dinámicos
    const whereClause = {
      userId: userId,
      companyId: req.user.companyId
    };

    // Filtrar por status
    if (status) {
      whereClause.status = status;
    }

    // Filtrar por priority
    if (priority) {
      whereClause.priority = priority;
    }

    // Excluir completadas por defecto
    if (!includeCompleted || includeCompleted === 'false') {
      whereClause.status = { [require('sequelize').Op.ne]: 'completada' };
    }

    const tasks = await UserAssignedTask.findAll({
      where: whereClause,
      include: [
        {
          model: CompanyTask,
          as: 'task',
          attributes: ['id', 'taskName', 'taskDescription', 'taskCategory', 'estimatedHours']
        }
      ],
      order: [['assignedDate', 'DESC']]
    });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });

  } catch (error) {
    console.error('Error obteniendo tareas asignadas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/users/:userId/assigned-tasks/:taskId
 * @desc Obtener una tarea asignada específica
 * @access Private
 */
router.get('/:userId/assigned-tasks/:taskId', auth, async (req, res) => {
  try {
    const { userId, taskId } = req.params;

    // Solo supervisores/admins o el propio usuario pueden ver sus tareas
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    const task = await UserAssignedTask.findOne({
      where: {
        id: taskId,
        userId: userId,
        companyId: req.user.companyId
      },
      include: [
        {
          model: CompanyTask,
          as: 'task'
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        error: 'Tarea asignada no encontrada'
      });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('Error obteniendo tarea asignada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:userId/assigned-tasks
 * @desc Asignar nueva tarea a un usuario
 * @access Private (supervisorOrAdmin)
 */
router.post('/:userId/assigned-tasks', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      taskId,
      dueDate,
      priority,
      status,
      requiresApproval,
      notes
    } = req.body;

    // Verificar que el usuario existe
    const user = await User.findOne({
      where: { user_id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Validaciones básicas
    if (!taskId) {
      return res.status(400).json({
        error: 'El ID de la tarea es obligatorio'
      });
    }

    // Verificar que la tarea existe y pertenece a la empresa
    const companyTask = await CompanyTask.findOne({
      where: {
        id: taskId,
        companyId: req.user.companyId,
        isActive: true
      }
    });

    if (!companyTask) {
      return res.status(404).json({
        error: 'Tarea del catálogo no encontrada o inactiva'
      });
    }

    // Validar status si viene
    if (status && !['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada'].includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido. Debe ser: pendiente, en_progreso, completada, cancelada o pausada'
      });
    }

    // Validar priority si viene
    if (priority && !['baja', 'media', 'alta', 'urgente'].includes(priority)) {
      return res.status(400).json({
        error: 'Prioridad inválida. Debe ser: baja, media, alta o urgente'
      });
    }

    // Crear nueva asignación de tarea
    const newAssignedTask = await UserAssignedTask.create({
      userId: userId,
      companyId: req.user.companyId,
      taskId: taskId,
      assignedBy: req.user.user_id,
      assignedDate: new Date(),
      dueDate,
      status: status || 'pendiente',
      priority: priority || companyTask.priorityDefault,
      progressPercentage: 0,
      requiresApproval: requiresApproval !== undefined ? requiresApproval : companyTask.requiresApproval,
      notes,
      attachments: [],
      comments: []
    });

    console.log(`✅ [ASSIGNED-TASK] Tarea ${taskId} asignada a usuario ${userId} por ${req.user.user_id}`);

    res.status(201).json({
      success: true,
      message: 'Tarea asignada exitosamente',
      data: newAssignedTask
    });

  } catch (error) {
    console.error('Error asignando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:userId/assigned-tasks/:taskId
 * @desc Actualizar tarea asignada
 * @access Private (supervisorOrAdmin o el propio usuario para campos limitados)
 */
router.put('/:userId/assigned-tasks/:taskId', auth, async (req, res) => {
  try {
    const { userId, taskId } = req.params;

    const task = await UserAssignedTask.findOne({
      where: {
        id: taskId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!task) {
      return res.status(404).json({
        error: 'Tarea asignada no encontrada'
      });
    }

    const updateData = { ...req.body };

    // Si es el propio usuario, solo puede actualizar campos limitados
    if (req.user.user_id === userId && req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      // Campos que el usuario puede actualizar
      const allowedFields = ['notes', 'progressPercentage', 'actualHours', 'attachments', 'comments'];
      const requestedFields = Object.keys(updateData);

      const unauthorizedFields = requestedFields.filter(field => !allowedFields.includes(field));

      if (unauthorizedFields.length > 0) {
        return res.status(403).json({
          error: `No tiene permisos para actualizar los campos: ${unauthorizedFields.join(', ')}`
        });
      }

      // Si actualiza progreso a 100%, marcar como enviado para aprobación si requiere aprobación
      if (updateData.progressPercentage === 100 && task.requiresApproval && !task.submittedForApproval) {
        updateData.submittedForApproval = true;
        updateData.status = 'en_progreso'; // No cambiar a completada hasta que se apruebe
      }
    }

    // Validaciones
    if (updateData.status && !['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada'].includes(updateData.status)) {
      return res.status(400).json({
        error: 'Estado inválido'
      });
    }

    if (updateData.priority && !['baja', 'media', 'alta', 'urgente'].includes(updateData.priority)) {
      return res.status(400).json({
        error: 'Prioridad inválida'
      });
    }

    if (updateData.progressPercentage !== undefined) {
      const progress = parseInt(updateData.progressPercentage);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        return res.status(400).json({
          error: 'El progreso debe ser un número entre 0 y 100'
        });
      }
    }

    // Si se completa la tarea, registrar fecha de finalización
    if (updateData.status === 'completada' && !task.completionDate) {
      updateData.completionDate = new Date();
      updateData.progressPercentage = 100;
    }

    // Si se inicia la tarea, registrar fecha de inicio
    if (updateData.status === 'en_progreso' && !task.startDate) {
      updateData.startDate = new Date();
    }

    // No permitir cambiar campos críticos
    delete updateData.userId;
    delete updateData.companyId;
    delete updateData.taskId;
    delete updateData.assignedBy;
    delete updateData.assignedDate;

    await task.update(updateData);

    console.log(`✅ [ASSIGNED-TASK] Tarea asignada ${taskId} actualizada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Tarea asignada actualizada exitosamente',
      data: task
    });

  } catch (error) {
    console.error('Error actualizando tarea asignada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:userId/assigned-tasks/:taskId/approve
 * @desc Aprobar una tarea completada
 * @access Private (supervisorOrAdmin)
 */
router.put('/:userId/assigned-tasks/:taskId/approve', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const { approvalNotes } = req.body;

    const task = await UserAssignedTask.findOne({
      where: {
        id: taskId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!task) {
      return res.status(404).json({
        error: 'Tarea asignada no encontrada'
      });
    }

    if (!task.requiresApproval) {
      return res.status(400).json({
        error: 'Esta tarea no requiere aprobación'
      });
    }

    if (!task.submittedForApproval) {
      return res.status(400).json({
        error: 'La tarea no ha sido enviada para aprobación'
      });
    }

    // Aprobar tarea
    await task.update({
      status: 'completada',
      approvalDate: new Date(),
      approvedBy: req.user.user_id,
      approvalNotes,
      completionDate: new Date(),
      progressPercentage: 100
    });

    console.log(`✅ [ASSIGNED-TASK] Tarea ${taskId} aprobada por ${req.user.user_id}`);

    res.json({
      success: true,
      message: 'Tarea aprobada exitosamente',
      data: task
    });

  } catch (error) {
    console.error('Error aprobando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/users/:userId/assigned-tasks/:taskId
 * @desc Cancelar tarea asignada
 * @access Private (supervisorOrAdmin)
 */
router.delete('/:userId/assigned-tasks/:taskId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, taskId } = req.params;

    const task = await UserAssignedTask.findOne({
      where: {
        id: taskId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!task) {
      return res.status(404).json({
        error: 'Tarea asignada no encontrada'
      });
    }

    // Cambiar estado a cancelada en lugar de eliminar
    await task.update({ status: 'cancelada' });

    console.log(`✅ [ASSIGNED-TASK] Tarea ${taskId} cancelada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Tarea cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error cancelando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
