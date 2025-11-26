const express = require('express');
const router = express.Router();
const AttendanceAnalyticsService = require('../services/AttendanceAnalyticsService');
const AttendanceScoringEngine = require('../services/AttendanceScoringEngine');
const PatternDetectionService = require('../services/PatternDetectionService');
const { AttendanceProfile, AttendancePattern, ScoringHistory, ComparativeAnalytics } = require('../config/database');

/**
 * Rutas de Attendance Analytics
 *
 * Sistema completo de scoring, patrones y analytics
 *
 * Base URL: /api/attendance-analytics
 */

// ============================================================================
// ANÁLISIS DE EMPLEADO
// ============================================================================

/**
 * GET /api/attendance-analytics/employee/:userId
 * Análisis completo de un empleado (scoring + patrones + historial)
 */
router.get('/employee/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user?.company_id || req.query.company_id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido'
      });
    }

    const analysis = await AttendanceAnalyticsService.analyzeEmployee(userId, companyId);

    res.json(analysis);

  } catch (error) {
    console.error('❌ Error en análisis de empleado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-analytics/employee/:userId/profile
 * Obtener perfil de asistencia de un empleado
 */
router.get('/employee/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user?.company_id || req.query.company_id;

    const profile = await AttendanceProfile.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Perfil no encontrado'
      });
    }

    res.json({
      success: true,
      profile: profile.toJSON(),
      breakdown: profile.getScoreBreakdown()
    });

  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-analytics/employee/:userId/patterns
 * Obtener patrones activos de un empleado
 */
