/**
 * MODELO: NotificationWorkflow
 * Definición de cadenas de aprobación y workflows automáticos
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationWorkflow = sequelize.define('NotificationWorkflow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Multi-tenant (NULL = workflow global para todas las empresas)
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'company_id'
      },
      index: true,
      comment: 'NULL = workflow global aplicable a todas las empresas'
    },

    // Identificación
    workflow_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true,
      comment: 'Clave única del workflow (ej: attendance_late_arrival_approval)'
    },
    workflow_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre descriptivo del workflow'
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Módulo al que pertenece: attendance, medical, legal, training, etc.'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Configuración
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      index: true
    },

    // Pasos del workflow (array ordenado de objetos)
    // Ejemplo: [{step: 1, name: "Supervisor", approver_field: "supervisor_id", timeout_minutes: 30, ...}, ...]
    steps: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de pasos del workflow con configuración de cada nivel'
    },

    // Condiciones de activación (cuándo aplicar este workflow)
    // Ejemplo: {requires_authorization: true, minutes_late: {gt: 10}}
    activation_conditions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Condiciones que deben cumplirse para activar este workflow'
    },

    // Acciones automáticas al aprobar
    on_approval_actions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array de acciones a ejecutar cuando se aprueba: ["update_attendance_status", "notify_employee", etc.]'
    },

    // Acciones automáticas al rechazar
    on_rejection_actions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array de acciones a ejecutar cuando se rechaza'
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
    tableName: 'notification_workflows',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'workflow_key'],
        name: 'unique_company_workflow_key'
      },
      {
        fields: ['company_id', 'module', 'is_active'],
        name: 'idx_workflows_company_module'
      }
    ]
  });

  // ================== MÉTODOS DE INSTANCIA ==================

  /**
   * Verificar si el workflow aplica para una entidad dada
   */
  NotificationWorkflow.prototype.appliesTo = function(entity) {
    if (!this.is_active) return false;

    const conditions = this.activation_conditions;
    if (!conditions || Object.keys(conditions).length === 0) return true;

    // Evaluar condiciones simples
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'object') {
        // Condiciones con operadores: {gt: 10, lt: 60}
        for (const [operator, threshold] of Object.entries(value)) {
          const entityValue = entity[key];
          switch (operator) {
            case 'gt':
              if (!(entityValue > threshold)) return false;
              break;
            case 'gte':
              if (!(entityValue >= threshold)) return false;
              break;
            case 'lt':
              if (!(entityValue < threshold)) return false;
              break;
            case 'lte':
              if (!(entityValue <= threshold)) return false;
              break;
            case 'eq':
              if (entityValue !== threshold) return false;
              break;
            case 'ne':
              if (entityValue === threshold) return false;
              break;
          }
        }
      } else {
        // Condición simple de igualdad
        if (entity[key] !== value) return false;
      }
    }

    return true;
  };

  /**
   * Obtener el paso específico del workflow
   */
  NotificationWorkflow.prototype.getStep = function(stepNumber) {
    return this.steps.find(s => s.step === stepNumber);
  };

  /**
   * Obtener el primer paso del workflow
   */
  NotificationWorkflow.prototype.getFirstStep = function() {
    return this.steps.find(s => s.step === 1);
  };

  /**
   * Obtener el siguiente paso del workflow
   */
  NotificationWorkflow.prototype.getNextStep = function(currentStep) {
    const nextStepNumber = currentStep + 1;
    return this.steps.find(s => s.step === nextStepNumber);
  };

  /**
   * Verificar si es el último paso
   */
  NotificationWorkflow.prototype.isLastStep = function(stepNumber) {
    const maxStep = Math.max(...this.steps.map(s => s.step));
    return stepNumber === maxStep;
  };

  /**
   * Obtener total de pasos
   */
  NotificationWorkflow.prototype.getTotalSteps = function() {
    return this.steps.length;
  };

  /**
   * Formatear para API
   */
  NotificationWorkflow.prototype.toAPI = function() {
    return {
      id: this.id,
      company_id: this.company_id,
      workflow_key: this.workflow_key,
      workflow_name: this.workflow_name,
      module: this.module,
      description: this.description,
      is_active: this.is_active,
      total_steps: this.getTotalSteps(),
      steps: this.steps,
      activation_conditions: this.activation_conditions,
      on_approval_actions: this.on_approval_actions,
      on_rejection_actions: this.on_rejection_actions
    };
  };

  // ================== MÉTODOS ESTÁTICOS ==================

  /**
   * Buscar workflow aplicable para una entidad
   */
  NotificationWorkflow.findApplicable = async function(module, entity, companyId) {
    const workflows = await this.findAll({
      where: {
        module,
        is_active: true,
        [sequelize.Sequelize.Op.or]: [
          { company_id: companyId },
          { company_id: null } // Workflows globales
        ]
      },
      order: [
        // Priorizar workflows específicos de la empresa sobre globales
        [sequelize.literal('CASE WHEN company_id IS NULL THEN 1 ELSE 0 END'), 'ASC']
      ]
    });

    // Buscar el primer workflow que aplique
    for (const workflow of workflows) {
      if (workflow.appliesTo(entity)) {
        return workflow;
      }
    }

    return null;
  };

  /**
   * Obtener todos los workflows activos de una empresa
   */
  NotificationWorkflow.getActiveForCompany = async function(companyId, module = null) {
    const where = {
      is_active: true,
      [sequelize.Sequelize.Op.or]: [
        { company_id: companyId },
        { company_id: null }
      ]
    };

    if (module) {
      where.module = module;
    }

    return await this.findAll({
      where,
      order: [['module', 'ASC'], ['workflow_name', 'ASC']]
    });
  };

  return NotificationWorkflow;
};
