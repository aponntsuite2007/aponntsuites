const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserAssignedTask = sequelize.define('UserAssignedTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id'
      },
      index: true
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
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'task_id',
      references: {
        model: 'company_tasks',
        key: 'id'
      },
      index: true
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_by',
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Quién asignó la tarea'
    },
    assignedDate: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      field: 'assigned_date'
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'due_date',
      comment: 'Fecha límite'
    },
    status: {
      type: DataTypes.ENUM('pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada'),
      defaultValue: 'pendiente'
    },
    priority: {
      type: DataTypes.ENUM('baja', 'media', 'alta', 'urgente'),
      allowNull: true
    },
    progressPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'progress_percentage',
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Porcentaje de progreso (0-100)'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'start_date',
      comment: 'Cuándo se comenzó'
    },
    completionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'completion_date',
      comment: 'Cuándo se completó'
    },
    actualHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'actual_hours',
      comment: 'Horas reales dedicadas a la tarea'
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'requires_approval'
    },
    submittedForApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'submitted_for_approval'
    },
    approvalDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'approval_date'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'approved_by',
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    approvalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'approval_notes'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas del empleado'
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON array de archivos adjuntos [{filename, url, uploadDate}]'
    },
    comments: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON array de comentarios [{userId, userName, date, text}]'
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'reminder_sent'
    },
    reminderDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'reminder_date'
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
    tableName: 'user_assigned_tasks',
    timestamps: true,
    underscored: true
  });

  UserAssignedTask.associate = (models) => {
    UserAssignedTask.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserAssignedTask.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
    UserAssignedTask.belongsTo(models.CompanyTask, {
      foreignKey: 'taskId',
      as: 'task'
    });
    UserAssignedTask.belongsTo(models.User, {
      foreignKey: 'assignedBy',
      as: 'assigner'
    });
    UserAssignedTask.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
  };

  return UserAssignedTask;
};
