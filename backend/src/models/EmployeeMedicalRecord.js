const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeMedicalRecord = sequelize.define('EmployeeMedicalRecord', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Información personal médica
    bloodType: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true
    },
    height: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Altura en centímetros'
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Peso en kilogramos'
    },
    // Información de contacto de emergencia
    emergencyContact: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Contacto de emergencia con nombre, teléfono, relación'
    },
    // Alergias
    allergies: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Lista de alergias conocidas con detalles'
    },
    medicationAllergies: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Alergias específicas a medicamentos'
    },
    // Enfermedades crónicas y preexistentes
    chronicDiseases: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Enfermedades crónicas diagnosticadas'
    },
    preexistingConditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Condiciones médicas preexistentes'
    },
    // Medicación habitual
    currentMedications: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Medicamentos que toma habitualmente'
    },
    // Historial quirúrgico
    surgicalHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Historial de cirugías realizadas'
    },
    // Historial familiar
    familyMedicalHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Antecedentes médicos familiares relevantes'
    },
    // Hábitos y estilo de vida
    smokingStatus: {
      type: DataTypes.ENUM('never', 'former', 'current'),
      allowNull: true
    },
    alcoholConsumption: {
      type: DataTypes.ENUM('none', 'occasional', 'moderate', 'heavy'),
      allowNull: true
    },
    exerciseFrequency: {
      type: DataTypes.ENUM('none', 'rare', 'weekly', 'daily'),
      allowNull: true
    },
    // Uso de anteojos (para validación biométrica)
    usesGlasses: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el empleado usa anteojos'
    },
    glassesType: {
      type: DataTypes.ENUM('reading', 'distance', 'bifocals', 'progressive', 'other'),
      allowNull: true,
      comment: 'Tipo de anteojos que usa'
    },
    glassesPermanent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si usa anteojos permanentemente o solo ocasionalmente'
    },
    glassesNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre uso de anteojos (prescripción, razón médica, etc.)'
    },
    // Vacunas
    vaccinations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Historial de vacunaciones'
    },
    // Información ocupacional
    occupationalHazards: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Riesgos ocupacionales del puesto de trabajo'
    },
    workInjuryHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Historial de accidentes laborales'
    },
    // Exámenes médicos laborales
    lastMedicalExam: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextMedicalExam: {
      type: DataTypes.DATE,
      allowNull: true
    },
    medicalExamResults: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Resultados del último examen médico laboral'
    },
    // Estado de salud actual
    healthStatus: {
      type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
      allowNull: true
    },
    fitnessForWork: {
      type: DataTypes.ENUM('fit', 'fit_with_restrictions', 'temporarily_unfit', 'permanently_unfit'),
      defaultValue: 'fit'
    },
    workRestrictions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Restricciones laborales médicamente indicadas'
    },
    // Seguimiento médico
    requiresFollowUp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    followUpFrequency: {
      type: DataTypes.ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual'),
      allowNull: true
    },
    followUpNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Control de privacidad
    privacyConsent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Consentimiento para el uso de datos médicos'
    },
    dataRetentionUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha hasta la cual se conservan los datos'
    },
    // Metadata
    lastUpdatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    medicalOfficerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Médico laboral asignado'
    }
  }, {
    tableName: 'employee_medical_records',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
        unique: true
      },
      {
        fields: ['bloodType']
      },
      {
        fields: ['fitnessForWork']
      },
      {
        fields: ['healthStatus']
      },
      {
        fields: ['lastMedicalExam']
      },
      {
        fields: ['nextMedicalExam']
      },
      {
        fields: ['medicalOfficerId']
      }
    ]
  });

  // Asociaciones
  EmployeeMedicalRecord.associate = (models) => {
    // Una ficha médica pertenece a un empleado
    EmployeeMedicalRecord.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'employee'
    });

    // Una ficha médica puede tener un médico laboral asignado
    EmployeeMedicalRecord.belongsTo(models.User, {
      foreignKey: 'medicalOfficerId',
      as: 'medicalOfficer'
    });

    // Una ficha médica puede ser actualizada por alguien
    EmployeeMedicalRecord.belongsTo(models.User, {
      foreignKey: 'lastUpdatedBy',
      as: 'updatedBy'
    });
  };

  return EmployeeMedicalRecord;
};