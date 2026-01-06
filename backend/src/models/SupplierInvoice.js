const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupplierInvoice = sequelize.define('SupplierInvoice', {
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
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    purchase_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'purchase_orders',
        key: 'id'
      }
    },

    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    tax: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },

    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },

    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'validated', 'approved', 'paid', 'rejected', 'disputed']]
      }
    },

    // NUEVO: Validación de factura
    invoice_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'TRUE si se requiere factura para pagar'
    },
    invoice_validated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'TRUE si factura fue validada por empresa'
    },
    invoice_validation_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    validated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    validated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    file_path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    notes: {
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
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'supplier_invoices',
    timestamps: false,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['supplier_id'] },
      { fields: ['purchase_order_id'] },
      { fields: ['status'] },
      { fields: ['invoice_validated'] }
    ]
  });

  SupplierInvoice.associate = (models) => {
    // Pertenece a una empresa
    if (models.Company) {
      SupplierInvoice.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }

    // Pertenece a una orden de compra
    if (models.PurchaseOrder) {
      SupplierInvoice.belongsTo(models.PurchaseOrder, {
        foreignKey: 'purchase_order_id',
        as: 'purchaseOrder'
      });
    }

    // Tiene muchos items
    if (models.SupplierInvoiceItem) {
      SupplierInvoice.hasMany(models.SupplierInvoiceItem, {
        foreignKey: 'invoice_id',
        as: 'items'
      });
    }

    // Usuario que subió
    if (models.User) {
      SupplierInvoice.belongsTo(models.User, {
        foreignKey: 'uploaded_by',
        as: 'uploader'
      });
      SupplierInvoice.belongsTo(models.User, {
        foreignKey: 'validated_by',
        as: 'validator'
      });
    }
  };

  return SupplierInvoice;
};
