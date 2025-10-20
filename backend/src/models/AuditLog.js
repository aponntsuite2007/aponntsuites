/**
 * AUDIT LOG MODEL - Sistema de Auditoría Enterprise
 *
 * Registra TODOS los tests, errores, fixes y métricas del sistema
 * Permite análisis histórico y detección de patrones
 *
 * @version 1.0.0
 * @date 2025-01-19
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // ═══════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════

    execution_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Agrupa todos los tests de una misma ejecución'
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Empresa auditada (null = auditoría global del sistema)'
    },

    environment: {
      type: DataTypes.ENUM('local', 'render', 'production'),
      defaultValue: 'local',
      allowNull: false
    },

    triggered_by: {
      type: DataTypes.ENUM('manual', 'scheduled', 'auto-healing', 'deploy-hook'),
      defaultValue: 'manual',
      allowNull: false
    },

    // ═══════════════════════════════════════════════════════════
    // TEST INFORMATION
    // ═══════════════════════════════════════════════════════════

    test_type: {
      type: DataTypes.ENUM(
        'endpoint',           // Test de API endpoint
        'database',           // Validación de BD
        'relation',           // Relaciones entre tablas
        'integration',        // Test entre módulos
        'e2e',               // End-to-end
        'performance',       // Métricas de performance
        'security',          // SQL injection, XSS, etc
        'stress',            // Load testing
        'console-error',     // Errores de frontend
        'render-logs'        // Análisis de logs Render
      ),
      allowNull: false
    },

    module_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'users, attendance, kiosks, etc.'
    },

    test_name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre descriptivo del test'
    },

    test_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // ═══════════════════════════════════════════════════════════
    // RESULTS
    // ═══════════════════════════════════════════════════════════

    status: {
      type: DataTypes.ENUM('pass', 'fail', 'warning', 'skipped', 'in-progress'),
      allowNull: false,
      defaultValue: 'in-progress'
    },

    severity: {
      type: DataTypes.ENUM('critical', 'high', 'medium', 'low', 'info'),
      allowNull: true,
      comment: 'Solo para fails y warnings'
    },

    // ═══════════════════════════════════════════════════════════
    // ERROR DETAILS
    // ═══════════════════════════════════════════════════════════

    error_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'TypeError, ReferenceError, 401, 500, etc.'
    },

    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    error_stack: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    error_file: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Archivo donde ocurrió el error'
    },

    error_line: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    error_context: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Código circundante, variables, estado'
    },

    // ═══════════════════════════════════════════════════════════
    // REQUEST/RESPONSE (para tests de endpoints)
    // ═══════════════════════════════════════════════════════════

    endpoint: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '/api/users, /api/attendance, etc.'
    },

    http_method: {
      type: DataTypes.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
      allowNull: true
    },

    request_body: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    request_headers: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    response_status: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    response_body: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    response_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tiempo de respuesta en milisegundos'
    },

    // ═══════════════════════════════════════════════════════════
    // PERFORMANCE METRICS
    // ═══════════════════════════════════════════════════════════

    metrics: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'CPU, memoria, queries SQL, etc.'
    },

    // ═══════════════════════════════════════════════════════════
    // AUTO-HEALING
    // ═══════════════════════════════════════════════════════════

    fix_attempted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    fix_strategy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'auto-import, add-validation, fix-typo, etc.'
    },

    fix_applied: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Código del fix aplicado'
    },

    fix_result: {
      type: DataTypes.ENUM('success', 'failed', 'partial', 'not-attempted'),
      allowNull: true
    },

    fix_rollback_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // ═══════════════════════════════════════════════════════════
    // SUGGESTIONS (para fixes manuales)
    // ═══════════════════════════════════════════════════════════

    suggestions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Array de sugerencias de fix con código y descripción'
    },

    // ═══════════════════════════════════════════════════════════
    // EXECUTION TIMING
    // ═══════════════════════════════════════════════════════════

    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duración del test en milisegundos'
    },

    // ═══════════════════════════════════════════════════════════
    // METADATA ADICIONAL
    // ═══════════════════════════════════════════════════════════

    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Para búsquedas y filtros: critical, auth, biometric, etc.'
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Datos del test (seeders usados, configuración, etc.)
    test_data: {
      type: DataTypes.JSONB,
      allowNull: true
    }

  }, {
    tableName: 'audit_logs',
    timestamps: true, // createdAt, updatedAt automáticos
    indexes: [
      { fields: ['execution_id'] },
      { fields: ['company_id'] },
      { fields: ['environment'] },
      { fields: ['test_type'] },
      { fields: ['module_name'] },
      { fields: ['status'] },
      { fields: ['severity'] },
      { fields: ['started_at'] },
      { fields: ['tags'], using: 'gin' } // GIN index for array
    ]
  });

  // ═══════════════════════════════════════════════════════════
  // INSTANCE METHODS
  // ═══════════════════════════════════════════════════════════

  AuditLog.prototype.markAsCompleted = function(status, duration_ms) {
    this.status = status;
    this.completed_at = new Date();
    this.duration_ms = duration_ms || (new Date() - this.started_at);
    return this.save();
  };

  AuditLog.prototype.addError = function(error) {
    this.status = 'fail';
    this.error_type = error.name || 'Error';
    this.error_message = error.message;
    this.error_stack = error.stack;

    // Extract file and line from stack
    if (error.stack) {
      const stackMatch = error.stack.match(/at .* \((.+):(\d+):\d+\)/);
      if (stackMatch) {
        this.error_file = stackMatch[1];
        this.error_line = parseInt(stackMatch[2]);
      }
    }

    return this.save();
  };

  AuditLog.prototype.recordFix = function(strategy, code, result) {
    this.fix_attempted = true;
    this.fix_strategy = strategy;
    this.fix_applied = code;
    this.fix_result = result;
    return this.save();
  };

  // ═══════════════════════════════════════════════════════════
  // CLASS METHODS
  // ═══════════════════════════════════════════════════════════

  AuditLog.getExecutionSummary = async function(execution_id) {
    const logs = await this.findAll({ where: { execution_id } });

    return {
      execution_id,
      total: logs.length,
      passed: logs.filter(l => l.status === 'pass').length,
      failed: logs.filter(l => l.status === 'fail').length,
      warnings: logs.filter(l => l.status === 'warning').length,
      skipped: logs.filter(l => l.status === 'skipped').length,
      critical_failures: logs.filter(l => l.status === 'fail' && l.severity === 'critical').length,
      avg_response_time: logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length,
      total_duration: logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0),
      fixes_attempted: logs.filter(l => l.fix_attempted).length,
      fixes_successful: logs.filter(l => l.fix_result === 'success').length,
      modules_tested: [...new Set(logs.map(l => l.module_name).filter(Boolean))],
      started_at: Math.min(...logs.map(l => l.started_at)),
      completed_at: Math.max(...logs.map(l => l.completed_at).filter(Boolean))
    };
  };

  AuditLog.getModuleHealth = async function(module_name, limit = 10) {
    const logs = await this.findAll({
      where: { module_name },
      order: [['started_at', 'DESC']],
      limit
    });

    const total = logs.length;
    const passed = logs.filter(l => l.status === 'pass').length;
    const health_score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      module_name,
      health_score,
      total_tests: total,
      recent_failures: logs.filter(l => l.status === 'fail').slice(0, 5)
    };
  };

  return AuditLog;
};
