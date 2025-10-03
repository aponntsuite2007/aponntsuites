const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalStudyRequest = sequelize.define('MedicalStudyRequest', {
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
    }
  },
  
  // Tipo de solicitud
  requestType: {
    type: DataTypes.ENUM('existing_studies', 'additional_studies', 'both'),
    allowNull: false,
    defaultValue: 'existing_studies'
  },
  
  // Estudios existentes solicitados
  existingStudiesRequested: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array de tipos de estudios solicitados que ya tiene el paciente'
  },
  
  // Estudios adicionales solicitados
  additionalStudiesRequested: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array de nuevos estudios médicos que debe realizarse el paciente'
  },
  
  // Justificación médica
  medicalJustification: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Justificación médica para la solicitud de estudios'
  },
  
  // Urgencia
  urgency: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  
  // Fecha límite para presentar estudios
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Instrucciones específicas
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Instrucciones específicas para el empleado'
  },
  
  // Estado de la solicitud
  status: {
    type: DataTypes.ENUM('pending', 'partially_completed', 'completed', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // Respuesta del empleado
  employeeResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comentarios del empleado sobre los estudios'
  },
  
  // Estudios subidos
  uploadedStudies: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array de estudios subidos por el empleado'
  },
  
  // Revisión médica
  medicalReview: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Revisión médica de los estudios presentados'
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
  
  // Configuración
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si es obligatorio presentar los estudios'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Metadatos adicionales'
  }
}, {
  tableName: 'medical_study_requests',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'status']
    },
    {
      fields: ['certificateId']
    },
    {
      fields: ['requestedById']
    },
    {
      fields: ['dueDate']
    }
  ]
});

// Asociaciones se definen en database.js
// MedicalStudyRequest.belongsTo(MedicalCertificate, {
//   foreignKey: 'certificateId',
//   as: 'certificate'
// });

// MedicalStudyRequest.belongsTo(User, {
//   foreignKey: 'userId',
//   as: 'employee'
// });

// MedicalStudyRequest.belongsTo(User, {
//   foreignKey: 'requestedById',
//   as: 'requestedBy'
// });

// MedicalStudyRequest.belongsTo(User, {
//   foreignKey: 'reviewedById',
//   as: 'reviewer'
// });

// Getters para tipos de estudios
MedicalStudyRequest.prototype.getExistingStudyTypes = function() {
  const types = {
    'blood_test': 'Análisis de Sangre',
    'urine_test': 'Análisis de Orina',
    'xray': 'Radiografía',
    'ct_scan': 'Tomografía',
    'mri': 'Resonancia Magnética',
    'ultrasound': 'Ecografía',
    'electrocardiogram': 'Electrocardiograma',
    'endoscopy': 'Endoscopía',
    'mammography': 'Mamografía',
    'bone_scan': 'Gammagrafía Ósea',
    'allergy_test': 'Test de Alergias',
    'psychological_evaluation': 'Evaluación Psicológica'
  };
  
  return (this.existingStudiesRequested || []).map(type => ({
    type,
    name: types[type] || type
  }));
};

MedicalStudyRequest.prototype.getAdditionalStudyTypes = function() {
  const types = {
    'blood_test': 'Análisis de Sangre',
    'urine_test': 'Análisis de Orina',
    'xray': 'Radiografía',
    'ct_scan': 'Tomografía',
    'mri': 'Resonancia Magnética',
    'ultrasound': 'Ecografía',
    'electrocardiogram': 'Electrocardiograma',
    'endoscopy': 'Endoscopía',
    'mammography': 'Mamografía',
    'bone_scan': 'Gammagrafía Ósea',
    'allergy_test': 'Test de Alergias',
    'psychological_evaluation': 'Evaluación Psicológica',
    'spirometry': 'Espirometría',
    'audiometry': 'Audiometría',
    'visual_acuity': 'Agudeza Visual',
    'ergonomic_evaluation': 'Evaluación Ergonómica'
  };
  
  return (this.additionalStudiesRequested || []).map(type => ({
    type,
    name: types[type] || type
  }));
};

// Getters para estado
MedicalStudyRequest.prototype.isPending = function() {
  return this.status === 'pending';
};

MedicalStudyRequest.prototype.isPartiallyCompleted = function() {
  return this.status === 'partially_completed';
};

MedicalStudyRequest.prototype.isCompleted = function() {
  return this.status === 'completed';
};

MedicalStudyRequest.prototype.isExpired = function() {
  return this.status === 'expired' || (this.dueDate && new Date() > this.dueDate);
};

MedicalStudyRequest.prototype.getUrgencyText = function() {
  const urgencyTexts = {
    'low': 'Baja',
    'normal': 'Normal',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  return urgencyTexts[this.urgency] || 'Normal';
};

  return MedicalStudyRequest;
};