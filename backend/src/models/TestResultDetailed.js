/**
 * TestResultDetailed Model
 *
 * Almacena resultados detallados de cada fase/módulo ejecutado
 * en el E2E Advanced Testing System.
 *
 * @module models/TestResultDetailed
 * @version 2.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TestResultDetailed = sequelize.define('TestResultDetailed', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    execution_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: 'UUID de la ejecución padre'
    },

    phase_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['e2e', 'load', 'security', 'multiTenant', 'database', 'monitoring', 'edgeCases']]
      },
      comment: 'Nombre de la fase'
    },

    module_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Módulo testeado (NULL = global)'
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['passed', 'failed', 'warning', 'skipped']]
      },
      comment: 'Estado del test'
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

    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Duración en milisegundos'
    },

    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensaje de error (si falló)'
    },

    error_stack: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Stack trace completo (si falló)'
    },

    metrics: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Métricas específicas de la fase (JSON)'
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'e2e_test_results_detailed',  // Tabla específica E2E Advanced
    timestamps: false,
    indexes: [
      { fields: ['execution_id'] },
      { fields: ['phase_name'] },
      { fields: ['module_name'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['execution_id', 'phase_name', 'module_name'] },
      { fields: ['module_name', 'status', 'created_at'] }
    ]
  });

  /**
   * Asociaciones
   */
  TestResultDetailed.associate = (models) => {
    // Pertenece a E2EAdvancedExecution
    TestResultDetailed.belongsTo(models.E2EAdvancedExecution, {
      foreignKey: 'execution_id',
      targetKey: 'execution_id',
      as: 'execution'
    });
  };

  /**
   * Métodos de instancia
   */

  TestResultDetailed.prototype.getTotalTests = function() {
    return this.tests_passed + this.tests_failed + this.tests_skipped;
  };

  TestResultDetailed.prototype.getPassRate = function() {
    const total = this.getTotalTests();
    if (total === 0) return 0;
    return parseFloat(((this.tests_passed / total) * 100).toFixed(2));
  };

  TestResultDetailed.prototype.getFormattedDuration = function() {
    const ms = this.duration;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
    return `${(ms / 3600000).toFixed(2)}h`;
  };

  /**
   * Métodos de clase (statics)
   */

  /**
   * Obtiene resultados agrupados por fase para una ejecución
   */
  TestResultDetailed.getByPhase = async function(executionId) {
    const results = await this.findAll({
      where: { execution_id: executionId },
      order: [['phase_name', 'ASC']]
    });

    // Agrupar por fase
    const grouped = {};
    results.forEach(result => {
      const phaseName = result.phase_name;
      if (!grouped[phaseName]) {
        grouped[phaseName] = {
          phase_name: phaseName,
          total_modules: 0,
          modules_passed: 0,
          modules_failed: 0,
          total_tests: 0,
          tests_passed: 0,
          tests_failed: 0,
          average_duration: 0,
          results: []
        };
      }

      grouped[phaseName].total_modules++;
      if (result.status === 'passed') grouped[phaseName].modules_passed++;
      if (result.status === 'failed') grouped[phaseName].modules_failed++;
      grouped[phaseName].total_tests += result.getTotalTests();
      grouped[phaseName].tests_passed += result.tests_passed;
      grouped[phaseName].tests_failed += result.tests_failed;
      grouped[phaseName].results.push(result);
    });

    // Calcular promedios
    Object.values(grouped).forEach(phase => {
      if (phase.results.length > 0) {
        phase.average_duration = phase.results.reduce((sum, r) => sum + r.duration, 0) / phase.results.length;
      }
    });

    return grouped;
  };

  /**
   * Obtiene resultados agrupados por módulo para una ejecución
   */
  TestResultDetailed.getByModule = async function(executionId) {
    const results = await this.findAll({
      where: {
        execution_id: executionId,
        module_name: { [sequelize.Sequelize.Op.ne]: null }
      },
      order: [['module_name', 'ASC']]
    });

    // Agrupar por módulo
    const grouped = {};
    results.forEach(result => {
      const moduleName = result.module_name;
      if (!grouped[moduleName]) {
        grouped[moduleName] = {
          module_name: moduleName,
          total_phases: 0,
          phases_passed: 0,
          phases_failed: 0,
          total_tests: 0,
          tests_passed: 0,
          tests_failed: 0,
          average_duration: 0,
          results: []
        };
      }

      grouped[moduleName].total_phases++;
      if (result.status === 'passed') grouped[moduleName].phases_passed++;
      if (result.status === 'failed') grouped[moduleName].phases_failed++;
      grouped[moduleName].total_tests += result.getTotalTests();
      grouped[moduleName].tests_passed += result.tests_passed;
      grouped[moduleName].tests_failed += result.tests_failed;
      grouped[moduleName].results.push(result);
    });

    // Calcular promedios
    Object.values(grouped).forEach(module => {
      if (module.results.length > 0) {
        module.average_duration = module.results.reduce((sum, r) => sum + r.duration, 0) / module.results.length;
      }
    });

    return grouped;
  };

  /**
   * Health score de un módulo (últimos 30 días)
   */
  TestResultDetailed.getModuleHealth = async function(moduleName, daysBack = 30) {
    const { Op } = require('sequelize');
    const results = await this.findAll({
      where: {
        module_name: moduleName,
        created_at: {
          [Op.gte]: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (results.length === 0) {
      return null;
    }

    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const successRate = (passed / total) * 100;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
    const lastFailure = results
      .filter(r => r.status === 'failed')
      .sort((a, b) => b.created_at - a.created_at)[0];

    // Calcular health score (70% success rate + 20% recency + 10% performance)
    let recencyScore = 20;
    if (lastFailure) {
      const daysSinceFailure = (Date.now() - lastFailure.created_at) / (24 * 60 * 60 * 1000);
      if (daysSinceFailure < 1) recencyScore = 5;
      else if (daysSinceFailure < 7) recencyScore = 10;
      else if (daysSinceFailure < 14) recencyScore = 15;
    }

    let performanceScore = 10;
    if (avgDuration < 5000) performanceScore = 10;
    else if (avgDuration < 10000) performanceScore = 7;
    else if (avgDuration < 30000) performanceScore = 5;
    else performanceScore = 2;

    const healthScore = (successRate * 0.7) + recencyScore + performanceScore;

    return {
      module_name: moduleName,
      total_executions: total,
      success_rate: parseFloat(successRate.toFixed(2)),
      average_duration: Math.round(avgDuration),
      last_failure: lastFailure ? lastFailure.created_at : null,
      health_score: parseFloat(healthScore.toFixed(2))
    };
  };

  /**
   * Top N módulos más problemáticos
   */
  TestResultDetailed.getTopFailing = async function(numModules = 10, daysBack = 30) {
    const { Op } = require('sequelize');
    const results = await this.findAll({
      where: {
        module_name: { [Op.ne]: null },
        created_at: {
          [Op.gte]: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Agrupar por módulo
    const modules = {};
    results.forEach(result => {
      const name = result.module_name;
      if (!modules[name]) {
        modules[name] = {
          module_name: name,
          total: 0,
          failed: 0,
          last_failure: null
        };
      }

      modules[name].total++;
      if (result.status === 'failed') {
        modules[name].failed++;
        if (!modules[name].last_failure || result.created_at > modules[name].last_failure) {
          modules[name].last_failure = result.created_at;
        }
      }
    });

    // Calcular failure rate y ordenar
    const moduleList = Object.values(modules)
      .filter(m => m.failed > 0)
      .map(m => ({
        ...m,
        failure_rate: parseFloat(((m.failed / m.total) * 100).toFixed(2))
      }))
      .sort((a, b) => {
        if (b.failed !== a.failed) return b.failed - a.failed;
        return b.failure_rate - a.failure_rate;
      })
      .slice(0, numModules);

    return moduleList;
  };

  return TestResultDetailed;
};
