const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupplierInvoiceItem = sequelize.define('SupplierInvoiceItem', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    invoice_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'supplier_invoices',
        key: 'id'
      }
    },

    product_code: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    quantity: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false
    },

    unit_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    tax_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'supplier_invoice_items',
    timestamps: false,
    indexes: [
      { fields: ['invoice_id'] }
    ]
  });

  SupplierInvoiceItem.associate = (models) => {
    // Pertenece a una factura
    if (models.SupplierInvoice) {
      SupplierInvoiceItem.belongsTo(models.SupplierInvoice, {
        foreignKey: 'invoice_id',
        as: 'invoice'
      });
    }
  };

  return SupplierInvoiceItem;
};
