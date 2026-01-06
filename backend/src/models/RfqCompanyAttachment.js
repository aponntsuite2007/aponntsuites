const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RfqCompanyAttachment = sequelize.define('RfqCompanyAttachment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    rfq_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'request_for_quotations',
        key: 'id'
      }
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },

    // Datos del archivo
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

    // Clasificación CRÍTICA del adjunto
    attachment_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'informative',
      validate: {
        isIn: [['contractual', 'informative']]
      }
    },
    binding_level: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'orientative',
      validate: {
        isIn: [['strict', 'orientative']]
      }
    },

    // Avisos legales y contractuales
    legal_notice: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    contract_clause: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deviation_allowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deviation_tolerance: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    // Consecuencias contractuales
    non_compliance_action: {
      type: DataTypes.STRING(20),
      defaultValue: 'payment_rejection',
      validate: {
        isIn: [['payment_rejection', 'partial_payment', 'claim', 'warning']]
      }
    },
    non_compliance_notice: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Metadata
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    downloaded_by_supplier: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    downloaded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    supplier_acknowledged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Integración con DMS
    dms_document_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    // Auditoría
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
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'rfq_company_attachments',
    timestamps: false,
    indexes: [
      { fields: ['rfq_id'] },
      { fields: ['company_id'] },
      { fields: ['attachment_type'] },
      { fields: ['binding_level'] }
    ]
  });

  RfqCompanyAttachment.associate = (models) => {
    // Pertenece a un RFQ
    if (models.RequestForQuotation) {
      RfqCompanyAttachment.belongsTo(models.RequestForQuotation, {
        foreignKey: 'rfq_id',
        as: 'rfq'
      });
    }

    // Pertenece a una empresa
    if (models.Company) {
      RfqCompanyAttachment.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }

    // Usuario que subió
    if (models.User) {
      RfqCompanyAttachment.belongsTo(models.User, {
        foreignKey: 'uploaded_by',
        as: 'uploader'
      });
    }
  };

  return RfqCompanyAttachment;
};
