const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalStudy = sequelize.define('MedicalStudy', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    certificateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'MedicalCertificates',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Información del estudio
    studyType: {
      type: DataTypes.ENUM(
        'radiography', 'ct_scan', 'mri', 'ultrasound', 'blood_test', 
        'urine_test', 'electrocardiogram', 'endoscopy', 'biopsy', 
        'mammography', 'bone_scan', 'pet_scan', 'other'
      ),
      allowNull: false
    },
    studyName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre específico del estudio'
    },
    studyDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del estudio'
    },
    // Fechas
    studyDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha cuando se realizó el estudio'
    },
    uploadDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Información médica
    requestingPhysician: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Médico que solicitó el estudio'
    },
    performingInstitution: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Institución donde se realizó el estudio'
    },
    technician: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Técnico que realizó el estudio'
    },
    // Resultados
    results: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Resultados del estudio'
    },
    interpretation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Interpretación médica de los resultados'
    },
    conclusion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Conclusión médica'
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Recomendaciones basadas en el estudio'
    },
    // Valores de referencia (para estudios de laboratorio)
    referenceValues: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Valores de referencia normales para comparación'
    },
    abnormalValues: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Valores fuera de lo normal encontrados'
    },
    // Archivos
    files: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'URLs de archivos del estudio (imágenes, PDFs, etc.)'
    },
    mainFileUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL del archivo principal del estudio'
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de imagen miniatura (para estudios con imágenes)'
    },
    // Estado del estudio
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'in_progress'),
      defaultValue: 'completed'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },
    // Clasificación médica
    bodySystem: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Sistema corporal estudiado (cardiovascular, respiratorio, etc.)'
    },
    bodyPart: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Parte específica del cuerpo estudiada'
    },
    // Seguimiento
    requiresFollowUp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    followUpInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Metadatos adicionales del estudio'
    },
    // Control de calidad
    isValidated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el estudio ha sido validado por un médico'
    },
    validatedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'medical_studies',
    timestamps: true,
    indexes: [
      {
        fields: ['certificateId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['studyType']
      },
      {
        fields: ['studyDate']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['bodySystem']
      },
      {
        fields: ['isValidated']
      }
    ]
  });

  // Asociaciones
  MedicalStudy.associate = (models) => {
    // Un estudio pertenece a un certificado médico
    MedicalStudy.belongsTo(models.MedicalCertificate, {
      foreignKey: 'certificateId',
      as: 'certificate'
    });

    // Un estudio pertenece a un empleado
    MedicalStudy.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'employee'
    });

    // Un estudio puede ser validado por un médico
    MedicalStudy.belongsTo(models.User, {
      foreignKey: 'validatedById',
      as: 'validator'
    });
  };

  return MedicalStudy;
};