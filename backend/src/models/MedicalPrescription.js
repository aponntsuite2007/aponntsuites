const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalPrescription = sequelize.define('MedicalPrescription', {
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
    // Información de la receta
    prescriptionNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Médico prescriptor
    physicianName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    physicianLicense: {
      type: DataTypes.STRING,
      allowNull: true
    },
    medicalCenter: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Medicamentos (JSON array)
    medications: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array de medicamentos con nombre, dosis, frecuencia, duración'
    },
    // Indicaciones
    generalInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Estado de la receta
    status: {
      type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled'),
      defaultValue: 'active'
    },
    // Archivos
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'URLs de imágenes de la receta escaneada'
    },
    // Metadata
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'medical_prescriptions',
    timestamps: true,
    indexes: [
      {
        fields: ['certificateId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['issueDate']
      }
    ]
  });

  // Asociaciones
  MedicalPrescription.associate = (models) => {
    // Una receta pertenece a un certificado médico
    MedicalPrescription.belongsTo(models.MedicalCertificate, {
      foreignKey: 'certificateId',
      as: 'certificate'
    });

    // Una receta pertenece a un usuario
    MedicalPrescription.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'employee'
    });
  };

  return MedicalPrescription;
};