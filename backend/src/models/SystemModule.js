const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemModule = sequelize.define('SystemModule', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    moduleKey: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'module_key',
      comment: 'Identificador único del módulo (ej: users, attendance, biometric)'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre descriptivo del módulo'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del módulo'
    },
    icon: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Emoji o icono representativo del módulo'
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i
      },
      comment: 'Color hexadecimal del módulo para UI'
    },
    category: {
      type: DataTypes.ENUM('core', 'security', 'medical', 'legal', 'payroll', 'additional', 'siac'),
      allowNull: false,
      defaultValue: 'core',
      comment: 'Categoría del módulo'
    },
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'base_price',
      comment: 'Precio base por empleado/mes en USD'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Indica si el módulo está disponible para contratación'
    },
    isCore: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_core',
      comment: 'Indica si es un módulo core obligatorio'
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
      comment: 'Orden de visualización en interfaces'
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Lista de características que incluye el módulo'
    },
    requirements: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Lista de módulos requeridos para funcionar'
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0.0',
      comment: 'Versión del módulo'
    },
    minEmployees: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'min_employees',
      comment: 'Número mínimo de empleados para contratar este módulo'
    },
    maxEmployees: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_employees',
      comment: 'Número máximo de empleados para este módulo'
    },
    rubro: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'General',
      comment: 'Rubro o categoría descriptiva del módulo para agrupación'
    }
  }, {
    tableName: 'system_modules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['module_key'],
        unique: true
      },
      {
        fields: ['category']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['is_core']
      },
      {
        fields: ['display_order']
      }
    ]
  });

  // Métodos de instancia
  SystemModule.prototype.getPriceForTier = function(tier) {
    const tierMultipliers = {
      '1-50': 1.0,
      '51-100': 0.85,
      '101+': 0.70
    };
    
    const multiplier = tierMultipliers[tier] || 1.0;
    return parseFloat(this.basePrice) * multiplier;
  };

  SystemModule.prototype.isAvailableForEmployeeCount = function(employeeCount) {
    if (this.minEmployees && employeeCount < this.minEmployees) {
      return false;
    }
    if (this.maxEmployees && employeeCount > this.maxEmployees) {
      return false;
    }
    return this.isActive;
  };

  return SystemModule;
};