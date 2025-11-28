/**
 * MODEL: ContractOnboarding
 *
 * Contratos EULA generados automáticamente para el workflow altaEmpresa.
 * Incluye firma digital (hash SHA-256), estado del contrato, y metadata de auditoría.
 * Trace ID: ONBOARDING-{UUID}
 */

const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {

  const ContractOnboarding = sequelize.define('ContractOnboarding', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trace_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'ONBOARDING-{UUID} - Mismo que budget/invoice'
  },
  budget_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'budgets',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  contract_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'CTRCT-YYYY-NNNN autogenerado'
  },
  contract_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'EULA',
    allowNull: false,
    validate: {
      isIn: [['EULA', 'CUSTOM', 'MSA']]
    }
  },
  eula_version: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Versión del EULA (ej: 1.0, 2.1)'
  },
  contract_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL del PDF del contrato generado'
  },
  contract_generated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  signature_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'SHA-256 del contrato firmado digitalmente'
  },
  signature_ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP desde donde se firmó (IPv4 o IPv6)'
  },
  signature_user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  signed_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  signed_by_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  signed_by_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Ej: CEO, Director, Gerente'
  },
  signed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de inicio de vigencia del contrato'
  },
  expiration_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de fin de vigencia (si aplica)'
  },
  auto_renew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  renewal_notice_days: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    comment: 'Días de anticipación para notificar renovación'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'DRAFT',
    allowNull: false,
    validate: {
      isIn: [['DRAFT', 'GENERATED', 'SENT', 'VIEWED', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED']]
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
  esignature_provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'APONNT_INTERNAL',
    comment: 'APONNT_INTERNAL, DOCUSIGN, HELLOSIGN, etc.'
  },
  esignature_document_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ID externo si se usa proveedor third-party'
  },
  legal_representative_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  legal_representative_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'DNI/CUIT del representante legal'
  },
  company_legal_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  company_tax_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Metadata adicional del contrato'
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
  tableName: 'contracts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['budget_id']
    },
    {
      fields: ['company_id']
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

  
  return ContractOnboarding;
};
