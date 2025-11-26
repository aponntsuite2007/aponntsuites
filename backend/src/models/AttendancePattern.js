const { DataTypes } = require('sequelize');

/**
 * AttendancePattern Model
 *
 * Patrones de comportamiento detectados automáticamente
 * Múltiples registros por empleado (histórico)
 */
module.exports = (sequelize) => {
  const AttendancePattern = sequelize.define('AttendancePattern', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },

    // Referencias
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },

    // Identificación del patrón
    pattern_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    pattern_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    pattern_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['negative', 'positive', 'neutral']]
      }
    },

    // Datos del patrón
    detection_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    severity: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['low', 'medium', 'high', 'critical']]
      }
    },
    confidence_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    occurrences_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },

    // Contexto
    detection_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    detection_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    threshold_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    actual_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    // Impacto
    scoring_impact: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    requires_action: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    action_taken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    action_taken_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    action_taken_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    // Status
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'resolved', 'ignored']]
      }
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Timestamps
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'attendance_patterns',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // Índices (ya creados en migración)
    indexes: [
      {
        fields: ['user_id', 'detection_date'],
        name: 'idx_patterns_user'
      },
      {
        fields: ['company_id', 'status'],
        name: 'idx_patterns_company_active'
      },
      {
        fields: ['company_id', 'severity'],
        name: 'idx_patterns_severity'
      },
      {
        fields: ['pattern_category', 'detection_date'],
        name: 'idx_patterns_category'
      },
      {
        fields: ['pattern_id', 'company_id'],
        name: 'idx_patterns_pattern_id'
      }
    ],

    // Scopes
    scopes: {
      active: {
        where: { status: 'active' }
      },
      negative: {
        where: { pattern_category: 'negative' }
      },
      positive: {
        where: { pattern_category: 'positive' }
      },
      critical: {
        where: {
          severity: 'critical',
          status: 'active'
        }
      },
      requiresAction: {
        where: {
          requires_action: true,
          status: 'active'
        }
      },
      byUser: (userId) => ({
        where: { user_id: userId }
      }),
      byCompany: (companyId) => ({
        where: { company_id: companyId }
      }),
      recent: (days = 30) => ({
        where: {
          detection_date: {
            [sequelize.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      })
    }
  });

  // Class methods
  AttendancePattern.getUserActivePatterns = async function(userId, companyId) {
    return await this.findAll({
      where: {
        user_id: userId,
        company_id: companyId,
        status: 'active'
      },
      order: [['severity', 'DESC'], ['detection_date', 'DESC']]
    });
  };

  AttendancePattern.getCompanyCriticalPatterns = async function(companyId) {
    return await this.findAll({
      where: {
        company_id: companyId,
        severity: 'critical',
        status: 'active'
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['user_id', 'firstName', 'lastName', 'employee_id']
      }],
      order: [['detection_date', 'DESC']]
    });
  };

  AttendancePattern.getPatternStats = async function(companyId, patternId) {
    const { fn, col } = sequelize;
    return await this.findOne({
      where: {
        company_id: companyId,
        pattern_id: patternId
      },
      attributes: [
        [fn('COUNT', col('id')), 'total_occurrences'],
        [fn('COUNT', col('id')), 'FILTER (WHERE status = \'active\')', 'active_count'],
        [fn('AVG', col('confidence_score')), 'avg_confidence'],
        [fn('AVG', col('scoring_impact')), 'avg_impact']
      ],
      raw: true
    });
  };

  // Instance methods
  AttendancePattern.prototype.isCritical = function() {
    return this.severity === 'critical';
  };

  AttendancePattern.prototype.isActive = function() {
    return this.status === 'active';
  };

  AttendancePattern.prototype.isNegative = function() {
    return this.pattern_category === 'negative';
  };

  AttendancePattern.prototype.resolve = async function(actionTaken, resolvedBy) {
    this.status = 'resolved';
    this.resolved_at = new Date();
    this.action_taken = actionTaken;
    this.action_taken_by = resolvedBy;
    this.action_taken_at = new Date();
    return await this.save();
  };

  AttendancePattern.prototype.ignore = async function(reason) {
    this.status = 'ignored';
    this.notes = reason;
    return await this.save();
  };

  AttendancePattern.prototype.getSummary = function() {
    return {
      pattern: {
        id: this.pattern_id,
        name: this.pattern_name,
        category: this.pattern_category
      },
      detection: {
        date: this.detection_date,
        severity: this.severity,
        confidence: parseFloat(this.confidence_score),
        period: {
          start: this.detection_period_start,
          end: this.detection_period_end
        }
      },
      impact: {
        scoring: parseFloat(this.scoring_impact),
        requires_action: this.requires_action
      },
      metrics: {
        threshold: parseFloat(this.threshold_value),
        actual: parseFloat(this.actual_value),
        occurrences: this.occurrences_count,
        deviation: this.actual_value && this.threshold_value
          ? ((this.actual_value - this.threshold_value) / this.threshold_value) * 100
          : null
      },
      status: {
        current: this.status,
        resolved_at: this.resolved_at,
        action_taken: this.action_taken
      }
    };
  };

  return AttendancePattern;
};
