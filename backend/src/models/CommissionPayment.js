/**
 * MODEL: CommissionPayment
 *
 * Pagos individuales de comisiones a vendedores.
 * Incluye datos bancarios, método de pago, tracking completo del pago.
 * Workflow: altaEmpresa - FASE 5 (Pago a Vendedores)
 * Trace ID: PAYMENT-{UUID}
 */

const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {

  const CommissionPayment = sequelize.define('CommissionPayment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trace_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'PAYMENT-{UUID}'
  },
  liquidation_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'commission_liquidations',
      key: 'id'
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
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'company_id'
    },
    onDelete: 'CASCADE'
  },
  payment_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'PAY-YYYY-MM-NNNN autogenerado'
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  commission_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  tax_withholding: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    comment: 'Retenciones fiscales si aplica'
  },
  net_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'commission_amount - tax_withholding'
  },
  commission_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['DIRECT_SALES', 'PYRAMID_L1', 'PYRAMID_L2', 'PYRAMID_L3', 'PYRAMID_L4', 'SUPPORT_TEMPORARY']]
    }
  },
  commission_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: '% aplicado'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'TRANSFERENCIA',
    allowNull: false,
    validate: {
      isIn: [['TRANSFERENCIA', 'VIRTUAL_WALLET', 'CHEQUE', 'EFECTIVO']]
    }
  },
  bank_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  account_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [['CUENTA_CORRIENTE', 'CAJA_AHORRO', 'CBU', 'ALIAS']]
    }
  },
  account_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  cbu: {
    type: DataTypes.STRING(22),
    allowNull: true,
    comment: 'CBU de Argentina (22 dígitos)'
  },
  alias: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Alias de CBU'
  },
  wallet_provider: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MercadoPago, Ualá, etc.'
  },
  wallet_account: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'PENDING',
    allowNull: false,
    validate: {
      isIn: [['PENDING', 'SCHEDULED', 'IN_PROCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']]
    }
  },
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha programada de pago'
  },
  executed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha real de ejecución'
  },
  confirmation_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Código de confirmación bancaria'
  },
  transaction_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ID de transacción externa (banco, wallet)'
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  failure_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_retry_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reconciled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reconciled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reconciled_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'aponnt_staff',
      key: 'staff_id'
    }
  },
  receipt_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL del comprobante de pago'
  },
  receipt_generated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notification_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notification_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_batch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Si se paga en lote con otros pagos'
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
  tableName: 'commission_payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vendor_id']
    },
    {
      fields: ['liquidation_id']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_date'],
      order: [['payment_date', 'DESC']]
  
  return CommissionPayment;
};
