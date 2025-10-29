/**
 * MÓDULO DE SOPORTE - SupportAssistantAttempt Model
 *
 * Log de intentos del asistente IA para resolver antes de escalar a soporte
 * Tipos: 'fallback' (sin IA, gratis) o 'ai_powered' (con Ollama, pago)
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportAssistantAttempt = sequelize.define('SupportAssistantAttempt', {
    attempt_id: {
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
      comment: 'Ticket for this assistant attempt'
    },

    // Assistant type used
    assistant_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'fallback (no AI) or ai_powered (with Ollama)'
    },

    // User question/problem
    user_question: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'User question or problem description'
    },

    // Assistant response
    assistant_response: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Assistant response'
    },
    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: '0.00 to 1.00 (only for ai_powered)'
    },

    // User satisfaction
    user_satisfied: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'true=resolved, false=escalate to support, null=no answer yet'
    },
    user_feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional user feedback'
    },

    // Times
    attempted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When assistant attempt was made'
    },
    responded_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When user responded with feedback'
    }
  }, {
    tableName: 'support_assistant_attempts',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['assistant_type'] },
      { fields: ['user_satisfied'] },
      { fields: ['attempted_at'] }
    ],
    comment: 'Log of AI assistant attempts to resolve before escalating'
  });

  SupportAssistantAttempt.associate = (models) => {
    SupportAssistantAttempt.belongsTo(models.SupportTicketV2, {
      foreignKey: 'ticket_id',
      as: 'ticket'
    });
  };

  return SupportAssistantAttempt;
};
