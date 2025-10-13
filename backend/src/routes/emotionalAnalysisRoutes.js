/**
 * 🧠 RUTAS API: EMOTIONAL ANALYSIS
 * ================================
 * Endpoints profesionales para análisis emocional
 */

const express = require('express');
const router = express.Router();
const emotionalAnalysisService = require('../services/emotional-analysis-service');
const consentManagementService = require('../services/consent-management-service');
const azureFaceService = require('../services/azure-face-service');
const EmotionalAnalysis = require('../models/EmotionalAnalysis');

/**
 * POST /api/v1/emotional-analysis/analyze
 * Analizar emociones desde imagen
 */
router.post('/analyze', async (req, res) => {
  try {
    const { userId, companyId, imageData } = req.body;

    // 1. Verificar consentimiento
    const hasConsent = await consentManagementService.hasActiveConsent(
      userId,
      companyId,
      'emotional_analysis'
    );

    if (!hasConsent) {
      return res.status(403).json({
        success: false,
        error: 'CONSENT_REQUIRED',
        message: 'Usuario no ha otorgado consentimiento para análisis emocional',
        requiresConsent: true
      });
    }

    // 2. Procesar imagen con Azure
    const imageBuffer = Buffer.from(imageData, 'base64');
    const azureResult = await azureFaceService.detectAndExtractFace(imageBuffer);

    if (!azureResult.success) {
      return res.status(400).json(azureResult);
    }

    // 3. Analizar emociones
    const analysis = await emotionalAnalysisService.analyzeEmotionalState(
      azureResult,
      { userId, companyId, timestamp: new Date() }
    );

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    // 4. Guardar en BD
    await EmotionalAnalysis.create({
      companyId: analysis.companyId,
      userId: analysis.userId,
      scanTimestamp: analysis.metadata.timestamp,

      // Emociones
      emotionAnger: analysis.emotionAnalysis.anger,
      emotionContempt: analysis.emotionAnalysis.contempt,
      emotionDisgust: analysis.emotionAnalysis.disgust,
      emotionFear: analysis.emotionAnalysis.fear,
      emotionHappiness: analysis.emotionAnalysis.happiness,
      emotionNeutral: analysis.emotionAnalysis.neutral,
      emotionSadness: analysis.emotionAnalysis.sadness,
      emotionSurprise: analysis.emotionAnalysis.surprise,
      dominantEmotion: analysis.emotionAnalysis.dominantEmotion,
      emotionalValence: analysis.emotionAnalysis.valence,
      emotionalArousal: analysis.emotionAnalysis.arousal,

      // Fatiga
      eyeOcclusionLeft: analysis.fatigueIndicators.eyeOcclusionLeft,
      eyeOcclusionRight: analysis.fatigueIndicators.eyeOcclusionRight,
      headPosePitch: analysis.fatigueIndicators.headPosePitch,
      headPoseRoll: analysis.fatigueIndicators.headPoseRoll,
      headPoseYaw: analysis.fatigueIndicators.headPoseYaw,
      smileIntensity: analysis.fatigueIndicators.smileIntensity,
      fatigueScore: analysis.fatigueIndicators.fatigueScore,

      // Metadata
      hasGlasses: analysis.metadata.hasGlasses,
      glassesType: analysis.metadata.glassesType,
      estimatedAge: analysis.metadata.estimatedAge,
      timeOfDay: analysis.metadata.timeOfDay,
      dayOfWeek: analysis.metadata.dayOfWeek,

      // Scores
      stressScore: analysis.stressScore,
      wellnessScore: analysis.wellnessScore,

      // Técnico
      processingTimeMs: analysis.metadata.processingTime,
      dataSource: analysis.metadata.provider,
      azureFaceId: azureResult.faceId,
      qualityScore: azureResult.qualityScore
    });

    res.json({
      success: true,
      analysis: {
        emotionAnalysis: analysis.emotionAnalysis,
        fatigueIndicators: analysis.fatigueIndicators,
        stressScore: analysis.stressScore,
        wellnessScore: analysis.wellnessScore,
        recommendations: analysis.recommendations,
        alerts: analysis.alerts
      }
    });

  } catch (error) {
    console.error('❌ [EMOTIONAL-ANALYSIS-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYSIS_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/emotional-analysis/history/:userId
 * Obtener historial de análisis de un usuario
 * FILTRADO: Solo si el usuario tiene consentimiento activo
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId, days = 30 } = req.query;

    // Verificar que el usuario tiene consentimiento activo
    const hasConsent = await consentManagementService.hasActiveConsent(
      userId,
      companyId,
      'emotional_analysis'
    );

    if (!hasConsent) {
      return res.status(403).json({
        success: false,
        error: 'CONSENT_REQUIRED',
        message: 'Usuario no tiene consentimiento activo para consultar historial emocional',
        requiresConsent: true
      });
    }

    const history = await EmotionalAnalysis.findAll({
      where: {
        userId,
        companyId,
        scanTimestamp: {
          [require('sequelize').Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      order: [['scanTimestamp', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      count: history.length,
      data: history,
      consentStatus: 'active'
    });

  } catch (error) {
    console.error('❌ [EMOTIONAL-ANALYSIS-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'QUERY_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/emotional-analysis/department-report/:departmentId
 * Reporte agregado por departamento (SOLO AGREGADO, nunca individual)
 * FILTRADO: Solo incluye usuarios con consentimiento activo
 */
router.get('/department-report/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { companyId, days = 7 } = req.query;

    const { sequelize } = require('../config/database');

    const [results] = await sequelize.query(`
      SELECT
        COUNT(DISTINCT e.user_id) as users_count,
        AVG(e.wellness_score) as avg_wellness,
        AVG(e.fatigue_score) as avg_fatigue,
        AVG(e.stress_score) as avg_stress,
        AVG(e.emotion_happiness) as avg_happiness,
        DATE_TRUNC('day', e.scan_timestamp) as date
      FROM biometric_emotional_analysis e
      JOIN users u ON e.user_id = u.user_id AND e.company_id = u.company_id
      -- SOLO usuarios con consentimiento activo
      JOIN biometric_consents c ON e.user_id = c.user_id
        AND e.company_id = c.company_id
        AND c.consent_type = 'emotional_analysis'
        AND c.consent_given = true
        AND c.revoked = false
        AND (c.expires_at IS NULL OR c.expires_at > NOW())
      WHERE u."departmentId"::integer = :departmentId
        AND u.company_id = :companyId
        AND e.scan_timestamp >= NOW() - INTERVAL ':days days'
      GROUP BY DATE_TRUNC('day', e.scan_timestamp)
      HAVING COUNT(DISTINCT e.user_id) >= 10
      ORDER BY date DESC
    `, {
      replacements: { departmentId, companyId, days },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      departmentId,
      minimumUsers: 10,
      data: results,
      note: 'Datos agregados - mínimo 10 usuarios con consentimiento activo para privacidad',
      consentFiltered: true
    });

  } catch (error) {
    console.error('❌ [EMOTIONAL-ANALYSIS-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'QUERY_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/emotional-analysis/test
 * Endpoint de prueba (solo desarrollo)
 */
router.get('/test', async (req, res) => {
  res.json({
    success: true,
    message: 'API de Análisis Emocional Profesional',
    version: '1.0.0',
    provider: 'Azure Face API',
    dataSource: 'REAL',
    features: [
      '8 emociones (Azure)',
      'Detección de fatiga',
      'Score de estrés',
      'Score de bienestar',
      'Consentimientos legales (Ley 25.326)',
      'Reportes agregados (privacidad)'
    ],
    endpoints: {
      analyze: 'POST /api/v1/emotional-analysis/analyze',
      history: 'GET /api/v1/emotional-analysis/history/:userId',
      departmentReport: 'GET /api/v1/emotional-analysis/department-report/:departmentId'
    }
  });
});

module.exports = router;
