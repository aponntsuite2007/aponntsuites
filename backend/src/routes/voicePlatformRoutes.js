/**
 * ============================================================================
 * VOICE PLATFORM - API ROUTES
 * ============================================================================
 *
 * API REST completa para Employee Voice Platform
 *
 * @version 1.0.0
 * @date 2025-12-22
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const VoiceDeduplicationService = require('../services/VoiceDeduplicationService');
const VoiceGamificationService = require('../services/VoiceGamificationService');

const {
  EmployeeExperience,
  ExperienceCluster,
  ExperienceVote,
  ExperienceComment,
  ExperienceRecognition,
  User,
  Company,
  Department,
  sequelize
} = require('../config/database');

const { Op, QueryTypes } = require('sequelize');

/**
 * Middleware para verificar acceso a Voice Platform
 */
const checkVoiceAccess = async (req, res, next) => {
  try {
    // Verificar que la empresa tenga el módulo voice-platform activo
    // (por ahora, permitir acceso a todos los autenticados)
    next();
  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error verificando acceso:', error.message);
    return res.status(500).json({ success: false, error: 'Error verificando acceso' });
  }
};

// ============================================================================
// EXPERIENCES - CRUD
// ============================================================================

/**
 * POST /api/voice-platform/experiences
 * Crear nueva experiencia/sugerencia
 */
router.post('/experiences', auth, checkVoiceAccess, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;

    const {
      title,
      description,
      type,              // SUGGESTION, PROBLEM, SOLUTION
      area,              // PRODUCTION, ADMINISTRATION, DOCUMENTATION, etc.
      priority,          // LOW, MEDIUM, HIGH
      visibility,        // ANONYMOUS, ADMIN_ONLY, PUBLIC
      estimated_savings
    } = req.body;

    // Validaciones básicas
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Título y descripción son requeridos'
      });
    }

    // Crear experiencia
    const experience = await EmployeeExperience.create({
      company_id: companyId,
      employee_id: visibility === 'ANONYMOUS' ? null : userId,
      title,
      description,
      type: type || 'SUGGESTION',
      area,
      priority: priority || 'MEDIUM',
      visibility: visibility || 'ADMIN_ONLY',
      estimated_savings,
      status: 'PENDING'
    });

    console.log(`✅ [VOICE-PLATFORM] Nueva experiencia creada: ${experience.id}`);

    // Procesar en background (NLP + deduplicación + gamificación)
    setImmediate(async () => {
      try {
        // 1. Procesar con NLP (embeddings, sentiment, clustering)
        await VoiceDeduplicationService.processNewExperience(experience);

        // 2. Otorgar puntos al usuario (si no es anónimo)
        if (experience.employee_id) {
          await VoiceGamificationService.awardPoints(
            experience.employee_id,
            companyId,
            type === 'SUGGESTION' ? 'SUBMIT_SUGGESTION' :
            type === 'PROBLEM' ? 'SUBMIT_PROBLEM' : 'SUBMIT_SOLUTION'
          );
        }

        console.log(`   ✅ Procesamiento NLP completado para experiencia ${experience.id}`);
      } catch (error) {
        console.error(`   ❌ Error en procesamiento background:`, error.message);
      }
    });

    return res.status(201).json({
      success: true,
      experience: {
        id: experience.id,
        title: experience.title,
        type: experience.type,
        status: experience.status,
        created_at: experience.created_at
      },
      message: 'Experiencia creada. Procesando análisis semántico...'
    });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error creando experiencia:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice-platform/experiences
 * Listar experiencias (con filtros)
 */
