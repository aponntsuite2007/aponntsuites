/**
 * MODEL: CommissionLiquidation
 *
 * Liquidaciones de comisiones (inmediatas o mensuales) para vendedores.
 * Incluye breakdown JSONB con comisiones directas + piramidales (L1-L4).
 * Workflow: altaEmpresa - FASE 5 (Liquidación Inmediata)
 * Trace ID: COMMISSION-{UUID}
 */

const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {

  const CommissionLiquidation = sequelize.define('CommissionLiquidation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trace_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'COMMISSION-{UUID} - Trazabilidad de liquidación'
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK will be added when invoices table is created'
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
  liquidation_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['ONBOARDING_IMMEDIATE', 'MONTHLY']]
    },
    comment: 'ONBOARDING_IMMEDIATE (alta empresa) o MONTHLY (ciclo mensual)'
  },
  liquidation_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'LIQ-YYYY-MM-NNNN autogenerado'
  },
  liquidation_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  period_start: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  period_end: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  invoice_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Monto de la factura que genera comisión'
  },
  invoice_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  total_commissionable: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Monto sobre el que se calcula comisión'
  },
  total_commission_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'SUM de todas las comisiones calculadas'
  },
  commission_breakdown: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Array JSONB con breakdown de comisiones por vendedor (directas + piramidales)'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'CALCULATED',
    allowNull: false,
    validate: {
      isIn: [['CALCULATED', 'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAYMENT_IN_PROGRESS', 'PAID', 'CANCELLED']]
    }
  },
  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'aponnt_staff',
      key: 'staff_id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID del batch de pagos (si se paga en lote)'
  },
  payment_scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha programada de pago'
  },
  payment_executed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha real de pago'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'TRANSFERENCIA',
    validate: {
      isIn: [['TRANSFERENCIA', 'VIRTUAL_WALLET']]
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING(50),
    defaultValue: 'SYSTEM',
    validate: {
      isIn: [['SYSTEM', 'MANUAL']]
    }
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
  tableName: 'commission_liquidations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id']
    },
    {
      fields: ['invoice_id']
    },
    {
      fields: ['trace_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['liquidation_type']
    },
    {
      fields: ['liquidation_date'],
      order: [['liquidation_date', 'DESC']]
    },
    {
      fields: ['period_start', 'period_end']
    },
    {
      name: 'idx_comm_liq_payment_date',
      fields: ['payment_scheduled_date'],
      where: {
        status: ['PAYMENT_PENDING', 'PAYMENT_IN_PROGRESS']
      }
    },
    {
      name: 'idx_comm_liq_breakdown_gin',
      fields: ['commission_breakdown'],
  
  return CommissionLiquidation;
};
