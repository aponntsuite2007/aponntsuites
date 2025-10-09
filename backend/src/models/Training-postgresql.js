const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Training = sequelize.define('Training', {
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
    // Información básica
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['video', 'pdf', 'external_link', 'scorm', 'presentation', 'interactive']]
      }
    },
    // Contenido
    content_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 1,
      validate: {
        min: 0.1,
        max: 999.99
      }
    },
    // Fechas
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    deadline: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    // Instructor/Responsable
    instructor: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Evaluación
    max_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 100,
      validate: {
        min: 0,
        max: 1000
      }
    },
    min_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 70,
      validate: {
        min: 0,
        max: 1000
      }
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2,
      validate: {
        min: 1,
        max: 10
      }
    },
    // Configuración
    mandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    certificate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['draft', 'active', 'archived']]
      }
    },
    // Estadísticas
    participants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    }
  }, {
    tableName: 'trainings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['company_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['deadline']
      },
      {
        fields: ['company_id', 'status']
      }
    ]
  });

  // Método para calcular el progreso automáticamente
  Training.prototype.updateProgress = function() {
    if (this.participants > 0) {
      this.progress = Math.round((this.completed / this.participants) * 100);
    } else {
      this.progress = 0;
    }
  };

  // Método para verificar si está vencido
  Training.prototype.isExpired = function() {
    if (!this.deadline) return false;
    return new Date(this.deadline) < new Date();
  };

  // Hook para validar fechas
  Training.beforeSave((training) => {
    if (training.start_date && training.deadline) {
      if (new Date(training.start_date) > new Date(training.deadline)) {
        throw new Error('La fecha de inicio no puede ser posterior a la fecha límite');
      }
    }
    if (training.min_score > training.max_score) {
      throw new Error('La puntuación mínima no puede ser mayor que la máxima');
    }
  });

  return Training;
};
