const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ARTConfiguration = sequelize.define('ARTConfiguration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Información de la ART
    artName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre de la Aseguradora de Riesgo de Trabajo'
    },
    
    artCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Código identificador de la ART'
    },
    
    // Contacto principal
    primaryContactName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del contacto principal en la ART'
    },
    
    primaryContactRole: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Cargo del contacto principal'
    },
    
    // Información de contacto
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Teléfono de contacto'
    },
    
    whatsappNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número de WhatsApp para notificaciones'
    },
    
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Email para notificaciones'
    },
    
    emergencyPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Teléfono de emergencia'
    },
    
    // Configuración de notificaciones
    notificationPreferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        whatsapp: true,
        sms: false,
        email: true
      },
      comment: 'Preferencias de notificación'
    },
    
    // Tipos de casos que requieren notificación
    notificationTriggers: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        accidents: true,
        occupational_diseases: true,
        work_related_injuries: true,
        long_absences: true,
        recurring_cases: true
      },
      comment: 'Tipos de casos que activan notificación a ART'
    },
    
    // Configuración de umbrales
    thresholds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        long_absence_days: 15,
        recurring_case_count: 3,
        recurring_case_period_months: 6
      },
      comment: 'Umbrales para activar notificaciones automáticas'
    },
    
    // Horarios de notificación
    businessHours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        start: '08:00',
        end: '18:00',
        timezone: 'America/Argentina/Buenos_Aires'
      },
      comment: 'Horarios comerciales para notificaciones'
    },
    
    // Configuración de empresa
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID de la empresa (null = configuración global)'
    },
    
    // Estado
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si la configuración está activa'
    },
    
    // Metadata
    lastNotificationSent: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de la última notificación enviada'
    },
    
    totalNotificationsSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de notificaciones enviadas'
    },
    
    // Configuración adicional
    customFields: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Campos personalizados adicionales'
    },
    
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre la configuración'
    }
  }, {
    tableName: 'art_configurations',
    timestamps: true,
    indexes: [
      {
        fields: ['companyId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['artCode']
      }
    ]
  });

  return ARTConfiguration;
};