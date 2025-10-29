const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerServiceRequest = sequelize.define('PartnerServiceRequest', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    service_description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    priority: {
      type: DataTypes.STRING(20),
      defaultValue: 'normal'
    },
    scheduled_date: {
      type: DataTypes.DATE
    },
    scheduled_time: {
      type: DataTypes.TIME
    },
    estimated_duration: {
      type: DataTypes.INTEGER
    },
    actual_start_time: {
      type: DataTypes.DATE
    },
    actual_end_time: {
      type: DataTypes.DATE
    },
    completion_notes: {
      type: DataTypes.TEXT
    },
    partner_notes: {
      type: DataTypes.TEXT
    },
    location: {
      type: DataTypes.TEXT
    },
    cancellation_reason: {
      type: DataTypes.TEXT
    },
    cancelled_by: {
      type: DataTypes.STRING(20)
    },
    cancelled_at: {
      type: DataTypes.DATE
    },
    sla_deadline: {
      type: DataTypes.DATE
    },
    sla_met: {
      type: DataTypes.BOOLEAN
    }
  }, {
    tableName: 'partner_service_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerServiceRequest;
};
