const express = require('express');
const router = express.Router();
const { CompanyTask, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/companies/:companyId/tasks
 * @desc Obtener todas las tareas del catálogo de una empresa
 * @access Private (supervisorOrAdmin)
 */
router.get('/:companyId/tasks', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { includeInactive, category, type, isTemplate } = req.query;

    // Verificar que el usuario pertenece a la empresa
    if (req.user.companyId !== parseInt(companyId)) {
      return res.status(403).json({
        error: 'No tiene permisos para acceder a las tareas de esta empresa'
      });
    }

    // Construir filtros dinámicos
    const whereClause = {
      companyId: companyId
    };

    // Filtrar por estado activo/inactivo
    if (!includeInactive || includeInactive === 'false') {
      whereClause.isActive = true;
    }

    // Filtrar por categoría
    if (category) {
      whereClause.taskCategory = category;
    }

    // Filtrar por tipo
    if (type) {
      whereClause.taskType = type;
    }

    // Filtrar por plantillas
    if (isTemplate) {
      whereClause.isTemplate = isTemplate === 'true';
    }

    const tasks = await CompanyTask.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });

  } catch (error) {
    console.error('Error obteniendo tareas de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/companies/:companyId/tasks/:taskId
 * @desc Obtener una tarea específica del catálogo
 * @access Private (supervisorOrAdmin)
 */
router.get('/:companyId/tasks/:taskId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { companyId, taskId } = req.params;

    // Verificar que el usuario pertenece a la empresa
    if (req.user.companyId !== parseInt(companyId)) {
      return res.status(403).json({
        error: 'No tiene permisos para acceder a las tareas de esta empresa'
      });
    }

    const task = await CompanyTask.findOne({
      where: {
        id: taskId,
        companyId: companyId
      }
    });

    if (!task) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    console.error('Error obteniendo tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/companies/:companyId/tasks
 * @desc Crear nueva tarea en el catálogo de la empresa
 * @access Private (supervisorOrAdmin)
 */
router.post('/:companyId/tasks', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      taskName,
      taskDescription,
      taskCode,
      taskCategory,
      taskType,
      estimatedHours,
      priorityDefault,
      requiresApproval,
      approvalRole,
      isTemplate
    } = req.body;

    // Verificar que el usuario pertenece a la empresa
    if (req.user.companyId !== parseInt(companyId)) {
      return res.status(403).json({
        error: 'No tiene permisos para crear tareas en esta empresa'
      });
    }

    // Validaciones básicas
    if (!taskName || taskName.trim() === '') {
      return res.status(400).json({
        error: 'El nombre de la tarea es obligatorio'
      });
    }

    // Validar priorityDefault si viene
    if (priorityDefault && !['baja', 'media', 'alta', 'urgente'].includes(priorityDefault)) {
      return res.status(400).json({
        error: 'Prioridad inválida. Debe ser: baja, media, alta o urgente'
      });
    }

    // Validar estimatedHours si viene
    if (estimatedHours !== undefined && (isNaN(estimatedHours) || estimatedHours < 0)) {
      return res.status(400).json({
        error: 'Las horas estimadas deben ser un número positivo'
      });
    }

    // Verificar si ya existe una tarea con el mismo código (si se proporciona)
    if (taskCode) {
      const existingTask = await CompanyTask.findOne({
        where: {
          companyId: companyId,
          taskCode: taskCode,
          isActive: true
        }
      });

      if (existingTask) {
        return res.status(400).json({
          error: `Ya existe una tarea activa con el código ${taskCode}`
        });
      }
    }

    // Crear nueva tarea
    const newTask = await CompanyTask.create({
      companyId: companyId,
      taskName: taskName.trim(),
      taskDescription,
      taskCode,
      taskCategory,
      taskType,
      estimatedHours,
      priorityDefault,
      requiresApproval: requiresApproval || false,
      approvalRole,
      isTemplate: isTemplate || false,
      isActive: true,
      createdBy: req.user.user_id
    });

    console.log(`✅ [COMPANY-TASK] Tarea creada para empresa ${companyId} - ${taskName}`);

    res.status(201).json({
      success: true,
      message: 'Tarea creada exitosamente',
      data: newTask
    });

  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/companies/:companyId/tasks/:taskId
 * @desc Actualizar tarea del catálogo
 * @access Private (supervisorOrAdmin)
 */
router.put('/:companyId/tasks/:taskId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { companyId, taskId } = req.params;

    // Verificar que el usuario pertenece a la empresa
    if (req.user.companyId !== parseInt(companyId)) {
      return res.status(403).json({
        error: 'No tiene permisos para actualizar tareas de esta empresa'
      });
    }

    const task = await CompanyTask.findOne({
      where: {
        id: taskId,
        companyId: companyId
      }
    });

    if (!task) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    const updateData = { ...req.body };

    // Validar priorityDefault si viene en el update
    if (updateData.priorityDefault && !['baja', 'media', 'alta', 'urgente'].includes(updateData.priorityDefault)) {
      return res.status(400).json({
        error: 'Prioridad inválida'
      });
    }

    // Validar estimatedHours si viene en el update
    if (updateData.estimatedHours !== undefined && (isNaN(updateData.estimatedHours) || updateData.estimatedHours < 0)) {
      return res.status(400).json({
        error: 'Las horas estimadas deben ser un número positivo'
      });
    }

    // Verificar código duplicado si se está cambiando
    if (updateData.taskCode && updateData.taskCode !== task.taskCode) {
      const existingTask = await CompanyTask.findOne({
        where: {
          companyId: companyId,
          taskCode: updateData.taskCode,
          isActive: true,
          id: { [require('sequelize').Op.ne]: taskId }
        }
      });

      if (existingTask) {
        return res.status(400).json({
          error: `Ya existe otra tarea activa con el código ${updateData.taskCode}`
        });
      }
    }

    // No permitir cambiar companyId ni createdBy
    delete updateData.companyId;
    delete updateData.createdBy;

    await task.update(updateData);

    console.log(`✅ [COMPANY-TASK] Tarea ${taskId} actualizada para empresa ${companyId}`);

    res.json({
      success: true,
      message: 'Tarea actualizada exitosamente',
      data: task
    });

  } catch (error) {
    console.error('Error actualizando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/companies/:companyId/tasks/:taskId
 * @desc Eliminar (soft delete) tarea del catálogo
 * @access Private (supervisorOrAdmin)
 */
router.delete('/:companyId/tasks/:taskId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { companyId, taskId } = req.params;

    // Verificar que el usuario pertenece a la empresa
    if (req.user.companyId !== parseInt(companyId)) {
      return res.status(403).json({
        error: 'No tiene permisos para eliminar tareas de esta empresa'
      });
    }

    const task = await CompanyTask.findOne({
      where: {
        id: taskId,
        companyId: companyId
      }
    });

    if (!task) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    // Soft delete: marcar como inactiva
    await task.update({ isActive: false });

    console.log(`✅ [COMPANY-TASK] Tarea ${taskId} desactivada para empresa ${companyId}`);

    res.json({
      success: true,
      message: 'Tarea desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
