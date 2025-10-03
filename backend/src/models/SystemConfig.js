const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemConfig = sequelize.define('SystemConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    connectionMode: {
      type: DataTypes.ENUM('local', 'network'),
      defaultValue: 'local'
    },
    toleranceMinutesEntry: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    toleranceMinutesExit: {
      type: DataTypes.INTEGER,
      defaultValue: 15
    },
    maxOvertimeHours: {
      type: DataTypes.DECIMAL(4, 2),
      defaultValue: 3.0
    },
    gpsRadius: {
      type: DataTypes.INTEGER,
      defaultValue: 50
    },
    requireAdminApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sendNotifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    autoBackup: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    backupHour: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    maxLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    lockoutDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 30 // minutos
    },
    sessionTimeout: {
      type: DataTypes.INTEGER,
      defaultValue: 24 // horas
    },
    companyName: {
      type: DataTypes.STRING,
      defaultValue: 'Mi Empresa'
    },
    companyLogo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'America/Argentina/Buenos_Aires'
    },
    locale: {
      type: DataTypes.STRING,
      defaultValue: 'es-AR'
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'ARS'
    },
    emailSettings: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    smsSettings: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    whatsappSettings: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    biometricSettings: {
      type: DataTypes.JSON,
      defaultValue: {
        fingerprintEnabled: true,
        faceRecognitionEnabled: true,
        maxFingerprints: 5,
        readerType: 'zkteco'
      }
    }
  }, {
    tableName: 'system_config'
  });

  return SystemConfig;
};