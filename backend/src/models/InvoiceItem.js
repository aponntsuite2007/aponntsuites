/**
 * MODEL: InvoiceItem
 *
 * Items individuales de cada factura (módulos, usuarios adicionales, etc.)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  item_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invoice_items',
  timestamps: false,
  underscored: true
});

module.exports = InvoiceItem;
