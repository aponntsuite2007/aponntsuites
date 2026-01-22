/**
 * MODEL: Budget
 *
 * Representa presupuestos enviados a empresas prospect en el workflow altaEmpresa.
 * Incluye módulos seleccionados, pricing personalizado y estados del flujo.
 * Trace ID: ONBOARDING-{UUID}
 *
 * FLUJO CORRECTO:
 * 1. Lead en etapa final → se crea Budget con lead_id (SIN company_id)
 * 2. Cliente acepta presupuesto → se genera contrato
 * 3. Cliente firma contrato → se crea Company INACTIVA y se asigna company_id
 * 4. Cliente paga factura → se activa Company
 *
 * REGLA: Solo puede haber 1 presupuesto VIGENTE por empresa/lead
 */

const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {

  const Budget = sequelize.define('Budget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trace_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'ONBOARDING-{UUID} - Trazabilidad completa del proceso'
  },

  // ═══════════════════════════════════════════════════════════
  // ORIGEN DEL PRESUPUESTO (Lead o Empresa existente)
  // ═══════════════════════════════════════════════════════════
  lead_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'sales_leads',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'Lead de origen (para nuevas empresas). Mutualmente excluyente con company_id inicial.'
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,  // CAMBIO CRÍTICO: ahora es opcional para permitir presupuestos desde leads
    references: {
      model: 'companies',
      key: 'company_id'
    },
    onDelete: 'CASCADE',
    comment: 'Empresa destino. NULL al inicio si viene de lead, se asigna al firmar contrato.'
  },

  // ═══════════════════════════════════════════════════════════
  // VENDEDOR Y METADATA
  // ═══════════════════════════════════════════════════════════
  vendor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'aponnt_staff',
      key: 'staff_id'
    },
    onDelete: 'RESTRICT'
  },
  budget_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'PPTO-YYYY-NNNN autogenerado'
  },
  selected_modules: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Array de módulos seleccionados con pricing personalizado'
  },
  contracted_employees: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  total_monthly: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  total_annual: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  discount_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_terms: {
    type: DataTypes.STRING(100),
    defaultValue: 'MENSUAL'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'PENDING',
    allowNull: false,
    validate: {
      isIn: [['PENDING', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'MODIFIED', 'SUPERSEDED', 'ACTIVE']]
    },
    comment: 'SUPERSEDED: reemplazado por otro presupuesto. ACTIVE: presupuesto vigente de la empresa.'
  },

  // ═══════════════════════════════════════════════════════════
  // VERSIONADO Y TRAZABILIDAD (para upgrade/downgrade)
  // ═══════════════════════════════════════════════════════════
  previous_budget_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'budgets',
      key: 'id'
    },
    comment: 'Presupuesto anterior de esta empresa (para historial)'
  },
  replaces_budget_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'budgets',
      key: 'id'
    },
    comment: 'Presupuesto que este reemplaza (cuando es upgrade/downgrade)'
  },
  replaced_by_budget_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'budgets',
      key: 'id'
    },
    comment: 'Presupuesto que reemplazó a este (cuando queda SUPERSEDED)'
  },
  is_upgrade: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True si agrega módulos vs presupuesto anterior'
  },
  is_downgrade: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True si quita módulos vs presupuesto anterior'
  },
  added_modules: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array de module_keys agregados vs presupuesto anterior'
  },
  removed_modules: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array de module_keys removidos vs presupuesto anterior'
  },

  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  viewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  responded_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejected_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  modification_requests: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Historial de solicitudes de modificación del cliente'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pdf_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL del PDF del presupuesto generado'
  },
  pdf_generated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'aponnt_staff',
      key: 'staff_id'
    }
  }
}, {
  tableName: 'budgets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['lead_id'],
      comment: 'Para buscar presupuestos por lead de origen'
    },
    {
      fields: ['vendor_id']
    },
    {
      fields: ['trace_id']
    },
    {
      name: 'idx_one_active_budget_per_company',
      fields: ['company_id', 'status'],
      where: { status: ['PENDING', 'SENT', 'VIEWED', 'ACCEPTED'] },
      comment: 'Solo 1 presupuesto vigente por empresa'
    },
    {
      name: 'idx_one_active_budget_per_lead',
      fields: ['lead_id', 'status'],
      where: { status: ['PENDING', 'SENT', 'VIEWED', 'ACCEPTED'] },
      comment: 'Solo 1 presupuesto vigente por lead'
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at'],
      order: [['created_at', 'DESC']]
    }
  ]
});

// Asociaciones (definidas en database.js)
  
  return Budget;
};
