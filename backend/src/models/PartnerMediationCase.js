const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerMediationCase = sequelize.define('PartnerMediationCase', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    service_request_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    complainant_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    complaint_reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    mediator_id: {
      type: DataTypes.INTEGER
    },
    assigned_at: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    resolution_notes: {
      type: DataTypes.TEXT
    },
    resolution_action: {
      type: DataTypes.STRING(50)
    },
    resolved_at: {
      type: DataTypes.DATE
    },
    resolved_by: {
      type: DataTypes.INTEGER
    },
    partner_penalized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    company_penalized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    penalty_amount: {
      type: DataTypes.DECIMAL(10, 2)
    }
  }, {
    tableName: 'partner_mediation_cases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerMediationCase;
};
