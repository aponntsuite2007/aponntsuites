/**
 * ShiftCalculatorService
 *
 * Servicio para cálculo de turnos rotativos con sistema de ACOPLAMIENTO.
 *
 * Conceptos clave:
 * - El turno tiene su RELOJ GLOBAL (global_cycle_start_date)
 * - Los usuarios se ACOPLAN al turno en marcha (no resetean el ciclo)
 * - Cada usuario se asigna a una FASE específica (mañana/tarde/noche)
 * - Solo trabajan cuando el turno global está en su fase
 *
 * Ejemplo:
 * - Turno "5x2 Producción" arrancó el 15/01 con ciclo mañana-descanso-tarde-descanso-noche-descanso
 * - Juan se acopla el 22/01 al grupo "Tarde"
 * - Juan trabaja solo cuando el turno global está en fase "Tarde" (días 7-11 del ciclo)
 */

const { Op } = require('sequelize');
const { UserShiftAssignment, Shift } = require('../config/database');

class ShiftCalculatorService {
  /**
   * Calcula en qué turno debería estar un usuario en una fecha dada
   *
   * @param {UUID} userId - ID del usuario
   * @param {String|Date} date - Fecha a consultar (YYYY-MM-DD o Date object)
   * @returns {Object} Información del turno calculado
   */
  static async calculateUserShiftForDate(userId, date) {
    try {
      // 1. Normalizar fecha
      const queryDate = typeof date === 'string' ? new Date(date) : date;
      const dateString = queryDate.toISOString().split('T')[0];

      // 2. Obtener asignación activa del usuario
      const assignment = await UserShiftAssignment.findOne({
        where: {
          user_id: userId,
          is_active: true,
          join_date: {
            [Op.lte]: dateString // La asignación debe haber empezado
          }
        },
        include: [{
          model: Shift,
          as: 'shift',
          where: {
            isActive: true
          }
        }],
        order: [['join_date', 'DESC']] // La más reciente
      });

      if (!assignment) {
        return {
          hasAssignment: false,
          shouldWork: false,
          reason: 'No tiene turno asignado para esta fecha'
        };
      }

      const shift = assignment.shift;

      // 3. Para turnos NO rotativos (standard, permanent, flash)
      if (shift.shiftType !== 'rotative') {
        return {
          hasAssignment: true,
          shift: shift,
          assignment: assignment,
          shouldWork: true,
          isRotative: false,
          shiftType: shift.shiftType,
          phase: assignment.assigned_phase,
          groupName: assignment.group_name
        };
      }

      // 4. CÁLCULO PARA TURNOS ROTATIVOS
      return this.calculateRotativeShift(assignment, shift, queryDate);
    } catch (error) {
      console.error('❌ [ShiftCalculatorService] Error en calculateUserShiftForDate:', error);
      throw error;
    }
  }

