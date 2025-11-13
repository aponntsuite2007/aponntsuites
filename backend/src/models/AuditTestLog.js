/**
 * AuditTestLog Model
 * Registra logs de tests de Phase 4 (IntelligentTestingOrchestrator)
 *
 * Características:
 * - Almacena resultados de tests E2E con Puppeteer
 * - Tracking de auto-reparación (fix_attempted, fix_applied)
 * - Metadata flexible en formato JSONB
 * - Índices optimizados para queries de análisis
 */

const { DataTypes, Model } = require('sequelize');

class AuditTestLog extends Model {
  static associate(models) {
    // Relación con Company (multi-tenant)
    AuditTestLog.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });
  }

  /**
   * Helper para obtener resumen de ejecución
   * @param {string} executionId - UUID de la ejecución
   * @returns {Promise<Object>} Resumen con stats
   */
  static async getExecutionSummary(executionId) {
    const sequelize = this.sequelize;
    const [results] = await sequelize.query(
      'SELECT * FROM get_execution_summary($1)',
      {
        bind: [executionId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    return results;
  }

  /**
   * Helper para obtener salud de módulo
   * @param {string} moduleName - Nombre del módulo (ej: 'users')
   * @returns {Promise<Object>} Health score 0-100
   */
  static async getModuleHealth(moduleName) {
    const sequelize = this.sequelize;
    const [results] = await sequelize.query(
      'SELECT * FROM get_module_health($1)',
      {
        bind: [moduleName],
        type: sequelize.QueryTypes.SELECT
      }
    );
    return results;
  }
}

/**
 * Define el esquema del modelo
 */
const defineModel = (sequelize) => {
  AuditTestLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'ID único del log'
      },
      execution_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID de la ejecución (agrupa múltiples tests)'
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID de la empresa (multi-tenant)'
      },
      module_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del módulo testeado (ej: users, attendance)'
      },
      test_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre descriptivo del test'
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Estado: pending, running, passed, failed, warning, fixed'
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensaje de error si falló'
      },
      error_stack: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Stack trace completo del error'
      },
      fix_attempted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Si se intentó auto-reparar'
      },
      fix_applied: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Si el fix fue aplicado exitosamente'
      },
      fix_strategy: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Estrategia de reparación usada (safe_pattern, suggest_only)'
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Datos adicionales flexibles (timings, screenshots, etc)'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: 'Timestamp de creación'
      }
    },
    {
      sequelize,
      modelName: 'AuditTestLog',
      tableName: 'audit_test_logs',
      timestamps: false, // Usamos created_at manualmente
      underscored: true,
      indexes: [
        {
          name: 'idx_audit_test_logs_execution_id',
          fields: ['execution_id']
        },
        {
          name: 'idx_audit_test_logs_company_id',
          fields: ['company_id']
        },
        {
          name: 'idx_audit_test_logs_module_name',
          fields: ['module_name']
        },
        {
          name: 'idx_audit_test_logs_status',
          fields: ['status']
        },
        {
          name: 'idx_audit_test_logs_created_at',
          fields: ['created_at']
        },
        {
          name: 'idx_audit_test_logs_fix_applied',
          fields: ['fix_applied']
        },
        {
          name: 'idx_audit_test_logs_metadata_gin',
          fields: ['metadata'],
          using: 'gin'
        }
      ]
    }
  );

  return AuditTestLog;
};

module.exports = { AuditTestLog, defineModel };
