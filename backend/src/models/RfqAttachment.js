const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RfqAttachment = sequelize.define('RfqAttachment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    quotation_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'supplier_quotations',
        key: 'id'
      }
    },

    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    // NUEVO: Tipo de adjunto del proveedor
    attachment_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'informative',
      validate: {
        isIn: [['quotation_document', 'technical_specs', 'sample_photo', 'certificate', 'other']]
      }
    },

    // NUEVO: Indica si es respuesta a un adjunto contractual
    is_response_to_requirement: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // NUEVO: Referencia al adjunto de la empresa al que responde
    company_attachment_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'rfq_company_attachments',
        key: 'id'
      }
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    uploaded_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'rfq_attachments',
    timestamps: false,
    indexes: [
      { fields: ['quotation_id'] },
      { fields: ['attachment_type'] },
      { fields: ['company_attachment_id'] }
    ]
  });

  RfqAttachment.associate = (models) => {
    // Pertenece a una cotización de proveedor
    if (models.SupplierQuotation) {
      RfqAttachment.belongsTo(models.SupplierQuotation, {
        foreignKey: 'quotation_id',
        as: 'quotation'
      });
    }

    // Referencia al adjunto de la empresa (si es respuesta)
    if (models.RfqCompanyAttachment) {
      RfqAttachment.belongsTo(models.RfqCompanyAttachment, {
        foreignKey: 'company_attachment_id',
        as: 'companyAttachment'
      });
    }

    // Usuario que subió
    if (models.User) {
      RfqAttachment.belongsTo(models.User, {
        foreignKey: 'uploaded_by',
        as: 'uploader'
      });
    }
  };

  return RfqAttachment;
};
