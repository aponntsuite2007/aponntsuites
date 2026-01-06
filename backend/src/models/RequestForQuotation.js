const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RequestForQuotation = sequelize.define('RequestForQuotation', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },

    rfq_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'published', 'in_evaluation', 'awarded', 'closed', 'cancelled']]
      }
    },

    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    deadline: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },

    delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    delivery_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    evaluation_criteria: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_terms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    published_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'request_for_quotations',
    timestamps: false,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['status'] },
      { fields: ['rfq_number'], unique: true }
    ]
  });

  RequestForQuotation.associate = (models) => {
    // Pertenece a una empresa
    if (models.Company) {
      RequestForQuotation.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }

    // Tiene muchos items
    if (models.RfqItem) {
      RequestForQuotation.hasMany(models.RfqItem, {
        foreignKey: 'rfq_id',
        as: 'items'
      });
    }

    // Tiene muchos adjuntos de la empresa
    if (models.RfqCompanyAttachment) {
      RequestForQuotation.hasMany(models.RfqCompanyAttachment, {
        foreignKey: 'rfq_id',
        as: 'companyAttachments'
      });
    }

    // Tiene muchas invitaciones a proveedores
    if (models.RfqInvitation) {
      RequestForQuotation.hasMany(models.RfqInvitation, {
        foreignKey: 'rfq_id',
        as: 'invitations'
      });
    }

    // Creado por usuario
    if (models.User) {
      RequestForQuotation.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
      RequestForQuotation.belongsTo(models.User, {
        foreignKey: 'published_by',
        as: 'publisher'
      });
    }
  };

  return RequestForQuotation;
};
