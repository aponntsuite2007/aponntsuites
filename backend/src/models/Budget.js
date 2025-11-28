/**
 * MODEL: Budget
 *
 * Representa presupuestos enviados a empresas prospect en el workflow altaEmpresa.
 * Incluye módulos seleccionados, pricing personalizado y estados del flujo.
 * Trace ID: ONBOARDING-{UUID}
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
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'company_id'
    },
    onDelete: 'CASCADE'
  },
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
      isIn: [['PENDING', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'MODIFIED']]
    }
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
      fields: ['vendor_id']
    },
    {
      fields: ['trace_id']
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
