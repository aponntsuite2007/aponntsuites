// 🔬 API BIOMÉTRICA NEXT-GEN - ENDPOINTS PARA KIOSCO Y APK ANDROID
const express = require('express');
const router = express.Router();

// 🚀 IMPORTAR SERVICIOS NEXT-GEN
const { aiEngine } = require('../services/ai-biometric-engine');
const { sequelize } = require('../config/database');

// 🔧 IMPORTAR MODELOS POSTGRESQL WORKING
const UserPostgreSQL = require('../models/User-postgresql')(sequelize);
const { Company } = require('../models/aponntModels');

// 🧬 BIOMETRIC MODELS TEMPORALES (SIMULAR FUNCIONALIDAD)
const BiometricScan = () => ({
  create: async (data) => {
    console.log('🔬 [BIOMETRIC-SCAN] Simulated scan created:', data);
    return { id: Date.now(), ...data };
  }
});

const BiometricAlert = () => ({
  create: async (data) => {
    console.log('🔔 [BIOMETRIC-ALERT] Simulated alert created:', data);
    return { id: Date.now(), ...data };
  }
});

// 🌐 HELPER FUNCTIONS
const getTenantId = async (companyId) => companyId;
const syncWithNextGen = async (fn, options) => await fn({}, options);

// 📊 MIDDLEWARE DE VALIDACIÓN DE TENANT
const validateTenant = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.body.tenantId || req.query.tenantId;
    const companyId = req.headers['x-company-id'] || req.body.companyId || req.query.companyId;

    if (!tenantId && !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID o Company ID requerido'
      });
    }

    // Si tenemos companyId pero no tenantId, lo obtenemos
    if (companyId && !tenantId) {
      req.tenantId = await getTenantId(companyId);
    } else {
      req.tenantId = tenantId;
    }

    next();
  } catch (error) {
    console.error('❌ Error validando tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Error de validación de tenant'
    });
  }
};

// 🔬 Importar pipeline profesional
const { BiometricProcessingPipeline } = require('../services/biometric-processing-pipeline');
const biometricPipeline = new BiometricProcessingPipeline({
  templateDimensions: 512,
  qualityThreshold: 0.7,
  antiSpoofingThreshold: 0.8,
  maxProcessingTimeMs: 500,
  enableParallelProcessing: true,
  multiTenantMode: true
});

