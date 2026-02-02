/**
 * MODELO: Contract (Contrato de Servicio)
 *
 * Contratos generados a partir de presupuestos aceptados.
 * Define los términos comerciales, módulos contratados, y vigencia del servicio.
 *
 * REGLAS DE NEGOCIO:
 * 1. SIEMPRE se genera desde un presupuesto aceptado (quote_id o budget_id REQUIRED)
 * 2. modules_data DEBE ser copia EXACTA del presupuesto (no puede diferir)
 * 3. Solo puede haber 1 contrato VIGENTE por empresa
 * 4. Cualquier cambio = nuevo ciclo (nuevo presupuesto → nuevo contrato)
 * 5. trace_id conecta todo el ciclo de comercialización
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contract = sequelize.define('Contract', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contract_number: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'Formato: CONT-YYYY-NNNN (auto-generado)'
    },

    // ═══════════════════════════════════════════════════════════
    // TRAZABILIDAD
    // ═══════════════════════════════════════════════════════════
    trace_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ONBOARDING-{UUID} - Trazabilidad del proceso de alta'
    },

    // ═══════════════════════════════════════════════════════════
    // RELACIONES
    // ═══════════════════════════════════════════════════════════
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,  // CAMBIO: opcional hasta que se cree la empresa
      references: {
        model: 'companies',
        key: 'company_id'
      },
      onDelete: 'CASCADE',
      comment: 'NULL al inicio si viene de lead, se asigna al firmar contrato'
    },
    budget_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'budgets',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Presupuesto (Budget) del cual se generó este contrato (sistema nuevo)'
    },
    quote_id: {
      type: DataTypes.INTEGER,
      allowNull: true,  // CAMBIO: ahora opcional (puede venir de Budget)
      references: {
        model: 'quotes',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Presupuesto (Quote) del cual se generó este contrato (sistema antiguo)'
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: true,  // OPCIONAL - puede no haber vendedor asignado
      references: {
        model: 'partners',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Vendedor que realizó la venta (opcional - puede ser venta directa sin comisión)'
    },
    support_partner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'partners',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Partner de soporte técnico asignado'
    },

    // ═══════════════════════════════════════════════════════════
    // MÓDULOS CONTRATADOS
    // ═══════════════════════════════════════════════════════════
    modules_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de objetos: [{module_key, module_name, price, quantity}]'
    },
    selected_modules: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de módulos seleccionados (legacy, igual que modules_data)'
    },
    contracted_employees: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Cantidad de empleados contratados'
    },
    monthly_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      },
      comment: 'Total mensual del contrato'
    },
    total_monthly: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Total mensual (alias para compatibilidad con BD)'
    },
    contract_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código de contrato (alias de contract_number para BD legacy)'
    },
    contract_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'EULA',
      comment: 'Tipo de contrato: EULA, SERVICE, etc.'
    },
    contract_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha del contrato'
    },
    template_version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Versión del template EULA'
    },

    // ═══════════════════════════════════════════════════════════
    // VIGENCIA DEL CONTRATO
    // ═══════════════════════════════════════════════════════════
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha de inicio del contrato (cuando presupuesto es aceptado/activado)'
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de fin del contrato (null = indefinido, hasta cancelación)'
    },
    termination_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha real de terminación del contrato (puede diferir de end_date)'
    },
    termination_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Motivo de terminación del contrato'
    },

    // ═══════════════════════════════════════════════════════════
    // ESTADO DEL CONTRATO
    // ═══════════════════════════════════════════════════════════
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'sent', 'signed', 'active', 'suspended', 'terminated', 'cancelled', 'superseded']]
      },
      comment: 'Estados: draft (borrador), sent (enviado para firma), signed (firmado, empresa aún inactiva), active (activo, empresa activada), suspended (por falta de pago), terminated, cancelled, superseded (reemplazado)'
    },

    // ═══════════════════════════════════════════════════════════
    // VERSIONADO (para upgrade/downgrade)
    // ═══════════════════════════════════════════════════════════
    previous_contract_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contracts',
        key: 'id'
      },
      comment: 'Contrato anterior (para historial de upgrades/downgrades)'
    },
    replaces_contract_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contracts',
        key: 'id'
      },
      comment: 'Contrato que este reemplaza'
    },
    replaced_by_contract_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'contracts',
        key: 'id'
      },
      comment: 'Contrato que reemplazó a este (cuando queda SUPERSEDED)'
    },

    // ═══════════════════════════════════════════════════════════
    // TÉRMINOS COMERCIALES
    // ═══════════════════════════════════════════════════════════
    billing_cycle: {
      type: DataTypes.STRING(20),
      defaultValue: 'monthly',
      validate: {
        isIn: [['monthly', 'quarterly', 'yearly']]
      },
      comment: 'Ciclo de facturación: monthly (mensual), quarterly (trimestral), yearly (anual)'
    },
    payment_day: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      validate: {
        min: 1,
        max: 28
      },
      comment: 'Día del mes en que vence el pago (default: 10)'
    },
    payment_terms_days: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: 'Días de plazo para primer vencimiento desde generación de factura'
    },
    late_payment_surcharge_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10.00,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje de recargo por pago fuera de término (default: 10%)'
    },
    suspension_days_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      comment: 'Días de atraso antes de suspensión automática del servicio'
    },
    termination_days_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Días de atraso antes de terminación automática del servicio'
    },

    // ═══════════════════════════════════════════════════════════
    // COMISIONES
    // ═══════════════════════════════════════════════════════════
    seller_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje de comisión del vendedor (sale + support)'
    },
    seller_sale_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje de comisión por venta (única vez)'
    },
    seller_support_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje de comisión por soporte (mensual recurrente)'
    },
    support_commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje de comisión del partner de soporte (si es diferente al vendedor)'
    },

    // ═══════════════════════════════════════════════════════════
    // DOCUMENTOS
    // ═══════════════════════════════════════════════════════════
    pdf_file_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta al PDF del contrato firmado'
    },
    signed_pdf_file_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta al PDF del contrato firmado digitalmente'
    },
    client_signature_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de firma del cliente'
    },
    company_signature_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de firma de la empresa (Aponnt)'
    },

    // ═══════════════════════════════════════════════════════════
    // TÉRMINOS Y CONDICIONES
    // ═══════════════════════════════════════════════════════════
    terms_and_conditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Términos y condiciones específicos del contrato'
    },
    template_content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'HTML template del contrato generado'
    },
    sla_terms: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Service Level Agreement terms (tiempo de respuesta, uptime, etc.)'
    },

    // ═══════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas internas sobre el contrato'
    },
    renewal_notification_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True si se envió notificación de renovación (si aplica)'
    },
    renewal_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de renovación (si aplica)'
    },

    // ═══════════════════════════════════════════════════════════
    // AUDITORÍA
    // ═══════════════════════════════════════════════════════════
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del usuario que creó el contrato'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del último usuario que modificó el contrato'
    }
  }, {
    tableName: 'contracts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['quote_id'] },
      { fields: ['budget_id'], comment: 'Para contratos del sistema nuevo (Budget)' },
      { fields: ['trace_id'], comment: 'Trazabilidad del proceso de onboarding' },
      { fields: ['seller_id'] },
      { fields: ['support_partner_id'] },
      { fields: ['status'] },
      { fields: ['contract_number'], unique: true },
      { fields: ['start_date'] },
      { fields: ['end_date'] },
      {
        name: 'idx_one_active_contract_per_company',
        fields: ['company_id', 'status'],
        where: { status: 'active' },
        comment: 'Solo 1 contrato activo por empresa'
      },
      {
        name: 'idx_active_contracts',
        fields: ['status', 'company_id'],
        where: { status: 'active' }
      }
    ],
    hooks: {
      /**
       * HOOK: Antes de crear, auto-generar contract_number
       */
      beforeCreate: async (contract, options) => {
        if (!contract.contract_number) {
          const year = new Date().getFullYear();

          // Obtener el último número del año
          const lastContract = await Contract.findOne({
            where: sequelize.where(
              sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM created_at')),
              year
            ),
            order: [['id', 'DESC']],
            transaction: options.transaction
          });

          let nextNumber = 1;
          if (lastContract && lastContract.contract_number) {
            const match = lastContract.contract_number.match(/CONT-\d{4}-(\d{4})/);
            if (match) {
              nextNumber = parseInt(match[1]) + 1;
            }
          }

          contract.contract_number = `CONT-${year}-${String(nextNumber).padStart(4, '0')}`;
        }

        // Establecer start_date si no existe
        if (!contract.start_date) {
          contract.start_date = new Date();
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS DE INSTANCIA
  // ═══════════════════════════════════════════════════════════

  /**
   * Verifica si el contrato está activo
   */
  Contract.prototype.isActive = function() {
    if (this.status !== 'active') {
      return false;
    }

    const now = new Date();
    const start = new Date(this.start_date);

    if (now < start) {
      return false;
    }

    if (this.end_date) {
      const end = new Date(this.end_date);
      return now <= end;
    }

    return true;
  };

  /**
   * Verifica si el contrato está vencido
   */
  Contract.prototype.isExpired = function() {
    if (!this.end_date) {
      return false;
    }

    const now = new Date();
    const end = new Date(this.end_date);

    return now > end;
  };

  /**
   * Obtiene días de vigencia del contrato
   */
  Contract.prototype.getDaysActive = function() {
    const now = new Date();
    const start = new Date(this.start_date);
    const diff = now - start;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return Math.max(0, days);
  };

  /**
   * Obtiene días restantes hasta el fin del contrato
   */
  Contract.prototype.getDaysRemaining = function() {
    if (!this.end_date) {
      return null; // Indefinido
    }

    const now = new Date();
    const end = new Date(this.end_date);
    const diff = end - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days;
  };

  /**
   * Calcula el total mensual basado en modules_data
   */
  Contract.prototype.calculateMonthlyTotal = function() {
    if (!this.modules_data || !Array.isArray(this.modules_data)) {
      return 0;
    }

    return this.modules_data.reduce((sum, module) => {
      const price = parseFloat(module.price || 0);
      const quantity = parseInt(module.quantity || 1);
      return sum + (price * quantity);
    }, 0);
  };

  /**
   * Suspende el contrato (por falta de pago u otro motivo)
   */
  Contract.prototype.suspend = async function(reason = null) {
    this.status = 'suspended';

    if (reason) {
      this.notes = (this.notes || '') + `\nSuspendido: ${reason} (${new Date().toISOString()})`;
    }

    await this.save();
    return this;
  };

  /**
   * Reactiva el contrato suspendido
   */
  Contract.prototype.reactivate = async function(notes = null) {
    if (this.status === 'suspended') {
      this.status = 'active';

      if (notes) {
        this.notes = (this.notes || '') + `\nReactivado: ${notes} (${new Date().toISOString()})`;
      }

      await this.save();
    }
    return this;
  };

  /**
   * Termina el contrato
   */
  Contract.prototype.terminate = async function(reason = null) {
    this.status = 'terminated';
    this.termination_date = new Date();

    if (reason) {
      this.termination_reason = reason;
      this.notes = (this.notes || '') + `\nTerminado: ${reason} (${new Date().toISOString()})`;
    }

    await this.save();
    return this;
  };

  /**
   * Cancela el contrato
   */
  Contract.prototype.cancel = async function(reason = null) {
    this.status = 'cancelled';
    this.termination_date = new Date();

    if (reason) {
      this.termination_reason = reason;
      this.notes = (this.notes || '') + `\nCancelado: ${reason} (${new Date().toISOString()})`;
    }

    await this.save();
    return this;
  };

  /**
   * Actualiza módulos del contrato (upgrade/downgrade)
   */
  Contract.prototype.updateModules = async function(newModulesData) {
    this.modules_data = newModulesData;
    this.monthly_total = this.calculateMonthlyTotal();

    this.notes = (this.notes || '') + `\nMódulos actualizados (${new Date().toISOString()})`;

    await this.save();
    return this;
  };

  /**
   * Genera un resumen del contrato
   */
  Contract.prototype.toSummary = function() {
    return {
      id: this.id,
      contract_number: this.contract_number,
      company_id: this.company_id,
      seller_id: this.seller_id,
      support_partner_id: this.support_partner_id,
      monthly_total: parseFloat(this.monthly_total),
      status: this.status,
      start_date: this.start_date,
      end_date: this.end_date,
      termination_date: this.termination_date,
      days_active: this.getDaysActive(),
      days_remaining: this.getDaysRemaining(),
      is_active: this.isActive(),
      is_expired: this.isExpired(),
      modules_count: this.modules_data?.length || 0,
      billing_cycle: this.billing_cycle,
      payment_day: this.payment_day,
      created_at: this.created_at
    };
  };

  // ═══════════════════════════════════════════════════════════
  // MÉTODOS DE CLASE
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtiene el contrato activo de una empresa
   */
  Contract.getActiveContract = async function(companyId, transaction = null) {
    return await Contract.findOne({
      where: {
        company_id: companyId,
        status: 'active'
      },
      transaction
    });
  };

  /**
   * Obtiene todos los contratos de una empresa (historial)
   */
  Contract.getCompanyHistory = async function(companyId, options = {}) {
    return await Contract.findAll({
      where: { company_id: companyId },
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  /**
   * Obtiene contratos próximos a vencer
   */
  Contract.getContractsEndingSoon = async function(daysThreshold = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    return await Contract.findAll({
      where: {
        status: 'active',
        end_date: {
          [sequelize.Sequelize.Op.between]: [now, threshold],
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      order: [['end_date', 'ASC']]
    });
  };

  /**
   * Obtiene contratos suspendidos
   */
  Contract.getSuspendedContracts = async function() {
    return await Contract.findAll({
      where: { status: 'suspended' },
      order: [['updated_at', 'DESC']]
    });
  };

  /**
   * Obtiene estadísticas de contratos por vendedor
   */
  Contract.getSellerStats = async function(sellerId, options = {}) {
    const { startDate, endDate } = options;

    const where = { seller_id: sellerId };
    if (startDate && endDate) {
      where.created_at = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    const contracts = await Contract.findAll({ where });

    const stats = {
      total: contracts.length,
      by_status: {},
      active_count: 0,
      suspended_count: 0,
      terminated_count: 0,
      cancelled_count: 0,
      total_monthly_revenue: 0,
      active_monthly_revenue: 0,
      avg_contract_value: 0,
      avg_contract_duration_days: 0
    };

    let totalDuration = 0;
    let contractsWithDuration = 0;

    contracts.forEach(contract => {
      stats.by_status[contract.status] = (stats.by_status[contract.status] || 0) + 1;

      const monthlyTotal = parseFloat(contract.monthly_total || 0);
      stats.total_monthly_revenue += monthlyTotal;

      if (contract.status === 'active') {
        stats.active_count++;
        stats.active_monthly_revenue += monthlyTotal;
      }
      if (contract.status === 'suspended') stats.suspended_count++;
      if (contract.status === 'terminated') stats.terminated_count++;
      if (contract.status === 'cancelled') stats.cancelled_count++;

      // Calcular duración
      if (contract.termination_date) {
        const start = new Date(contract.start_date);
        const end = new Date(contract.termination_date);
        const diff = end - start;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        totalDuration += days;
        contractsWithDuration++;
      } else if (contract.status === 'active') {
        const daysActive = contract.getDaysActive();
        totalDuration += daysActive;
        contractsWithDuration++;
      }
    });

    // Promedios
    if (contracts.length > 0) {
      stats.avg_contract_value = (stats.total_monthly_revenue / contracts.length).toFixed(2);
    }

    if (contractsWithDuration > 0) {
      stats.avg_contract_duration_days = Math.floor(totalDuration / contractsWithDuration);
    }

    return stats;
  };

  /**
   * Obtiene revenue mensual activo (MRR - Monthly Recurring Revenue)
   */
  Contract.getMRR = async function() {
    const activeContracts = await Contract.findAll({
      where: { status: 'active' }
    });

    return activeContracts.reduce((sum, contract) => {
      return sum + parseFloat(contract.monthly_total || 0);
    }, 0);
  };

  /**
   * Obtiene estadísticas globales de contratos
   */
  Contract.getGlobalStats = async function() {
    const allContracts = await Contract.findAll();

    const stats = {
      total: allContracts.length,
      active: 0,
      suspended: 0,
      terminated: 0,
      cancelled: 0,
      mrr: 0, // Monthly Recurring Revenue
      arr: 0, // Annual Recurring Revenue
      total_companies: new Set(),
      avg_contract_value: 0
    };

    let totalRevenue = 0;

    allContracts.forEach(contract => {
      if (contract.status === 'active') {
        stats.active++;
        const monthlyTotal = parseFloat(contract.monthly_total || 0);
        stats.mrr += monthlyTotal;
        totalRevenue += monthlyTotal;
      }
      if (contract.status === 'suspended') stats.suspended++;
      if (contract.status === 'terminated') stats.terminated++;
      if (contract.status === 'cancelled') stats.cancelled++;

      stats.total_companies.add(contract.company_id);
    });

    stats.arr = stats.mrr * 12;
    stats.total_companies = stats.total_companies.size;

    if (stats.active > 0) {
      stats.avg_contract_value = (totalRevenue / stats.active).toFixed(2);
    }

    return stats;
  };

  return Contract;
};
