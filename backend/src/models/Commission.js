/**
 * MODEL: Commission
 *
 * Comisiones generadas por pagos (venta, soporte, líder).
 * Se generan automáticamente al registrar un pago.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const Commission = sequelize.define('Commission', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  partner_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'partners',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  commission_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['sale', 'support', 'leader']]
    }
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
  payment_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'payments',
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
  base_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  commission_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
    allowNull: false
  },
  originated_from_partner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'partners',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  billing_period_month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  billing_period_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    allowNull: false,
    validate: {
      isIn: [['pending', 'paid', 'cancelled']]
    }
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
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
  tableName: 'commissions',
  timestamps: false,
  underscored: true
});

module.exports = Commission;
