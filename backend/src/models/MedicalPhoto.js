const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalPhoto = sequelize.define('MedicalPhoto', {
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
    requestedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Médico que solicitó la foto'
    },
    // Información de la foto
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    originalFileName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Detalles médicos
    bodyPart: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Parte del cuerpo fotografiada'
    },
    bodyPartDetail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Detalle específico (ej: "mano izquierda", "rodilla derecha")'
    },
    photoType: {
      type: DataTypes.ENUM('injury', 'lesion', 'swelling', 'rash', 'wound', 'other'),
      allowNull: false,
      comment: 'Tipo de afección fotografiada'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción de lo que se ve en la foto'
    },
    // Solicitud del médico
    requestReason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Motivo por el cual el médico solicita la foto'
    },
    requestInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Instrucciones específicas para tomar la foto'
    },
    requestDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Respuesta del empleado
    employeeNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales del empleado sobre la foto'
    },
    photoDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha cuando se tomó la foto'
    },
    // Estado
    status: {
      type: DataTypes.ENUM('requested', 'uploaded', 'reviewed', 'rejected'),
      defaultValue: 'requested'
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si es obligatoria para continuar el proceso'
    },
    // Revisión médica de la foto
    medicalReview: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Comentarios del médico sobre la foto'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Datos adicionales de la imagen (resolución, geolocalización, etc.)'
    }
  }, {
    tableName: 'medical_photos',
    timestamps: true,
    indexes: [
      {
        fields: ['certificateId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['requestedById']
      },
      {
        fields: ['status']
      },
      {
        fields: ['bodyPart']
      },
      {
        fields: ['photoType']
      }
    ]
  });

  // Asociaciones
  MedicalPhoto.associate = (models) => {
    // Una foto pertenece a un certificado médico
    MedicalPhoto.belongsTo(models.MedicalCertificate, {
      foreignKey: 'certificateId',
      as: 'certificate'
    });

    // Una foto pertenece a un empleado
    MedicalPhoto.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'employee'
    });

    // Una foto fue solicitada por un médico
    MedicalPhoto.belongsTo(models.User, {
      foreignKey: 'requestedById',
      as: 'requestedBy'
    });

    // Una foto puede ser revisada por un médico
    MedicalPhoto.belongsTo(models.User, {
      foreignKey: 'reviewedById',
      as: 'reviewedBy'
    });
  };

  return MedicalPhoto;
};