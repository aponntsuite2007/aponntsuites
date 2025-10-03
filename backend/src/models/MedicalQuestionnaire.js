const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalQuestionnaire = sequelize.define('MedicalQuestionnaire', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Identificación del cuestionario
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    version: {
      type: DataTypes.STRING,
      defaultValue: '1.0'
    },
    // Configuración por empresa/sucursal
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Branches',
        key: 'id'
      }
    },
    // Preguntas del cuestionario (JSON)
    questions: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array de objetos con preguntas del cuestionario médico'
    },
    // Estado y configuración
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Responsable médico que configuró el cuestionario
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
      allowNull: true
    }
  }, {
    tableName: 'medical_questionnaires',
    timestamps: true,
    indexes: [
      {
        fields: ['branchId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isDefault']
      }
    ]
  });

  // Asociaciones
  MedicalQuestionnaire.associate = (models) => {
    // Un cuestionario puede estar asociado a una sucursal
    MedicalQuestionnaire.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch'
    });

    // Creado por un usuario (médico/admin)
    MedicalQuestionnaire.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return MedicalQuestionnaire;
};