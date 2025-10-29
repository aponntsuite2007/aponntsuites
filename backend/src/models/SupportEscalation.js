/**
 * MÓDULO DE SOPORTE - SupportEscalation Model
 *
 * Log de todos los escalamientos de tickets a supervisores
 * Razones: sla_timeout, manual_escalation, no_response
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportEscalation = sequelize.define('SupportEscalation', {
    escalation_id: {
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
      comment: 'Ticket that was escalated'
    },

    // Escalation from/to
    escalated_from_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'SET NULL',
      comment: 'Original vendor (may be NULL if auto-escalated)'
    },
    escalated_to_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      comment: 'Supervisor who received escalation'
    },
    escalation_reason: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'sla_timeout, manual_escalation, no_response'
    },

    // Times
    escalated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When escalation occurred'
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When supervisor resolved the escalation'
    },

    // Notes
    escalation_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes about why escalated'
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Supervisor notes on resolution'
    }
  }, {
    tableName: 'support_escalations',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['escalated_from_user_id'] },
      { fields: ['escalated_to_user_id'] },
      { fields: ['escalated_at'] }
    ],
    comment: 'Log of all ticket escalations to supervisors'
  });

  SupportEscalation.associate = (models) => {
    SupportEscalation.belongsTo(models.SupportTicketV2, {
      foreignKey: 'ticket_id',
      as: 'ticket'
    });

    SupportEscalation.belongsTo(models.User, {
      foreignKey: 'escalated_from_user_id',
      as: 'escalatedFrom'
    });

    SupportEscalation.belongsTo(models.User, {
      foreignKey: 'escalated_to_user_id',
      as: 'escalatedTo'
    });
  };

  return SupportEscalation;
};
