/**
 * MODEL: SupportPackage
 *
 * Paquetes de soporte activos asignados a partners.
 * Si el rating cae < 2 estrellas, se crea una subasta.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const SupportPackage = sequelize.define('SupportPackage', {
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
    },
    onDelete: 'CASCADE'
  },
  current_support_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'partners',
      key: 'id'
    },
    onDelete: 'RESTRICT'
  },
  original_support_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'partners',
      key: 'id'
    },
    onDelete: 'RESTRICT'
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'partners',
      key: 'id'
    },
    onDelete: 'RESTRICT'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    allowNull: false,
    validate: {
      isIn: [['active', 'lost', 'suspended', 'cancelled']]
    }
  },
  monthly_commission_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  estimated_monthly_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  current_rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00
  },
  ratings_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lost_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lost_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  last_support_change_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_support_change_reason: {
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
  tableName: 'support_packages',
  timestamps: false,
  underscored: true
});

module.exports = SupportPackage;