  /**
   * Calcula el estado de un turno rotativo para un usuario en una fecha
   *
   * @param {Object} assignment - UserShiftAssignment
   * @param {Object} shift - Shift
   * @param {Date} queryDate - Fecha a consultar
   * @returns {Object} Estado del turno rotativo
   */
  static calculateRotativeShift(assignment, shift, queryDate) {
    // Validar que el turno tenga global_cycle_start_date
    if (!shift.global_cycle_start_date) {
      return {
        hasAssignment: true,
        shouldWork: false,
        error: 'Turno rotativo sin fecha de inicio del ciclo global (global_cycle_start_date)'
      };
    }

    // Fecha de inicio del ciclo GLOBAL del turno
    const globalCycleStart = new Date(shift.global_cycle_start_date);

    // Días transcurridos desde que el turno GLOBAL arrancó
    const daysSinceGlobalStart = Math.floor(
      (queryDate - globalCycleStart) / (1000 * 60 * 60 * 24)
    );

    // Parse de las fases del turno (JSONB)
    const phases = shift.phases || [];

    if (phases.length === 0) {
      // Fallback: usar rotationPattern antiguo si existe
      if (shift.rotationPattern) {
        return this.calculateWithRotationPattern(
          assignment,
          shift,
          queryDate,
          daysSinceGlobalStart
        );
      }

      return {
        hasAssignment: true,
        shouldWork: false,
        error: 'Turno rotativo sin configuración de fases (phases vacío)'
      };
    }

    // Calcular total de días del ciclo
    const totalCycleDays = phases.reduce((sum, phase) => sum + (phase.duration || 0), 0);

    if (totalCycleDays === 0) {
      return {
        hasAssignment: true,
        shouldWork: false,
        error: 'Ciclo del turno con duración total = 0'
      };
    }

    // Día actual dentro del ciclo (0 a totalCycleDays-1)
    const dayInCycle = daysSinceGlobalStart % totalCycleDays;

    // Encontrar en qué fase del ciclo está el turno GLOBAL hoy
    let accumulatedDays = 0;
    let currentGlobalPhase = null;

    for (const phase of phases) {
      const phaseDuration = phase.duration || 0;

      if (dayInCycle >= accumulatedDays && dayInCycle < accumulatedDays + phaseDuration) {
        currentGlobalPhase = phase;
        break;
      }

      accumulatedDays += phaseDuration;
    }

    if (!currentGlobalPhase) {
      return {
        hasAssignment: true,
        shouldWork: false,
        error: `No se pudo determinar la fase global para el día ${dayInCycle} del ciclo`
      };
    }

    // El usuario solo trabaja si:
    // 1. La fase global actual coincide con su assigned_phase
    // 2. La fase no es de tipo "descanso"
    const userPhase = assignment.assigned_phase;
    const isRestPhase = currentGlobalPhase.name === 'descanso' ||
      currentGlobalPhase.name === 'franco' ||
      currentGlobalPhase.name === 'rest';

    const shouldWork = !isRestPhase &&
      currentGlobalPhase.name === userPhase;

    return {
      hasAssignment: true,
      shift: shift,
      assignment: assignment,
      isRotative: true,
      shouldWork: shouldWork,

      // Info del ciclo global
      globalCycleStartDate: shift.global_cycle_start_date,
      daysSinceGlobalStart: daysSinceGlobalStart,
      totalCycleDays: totalCycleDays,
      dayInCycle: dayInCycle,

      // Info de la fase global (del turno)
      currentGlobalPhase: currentGlobalPhase,
      globalPhaseName: currentGlobalPhase.name,

      // Info del usuario
      userAssignedPhase: userPhase,
      userGroupName: assignment.group_name,
      userSector: assignment.sector,

      // Estado
      isRestDay: isRestPhase,
      reason: shouldWork
        ? `Usuario trabaja (fase global "${currentGlobalPhase.name}" coincide con su fase "${userPhase}")`
        : isRestPhase
          ? `Día de descanso (fase global "${currentGlobalPhase.name}")`
          : `Usuario NO trabaja (fase global "${currentGlobalPhase.name}" ≠ su fase "${userPhase}")`
    };
  }

  /**
   * Calcula turno rotativo usando rotationPattern antiguo (fallback)
   *
   * @param {Object} assignment - UserShiftAssignment
   * @param {Object} shift - Shift
   * @param {Date} queryDate - Fecha a consultar
   * @param {Number} daysSinceGlobalStart - Días desde inicio global
   * @returns {Object} Estado del turno
   */
  static calculateWithRotationPattern(assignment, shift, queryDate, daysSinceGlobalStart) {
    const pattern = this.parseRotationPattern(shift.rotationPattern);

    if (!pattern || pattern.length === 0) {
      return {
        hasAssignment: true,
        shouldWork: false,
        error: 'Patrón de rotación inválido'
      };
    }

    const totalCycleDays = pattern.reduce((sum, p) => sum + p.days, 0);
    const dayInCycle = daysSinceGlobalStart % totalCycleDays;

    // Encontrar fase actual
    let accumulatedDays = 0;
    let currentPhase = null;

    for (const phase of pattern) {
      if (dayInCycle >= accumulatedDays && dayInCycle < accumulatedDays + phase.days) {
        currentPhase = phase;
        break;
      }
      accumulatedDays += phase.days;
    }

    const shouldWork = currentPhase && currentPhase.type === 'work';

    return {
      hasAssignment: true,
      shift: shift,
      assignment: assignment,
      isRotative: true,
      shouldWork: shouldWork,
      dayInCycle: dayInCycle,
      totalCycleDays: totalCycleDays,
      currentPhase: currentPhase,
      reason: shouldWork ? 'Día de trabajo' : 'Día de descanso'
    };
  }

