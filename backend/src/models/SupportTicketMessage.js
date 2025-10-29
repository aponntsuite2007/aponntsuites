/**
 * MÓDULO DE SOPORTE - SupportTicketMessage Model
 *
 * Mensajes/conversación dentro de cada ticket
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportTicketMessage = sequelize.define('SupportTicketMessage', {
    message_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID primary key'
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'support_tickets',
        key: 'ticket_id'
      },
      onDelete: 'CASCADE',
      comment: 'Ticket this message belongs to'
    },

    // Message author
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      comment: 'User who sent this message'
    },
    user_role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Role: customer, support, admin'
    },

    // Content
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Message content'
    },

    // Attachments (JSON array of URLs)
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of attachment URLs'
    },

    // Internal notes (only visible to support/admin)
    is_internal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Internal notes visible only to support'
    }
  }, {
    tableName: 'support_ticket_messages',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['created_at'] }
    ],
    comment: 'Messages/conversation within each ticket'
  });

  SupportTicketMessage.associate = (models) => {
    SupportTicketMessage.belongsTo(models.SupportTicketV2, {
      foreignKey: 'ticket_id',
      as: 'ticket'
    });

    SupportTicketMessage.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'author'
    });
  };

  return SupportTicketMessage;
};
