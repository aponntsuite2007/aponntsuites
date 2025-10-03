const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('vacation', 'sick_leave', 'personal_leave', 'late_arrival', 'early_departure', 'other'),
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    hours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    documents: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    isEmergency: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notificationSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    UserId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'permissions',
    indexes: [
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['UserId'] },
      { fields: ['startDate'] },
      { fields: ['endDate'] }
    ]
  });

  return Permission;
};