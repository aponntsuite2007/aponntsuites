/**
 * 📅 SHIFT CALENDAR ROUTES - Calendario Visual de Turnos Rotativos
 *
 * Endpoints para obtener proyección de turnos en calendario
 * con visualización anual del ciclo rotativo
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ShiftCalculatorService = require('../services/ShiftCalculatorService');
const { Shift, UserShiftAssignment, Branch, Holiday } = require('../config/database');

/**
 * GET /api/v1/shifts/:id/calendar
 *
 * Obtiene calendario de un turno para un rango de fechas
 * Muestra proyección del ciclo rotativo
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * - year: Año (para vista anual) - opcional
 */
router.get('/:id/calendar', auth, async (req, res) => {
  try {
    const { id } = req.params;
    let { startDate, endDate, year } = req.query;

    console.log('📅 [SHIFT-CALENDAR] Request:', { id, startDate, endDate, year });

    // Si se especifica año, generar rango completo del año
    if (year) {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren startDate y endDate o year'
      });
    }

    // Obtener turno
    const shift = await Shift.findByPk(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        error: 'Turno no encontrado'
      });
    }

    // Verificar que pertenece a la empresa del usuario
    if (shift.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para ver este turno'
      });
    }

    // Si no es rotativo, retornar calendario simple
    if (shift.shiftType !== 'rotative') {
      return res.json({
        success: true,
        shift: {
          id: shift.id,
          name: shift.name,
          shiftType: shift.shiftType,
          startTime: shift.startTime,
          endTime: shift.endTime
        },
        isRotative: false,
        calendar: generateSimpleCalendar(startDate, endDate, shift),
        message: 'Turno no rotativo - calendario simple'
      });
    }

    // Para turnos rotativos, generar proyección del ciclo

    // Obtener días no laborables (feriados + custom)
    const nonWorkingDays = await getNonWorkingDays(shift, startDate, endDate);

    const calendar = generateRotativeCalendar(shift, startDate, endDate, nonWorkingDays);

    // Obtener usuarios asignados por fase
    const usersByPhase = await getUsersByPhase(shift.id);

    // Calcular estadísticas
    const stats = calculateShiftStats(calendar);

    res.json({
      success: true,
      shift: {
        id: shift.id,
        name: shift.name,
        shiftType: shift.shiftType,
        global_cycle_start_date: shift.global_cycle_start_date,
        phases: shift.phases,
        rotationPattern: shift.rotationPattern,
        branch_id: shift.branch_id,
        respect_national_holidays: shift.respect_national_holidays,
        respect_provincial_holidays: shift.respect_provincial_holidays
      },
      isRotative: true,
      calendar: calendar,
      usersByPhase: usersByPhase,
      stats: stats,
      nonWorkingDays: nonWorkingDays,
      dateRange: {
        startDate,
        endDate,
        totalDays: calendar.length
      }
    });

  } catch (error) {
    console.error('❌ [SHIFT-CALENDAR] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar calendario del turno',
      message: error.message
    });
  }
});

/**
 * Obtiene días no laborables para un turno (feriados + custom)
 */
async function getNonWorkingDays(shift, startDate, endDate) {
  const nonWorkingDays = [];

  try {
    // 1. Agregar custom_non_working_days del turno
    if (shift.custom_non_working_days && Array.isArray(shift.custom_non_working_days)) {
      shift.custom_non_working_days.forEach(date => {
        nonWorkingDays.push({
          date: date,
          type: 'custom',
          name: 'Día no laborable personalizado',
          source: 'shift_custom'
        });
      });
    }

    // 2. Si el turno respeta feriados, buscar en la base de datos
    if (shift.respect_national_holidays || shift.respect_provincial_holidays) {
      // Obtener información de la sucursal si existe
      let branchCountry = null;
      let branchProvince = null;

      if (shift.branch_id) {
        const branch = await Branch.findByPk(shift.branch_id);
        if (branch) {
          branchCountry = branch.country;
          branchProvince = branch.state_province;
        }
      }

      // Si hay país configurado, buscar feriados
      if (branchCountry) {
        const whereClause = {
          country: branchCountry,
          date: {
            [require('sequelize').Op.between]: [startDate, endDate]
          }
        };

        // Filtrar por tipo de feriado
        const orConditions = [];

        if (shift.respect_national_holidays) {
          orConditions.push({ is_national: true });
        }

        if (shift.respect_provincial_holidays && branchProvince) {
          orConditions.push({
            is_provincial: true,
            state_province: branchProvince
          });
        }

        if (orConditions.length > 0) {
          whereClause[require('sequelize').Op.or] = orConditions;
        }

        const holidays = await Holiday.findAll({
          where: whereClause,
          order: [['date', 'ASC']]
        });

        holidays.forEach(holiday => {
          nonWorkingDays.push({
            date: holiday.date,
            type: holiday.is_national ? 'national_holiday' : 'provincial_holiday',
            name: holiday.name,
            source: 'holidays_db',
            country: holiday.country,
            province: holiday.state_province
          });
        });
      }
    }

    // 3. Eliminar duplicados (priorizar feriados sobre custom)
    const uniqueDates = {};
    nonWorkingDays.forEach(nwd => {
      if (!uniqueDates[nwd.date] || nwd.type !== 'custom') {
        uniqueDates[nwd.date] = nwd;
      }
    });

    return Object.values(uniqueDates).sort((a, b) => a.date.localeCompare(b.date));

  } catch (error) {
    console.error('❌ [getNonWorkingDays] Error:', error);
    // En caso de error, retornar solo los custom (no bloquear calendario)
    return nonWorkingDays.filter(nwd => nwd.type === 'custom');
  }
}

/**
 * Genera calendario para turno no rotativo (simple)
 */
