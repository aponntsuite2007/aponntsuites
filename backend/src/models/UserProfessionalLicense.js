const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserProfessionalLicense = sequelize.define('UserProfessionalLicense', {
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
    licenseName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'license_name',
      comment: 'Ej: Matrícula Médica, Matrícula de Abogado'
    },
    profession: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Ej: Médico, Abogado, Contador, Arquitecto'
    },
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'license_number'
    },
    issuingBody: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'issuing_body',
      comment: 'Ej: Colegio Médico de Buenos Aires, Colegio de Abogados'
    },
    issuingCountry: {
      type: DataTypes.STRING(100),
      defaultValue: 'Argentina',
      field: 'issuing_country'
    },
    jurisdiction: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Ej: Buenos Aires, Nacional, Córdoba'
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'issue_date'
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'expiry_date',
      comment: 'VENCIMIENTO - Algunas profesiones requieren renovación periódica'
    },
    certificateUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'certificate_url',
      comment: 'URL del certificado escaneado'
    },
    verificationUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'verification_url',
      comment: 'URL para verificar online en el sitio del organismo emisor'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    requiresRenewal: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'requires_renewal',
      comment: 'Si requiere renovación periódica'
    },
    renewalFrequency: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'renewal_frequency',
      comment: 'Ej: anual, bienal, quinquenal'
    },
    lastRenewalDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_renewal_date'
    },
    isSuspended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_suspended'
    },
    suspensionStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'suspension_start_date'
    },
    suspensionEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'suspension_end_date'
    },
    suspensionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'suspension_reason'
    },
    specializations: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Especialidades adicionales'
    },
    observations: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'user_professional_licenses',
    timestamps: true,
    underscored: true
  });

  UserProfessionalLicense.associate = (models) => {
    UserProfessionalLicense.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserProfessionalLicense.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
  };

  return UserProfessionalLicense;
};