  /**
   * Parse del patrón rotativo (formato antiguo)
   * Formato: "5x2x5x2x5x2" o "12x4"
   *
   * @param {String} pattern - Patrón en formato "NxM"
   * @returns {Array} Array de objetos { type, days, shiftTime }
   */
  static parseRotationPattern(pattern) {
    if (!pattern) return [];

    const parts = pattern.split('x').map(Number).filter(n => !isNaN(n));

    if (parts.length === 0) return [];

    // Patrón simple: trabajo-descanso alternado
    if (parts.length === 2) {
      const [workDays, restDays] = parts;
      return [
        { type: 'work', days: workDays, shiftTime: 'current' },
        { type: 'rest', days: restDays }
      ];
    }

    // Patrón complejo: múltiples rotaciones
    const phases = [];
    const shiftTimes = ['morning', 'afternoon', 'night'];
    let shiftIndex = 0;

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Días de trabajo
        phases.push({
          type: 'work',
          days: parts[i],
          shiftTime: shiftTimes[shiftIndex % shiftTimes.length]
        });
        shiftIndex++;
      } else {
        // Días de descanso
        phases.push({
          type: 'rest',
          days: parts[i]
        });
      }
    }

    return phases;
  }

  /**
   * Obtiene todos los usuarios que DEBERÍAN trabajar en una fecha dada
   *
   * @param {Number} companyId - ID de la empresa
   * @param {String|Date} date - Fecha a consultar
   * @param {Object} filters - Filtros opcionales (department_id, branch_id, shift_id)
   * @returns {Array} Array de objetos { user, assignment, shift, shouldWork, reason }
   */
  static async getUsersExpectedToWork(companyId, date, filters = {}) {
    try {
      const dateString = typeof date === 'string' ? date : date.toISOString().split('T')[0];

      // Obtener todas las asignaciones activas de la empresa
      const where = {
        company_id: companyId,
        is_active: true,
        join_date: {
          [Op.lte]: dateString
        }
      };

      if (filters.shift_id) {
        where.shift_id = filters.shift_id;
      }

      const assignments = await UserShiftAssignment.findAll({
        where: where,
        include: [
          {
            model: Shift,
            as: 'shift',
            where: {
              isActive: true
            }
          },
          {
            model: require('../config/database').User,
            as: 'user',
            where: {
              ...(filters.department_id && { departmentId: filters.department_id }),
              ...(filters.branch_id && { branch_id: filters.branch_id })
            }
          }
        ]
      });

      // Calcular para cada usuario si debería trabajar
      const results = await Promise.all(
        assignments.map(async (assignment) => {
          const calculation = await this.calculateUserShiftForDate(
            assignment.user_id,
            date
          );

          return {
            user: assignment.user,
            assignment: assignment,
            shift: assignment.shift,
            ...calculation
          };
        })
      );

      // Filtrar solo los que deberían trabajar
      return results.filter(r => r.shouldWork === true);
    } catch (error) {
      console.error('❌ [ShiftCalculatorService] Error en getUsersExpectedToWork:', error);
      throw error;
    }
  }

  /**
   * Genera un calendario de trabajo para un usuario en un rango de fechas
   *
   * @param {UUID} userId - ID del usuario
   * @param {String|Date} startDate - Fecha de inicio
   * @param {String|Date} endDate - Fecha de fin
   * @returns {Array} Array de objetos { date, shouldWork, phase, reason }
   */
  static async generateUserCalendar(userId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const calendar = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        const calculation = await this.calculateUserShiftForDate(userId, dateString);

        calendar.push({
          date: dateString,
          ...calculation
        });
      }

      return calendar;
    } catch (error) {
      console.error('❌ [ShiftCalculatorService] Error en generateUserCalendar:', error);
      throw error;
    }
  }
}

module.exports = ShiftCalculatorService;
