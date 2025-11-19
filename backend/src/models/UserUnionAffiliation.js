const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserUnionAffiliation = sequelize.define('UserUnionAffiliation', {
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
    unionName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'union_name',
      comment: 'Ej: UOM, Sindicato de Empleados de Comercio'
    },
    unionFullName: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'union_full_name',
      comment: 'Nombre completo oficial'
    },
    unionCuit: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: 'union_cuit',
      comment: 'CUIT del sindicato'
    },
    membershipNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'membership_number',
      comment: 'Número de afiliado'
    },
    affiliationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'affiliation_date',
      comment: 'Fecha de afiliación'
    },
    resignationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'resignation_date',
      comment: 'Fecha de desafiliación (si aplica)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    delegateRole: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'delegate_role',
      comment: 'Ej: delegado, subdelegado, miembro_comision, afiliado_simple'
    },
    delegateStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'delegate_start_date',
      comment: 'Si es delegado, desde cuándo'
    },
    delegateEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'delegate_end_date',
      comment: 'Si fue delegado, hasta cuándo'
    },
    sectionOrBranch: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'section_or_branch',
      comment: 'Sección o rama del sindicato'
    },
    workplaceDelegate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'workplace_delegate',
      comment: 'Si es delegado de planta/establecimiento'
    },
    hasFueroSindical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_fuero_sindical',
      comment: 'Si el empleado tiene fuero sindical (protección legal especial)'
    },
    fueroStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fuero_start_date'
    },
    fueroEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fuero_end_date'
    },
    monthlyDues: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'monthly_dues',
      comment: 'Cuota mensual'
    },
    duesPaymentMethod: {
      type: DataTypes.ENUM('descuento_automatico', 'transferencia', 'efectivo', 'debito'),
      allowNull: true,
      field: 'dues_payment_method',
      comment: 'Método de pago de cuota sindical'
    },
    lastPaymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_payment_date'
    },
    unionPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'union_phone'
    },
    unionEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'union_email'
    },
    unionAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'union_address'
    },
    unionDelegateContact: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'union_delegate_contact',
      comment: 'Contacto del delegado general'
    },
    membershipCardUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'membership_card_url',
      comment: 'Foto del carnet sindical'
    },
    certificateUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'certificate_url',
      comment: 'Certificado de afiliación'
    },
    benefits: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Beneficios sindicales (ej: descuentos, obra social)'
    },
    notes: {
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
    tableName: 'user_union_affiliation',
    timestamps: true,
    underscored: true
  });

  UserUnionAffiliation.associate = (models) => {
    UserUnionAffiliation.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserUnionAffiliation.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
  };

  return UserUnionAffiliation;
};
