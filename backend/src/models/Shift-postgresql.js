const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Shift = sequelize.define('Shift', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'startTime'
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'endTime'
    },
    toleranceMinutes: {
      type: DataTypes.UUID,
      defaultValue: 10,
      field: 'toleranceMinutes'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'isActive'
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
      type: DataTypes.UUID,
      defaultValue: 10,
      field: 'toleranceMinutesEntry',
      comment: 'LEGACY: Minutos tolerancia ingreso (tardío) - usar toleranceConfig'
    },
    toleranceMinutesExit: {
      type: DataTypes.UUID,
      defaultValue: 15,
      field: 'toleranceMinutesExit',
      comment: 'LEGACY: Minutos tolerancia egreso (quedarse) - usar toleranceConfig'
    },
    // CONFIGURACIÓN DETALLADA DE TOLERANCIA (Multi-tenant - cada empresa define su política)
    toleranceConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'toleranceConfig',
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
      type: DataTypes.UUID,
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
      field: 'shiftType',
      comment: 'Tipo de turno: estándar, rotativo, permanente o flash'
    },
    breakStartTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'breakStartTime',
      comment: 'Hora inicio descanso'
    },
    breakEndTime: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'breakEndTime',
      comment: 'Hora fin descanso'
    },
    // Para turnos rotativos
    rotationPattern: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'rotationPattern',
      comment: 'Patrón rotativo: 5x2x5x2x5x2 (ej: 5 mañana, 2 franco, 5 tarde, etc.)'
    },
    cycleStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'cycleStartDate',
      comment: 'LEGACY: Usar global_cycle_start_date'
    },
    global_cycle_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'global_cycle_start_date',
      comment: 'Fecha en que ARRANCÓ el ciclo del turno (reloj propio global)'
    },
    phases: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'phases',
      defaultValue: [],
      comment: 'Fases del turno rotativo con detalles: [{ name, duration, startTime, endTime, groupName }]'
    },
    workDays: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'workDays',
      comment: 'Días trabajados en ciclo rotativo'
    },
    restDays: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'restDays',
      comment: 'Días descanso en ciclo rotativo'
    },
    // Para turnos flash (temporales)
    flashStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'flashStartDate',
      comment: 'Fecha inicio turno flash'
    },
    flashEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'flashEndDate',
      comment: 'Fecha fin turno flash'
    },
    flashPriority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal',
      field: 'flashPriority',
      comment: 'Prioridad del turno flash'
    },
    allowOverride: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'allowOverride',
      comment: 'Permitir sobreasignación sobre otros turnos'
    },
    // Para turnos permanentes
    permanentPriority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'critical'),
      defaultValue: 'normal',
      field: 'permanentPriority',
      comment: 'Prioridad del turno permanente'
    },
    // Tarifas horarias (multiplicadores)
    hourlyRates: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'hourlyRates',
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
    },
    // CAMPOS PARA SISTEMA DE FERIADOS Y SUCURSALES
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'branch_id',
      references: {
        model: 'branches',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Sucursal a la que pertenece el turno (NULL = aplica a TODAS las sucursales)'
    },
    respect_national_holidays: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'respect_national_holidays',
      comment: 'Si TRUE, excluye feriados nacionales del calendario del turno'
    },
    respect_provincial_holidays: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'respect_provincial_holidays',
      comment: 'Si TRUE, excluye feriados provinciales del calendario del turno'
    },
    custom_non_working_days: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'custom_non_working_days',
      defaultValue: [],
      comment: 'Array de fechas personalizadas no laborables: ["2025-12-24", "2026-01-02"]'
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