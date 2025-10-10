/**
 * Modelo para matriz de compatibilidad de tareas entre empleados
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TaskCompatibility = sequelize.define('TaskCompatibility', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Multi-tenancy
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'company_id',
      comment: 'ID de la empresa'
    },

    // Empleado principal (que se ausenta)
    primaryUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'primary_user_id',
      comment: 'ID del empleado principal que se ausenta'
    },

    // Empleado que puede cubrir
    coverUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'cover_user_id',
      comment: 'ID del empleado que puede cubrir las tareas'
    },
    
    // Puntuación de compatibilidad
    compatibilityScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'compatibility_score',
      comment: 'Puntuación de compatibilidad (0-100)'
    },

    // Tareas que puede cubrir
    coverableTasks: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'coverable_tasks',
      comment: 'Array de tareas que puede cubrir con sus niveles de competencia'
    },
    
    // Tareas que NO puede cubrir
    nonCoverableTasks: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de tareas que NO puede cubrir'
    },
    
    // Disponibilidad y restricciones
    availabilityRestrictions: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Restricciones de disponibilidad (horarios, fechas específicas)'
    },
    
    // Capacidad máxima
    maxCoverageHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_coverage_hours',
      comment: 'Máximo de horas que puede cubrir por día'
    },

    maxConcurrentTasks: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: 'max_concurrent_tasks',
      comment: 'Máximo de tareas que puede manejar simultáneamente'
    },
    
    // Evaluación de rendimiento
    lastPerformanceScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Última puntuación de rendimiento en cobertura'
    },
    
    totalCoverageHours: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de horas de cobertura realizadas'
    },
    
    successfulCoverages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Número de coberturas exitosas realizadas'
    },
    
    // Configuración automática
    isAutoCalculated: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si fue calculada automáticamente por el sistema'
    },
    
    lastCalculationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última vez que se calculó la compatibilidad'
    },
    
    calculationData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Datos utilizados en el último cálculo'
    },
    
    // Estado
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: 'Si esta relación de compatibilidad está activa'
    },
    
    // Notas manuales
    manualNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas manuales de RH sobre esta compatibilidad'
    }
    
  }, {
    tableName: 'task_compatibility',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_task_compat_primary',
        fields: ['primaryUserId', 'isActive']
      },
      {
        name: 'idx_task_compat_cover',
        fields: ['coverUserId', 'isActive']
      },
      {
        name: 'idx_task_compat_score',
        fields: ['compatibilityScore', 'isActive']
      },
      {
        name: 'idx_task_compat_pair',
        fields: ['primaryUserId', 'coverUserId'],
        unique: true
      }
    ]
  });

  return TaskCompatibility;
};