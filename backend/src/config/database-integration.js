// 🔄 INTEGRACIÓN ENTRE BASE DE DATOS EXISTENTE Y NEXT-GEN
const { dbManager } = require('./database-next-gen');
const { Sequelize, DataTypes } = require('sequelize');

// 🐘 CONFIGURACIÓN POSTGRESQL COMPATIBLE
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'sistema_asistencia',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'SistemaAsistencia2024#',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 50,
      min: 10,
      acquire: 30000,
      idle: 10000
    },
    define: {
      freezeTableName: true,
      underscored: false
    }
  }
);

// 🧠 MODELOS INTEGRADOS CON NEXT-GEN
class DatabaseIntegration {
  constructor() {
    this.sequelize = sequelize;
    this.models = {};
    this.setupModels();
  }

  // 🔧 CONFIGURACIÓN DE MODELOS
  setupModels() {
    // 👤 MODELO USER INTEGRADO (Compatible con PostgreSQL existente)
    this.models.User = this.sequelize.define('User', {
      user_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: 'user_id'
      },
      employeeId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'employeeId'
      },
      usuario: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'firstName'  // 🔄 Mapeo automático PostgreSQL
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'lastName'   // 🔄 Mapeo automático PostgreSQL
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      whatsapp_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'whatsapp_number'
      },
      role: {
        type: DataTypes.ENUM('employee', 'supervisor', 'manager', 'admin', 'super_admin', 'vendor'),
        allowNull: false,
        defaultValue: 'employee'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'isActive'   // 🔄 Mapeo automático PostgreSQL
      },
      department_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: 'department_id',
        references: {
          model: 'departments',
          key: 'id'
        }
      },
      departmentId: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('department_id');
        }
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id',
        references: {
          model: 'companies',
          key: 'id'
        }
      },
      companyId: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('company_id');
        }
      },
      dni: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      // 🧬 INTEGRACIÓN BIOMÉTRICA NEXT-GEN
      biometric_data: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'biometric_data'
      },
      wellness_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'wellness_score'
      },
      last_biometric_scan: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_biometric_scan'
      }
    }, {
      tableName: 'users',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      indexes: [
        { fields: ['employeeId'] },
        { fields: ['company_id'] },
        { fields: ['department_id'] },
        { fields: ['email'] },
        { fields: ['role'] }
      ]
    });

    // 🏢 MODELO DEPARTMENT INTEGRADO
    this.models.Department = this.sequelize.define('Department', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id',
        references: {
          model: 'companies',
          key: 'id'
        }
      },
      manager_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: 'manager_id',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      }
    }, {
      tableName: 'departments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // 🏛️ MODELO COMPANY NEXT-GEN
    this.models.Company = this.sequelize.define('Company', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      legal_name: {
        type: DataTypes.STRING(255),
        field: 'legal_name'
      },
      tax_id: {
        type: DataTypes.STRING(255),
        field: 'tax_id'
      },
      email: {
        type: DataTypes.STRING(255)
      },
      phone: {
        type: DataTypes.STRING(50)
      },
      address: {
        type: DataTypes.TEXT
      },
      // 🚀 CONFIGURACIÓN NEXT-GEN
      tenant_id: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'tenant_id'
      },
      biometric_settings: {
        type: DataTypes.JSONB,
        defaultValue: {
          hygiene_threshold: 7,
          emotion_confidence: 0.95,
          fatigue_alert_level: 'medium',
          wellness_monitoring: true
        },
        field: 'biometric_settings'
      },
      active_modules: {
        type: DataTypes.JSONB,
        defaultValue: ['attendance', 'biometric', 'evaluacion-biometrica'],
        field: 'active_modules'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      }
    }, {
      tableName: 'companies',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // 🔬 MODELO BIOMETRIC SCANS NEXT-GEN
    this.models.BiometricScan = this.sequelize.define('BiometricScan', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      tenant_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'tenant_id'
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      // 📊 DATOS DE ANÁLISIS BIOMÉTRICO
      scan_data: {
        type: DataTypes.JSONB,
        allowNull: false,
        field: 'scan_data'
      },
      wellness_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'wellness_score'
      },
      alert_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'alert_count'
      },
      // 🔄 ORIGEN DE DATOS
      source: {
        type: DataTypes.ENUM('kiosco', 'apk_android', 'web_panel'),
        allowNull: false,
        defaultValue: 'kiosco'
      },
      source_device_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'source_device_id'
      },
      processing_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'processing_time_ms'
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'biometric_scans',
      timestamps: false,
      indexes: [
        { fields: ['tenant_id'] },
        { fields: ['user_id'] },
        { fields: ['timestamp'] },
        { fields: ['wellness_score'] },
        { fields: ['source'] }
      ]
    });

    // 🔔 MODELO ALERTAS BIOMÉTRICAS
    this.models.BiometricAlert = this.sequelize.define('BiometricAlert', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      tenant_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'tenant_id'
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      scan_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'scan_id',
        references: {
          model: 'biometric_scans',
          key: 'id'
        }
      },
      alert_type: {
        type: DataTypes.ENUM('fatigue', 'stress', 'anomaly', 'hygiene', 'emotion'),
        allowNull: false,
        field: 'alert_type'
      },
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      recommendations: {
        type: DataTypes.JSONB,
        field: 'recommendations'
      },
      status: {
        type: DataTypes.ENUM('active', 'acknowledged', 'resolved'),
        defaultValue: 'active'
      },
      acknowledged_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: 'acknowledged_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      acknowledged_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'acknowledged_at'
      }
    }, {
      tableName: 'biometric_alerts',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['tenant_id'] },
        { fields: ['user_id'] },
        { fields: ['alert_type'] },
        { fields: ['severity'] },
        { fields: ['status'] }
      ]
    });

    // ═══════════════════════════════════════════════════════════════
    // 🧬 MODELO BIOMETRIC TEMPLATES PROFESIONAL
    // ═══════════════════════════════════════════════════════════════
    this.models.BiometricTemplate = this.sequelize.define('BiometricTemplate', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
      },
      employee_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'employee_id'
      },
      template_data: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'template_data'
      },
      template_hash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        field: 'template_hash'
      },
      quality_score: {
        type: DataTypes.DECIMAL(5,4),
        allowNull: false,
        defaultValue: 0.0000,
        field: 'quality_score'
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
        { fields: ['company_id', 'employee_id'] },
        { fields: ['company_id', 'quality_score'] },
        { unique: true, fields: ['company_id', 'template_hash'] }
      ]
    });

    // ═══════════════════════════════════════════════════════════════
    // 🧠 MODELO BIOMETRIC AI ANALYSIS PROFESIONAL
    // ═══════════════════════════════════════════════════════════════
    this.models.BiometricAIAnalysis = this.sequelize.define('BiometricAIAnalysis', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'company_id'
      },
      employee_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'employee_id'
      },
      template_id: {
        type: DataTypes.UUID,
        field: 'template_id'
      },
      emotion_analysis: {
        type: DataTypes.JSONB,
        field: 'emotion_analysis'
      },
      emotion_confidence: {
        type: DataTypes.DECIMAL(5,4),
        field: 'emotion_confidence'
      },
      behavior_patterns: {
        type: DataTypes.JSONB,
        field: 'behavior_patterns'
      },
      behavior_confidence: {
        type: DataTypes.DECIMAL(5,4),
        field: 'behavior_confidence'
      },
      facial_features: {
        type: DataTypes.JSONB,
        field: 'facial_features'
      },
      facial_landmarks: {
        type: DataTypes.JSONB,
        field: 'facial_landmarks'
      },
      health_indicators: {
        type: DataTypes.JSONB,
        field: 'health_indicators'
      },
      fatigue_score: {
        type: DataTypes.DECIMAL(5,4),
        field: 'fatigue_score'
      },
      stress_score: {
        type: DataTypes.DECIMAL(5,4),
        field: 'stress_score'
      },
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
        { fields: ['company_id', 'processed_at'] },
        { fields: ['employee_id', 'processed_at'] },
        { fields: ['template_id'] }
      ]
    });

    // 🔗 CONFIGURAR RELACIONES
    this.setupAssociations();
  }

  // 🔗 CONFIGURACIÓN DE RELACIONES
  setupAssociations() {
    const { User, Department, Company, BiometricScan, BiometricAlert, BiometricTemplate, BiometricAIAnalysis } = this.models;

    // 👤 Relaciones User
    User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
    User.hasMany(BiometricScan, { foreignKey: 'user_id', as: 'biometricScans' });
    User.hasMany(BiometricAlert, { foreignKey: 'user_id', as: 'biometricAlerts' });

    // 🏢 Relaciones Company
    Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
    Company.hasMany(Department, { foreignKey: 'company_id', as: 'departments' });

    // 🏢 Relaciones Department
    Department.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    Department.hasMany(User, { foreignKey: 'department_id', as: 'users' });
    Department.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });

    // 🔬 Relaciones BiometricScan
    BiometricScan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
    BiometricScan.hasMany(BiometricAlert, { foreignKey: 'scan_id', as: 'alerts' });

    // 🔔 Relaciones BiometricAlert
    BiometricAlert.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
    BiometricAlert.belongsTo(BiometricScan, { foreignKey: 'scan_id', as: 'scan' });
    BiometricAlert.belongsTo(User, { foreignKey: 'acknowledged_by', as: 'acknowledgedBy' });

    // 🧬 Relaciones BiometricTemplate
    BiometricTemplate.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    BiometricTemplate.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });
    BiometricTemplate.hasMany(BiometricAIAnalysis, { foreignKey: 'template_id', as: 'aiAnalysis' });

    // 🧠 Relaciones BiometricAIAnalysis
    BiometricAIAnalysis.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    BiometricAIAnalysis.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });
    BiometricAIAnalysis.belongsTo(BiometricTemplate, { foreignKey: 'template_id', as: 'template' });

    // Relaciones adicionales para User
    User.hasMany(BiometricTemplate, { foreignKey: 'employee_id', as: 'biometricTemplates' });
    User.hasMany(BiometricAIAnalysis, { foreignKey: 'employee_id', as: 'aiAnalysis' });

    // Relaciones adicionales para Company
    Company.hasMany(BiometricTemplate, { foreignKey: 'company_id', as: 'biometricTemplates' });
    Company.hasMany(BiometricAIAnalysis, { foreignKey: 'company_id', as: 'aiAnalysis' });
  }

  // 🚀 INICIALIZACIÓN COMPLETA
  async initialize() {
    try {
      console.log('🔄 Inicializando integración Database Next-Gen...');

      // 🔗 Conectar PostgreSQL
      await this.sequelize.authenticate();
      console.log('✅ Conexión PostgreSQL establecida');

      // 🔄 Sincronizar tablas (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        await this.sequelize.sync({ alter: true });
        console.log('✅ Esquemas de base de datos sincronizados');
      }

      // 🚀 Conectar Redis Next-Gen (ya se hace automáticamente en la importación)
      console.log('✅ Base de datos Next-Gen inicializada');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando integración de base de datos:', error);
      throw error;
    }
  }

  // 🔄 MÉTODOS DE INTEGRACIÓN CON NEXT-GEN

  // 📊 Migrar datos a Next-Gen
  async migrateBiometricData(userId, companyId) {
    const tenantId = await this.getTenantId(companyId);

    // Obtener datos biométricos del usuario
    const scans = await this.models.BiometricScan.findAll({
      where: { user_id: userId },
      order: [['timestamp', 'DESC']],
      limit: 100
    });

    // Migrar a cache Redis Next-Gen
    for (const scan of scans) {
      await dbManager.cache.set(
        `biometric:scan:${tenantId}:${userId}:${scan.id}`,
        scan.scan_data,
        3600
      );
    }

    return scans.length;
  }

  // 🏢 Obtener tenant_id de empresa
  async getTenantId(companyId) {
    const company = await this.models.Company.findByPk(companyId);
    if (!company.tenant_id) {
      // Generar tenant_id automáticamente
      const tenantId = `tenant_${companyId}_${Date.now()}`;
      await company.update({ tenant_id: tenantId });
      return tenantId;
    }
    return company.tenant_id;
  }

  // 📊 Obtener estadísticas en tiempo real
  async getRealtimeStats(tenantId) {
    const cacheKey = `stats:realtime:${tenantId}`;
    const cached = await dbManager.cache.get(cacheKey);

    if (cached) return cached;

    // Calcular desde base de datos
    const stats = await this.calculateRealtimeStats(tenantId);

    // Cache por 1 minuto
    await dbManager.cache.set(cacheKey, stats, 60);

    return stats;
  }

  // 📈 Calcular estadísticas
  async calculateRealtimeStats(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [scansToday, alertsToday, avgWellness] = await Promise.all([
      this.models.BiometricScan.count({
        where: {
          tenant_id: tenantId,
          timestamp: { [this.sequelize.Op.gte]: today }
        }
      }),
      this.models.BiometricAlert.count({
        where: {
          tenant_id: tenantId,
          created_at: { [this.sequelize.Op.gte]: today }
        }
      }),
      this.models.BiometricScan.findOne({
        where: {
          tenant_id: tenantId,
          timestamp: { [this.sequelize.Op.gte]: today }
        },
        attributes: [
          [this.sequelize.fn('AVG', this.sequelize.col('wellness_score')), 'avgWellness']
        ],
        raw: true
      })
    ]);

    return {
      scansToday,
      alertsToday,
      avgWellness: Math.round(avgWellness?.avgWellness || 0),
      lastUpdate: new Date().toISOString()
    };
  }

  // 🔄 Método de sincronización bidireccional
  async syncWithNextGen(operation, data) {
    try {
      // Escribir en PostgreSQL
      const result = await this.sequelize.transaction(async (t) => {
        return await operation(data, { transaction: t });
      });

      // Escribir en Redis Next-Gen para cache
      if (data.tenantId && data.userId) {
        await dbManager.cache.set(
          `sync:${data.tenantId}:${data.userId}`,
          result,
          300
        );
      }

      return result;
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      throw error;
    }
  }
}

// 🌟 SINGLETON PARA INTEGRACIÓN
const dbIntegration = new DatabaseIntegration();

module.exports = {
  DatabaseIntegration,
  dbIntegration,
  sequelize,
  models: () => dbIntegration.models,

  // Funciones de conveniencia
  User: () => dbIntegration.models.User,
  Department: () => dbIntegration.models.Department,
  Company: () => dbIntegration.models.Company,
  BiometricScan: () => dbIntegration.models.BiometricScan,
  BiometricAlert: () => dbIntegration.models.BiometricAlert,
  BiometricTemplate: () => dbIntegration.models.BiometricTemplate,
  BiometricAIAnalysis: () => dbIntegration.models.BiometricAIAnalysis,

  // Métodos de inicialización
  initialize: () => dbIntegration.initialize(),
  getTenantId: (companyId) => dbIntegration.getTenantId(companyId),
  getRealtimeStats: (tenantId) => dbIntegration.getRealtimeStats(tenantId),
  migrateBiometricData: (userId, companyId) => dbIntegration.migrateBiometricData(userId, companyId),
  syncWithNextGen: (operation, data) => dbIntegration.syncWithNextGen(operation, data)
};