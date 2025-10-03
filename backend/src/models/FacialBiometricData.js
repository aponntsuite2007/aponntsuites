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
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Template principal (embedding vectorial)
    faceEmbedding: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Vector de características faciales (embeddings) serializado'
    },
    // Múltiples templates para mayor robustez
    faceEmbedding2: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Template secundario para redundancia'
    },
    faceEmbedding3: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Template terciario para mayor precisión'
    },
    // Foto capturada
    capturedPhoto: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Foto facial capturada en formato base64'
    },
    // Metadatos de calidad y confianza
    qualityScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 100.0
      },
      comment: 'Puntuación de calidad de la imagen facial (0-100)'
    },
    confidenceThreshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.85,
      validate: {
        min: 0.0,
        max: 1.0
      },
      comment: 'Umbral de confianza para coincidencia (0.0-1.0)'
    },
    // Algoritmo y versión
    algorithm: {
      type: DataTypes.ENUM('mlkit', 'opencv_dlib', 'tensorflow_lite', 'facenet'),
      allowNull: false,
      defaultValue: 'mlkit',
      comment: 'Algoritmo usado para generar el embedding'
    },
    algorithmVersion: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Versión del algoritmo'
    },
    // Información de la imagen
    imageWidth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Ancho de la imagen procesada'
    },
    imageHeight: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Alto de la imagen procesada'
    },
    faceBoxX: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Coordenada X del rectángulo facial'
    },
    faceBoxY: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Coordenada Y del rectángulo facial'
    },
    faceBoxWidth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Ancho del rectángulo facial'
    },
    faceBoxHeight: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Alto del rectángulo facial'
    },
    // Características de la cara detectada
    landmarks: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Puntos de referencia faciales (ojos, nariz, boca) en formato JSON'
    },
    faceAngle: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Ángulo de rotación de la cara'
    },
    // Estados y configuración
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si está activo para autenticación'
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si es el template principal del usuario'
    },
    // Dispositivo y contexto
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del dispositivo donde se registró'
    },
    deviceModel: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Modelo del dispositivo'
    },
    appVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Versión de la app al registrar'
    },
    // Uso y rendimiento
    successfulMatches: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Número de coincidencias exitosas'
    },
    failedAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Número de intentos fallidos'
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última vez usado para autenticación'
    },
    lastMatchScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Puntuación de la última coincidencia'
    },
    // Validación y seguridad
    isValidated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si fue validado por un supervisor'
    },
    validatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del usuario que validó'
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de validación'
    },
    // Notas y observaciones
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales'
    }
  }, {
    tableName: 'facial_biometric_data',
    timestamps: true,
    indexes: [
      { fields: ['userId'], unique: false },
      { fields: ['userId', 'isPrimary'], unique: false },
      { fields: ['isActive'] },
      { fields: ['algorithm'] },
      { fields: ['qualityScore'] },
      { fields: ['isValidated'] },
      { fields: ['createdAt'] }
    ]
  });

  return FacialBiometricData;
};