router.get('/experiences', auth, checkVoiceAccess, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    const {
      status,
      type,
      area,
      visibility,
      cluster_id,
      limit = 50,
      offset = 0
    } = req.query;

    // Construir filtros
    const where = { company_id: companyId };

    if (status) where.status = status;
    if (type) where.type = type;
    if (area) where.area = area;
    if (cluster_id) where.cluster_id = cluster_id;

    // Filtro de visibilidad
    if (!isAdmin) {
      where[Op.or] = [
        { visibility: 'PUBLIC' },
        { employee_id: userId }
      ];
    } else if (visibility) {
      where.visibility = visibility;
    }

    const experiences = await EmployeeExperience.findAll({
      attributes: { exclude: ['embedding', 'topics'] },
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['user_id', 'display_name', 'usuario', 'email']
        },
        {
          model: ExperienceCluster,
          as: 'cluster',
          attributes: ['id', 'name', 'member_count']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Sanitizar según visibilidad
    const sanitizedExperiences = experiences.map(exp => {
      const data = exp.toJSON();

      // Si no es admin y la experiencia no es pública, ocultar autor
      if (!isAdmin && data.visibility !== 'PUBLIC' && data.employee_id !== userId) {
        delete data.employee;
        delete data.employee_id;
      }

      return data;
    });

    return res.json({
      success: true,
      experiences: sanitizedExperiences,
      total: sanitizedExperiences.length
    });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error listando experiencias:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice-platform/experiences/:id
 * Ver detalle de experiencia
 */
router.get('/experiences/:id', auth, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    const experience = await EmployeeExperience.findOne({
      where: { id, company_id: req.user.company_id },
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['user_id', 'display_name', 'usuario', 'email']
        },
        {
          model: ExperienceCluster,
          as: 'cluster',
          attributes: ['id', 'name', 'member_count']
        }
      ]
    });

    if (!experience) {
      return res.status(404).json({ success: false, error: 'Experiencia no encontrada' });
    }

    const data = experience.toJSON();

    // Verificar permiso de visualización
    if (!isAdmin && data.visibility !== 'PUBLIC' && data.employee_id !== userId) {
      if (data.visibility === 'ADMIN_ONLY') {
        return res.status(403).json({ success: false, error: 'Acceso denegado' });
      }
      delete data.employee;
      delete data.employee_id;
    }

    return res.json({ success: true, experience: data });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error obteniendo experiencia:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/voice-platform/experiences/:id/status
 * Cambiar estado de experiencia (solo admin)
 */
router.patch('/experiences/:id/status', auth, adminOnly, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, implementation_notes, actual_savings } = req.body;

    const experience = await EmployeeExperience.findOne({
      where: { id, company_id: req.user.company_id }
    });

    if (!experience) {
      return res.status(404).json({ success: false, error: 'Experiencia no encontrada' });
    }

    // Actualizar estado
    experience.status = status;
    if (implementation_notes) experience.implementation_notes = implementation_notes;
    if (actual_savings) experience.actual_savings = actual_savings;

    // Si se implementa, marcar fecha y otorgar reconocimiento
    if (status === 'IMPLEMENTED') {
      experience.implementation_complete_date = new Date();

      // Otorgar reconocimiento al autor y miembros del cluster
      if (experience.employee_id) {
        setImmediate(async () => {
          try {
            await VoiceGamificationService.awardImplementationRecognition(
              experience,
              req.user.user_id
            );
          } catch (error) {
            console.error('❌ Error otorgando reconocimiento:', error.message);
          }
        });
      }
    }

    await experience.save();

    return res.json({
      success: true,
      experience,
      message: status === 'IMPLEMENTED' ?
        'Experiencia marcada como implementada. Reconocimiento otorgado.' :
        `Estado actualizado a ${status}`
    });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error actualizando estado:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice-platform/experiences/my
 * Mis experiencias
 */
router.get('/experiences/my', auth, checkVoiceAccess, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;

    const experiences = await EmployeeExperience.findAll({
      where: {
        company_id: companyId,
        employee_id: userId
      },
      include: [
        {
          model: ExperienceCluster,
          as: 'cluster',
          attributes: ['id', 'name', 'member_count']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.json({ success: true, experiences });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error obteniendo mis experiencias:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// VOTING SYSTEM
// ============================================================================

/**
 * POST /api/voice-platform/experiences/:id/vote
 * Votar experiencia (upvote/downvote)
 */
router.post('/experiences/:id/vote', auth, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote_type } = req.body; // 'UPVOTE' or 'DOWNVOTE'
    const userId = req.user.user_id;
    const companyId = req.user.company_id;

    if (!['UPVOTE', 'DOWNVOTE'].includes(vote_type)) {
      return res.status(400).json({ success: false, error: 'vote_type debe ser UPVOTE o DOWNVOTE' });
    }

    const experience = await EmployeeExperience.findOne({
      where: { id, company_id: companyId }
    });

    if (!experience) {
      return res.status(404).json({ success: false, error: 'Experiencia no encontrada' });
    }

    // Verificar si ya votó
    const existingVote = await ExperienceVote.findOne({
      where: { experience_id: id, user_id: userId }
    });

    if (existingVote) {
      // Si es el mismo voto, no hacer nada
      if (existingVote.vote_type === vote_type) {
        return res.json({ success: true, message: 'Ya votaste esta opción' });
      }

      // Si es voto contrario, cambiar
      existingVote.vote_type = vote_type;
      await existingVote.save();

      // Actualizar contadores
      if (vote_type === 'UPVOTE') {
        experience.upvotes += 1;
        experience.downvotes -= 1;
      } else {
        experience.downvotes += 1;
        experience.upvotes -= 1;
      }

      await experience.save();

      return res.json({ success: true, message: 'Voto actualizado' });
    }

    // Crear nuevo voto
    await ExperienceVote.create({
      experience_id: id,
      user_id: userId,
      company_id: companyId,
      vote_type
    });

    // Actualizar contador
    if (vote_type === 'UPVOTE') {
      experience.upvotes += 1;
    } else {
      experience.downvotes += 1;
    }

    await experience.save();

    // Otorgar puntos al autor de la experiencia
    if (vote_type === 'UPVOTE' && experience.employee_id) {
      setImmediate(async () => {
        await VoiceGamificationService.awardPoints(
          experience.employee_id,
          companyId,
          'UPVOTE_RECEIVED'
        );
      });
    }

    return res.json({ success: true, message: 'Voto registrado' });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error votando:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/voice-platform/experiences/:id/vote
 * Eliminar mi voto
 */
router.delete('/experiences/:id/vote', auth, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const vote = await ExperienceVote.findOne({
      where: { experience_id: id, user_id: userId }
    });

    if (!vote) {
      return res.status(404).json({ success: false, error: 'No has votado esta experiencia' });
    }

    const voteType = vote.vote_type;
    await vote.destroy();

    // Actualizar contador
    const experience = await EmployeeExperience.findByPk(id);
    if (experience) {
      if (voteType === 'UPVOTE') {
        experience.upvotes -= 1;
      } else {
        experience.downvotes -= 1;
      }
      await experience.save();
    }

    return res.json({ success: true, message: 'Voto eliminado' });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error eliminando voto:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * POST /api/voice-platform/experiences/:id/comments
 * Agregar comentario
 */
router.post('/experiences/:id/comments', auth, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_comment_id } = req.body;
    const userId = req.user.user_id;
    const companyId = req.user.company_id;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Contenido del comentario requerido' });
    }

    const comment = await ExperienceComment.create({
      experience_id: id,
      user_id: userId,
      company_id: companyId,
      content,
      parent_comment_id: parent_comment_id || null
    });

    // Incrementar contador de comentarios
    await EmployeeExperience.increment('comments_count', { where: { id } });

    return res.status(201).json({ success: true, comment });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error creando comentario:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice-platform/experiences/:id/comments
 * Listar comentarios de experiencia
 */
router.get('/experiences/:id/comments', auth, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await ExperienceComment.findAll({
      where: { experience_id: id },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['user_id', 'display_name', 'usuario']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    return res.json({ success: true, comments });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error listando comentarios:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GAMIFICATION
// ============================================================================

/**
 * GET /api/voice-platform/gamification/leaderboard
 * Obtener leaderboard
 */
router.get('/gamification/leaderboard', auth, checkVoiceAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { type = 'global', department_id, limit = 10 } = req.query;

    let leaderboard;

    if (type === 'global') {
      leaderboard = await VoiceGamificationService.getGlobalLeaderboard(companyId, parseInt(limit));
    } else if (type === 'department' && department_id) {
      leaderboard = await VoiceGamificationService.getDepartmentLeaderboard(
        companyId,
        parseInt(department_id),
        parseInt(limit)
      );
    } else if (type === 'monthly') {
      leaderboard = await VoiceGamificationService.getMonthlyLeaderboard(companyId, parseInt(limit));
    } else {
      return res.status(400).json({ success: false, error: 'Tipo de leaderboard inválido' });
    }

    return res.json({ success: true, leaderboard, type });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error obteniendo leaderboard:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice-platform/gamification/my-stats
 * Mis estadísticas de gamificación
 */
router.get('/gamification/my-stats', auth, checkVoiceAccess, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const companyId = req.user.company_id;

    const stats = await VoiceGamificationService.getUserStats(userId, companyId);

    return res.json({ success: true, stats });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error obteniendo stats:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /api/voice-platform/analytics/overview
 * Analytics general
 */
router.get('/analytics/overview', auth, adminOnly, checkVoiceAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    // TODO: Implementar analytics más complejos
    const totalExperiences = await EmployeeExperience.count({ where: { company_id: companyId } });
    const implemented = await EmployeeExperience.count({ where: { company_id: companyId, status: 'IMPLEMENTED' } });
    const pending = await EmployeeExperience.count({ where: { company_id: companyId, status: 'PENDING' } });

    return res.json({
      success: true,
      analytics: {
        total_experiences: totalExperiences,
        implemented,
        pending,
        implementation_rate: totalExperiences > 0 ? (implemented / totalExperiences * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error obteniendo analytics:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice-platform/analytics/sentiment-trends
 * Tendencias de sentiment
 */
router.get('/analytics/sentiment-trends', auth, adminOnly, checkVoiceAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    // TODO: Implementar análisis de sentiment trends
    return res.json({
      success: true,
      message: 'Sentiment trends - TODO'
    });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error obteniendo sentiment trends:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CLUSTERS
// ============================================================================

/**
 * GET /api/voice-platform/clusters
 * Listar clusters de experiencias similares
 */
router.get('/clusters', auth, adminOnly, checkVoiceAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const clusters = await ExperienceCluster.findAll({
      where: { company_id: companyId },
      order: [['member_count', 'DESC']]
    });

    return res.json({ success: true, clusters });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error listando clusters:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voice-platform/clusters/:id
 * Ver detalle de cluster con sus experiencias
 */
router.get('/clusters/:id', auth, adminOnly, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const cluster = await ExperienceCluster.findOne({
      where: { id, company_id: companyId },
      include: [
        {
          model: EmployeeExperience,
          as: 'experiences',
          include: [
            {
              model: User,
              as: 'employee',
              attributes: ['user_id', 'display_name', 'usuario']
            }
          ]
        }
      ]
    });

    if (!cluster) {
      return res.status(404).json({ success: false, error: 'Cluster no encontrado' });
    }

    return res.json({ success: true, cluster });

  } catch (error) {
    console.error('❌ [VOICE-PLATFORM] Error obteniendo cluster:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 📰 COMPANY NEWS - Noticias de la Empresa
// ============================================================================

/**
 * GET /news - Obtener noticias de la empresa
 * Filtros: type, sortBy
 */
router.get('/news', auth, checkVoiceAccess, async (req, res) => {
  try {
    const { type, sortBy = 'recent' } = req.query;
    const company_id = req.user.company_id;

    console.log(`📰 [NEWS] Obteniendo noticias - company: ${company_id}, type: ${type}, sortBy: ${sortBy}`);

    // Build where clause
    const where = {
      company_id,
      status: 'PUBLISHED'
    };

    if (type) {
      where.type = type;
    }

    // Build order clause
    let order;
    if (sortBy === 'oldest') {
      order = [['published_at', 'ASC']];
    } else {
      order = [['published_at', 'DESC']]; // recent by default
    }

    const news = await sequelize.query(`
      SELECT
        cn.id,
        cn.company_id,
        cn.title,
        cn.content,
        cn.summary,
        cn.type,
        cn.related_experience_ids,
        cn.image_url,
        cn.video_url,
        cn.published_by,
        cn.published_at,
        cn.is_published,
        u.display_name as publisher_name,
        u.usuario as publisher_username
      FROM company_news cn
      LEFT JOIN users u ON cn.published_by = u.user_id
      WHERE cn.company_id = :company_id
        AND cn.is_published = true
        ${type ? `AND cn.type = :type` : ''}
      ORDER BY cn.published_at ${sortBy === 'oldest' ? 'ASC' : 'DESC'}
      LIMIT 50
    `, {
      replacements: { company_id, type },
      type: QueryTypes.SELECT
    });

    console.log(`✅ [NEWS] ${news.length} noticias encontradas`);

    return res.json({
      success: true,
      news,
      count: news.length
    });

  } catch (error) {
    console.error('❌ [NEWS] Error obteniendo noticias:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /news/:id - Obtener detalle de una noticia con experiencias relacionadas
 */
router.get('/news/:id', auth, checkVoiceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    console.log(`📰 [NEWS] Obteniendo detalle noticia: ${id}`);

    // Get news detail
    const newsResults = await sequelize.query(`
      SELECT
        cn.id,
        cn.company_id,
        cn.title,
        cn.content,
        cn.summary,
        cn.type,
        cn.related_experience_ids,
        cn.image_url,
        cn.video_url,
        cn.published_by,
        cn.published_at,
        cn.is_published,
        u.display_name as publisher_name,
        u.usuario as publisher_username
      FROM company_news cn
      LEFT JOIN users u ON cn.published_by = u.user_id
      WHERE cn.id = :id
        AND cn.company_id = :company_id
    `, {
      replacements: { id, company_id },
      type: QueryTypes.SELECT
    });

    if (newsResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Noticia no encontrada' });
    }

    const news = newsResults[0];

    // Get related experiences if any
    let relatedExperiences = [];
    if (news.related_experience_ids && news.related_experience_ids.length > 0) {
      relatedExperiences = await sequelize.query(`
        SELECT
          id,
          title,
          description,
          type,
          status,
          created_at
        FROM employee_experiences
        WHERE id = ANY(:ids)
          AND company_id = :company_id
        ORDER BY created_at DESC
      `, {
        replacements: {
          ids: news.related_experience_ids,
          company_id
        },
        type: QueryTypes.SELECT
      });
    }

    console.log(`✅ [NEWS] Noticia encontrada con ${relatedExperiences.length} experiencias relacionadas`);

    return res.json({
      success: true,
      news,
      relatedExperiences
    });

  } catch (error) {
    console.error('❌ [NEWS] Error obteniendo detalle:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
