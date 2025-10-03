const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BiometricData = sequelize.define('BiometricData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('fingerprint', 'face', 'iris'),
      allowNull: false
    },
    fingerIndex: {
      type: DataTypes.INTEGER,
      allowNull: true, // Solo para huellas (1-10)
      validate: {
        min: 1,
        max: 10
      }
    },
    template: {
      type: DataTypes.TEXT, // Template biométrico codificado
      allowNull: false
    },
    quality: {
      type: DataTypes.INTEGER, // Calidad del template (0-100)
      defaultValue: 0
    },
    algorithm: {
      type: DataTypes.STRING, // Algoritmo usado para el template
      defaultValue: 'default'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    UserId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'biometric_data',
    indexes: [
      { fields: ['type'] },
      { fields: ['UserId'] },
      { fields: ['isActive'] },
      { fields: ['UserId', 'type', 'fingerIndex'], unique: true }
    ]
  });

  return BiometricData;
};