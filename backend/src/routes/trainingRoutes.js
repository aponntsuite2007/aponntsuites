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
