const { DataTypes } = require('sequelize');

/**
 * 🧬 MODELOS BIOMÉTRICOS PROFESIONALES
 * ===================================
 * Modelos Sequelize para sistema biométrico profesional
 * Compatible con migraciones ejecutadas
 * Fecha: 2025-09-26
 */

function initBiometricModels(sequelize) {

    // ═══════════════════════════════════════════════════════════════
    // 🎯 MODELO BIOMETRIC TEMPLATES
    // ═══════════════════════════════════════════════════════════════
    const BiometricTemplate = sequelize.define('BiometricTemplate', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        employee_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: 'users',
                key: 'user_id'
            }
        },

        // 🧬 DATOS BIOMÉTRICOS ENCRIPTADOS
        template_data: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'template_data',
            comment: 'Template FaceNet de 512 dimensiones encriptado'
        },
        template_hash: {
            type: DataTypes.CHAR(64),
            allowNull: false,
            field: 'template_hash',
            comment: 'SHA-256 para detección de duplicados'
        },

        // 📊 MÉTRICAS DE CALIDAD
        quality_score: {
            type: DataTypes.DECIMAL(5,4),
            allowNull: false,
            defaultValue: 0.0000,
            field: 'quality_score',
            validate: {
                min: 0.0,
                max: 1.0
            }
        },
        algorithm_version: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: '2.0.0',
            field: 'algorithm_version'
        },
        device_id: {
            type: DataTypes.STRING(255),
            field: 'device_id'
        },

        // 📱 METADATOS
        capture_metadata: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'capture_metadata'
        },
        verification_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'verification_count'
        },
        last_verification_at: {
            type: DataTypes.DATE,
            field: 'last_verification_at'
        },

        // ⏰ CONTROL
        expires_at: {
            type: DataTypes.DATE,
            field: 'expires_at'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'biometric_templates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['company_id', 'employee_id']
            },
            {
                fields: ['company_id', 'quality_score']
            },
            {
                unique: true,
                fields: ['company_id', 'template_hash']
            },
            {
                fields: ['company_id', 'is_active', 'expires_at']
            }
        ]
    });

    // ═══════════════════════════════════════════════════════════════
    // 🧠 MODELO BIOMETRIC AI ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    const BiometricAIAnalysis = sequelize.define('BiometricAIAnalysis', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        employee_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        template_id: {
            type: DataTypes.UUID,
            field: 'template_id',
            references: {
                model: 'biometric_templates',
                key: 'id'
            }
        },

        // 🎭 ANÁLISIS HARVARD EMOTINET
        emotion_analysis: {
            type: DataTypes.JSONB,
            field: 'emotion_analysis',
            comment: 'Análisis emocional completo'
        },
        emotion_confidence: {
            type: DataTypes.DECIMAL(5,4),
            field: 'emotion_confidence'
        },

        // 🧭 ANÁLISIS MIT BEHAVIOR
        behavior_patterns: {
            type: DataTypes.JSONB,
            field: 'behavior_patterns',
            comment: 'Patrones comportamentales detectados'
        },
        behavior_confidence: {
            type: DataTypes.DECIMAL(5,4),
            field: 'behavior_confidence'
        },

        // 👤 ANÁLISIS STANFORD FACIAL
        facial_features: {
            type: DataTypes.JSONB,
            field: 'facial_features',
            comment: 'Características faciales extraídas'
        },
        facial_landmarks: {
            type: DataTypes.JSONB,
            field: 'facial_landmarks',
            comment: 'Puntos de referencia faciales'
        },

        // 🏥 WHO-GDHI HEALTH INDICATORS
        health_indicators: {
            type: DataTypes.JSONB,
            field: 'health_indicators',
            comment: 'Indicadores de salud'
        },
        fatigue_score: {
            type: DataTypes.DECIMAL(5,4),
            field: 'fatigue_score',
            comment: 'Puntuación de fatiga (0-1)'
        },
        stress_score: {
            type: DataTypes.DECIMAL(5,4),
            field: 'stress_score',
            comment: 'Puntuación de estrés (0-1)'
        },

        // ⚡ PROCESAMIENTO
        processed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'processed_at'
        },
        processing_time_ms: {
            type: DataTypes.INTEGER,
            field: 'processing_time_ms'
        },
        analysis_version: {
            type: DataTypes.STRING(20),
            defaultValue: '1.0.0',
            field: 'analysis_version'
        }
    }, {
        tableName: 'biometric_ai_analysis',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            {
                fields: ['company_id', 'processed_at']
            },
            {
                fields: ['employee_id', 'processed_at']
            },
            {
                fields: ['template_id']
            }
        ]
    });

    // ═══════════════════════════════════════════════════════════════
    // 📱 MODELO BIOMETRIC SCANS (ya creado en extend_users_biometric.sql)
    // ═══════════════════════════════════════════════════════════════
    const BiometricScan = sequelize.define('BiometricScan', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        device_id: {
            type: DataTypes.STRING(255),
            field: 'device_id'
        },
        device_type: {
            type: DataTypes.STRING(50),
            defaultValue: 'unknown',
            field: 'device_type'
        },
        scan_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'attendance',
            field: 'scan_type'
        },

        // 🧬 DATOS BIOMÉTRICOS BÁSICOS
        template_data: {
            type: DataTypes.TEXT,
            field: 'template_data'
        },
        image_quality: {
            type: DataTypes.DECIMAL(4,2),
            defaultValue: 0.0,
            field: 'image_quality'
        },
        confidence_score: {
            type: DataTypes.DECIMAL(4,2),
            defaultValue: 0.0,
            field: 'confidence_score'
        },
        processing_time_ms: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'processing_time_ms'
        },

        // 📅 TIMESTAMPS
        capture_timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'capture_timestamp'
        },
        server_timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'server_timestamp'
        },

        // 🧠 ANÁLISIS IA
        emotion_analysis: {
            type: DataTypes.JSONB,
            field: 'emotion_analysis'
        },
        fatigue_score: {
            type: DataTypes.DECIMAL(4,2),
            field: 'fatigue_score'
        },
        stress_indicators: {
            type: DataTypes.JSONB,
            field: 'stress_indicators'
        },
        behavioral_flags: {
            type: DataTypes.JSONB,
            field: 'behavioral_flags'
        },
        ai_processed_at: {
            type: DataTypes.DATE,
            field: 'ai_processed_at'
        },

        // ✅ CONTROL DE CALIDAD
        quality_flags: {
            type: DataTypes.JSONB,
            field: 'quality_flags'
        },
        validation_status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            field: 'validation_status'
        },
        validated_by: {
            type: DataTypes.UUID,
            field: 'validated_by'
        },
        validated_at: {
            type: DataTypes.DATE,
            field: 'validated_at'
        },

        // 🌐 AUDITORÍA
        ip_address: {
            type: DataTypes.INET,
            field: 'ip_address'
        },
        user_agent: {
            type: DataTypes.TEXT,
            field: 'user_agent'
        },
        location_data: {
            type: DataTypes.JSONB,
            field: 'location_data'
        }
    }, {
        tableName: 'biometric_scans',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['company_id', 'server_timestamp']
            },
            {
                fields: ['user_id', 'server_timestamp']
            },
            {
                fields: ['ai_processed_at', 'company_id']
            },
            {
                fields: ['scan_type', 'company_id', 'server_timestamp']
            }
        ]
    });

    // ═══════════════════════════════════════════════════════════════
    // 🔧 RELACIONES ENTRE MODELOS
    // ═══════════════════════════════════════════════════════════════

    // BiometricTemplate relaciones
    BiometricTemplate.belongsTo(sequelize.models.Company || {}, {
        foreignKey: 'company_id',
        as: 'company'
    });

    // BiometricAIAnalysis relaciones
    BiometricAIAnalysis.belongsTo(sequelize.models.Company || {}, {
        foreignKey: 'company_id',
        as: 'company'
    });
    BiometricAIAnalysis.belongsTo(BiometricTemplate, {
        foreignKey: 'template_id',
        as: 'template'
    });

    // BiometricScan relaciones
    BiometricScan.belongsTo(sequelize.models.Company || {}, {
        foreignKey: 'company_id',
        as: 'company'
    });

    return {
        BiometricTemplate,
        BiometricAIAnalysis,
        BiometricScan
    };
}

module.exports = { initBiometricModels };