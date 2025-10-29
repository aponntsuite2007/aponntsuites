/**
 * MÓDULO DE SOPORTE - SupportActivityLog Model
 *
 * Log transparente de toda actividad de soporte en empresa cliente
 * Garantiza privacidad y transparencia registrando todas las acciones
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportActivityLog = sequelize.define('SupportActivityLog', {
    log_id: {
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
      comment: 'Ticket related to this activity'
    },

    // Support user who performed the action
    support_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE',
      comment: 'Support user who performed the action'
    },

    // Client company where action was performed
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      onDelete: 'CASCADE',
      comment: 'Client company where action occurred'
    },

    // Temporary access session
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Unique session ID for this support access'
    },
    session_started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When support session started'
    },
    session_ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When support session ended'
    },

    // Activity details
    activity_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'login, view_module, edit_record, delete_record, etc.'
    },
    module_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Module where action occurred'
    },
    action_description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Human-readable description of what was done'
    },

    // Affected data (JSON)
    affected_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON with details: {table, record_id, action, before, after}'
    },

    // IP and user agent
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of support user'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser user agent'
    }
  }, {
    tableName: 'support_activity_log',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['ticket_id'] },
      { fields: ['support_user_id'] },
      { fields: ['company_id'] },
      { fields: ['session_id'] },
      { fields: ['created_at'] }
    ],
    comment: 'Transparent log of all support activity in client company'
  });

  SupportActivityLog.associate = (models) => {
    SupportActivityLog.belongsTo(models.SupportTicketV2, {
      foreignKey: 'ticket_id',
      as: 'ticket'
    });

    SupportActivityLog.belongsTo(models.User, {
      foreignKey: 'support_user_id',
      as: 'supportUser'
    });

    SupportActivityLog.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });
  };

  return SupportActivityLog;
};
