const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('notification', 'announcement', 'alert', 'approval_request'),
      defaultValue: 'notification'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    requiresBiometricConfirmation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    biometricConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    relatedEntity: {
      type: DataTypes.STRING,
      allowNull: true // 'attendance', 'permission', 'user', etc.
    },
    relatedEntityId: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'messages',
    indexes: [
      { fields: ['recipientId'] },
      { fields: ['type'] },
      { fields: ['priority'] },
      { fields: ['isRead'] },
      { fields: ['expiresAt'] }
    ]
  });

  return Message;
};