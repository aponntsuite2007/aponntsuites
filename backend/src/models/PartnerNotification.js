const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerNotification = sequelize.define('PartnerNotification', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    notification_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    related_service_request_id: {
      type: DataTypes.INTEGER
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'partner_notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return PartnerNotification;
};
