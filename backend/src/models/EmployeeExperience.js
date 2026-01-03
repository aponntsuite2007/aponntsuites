const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeExperience = sequelize.define('EmployeeExperience', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },

    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: true,  // NULL si anónimo total
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    // Contenido
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [3, 200]
      }
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [10, 10000]
      }
    },

    // Categorización manual
    type: {
      type: DataTypes.ENUM('SUGERENCIA', 'PROBLEMA', 'SOLUCION', 'RECONOCIMIENTO', 'PREGUNTA'),
      allowNull: true
    },

    area: {
      type: DataTypes.ENUM('PRODUCCION', 'ADMINISTRACION', 'LOGISTICA', 'CALIDAD',
                           'SEGURIDAD', 'IT', 'INFRAESTRUCTURA', 'COMERCIAL', 'OTRO'),
      allowNull: true
    },

    priority: {
      type: DataTypes.ENUM('CRITICO', 'ALTO', 'MEDIO', 'BAJO'),
      allowNull: true
    },

    impact_scope: {
      type: DataTypes.ENUM('INDIVIDUAL', 'EQUIPO', 'PLANTA', 'EMPRESA'),
      allowNull: true
    },

    // IA/ML resultados (nota: embedding se maneja como string JSON temporalmente)
    embedding: {
      type: DataTypes.TEXT,  // Vector serializado como JSON
      allowNull: true,
      get() {
        const raw = this.getDataValue('embedding');
        return raw ? JSON.parse(raw) : null;
      },
      set(value) {
        this.setDataValue('embedding', value ? JSON.stringify(value) : null);
      }
    },

    topics: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },

    sentiment_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: -1,
        max: 1
      }
    },

    sentiment_label: {
      type: DataTypes.ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE'),
      allowNull: true
    },



    // Clustering
    cluster_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'experience_clusters',
        key: 'id'
      }
    },

    similarity_to_cluster: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },

    is_cluster_original: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Visibilidad
    visibility: {
      type: DataTypes.ENUM('ANONYMOUS', 'ADMIN_ONLY', 'PUBLIC'),
      allowNull: false,
      defaultValue: 'ADMIN_ONLY'
    },

    // Estado
    status: {
      type: DataTypes.ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'PILOT',
                          'IMPLEMENTED', 'REJECTED', 'DUPLICATE'),
      allowNull: false,
      defaultValue: 'PENDING'
    },

    // Implementación
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },

    approved_date: {
      type: DataTypes.DATE,
      allowNull: true
    },

    implementation_start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },

    implementation_complete_date: {
      type: DataTypes.DATE,
      allowNull: true
    },

    implementation_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Métricas de impacto
    estimated_savings: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },

    actual_savings: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },

    estimated_time_saved: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    actual_time_saved: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    quality_improvement_pct: {
      type: DataTypes.FLOAT,
      allowNull: true
    },

    safety_impact_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Engagement
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    downvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    comments_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // Reconocimiento
    total_points_awarded: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    badges_earned: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'employee_experiences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['employee_id'] },
      { fields: ['cluster_id'] },
      { fields: ['status'] },
      { fields: ['visibility'] },
      { fields: ['area'] },
      { fields: ['type'] },
      { fields: ['created_at'] }
    ]
  });

  // Asociaciones
  EmployeeExperience.associate = (models) => {
    EmployeeExperience.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company'
    });

    EmployeeExperience.belongsTo(models.User, {
      foreignKey: 'employee_id',
      as: 'employee'
    });

    EmployeeExperience.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver'
    });

    EmployeeExperience.belongsTo(models.ExperienceCluster, {
      foreignKey: 'cluster_id',
      as: 'cluster'
    });

    EmployeeExperience.hasMany(models.ExperienceVote, {
      foreignKey: 'experience_id',
      as: 'votes'
    });

    EmployeeExperience.hasMany(models.ExperienceComment, {
      foreignKey: 'experience_id',
      as: 'comments'
    });

    EmployeeExperience.hasMany(models.ExperienceRecognition, {
      foreignKey: 'experience_id',
      as: 'recognitions'
    });
  };

  // Métodos de instancia
  EmployeeExperience.prototype.canBeViewedBy = function(user) {
    if (this.visibility === 'PUBLIC') return true;
    if (this.visibility === 'ADMIN_ONLY' && ['admin', 'superadmin'].includes(user.role)) return true;
    if (this.employee_id === user.user_id) return true;  // Autor siempre puede ver
    return false;
  };

  EmployeeExperience.prototype.getVisibleAuthor = function(currentUser) {
    if (this.visibility === 'PUBLIC') return this.employee;
    if (this.visibility === 'ADMIN_ONLY' && ['admin', 'superadmin'].includes(currentUser.role)) {
      return this.employee;
    }
    if (this.employee_id === currentUser.user_id) return this.employee;
    return null;  // Anónimo
  };

  EmployeeExperience.prototype.incrementViews = async function() {
    this.views += 1;
    await this.save({ fields: ['views', 'updated_at'] });
  };

  // Métodos de clase
  EmployeeExperience.findSimilar = async function(embedding, companyId, threshold = 0.85, limit = 5) {
    // Esta función se implementa en el servicio NLP que usa Faiss
    // Aquí solo es un placeholder para documentación
    throw new Error('Use VoiceDeduplicationService.findSimilar() instead');
  };

  return EmployeeExperience;
};
