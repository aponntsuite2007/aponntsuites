const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserLegalIssue = sequelize.define('UserLegalIssue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id'
      },
      index: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      index: true
    },
    issueType: {
      type: DataTypes.ENUM('penal', 'civil', 'laboral', 'comercial', 'administrativo', 'otro'),
      allowNull: false,
      field: 'issue_type',
      comment: 'Tipo de causa: penal, civil, laboral, comercial, administrativo'
    },
    issueSubtype: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'issue_subtype',
      comment: 'Ej: Daños y perjuicios, Incumplimiento contractual'
    },
    caseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'case_number',
      comment: 'Número de expediente'
    },
    court: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Juzgado/tribunal'
    },
    jurisdiction: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Ej: Buenos Aires, Federal'
    },
    filingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'filing_date',
      comment: 'Fecha de inicio de la causa'
    },
    resolutionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'resolution_date',
      comment: 'Fecha de resolución (si ya finalizó)'
    },
    lastHearingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_hearing_date'
    },
    nextHearingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'next_hearing_date'
    },
    status: {
      type: DataTypes.ENUM('en_tramite', 'resuelto', 'archivado', 'desestimado', 'apelacion', 'ejecutoria'),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción breve de la causa'
    },
    plaintiff: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Demandante/querellante'
    },
    defendant: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Demandado'
    },
    outcome: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Resultado/sentencia'
    },
    sentenceDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'sentence_details',
      comment: 'Detalles de la condena (si aplica)'
    },
    fineAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'fine_amount',
      comment: 'Multa impuesta (si aplica)'
    },
    affectsEmployment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'affects_employment',
      comment: 'Si el caso afecta la elegibilidad para el empleo actual'
    },
    employmentRestrictionDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'employment_restriction_details',
      comment: 'Detalles si afecta el empleo'
    },
    documentUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'document_url',
      comment: 'URL de documentos escaneados'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isConfidential: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_confidential',
      comment: 'Marca información sensible que requiere permisos especiales para visualizar'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'user_legal_issues',
    timestamps: true,
    underscored: true
  });

  UserLegalIssue.associate = (models) => {
    UserLegalIssue.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserLegalIssue.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
  };

  return UserLegalIssue;
};
