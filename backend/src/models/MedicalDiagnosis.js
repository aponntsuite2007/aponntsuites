const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalDiagnosis = sequelize.define('MedicalDiagnosis', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Código del nomenclador (CIE-10, etc.)
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // Descripción del diagnóstico
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Categoría médica
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Configuración de días típicos de baja
    typicalDaysOff: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Días típicos de baja para este diagnóstico'
    },
    minDaysOff: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    maxDaysOff: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Flags de control
    requiresAudit: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si requiere auditoría médica obligatoriamente'
    },
    requiresCertificate: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si requiere certificado médico obligatoriamente'
    },
    isWorkRelated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si típicamente es relacionado al trabajo'
    },
    // Estado
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    tableName: 'medical_diagnoses',
    timestamps: true,
    indexes: [
      {
        fields: ['code']
      },
      {
        fields: ['category']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['requiresAudit']
      }
    ]
  });

  // Asociaciones
  MedicalDiagnosis.associate = (models) => {
    // Creado por un usuario (médico/admin)
    MedicalDiagnosis.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return MedicalDiagnosis;
};