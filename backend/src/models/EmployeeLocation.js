const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeLocation = sequelize.define('EmployeeLocation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Coordenadas GPS
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: -90,
        max: 90
      },
      comment: 'Latitud GPS del empleado'
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: -180,
        max: 180
      },
      comment: 'Longitud GPS del empleado'
    },
    // Precisión de la ubicación
    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Precisión en metros del GPS'
    },
    altitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Altitud en metros'
    },
    heading: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Dirección en grados (0-360)'
    },
    speed: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Velocidad en m/s'
    },
    // Información contextual
    isWorkingHours: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si está en horario laboral'
    },
    isOnBreak: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si está en descanso'
    },
    isInGeofence: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si está dentro del área laboral permitida'
    },
    currentActivity: {
      type: DataTypes.ENUM('working', 'break', 'lunch', 'meeting', 'travel', 'idle'),
      defaultValue: 'idle',
      comment: 'Actividad actual del empleado'
    },
    // Información del dispositivo
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del dispositivo móvil'
    },
    appVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Versión de la aplicación móvil'
    },
    batteryLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Nivel de batería del dispositivo (0-100)'
    },
    connectionType: {
      type: DataTypes.ENUM('wifi', '4g', '3g', '5g', 'unknown'),
      defaultValue: 'unknown',
      comment: 'Tipo de conexión del dispositivo'
    },
    // Información adicional
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Dirección aproximada (geocodificación inversa)'
    },
    nearbyLandmarks: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Puntos de referencia cercanos'
    },
    weatherConditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Condiciones climáticas en el momento'
    },
    // Validación y privacidad
    isPrivacyMode: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el empleado activó modo privacidad'
    },
    sharingLevel: {
      type: DataTypes.ENUM('full', 'approximate', 'supervisor_only', 'emergency_only'),
      defaultValue: 'full',
      comment: 'Nivel de compartir ubicación'
    },
    // Timestamps automáticos
    reportedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Momento en que se reportó la ubicación'
    }
  }, {
    tableName: 'employee_locations',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['reportedAt'] },
      { fields: ['isWorkingHours'] },
      { fields: ['isInGeofence'] },
      { fields: ['currentActivity'] },
      { fields: ['userId', 'reportedAt'] },
      { fields: ['latitude', 'longitude'] },
      { fields: ['createdAt'] }
    ]
  });

  return EmployeeLocation;
};