function generateSimpleCalendar(startDate, endDate, shift) {
  const calendar = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];

    calendar.push({
      date: dateString,
      dayOfWeek: d.getDay(),
      dayName: getDayName(d.getDay()),
      isWorkDay: true, // Para turnos simples, todos los días son laborables
      phase: null,
      phaseName: 'Turno Fijo',
      shift: {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime
      },
      workingGroups: ['Todos']
    });
  }

  return calendar;
}

/**
 * Genera calendario para turno rotativo
 */
function generateRotativeCalendar(shift, startDate, endDate, nonWorkingDays = []) {
  const calendar = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const globalCycleStart = new Date(shift.global_cycle_start_date);
  const phases = shift.phases || [];

  if (phases.length === 0) {
    throw new Error('Turno rotativo sin fases configuradas');
  }

  // Calcular duración total del ciclo
  const totalCycleDays = phases.reduce((sum, phase) => sum + (phase.duration || 0), 0);

  if (totalCycleDays === 0) {
    throw new Error('Ciclo del turno con duración total = 0');
  }

  // Crear Set de fechas no laborables para búsqueda rápida
  const nonWorkingDatesSet = new Set(nonWorkingDays.map(nwd => nwd.date));

  // Generar calendario día por día
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];

    // Verificar si es día no laborable (feriado o custom)
    const nonWorkingInfo = nonWorkingDays.find(nwd => nwd.date === dateString);
    const isNonWorkingDay = nonWorkingDatesSet.has(dateString);

    // Calcular días desde inicio del ciclo global
    const daysSinceGlobalStart = Math.floor((d - globalCycleStart) / (1000 * 60 * 60 * 24));

    // Día en el ciclo (0 a totalCycleDays-1)
    const dayInCycle = ((daysSinceGlobalStart % totalCycleDays) + totalCycleDays) % totalCycleDays;

    // Encontrar fase actual
    let accumulatedDays = 0;
    let currentPhase = null;
    let phaseIndex = 0;

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseDuration = phase.duration || 0;

      if (dayInCycle >= accumulatedDays && dayInCycle < accumulatedDays + phaseDuration) {
        currentPhase = phase;
        phaseIndex = i;
        break;
      }

      accumulatedDays += phaseDuration;
    }

    const isRestPhase = currentPhase?.name === 'descanso' ||
                        currentPhase?.name === 'franco' ||
                        currentPhase?.name === 'rest';

    // Si es día no laborable (feriado), debe ser tratado como no laborable
    // incluso si en el ciclo corresponde trabajo
    const isWorkDay = !isRestPhase && !isNonWorkingDay;

    calendar.push({
      date: dateString,
      dayOfWeek: d.getDay(),
      dayName: getDayName(d.getDay()),
      dayInCycle: dayInCycle,
      cycleNumber: Math.floor(daysSinceGlobalStart / totalCycleDays) + 1,
      phase: currentPhase,
      phaseName: currentPhase?.name || 'Sin fase',
      phaseIndex: phaseIndex,
      isWorkDay: isWorkDay,
      isHoliday: isNonWorkingDay,
      holidayInfo: nonWorkingInfo || null,
      shift: (isRestPhase || isNonWorkingDay) ? null : {
        name: shift.name,
        startTime: currentPhase?.startTime || shift.startTime,
        endTime: currentPhase?.endTime || shift.endTime,
        groupName: currentPhase?.groupName || null,
        sector: currentPhase?.sector || null
      },
      workingGroups: (isRestPhase || isNonWorkingDay) ? [] : [currentPhase?.groupName || currentPhase?.name]
    });
  }

  return calendar;
}

/**
 * Obtiene usuarios asignados agrupados por fase
 */
async function getUsersByPhase(shiftId) {
  const assignments = await UserShiftAssignment.findAll({
    where: {
      shift_id: shiftId,
      is_active: true
    },
    include: [{
      model: require('../config/database').User,
      as: 'user',
      attributes: ['user_id', 'nombre', 'apellido', 'usuario', 'legajo']
    }],
    order: [
      ['assigned_phase', 'ASC'],
      ['join_date', 'ASC']
    ]
  });

  // Agrupar por fase
  const byPhase = {};

  assignments.forEach(assignment => {
    const phase = assignment.assigned_phase;

    if (!byPhase[phase]) {
      byPhase[phase] = {
        phase: phase,
        groupName: assignment.group_name,
        sector: assignment.sector,
        users: []
      };
    }

    byPhase[phase].users.push({
      user_id: assignment.user.user_id,
      nombre: assignment.user.nombre,
      apellido: assignment.user.apellido,
      usuario: assignment.user.usuario,
      legajo: assignment.user.legajo,
      join_date: assignment.join_date
    });
  });

  return Object.values(byPhase);
}

/**
 * Calcula estadísticas del calendario
 */
function calculateShiftStats(calendar) {
  const stats = {
    totalDays: calendar.length,
    workDays: 0,
    restDays: 0,
    phases: {},
    cyclesCompleted: 0
  };

  calendar.forEach(day => {
    if (day.isWorkDay) {
      stats.workDays++;
    } else {
      stats.restDays++;
    }

    // Contar por fase
    const phaseName = day.phaseName;
    if (!stats.phases[phaseName]) {
      stats.phases[phaseName] = {
        name: phaseName,
        days: 0,
        isRest: !day.isWorkDay
      };
    }
    stats.phases[phaseName].days++;

    // Ciclos completados
    if (day.cycleNumber > stats.cyclesCompleted) {
      stats.cyclesCompleted = day.cycleNumber;
    }
  });

  // Convertir phases object a array
  stats.phasesSummary = Object.values(stats.phases);

  return stats;
}

/**
 * Obtiene nombre del día de la semana
 */
function getDayName(dayNumber) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayNumber];
}

module.exports = router;
