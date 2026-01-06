const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id: {
      type: DataTypes.INTEGER,
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
    po_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    // NUEVO: Tipo de orden (producto, servicio, mixto)
    order_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'product',
      validate: {
        isIn: [['product', 'service', 'mixed']]
      }
    },

    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'sent', 'confirmed', 'in_progress', 'completed', 'cancelled']]
      }
    },

    issue_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    delivery_date: {
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

    delivery_address: {
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
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approved_at: {
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
    tableName: 'purchase_orders',
    timestamps: false,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['supplier_id'] },
      { fields: ['status'] },
      { fields: ['order_type'] }
    ]
  });

  PurchaseOrder.associate = (models) => {
    // Pertenece a una empresa
    if (models.Company) {
      PurchaseOrder.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }

    // Tiene muchos items
    if (models.PurchaseOrderItem) {
      PurchaseOrder.hasMany(models.PurchaseOrderItem, {
        foreignKey: 'purchase_order_id',
        as: 'items'
      });
    }

    // Tiene muchos adjuntos
    if (models.PurchaseOrderAttachment) {
      PurchaseOrder.hasMany(models.PurchaseOrderAttachment, {
        foreignKey: 'purchase_order_id',
        as: 'attachments'
      });
    }

    // Creado por usuario
    if (models.User) {
      PurchaseOrder.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
      PurchaseOrder.belongsTo(models.User, {
        foreignKey: 'approved_by',
        as: 'approver'
      });
    }
  };

  return PurchaseOrder;
};
