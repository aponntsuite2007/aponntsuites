const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerServiceConversation = sequelize.define('PartnerServiceConversation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    service_request_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sender_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    attachments: {
      type: DataTypes.JSONB
    },
    response_deadline: {
      type: DataTypes.DATE
    },
    is_urgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    requires_response: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'partner_service_conversations',
    timestamps: true,
    createdAt: 'sent_at',
    updatedAt: false
  });

  return PartnerServiceConversation;
};
