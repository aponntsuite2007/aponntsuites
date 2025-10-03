const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalHistory = sequelize.define('MedicalHistory', {
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
    // Información del episodio médico
    episodeDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha del episodio médico'
    },
    episodeType: {
      type: DataTypes.ENUM(
        'illness', 'injury', 'accident', 'surgery', 'hospitalization', 
        'emergency_visit', 'routine_checkup', 'vaccination', 'other'
      ),
      allowNull: false
    },
    // Diagnóstico
    primaryDiagnosis: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Diagnóstico principal'
    },
    primaryDiagnosisCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Código CIE-10 del diagnóstico principal'
    },
    secondaryDiagnoses: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Diagnósticos secundarios'
    },
    // Detalles del episodio
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Síntomas reportados'
    },
    treatment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Tratamiento recibido'
    },
    medications: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Medicamentos prescritos'
    },
    // Duración y severidad
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha de inicio de los síntomas/episodio'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de recuperación/fin del episodio'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duración en días'
    },
    severity: {
      type: DataTypes.ENUM('mild', 'moderate', 'severe', 'critical'),
      allowNull: true
    },
    // Impacto laboral
    workDaysLost: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Días de trabajo perdidos por este episodio'
    },
    workRelated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el episodio está relacionado con el trabajo'
    },
    returnToWorkDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de regreso al trabajo'
    },
    workRestrictions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Restricciones laborales aplicadas'
    },
    // Proveedor médico
    healthcareProvider: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Proveedor de salud que atendió'
    },
    attendingPhysician: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Médico tratante'
    },
    institution: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Institución donde fue atendido'
    },
    // Seguimiento
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    followUpCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nextAppointment: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Estado del episodio
    status: {
      type: DataTypes.ENUM('active', 'resolved', 'chronic', 'recurring'),
      defaultValue: 'resolved'
    },
    outcome: {
      type: DataTypes.ENUM('full_recovery', 'partial_recovery', 'no_change', 'worsened', 'chronic'),
      allowNull: true
    },
    // Complicaciones
    complications: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Complicaciones que surgieron'
    },
    // Prevención
    preventiveMeasures: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Medidas preventivas recomendadas'
    },
    // Certificado médico asociado
    certificateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'MedicalCertificates',
        key: 'id'
      }
    },
    // Documentación
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Documentos adjuntos relacionados'
    },
    // Metadata
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'medical_history',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['episodeDate']
      },
      {
        fields: ['episodeType']
      },
      {
        fields: ['primaryDiagnosisCode']
      },
      {
        fields: ['startDate']
      },
      {
        fields: ['endDate']
      },
      {
        fields: ['workRelated']
      },
      {
        fields: ['status']
      },
      {
        fields: ['certificateId']
      },
      // Índice compuesto para búsquedas de historial por empleado y diagnóstico
      {
        fields: ['userId', 'primaryDiagnosisCode', 'episodeDate']
      }
    ]
  });

  // Asociaciones
  MedicalHistory.associate = (models) => {
    // Un registro de historial pertenece a un empleado
    MedicalHistory.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'employee'
    });

    // Un registro puede estar asociado a un certificado médico
    MedicalHistory.belongsTo(models.MedicalCertificate, {
      foreignKey: 'certificateId',
      as: 'certificate'
    });

    // Un registro fue creado por alguien
    MedicalHistory.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Un registro puede ser modificado por alguien
    MedicalHistory.belongsTo(models.User, {
      foreignKey: 'lastModifiedBy',
      as: 'modifier'
    });
  };

  return MedicalHistory;
};