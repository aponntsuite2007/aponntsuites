const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RfqItem = sequelize.define('RfqItem', {
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

    estimated_unit_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },

    specifications: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'rfq_items',
    timestamps: false,
    indexes: [
      { fields: ['rfq_id'] },
      { fields: ['item_type'] },
      { fields: ['accounting_category'] }
    ]
  });

  RfqItem.associate = (models) => {
    // Pertenece a un RFQ
    if (models.RequestForQuotation) {
      RfqItem.belongsTo(models.RequestForQuotation, {
        foreignKey: 'rfq_id',
        as: 'rfq'
      });
    }

    // Referencia a cuenta contable (si existe modelo)
    if (models.FinanceChartOfAccount) {
      RfqItem.belongsTo(models.FinanceChartOfAccount, {
        foreignKey: 'accounting_account_id',
        as: 'accountingAccount'
      });
    }
  };

  return RfqItem;
};
