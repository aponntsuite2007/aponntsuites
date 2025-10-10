/**
 * Modelo para configuración de régimen de licencias y vacaciones
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VacationConfiguration = sequelize.define('VacationConfiguration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Configuración general
    vacationInterruptible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si las vacaciones pueden interrumpirse por enfermedad'
    },
    
    minContinuousDays: {
      type: DataTypes.INTEGER,
      defaultValue: 7,
      comment: 'Período mínimo de vacaciones continuas en días'
    },
    
    maxFractions: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Número máximo de fraccionamientos permitidos'
    },
    
    autoSchedulingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si está habilitada la programación automática'
    },
    
    minAdvanceNoticeDays: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      comment: 'Días mínimos de antelación para solicitar vacaciones'
    },
    
    maxSimultaneousPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: 'Porcentaje máximo de empleados simultáneos en vacaciones'
    },
    
    // Configuración específica
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si esta configuración está activa'
    }
    
  }, {
    tableName: 'vacation_configurations',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VacationConfiguration;
};