/**
 * E2EAdvancedExecution Model
 *
 * Modelo para el sistema E2E Advanced Testing (versión 2.0).
 * Representa una ejecución que puede incluir múltiples fases y módulos.
 *
 * NOTA: Este modelo reemplazará eventualmente a TestExecution (sistema anterior).
 *
 * @module models/E2EAdvancedExecution
 * @version 2.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const E2EAdvancedExecution = sequelize.define('E2EAdvancedExecution', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    execution_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
      comment: 'UUID único de la ejecución'
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'running',
      validate: {
        isIn: [['running', 'passed', 'failed', 'warning', 'cancelled']]
      },
      comment: 'Estado de la ejecución'
    },

    mode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['full', 'phases', 'modules', 'custom']]
      },
      comment: 'Modo de ejecución'
    },

    phases_executed: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array de fases ejecutadas'
    },

    modules_tested: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array de módulos testeados ([] = TODOS)'
    },

    total_tests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    tests_passed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    tests_failed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    tests_skipped: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    overall_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      comment: 'Confidence score global (0-100)'
    },

    production_ready: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si overall_score >= 95%'
    },

    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Duración en milisegundos'
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Usuario que ejecutó (UUID)'
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Empresa que ejecutó'
    },

    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Metadata adicional'
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },

    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    }
  }, {
    tableName: 'e2e_advanced_executions',  // Tabla específica E2E Advanced
    timestamps: false,
    indexes: [
      { fields: ['execution_id'] },
      { fields: ['status'] },
      { fields: ['company_id'] },
      { fields: ['created_at'] },
      { fields: ['overall_score'] },
      { fields: ['production_ready'] }
    ]
  });

  /**
   * Asociaciones
   */
  E2EAdvancedExecution.associate = (models) => {
    // Pertenece a User (si existe)
    if (models.User) {
      E2EAdvancedExecution.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    // Pertenece a Company (si existe)
    if (models.Company) {
      E2EAdvancedExecution.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }

    // Tiene muchos resultados detallados
    E2EAdvancedExecution.hasMany(models.TestResultDetailed, {
      foreignKey: 'execution_id',
      sourceKey: 'execution_id',
      as: 'detailedResults'
    });

    // Tiene un confidence score
    E2EAdvancedExecution.hasOne(models.ConfidenceScore, {
      foreignKey: 'execution_id',
      sourceKey: 'execution_id',
      as: 'confidenceScore'
    });
  };

  /**
   * Métodos de instancia
   */

  E2EAdvancedExecution.prototype.getPassRate = function() {
    if (this.total_tests === 0) return 0;
    return parseFloat(((this.tests_passed / this.total_tests) * 100).toFixed(2));
  };

  E2EAdvancedExecution.prototype.getFailRate = function() {
    if (this.total_tests === 0) return 0;
    return parseFloat(((this.tests_failed / this.total_tests) * 100).toFixed(2));
  };

  E2EAdvancedExecution.prototype.getFormattedDuration = function() {
    const ms = this.duration;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
    return `${(ms / 3600000).toFixed(2)}h`;
  };

  E2EAdvancedExecution.prototype.isCompleted = function() {
    return ['passed', 'failed', 'cancelled'].includes(this.status);
  };

  /**
   * Métodos de clase (statics)
   */

  E2EAdvancedExecution.getRecent = async function(limit = 10, companyId = null) {
    const where = {};
    if (companyId) where.company_id = companyId;

    return await this.findAll({
      where,
      limit,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: sequelize.models.Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });
  };

  E2EAdvancedExecution.getStats = async function(companyId = null, daysBack = 30) {
    const { Op } = require('sequelize');
    const where = {
      created_at: {
        [Op.gte]: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      }
    };
    if (companyId) where.company_id = companyId;

    const executions = await this.findAll({ where });

    return {
      totalExecutions: executions.length,
      passedExecutions: executions.filter(e => e.status === 'passed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
      averageScore: executions.length > 0
        ? (executions.reduce((sum, e) => sum + parseFloat(e.overall_score), 0) / executions.length).toFixed(2)
        : 0,
      productionReadyCount: executions.filter(e => e.production_ready).length,
      averageDuration: executions.length > 0
        ? Math.round(executions.reduce((sum, e) => sum + e.duration, 0) / executions.length)
        : 0,
      totalTestsRun: executions.reduce((sum, e) => sum + e.total_tests, 0)
    };
  };

  E2EAdvancedExecution.findByExecutionId = async function(executionId) {
    return await this.findOne({
      where: { execution_id: executionId },
      include: [
        {
          model: sequelize.models.TestResultDetailed,
          as: 'detailedResults',
          required: false
        },
        {
          model: sequelize.models.ConfidenceScore,
          as: 'confidenceScore',
          required: false
        },
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: sequelize.models.Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });
  };

  return E2EAdvancedExecution;
};
