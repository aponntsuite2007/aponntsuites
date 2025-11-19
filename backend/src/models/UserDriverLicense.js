const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserDriverLicense = sequelize.define('UserDriverLicense', {
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
    licenseType: {
      type: DataTypes.ENUM('nacional', 'internacional', 'pasajeros'),
      allowNull: false,
      field: 'license_type'
    },
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'license_number'
    },
    licenseClass: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'license_class',
      comment: 'A, B, C, D, E, etc.'
    },
    subclass: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'subclass'
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
      comment: 'VENCIMIENTO - Sistema de alertas'
    },
    photoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'photo_url',
      comment: 'URL de la foto/scan de la licencia'
    },
    issuingAuthority: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'issuing_authority'
    },
    restrictions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'restrictions'
    },
    requiresGlasses: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'requires_glasses',
      comment: 'Importante para biometría facial'
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
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
    tableName: 'user_driver_licenses',
    timestamps: true,
    underscored: true
  });

  UserDriverLicense.associate = (models) => {
    UserDriverLicense.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserDriverLicense.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
  };

  return UserDriverLicense;
};
