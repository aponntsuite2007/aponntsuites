/**
 * MODELO: ModuleTrial (Período de Prueba de Módulos)
 *
 * Gestiona períodos de prueba de 30 días con:
 * - 100% bonificación durante trial
 * - Facturación proporcional en primer mes post-trial
 * - Tracking de decisión del cliente (acepta/rechaza)
 * - Cálculo automático de días proporcionales
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModuleTrial = sequelize.define('ModuleTrial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      onDelete: 'CASCADE'
    },
    quote_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'quotes',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Presupuesto que generó este trial'
    },

    // ═══════════════════════════════════════════════════════════
    // MÓDULO EN PRUEBA
    // ═══════════════════════════════════════════════════════════
    module_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Key del módulo (ej: "time-clock", "payroll")'
    },
    module_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre del módulo (ej: "Reloj de Asistencia")'
    },
    module_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Precio mensual del módulo'
    },

    // ═══════════════════════════════════════════════════════════
    // PERÍODO DE PRUEBA
    // ═══════════════════════════════════════════════════════════
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha de inicio del trial (cuando cliente acepta presupuesto)'
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha de fin del trial (start_date + 30 días)'
    },
    days_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Duración del trial en días (default: 30)'
    },

    // ═══════════════════════════════════════════════════════════
    // FACTURACIÓN PROPORCIONAL (PRIMER MES DESPUÉS DEL TRIAL)
    // ═══════════════════════════════════════════════════════════
    first_billing_month: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Mes de primera facturación (mes siguiente al que termina el trial)'
    },
    proportional_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Días ya usados en el mes de primera facturación'
    },
    total_days_month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Total de días del mes de primera facturación'
    },
    proportional_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje proporcional: (proportional_days / total_days_month) * 100'
    },
    proportional_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Monto proporcional a cobrar: module_price * (proportional_percentage / 100)'
    },
    full_month_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Monto completo mensual (igual a module_price, para referencia)'
    },

    // ═══════════════════════════════════════════════════════════
    // ESTADO Y DECISIÓN
    // ═══════════════════════════════════════════════════════════
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'completed', 'accepted', 'rejected', 'expired']]
      },
      comment: 'Estados: active (en curso), completed (terminado sin decisión), accepted (cliente acepta), rejected (cliente rechaza), expired (expiró sin decisión)'
    },
    decision_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha en que el cliente tomó la decisión'
    },
    decision: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['accepted', 'rejected', null]]
      },
      comment: 'Decisión del cliente: accepted (quedarse con el módulo), rejected (devolverlo)'
    },
    decision_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre la decisión del cliente'
    },

    // ═══════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════
    reminder_sent_7days: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si se envió reminder a 7 días del fin del trial'
    },
    reminder_sent_3days: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si se envió reminder a 3 días del fin del trial'
    },
    reminder_sent_1day: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si se envió reminder a 1 día del fin del trial'
    },
    final_reminder_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si se envió reminder final el día del fin del trial'
    }
  }, {
    tableName: 'module_trials',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['quote_id'] },
      { fields: ['module_key'] },
      { fields: ['status'] },
      { fields: ['start_date'] },
      { fields: ['end_date'] },
      { fields: ['first_billing_month'] },
      {
        name: 'idx_active_trials',
        fields: ['status', 'end_date'],
        where: { status: 'active' }
      }
    ],
    hooks: {
      /**
       * HOOK: Antes de crear, calcular automáticamente facturación proporcional
       */
      beforeCreate: async (trial, options) => {
        // Calcular end_date si no está establecido
        if (!trial.end_date && trial.start_date) {
          const endDate = new Date(trial.start_date);
          endDate.setDate(endDate.getDate() + (trial.days_duration || 30));
          trial.end_date = endDate;
        }

        // Calcular primera fecha de facturación y valores proporcionales
        if (trial.end_date && !trial.first_billing_month) {
          const endDate = new Date(trial.end_date);
          const dayOfMonth = endDate.getDate();

          // Primer mes de facturación = mes SIGUIENTE al que termina el trial
          const firstBillingDate = new Date(endDate);
          firstBillingDate.setMonth(firstBillingDate.getMonth() + 1);
          firstBillingDate.setDate(1);

          trial.first_billing_month = firstBillingDate.toISOString().split('T')[0];

          // Días proporcionales = día del mes en que terminó el trial
          trial.proportional_days = dayOfMonth;

          // Total de días del mes de primera facturación
          const totalDays = new Date(
            firstBillingDate.getFullYear(),
            firstBillingDate.getMonth() + 1,
            0
          ).getDate();
          trial.total_days_month = totalDays;

          // Porcentaje proporcional
          const percentage = (dayOfMonth / totalDays) * 100;
          trial.proportional_percentage = percentage.toFixed(2);

          // Monto proporcional
          const modulePrice = parseFloat(trial.module_price || 0);
          trial.proportional_amount = (modulePrice * (percentage / 100)).toFixed(2);
          trial.full_month_amount = modulePrice.toFixed(2);
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS DE INSTANCIA
  // ═══════════════════════════════════════════════════════════

  /**
   * Verifica si el trial está activo actualmente
   */
  ModuleTrial.prototype.isActive = function() {
    if (this.status !== 'active') {
      return false;
    }

    const now = new Date();
    return now >= new Date(this.start_date) && now <= new Date(this.end_date);
  };

  /**
   * Verifica si el trial ha expirado
   */
  ModuleTrial.prototype.isExpired = function() {
    const now = new Date();
    return now > new Date(this.end_date);
  };

  /**
   * Obtiene días restantes del trial
   */
  ModuleTrial.prototype.getDaysRemaining = function() {
    if (!this.isActive()) {
      return 0;
    }

    const now = new Date();
    const end = new Date(this.end_date);
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return Math.max(0, days);
  };

  /**
   * Obtiene días transcurridos del trial
   */
  ModuleTrial.prototype.getDaysElapsed = function() {
    const now = new Date();
    const start = new Date(this.start_date);
    const diff = now - start;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return Math.max(0, Math.min(days, this.days_duration || 30));
  };

  /**
   * Verifica si debe enviar reminder (según días restantes)
   */
  ModuleTrial.prototype.shouldSendReminder = function() {
    const daysRemaining = this.getDaysRemaining();

    if (daysRemaining === 7 && !this.reminder_sent_7days) {
      return { type: '7days', days: 7 };
    }
    if (daysRemaining === 3 && !this.reminder_sent_3days) {
      return { type: '3days', days: 3 };
    }
    if (daysRemaining === 1 && !this.reminder_sent_1day) {
      return { type: '1day', days: 1 };
    }
    if (daysRemaining === 0 && !this.final_reminder_sent) {
      return { type: 'final', days: 0 };
    }

    return null;
  };

  /**
   * Marca reminder como enviado
   */
  ModuleTrial.prototype.markReminderSent = async function(reminderType) {
    const fieldMap = {
      '7days': 'reminder_sent_7days',
      '3days': 'reminder_sent_3days',
      '1day': 'reminder_sent_1day',
      'final': 'final_reminder_sent'
    };

    const field = fieldMap[reminderType];
    if (field) {
      this[field] = true;
      await this.save();
    }
  };

  /**
   * Cliente acepta el módulo (quedarse con él)
   */
  ModuleTrial.prototype.accept = async function(notes = null) {
    this.status = 'accepted';
    this.decision = 'accepted';
    this.decision_date = new Date();

    if (notes) {
      this.decision_notes = notes;
    }

    await this.save();
    return this;
  };

  /**
   * Cliente rechaza el módulo (devolverlo)
   */
  ModuleTrial.prototype.reject = async function(notes = null) {
    this.status = 'rejected';
    this.decision = 'rejected';
    this.decision_date = new Date();

    if (notes) {
      this.decision_notes = notes;
    }

    await this.save();
    return this;
  };

  /**
   * Marca trial como expirado (sin decisión)
   */
  ModuleTrial.prototype.expire = async function() {
    if (this.status === 'active') {
      this.status = 'expired';
      await this.save();
    }
    return this;
  };

  /**
   * Calcula el monto a facturar en un mes específico
   * @param {Date} billingMonth - Mes de facturación
   * @returns {number} - Monto a facturar
   */
  ModuleTrial.prototype.getAmountForMonth = function(billingMonth) {
    const billingDate = new Date(billingMonth);
    const firstBillingDate = new Date(this.first_billing_month);

    // Normalizar a primer día del mes para comparación
    billingDate.setDate(1);
    firstBillingDate.setDate(1);

    // Si es el primer mes de facturación, cobrar proporcional
    if (billingDate.getTime() === firstBillingDate.getTime()) {
      return parseFloat(this.proportional_amount);
    }

    // Si es posterior, cobrar monto completo
    if (billingDate > firstBillingDate) {
      return parseFloat(this.full_month_amount);
    }

    // Si es anterior al primer mes de facturación, no cobrar (aún en trial)
    return 0;
  };

  /**
   * Genera un resumen del trial
   */
  ModuleTrial.prototype.toSummary = function() {
    return {
      id: this.id,
      module_key: this.module_key,
      module_name: this.module_name,
      module_price: parseFloat(this.module_price),
      start_date: this.start_date,
      end_date: this.end_date,
      days_duration: this.days_duration,
      days_remaining: this.getDaysRemaining(),
      days_elapsed: this.getDaysElapsed(),
      is_active: this.isActive(),
      is_expired: this.isExpired(),
      status: this.status,
      decision: this.decision,
      first_billing_month: this.first_billing_month,
      proportional_amount: parseFloat(this.proportional_amount),
      full_month_amount: parseFloat(this.full_month_amount),
      proportional_percentage: parseFloat(this.proportional_percentage),
      proportional_days: this.proportional_days,
      total_days_month: this.total_days_month
    };
  };

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS DE CLASE
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtiene trials activos de una empresa
   */
  ModuleTrial.getActiveTrials = async function(companyId) {
    return await ModuleTrial.findAll({
      where: {
        company_id: companyId,
        status: 'active'
      },
      order: [['end_date', 'ASC']]
    });
  };

  /**
   * Obtiene trials que necesitan reminder
   */
  ModuleTrial.getTrialsNeedingReminder = async function() {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await ModuleTrial.findAll({
      where: {
        status: 'active',
        [sequelize.Sequelize.Op.or]: [
          // Reminder a 7 días
          {
            end_date: {
              [sequelize.Sequelize.Op.between]: [
                new Date(in7Days.setHours(0, 0, 0, 0)),
                new Date(in7Days.setHours(23, 59, 59, 999))
              ]
            },
            reminder_sent_7days: false
          },
          // Reminder a 3 días
          {
            end_date: {
              [sequelize.Sequelize.Op.between]: [
                new Date(in3Days.setHours(0, 0, 0, 0)),
                new Date(in3Days.setHours(23, 59, 59, 999))
              ]
            },
            reminder_sent_3days: false
          },
          // Reminder a 1 día
          {
            end_date: {
              [sequelize.Sequelize.Op.between]: [
                new Date(tomorrow.setHours(0, 0, 0, 0)),
                new Date(tomorrow.setHours(23, 59, 59, 999))
              ]
            },
            reminder_sent_1day: false
          },
          // Reminder final (hoy)
          {
            end_date: {
              [sequelize.Sequelize.Op.between]: [
                new Date(now.setHours(0, 0, 0, 0)),
                new Date(now.setHours(23, 59, 59, 999))
              ]
            },
            final_reminder_sent: false
          }
        ]
      },
      order: [['end_date', 'ASC']]
    });
  };

  /**
   * Obtiene trials expirados sin decisión
   */
  ModuleTrial.getExpiredTrialsWithoutDecision = async function() {
    const now = new Date();

    return await ModuleTrial.findAll({
      where: {
        status: 'active',
        end_date: {
          [sequelize.Sequelize.Op.lt]: now
        },
        decision: null
      },
      order: [['end_date', 'ASC']]
    });
  };

  /**
   * Obtiene trials listos para primera facturación
   * (trials aceptados cuyo first_billing_month es el mes actual o anterior)
   */
  ModuleTrial.getTrialsReadyForBilling = async function(billingMonth) {
    const billingDate = new Date(billingMonth);
    billingDate.setDate(1); // Primer día del mes

    return await ModuleTrial.findAll({
      where: {
        status: 'accepted',
        first_billing_month: {
          [sequelize.Sequelize.Op.lte]: billingDate
        }
      },
      order: [['first_billing_month', 'ASC']]
    });
  };

  /**
   * Calcula estadísticas de trials
   */
  ModuleTrial.getStats = async function(options = {}) {
    const { companyId, startDate, endDate } = options;

    const where = {};
    if (companyId) where.company_id = companyId;
    if (startDate && endDate) {
      where.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    const trials = await ModuleTrial.findAll({ where });

    const stats = {
      total: trials.length,
      by_status: {},
      active_count: 0,
      accepted_count: 0,
      rejected_count: 0,
      expired_count: 0,
      acceptance_rate: 0,
      rejection_rate: 0,
      total_value_accepted: 0,
      total_value_rejected: 0,
      avg_decision_time_days: 0
    };

    let totalDecisionTime = 0;
    let decisionsCount = 0;

    trials.forEach(trial => {
      stats.by_status[trial.status] = (stats.by_status[trial.status] || 0) + 1;

      if (trial.status === 'active') stats.active_count++;
      if (trial.status === 'accepted') {
        stats.accepted_count++;
        stats.total_value_accepted += parseFloat(trial.full_month_amount || 0);
      }
      if (trial.status === 'rejected') {
        stats.rejected_count++;
        stats.total_value_rejected += parseFloat(trial.full_month_amount || 0);
      }
      if (trial.status === 'expired') stats.expired_count++;

      // Calcular tiempo de decisión
      if (trial.decision_date && trial.start_date) {
        const start = new Date(trial.start_date);
        const decision = new Date(trial.decision_date);
        const diff = decision - start;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        totalDecisionTime += days;
        decisionsCount++;
      }
    });

    // Tasas de aceptación/rechazo
    const completedTrials = stats.accepted_count + stats.rejected_count;
    if (completedTrials > 0) {
      stats.acceptance_rate = ((stats.accepted_count / completedTrials) * 100).toFixed(2);
      stats.rejection_rate = ((stats.rejected_count / completedTrials) * 100).toFixed(2);
    }

    // Tiempo promedio de decisión
    if (decisionsCount > 0) {
      stats.avg_decision_time_days = (totalDecisionTime / decisionsCount).toFixed(1);
    }

    return stats;
  };

  return ModuleTrial;
};
