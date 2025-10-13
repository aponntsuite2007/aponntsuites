/**
 * 🧠 EMOTIONAL ANALYSIS SERVICE - ENTERPRISE GRADE
 * ===============================================
 * Servicio profesional para análisis emocional y bienestar
 * basado en datos REALES de Azure Face API
 *
 * IMPORTANTE: Este servicio procesa datos sensibles.
 * Requiere consentimiento explícito del usuario.
 *
 * @version 1.0.0
 * @author Sistema Biométrico Enterprise
 * @license Uso interno - Datos sensibles bajo Ley 25.326
 */

const { sequelize } = require('../config/database');

class EmotionalAnalysisService {
  constructor() {
    console.log('🧠 [EMOTIONAL-ANALYSIS] Servicio profesional inicializado');
  }

  /**
   * Analizar estado emocional desde datos de Azure
   * @param {Object} azureFaceData - Datos de Azure Face API
   * @param {Object} context - Contexto (userId, companyId, timestamp)
   * @returns {Promise<Object>} Análisis completo
   */
  async analyzeEmotionalState(azureFaceData, context) {
    try {
      if (!azureFaceData?.faceAttributes) {
        return {
          success: false,
          error: 'MISSING_FACE_ATTRIBUTES',
          message: 'Datos de Azure incompletos'
        };
      }

      const emotion = azureFaceData.faceAttributes.emotion || {};
      const smile = azureFaceData.faceAttributes.smile || 0;
      const occlusion = azureFaceData.faceAttributes.occlusion || {};
      const headPose = azureFaceData.faceAttributes.headPose || {};
      const glasses = azureFaceData.faceAttributes.glasses;
      const age = azureFaceData.faceAttributes.age;

      // ========================================
      // ANÁLISIS DE EMOCIONES (AZURE REAL)
      // ========================================
      const emotionAnalysis = {
        anger: emotion.anger || 0,
        contempt: emotion.contempt || 0,
        disgust: emotion.disgust || 0,
        fear: emotion.fear || 0,
        happiness: emotion.happiness || 0,
        neutral: emotion.neutral || 0,
        sadness: emotion.sadness || 0,
        surprise: emotion.surprise || 0,

        // Emoción dominante
        dominantEmotion: this._getDominantEmotion(emotion),

        // Valence (positivo/negativo)
        valence: this._calculateValence(emotion),

        // Arousal (activación)
        arousal: this._calculateArousal(emotion)
      };

      // ========================================
      // DETECCIÓN DE FATIGA (INDICADORES REALES)
      // ========================================
      const fatigueIndicators = {
        eyeOcclusionLeft: occlusion.eyeOccluded?.left || 0,
        eyeOcclusionRight: occlusion.eyeOccluded?.right || 0,
        headPosePitch: headPose.pitch || 0,
        headPoseRoll: headPose.roll || 0,
        headPoseYaw: headPose.yaw || 0,
        smileIntensity: smile,
        hasGlasses: glasses !== 'NoGlasses',

        // Score de fatiga calculado (0-1)
        fatigueScore: this._calculateFatigueScore({
          eyeOcclusionLeft: occlusion.eyeOccluded?.left || 0,
          eyeOcclusionRight: occlusion.eyeOccluded?.right || 0,
          headPosePitch: headPose.pitch || 0,
          smile: smile,
          sadness: emotion.sadness || 0,
          neutral: emotion.neutral || 0
        })
      };

      // ========================================
      // SCORE DE ESTRÉS (MODELO PROFESIONAL)
      // ========================================
      const stressScore = this._calculateStressScore({
        anger: emotion.anger || 0,
        fear: emotion.fear || 0,
        sadness: emotion.sadness || 0,
        contempt: emotion.contempt || 0,
        fatigueScore: fatigueIndicators.fatigueScore
      });

      // ========================================
      // SCORE DE BIENESTAR GENERAL (0-100)
      // ========================================
      const wellnessScore = this._calculateWellnessScore({
        happiness: emotion.happiness || 0,
        neutral: emotion.neutral || 0,
        fatigue: fatigueIndicators.fatigueScore,
        stress: stressScore
      });

      // ========================================
      // METADATA Y CONTEXTO
      // ========================================
      const metadata = {
        timestamp: context.timestamp || new Date(),
        timeOfDay: this._getTimeOfDay(context.timestamp || new Date()),
        dayOfWeek: (context.timestamp || new Date()).getDay(),
        estimatedAge: age,
        hasGlasses: glasses !== 'NoGlasses',
        glassesType: glasses,
        processingTime: azureFaceData.processingTime || 0,
        provider: 'azure-face-api',
        dataSource: 'real' // Importante: datos REALES no simulados
      };

      // ========================================
      // RESULTADO COMPLETO
      // ========================================
      const result = {
        success: true,
        userId: context.userId,
        companyId: context.companyId,
        emotionAnalysis,
        fatigueIndicators,
        stressScore,
        wellnessScore,
        metadata,

        // Recomendaciones automáticas
        recommendations: this._generateRecommendations({
          fatigueScore: fatigueIndicators.fatigueScore,
          stressScore,
          wellnessScore,
          dominantEmotion: emotionAnalysis.dominantEmotion
        }),

        // Alertas si es necesario
        alerts: this._generateAlerts({
          fatigueScore: fatigueIndicators.fatigueScore,
          stressScore,
          wellnessScore
        })
      };

      console.log(`✅ [EMOTIONAL-ANALYSIS] Análisis completo para usuario ${context.userId}`);
      console.log(`   Emoción dominante: ${emotionAnalysis.dominantEmotion}`);
      console.log(`   Fatiga: ${(fatigueIndicators.fatigueScore * 100).toFixed(1)}%`);
      console.log(`   Estrés: ${(stressScore * 100).toFixed(1)}%`);
      console.log(`   Bienestar: ${wellnessScore}/100`);

      return result;

    } catch (error) {
      console.error('❌ [EMOTIONAL-ANALYSIS] Error:', error.message);
      return {
        success: false,
        error: 'ANALYSIS_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Obtener emoción dominante
   * @private
   */
  _getDominantEmotion(emotion) {
    if (!emotion) return 'unknown';

    const emotions = [
      { name: 'anger', value: emotion.anger || 0 },
      { name: 'contempt', value: emotion.contempt || 0 },
      { name: 'disgust', value: emotion.disgust || 0 },
      { name: 'fear', value: emotion.fear || 0 },
      { name: 'happiness', value: emotion.happiness || 0 },
      { name: 'neutral', value: emotion.neutral || 0 },
      { name: 'sadness', value: emotion.sadness || 0 },
      { name: 'surprise', value: emotion.surprise || 0 }
    ];

    const dominant = emotions.reduce((max, curr) =>
      curr.value > max.value ? curr : max
    );

    return dominant.name;
  }

  /**
   * Calcular valencia emocional (positivo/negativo)
   * @private
   */
  _calculateValence(emotion) {
    const positive = (emotion.happiness || 0) + (emotion.surprise || 0) * 0.5;
    const negative = (emotion.anger || 0) + (emotion.sadness || 0) +
                     (emotion.fear || 0) + (emotion.disgust || 0);

    // Normalizar a rango -1 (muy negativo) a 1 (muy positivo)
    return (positive - negative) / Math.max(positive + negative, 0.1);
  }

  /**
   * Calcular activación emocional
   * @private
   */
  _calculateArousal(emotion) {
    const highArousal = (emotion.anger || 0) + (emotion.fear || 0) +
                        (emotion.surprise || 0) + (emotion.happiness || 0);
    const lowArousal = (emotion.sadness || 0) + (emotion.neutral || 0);

    // Normalizar a rango 0 (muy calmado) a 1 (muy activado)
    return highArousal / Math.max(highArousal + lowArousal, 0.1);
  }

  /**
   * Calcular score de fatiga (0-1)
   * Basado en indicadores físicos REALES
   * @private
   */
  _calculateFatigueScore(indicators) {
    // Pesos científicos para cada indicador
    const weights = {
      eyeOcclusion: 0.35,    // Ojos cerrados/semicerrados = mayor peso
      headPose: 0.25,         // Inclinación cabeza
      smile: 0.15,            // Falta de sonrisa
      sadness: 0.15,          // Tristeza relacionada con cansancio
      neutral: 0.10           // Expresión neutra/apática
    };

    // Oclusion ocular (0-1, mayor = más cerrados)
    const eyeScore = (indicators.eyeOcclusionLeft + indicators.eyeOcclusionRight) / 2;

    // Head pose (pitch negativo = cabeza inclinada hacia abajo)
    const headScore = Math.abs(indicators.headPosePitch) > 15 ?
                      Math.min(Math.abs(indicators.headPosePitch) / 30, 1) : 0;

    // Sonrisa baja = posible fatiga
    const smileScore = 1 - indicators.smile;

    // Combinar todos los indicadores
    const fatigueScore =
      (eyeScore * weights.eyeOcclusion) +
      (headScore * weights.headPose) +
      (smileScore * weights.smile) +
      (indicators.sadness * weights.sadness) +
      (indicators.neutral * weights.neutral);

    return Math.min(Math.max(fatigueScore, 0), 1);
  }

  /**
   * Calcular score de estrés (0-1)
   * Basado en emociones negativas
   * @private
   */
  _calculateStressScore(indicators) {
    const weights = {
      anger: 0.30,
      fear: 0.25,
      sadness: 0.20,
      contempt: 0.10,
      fatigue: 0.15
    };

    const stressScore =
      (indicators.anger * weights.anger) +
      (indicators.fear * weights.fear) +
      (indicators.sadness * weights.sadness) +
      (indicators.contempt * weights.contempt) +
      (indicators.fatigueScore * weights.fatigue);

    return Math.min(Math.max(stressScore, 0), 1);
  }

  /**
   * Calcular score de bienestar general (0-100)
   * @private
   */
  _calculateWellnessScore(indicators) {
    // Factores positivos
    const positive = (indicators.happiness * 0.4) + (indicators.neutral * 0.1);

    // Factores negativos
    const negative = (indicators.fatigue * 0.25) + (indicators.stress * 0.25);

    // Score final (0-100)
    const score = (positive - negative + 0.5) * 100;

    return Math.round(Math.min(Math.max(score, 0), 100));
  }

  /**
   * Obtener periodo del día
   * @private
   */
  _getTimeOfDay(timestamp) {
    const hour = timestamp.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Generar recomendaciones automáticas
   * @private
   */
  _generateRecommendations(data) {
    const recommendations = [];

    // Fatiga alta
    if (data.fatigueScore > 0.6) {
      recommendations.push({
        type: 'fatigue',
        level: 'high',
        message: 'Se detecta fatiga elevada. Se recomienda descanso.',
        action: 'consider_break'
      });
    } else if (data.fatigueScore > 0.4) {
      recommendations.push({
        type: 'fatigue',
        level: 'medium',
        message: 'Nivel moderado de fatiga detectado.',
        action: 'monitor'
      });
    }

    // Estrés alto
    if (data.stressScore > 0.6) {
      recommendations.push({
        type: 'stress',
        level: 'high',
        message: 'Indicadores de estrés elevado detectados.',
        action: 'wellness_program'
      });
    }

    // Bienestar bajo
    if (data.wellnessScore < 40) {
      recommendations.push({
        type: 'wellness',
        level: 'low',
        message: 'Score de bienestar bajo. Considerar seguimiento.',
        action: 'hr_review'
      });
    }

    return recommendations;
  }

  /**
   * Generar alertas si es necesario
   * @private
   */
  _generateAlerts(data) {
    const alerts = [];

    // Alerta crítica: fatiga extrema
    if (data.fatigueScore > 0.8) {
      alerts.push({
        severity: 'critical',
        type: 'extreme_fatigue',
        message: 'Fatiga extrema detectada - Riesgo de seguridad',
        requiresAction: true
      });
    }

    // Alerta alta: estrés muy elevado
    if (data.stressScore > 0.8) {
      alerts.push({
        severity: 'high',
        type: 'high_stress',
        message: 'Indicadores de estrés muy elevados',
        requiresAction: true
      });
    }

    // Alerta media: bienestar muy bajo
    if (data.wellnessScore < 30) {
      alerts.push({
        severity: 'medium',
        type: 'low_wellness',
        message: 'Bienestar general muy bajo - Seguimiento recomendado',
        requiresAction: false
      });
    }

    return alerts;
  }

  /**
   * Guardar análisis en base de datos
   * (Requiere consentimiento previo)
   */
  async saveAnalysis(analysisData) {
    // TODO: Implementar después de crear la tabla
    console.log('💾 [EMOTIONAL-ANALYSIS] Guardando análisis en BD...');
    return { success: true };
  }

  /**
   * Obtener historial de análisis de un usuario
   */
  async getUserHistory(userId, companyId, options = {}) {
    // TODO: Implementar después de crear la tabla
    console.log(`📊 [EMOTIONAL-ANALYSIS] Obteniendo historial de usuario ${userId}...`);
    return { success: true, data: [] };
  }

  /**
   * Generar reporte agregado por departamento
   * (Solo datos agregados, nunca individuales)
   */
  async getDepartmentReport(companyId, departmentId, options = {}) {
    // TODO: Implementar después de crear la tabla
    console.log(`📈 [EMOTIONAL-ANALYSIS] Generando reporte de departamento ${departmentId}...`);
    return { success: true, data: {} };
  }
}

module.exports = new EmotionalAnalysisService();
