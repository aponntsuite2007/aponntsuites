const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FacialBiometricData = sequelize.define('FacialBiometricData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    faceEncoding: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'face_encoding',
      comment: 'Vector de características faciales codificadas'
    },
    faceTemplate: {
      type: DataTypes.BLOB,
      allowNull: true,
      field: 'face_template',
      comment: 'Template facial en formato binario'
    },
    qualityScore: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      field: 'quality_score',
      comment: 'Puntuación de calidad de la captura'
    },
    captureTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'capture_timestamp',
      comment: 'Timestamp de captura de la biometría'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: 'Si el registro está activo'
    },
    deviceInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'device_info',
      comment: 'Información del dispositivo en formato JSON'
    }
  }, {
    tableName: 'facial_biometric_data',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['company_id'] },
      { fields: ['is_active'] },
      { fields: ['created_at'] }
    ]
  });

  return FacialBiometricData;
};
