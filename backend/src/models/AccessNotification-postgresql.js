const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AccessNotification = sequelize.define('AccessNotification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Tipo de notificación
    notification_type: {
      type: DataTypes.ENUM(
        'visitor_arrival',           // Visitante ha llegado
        'visitor_checkout',          // Visitante se ha retirado
        'visitor_authorization',     // Visitante requiere autorización
        'visitor_outside_facility',  // Visitante salió del perímetro
        'visitor_overstay',          // Visitante excedió tiempo de visita
        'employee_late_arrival',     // Empleado llegó tarde
        'employee_early_departure',  // Empleado salió antes de hora
        'employee_break_exceeded',   // Empleado excedió tiempo de break
        'unauthorized_access',       // Intento de acceso no autorizado
        'kiosk_offline',            // Kiosko desconectado
        'gps_low_battery',          // Batería baja en llavero GPS
        'gps_signal_lost',          // Señal GPS perdida
        'system_alert'              // Alerta general del sistema
      ),
      allowNull: false,
      comment: 'Tipo de notificación'
    },

    // Prioridad
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Prioridad de la notificación'
    },

    // Destinatario
    recipient_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuario destinatario específico (NULL = broadcast a todos los administradores)'
    },

    // Contenido
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Título de la notificación'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Mensaje descriptivo de la notificación'
    },

    // Referencias a entidades relacionadas
    related_visitor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'visitors',
        key: 'id'
      },
      comment: 'Visitante relacionado con la notificación'
    },
    related_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Empleado relacionado con la notificación'
    },
    related_kiosk_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'kiosks',
        key: 'id'
      },
      comment: 'Kiosko relacionado con la notificación'
    },
    related_attendance_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'attendances',
        key: 'id'
      },
      comment: 'Asistencia relacionada con la notificación'
    },

    // Estado
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si la notificación fue leída'
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora en que se leyó la notificación'
    },

    // Acción tomada
    action_taken: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si se tomó acción sobre la notificación'
    },
    action_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Tipo de acción tomada (ej: "authorized", "rejected", "contacted")'
    },
    action_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre la acción tomada'
    },
    action_taken_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuario que tomó acción'
    },
    action_taken_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora en que se tomó acción'
    },

    // Metadata adicional (JSON para flexibilidad)
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Datos adicionales específicos del tipo de notificación (GPS coords, distancia, etc.)'
    },

    // Expiración
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora de expiración de la notificación'
    },

    // CAMPO MULTI-TENANT
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    }
  }, {
    tableName: 'access_notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['company_id']
      },
      {
        fields: ['recipient_user_id']
      },
      {
        fields: ['notification_type']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['is_read']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['company_id', 'recipient_user_id', 'is_read']
      },
      {
        fields: ['company_id', 'notification_type', 'created_at']
      },
      {
        fields: ['related_visitor_id']
      },
      {
        fields: ['related_user_id']
      },
      {
        fields: ['related_kiosk_id']
      }
    ]
  });

  // Métodos de instancia

  /**
   * Marcar como leída
   */
  AccessNotification.prototype.markAsRead = async function(userId = null) {
    this.is_read = true;
    this.read_at = new Date();
    await this.save();
    return this;
  };

  /**
   * Registrar acción tomada
   */
  AccessNotification.prototype.recordAction = async function(actionType, notes, userId) {
    this.action_taken = true;
    this.action_type = actionType;
    this.action_notes = notes;
    this.action_taken_by = userId;
    this.action_taken_at = new Date();
    await this.save();
    return this;
  };

  /**
   * Verificar si está expirada
   */
  AccessNotification.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  };

  /**
   * Verificar si requiere atención inmediata
   */
  AccessNotification.prototype.requiresImmediateAttention = function() {
    return this.priority === 'critical' && !this.is_read && !this.action_taken;
  };

  /**
   * Obtener edad en minutos
   */
  AccessNotification.prototype.getAgeMinutes = function() {
    const now = new Date();
    const created = new Date(this.created_at);
    return Math.round((now - created) / 1000 / 60);
  };

  /**
   * Verificar si es reciente (< 1 hora)
   */
  AccessNotification.prototype.isRecent = function() {
    return this.getAgeMinutes() < 60;
  };

  // Métodos estáticos de clase

  /**
   * Obtener notificaciones no leídas de un usuario
   */
  AccessNotification.getUnreadForUser = async function(userId, companyId) {
    return await this.findAll({
      where: {
        company_id: companyId,
        [sequelize.Sequelize.Op.or]: [
          { recipient_user_id: userId },
          { recipient_user_id: null } // Broadcast
        ],
        is_read: false
      },
      order: [['priority', 'DESC'], ['created_at', 'DESC']]
    });
  };

  /**
   * Obtener notificaciones críticas sin atender
   */
  AccessNotification.getCriticalUnattended = async function(companyId) {
    return await this.findAll({
      where: {
        company_id: companyId,
        priority: 'critical',
        action_taken: false
      },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Obtener notificaciones por tipo
   */
  AccessNotification.getByType = async function(companyId, notificationType, limit = 50) {
    return await this.findAll({
      where: {
        company_id: companyId,
        notification_type: notificationType
      },
      order: [['created_at', 'DESC']],
      limit: limit
    });
  };

  /**
   * Obtener notificaciones de visitantes
   */
  AccessNotification.getVisitorNotifications = async function(companyId, visitorId = null) {
    const where = {
      company_id: companyId,
      notification_type: {
        [sequelize.Sequelize.Op.in]: [
          'visitor_arrival',
          'visitor_checkout',
          'visitor_authorization',
          'visitor_outside_facility',
          'visitor_overstay'
        ]
      }
    };

    if (visitorId) {
      where.related_visitor_id = visitorId;
    }

    return await this.findAll({
      where: where,
      order: [['created_at', 'DESC']],
      limit: 100
    });
  };

  /**
   * Obtener notificaciones de empleados
   */
  AccessNotification.getEmployeeNotifications = async function(companyId, userId = null) {
    const where = {
      company_id: companyId,
      notification_type: {
        [sequelize.Sequelize.Op.in]: [
          'employee_late_arrival',
          'employee_early_departure',
          'employee_break_exceeded'
        ]
      }
    };

    if (userId) {
      where.related_user_id = userId;
    }

    return await this.findAll({
      where: where,
      order: [['created_at', 'DESC']],
      limit: 100
    });
  };

  /**
   * Marcar todas como leídas para un usuario
   */
  AccessNotification.markAllAsReadForUser = async function(userId, companyId) {
    const now = new Date();
    return await this.update(
      {
        is_read: true,
        read_at: now
      },
      {
        where: {
          company_id: companyId,
          [sequelize.Sequelize.Op.or]: [
            { recipient_user_id: userId },
            { recipient_user_id: null }
          ],
          is_read: false
        }
      }
    );
  };

  /**
   * Limpiar notificaciones expiradas
   */
  AccessNotification.cleanupExpired = async function(companyId = null) {
    const where = {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    };

    if (companyId) {
      where.company_id = companyId;
    }

    return await this.destroy({ where: where });
  };

  /**
   * Crear notificación de visitante
   */
  AccessNotification.createVisitorNotification = async function(data) {
    const {
      companyId,
      visitorId,
      notificationType,
      title,
      message,
      priority = 'medium',
      recipientUserId = null,
      kioskId = null,
      metadata = {}
    } = data;

    return await this.create({
      company_id: companyId,
      notification_type: notificationType,
      priority: priority,
      recipient_user_id: recipientUserId,
      title: title,
      message: message,
      related_visitor_id: visitorId,
      related_kiosk_id: kioskId,
      metadata: metadata
    });
  };

  /**
   * Crear notificación de empleado
   */
  AccessNotification.createEmployeeNotification = async function(data) {
    const {
      companyId,
      userId,
      attendanceId = null,
      notificationType,
      title,
      message,
      priority = 'medium',
      recipientUserId = null,
      kioskId = null,
      metadata = {}
    } = data;

    return await this.create({
      company_id: companyId,
      notification_type: notificationType,
      priority: priority,
      recipient_user_id: recipientUserId,
      title: title,
      message: message,
      related_user_id: userId,
      related_attendance_id: attendanceId,
      related_kiosk_id: kioskId,
      metadata: metadata
    });
  };

  // Hooks

  /**
   * Antes de crear, validar prioridad según tipo
   */
  AccessNotification.beforeCreate((notification) => {
    // Notificaciones críticas automáticas
    const criticalTypes = [
      'unauthorized_access',
      'visitor_outside_facility',
      'kiosk_offline'
    ];

    if (criticalTypes.includes(notification.notification_type) && notification.priority === 'medium') {
      notification.priority = 'high';
    }

    // Auto-expirar notificaciones de baja prioridad después de 7 días
    if (notification.priority === 'low' && !notification.expires_at) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      notification.expires_at = expiresAt;
    }
  });

  /**
   * Después de actualizar, validar coherencia
   */
  AccessNotification.beforeUpdate((notification) => {
    // Si se marca como leída, registrar timestamp
    if (notification.changed('is_read') && notification.is_read && !notification.read_at) {
      notification.read_at = new Date();
    }

    // Si se toma acción, registrar timestamp
    if (notification.changed('action_taken') && notification.action_taken && !notification.action_taken_at) {
      notification.action_taken_at = new Date();
    }
  });

  return AccessNotification;
};
