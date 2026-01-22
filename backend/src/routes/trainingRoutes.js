const express = require('express');
const router = express.Router();
const { Training, TrainingAssignment, TrainingProgress, User } = require('../config/database');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');

// Integración NCE - Notificaciones
const TrainingNotifications = require('../services/integrations/training-notifications');

// Helper: Transformar training al formato del frontend
function formatTraining(training) {
  const data = training.toJSON ? training.toJSON() : training;
  return {
    id: data.id,
    companyId: data.company_id,
    title: data.title,
    category: data.category,
    description: data.description,
    type: data.type,
    contentUrl: data.content_url,
    duration: parseFloat(data.duration),
    startDate: data.start_date,
    deadline: data.deadline,
    instructor: data.instructor,
    maxScore: data.max_score,
    minScore: data.min_score,
    attempts: data.attempts,
    mandatory: data.mandatory,
    certificate: data.certificate,
    status: data.status,
    participants: data.participants,
    completed: data.completed,
    progress: data.progress,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * @route GET /api/v1/trainings
 * @desc Obtener todas las capacitaciones de la empresa
 */
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const { status, category } = req.query;

    console.log(`📚 [TRAININGS] Obteniendo capacitaciones para empresa ${companyId}`);

    const where = { company_id: companyId };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const trainings = await Training.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ [TRAININGS] Encontradas ${trainings.length} capacitaciones`);

    res.json({
      success: true,
      trainings: trainings.map(formatTraining),
      count: trainings.length
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error obteniendo capacitaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/trainings/:id
 * @desc Obtener capacitación específica
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;

    const training = await Training.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Capacitación no encontrada'
      });
    }

    res.json({
      success: true,
      training: formatTraining(training)
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error obteniendo capacitación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/trainings
 * @desc Crear nueva capacitación
 */
router.post('/', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;

    console.log(`📚 [TRAININGS] Creando nueva capacitación para empresa ${companyId}`);

    const trainingData = {
      company_id: companyId,
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      type: req.body.type,
      content_url: req.body.contentUrl,
      duration: req.body.duration || 1,
      start_date: req.body.startDate,
      deadline: req.body.deadline,
      instructor: req.body.instructor,
      max_score: req.body.maxScore || 100,
      min_score: req.body.minScore || 70,
      attempts: req.body.attempts || 2,
      mandatory: req.body.mandatory || false,
      certificate: req.body.certificate || false,
      status: req.body.status || 'active'
    };

    const training = await Training.create(trainingData);

    console.log(`✅ [TRAININGS] Capacitación creada con ID: ${training.id}`);

    res.status(201).json({
      success: true,
      message: 'Capacitación creada exitosamente',
      training: formatTraining(training)
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error creando capacitación:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando capacitación',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/trainings/:id
 * @desc Actualizar capacitación
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;

    const training = await Training.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Capacitación no encontrada'
      });
    }

    const updateData = {
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      type: req.body.type,
      content_url: req.body.contentUrl,
      duration: req.body.duration,
      start_date: req.body.startDate,
      deadline: req.body.deadline,
      instructor: req.body.instructor,
      max_score: req.body.maxScore,
      min_score: req.body.minScore,
      attempts: req.body.attempts,
      mandatory: req.body.mandatory,
      certificate: req.body.certificate,
      status: req.body.status
    };

    // Eliminar campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await training.update(updateData);

    console.log(`✅ [TRAININGS] Capacitación ${training.id} actualizada`);

    res.json({
      success: true,
      message: 'Capacitación actualizada exitosamente',
      training: formatTraining(training)
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error actualizando capacitación:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando capacitación',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/trainings/:id
 * @desc Eliminar capacitación
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;

    const training = await Training.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Capacitación no encontrada'
      });
    }

    await training.destroy();

    console.log(`✅ [TRAININGS] Capacitación ${req.params.id} eliminada`);

    res.json({
      success: true,
      message: 'Capacitación eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error eliminando capacitación:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando capacitación',
      message: error.message
    });
  }
});

// ============================================================================
// ENDPOINTS DE ASIGNACIÓN (NUEVOS - 2026-01-21)
// ============================================================================

/**
 * @route GET /api/v1/trainings/:id/assignments
 * @desc Ver usuarios asignados a una capacitación
 */
router.get('/:id/assignments', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const trainingId = req.params.id;

    const assignments = await TrainingAssignment.findAll({
      where: {
        training_id: trainingId,
        company_id: companyId
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['user_id', 'firstName', 'lastName', 'email', 'position']
      }],
      order: [['assigned_at', 'DESC']]
    });

    res.json({
      success: true,
      assignments: assignments.map(a => ({
        id: a.id,
        userId: a.user_id,
        userName: a.user ? `${a.user.firstName} ${a.user.lastName}` : 'N/A',
        userEmail: a.user?.email,
        userPosition: a.user?.position,
        assignedAt: a.assigned_at,
        dueDate: a.due_date,
        status: a.status,
        priority: a.priority,
        completedAt: a.completed_at
      })),
      count: assignments.length
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error obteniendo asignaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo asignaciones',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/trainings/:id/assign
 * @desc Asignar usuarios a una capacitación
 */
router.post('/:id/assign', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const trainingId = req.params.id;
    const { userIds, dueDate, priority, notes } = req.body;

    // Verificar que el training existe
    const training = await Training.findOne({
      where: { id: trainingId, company_id: companyId }
    });

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Capacitación no encontrada'
      });
    }

    const userIdList = Array.isArray(userIds) ? userIds : [userIds];
    const created = [];
    const existing = [];

    for (const userId of userIdList) {
      try {
        const [assignment, wasCreated] = await TrainingAssignment.findOrCreate({
          where: {
            training_id: trainingId,
            user_id: userId,
            company_id: companyId
          },
          defaults: {
            assigned_by: req.user?.user_id,
            assigned_at: new Date(),
            due_date: dueDate || training.deadline,
            priority: priority || 'normal',
            notes: notes,
            status: 'assigned'
          }
        });

        if (wasCreated) {
          created.push(userId);
          // Enviar notificación NCE
          try {
            await TrainingNotifications.notifyTrainingAssigned(
              userId,
              training,
              dueDate || training.deadline,
              companyId
            );
          } catch (notifError) {
            console.warn('⚠️ [NCE] Error enviando notificación:', notifError.message);
          }
        } else {
          existing.push(userId);
        }
      } catch (err) {
        console.warn(`⚠️ [TRAININGS] Error asignando usuario ${userId}:`, err.message);
      }
    }

    console.log(`✅ [TRAININGS] Asignados ${created.length} usuarios a training ${trainingId}`);

    res.json({
      success: true,
      message: `${created.length} usuario(s) asignado(s)`,
      created: created.length,
      existing: existing.length,
      createdUserIds: created,
      existingUserIds: existing
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error asignando usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error asignando usuarios',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/trainings/:id/unassign/:userId
 * @desc Desasignar usuario de una capacitación
 */
router.delete('/:id/unassign/:userId', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const { id: trainingId, userId } = req.params;

    const deleted = await TrainingAssignment.destroy({
      where: {
        training_id: trainingId,
        user_id: userId,
        company_id: companyId
      }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        error: 'Asignación no encontrada'
      });
    }

    console.log(`✅ [TRAININGS] Usuario ${userId} desasignado de training ${trainingId}`);

    res.json({
      success: true,
      message: 'Usuario desasignado exitosamente'
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error desasignando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error desasignando usuario',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/trainings/my-assignments
 * @desc Obtener mis capacitaciones asignadas (para empleados)
 */
router.get('/my-assignments', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const assignments = await TrainingAssignment.findAll({
      where: {
        user_id: userId,
        company_id: companyId
      },
      include: [{
        model: Training,
        as: 'training',
        attributes: ['id', 'title', 'category', 'description', 'type', 'duration', 'deadline', 'mandatory', 'certificate']
      }],
      order: [
        ['status', 'ASC'], // assigned primero
        ['due_date', 'ASC'] // próximas fechas primero
      ]
    });

    // Obtener progreso para cada assignment
    const assignmentsWithProgress = await Promise.all(assignments.map(async (a) => {
      const progress = await TrainingProgress.findOne({
        where: { assignment_id: a.id },
        order: [['attempt_number', 'DESC']]
      });

      return {
        id: a.id,
        trainingId: a.training_id,
        training: a.training ? {
          id: a.training.id,
          title: a.training.title,
          category: a.training.category,
          description: a.training.description,
          type: a.training.type,
          duration: a.training.duration,
          deadline: a.training.deadline,
          mandatory: a.training.mandatory,
          hasCertificate: a.training.certificate
        } : null,
        assignedAt: a.assigned_at,
        dueDate: a.due_date,
        status: a.status,
        priority: a.priority,
        completedAt: a.completed_at,
        progress: progress ? {
          attemptNumber: progress.attempt_number,
          score: progress.score,
          passed: progress.passed,
          startedAt: progress.started_at,
          completedAt: progress.completed_at,
          certificateUrl: progress.certificate_url
        } : null
      };
    }));

    res.json({
      success: true,
      assignments: assignmentsWithProgress,
      count: assignments.length,
      pending: assignments.filter(a => a.status === 'assigned').length,
      inProgress: assignments.filter(a => a.status === 'in_progress').length,
      completed: assignments.filter(a => a.status === 'completed').length
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error obteniendo mis asignaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo asignaciones',
      message: error.message
    });
  }
});

// ============================================================================
// ENDPOINTS DE PROGRESO (NUEVOS - 2026-01-21)
// ============================================================================

/**
 * @route POST /api/v1/trainings/:id/progress
 * @desc Registrar progreso en una capacitación
 */
router.post('/:id/progress', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const userId = req.user?.user_id;
    const trainingId = req.params.id;
    const { score, answers, attemptNumber } = req.body;

    // Buscar la asignación
    const assignment = await TrainingAssignment.findOne({
      where: {
        training_id: trainingId,
        user_id: userId,
        company_id: companyId
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'No estás asignado a esta capacitación'
      });
    }

    // Obtener el training para validar score
    const training = await Training.findByPk(trainingId);
    const minScore = training?.min_score || 70;
    const passed = score >= minScore;

    // Crear registro de progreso
    const progress = await TrainingProgress.create({
      company_id: companyId,
      assignment_id: assignment.id,
      attempt_number: attemptNumber || 1,
      score: score,
      passed: passed,
      answers: answers,
      started_at: new Date(),
      completed_at: score !== undefined ? new Date() : null
    });

    // Actualizar status de la asignación
    if (passed) {
      await assignment.update({
        status: 'completed',
        completed_at: new Date()
      });

      // Notificar completado
      try {
        await TrainingNotifications.notifyTrainingCompleted(
          userId,
          training,
          score,
          companyId
        );
      } catch (notifError) {
        console.warn('⚠️ [NCE] Error enviando notificación:', notifError.message);
      }
    } else {
      await assignment.update({ status: 'in_progress' });
    }

    console.log(`✅ [TRAININGS] Progreso registrado para usuario ${userId} en training ${trainingId}: ${score} (${passed ? 'APROBADO' : 'REPROBADO'})`);

    res.json({
      success: true,
      message: passed ? 'Capacitación completada exitosamente' : 'Progreso registrado',
      progress: {
        id: progress.id,
        attemptNumber: progress.attempt_number,
        score: progress.score,
        passed: progress.passed,
        minScoreRequired: minScore,
        startedAt: progress.started_at,
        completedAt: progress.completed_at
      }
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error registrando progreso:', error);
    res.status(500).json({
      success: false,
      error: 'Error registrando progreso',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/trainings/:id/my-progress
 * @desc Obtener mi progreso en una capacitación
 */
router.get('/:id/my-progress', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const userId = req.user?.user_id;
    const trainingId = req.params.id;

    const assignment = await TrainingAssignment.findOne({
      where: {
        training_id: trainingId,
        user_id: userId,
        company_id: companyId
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'No estás asignado a esta capacitación'
      });
    }

    const progressRecords = await TrainingProgress.findAll({
      where: { assignment_id: assignment.id },
      order: [['attempt_number', 'DESC']]
    });

    const training = await Training.findByPk(trainingId);

    res.json({
      success: true,
      training: training ? formatTraining(training) : null,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assignedAt: assignment.assigned_at,
        dueDate: assignment.due_date,
        completedAt: assignment.completed_at
      },
      attempts: progressRecords.map(p => ({
        id: p.id,
        attemptNumber: p.attempt_number,
        score: p.score,
        passed: p.passed,
        startedAt: p.started_at,
        completedAt: p.completed_at,
        certificateUrl: p.certificate_url
      })),
      totalAttempts: progressRecords.length,
      bestScore: progressRecords.length > 0 ? Math.max(...progressRecords.map(p => p.score || 0)) : 0,
      hasPassed: progressRecords.some(p => p.passed)
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error obteniendo progreso:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo progreso',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/trainings/:id/complete
 * @desc Marcar capacitación como completada manualmente
 */
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const userId = req.user?.user_id;
    const trainingId = req.params.id;
    const { feedback } = req.body;

    const assignment = await TrainingAssignment.findOne({
      where: {
        training_id: trainingId,
        user_id: userId,
        company_id: companyId
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'No estás asignado a esta capacitación'
      });
    }

    // Marcar como completado
    await assignment.update({
      status: 'completed',
      completed_at: new Date()
    });

    // Crear/actualizar progreso si no existe
    const [progress] = await TrainingProgress.findOrCreate({
      where: { assignment_id: assignment.id },
      defaults: {
        company_id: companyId,
        attempt_number: 1,
        passed: true,
        started_at: assignment.assigned_at,
        completed_at: new Date(),
        student_feedback: feedback
      }
    });

    if (!progress.passed) {
      await progress.update({
        passed: true,
        completed_at: new Date(),
        student_feedback: feedback
      });
    }

    // Notificar
    const training = await Training.findByPk(trainingId);
    try {
      await TrainingNotifications.notifyTrainingCompleted(
        userId,
        training,
        100,
        companyId
      );
    } catch (notifError) {
      console.warn('⚠️ [NCE] Error enviando notificación:', notifError.message);
    }

    console.log(`✅ [TRAININGS] Training ${trainingId} marcado como completado por usuario ${userId}`);

    res.json({
      success: true,
      message: 'Capacitación marcada como completada'
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error completando capacitación:', error);
    res.status(500).json({
      success: false,
      error: 'Error completando capacitación',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/trainings/:id/certificate
 * @desc Obtener certificado de capacitación
 */
router.get('/:id/certificate', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;
    const userId = req.user?.user_id;
    const trainingId = req.params.id;

    const assignment = await TrainingAssignment.findOne({
      where: {
        training_id: trainingId,
        user_id: userId,
        company_id: companyId,
        status: 'completed'
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'No has completado esta capacitación'
      });
    }

    const progress = await TrainingProgress.findOne({
      where: {
        assignment_id: assignment.id,
        passed: true
      },
      order: [['completed_at', 'DESC']]
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'No has aprobado esta capacitación'
      });
    }

    const training = await Training.findByPk(trainingId);

    // Si ya tiene certificado, retornarlo
    if (progress.certificate_url) {
      return res.json({
        success: true,
        certificate: {
          url: progress.certificate_url,
          issuedAt: progress.certificate_issued_at,
          trainingTitle: training?.title,
          score: progress.score,
          completedAt: progress.completed_at
        }
      });
    }

    // Generar URL de certificado (placeholder - puede integrarse con DMS)
    const certificateUrl = `/api/v1/trainings/${trainingId}/certificate/download?user=${userId}&progress=${progress.id}`;

    await progress.update({
      certificate_url: certificateUrl,
      certificate_issued_at: new Date()
    });

    res.json({
      success: true,
      certificate: {
        url: certificateUrl,
        issuedAt: new Date(),
        trainingTitle: training?.title,
        score: progress.score,
        completedAt: progress.completed_at
      },
      message: 'Certificado generado exitosamente'
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error obteniendo certificado:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo certificado',
      message: error.message
    });
  }
});

// ============================================================================
// ENDPOINTS DE ESTADÍSTICAS
// ============================================================================

/**
 * @route GET /api/v1/trainings/stats/dashboard
 * @desc Obtener estadísticas de capacitaciones para dashboard
 */
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 11;

    const [
      totalTrainings,
      activeTrainings,
      totalAssignments,
      completedAssignments
    ] = await Promise.all([
      Training.count({ where: { company_id: companyId } }),
      Training.count({ where: { company_id: companyId, status: 'active' } }),
      TrainingAssignment.count({ where: { company_id: companyId } }),
      TrainingAssignment.count({ where: { company_id: companyId, status: 'completed' } })
    ]);

    const completionRate = totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        totalTrainings,
        activeTrainings,
        totalAssignments,
        completedAssignments,
        completionRate
      }
    });

  } catch (error) {
    console.error('❌ [TRAININGS] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

module.exports = router;
