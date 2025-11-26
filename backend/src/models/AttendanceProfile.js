const { DataTypes } = require('sequelize');

/**
 * AttendanceProfile Model
 *
 * Perfil de asistencia y scoring por empleado
 * 1 registro por user_id + company_id
 * Actualizado diariamente por cron job
 */
module.exports = (sequelize) => {
  const AttendanceProfile = sequelize.define('AttendanceProfile', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },

    // Referencias (multi-tenant)
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
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    department_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    shift_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    branch_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },

    // Scoring components (0-100 cada uno)
    scoring_total: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    scoring_punctuality: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    scoring_absence: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    scoring_late_arrival: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    scoring_early_departure: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100
      }
    },

    // Métricas calculadas (últimos 90 días)
    total_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    present_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    absent_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    late_arrivals_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    early_departures_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    tolerance_usage_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    avg_late_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    overtime_hours_total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },

    // Patrones detectados (arrays PostgreSQL)
    active_patterns: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: []
    },
    positive_patterns: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: []
    },
    negative_patterns: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: []
    },

    // Metadata
    last_calculated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    calculation_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    calculation_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    profile_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['Ejemplar', 'Promedio Alto', 'Promedio', 'Necesita Mejora', 'Problemático']]
      }
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
    tableName: 'attendance_profiles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // Índices (ya creados en migración, aquí para referencia)
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'company_id'],
        name: 'idx_attendance_profiles_user_company'
      },
      {
        fields: ['company_id', 'scoring_total'],
        name: 'idx_attendance_profiles_scoring'
      },
      {
        fields: ['department_id', 'scoring_total'],
        name: 'idx_attendance_profiles_dept'
      },
      {
        fields: ['company_id', 'profile_category'],
        name: 'idx_attendance_profiles_category'
      }
    ],

    // Scopes útiles
    scopes: {
      active: {
        where: {
          scoring_total: {
            [sequelize.Sequelize.Op.gte]: 0
          }
        }
      },
      ejemplar: {
        where: {
          profile_category: 'Ejemplar'
        }
      },
      problematico: {
        where: {
          profile_category: 'Problemático'
        }
      },
      byCompany: (companyId) => ({
        where: { company_id: companyId }
      }),
      topPerformers: (limit = 10) => ({
        order: [['scoring_total', 'DESC']],
        limit
      }),
      bottomPerformers: (limit = 10) => ({
        order: [['scoring_total', 'ASC']],
        limit
      })
    }
  });

  // Class methods
  AttendanceProfile.getCompanyStats = async function(companyId) {
    const { fn, col } = sequelize;
    return await this.findOne({
      where: { company_id: companyId },
      attributes: [
        [fn('AVG', col('scoring_total')), 'avg_scoring'],
        [fn('MIN', col('scoring_total')), 'min_scoring'],
        [fn('MAX', col('scoring_total')), 'max_scoring'],
        [fn('COUNT', col('id')), 'total_employees']
      ],
      raw: true
    });
  };

  AttendanceProfile.getTopPerformers = async function(companyId, limit = 10) {
    return await this.findAll({
      where: { company_id: companyId },
      order: [['scoring_total', 'DESC']],
      limit,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['user_id', 'firstName', 'lastName', 'employee_id']
      }]
    });
  };

  // Instance methods
  AttendanceProfile.prototype.isExemplar = function() {
    return this.scoring_total >= 90;
  };

  AttendanceProfile.prototype.needsImprovement = function() {
    return this.scoring_total < 60;
  };

  AttendanceProfile.prototype.hasNegativePatterns = function() {
    return this.negative_patterns && this.negative_patterns.length > 0;
  };

  AttendanceProfile.prototype.getScoreBreakdown = function() {
    return {
      total: parseFloat(this.scoring_total),
      components: {
        punctuality: {
          score: parseFloat(this.scoring_punctuality),
          weight: 0.40,
          contribution: parseFloat(this.scoring_punctuality) * 0.40
        },
        absence: {
          score: parseFloat(this.scoring_absence),
          weight: 0.30,
          contribution: parseFloat(this.scoring_absence) * 0.30
        },
        lateArrival: {
          score: parseFloat(this.scoring_late_arrival),
          weight: 0.20,
          contribution: parseFloat(this.scoring_late_arrival) * 0.20
        },
        earlyDeparture: {
          score: parseFloat(this.scoring_early_departure),
          weight: 0.10,
          contribution: parseFloat(this.scoring_early_departure) * 0.10
        }
      },
      category: this.profile_category,
      metrics: {
        total_days: this.total_days,
        present_days: this.present_days,
        absent_days: this.absent_days,
        attendance_rate: this.total_days > 0 ? (this.present_days / this.total_days) * 100 : 0
      }
    };
  };

  return AttendanceProfile;
};
