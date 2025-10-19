/**
 * MODELO: NotificationActionsLog
 * Historial completo de todas las acciones sobre notificaciones
 * Proporciona auditoría y trazabilidad total
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationActionsLog = sequelize.define('NotificationActionsLog', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },

    // Relación con notificación
    notification_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'notifications',
        key: 'id'
      },
      index: true,
      onDelete: 'CASCADE'
    },

    // Multi-tenant
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      index: true,
      onDelete: 'CASCADE'
    },

    // Acción realizada
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Tipo de acción: read, approve, reject, escalate, cancel, remind, etc.'
    },
    action_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      index: true,
      onDelete: 'SET NULL',
      comment: 'Usuario que realizó la acción (NULL = sistema automático)'
    },
    action_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      index: true
    },

    // Contexto de la acción
    previous_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Estado anterior de la notificación'
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Nuevo estado de la notificación'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas o comentarios del usuario'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Datos adicionales de contexto'
    },

    // Auditoría web
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      comment: 'Dirección IP desde donde se realizó la acción'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User-Agent del navegador/dispositivo'
    }
  }, {
    tableName: 'notification_actions_log',
    timestamps: false, // No need for created_at/updated_at, we have action_at
    indexes: [
      {
        fields: ['notification_id', { attribute: 'action_at', order: 'DESC' }],
        name: 'idx_notification_actions_notification'
      },
      {
        fields: ['action_by', { attribute: 'action_at', order: 'DESC' }],
        name: 'idx_notification_actions_user'
      },
      {
        fields: ['company_id', { attribute: 'action_at', order: 'DESC' }],
        name: 'idx_notification_actions_company'
      },
      {
        fields: ['action', 'action_at'],
        name: 'idx_notification_actions_type'
      }
    ]
  });

  // ================== MÉTODOS DE INSTANCIA ==================

  /**
   * Verificar si la acción fue realizada por el sistema
   */
  NotificationActionsLog.prototype.isAutomated = function() {
    return this.action_by === null;
  };

  /**
   * Obtener edad de la acción en minutos
   */
  NotificationActionsLog.prototype.getAgeMinutes = function() {
    const now = new Date();
    const actionDate = new Date(this.action_at);
    return Math.round((now - actionDate) / 1000 / 60);
  };

  /**
   * Formatear para API
   */
  NotificationActionsLog.prototype.toAPI = function() {
    return {
      id: this.id,
      notification_id: this.notification_id,
      action: this.action,
      action_by: this.action_by,
      action_at: this.action_at,
      previous_status: this.previous_status,
      new_status: this.new_status,
      notes: this.notes,
      metadata: this.metadata,
      is_automated: this.isAutomated(),
      age_minutes: this.getAgeMinutes()
    };
  };

  // ================== MÉTODOS ESTÁTICOS ==================

  /**
   * Registrar una nueva acción
   */
  NotificationActionsLog.log = async function(data) {
    return await this.create({
      notification_id: data.notificationId,
      company_id: data.companyId,
      action: data.action,
      action_by: data.userId || null,
      previous_status: data.previousStatus,
      new_status: data.newStatus,
      notes: data.notes,
      metadata: data.metadata || {},
      ip_address: data.ipAddress,
      user_agent: data.userAgent
    });
  };

  /**
   * Obtener historial de una notificación
   */
  NotificationActionsLog.getHistory = async function(notificationId, options = {}) {
    const where = { notification_id: notificationId };

    return await this.findAll({
      where,
      order: [['action_at', options.order || 'DESC']],
      limit: options.limit || 100,
      include: options.includeUser ? [{
        model: sequelize.models.User,
        as: 'actionBy',
        attributes: ['user_id', 'firstName', 'lastName', 'email']
      }] : []
    });
  };

  /**
   * Obtener acciones de un usuario
   */
  NotificationActionsLog.getUserActions = async function(userId, companyId, options = {}) {
    const where = {
      action_by: userId,
      company_id: companyId
    };

    if (options.dateFrom) {
      where.action_at = {
        [sequelize.Sequelize.Op.gte]: options.dateFrom
      };
    }

    if (options.action) {
      where.action = options.action;
    }

    return await this.findAll({
      where,
      order: [['action_at', 'DESC']],
      limit: options.limit || 100
    });
  };

  /**
   * Estadísticas de acciones por tipo
   */
  NotificationActionsLog.getActionStats = async function(companyId, dateFrom, dateTo) {
    const where = { company_id: companyId };

    if (dateFrom && dateTo) {
      where.action_at = {
        [sequelize.Sequelize.Op.between]: [dateFrom, dateTo]
      };
    }

    return await this.findAll({
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action_by IS NULL THEN 1 END")), 'automated'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN action_by IS NOT NULL THEN 1 END")), 'manual']
      ],
      where,
      group: ['action'],
      raw: true
    });
  };

  /**
   * Obtener tiempo promedio de respuesta
   * (tiempo entre creación de notificación y primera acción)
   */
  NotificationActionsLog.getAverageResponseTime = async function(companyId, action, dateFrom, dateTo) {
    const query = `
      SELECT
        AVG(EXTRACT(EPOCH FROM (nal.action_at - n.created_at))/60) as avg_minutes
      FROM notification_actions_log nal
      JOIN notifications n ON nal.notification_id = n.id
      WHERE nal.company_id = :companyId
        AND nal.action = :action
        ${dateFrom && dateTo ? 'AND nal.action_at BETWEEN :dateFrom AND :dateTo' : ''}
    `;

    const result = await sequelize.query(query, {
      replacements: { companyId, action, dateFrom, dateTo },
      type: sequelize.QueryTypes.SELECT
    });

    return result[0]?.avg_minutes || 0;
  };

  /**
   * Limpiar logs antiguos (mantener solo últimos N días)
   */
  NotificationActionsLog.cleanupOld = async function(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return await this.destroy({
      where: {
        action_at: {
          [sequelize.Sequelize.Op.lt]: cutoffDate
        }
      }
    });
  };

  return NotificationActionsLog;
};