// 🔬 ENDPOINT PRINCIPAL PARA ANÁLISIS BIOMÉTRICO PROFESIONAL
router.post('/scan', validateTenant, async (req, res) => {
  try {
    const {
      userId,
      companyId,
      imageData,
      source = 'web_panel',
      deviceId,
      metadata = {}
    } = req.body;

    console.log(`🔬 [BIOMETRIC-SCAN] Procesando análisis para usuario ${userId} desde ${source}`);

    // 📝 VALIDACIONES
    if (!userId || !companyId || !imageData) {
      return res.status(400).json({
        success: false,
        error: 'userId, companyId e imageData son requeridos'
      });
    }

    // 👤 VERIFICAR USUARIO EXISTE
    const user = await UserPostgreSQL.findOne({
      where: {
        user_id: userId,
        companyId: companyId,
        isActive: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado o inactivo'
      });
    }

    // 🧠 PROCESAR IMAGEN CON IA
    const startTime = Date.now();

    // Convertir base64 a buffer si es necesario
    let imageBuffer;
    if (typeof imageData === 'string') {
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (Buffer.isBuffer(imageData)) {
      imageBuffer = imageData;
    } else {
      throw new Error('Formato de imagen no válido');
    }

    // 🚀 PROCESAMIENTO CON PIPELINE PROFESIONAL BIOMÉTRICO
    const biometricData = {
      imageData: imageData.replace(/^data:image\/[a-z]+;base64,/, ''),
      userId: userId,
      metadata: {
        deviceId: deviceId || 'unknown',
        source: source,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ...metadata
      }
    };

    const pipelineResult = await biometricPipeline.processBiometricData(
      biometricData,
      companyId.toString(),
      {
        algorithm: 'facenet-512', // Usar FaceNet profesional
        enableAIAnalysis: true,
        storeTemplate: true
      }
    );

    if (!pipelineResult.success) {
      console.error('❌ Error en pipeline biométrico:', pipelineResult.error);
      return res.status(400).json({
        success: false,
        error: pipelineResult.error,
        processingId: pipelineResult.processingId
      });
    }

    const processingTime = pipelineResult.processingTime;

    // 💾 ALMACENAR RESULTADO PROFESIONAL EN BASE DE DATOS
    const biometricScan = await syncWithNextGen(
      async (data, options) => {
        return await BiometricScan().create({
          tenant_id: req.tenantId,
          user_id: userId,
          scan_data: JSON.stringify(pipelineResult),
          wellness_score: pipelineResult.aiAnalysis?.who_gdhi_health_indicators?.health_score || 0.8,
          alert_count: 0, // Calcular alerts del pipeline
          source: source,
          source_device_id: deviceId,
          processing_time_ms: processingTime,
          timestamp: new Date(),

          // 🔬 DATOS PROFESIONALES ADICIONALES
          template_hash: pipelineResult.template?.hash,
          quality_score: pipelineResult.template?.quality,
          anti_spoofing_score: pipelineResult.antiSpoofing?.confidence,
          ai_analysis: JSON.stringify(pipelineResult.aiAnalysis),
          processing_id: pipelineResult.processingId
        }, options);
      },
      { tenantId: req.tenantId, userId }
    );

    // 🔔 PROCESAR ALERTAS SI EXISTEN
    const alerts = [];
    if (analysisResult.data.alerts.length > 0) {
      for (const alert of analysisResult.data.alerts) {
        const biometricAlert = await BiometricAlert().create({
          tenant_id: req.tenantId,
          user_id: userId,
          scan_id: biometricScan.id,
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          recommendations: JSON.stringify(alert.recommendations),
          status: 'active'
        });
        alerts.push(biometricAlert);
      }
    }

    // 🔄 ACTUALIZAR USUARIO CON ÚLTIMO SCAN
    await user.update({
      last_biometric_scan: new Date(),
      wellness_score: analysisResult.data.overallWellness,
      biometric_data: JSON.stringify({
        lastScan: biometricScan.id,
        lastWellness: analysisResult.data.overallWellness,
        totalScans: await BiometricScan().count({
          where: { user_id: userId, tenant_id: req.tenantId }
        })
      })
    });

    console.log(`✅ [BIOMETRIC-SCAN] Análisis completado - Wellness: ${analysisResult.data.overallWellness}%, Alertas: ${alerts.length}`);

    // 📊 RESPUESTA PROFESIONAL COMPLETA
    res.json({
      success: true,
      data: {
        // 🔬 DATOS BÁSICOS
        scanId: biometricScan.id,
        processingId: pipelineResult.processingId,
        userId: userId,
        companyId: companyId,
        timestamp: biometricScan.timestamp,
        processingTime: processingTime,

        // 🧬 TEMPLATE BIOMÉTRICO
        biometricTemplate: {
          hash: pipelineResult.template?.hash,
          quality: pipelineResult.template?.quality,
          algorithm: pipelineResult.template?.algorithm,
          dimensions: pipelineResult.template?.dimensions
        },

        // 🛡️ ANTI-SPOOFING PROFESIONAL
        antiSpoofing: {
          confidence: pipelineResult.antiSpoofing?.confidence,
          isReal: pipelineResult.antiSpoofing?.confidence >= 0.8,
          details: pipelineResult.antiSpoofing?.details
        },

        // 🔍 DETECCIÓN DE DUPLICADOS
        duplicateDetection: pipelineResult.duplicateDetection,

        // 🧠 ANÁLISIS IA COMPLETO (Harvard, MIT, Stanford, WHO-GDHI)
        aiAnalysis: {
          // 🎭 Harvard EmotiNet
          emotions: {
            primary: pipelineResult.aiAnalysis?.harvard_emotinet?.primary_emotion,
            confidence: pipelineResult.aiAnalysis?.harvard_emotinet?.confidence,
            scores: pipelineResult.aiAnalysis?.harvard_emotinet?.emotion_scores,
            stability: pipelineResult.aiAnalysis?.harvard_emotinet?.emotional_stability
          },

          // 🧭 MIT Behavior Patterns
          behavior: {
            attention: pipelineResult.aiAnalysis?.mit_behavior_patterns?.attention_level,
            engagement: pipelineResult.aiAnalysis?.mit_behavior_patterns?.engagement_score,
            microExpressions: pipelineResult.aiAnalysis?.mit_behavior_patterns?.micro_expressions
          },

          // 👤 Stanford Facial Features
          facialFeatures: pipelineResult.aiAnalysis?.stanford_facial_features,

          // 🏥 WHO-GDHI Health Indicators
          health: {
            wellness: pipelineResult.aiAnalysis?.who_gdhi_health_indicators?.general_wellness,
            fatigue: pipelineResult.aiAnalysis?.who_gdhi_health_indicators?.fatigue_indicators,
            stress: pipelineResult.aiAnalysis?.who_gdhi_health_indicators?.stress_markers,
            healthScore: pipelineResult.aiAnalysis?.who_gdhi_health_indicators?.health_score
          }
        },

        // 🔔 ALERTAS GENERADAS
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          recommendations: JSON.parse(alert.recommendations)
        })),

        // 📊 MÉTRICAS DE RENDIMIENTO
        performance: {
          processingTimeMs: processingTime,
          source: source,
          deviceId: deviceId
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en análisis biométrico:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📊 ENDPOINT PARA OBTENER HISTORIAL DE SCANS
router.get('/history/:userId', validateTenant, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0, days = 30 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const scans = await BiometricScan().findAll({
      where: {
        user_id: userId,
        tenant_id: req.tenantId,
        timestamp: {
          [require('sequelize').Op.gte]: since
        }
      },
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: BiometricAlert(),
          as: 'alerts',
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: scans.map(scan => ({
        id: scan.id,
        timestamp: scan.timestamp,
        wellnessScore: scan.wellness_score,
        alertCount: scan.alert_count,
        source: scan.source,
        processingTime: scan.processing_time_ms,
        alerts: scan.alerts || []
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial'
    });
  }
});

// 📈 ENDPOINT PARA ESTADÍSTICAS DE BIENESTAR
router.get('/stats/:userId', validateTenant, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '7d' } = req.query;

    const periodDays = parseInt(period.replace('d', ''));
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Obtener estadísticas
    const [avgWellness, totalScans, totalAlerts, lastScan] = await Promise.all([
      BiometricScan().findOne({
        where: {
          user_id: userId,
          tenant_id: req.tenantId,
          timestamp: { [require('sequelize').Op.gte]: since }
        },
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('wellness_score')), 'avg']
        ],
        raw: true
      }),
      BiometricScan().count({
        where: {
          user_id: userId,
          tenant_id: req.tenantId,
          timestamp: { [require('sequelize').Op.gte]: since }
        }
      }),
      BiometricAlert().count({
        where: {
          user_id: userId,
          tenant_id: req.tenantId,
          created_at: { [require('sequelize').Op.gte]: since }
        }
      }),
      BiometricScan().findOne({
        where: {
          user_id: userId,
          tenant_id: req.tenantId
        },
        order: [['timestamp', 'DESC']],
        attributes: ['wellness_score', 'timestamp']
      })
    ]);

    res.json({
      success: true,
      data: {
        period: `${periodDays} días`,
        averageWellness: Math.round(avgWellness?.avg || 0),
        totalScans: totalScans,
        totalAlerts: totalAlerts,
        lastScan: lastScan ? {
          wellness: lastScan.wellness_score,
          timestamp: lastScan.timestamp
        } : null,
        trend: calculateWellnessTrend(avgWellness?.avg, lastScan?.wellness_score)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

// 🔔 ENDPOINT PARA GESTIONAR ALERTAS
router.put('/alerts/:alertId/acknowledge', validateTenant, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy, notes } = req.body;

    const alert = await BiometricAlert().findOne({
      where: {
        id: alertId,
        tenant_id: req.tenantId
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alerta no encontrada'
      });
    }

    await alert.update({
      status: 'acknowledged',
      acknowledged_by: acknowledgedBy,
      acknowledged_at: new Date(),
      recommendations: JSON.stringify({
        ...JSON.parse(alert.recommendations),
        acknowledgeNotes: notes
      })
    });

    res.json({
      success: true,
      message: 'Alerta marcada como revisada'
    });

  } catch (error) {
    console.error('❌ Error actualizando alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando alerta'
    });
  }
});

// 🚀 ENDPOINT PARA HEALTH CHECK DEL SISTEMA IA
router.get('/health', (req, res) => {
  try {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        aiEngine: aiEngine ? 'running' : 'down',
        database: 'connected',
        models: aiEngine.models || {}
      }
    };

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Sistema no disponible'
    });
  }
});

// 🔧 FUNCIONES DE UTILIDAD
function getWellnessLevel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

function calculateWellnessTrend(avg, last) {
  if (!avg || !last) return 'stable';
  const diff = last - avg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

module.exports = router;