/**
 * Modelo para escalas de vacaciones por antigüedad
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VacationScale = sequelize.define('VacationScale', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Rango de antigüedad
    yearsFrom: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      comment: 'Años de antigüedad desde (permite decimales para meses)'
    },
    
    yearsTo: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      comment: 'Años de antigüedad hasta (null = sin límite superior)'
    },
    
    rangeDescription: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Descripción legible del rango (ej: "6 meses - 5 años")'
    },
    
    // Días de vacaciones otorgados
    vacationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Días de vacaciones correspondientes a este rango'
    },
    
    // Estado
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si esta escala está activa'
    },
    
    // Orden de aplicación
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Prioridad de aplicación (menor número = mayor prioridad)'
    }
    
  }, {
    tableName: 'vacation_scales',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        name: 'idx_vacation_scale_range',
        fields: ['yearsFrom', 'yearsTo', 'isActive']
      },
      {
        name: 'idx_vacation_scale_priority',
        fields: ['priority', 'isActive']
      }
    ]
  });

  return VacationScale;
};