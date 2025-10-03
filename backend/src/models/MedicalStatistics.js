const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalStatistics = sequelize.define('MedicalStatistics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Identificación
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID de la empresa (null = todas las empresas)'
    },
    
    // Período estadístico
    periodType: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly', 'all_time'),
      allowNull: false,
      defaultValue: 'yearly'
    },
    
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    
    // Estadísticas generales de ausencias
    totalAbsences: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de ausencias médicas'
    },
    
    totalDaysAbsent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de días de ausencia'
    },
    
    averageAbsenceDuration: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Duración promedio de ausencias en días'
    },
    
    // Estadísticas por tipo de episodio
    episodesByType: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Estadísticas por tipo de episodio médico'
    },
    
    // Estadísticas por diagnóstico
    diagnosisStatistics: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Estadísticas por diagnóstico/enfermedad'
    },
    
    // Estadísticas por severidad
    severityDistribution: {
      type: DataTypes.JSON,
      defaultValue: {
        mild: 0,
        moderate: 0,
        severe: 0,
        critical: 0
      },
      comment: 'Distribución por severidad'
    },
    
    // Estadísticas relacionadas con trabajo
    workRelatedCases: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Casos relacionados con el trabajo'
    },
    
    accidentCases: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Casos por accidentes'
    },
    
    occupationalDiseases: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Enfermedades ocupacionales'
    },
    
    // Estadísticas de medicación
    medicationStatistics: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Estadísticas de medicación utilizada'
    },
    
    // Estadísticas de recurrencia
    recurringConditions: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Condiciones médicas recurrentes'
    },
    
    // Estadísticas de seguimiento médico
    followUpRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Casos que requirieron seguimiento'
    },
    
    followUpCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Seguimientos completados'
    },
    
    // Estadísticas de estudios médicos
    studiesRequested: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Estudios médicos solicitados'
    },
    
    studiesCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Estudios médicos completados'
    },
    
    // Estadísticas mensuales detalladas
    monthlyBreakdown: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Desglose mensual de estadísticas'
    },
    
    // Comparación con períodos anteriores
    comparisonData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos de comparación con períodos anteriores'
    },
    
    // Indicadores de riesgo
    riskIndicators: {
      type: DataTypes.JSON,
      defaultValue: {
        high_frequency_employee: false,
        recurring_conditions: false,
        long_term_absences: false,
        work_related_pattern: false
      },
      comment: 'Indicadores de riesgo identificados'
    },
    
    // Metadata
    lastCalculated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Última vez que se calcularon las estadísticas'
    },
    
    calculatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Usuario que calculó las estadísticas'
    }
  }, {
    tableName: 'medical_statistics',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'periodType']
      },
      {
        fields: ['companyId', 'periodStart', 'periodEnd']
      },
      {
        unique: true,
        fields: ['userId', 'periodType', 'periodStart', 'periodEnd']
      }
    ]
  });

  return MedicalStatistics;
};