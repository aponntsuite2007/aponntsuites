const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompanyModule = sequelize.define('CompanyModule', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      comment: 'ID de la empresa'
    },
    systemModuleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'system_module_id',
      comment: 'ID del módulo del sistema'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Indica si el módulo está activo para esta empresa'
    },
    contractedPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'contracted_price',
      comment: 'Precio contratado por empleado/mes (puede diferir del precio actual)'
    },
    employeeTier: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'employee_tier',
      comment: 'Escala de empleados al momento de la contratación (1-50, 51-100, 101+)'
    },
    contractedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'contracted_at',
      comment: 'Fecha en que se contrató el módulo'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
      comment: 'Fecha de vencimiento del módulo (null = sin vencimiento)'
    },
    suspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'suspended_at',
      comment: 'Fecha en que se suspendió el módulo'
    },
    suspendedReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'suspended_reason',
      comment: 'Motivo de suspensión del módulo'
    },
    lastBilledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_billed_at',
      comment: 'Última vez que se facturó este módulo'
    },
    nextBillingAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_billing_at',
      comment: 'Próxima fecha de facturación'
    },
    usageStats: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'usage_stats',
      comment: 'Estadísticas de uso del módulo'
    },
    configuration: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Configuración específica del módulo para esta empresa'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas administrativas sobre la contratación'
    }
  }, {
    tableName: 'company_modules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['company_id', 'system_module_id'],
        unique: true,
        name: 'company_modules_unique_company_module'
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['system_module_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['next_billing_at']
      }
    ]
  });

  // Métodos de instancia
  CompanyModule.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  };

  CompanyModule.prototype.isSuspended = function() {
    return this.suspendedAt !== null && this.suspendedAt <= new Date();
  };

  CompanyModule.prototype.isOperational = function() {
    return this.isActive && !this.isExpired() && !this.isSuspended();
  };

  CompanyModule.prototype.getDaysUntilExpiration = function() {
    if (!this.expiresAt) return null;
    
    const now = new Date();
    const diffTime = this.expiresAt - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  CompanyModule.prototype.getDaysUntilNextBilling = function() {
    if (!this.nextBillingAt) return null;
    
    const now = new Date();
    const diffTime = this.nextBillingAt - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  CompanyModule.prototype.suspend = function(reason = null) {
    this.suspendedAt = new Date();
    this.suspendedReason = reason;
    this.isActive = false;
    return this.save();
  };

  CompanyModule.prototype.reactivate = function() {
    this.suspendedAt = null;
    this.suspendedReason = null;
    this.isActive = true;
    return this.save();
  };

  return CompanyModule;
};