/**
 * 🧠 MODELO: EMOTIONAL ANALYSIS (SEQUELIZE)
 * ========================================
 * Modelo profesional para análisis emocional
 * Datos REALES desde Azure Face API
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmotionalAnalysis = sequelize.define('EmotionalAnalysis', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id'
  },

  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id'
  },

  scanTimestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'scan_timestamp'
  },

  // ========================================
  // EMOCIONES (Azure Face API)
  // ========================================
  emotionAnger: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_anger'
  },

  emotionContempt: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_contempt'
  },

  emotionDisgust: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_disgust'
  },

  emotionFear: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_fear'
  },

  emotionHappiness: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_happiness'
  },

  emotionNeutral: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_neutral'
  },

  emotionSadness: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_sadness'
  },

  emotionSurprise: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotion_surprise'
  },

  dominantEmotion: {
    type: DataTypes.STRING(20),
    field: 'dominant_emotion'
  },

  emotionalValence: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotional_valence'
  },

  emotionalArousal: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'emotional_arousal'
  },

  // ========================================
  // INDICADORES DE FATIGA
  // ========================================
  eyeOcclusionLeft: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'eye_occlusion_left'
  },

  eyeOcclusionRight: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'eye_occlusion_right'
  },

  headPosePitch: {
    type: DataTypes.DECIMAL(6, 2),
    field: 'head_pose_pitch'
  },

  headPoseRoll: {
    type: DataTypes.DECIMAL(6, 2),
    field: 'head_pose_roll'
  },

  headPoseYaw: {
    type: DataTypes.DECIMAL(6, 2),
    field: 'head_pose_yaw'
  },

  smileIntensity: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'smile_intensity'
  },

  fatigueScore: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'fatigue_score'
  },

  // ========================================
  // METADATA
  // ========================================
  hasGlasses: {
    type: DataTypes.BOOLEAN,
    field: 'has_glasses'
  },

  glassesType: {
    type: DataTypes.STRING(20),
    field: 'glasses_type'
  },

  estimatedAge: {
    type: DataTypes.INTEGER,
    field: 'estimated_age'
  },

  timeOfDay: {
    type: DataTypes.STRING(20),
    field: 'time_of_day'
  },

  dayOfWeek: {
    type: DataTypes.INTEGER,
    field: 'day_of_week'
  },

  // ========================================
  // SCORES CALCULADOS
  // ========================================
  stressScore: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'stress_score'
  },

  wellnessScore: {
    type: DataTypes.INTEGER,
    field: 'wellness_score'
  },

  // ========================================
  // METADATA TÉCNICA
  // ========================================
  processingTimeMs: {
    type: DataTypes.INTEGER,
    field: 'processing_time_ms'
  },

  dataSource: {
    type: DataTypes.STRING(50),
    defaultValue: 'azure-face-api',
    field: 'data_source'
  },

  azureFaceId: {
    type: DataTypes.STRING(255),
    field: 'azure_face_id'
  },

  qualityScore: {
    type: DataTypes.DECIMAL(5, 4),
    field: 'quality_score'
  }

}, {
  tableName: 'biometric_emotional_analysis',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_emotional_analysis_user_time',
      fields: ['company_id', 'user_id', 'scan_timestamp']
    }
  ]
});

module.exports = EmotionalAnalysis;
