/**
 * Modelo para tipos de licencias extraordinarias
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExtraordinaryLicense = sequelize.define('ExtraordinaryLicense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Multi-tenant
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID de la empresa (multi-tenant)'
    },

    // Tipo de licencia
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Tipo de licencia (ej: "Matrimonio", "Paternidad")'
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada de la licencia'
    },
    
    // Configuración de días
    days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Número de días otorgados'
    },
    
    dayType: {
      type: DataTypes.ENUM('habil', 'corrido'),
      defaultValue: 'habil',
      comment: 'Tipo de días: hábiles o corridos'
    },
    
    // Configuración de solicitud
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si requiere aprobación previa'
    },
    
    requiresDocumentation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si requiere documentación de respaldo'
    },
    
    maxPerYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Máximo de veces que se puede solicitar por año (null = sin límite)'
    },
    
    // Configuración de notificación
    advanceNoticeDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Días de antelación requeridos para solicitar'
    },
    
    // Estado
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si este tipo de licencia está activo'
    },
    
    // Información legal
    legalBasis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base legal que sustenta esta licencia'
    }
    
  }, {
    tableName: 'extraordinary_licenses',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_extraordinary_license_type',
        fields: ['type', 'isActive']
      },
      {
        name: 'idx_extraordinary_license_active',
        fields: ['isActive']
      }
    ]
  });

  return ExtraordinaryLicense;
};