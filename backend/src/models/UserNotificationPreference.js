/**
 * MODELO: UserNotificationPreference
 * Preferencias de notificaciones por usuario y módulo
 * Permite personalizar cómo cada usuario quiere recibir notificaciones
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserNotificationPreference = sequelize.define('UserNotificationPreference', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Usuario
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
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

    // Módulo al que aplican estas preferencias
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Módulo: attendance, medical, legal, training, etc.'
    },

    // Canales preferidos
    receive_app: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Recibir notificaciones en la app'
    },
    receive_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Recibir notificaciones por email'
    },
    receive_whatsapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Recibir notificaciones por WhatsApp'
    },
    receive_sms: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Recibir notificaciones por SMS'
    },

    // Horarios de "no molestar"
    quiet_hours_start: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Hora de inicio del modo "no molestar" (ej: 22:00)'
    },
    quiet_hours_end: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Hora de fin del modo "no molestar" (ej: 08:00)'
    },
    quiet_days: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Días de la semana en modo "no molestar": [0=domingo, 6=sábado]'
    },

    // Resúmenes
    daily_digest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Recibir resumen diario en vez de notificaciones individuales'
    },
    digest_time: {
      type: DataTypes.TIME,
      defaultValue: '08:00:00',
      comment: 'Hora para enviar el resumen diario'
    },

    // Auditoría
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_notification_preferences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'company_id', 'module'],
        name: 'unique_user_company_module'
      },
      {
        fields: ['user_id', 'module'],
        name: 'idx_user_notification_prefs'
      }
    ]
  });

  // ================== MÉTODOS DE INSTANCIA ==================

  /**
   * Verificar si está en horario de "no molestar"
   */
  UserNotificationPreference.prototype.isQuietHours = function() {
    if (!this.quiet_hours_start || !this.quiet_hours_end) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay(); // 0-6

    // Verificar si hoy es día de "no molestar"
    if (this.quiet_days && this.quiet_days.includes(currentDay)) {
      return true;
    }

    // Verificar si está en el rango de horas de "no molestar"
    const start = this.quiet_hours_start;
    const end = this.quiet_hours_end;

    // Caso 1: Horario no cruza medianoche (ej: 22:00 - 23:00)
    if (start < end) {
      return currentTime >= start && currentTime < end;
    }

    // Caso 2: Horario cruza medianoche (ej: 22:00 - 08:00)
    return currentTime >= start || currentTime < end;
  };

  /**
   * Obtener canales habilitados
   */
  UserNotificationPreference.prototype.getEnabledChannels = function() {
    const channels = [];

    if (this.receive_app) channels.push('app');
    if (this.receive_email) channels.push('email');
    if (this.receive_whatsapp) channels.push('whatsapp');
    if (this.receive_sms) channels.push('sms');

    return channels;
  };

  /**
   * Verificar si debe recibir notificación inmediata o diferida
   */
  UserNotificationPreference.prototype.shouldDefer = function() {
    return this.isQuietHours() || this.daily_digest;
  };

  /**
   * Formatear para API
   */
  UserNotificationPreference.prototype.toAPI = function() {
    return {
      id: this.id,
      user_id: this.user_id,
      module: this.module,
      channels: {
        app: this.receive_app,
        email: this.receive_email,
        whatsapp: this.receive_whatsapp,
        sms: this.receive_sms
      },
      quiet_hours: {
        start: this.quiet_hours_start,
        end: this.quiet_hours_end,
        days: this.quiet_days
      },
      daily_digest: this.daily_digest,
      digest_time: this.digest_time,
      enabled_channels: this.getEnabledChannels(),
      is_quiet_hours: this.isQuietHours(),
      should_defer: this.shouldDefer()
    };
  };

  // ================== MÉTODOS ESTÁTICOS ==================

  /**
   * Obtener preferencias de un usuario para un módulo
   */
  UserNotificationPreference.getForUser = async function(userId, companyId, module) {
    let prefs = await this.findOne({
      where: {
        user_id: userId,
        company_id: companyId,
        module: module
      }
    });

    // Si no existe, crear con valores por defecto
    if (!prefs) {
      prefs = await this.create({
        user_id: userId,
        company_id: companyId,
        module: module,
        receive_app: true,
        receive_email: true,
        receive_whatsapp: false,
        receive_sms: false,
        daily_digest: false
      });
    }

    return prefs;
  };

  /**
   * Obtener todas las preferencias de un usuario
   */
  UserNotificationPreference.getAllForUser = async function(userId, companyId) {
    return await this.findAll({
      where: {
        user_id: userId,
        company_id: companyId
      },
      order: [['module', 'ASC']]
    });
  };

  /**
   * Actualizar preferencias de un usuario
   */
  UserNotificationPreference.updatePreferences = async function(userId, companyId, module, data) {
    const [prefs, created] = await this.findOrCreate({
      where: {
        user_id: userId,
        company_id: companyId,
        module: module
      },
      defaults: {
        user_id: userId,
        company_id: companyId,
        module: module,
        ...data
      }
    });

    if (!created) {
      await prefs.update(data);
    }

    return prefs;
  };

  /**
   * Obtener usuarios que deben recibir resumen diario
   */
  UserNotificationPreference.getUsersForDailyDigest = async function(companyId, module, time) {
    return await this.findAll({
      where: {
        company_id: companyId,
        module: module,
        daily_digest: true,
        digest_time: time
      },
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['user_id', 'firstName', 'lastName', 'email']
      }]
    });
  };

  /**
   * Verificar si un usuario puede recibir notificación ahora
   */
  UserNotificationPreference.canReceiveNow = async function(userId, companyId, module) {
    const prefs = await this.getForUser(userId, companyId, module);
    return !prefs.shouldDefer();
  };

  /**
   * Obtener estadísticas de preferencias por módulo
   */
  UserNotificationPreference.getStats = async function(companyId) {
    return await this.findAll({
      attributes: [
        'module',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_users'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN receive_app = true THEN 1 ELSE 0 END")), 'app_enabled'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN receive_email = true THEN 1 ELSE 0 END")), 'email_enabled'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN receive_whatsapp = true THEN 1 ELSE 0 END")), 'whatsapp_enabled'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN receive_sms = true THEN 1 ELSE 0 END")), 'sms_enabled'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN daily_digest = true THEN 1 ELSE 0 END")), 'digest_enabled']
      ],
      where: { company_id: companyId },
      group: ['module'],
      raw: true
    });
  };

  return UserNotificationPreference;
};
