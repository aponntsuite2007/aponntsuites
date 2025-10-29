/**
 * MÓDULO DE SOPORTE - SupportTicket Model
 *
 * Sistema completo de tickets con:
 * - Multi-tenant con company_id
 * - Acceso temporal de soporte
 * - SLA deadlines
 * - Escalamiento a supervisores
 * - Intento de asistente IA antes de escalar
 * - Evaluación de soporte (1-5 estrellas)
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportTicket = sequelize.define('SupportTicket', {
    ticket_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'UUID primary key'
    },
    ticket_number: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'Auto-generated unique number: TICKET-2025-000001'
    },

    // Multi-tenant
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      comment: 'Company that owns this ticket'
    },

    // Creator
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'User who created the ticket'
    },

    // Module affected
    module_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Module where issue occurred'
    },
    module_display_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Human-readable module name'
    },

    // Issue description
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Ticket subject/title'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed description of the issue'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
      comment: 'Ticket priority level'
    },

    // Temporary support access
    allow_support_access: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Client authorizes temporary support access'
    },
    temp_support_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Temporary user created for support access'
    },
    temp_password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Hashed temporary password'
    },
    temp_password_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When temp password expires (on ticket close)'
    },
    temp_access_granted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When temp access was granted'
    },

    // Support assignment
    assigned_to_vendor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Vendor/support agent assigned to ticket'
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When ticket was assigned to vendor'
    },

    // Ticket status
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'),
      defaultValue: 'open',
      comment: 'Current ticket status'
    },

    // Closure
    closed_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'User who closed the ticket (only creator or admin)'
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When ticket was closed'
    },
    close_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for closing'
    },

    // Support evaluation (1-5 stars)
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      },
      comment: 'Client rating of support (1-5 stars)'
    },
    rating_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Client feedback comment'
    },
    rated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When rating was submitted'
    },

    // SLA deadlines (added by extension migration)
    sla_first_response_deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'SLA deadline for first response'
    },
    sla_resolution_deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'SLA deadline for full resolution'
    },
    sla_escalation_deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'SLA deadline for auto-escalation if no response'
    },
    first_response_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When vendor first responded'
    },

    // Escalation to supervisor
    escalated_to_supervisor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Supervisor to whom ticket was escalated'
    },

    // Assistant attempt before escalation
    assistant_attempted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether AI assistant attempted to resolve'
    },
    assistant_resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether AI assistant successfully resolved'
    }
  }, {
    tableName: 'support_tickets',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['created_by_user_id'] },
      { fields: ['assigned_to_vendor_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['sla_escalation_deadline'] },
      { fields: ['escalated_to_supervisor_id'] },
      { fields: ['assistant_attempted'] }
    ],
    comment: 'Support tickets multi-tenant system'
  });

  // Associations will be defined in src/config/database.js
  SupportTicket.associate = (models) => {
    SupportTicket.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });

    SupportTicket.belongsTo(models.User, {
      foreignKey: 'created_by_user_id',
      as: 'creator'
    });

    SupportTicket.belongsTo(models.User, {
      foreignKey: 'assigned_to_vendor_id',
      as: 'assignedVendor'
    });

    SupportTicket.belongsTo(models.User, {
      foreignKey: 'temp_support_user_id',
      as: 'tempSupportUser'
    });

    SupportTicket.belongsTo(models.User, {
      foreignKey: 'closed_by_user_id',
      as: 'closedBy'
    });

    SupportTicket.belongsTo(models.User, {
      foreignKey: 'escalated_to_supervisor_id',
      as: 'escalatedSupervisor'
    });

    SupportTicket.hasMany(models.SupportTicketMessage, {
      foreignKey: 'ticket_id',
      as: 'messages'
    });

    SupportTicket.hasMany(models.SupportActivityLog, {
      foreignKey: 'ticket_id',
      as: 'activityLogs'
    });

    SupportTicket.hasMany(models.SupportEscalation, {
      foreignKey: 'ticket_id',
      as: 'escalations'
    });

    SupportTicket.hasMany(models.SupportAssistantAttempt, {
      foreignKey: 'ticket_id',
      as: 'assistantAttempts'
    });
  };

  return SupportTicket;
};
