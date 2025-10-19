/**
 * MODELO: Notification (Sistema Enterprise)
 * Notificaciones unificadas con workflows, multi-canal y trazabilidad completa
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.UUID,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },

    // Multi-tenant
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      index: true
    },

    // Clasificación
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Módulo: attendance, medical, legal, training, vacation, etc.'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'info',
      comment: 'Categoría: approval_request, alert, info, warning, error'
    },
    notification_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true,
      comment: 'Tipo específico: attendance_late_arrival, vacation_request_submitted, etc.'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
      index: true
    },

    // Destinatarios (estrategias múltiples)
    recipient_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      index: true,
      comment: 'Usuario específico destinatario'
    },
    recipient_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Rol destinatario: rrhh, supervisor, manager'
    },
    recipient_department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    recipient_shift_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'shifts',
        key: 'id'
      }
    },
    recipient_custom_list: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array de user_ids custom'
    },
    is_broadcast: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Broadcast a todos los admins'
    },

    // Contenido
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    short_message: {
      type: DataTypes.STRING(140),
      allowNull: true,
      comment: 'Para SMS/WhatsApp'
    },
    email_body: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HTML body para email'
    },

    // Contexto (entidades relacionadas)
    related_entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      index: true,
      comment: 'attendance, vacation, medical_certificate, etc.'
    },
    related_entity_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      index: true
    },
    related_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    related_department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    related_kiosk_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    related_attendance_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },

    // Metadata contextual
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Datos adicionales en formato JSON'
    },

    // Estado de lectura
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    read_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    // Workflow de acción
    requires_action: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    action_status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending',
      index: true,
      comment: 'pending, approved, rejected, escalated, expired, cancelled'
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'approve_reject, acknowledge, provide_info, take_decision'
    },
    action_deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      index: true
    },
    action_taken_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    action_taken_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    action_response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    action_options: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Opciones disponibles: ["approve", "reject", "request_more_info"]'
    },

    // Escalamiento
    escalation_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      index: true,
      comment: '0=original, 1=supervisor, 2=manager, 3=rrhh'
    },
    escalated_from_notification_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'notifications',
        key: 'id'
      }
    },
    escalated_to_notification_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'notifications',
        key: 'id'
      }
    },
    escalation_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'timeout, manual, rejected'
    },

    // Canales de envío
    sent_via_app: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sent_via_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sent_via_whatsapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sent_via_sms: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    whatsapp_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sms_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Recordatorios
    reminder_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reminder_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reminder_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // Expiración
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Auditoría
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    // Soft delete
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      {
        name: 'idx_notifications_recipient',
        fields: ['recipient_user_id', 'is_read', 'deleted_at']
      },
      {
        name: 'idx_notifications_company_module',
        fields: ['company_id', 'module', { attribute: 'created_at', order: 'DESC' }]
      },
      {
        name: 'idx_notifications_priority',
        fields: ['priority', 'action_deadline']
      },
      {
        name: 'idx_notifications_action_status',
        fields: ['action_status', 'requires_action'],
        where: { requires_action: true }
      },
      {
        name: 'idx_notifications_related_entity',
        fields: ['related_entity_type', 'related_entity_id']
      },
      {
        name: 'idx_notifications_escalation',
        fields: ['escalation_level', 'escalated_from_notification_id'],
        where: {
          escalation_level: { [sequelize.Sequelize.Op.gt]: 0 }
        }
      },
      {
        name: 'idx_notifications_metadata_gin',
        fields: ['metadata'],
        using: 'GIN'
      }
    ]
  });

  // ================== MÉTODOS DE INSTANCIA ==================

  /**
   * Marcar como leída
   */
  Notification.prototype.markAsRead = async function(userId) {
    this.is_read = true;
    this.read_at = new Date();
    this.read_by = userId;
    await this.save();
    return this;
  };

  /**
   * Registrar acción tomada
   */
  Notification.prototype.recordAction = async function(action, response, userId) {
    this.action_status = action;
    this.action_taken_at = new Date();
    this.action_taken_by = userId;
    this.action_response = response;
    await this.save();
    return this;
  };

  /**
   * Verificar si está expirada
   */
  Notification.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  };

  /**
   * Verificar si requiere atención inmediata
   */
  Notification.prototype.requiresImmediateAttention = function() {
    return (this.priority === 'critical' || this.priority === 'urgent') &&
           !this.is_read &&
           this.requires_action &&
           this.action_status === 'pending';
  };

  /**
   * Verificar si deadline está cerca
   */
  Notification.prototype.isDeadlineNear = function(minutesThreshold = 30) {
    if (!this.action_deadline) return false;
    const deadline = new Date(this.action_deadline);
    const now = new Date();
    const diffMinutes = (deadline - now) / 1000 / 60;
    return diffMinutes > 0 && diffMinutes <= minutesThreshold;
  };

  /**
   * Verificar si superó deadline
   */
  Notification.prototype.isPastDeadline = function() {
    if (!this.action_deadline) return false;
    return new Date() > new Date(this.action_deadline);
  };

  /**
   * Obtener edad en minutos
   */
  Notification.prototype.getAgeMinutes = function() {
    const now = new Date();
    const created = new Date(this.created_at);
    return Math.round((now - created) / 1000 / 60);
  };

  /**
   * Formatear para API
   */
  Notification.prototype.toAPI = function() {
    const data = this.toJSON();

    // Agregar campos calculados
    data.age_minutes = this.getAgeMinutes();
    data.is_expired = this.isExpired();
    data.requires_immediate_attention = this.requiresImmediateAttention();
    data.is_deadline_near = this.isDeadlineNear();
    data.is_past_deadline = this.isPastDeadline();

    return data;
  };

  // ================== MÉTODOS ESTÁTICOS ==================

  /**
   * Obtener notificaciones pendientes de un usuario
   */
  Notification.getPendingForUser = async function(userId, companyId, options = {}) {
    const where = {
      company_id: companyId,
      [sequelize.Sequelize.Op.or]: [
        { recipient_user_id: userId },
        { recipient_role: options.userRole },
        { is_broadcast: true }
      ],
      requires_action: true,
      action_status: 'pending'
    };

    if (options.module) {
      where.module = options.module;
    }

    return await this.findAll({
      where,
      order: [
        ['priority', 'DESC'],
        ['action_deadline', 'ASC NULLS LAST'],
        ['created_at', 'DESC']
      ],
      limit: options.limit || 100
    });
  };

  /**
   * Obtener notificaciones no leídas
   */
  Notification.getUnreadForUser = async function(userId, companyId, userRole) {
    return await this.findAll({
      where: {
        company_id: companyId,
        [sequelize.Sequelize.Op.or]: [
          { recipient_user_id: userId },
          { recipient_role: userRole },
          { is_broadcast: true }
        ],
        is_read: false
      },
      order: [['created_at', 'DESC']],
      limit: 100
    });
  };

  /**
   * Obtener notificaciones críticas sin atender
   */
  Notification.getCriticalUnattended = async function(companyId) {
    return await this.findAll({
      where: {
        company_id: companyId,
        priority: { [sequelize.Sequelize.Op.in]: ['critical', 'urgent'] },
        requires_action: true,
        action_status: 'pending'
      },
      order: [['action_deadline', 'ASC NULLS LAST']]
    });
  };

  /**
   * Obtener notificaciones que superaron deadline
   */
  Notification.getPastDeadline = async function(companyId) {
    return await this.findAll({
      where: {
        company_id: companyId,
        action_status: 'pending',
        action_deadline: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  /**
   * Marcar todas como leídas para un usuario
   */
  Notification.markAllAsReadForUser = async function(userId, companyId) {
    const now = new Date();
    return await this.update(
      {
        is_read: true,
        read_at: now,
        read_by: userId
      },
      {
        where: {
          company_id: companyId,
          recipient_user_id: userId,
          is_read: false
        }
      }
    );
  };

  /**
   * Limpiar notificaciones expiradas
   */
  Notification.cleanupExpired = async function(companyId = null) {
    const where = {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    };

    if (companyId) {
      where.company_id = companyId;
    }

    return await this.destroy({ where });
  };

  /**
   * Obtener estadísticas por módulo
   */
  Notification.getStatsByModule = async function(companyId, dateFrom, dateTo) {
    const where = { company_id: companyId };

    if (dateFrom && dateTo) {
      where.created_at = {
        [sequelize.Sequelize.Op.between]: [dateFrom, dateTo]
      };
    }

    return await this.findAll({
      attributes: [
        'module',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN is_read = false THEN 1 END")), 'unread'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN requires_action = true THEN 1 END")), 'requires_action'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action_status = 'pending' THEN 1 END")), 'pending']
      ],
      where,
      group: ['module'],
      raw: true
    });
  };

  return Notification;
};
