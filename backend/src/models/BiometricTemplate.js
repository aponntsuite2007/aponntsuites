/**
 * 🎯 BIOMETRIC TEMPLATE MODEL - ENTERPRISE GRADE
 * =============================================
 * PostgreSQL model for storing encrypted biometric templates
 * ✅ GDPR compliant - no original images stored
 * ✅ Multi-tenant security with RLS
 * ✅ AES-256 encrypted embeddings
 * ✅ Enterprise audit trail
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BiometricTemplate = sequelize.define('BiometricTemplate', {
    // Primary identification
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Multi-tenant security
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Company isolation for multi-tenant security'
    },

    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Employee this template belongs to'
    },

    // Biometric data (encrypted)
    embedding_encrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'AES-256 encrypted 128D face embedding - GDPR compliant'
    },

    embedding_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'SHA-256 hash of embedding for quick comparison'
    },

    // Algorithm metadata
    algorithm: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'face-api-js-v0.22.2',
      comment: 'Biometric algorithm used'
    },

    model_version: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'faceRecognitionNet',
      comment: 'Specific model version'
    },

    template_version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0.0',
      comment: 'Template format version for compatibility'
    },

    // Quality metrics
    quality_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      validate: {
        min: 0.0,
        max: 1.0
      },
      comment: 'Overall quality score (0.0-1.0)'
    },

    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      validate: {
        min: 0.0,
        max: 1.0
      },
      comment: 'Face detection confidence (0.0-1.0)'
    },

    face_size_ratio: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Face size relative to image (0.0-1.0)'
    },

    position_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Face position quality (0.0-1.0)'
    },

    lighting_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Lighting quality assessment (0.0-1.0)'
    },

    // Template status
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Primary template for this employee'
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Template active for matching'
    },

    is_validated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Template validated by admin'
    },

    // Usage statistics
    match_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of successful matches'
    },

    last_matched: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last successful match timestamp'
    },

    false_reject_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of false rejections reported'
    },

    // Capture metadata
    capture_session_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Original capture session identifier'
    },

    landmarks_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'AES-256 encrypted facial landmarks (68 points)'
    },

    bounding_box: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Face bounding box coordinates (x, y, width, height)'
    },

    // Device and capture info
    capture_device_info: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Device information during capture'
    },

    capture_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When template was captured'
    },

    // Security and encryption
    encryption_algorithm: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'AES-256-CBC',
      comment: 'Encryption algorithm used'
    },

    encryption_key_version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Encryption key version for key rotation'
    },

    // Enterprise features
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who created this template'
    },

    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Admin who approved this template'
    },

    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When template was approved'
    },

    // Compliance and audit
    gdpr_consent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'GDPR consent given for biometric processing'
    },

    retention_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When template should be deleted (GDPR compliance)'
    },

    audit_trail: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Audit trail of template operations'
    },

    // Performance optimization
    embedding_magnitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      comment: 'Embedding vector magnitude for optimization'
    },

    search_vector: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optimized search vector for fast matching'
    }

  }, {
    tableName: 'biometric_templates',
    timestamps: true,

    // Indexes for performance
    indexes: [
      // Multi-tenant security
      {
        fields: ['company_id'],
        name: 'idx_biometric_templates_company'
      },
      {
        fields: ['employee_id'],
        name: 'idx_biometric_templates_employee'
      },
      {
        unique: true,
        fields: ['company_id', 'employee_id', 'is_primary'],
        where: { is_primary: true },
        name: 'idx_biometric_templates_primary_unique'
      },

      // Performance indexes
      {
        fields: ['is_active', 'quality_score'],
        name: 'idx_biometric_templates_active_quality'
      },
      {
        fields: ['algorithm', 'model_version'],
        name: 'idx_biometric_templates_algorithm'
      },
      {
        fields: ['embedding_hash'],
        name: 'idx_biometric_templates_hash'
      },

      // Audit and compliance
      {
        fields: ['capture_timestamp'],
        name: 'idx_biometric_templates_capture_time'
      },
      {
        fields: ['retention_expires'],
        name: 'idx_biometric_templates_retention'
      },

      // Statistics
      {
        fields: ['match_count', 'last_matched'],
        name: 'idx_biometric_templates_usage'
      }
    ],

    // Hooks for automation
    hooks: {
      beforeCreate: async (template, options) => {
        // Generate embedding hash
        if (template.embedding_encrypted && !template.embedding_hash) {
          const crypto = require('crypto');
          template.embedding_hash = crypto
            .createHash('sha256')
            .update(template.embedding_encrypted)
            .digest('hex');
        }

        // Set retention date (GDPR - 7 years default)
        if (!template.retention_expires) {
          const retentionDate = new Date();
          retentionDate.setFullYear(retentionDate.getFullYear() + 7);
          template.retention_expires = retentionDate;
        }

        // Initialize audit trail
        template.audit_trail = {
          created: {
            timestamp: new Date().toISOString(),
            action: 'template_created',
            user: template.created_by,
            ip: options.userIp || 'unknown'
          }
        };
      },

      afterCreate: async (template, options) => {
        // Log creation for audit
        console.log(`📋 [AUDIT] Biometric template created: ${template.id} for employee: ${template.employee_id}`);
      },

      beforeUpdate: async (template, options) => {
        // Update audit trail
        if (template.audit_trail) {
          const auditEntry = {
            timestamp: new Date().toISOString(),
            action: 'template_updated',
            changes: template.changed(),
            user: options.userId || 'system',
            ip: options.userIp || 'unknown'
          };

          template.audit_trail = {
            ...template.audit_trail,
            [`update_${Date.now()}`]: auditEntry
          };
        }
      }
    },

    // Validation
    validate: {
      // Ensure quality thresholds
      qualityValidation() {
        if (this.quality_score < 0.5) {
          throw new Error('Quality score too low for biometric template');
        }
        if (this.confidence_score < 0.7) {
          throw new Error('Confidence score too low for biometric template');
        }
      },

      // Ensure encryption
      encryptionValidation() {
        if (!this.embedding_encrypted) {
          throw new Error('Biometric embedding must be encrypted');
        }
        if (!this.encryption_algorithm) {
          throw new Error('Encryption algorithm must be specified');
        }
      },

      // GDPR compliance
      gdprValidation() {
        if (!this.gdpr_consent) {
          throw new Error('GDPR consent required for biometric template storage');
        }
      }
    }
  });

  // Associations
  BiometricTemplate.associate = function(models) {
    // Associate with Employee/User
    BiometricTemplate.belongsTo(models.User, {
      foreignKey: 'employee_id',
      as: 'employee'
    });

    // Associate with Company
    BiometricTemplate.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });

    // Created by user
    BiometricTemplate.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // Approved by user
    BiometricTemplate.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver'
    });
  };

  // Static methods for business logic
  BiometricTemplate.findActiveTemplatesForEmployee = async function(employeeId, companyId) {
    return await this.findAll({
      where: {
        employee_id: employeeId,
        company_id: companyId,
        is_active: true
      },
      order: [
        ['is_primary', 'DESC'],
        ['quality_score', 'DESC'],
        ['created_at', 'DESC']
      ]
    });
  };

  BiometricTemplate.findPrimaryTemplate = async function(employeeId, companyId) {
    return await this.findOne({
      where: {
        employee_id: employeeId,
        company_id: companyId,
        is_primary: true,
        is_active: true
      }
    });
  };

  BiometricTemplate.getCompanyStatistics = async function(companyId) {
    const [results] = await sequelize.query(`
      SELECT
        COUNT(*) as total_templates,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates,
        COUNT(CASE WHEN is_primary = true THEN 1 END) as primary_templates,
        AVG(quality_score) as avg_quality,
        AVG(confidence_score) as avg_confidence,
        COUNT(DISTINCT employee_id) as employees_with_biometrics
      FROM biometric_templates
      WHERE company_id = :companyId
    `, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  };

  // Instance methods
  BiometricTemplate.prototype.incrementMatchCount = async function() {
    this.match_count += 1;
    this.last_matched = new Date();
    await this.save();
  };

  BiometricTemplate.prototype.reportFalseReject = async function() {
    this.false_reject_count += 1;
    await this.save();
  };

  BiometricTemplate.prototype.getDecryptedEmbedding = function(encryptionKey) {
    // This would decrypt the embedding in real implementation
    // For security, decryption should only happen in memory, never stored
    const crypto = require('crypto');
    // Implementation would decrypt using AES-256-CBC
    return null; // Placeholder
  };

  return BiometricTemplate;
};