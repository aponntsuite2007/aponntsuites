/**
 * Modelo para configuración múltiple de proveedores ART
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MultipleARTConfiguration = sequelize.define('MultipleARTConfiguration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Información básica del proveedor ART
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre del proveedor ART'
    },
    
    clientCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Código o número de cliente de la empresa'
    },
    
    // Información de contacto
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      },
      comment: 'Email principal para notificaciones'
    },
    
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Teléfono de contacto'
    },
    
    emergencyContact: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Contacto de emergencia (nombre y cargo)'
    },
    
    // Configuración de comunicación
    preferredChannel: {
      type: DataTypes.ENUM('email', 'sms', 'whatsapp', 'phone'),
      defaultValue: 'email',
      comment: 'Canal preferido de comunicación'
    },
    
    priority: {
      type: DataTypes.ENUM('primary', 'secondary', 'backup'),
      defaultValue: 'secondary',
      comment: 'Prioridad del proveedor ART'
    },
    
    // Horarios y disponibilidad
    schedule: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Horarios de atención del proveedor'
    },
    
    // Estado del proveedor
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el proveedor está activo'
    },
    
    // Configuración avanzada
    notificationSettings: {
      type: DataTypes.JSON,
      defaultValue: {
        enableEmergency: true,
        enableRoutine: true,
        responseTimeout: 24, // horas
        escalationEnabled: true
      },
      comment: 'Configuración de notificaciones específicas'
    },
    
    // Información adicional
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Dirección física del proveedor'
    },
    
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Sitio web del proveedor'
    },
    
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre el proveedor'
    }
    
  }, {
    tableName: 'multiple_art_configurations',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        name: 'idx_art_priority',
        fields: ['priority', 'isActive']
      },
      {
        name: 'idx_art_active',
        fields: ['isActive']
      }
    ]
  });

  return MultipleARTConfiguration;
};