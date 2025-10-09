const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrainingAssignment = sequelize.define('TrainingAssignment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    training_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'trainings',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onDelete: 'CASCADE'
    },
    // Estado
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'in_progress', 'completed', 'failed', 'expired']]
      }
    },
    // Progreso
    progress_percentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    time_spent_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    // Fechas
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'training_assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['training_id', 'user_id']
      },
      {
        fields: ['company_id']
      },
      {
        fields: ['training_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['company_id', 'status']
      }
    ]
  });

  // Método para iniciar la capacitación
  TrainingAssignment.prototype.start = function() {
    if (this.status === 'pending') {
      this.status = 'in_progress';
      this.started_at = new Date();
    }
  };

  // Método para completar la capacitación
  TrainingAssignment.prototype.complete = function() {
    this.status = 'completed';
    this.completed_at = new Date();
    this.progress_percentage = 100;
  };

  // Método para marcar como fallida
  TrainingAssignment.prototype.fail = function() {
    this.status = 'failed';
    this.completed_at = new Date();
  };

  // Método para verificar si está vencido
  TrainingAssignment.prototype.isExpired = function() {
    if (!this.due_date) return false;
    if (this.status === 'completed') return false;
    return new Date(this.due_date) < new Date();
  };

  // Método para calcular días restantes
  TrainingAssignment.prototype.daysRemaining = function() {
    if (!this.due_date) return null;
    if (this.status === 'completed') return null;

    const now = new Date();
    const due = new Date(this.due_date);
    const diff = due - now;

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Hook para validar fechas
  TrainingAssignment.beforeSave((assignment) => {
    // Si se completa, asegurarse de que progress sea 100%
    if (assignment.status === 'completed' && assignment.progress_percentage < 100) {
      assignment.progress_percentage = 100;
    }

    // Si está fallida o expirada, marcar completed_at si no existe
    if ((assignment.status === 'failed' || assignment.status === 'expired') && !assignment.completed_at) {
      assignment.completed_at = new Date();
    }
  });

  return TrainingAssignment;
};
