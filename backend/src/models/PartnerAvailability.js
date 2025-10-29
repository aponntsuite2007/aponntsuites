const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerAvailability = sequelize.define('PartnerAvailability', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    unavailable_reason: {
      type: DataTypes.TEXT
    },
    recurrence_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'weekly'
    }
  }, {
    tableName: 'partner_availability',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerAvailability;
};
