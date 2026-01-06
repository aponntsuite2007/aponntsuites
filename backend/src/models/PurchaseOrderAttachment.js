const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PurchaseOrderAttachment = sequelize.define('PurchaseOrderAttachment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    purchase_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'purchase_orders',
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

    // Tipo de adjunto en orden de compra
    attachment_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'purchase_order_copy',
      validate: {
        isIn: [['purchase_order_copy', 'technical_spec', 'delivery_instructions', 'quality_requirements', 'other']]
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

    // Avisos
    legal_notice: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Tracking proveedor
    downloaded_by_supplier: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    downloaded_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // DMS
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
    }
  }, {
    tableName: 'purchase_order_attachments',
    timestamps: false,
    indexes: [
      { fields: ['purchase_order_id'] },
      { fields: ['company_id'] }
    ]
  });

  PurchaseOrderAttachment.associate = (models) => {
    // Pertenece a una orden de compra
    if (models.PurchaseOrder) {
      PurchaseOrderAttachment.belongsTo(models.PurchaseOrder, {
        foreignKey: 'purchase_order_id',
        as: 'purchaseOrder'
      });
    }

    // Pertenece a una empresa
    if (models.Company) {
      PurchaseOrderAttachment.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }

    // Usuario que subió
    if (models.User) {
      PurchaseOrderAttachment.belongsTo(models.User, {
        foreignKey: 'uploaded_by',
        as: 'uploader'
      });
    }
  };

  return PurchaseOrderAttachment;
};
