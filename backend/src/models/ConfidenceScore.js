/**
 * ConfidenceScore Model
 *
 * Almacena el confidence score calculado para cada ejecución.
 * Este score determina si el sistema está listo para producción (>= 95%).
 *
 * @module models/ConfidenceScore
 * @version 2.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConfidenceScore = sequelize.define('ConfidenceScore', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    execution_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
      comment: 'UUID de la ejecución'
    },

    overall_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Score global (0-100)'
    },

    // Scores por fase (NULL si no se ejecutó)
    e2e_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },

    load_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },

    security_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },

    multi_tenant_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },

    database_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },

    monitoring_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },

    edge_cases_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },

    production_ready: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True si overall_score >= 95%'
    },

    confidence_level: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['production', 'high', 'medium', 'low']]
      },
      comment: 'Nivel de confianza'
    },

    blockers: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Blockers que impiden deployment'
    },

    calculation_breakdown: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Breakdown detallado del cálculo'
    },

    calculated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'calculated_at'
    }
  }, {
    tableName: 'e2e_confidence_scores',  // Tabla específica E2E Advanced
    timestamps: false,
    indexes: [
      { fields: ['execution_id'] },
      { fields: ['overall_score'] },
      { fields: ['production_ready'] },
      { fields: ['confidence_level'] },
      { fields: ['calculated_at'] }
    ]
  });

  /**
   * Asociaciones
   */
  ConfidenceScore.associate = (models) => {
    // Pertenece a E2EAdvancedExecution
    ConfidenceScore.belongsTo(models.E2EAdvancedExecution, {
      foreignKey: 'execution_id',
      targetKey: 'execution_id',
      as: 'execution'
    });
  };

  /**
   * Métodos de instancia
   */

  ConfidenceScore.prototype.getScoresByPhase = function() {
    return {
      e2e: this.e2e_score,
      load: this.load_score,
      security: this.security_score,
      multiTenant: this.multi_tenant_score,
      database: this.database_score,
      monitoring: this.monitoring_score,
      edgeCases: this.edge_cases_score
    };
  };

  ConfidenceScore.prototype.getCriticalBlockers = function() {
    return (this.blockers || []).filter(b => b.severity === 'critical');
  };

  ConfidenceScore.prototype.getHighBlockers = function() {
    return (this.blockers || []).filter(b => b.severity === 'high');
  };

  ConfidenceScore.prototype.hasBlockers = function() {
    return (this.blockers || []).length > 0;
  };

  ConfidenceScore.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return {
      overall: parseFloat(values.overall_score),
      e2e: values.e2e_score ? parseFloat(values.e2e_score) : null,
      load: values.load_score ? parseFloat(values.load_score) : null,
      security: values.security_score ? parseFloat(values.security_score) : null,
      multiTenant: values.multi_tenant_score ? parseFloat(values.multi_tenant_score) : null,
      database: values.database_score ? parseFloat(values.database_score) : null,
      monitoring: values.monitoring_score ? parseFloat(values.monitoring_score) : null,
      edgeCases: values.edge_cases_score ? parseFloat(values.edge_cases_score) : null,
      productionReady: values.production_ready,
      level: values.confidence_level,
      blockers: values.blockers || [],
      calculatedAt: values.calculated_at
    };
  };

  /**
   * Métodos de clase (statics)
   */

  /**
   * Trend de confidence score (últimos N días)
   */
  ConfidenceScore.getTrend = async function(daysBack = 30) {
    const { Op, fn, col } = require('sequelize');
    const scores = await this.findAll({
      attributes: [
        [fn('DATE', col('calculated_at')), 'date'],
        [fn('ROUND', fn('AVG', col('overall_score')), 2), 'average_score'],
        [fn('COUNT', col('*')), 'total_executions'],
        [fn('COUNT', sequelize.literal("CASE WHEN production_ready = TRUE THEN 1 END")), 'production_ready_count']
      ],
      where: {
        calculated_at: {
          [Op.gte]: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      },
      group: [fn('DATE', col('calculated_at'))],
      order: [[fn('DATE', col('calculated_at')), 'DESC']],
      raw: true
    });

    return scores.map(s => ({
      date: s.date,
      average_score: parseFloat(s.average_score),
      total_executions: parseInt(s.total_executions),
      production_ready_count: parseInt(s.production_ready_count)
    }));
  };

  /**
   * Compara confidence score con baseline
   */
  ConfidenceScore.compareWithBaseline = async function(currentExecutionId, baselineExecutionId) {
    const current = await this.findOne({ where: { execution_id: currentExecutionId } });
    const baseline = await this.findOne({ where: { execution_id: baselineExecutionId } });

    if (!current || !baseline) {
      throw new Error('Execution not found');
    }

    const phases = ['overall', 'e2e', 'load', 'security', 'multiTenant', 'database', 'monitoring', 'edgeCases'];
    const comparison = [];

    phases.forEach(phase => {
      const fieldName = phase === 'overall' ? 'overall_score' :
                        phase === 'multiTenant' ? 'multi_tenant_score' :
                        phase === 'edgeCases' ? 'edge_cases_score' :
                        `${phase}_score`;

      const currentScore = current[fieldName] ? parseFloat(current[fieldName]) : null;
      const baselineScore = baseline[fieldName] ? parseFloat(baseline[fieldName]) : null;

      if (currentScore !== null && baselineScore !== null) {
        const diff = currentScore - baselineScore;
        let status = 'stable';
        if (diff >= 5) status = 'improved';
        else if (diff <= -5) status = 'regression';

        comparison.push({
          phase,
          baseline_score: baselineScore,
          current_score: currentScore,
          diff: parseFloat(diff.toFixed(2)),
          status
        });
      }
    });

    // Ordenar por diferencia absoluta (regresiones primero)
    comparison.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return comparison;
  };

  /**
   * Obtiene estadísticas globales de confidence scores
   */
  ConfidenceScore.getGlobalStats = async function(daysBack = 30) {
    const { Op, fn, col } = require('sequelize');
    const scores = await this.findAll({
      where: {
        calculated_at: {
          [Op.gte]: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (scores.length === 0) {
      return null;
    }

    const avgScores = {
      overall: 0,
      e2e: 0,
      load: 0,
      security: 0,
      multiTenant: 0,
      database: 0,
      monitoring: 0,
      edgeCases: 0
    };

    const counts = {
      e2e: 0,
      load: 0,
      security: 0,
      multiTenant: 0,
      database: 0,
      monitoring: 0,
      edgeCases: 0
    };

    scores.forEach(score => {
      avgScores.overall += parseFloat(score.overall_score);
      if (score.e2e_score) {
        avgScores.e2e += parseFloat(score.e2e_score);
        counts.e2e++;
      }
      if (score.load_score) {
        avgScores.load += parseFloat(score.load_score);
        counts.load++;
      }
      if (score.security_score) {
        avgScores.security += parseFloat(score.security_score);
        counts.security++;
      }
      if (score.multi_tenant_score) {
        avgScores.multiTenant += parseFloat(score.multi_tenant_score);
        counts.multiTenant++;
      }
      if (score.database_score) {
        avgScores.database += parseFloat(score.database_score);
        counts.database++;
      }
      if (score.monitoring_score) {
        avgScores.monitoring += parseFloat(score.monitoring_score);
        counts.monitoring++;
      }
      if (score.edge_cases_score) {
        avgScores.edgeCases += parseFloat(score.edge_cases_score);
        counts.edgeCases++;
      }
    });

    return {
      total_executions: scores.length,
      production_ready_count: scores.filter(s => s.production_ready).length,
      production_ready_rate: parseFloat(((scores.filter(s => s.production_ready).length / scores.length) * 100).toFixed(2)),
      average_scores: {
        overall: parseFloat((avgScores.overall / scores.length).toFixed(2)),
        e2e: counts.e2e > 0 ? parseFloat((avgScores.e2e / counts.e2e).toFixed(2)) : null,
        load: counts.load > 0 ? parseFloat((avgScores.load / counts.load).toFixed(2)) : null,
        security: counts.security > 0 ? parseFloat((avgScores.security / counts.security).toFixed(2)) : null,
        multiTenant: counts.multiTenant > 0 ? parseFloat((avgScores.multiTenant / counts.multiTenant).toFixed(2)) : null,
        database: counts.database > 0 ? parseFloat((avgScores.database / counts.database).toFixed(2)) : null,
        monitoring: counts.monitoring > 0 ? parseFloat((avgScores.monitoring / counts.monitoring).toFixed(2)) : null,
        edgeCases: counts.edgeCases > 0 ? parseFloat((avgScores.edgeCases / counts.edgeCases).toFixed(2)) : null
      }
    };
  };

  return ConfidenceScore;
};
