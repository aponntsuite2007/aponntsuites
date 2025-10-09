const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrainingProgress = sequelize.define('TrainingProgress', {
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
    assignment_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'training_assignments',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    // Evaluación
    attempt_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10
      }
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 1000
      }
    },
    passed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Respuestas (si hay evaluación)
    answers: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    // Certificado
    certificate_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    certificate_issued_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Feedback
    instructor_feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    student_feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Timestamps
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'training_progress',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['company_id']
      },
      {
        fields: ['assignment_id']
      },
      {
        fields: ['passed']
      },
      {
        fields: ['assignment_id', 'attempt_number']
      }
    ]
  });

  // Método para marcar como aprobado
  TrainingProgress.prototype.markAsPassed = function(certificateUrl = null) {
    this.passed = true;
    this.completed_at = new Date();

    if (certificateUrl) {
      this.certificate_url = certificateUrl;
      this.certificate_issued_at = new Date();
    }
  };

  // Método para marcar como reprobado
  TrainingProgress.prototype.markAsFailed = function() {
    this.passed = false;
    this.completed_at = new Date();
  };

  // Método para calcular el porcentaje de aciertos (si answers está disponible)
  TrainingProgress.prototype.calculateSuccessRate = function() {
    if (!this.answers || !Array.isArray(this.answers)) {
      return null;
    }

    const totalQuestions = this.answers.length;
    if (totalQuestions === 0) return 0;

    const correctAnswers = this.answers.filter(a => a.correct === true).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  };

  // Método para obtener duración del intento
  TrainingProgress.prototype.getDuration = function() {
    if (!this.started_at || !this.completed_at) {
      return null;
    }

    const diff = new Date(this.completed_at) - new Date(this.started_at);
    return Math.round(diff / (1000 * 60)); // Retorna minutos
  };

  // Hook para validar respuestas
  TrainingProgress.beforeSave((progress) => {
    // Si está marcado como completado, asegurar que tiene fecha de completado
    if (progress.passed && !progress.completed_at) {
      progress.completed_at = new Date();
    }

    // Si hay certificado, asegurar que pasó la evaluación
    if (progress.certificate_url && !progress.passed) {
      throw new Error('No se puede emitir certificado si no aprobó la evaluación');
    }
  });

  return TrainingProgress;
};
