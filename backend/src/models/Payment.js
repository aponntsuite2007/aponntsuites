/**
 * MODEL: Payment
 *
 * Pagos registrados contra facturas.
 * Al registrar un pago se generan comisiones automáticamente.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const Payment = sequelize.define('Payment', {
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
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'company_id'
    },
    onDelete: 'CASCADE'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  payment_reference: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  receipt_file_path: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receipt_file_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  registered_by: {
    type: DataTypes.UUID,
    allowNull: false
  },
  registered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  commissions_generated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  commissions_generated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payments',
  timestamps: false,
  underscored: true
});

module.exports = Payment;
