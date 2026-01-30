/**
 * MODELO: Quote (Presupuesto)
 *
 * Gestiona presupuestos con soporte para:
 * - Período de prueba de 30 días con bonificación 100%
 * - Solo 1 presupuesto ACTIVO por empresa
 * - Historial completo de cambios (upgrade/downgrade)
 * - Tracking de módulos agregados/removidos
 * - Estados: draft, sent, in_trial, accepted, active, rejected, expired, superseded
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Quote = sequelize.define('Quote', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    quote_number: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'Formato: PRES-YYYY-NNNN (auto-generado)'
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
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'partners',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Vendedor que generó el presupuesto'
    },
    lead_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'marketing_leads',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Lead de origen (si el presupuesto se creó desde un lead)'
    },

    // ═══════════════════════════════════════════════════════════
    // MÓDULOS INCLUIDOS
    // ═══════════════════════════════════════════════════════════
    modules_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de objetos: [{module_key, module_name, price, quantity, subtotal}]'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },

    // ═══════════════════════════════════════════════════════════
    // INFORMACIÓN DE PRUEBA (30 días con 100% bonificación)
    // ═══════════════════════════════════════════════════════════
    trial_modules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Array de module_keys que están en período de prueba'
    },
    has_trial: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si este presupuesto incluye módulos nuevos con período de prueba'
    },
    trial_start_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de inicio del período de prueba (cuando cliente acepta)'
    },
    trial_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de fin del período de prueba (start + 30 días)'
    },
    trial_bonification_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100.00,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje de bonificación durante el trial (default: 100%)'
    },

    // ═══════════════════════════════════════════════════════════
    // REFERENCIAS A PRESUPUESTOS ANTERIORES/SIGUIENTES
    // ═══════════════════════════════════════════════════════════
    previous_quote_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'quotes',
        key: 'id'
      },
      comment: 'Presupuesto anterior de esta empresa'
    },
    replaces_quote_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'quotes',
        key: 'id'
      },
      comment: 'Presupuesto que este reemplaza (cuando se acepta un upgrade/downgrade)'
    },
    replaced_by_quote_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'quotes',
        key: 'id'
      },
      comment: 'Presupuesto que reemplazó a este (cuando se supersede)'
    },

    // ═══════════════════════════════════════════════════════════
    // TIPO DE CAMBIO (upgrade/downgrade/modification)
    // ═══════════════════════════════════════════════════════════
    is_upgrade: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si agrega módulos nuevos'
    },
    is_downgrade: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si quita módulos existentes'
    },
    is_modification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si cambia cantidad/precio sin agregar/quitar módulos'
    },
    added_modules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Array de module_keys que se agregaron vs presupuesto anterior'
    },
    removed_modules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Array de module_keys que se quitaron vs presupuesto anterior'
    },

    // ═══════════════════════════════════════════════════════════
    // ESTADO DEL PRESUPUESTO
    // ═══════════════════════════════════════════════════════════
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'sent', 'in_trial', 'accepted', 'active', 'rejected', 'expired', 'superseded']]
      },
      comment: 'Estados: draft (borrador), sent (enviado), in_trial (en prueba), accepted (aceptado), active (activo actual), rejected (rechazado), expired (caducado por tiempo), superseded (reemplazado por otro presupuesto)'
    },

    // ═══════════════════════════════════════════════════════════
    // FECHAS Y METADATA
    // ═══════════════════════════════════════════════════════════
    sent_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha en que se envió al cliente'
    },
    accepted_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha en que el cliente aceptó (inicia trial si hay módulos nuevos)'
    },
    rejected_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de rechazo'
    },
    expiration_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de expiración del presupuesto (usualmente 30 días desde sent_date)'
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha hasta la cual el presupuesto es válido'
    },

    // ═══════════════════════════════════════════════════════════
    // OBSERVACIONES Y TÉRMINOS
    // ═══════════════════════════════════════════════════════════
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas internas del vendedor'
    },
    client_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas/comentarios del cliente'
    },
    terms_and_conditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Términos y condiciones específicos de este presupuesto'
    },

    // ═══════════════════════════════════════════════════════════
    // ARCHIVOS ADJUNTOS
    // ═══════════════════════════════════════════════════════════
    pdf_file_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta al PDF generado del presupuesto'
    },

    // ═══════════════════════════════════════════════════════════
    // FACTURA ASOCIADA
    // ═══════════════════════════════════════════════════════════
    invoice_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'invoices',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Factura generada desde este presupuesto'
    },

    // ═══════════════════════════════════════════════════════════
    // HISTORIAL DE ESTADOS
    // ═══════════════════════════════════════════════════════════
    status_history: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de cambios: [{from, to, changed_by, changed_at, reason}]'
    },

    // ═══════════════════════════════════════════════════════════
    // AUDITORÍA
    // ═══════════════════════════════════════════════════════════
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del usuario que creó el presupuesto'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del último usuario que modificó el presupuesto'
    }
  }, {
    tableName: 'quotes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['seller_id'] },
      { fields: ['lead_id'] },
      { fields: ['status'] },
      { fields: ['quote_number'], unique: true },
      { fields: ['sent_date'] },
      { fields: ['accepted_date'] },
      { fields: ['trial_start_date'] },
      { fields: ['trial_end_date'] },
      {
        name: 'idx_active_quotes_per_company',
        fields: ['company_id', 'status'],
        where: { status: 'active' },
        comment: 'Solo puede haber 1 presupuesto activo por empresa'
      }
    ],
    hooks: {
      /**
       * HOOK: Antes de crear, auto-generar quote_number
       */
      beforeCreate: async (quote, options) => {
        if (!quote.quote_number) {
          const year = new Date().getFullYear();

          // Obtener el último número del año
          const lastQuote = await Quote.findOne({
            where: sequelize.where(
              sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM created_at')),
              year
            ),
            order: [['id', 'DESC']],
            transaction: options.transaction
          });

          let nextNumber = 1;
          if (lastQuote && lastQuote.quote_number) {
            const match = lastQuote.quote_number.match(/PRES-\d{4}-(\d{4})/);
            if (match) {
              nextNumber = parseInt(match[1]) + 1;
            }
          }

          quote.quote_number = `PRES-${year}-${String(nextNumber).padStart(4, '0')}`;
        }
      },

      /**
       * HOOK: Antes de actualizar a 'active', verificar que no exista otro activo
       * (La DB tiene constraint, pero validamos antes para mejor UX)
       */
      beforeUpdate: async (quote, options) => {
        if (quote.changed('status') && quote.status === 'active') {
          const existingActive = await Quote.findOne({
            where: {
              company_id: quote.company_id,
              status: 'active',
              id: { [sequelize.Sequelize.Op.ne]: quote.id }
            },
            transaction: options.transaction
          });

          if (existingActive) {
            throw new Error(`Ya existe un presupuesto activo para esta empresa (${existingActive.quote_number}). Debe marcarse como 'superseded' primero.`);
          }
        }

        // Auto-calcular trial_end_date si se establece trial_start_date
        if (quote.changed('trial_start_date') && quote.trial_start_date && !quote.trial_end_date) {
          const startDate = new Date(quote.trial_start_date);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 30);
          quote.trial_end_date = endDate;
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS DE INSTANCIA
  // ═══════════════════════════════════════════════════════════

  /**
   * Calcula el total del presupuesto basado en modules_data
   */
  Quote.prototype.calculateTotal = function() {
    if (!this.modules_data || !Array.isArray(this.modules_data)) {
      return 0;
    }

    return this.modules_data.reduce((sum, module) => {
      const subtotal = parseFloat(module.subtotal || 0);
      return sum + subtotal;
    }, 0);
  };

  /**
   * Verifica si el presupuesto está en período de prueba
   */
  Quote.prototype.isInTrial = function() {
    if (!this.has_trial || !this.trial_start_date || !this.trial_end_date) {
      return false;
    }

    const now = new Date();
    return now >= new Date(this.trial_start_date) && now <= new Date(this.trial_end_date);
  };

  /**
   * Verifica si el período de prueba ha finalizado
   */
  Quote.prototype.isTrialExpired = function() {
    if (!this.has_trial || !this.trial_end_date) {
      return false;
    }

    const now = new Date();
    return now > new Date(this.trial_end_date);
  };

  /**
   * Obtiene días restantes de prueba
   */
  Quote.prototype.getTrialDaysRemaining = function() {
    if (!this.isInTrial()) {
      return 0;
    }

    const now = new Date();
    const end = new Date(this.trial_end_date);
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return Math.max(0, days);
  };

  /**
   * Marca el presupuesto como enviado
   */
  Quote.prototype.markAsSent = async function() {
    this.status = 'sent';
    this.sent_date = new Date();

    // Establecer fecha de expiración (30 días)
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30);
    this.expiration_date = expiration;
    this.valid_until = expiration;

    await this.save();
    return this;
  };

  /**
   * Acepta el presupuesto e inicia trial si corresponde
   */
  Quote.prototype.accept = async function(options = {}) {
    this.status = this.has_trial ? 'in_trial' : 'accepted';
    this.accepted_date = new Date();

    // Si tiene trial, establecer fechas
    if (this.has_trial) {
      this.trial_start_date = new Date();
      const endDate = new Date(this.trial_start_date);
      endDate.setDate(endDate.getDate() + 30);
      this.trial_end_date = endDate;
    }

    await this.save(options);
    return this;
  };

  /**
   * Rechaza el presupuesto
   */
  Quote.prototype.reject = async function(reason = null) {
    this.status = 'rejected';
    this.rejected_date = new Date();

    if (reason) {
      this.client_notes = (this.client_notes || '') + `\nRechazo: ${reason}`;
    }

    await this.save();
    return this;
  };

  /**
   * Activa el presupuesto (después de trial o directamente)
   */
  Quote.prototype.activate = async function(transaction = null) {
    // Marcar presupuesto anterior como superseded si existe
    if (this.replaces_quote_id) {
      const oldQuote = await Quote.findByPk(this.replaces_quote_id, { transaction });
      if (oldQuote && oldQuote.status === 'active') {
        oldQuote.status = 'superseded';
        oldQuote.replaced_by_quote_id = this.id;
        await oldQuote.save({ transaction });
      }
    }

    this.status = 'active';
    await this.save({ transaction });
    return this;
  };

  /**
   * Cambia el estado del presupuesto con audit trail
   * @param {string} newStatus - Nuevo estado
   * @param {number|null} userId - ID del usuario que realiza el cambio
   * @param {string|null} reason - Razón del cambio
   * @param {Object} options - Opciones de Sequelize (transaction, etc)
   */
  Quote.prototype.changeStatus = async function(newStatus, userId = null, reason = null, options = {}) {
    const VALID_TRANSITIONS = {
      draft: ['sent'],
      sent: ['in_trial', 'accepted', 'rejected', 'expired'],
      in_trial: ['accepted', 'active', 'rejected', 'sent'],
      accepted: ['active', 'rejected', 'sent'],
      active: ['superseded'],
      rejected: ['sent'],
      expired: ['sent'],
      superseded: []
    };

    const currentStatus = this.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Transición no permitida: ${currentStatus} → ${newStatus}. Permitidas: ${allowed.join(', ')}`);
    }

    const historyEntry = {
      from: currentStatus,
      to: newStatus,
      changed_by: userId,
      changed_at: new Date().toISOString(),
      reason: reason || null
    };

    const history = Array.isArray(this.status_history) ? [...this.status_history] : [];
    history.push(historyEntry);

    this.status = newStatus;
    this.status_history = history;

    if (userId && Number.isInteger(Number(userId))) {
      this.updated_by = userId;
    }

    await this.save(options);
    return this;
  };

  /**
   * Genera un JSON resumen del presupuesto
   */
  Quote.prototype.toSummary = function() {
    return {
      id: this.id,
      quote_number: this.quote_number,
      company_id: this.company_id,
      seller_id: this.seller_id,
      total_amount: parseFloat(this.total_amount),
      status: this.status,
      has_trial: this.has_trial,
      trial_days_remaining: this.getTrialDaysRemaining(),
      is_in_trial: this.isInTrial(),
      is_trial_expired: this.isTrialExpired(),
      modules_count: this.modules_data?.length || 0,
      is_upgrade: this.is_upgrade,
      is_downgrade: this.is_downgrade,
      created_at: this.created_at,
      sent_date: this.sent_date,
      accepted_date: this.accepted_date
    };
  };

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS DE CLASE
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtiene el presupuesto activo de una empresa
   */
  Quote.getActiveQuote = async function(companyId, transaction = null) {
    return await Quote.findOne({
      where: {
        company_id: companyId,
        status: 'active'
      },
      transaction
    });
  };

  /**
   * Obtiene todos los presupuestos de una empresa (historial)
   */
  Quote.getCompanyHistory = async function(companyId, options = {}) {
    return await Quote.findAll({
      where: { company_id: companyId },
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  /**
   * Obtiene presupuestos con trial activo próximos a vencer
   */
  Quote.getTrialsEndingSoon = async function(daysThreshold = 7) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    return await Quote.findAll({
      where: {
        status: 'in_trial',
        has_trial: true,
        trial_end_date: {
          [sequelize.Sequelize.Op.between]: [now, threshold]
        }
      },
      order: [['trial_end_date', 'ASC']]
    });
  };

  /**
   * Obtiene presupuestos con trial expirado que necesitan decisión
   */
  Quote.getExpiredTrials = async function() {
    const now = new Date();

    return await Quote.findAll({
      where: {
        status: 'in_trial',
        has_trial: true,
        trial_end_date: {
          [sequelize.Sequelize.Op.lt]: now
        }
      },
      order: [['trial_end_date', 'ASC']]
    });
  };

  /**
   * Obtiene estadísticas de presupuestos por vendedor
   */
  Quote.getSellerStats = async function(sellerId, options = {}) {
    const { startDate, endDate } = options;

    const where = { seller_id: sellerId };
    if (startDate && endDate) {
      where.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    const quotes = await Quote.findAll({ where });

    const stats = {
      total: quotes.length,
      by_status: {},
      total_amount: 0,
      accepted_amount: 0,
      active_amount: 0,
      in_trial_count: 0,
      conversion_rate: 0
    };

    quotes.forEach(quote => {
      stats.by_status[quote.status] = (stats.by_status[quote.status] || 0) + 1;
      stats.total_amount += parseFloat(quote.total_amount || 0);

      if (quote.status === 'accepted' || quote.status === 'active') {
        stats.accepted_amount += parseFloat(quote.total_amount || 0);
      }

      if (quote.status === 'active') {
        stats.active_amount += parseFloat(quote.total_amount || 0);
      }

      if (quote.status === 'in_trial') {
        stats.in_trial_count++;
      }
    });

    // Calcular tasa de conversión (accepted + active / total sent)
    const sent = (stats.by_status.sent || 0) +
                 (stats.by_status.accepted || 0) +
                 (stats.by_status.active || 0) +
                 (stats.by_status.in_trial || 0);
    const converted = (stats.by_status.accepted || 0) + (stats.by_status.active || 0);

    if (sent > 0) {
      stats.conversion_rate = ((converted / sent) * 100).toFixed(2);
    }

    return stats;
  };

  return Quote;
};
