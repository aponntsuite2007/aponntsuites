/**
 * MODEL: AdministrativeTask
 *
 * Queue de tareas administrativas que requieren supervisión de admin Aponnt.
 * Use case: Facturas con requiere_supervision_factura = TRUE, revisión de contratos, etc.
 * Workflow: altaEmpresa - FASE 3 (Supervisión Administrativa)
 */

const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {

  const AdministrativeTask = sequelize.define('AdministrativeTask', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trace_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ONBOARDING-{UUID} o ADMIN-{UUID}'
  },
  task_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'FACTURA_SUPERVISION, CONTRACT_REVIEW, PAYMENT_VERIFICATION, etc.'
  },
  task_category: {
    type: DataTypes.STRING(50),
    defaultValue: 'ONBOARDING',
    allowNull: false,
    validate: {
      isIn: [['ONBOARDING', 'BILLING', 'COMPLIANCE', 'SUPPORT', 'OTHER']]
    }
  },
  priority: {
    type: DataTypes.STRING(20),
    defaultValue: 'NORMAL',
    allowNull: false,
    validate: {
      isIn: [['CRITICAL', 'HIGH', 'NORMAL', 'LOW']]
    }
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'companies',
      key: 'company_id'
    },
    onDelete: 'CASCADE'
  },
  related_entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'invoice, contract, budget, etc.'
  },
  related_entity_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID de la factura, contrato, etc.'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Instrucciones específicas para el admin'
  },
  context_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Datos adicionales relevantes para la tarea'
  },
  attachments: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array de { file_url, file_name, file_type }'
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'aponnt_staff',
      key: 'staff_id'
    },
    onDelete: 'SET NULL'
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  assigned_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'aponnt_staff',
      key: 'staff_id'
    },
    onDelete: 'SET NULL'
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  escalation_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha para escalar si no se resuelve'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'PENDING',
    allowNull: false,
    validate: {
      isIn: [['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_INFO', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']]
    }
  },
  resolution: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [['APPROVED', 'REJECTED', 'CANCELLED', 'INFO_PROVIDED']]
    }
  },
  resolution_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'aponnt_staff',
      key: 'staff_id'
    },
    onDelete: 'SET NULL'
  },
  resolved_at: {
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
  reminder_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_reminder_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING(50),
    defaultValue: 'SYSTEM',
    validate: {
      isIn: [['SYSTEM', 'MANUAL', 'API']]
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
  tableName: 'administrative_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['trace_id']
    },
    {
      fields: ['task_type']
    },
    {
      fields: ['due_date'],
      where: {
        status: ['PENDING', 'ASSIGNED', 'IN_PROGRESS']
      }
    },
    {
      fields: ['created_at'],
      order: [['created_at', 'DESC']]
    },
    {
      name: 'idx_admin_tasks_queue',
      fields: ['status', 'priority', 'created_at'],
      where: {
        status: ['PENDING', 'ASSIGNED', 'IN_PROGRESS']
      }
  ]
});
    }
  
  return AdministrativeTask;
};
