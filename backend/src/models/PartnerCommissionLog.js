const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerCommissionLog = sequelize.define('PartnerCommissionLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_request_id: {
      type: DataTypes.INTEGER
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    calculation_method: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    base_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    commission_percentage: {
      type: DataTypes.DECIMAL(5, 2)
    },
    commission_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ARS'
    },
    payment_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    payment_date: {
      type: DataTypes.DATEONLY
    },
    payment_reference: {
      type: DataTypes.STRING(100)
    },
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    calculation_details: {
      type: DataTypes.JSONB
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'partner_commissions_log',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerCommissionLog;
};
