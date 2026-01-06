const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
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

    // NUEVO: Tipo de item (producto o servicio)
    item_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'product',
      validate: {
        isIn: [['product', 'service']]
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

    // NUEVO: Imputación contable automática
    accounting_category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Categoría contable: MATERIA_PRIMA, REPUESTOS, SERVICIOS_TORNERIA, SERVICIOS_MANTENIMIENTO, etc.'
    },
    accounting_account_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID de cuenta contable del plan de cuentas (finance_chart_of_accounts)'
    },

    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'purchase_order_items',
    timestamps: false,
    indexes: [
      { fields: ['purchase_order_id'] },
      { fields: ['item_type'] },
      { fields: ['accounting_category'] }
    ]
  });

  PurchaseOrderItem.associate = (models) => {
    // Pertenece a una orden de compra
    if (models.PurchaseOrder) {
      PurchaseOrderItem.belongsTo(models.PurchaseOrder, {
        foreignKey: 'purchase_order_id',
        as: 'purchaseOrder'
      });
    }

    // Referencia a cuenta contable (si existe modelo)
    if (models.FinanceChartOfAccount) {
      PurchaseOrderItem.belongsTo(models.FinanceChartOfAccount, {
        foreignKey: 'accounting_account_id',
        as: 'accountingAccount'
      });
    }
  };

  return PurchaseOrderItem;
};