router.get('/employee/:userId/patterns', async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user?.company_id || req.query.company_id;
    const status = req.query.status || 'active';

    const patterns = await AttendancePattern.findAll({
      where: {
        user_id: userId,
        company_id: companyId,
        status
      },
      order: [['severity', 'DESC'], ['detection_date', 'DESC']]
    });

    res.json({
      success: true,
      total: patterns.length,
      patterns: patterns.map(p => p.toJSON())
    });

  } catch (error) {
    console.error('❌ Error obteniendo patrones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-analytics/employee/:userId/history
 * Obtener historial de scoring de un empleado
 */
router.get('/employee/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user?.company_id || req.query.company_id;
    const limit = parseInt(req.query.limit) || 12;

    const history = await ScoringHistory.findAll({
      where: { user_id: userId, company_id: companyId },
      order: [['snapshot_date', 'DESC']],
      limit
    });

    res.json({
      success: true,
      total: history.length,
      history: history.map(h => ({
        date: h.snapshot_date,
        scoring_total: parseFloat(h.scoring_total),
        scoring_punctuality: parseFloat(h.scoring_punctuality),
        scoring_absence: parseFloat(h.scoring_absence),
        change: parseFloat(h.change_from_previous || 0),
        trend: h.trend
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ANÁLISIS DE EMPRESA
// ============================================================================

/**
 * GET /api/attendance-analytics/company/:companyId
 * Análisis completo de una empresa
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const analysis = await AttendanceAnalyticsService.analyzeCompany(parseInt(companyId));

    res.json(analysis);

  } catch (error) {
    console.error('❌ Error en análisis de empresa:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-analytics/company/:companyId/stats
 * Estadísticas agregadas de una empresa
 */
router.get('/company/:companyId/stats', async (req, res) => {
  try {
    const { companyId } = req.params;

    const stats = await AttendanceScoringEngine.getCompanyScoringStats(parseInt(companyId));

    res.json({
      success: true,
      company_id: parseInt(companyId),
      stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-analytics/company/:companyId/rankings
 * Rankings por departamento/turno/sucursal
 */
router.get('/company/:companyId/rankings', async (req, res) => {
  try {
    const { companyId } = req.params;
    const groupBy = req.query.group_by || 'department'; // department | shift | branch

    const rankings = await AttendanceAnalyticsService.getRankings(parseInt(companyId), groupBy);

    res.json(rankings);

  } catch (error) {
    console.error('❌ Error generando rankings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-analytics/company/:companyId/critical-patterns
 * Patrones críticos activos de una empresa
 */
router.get('/company/:companyId/critical-patterns', async (req, res) => {
  try {
    const { companyId } = req.params;

    const patterns = await AttendancePattern.findAll({
      where: {
        company_id: parseInt(companyId),
        severity: 'critical',
        status: 'active'
      },
      include: [
        {
          model: require('../config/database').User,
          as: 'user',
          attributes: ['user_id', 'firstName', 'lastName', 'employee_id']
        }
      ],
      order: [['detection_date', 'DESC']]
    });

    res.json({
      success: true,
      total: patterns.length,
      patterns: patterns.map(p => ({
        id: p.id,
        user: p.user,
        pattern_name: p.pattern_name,
        severity: p.severity,
        confidence_score: parseFloat(p.confidence_score),
        detection_date: p.detection_date,
        requires_action: p.requires_action
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo patrones críticos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// OPERACIONES DE RECALCULACIÓN
// ============================================================================

/**
 * POST /api/attendance-analytics/recalculate/:companyId
 * Recalcular scoring de toda la empresa
 */
router.post('/recalculate/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const results = await AttendanceScoringEngine.recalculateCompanyScoring(parseInt(companyId));

    res.json({
      success: true,
      company_id: parseInt(companyId),
      results
    });

  } catch (error) {
    console.error('❌ Error recalculando scoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/attendance-analytics/recalculate/employee/:userId
 * Recalcular scoring de un empleado específico
 */
router.post('/recalculate/employee/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user?.company_id || req.body.company_id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido'
      });
    }

    const result = await AttendanceScoringEngine.calculateUserScoring(userId, companyId);

    res.json(result);

  } catch (error) {
    console.error('❌ Error recalculando empleado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DETECCIÓN DE PATRONES
// ============================================================================

/**
 * POST /api/attendance-analytics/patterns/detect/:userId
 * Detectar patrones para un empleado
 */
router.post('/patterns/detect/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const companyId = req.user?.company_id || req.body.company_id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido'
      });
    }

    const patterns = await PatternDetectionService.detectUserPatterns(userId, companyId);

    res.json({
      success: true,
      user_id: userId,
      company_id: companyId,
      patterns_detected: patterns.length,
      patterns
    });

  } catch (error) {
    console.error('❌ Error detectando patrones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/attendance-analytics/patterns/:patternId/resolve
 * Marcar patrón como resuelto
 */
router.post('/patterns/:patternId/resolve', async (req, res) => {
  try {
    const { patternId } = req.params;
    const { action_taken, resolved_by } = req.body;

    const pattern = await AttendancePattern.findByPk(patternId);

    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Patrón no encontrado'
      });
    }

    await pattern.resolve(action_taken, resolved_by);

    res.json({
      success: true,
      pattern: pattern.toJSON()
    });

  } catch (error) {
    console.error('❌ Error resolviendo patrón:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/attendance-analytics/patterns/:patternId/ignore
 * Marcar patrón como ignorado
 */
router.post('/patterns/:patternId/ignore', async (req, res) => {
  try {
    const { patternId } = req.params;
    const { reason } = req.body;

    const pattern = await AttendancePattern.findByPk(patternId);

    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Patrón no encontrado'
      });
    }

    await pattern.ignore(reason);

    res.json({
      success: true,
      pattern: pattern.toJSON()
    });

  } catch (error) {
    console.error('❌ Error ignorando patrón:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// CUBOS OLAP
// ============================================================================

/**
 * POST /api/attendance-analytics/olap/generate
 * Generar cubo OLAP para comparativas
 */
router.post('/olap/generate', async (req, res) => {
  try {
    const { company_id, dimensions } = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido'
      });
    }

    const cube = await AttendanceAnalyticsService.generateOLAPCube(company_id, dimensions || {});

    res.json(cube);

  } catch (error) {
    console.error('❌ Error generando cubo OLAP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-analytics/olap/:cubeId
 * Obtener datos de un cubo OLAP generado
 */
router.get('/olap/:cubeId', async (req, res) => {
  try {
    const { cubeId } = req.params;

    const cubeData = await ComparativeAnalytics.findAll({
      where: { cube_id: cubeId },
      order: [['calculated_at', 'DESC']]
    });

    if (cubeData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cubo no encontrado'
      });
    }

    res.json({
      success: true,
      cube_id: cubeId,
      cells: cubeData.length,
      data: cubeData.map(c => c.toJSON())
    });

  } catch (error) {
    console.error('❌ Error obteniendo cubo OLAP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// SNAPSHOTS HISTÓRICOS
// ============================================================================

/**
 * POST /api/attendance-analytics/snapshot/:companyId
 * Generar snapshot semanal de scoring
 */
router.post('/snapshot/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await AttendanceAnalyticsService.generateWeeklySnapshot(parseInt(companyId));

    res.json(result);

  } catch (error) {
    console.error('❌ Error generando snapshot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// GESTIÓN DE CACHE
// ============================================================================

/**
 * DELETE /api/attendance-analytics/cache/:companyId
 * Invalidar cache de una empresa
 */
router.delete('/cache/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await AttendanceAnalyticsService.invalidateCache(parseInt(companyId));

    res.json(result);

  } catch (error) {
    console.error('❌ Error invalidando cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/attendance-analytics/health
 * Verificar estado del sistema de analytics
 */
router.get('/health', async (req, res) => {
  try {
    // Verificar que las tablas existen
    const profileCount = await AttendanceProfile.count();
    const patternCount = await AttendancePattern.count();

    res.json({
      success: true,
      status: 'healthy',
      tables: {
        attendance_profiles: profileCount,
        attendance_patterns: patternCount
      },
      services: {
        scoring_engine: 'active',
        pattern_detection: 'active',
        analytics_service: 'active'
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Error en health check:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
