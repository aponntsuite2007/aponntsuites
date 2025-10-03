const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Shift = sequelize.define('Shift', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'starttime'
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'endtime'
    },
    toleranceMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      field: 'toleranceminutes'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'isactive'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    days: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Array de días: [0=Dom, 1=Lun, ..., 6=Sab]'
    },
    toleranceMinutesEntry: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      field: 'toleranceminutesentry',
      comment: 'LEGACY: Minutos tolerancia ingreso (tardío) - usar toleranceConfig'
    },
    toleranceMinutesExit: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      field: 'toleranceminutesexit',
      comment: 'LEGACY: Minutos tolerancia egreso (quedarse) - usar toleranceConfig'
    },
    // CONFIGURACIÓN DETALLADA DE TOLERANCIA (Multi-tenant - cada empresa define su política)
    toleranceConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'toleranceconfig',
      defaultValue: {
        entry: {
          before: 15,  // Minutos antes permitidos para marcar ingreso (llegar temprano)
          after: 10    // Minutos después permitidos para marcar ingreso (llegar tarde)
        },
        exit: {
          before: 10,  // Minutos antes permitidos para marcar egreso (salir temprano)
          after: 30    // Minutos después permitidos para marcar egreso (quedarse más)
        }
      },
      comment: 'Configuración detallada de tolerancia para marcado (antes/después ingreso/egreso)'
    },
    // CAMPOS PARA SISTEMA MULTI-TENANT
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    // CAMPOS PARA SISTEMA AVANZADO
    shiftType: {
      type: DataTypes.ENUM('standard', 'rotative', 'permanent', 'flash'),
      defaultValue: 'standard',
      field: 'shifttype',
      comment: 'Tipo de turno: estándar, rotativo, permanente o flash'
    },
    breakStartTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'breakstarttime',
      comment: 'Hora inicio descanso'
    },
    breakEndTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'breakendtime',
      comment: 'Hora fin descanso'
    },
    // Para turnos rotativos
    rotationPattern: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'rotationpattern',
      comment: 'Patrón rotativo: 12x4, 6x2, etc.'
    },
    cycleStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'cyclestartdate',
      comment: 'Fecha inicio ciclo rotativo'
    },
    workDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'workdays',
      comment: 'Días trabajados en ciclo rotativo'
    },
    restDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'restdays',
      comment: 'Días descanso en ciclo rotativo'
    },
    // Para turnos flash (temporales)
    flashStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'flashstartdate',
      comment: 'Fecha inicio turno flash'
    },
    flashEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'flashenddate',
      comment: 'Fecha fin turno flash'
    },
    flashPriority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal',
      field: 'flashpriority',
      comment: 'Prioridad del turno flash'
    },
    allowOverride: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'allowoverride',
      comment: 'Permitir sobreasignación sobre otros turnos'
    },
    // Para turnos permanentes
    permanentPriority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'critical'),
      defaultValue: 'normal',
      field: 'permanentpriority',
      comment: 'Prioridad del turno permanente'
    },
    // Tarifas horarias (multiplicadores)
    hourlyRates: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'hourlyrates',
      defaultValue: {
        normal: 1.0,
        overtime: 1.5,
        weekend: 1.5,
        holiday: 2.0
      },
      comment: 'Multiplicadores de tarifa por tipo de hora'
    },
    // Metadata adicional
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#007bff',
      comment: 'Color para visualización en calendario'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales del turno'
    }
  }, {
    tableName: 'shifts',
    schema: 'public',
    timestamps: true,
    indexes: [
      { fields: ['name'] },
      { fields: ['isActive'] },
      { fields: ['shiftType'] },
      { fields: ['flashStartDate', 'flashEndDate'] },
      { fields: ['cycleStartDate'] },
      { fields: ['company_id'] }
    ]
  });

  return Shift;
};