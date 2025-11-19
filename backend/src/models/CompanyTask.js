const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompanyTask = sequelize.define('CompanyTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      index: true
    },
    taskName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'task_name'
    },
    taskDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'task_description'
    },
    taskCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'task_code',
      comment: 'Código interno de tarea (ej: "TAREA-001")'
    },
    taskCategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'task_category',
      comment: 'Ej: Administrativo, Operativo, Mantenimiento'
    },
    taskType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'task_type',
      comment: 'Ej: Recurrente, Proyecto, Ad-hoc'
    },
    estimatedHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'estimated_hours',
      comment: 'Horas estimadas para completar'
    },
    priorityDefault: {
      type: DataTypes.ENUM('baja', 'media', 'alta', 'urgente'),
      allowNull: true,
      field: 'priority_default'
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'requires_approval'
    },
    approvalRole: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'approval_role',
      comment: 'Rol que debe aprobar (ej: supervisor, manager)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    isTemplate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_template',
      comment: 'Si es una plantilla reutilizable'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'company_tasks',
    timestamps: true,
    underscored: true
  });

  CompanyTask.associate = (models) => {
    CompanyTask.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
    CompanyTask.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    CompanyTask.hasMany(models.UserAssignedTask, {
      foreignKey: 'taskId',
      as: 'assignments'
    });
  };

  return CompanyTask;
};
