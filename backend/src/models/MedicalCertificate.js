const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalCertificate = sequelize.define('MedicalCertificate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Datos del certificado
    certificateNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    requestedDays: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // Información médica
    diagnosisCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Centro médico
    hasVisitedDoctor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    medicalCenter: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attendingPhysician: {
      type: DataTypes.STRING,
      allowNull: true
    },
    medicalPrescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Cuestionario médico (JSON)
    questionnaire: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Estado y respuestas
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected', 'needs_audit'),
      defaultValue: 'pending'
    },
    // Respuesta del médico auditor
    auditorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    auditorResponse: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Información del médico tratante
    treatingPhysician: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del médico que atendió al empleado'
    },
    
    treatingPhysicianLicense: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Matrícula profesional del médico tratante'
    },
    
    medicalInstitution: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Institución médica donde fue atendido'
    },
    
    // Notificación a ART
    notifyART: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si debe notificarse a la ART'
    },
    
    artNotified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si ya se notificó a la ART'
    },
    
    artNotificationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de notificación a la ART'
    },
    approvedDays: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    needsAudit: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isJustified: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    auditDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Archivos adjuntos
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'URLs de archivos adjuntos como certificados escaneados'
    },
    // Metadata
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'medical_certificates',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['auditorId']
      },
      {
        fields: ['issueDate']
      }
    ]
  });

  // Asociaciones
  MedicalCertificate.associate = (models) => {
    // Un certificado pertenece a un usuario
    MedicalCertificate.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'employee'
    });

    // Un certificado puede tener un médico auditor
    MedicalCertificate.belongsTo(models.User, {
      foreignKey: 'auditorId',
      as: 'auditor'
    });

    // Un certificado puede tener múltiples recetas
    MedicalCertificate.hasMany(models.MedicalPrescription, {
      foreignKey: 'certificateId',
      as: 'prescriptions'
    });
  };

  return MedicalCertificate;
};