const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunicationLog = sequelize.define('CommunicationLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID del empleado receptor de la comunicación'
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del usuario que envía la comunicación (médico/admin)'
    },
    sender_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'user',
      comment: 'user, system, doctor'
    },
    communication_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['email', 'sms', 'whatsapp', 'internal_message', 'push']]
      }
    },
    communication_channel: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'email address, phone number, etc.'
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    html_content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HTML content for emails'
    },
    related_entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'certificate, study, photo, exam, case, medical_request'
    },
    related_entity_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    notification_log_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to NCE notification_logs for traceability'
    },
    notification_group_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'sent',
      validate: {
        isIn: [['pending', 'sent', 'delivered', 'read', 'acknowledged', 'complied', 'failed', 'expired']]
      }
    },
    sent_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'CRÍTICO LEGAL: Timestamp del acuse de recibo'
    },
    complied_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Cuando el empleado cumplió (subió documento, etc.)'
    },
    delivery_confirmation: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    delivery_provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'sendgrid, twilio, etc.'
    },
    provider_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_legally_valid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    legal_validity_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    urgency: {
      type: DataTypes.STRING(20),
      defaultValue: 'medium',
      validate: {
        isIn: [['critical', 'high', 'medium', 'low']]
      }
    },
    response_deadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    requires_action: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'acknowledge, upload_document, respond'
    },
    action_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    action_completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    error_code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_retry_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'communication_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['user_id'] },
      { fields: ['sender_id'] },
      { fields: ['status'] },
      { fields: ['related_entity_type', 'related_entity_id'] },
      {
        fields: ['user_id', 'status'],
        where: { status: { [require('sequelize').Op.notIn]: ['acknowledged', 'complied', 'failed', 'expired'] } }
      },
      { fields: ['notification_log_id'] }
    ]
  });

  // Class methods
  CommunicationLog.getPendingForUser = async function(userId, companyId) {
    return this.findAll({
      where: {
        user_id: userId,
        company_id: companyId,
        status: { [require('sequelize').Op.notIn]: ['acknowledged', 'complied', 'failed', 'expired'] }
      },
      order: [
        [sequelize.literal("CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END"), 'ASC'],
        ['sent_at', 'ASC']
      ]
    });
  };

  CommunicationLog.confirmAcknowledgment = async function(communicationId, userId) {
    const [updated] = await this.update(
      {
        acknowledged_at: new Date(),
        status: 'acknowledged'
      },
      {
        where: {
          id: communicationId,
          user_id: userId,
          acknowledged_at: null
        }
      }
    );
    return updated > 0;
  };

  CommunicationLog.markComplied = async function(communicationId, userId, metadata = {}) {
    const [updated] = await this.update(
      {
        complied_at: new Date(),
        status: 'complied',
        action_completed: true,
        action_completed_at: new Date(),
        metadata: sequelize.literal(`metadata || '${JSON.stringify(metadata)}'::jsonb`)
      },
      {
        where: {
          id: communicationId,
          user_id: userId,
          complied_at: null
        }
      }
    );
    return updated > 0;
  };

  return CommunicationLog;
};
