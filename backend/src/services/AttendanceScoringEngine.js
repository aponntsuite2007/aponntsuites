const { Sequelize, Op } = require('sequelize');
const { sequelize, AttendanceProfile, Attendance, User, Company, Department, Shift, Branch } = require('../config/database');
const ShiftCalculatorService = require('./ShiftCalculatorService');

/**
 * AttendanceScoringEngine
 *
 * Motor determinístico de scoring basado en métricas de asistencia
 *
 * Fórmula Total:
 * scoring_total = (punctuality × 0.40) + (absence × 0.30) + (late_arrival × 0.20) + (early_departure × 0.10)
 *
 * Período de análisis: Últimos 90 días
 * Escalas: Todas de 0-100
 */
class AttendanceScoringEngine {

  /**
   * Recalcular scoring para un empleado específico
   * @param {UUID} userId - ID del usuario
   * @param {Integer} companyId - ID de la empresa
   * @returns {Object} - Scoring calculado
   */
  static async calculateUserScoring(userId, companyId) {
    try {
      console.log(`📊 [SCORING] Calculando scoring para user ${userId} en company ${companyId}`);

      // Período de análisis: últimos 90 días
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      // 1. Obtener datos del usuario
      const user = await User.findOne({
        where: { user_id: userId, company_id: companyId },
        include: [
          { model: Department, as: 'department' },
          { model: Shift, as: 'shift' },
          { model: Branch, as: 'branch' }
        ]
      });

      if (!user) {
        throw new Error(`Usuario ${userId} no encontrado en empresa ${companyId}`);
      }

      // 2. Obtener asistencias del período
      const attendances = await Attendance.findAll({
        where: {
          user_id: userId,
          company_id: companyId,
          attendance_date: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['attendance_date', 'ASC']]
      });

      console.log(`   📅 Asistencias en período: ${attendances.length}`);

      // 3. Calcular métricas base (usando SSOT de turnos)
      const metrics = await this._calculateBaseMetrics(attendances, startDate, endDate, userId);

      // 4. Calcular componentes de scoring
      const scoringPunctuality = this._calculatePunctualityScore(metrics);
      const scoringAbsence = this._calculateAbsenceScore(metrics);
      const scoringLateArrival = this._calculateLateArrivalScore(metrics);
      const scoringEarlyDeparture = this._calculateEarlyDepartureScore(metrics);

      // 5. Calcular scoring total (fórmula ponderada)
      const scoringTotal = this._calculateTotalScore({
        punctuality: scoringPunctuality,
        absence: scoringAbsence,
        lateArrival: scoringLateArrival,
        earlyDeparture: scoringEarlyDeparture
      });

      // 6. Determinar categoría de perfil
      const profileCategory = this._determineProfileCategory(scoringTotal);

      // 7. Crear o actualizar AttendanceProfile
      const profileData = {
        user_id: userId,
        company_id: companyId,
        employee_id: user.employee_id,
        department_id: user.departmentId || null,
        shift_id: user.shiftId || null,
        branch_id: user.branchId || null,

        // Scoring components
        scoring_total: scoringTotal,
        scoring_punctuality: scoringPunctuality,
        scoring_absence: scoringAbsence,
        scoring_late_arrival: scoringLateArrival,
        scoring_early_departure: scoringEarlyDeparture,

        // Métricas calculadas
        total_days: metrics.totalDays,
        present_days: metrics.presentDays,
        absent_days: metrics.absentDays,
        late_arrivals_count: metrics.lateArrivalsCount,
        early_departures_count: metrics.earlyDeparturesCount,
        tolerance_usage_rate: metrics.toleranceUsageRate,
        avg_late_minutes: metrics.avgLateMinutes,
        overtime_hours_total: metrics.overtimeHoursTotal,

        // Metadata
        last_calculated_at: new Date(),
        calculation_period_start: startDate,
        calculation_period_end: endDate,
        profile_category: profileCategory
      };

      const [profile, created] = await AttendanceProfile.upsert(profileData, {
        returning: true
      });

      console.log(`   ✅ Scoring actualizado: ${scoringTotal.toFixed(2)} (${profileCategory})`);
      console.log(`      • Puntualidad: ${scoringPunctuality.toFixed(2)} (40%)`);
      console.log(`      • Ausencias: ${scoringAbsence.toFixed(2)} (30%)`);
      console.log(`      • Llegadas tarde: ${scoringLateArrival.toFixed(2)} (20%)`);
      console.log(`      • Salidas anticipadas: ${scoringEarlyDeparture.toFixed(2)} (10%)`);

      return {
        success: true,
        profile,
        created,
        scoring: {
          total: scoringTotal,
          components: {
            punctuality: scoringPunctuality,
            absence: scoringAbsence,
            lateArrival: scoringLateArrival,
            earlyDeparture: scoringEarlyDeparture
          },
          category: profileCategory
        },
        metrics,
        period: {
          start: startDate,
          end: endDate,
          days: metrics.totalDays
        }
      };

    } catch (error) {
      console.error(`❌ [SCORING] Error calculando scoring:`, error);
      throw error;
    }
  }

  /**
   * Calcular métricas base desde asistencias
   *
   * REFACTORIZADO: Ahora usa ShiftCalculatorService como SSOT
   * para determinar qué días debía trabajar el usuario.
   *
   * Flujo:
   * 1. Usuario → user_shift_assignments
   * 2. Turno → tipo (standard, rotative, permanent, flash)
   * 3. Si rotativo → calcula días de trabajo según ciclo
   * 4. Si no tiene turno → fallback a lunes-viernes
   *
   * @private
   */
  static async _calculateBaseMetrics(attendances, startDate, endDate, userId) {
    // Calcular días laborables usando ShiftCalculatorService (SSOT)
    let totalDays = 0;
    let workingDatesExpected = new Set();
    let usedFallback = false;

    try {
      // Usar ShiftCalculatorService para obtener calendario de trabajo
      const calendar = await ShiftCalculatorService.generateUserCalendar(userId, startDate, endDate);

      // Contar días que el usuario DEBERÍA trabajar
      for (const day of calendar) {
        if (day.shouldWork) {
          totalDays++;
          workingDatesExpected.add(day.date);
        }
      }

      // Si no tiene asignación de turno, todos los días del calendario tendrán hasAssignment=false
      const hasShiftAssignment = calendar.some(d => d.hasAssignment);

      if (!hasShiftAssignment) {
        console.log(`   ⚠️ [SCORING] Usuario ${userId} sin turno asignado, usando fallback lunes-viernes`);
        totalDays = this._calculateWorkingDaysFallback(startDate, endDate);
        usedFallback = true;
      }
    } catch (error) {
      // Fallback si falla el cálculo de turnos
      console.error(`   ⚠️ [SCORING] Error calculando turno, usando fallback:`, error.message);
      totalDays = this._calculateWorkingDaysFallback(startDate, endDate);
      usedFallback = true;
    }

    let presentDays = 0;
    let absentDays = 0;
    let lateArrivalsCount = 0;
    let earlyDeparturesCount = 0;
    let toleranceUsageCount = 0;
    let totalLateMinutes = 0;
    let overtimeHoursTotal = 0;

    const attendanceDates = new Set();

    attendances.forEach(att => {
      const dateStr = att.attendance_date.toISOString().split('T')[0];
      attendanceDates.add(dateStr);

      if (att.check_in_time) {
        presentDays++;

        // Verificar llegada tarde
        if (att.late_arrival_minutes && att.late_arrival_minutes > 0) {
          lateArrivalsCount++;
          totalLateMinutes += att.late_arrival_minutes;

          // Verificar uso de tolerancia (asumimos 10 minutos de tolerancia)
          if (att.late_arrival_minutes <= 10) {
            toleranceUsageCount++;
          }
        }
      }

      // Verificar salida anticipada
      if (att.early_departure_minutes && att.early_departure_minutes > 0) {
        earlyDeparturesCount++;
      }

      // Acumular horas extras
      if (att.overtime_hours && att.overtime_hours > 0) {
        overtimeHoursTotal += parseFloat(att.overtime_hours);
      }
    });

    // Calcular ausencias (días laborables - días presentes)
    absentDays = Math.max(0, totalDays - presentDays);

    // Tasa de uso de tolerancia (% de veces que llegó tarde dentro de la tolerancia)
    const toleranceUsageRate = lateArrivalsCount > 0
      ? (toleranceUsageCount / lateArrivalsCount) * 100
      : 0;

    // Promedio de minutos tarde
    const avgLateMinutes = lateArrivalsCount > 0
      ? Math.round(totalLateMinutes / lateArrivalsCount)
      : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateArrivalsCount,
      earlyDeparturesCount,
      toleranceUsageRate,
      avgLateMinutes,
      overtimeHoursTotal,
      toleranceUsageCount,
      // Metadata SSOT
      calculationMethod: usedFallback ? 'FALLBACK_MON_FRI' : 'SHIFT_CALCULATOR_SSOT',
      workingDatesExpected: Array.from(workingDatesExpected)
    };
  }

  /**
   * FALLBACK: Calcular días laborables entre dos fechas (lunes a viernes)
   * Se usa cuando el usuario no tiene turno asignado
   * @private
   */
  static _calculateWorkingDaysFallback(startDate, endDate) {
    let count = 0;
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // 0 = Domingo, 6 = Sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  /**
   * Calcular scoring de puntualidad (0-100)
   * Fórmula: % de llegadas a tiempo en los últimos 90 días
   * @private
   */
  static _calculatePunctualityScore(metrics) {
    if (metrics.presentDays === 0) return 100; // Sin datos = perfecto por defecto

    const onTimeDays = metrics.presentDays - metrics.lateArrivalsCount;
    const punctualityRate = (onTimeDays / metrics.presentDays) * 100;

    return Math.max(0, Math.min(100, punctualityRate));
  }

  /**
   * Calcular scoring de ausencias (0-100)
   * Fórmula: 100 - (ausencias / días_laborables * 100)
   * @private
   */
  static _calculateAbsenceScore(metrics) {
    if (metrics.totalDays === 0) return 100;

    const absenceRate = (metrics.absentDays / metrics.totalDays) * 100;
    const score = 100 - absenceRate;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcular scoring de llegadas tarde (0-100)
   * Fórmula: Penalización de 0.5 puntos por cada llegada tarde
   * @private
   */
  static _calculateLateArrivalScore(metrics) {
    const penalty = metrics.lateArrivalsCount * 0.5;
    const score = 100 - penalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcular scoring de salidas anticipadas (0-100)
   * Fórmula: Penalización de 0.3 puntos por cada salida anticipada
   * @private
   */
  static _calculateEarlyDepartureScore(metrics) {
    const penalty = metrics.earlyDeparturesCount * 0.3;
    const score = 100 - penalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcular scoring total (fórmula ponderada)
   * @private
   */
  static _calculateTotalScore(components) {
    const total =
      (components.punctuality * 0.40) +
      (components.absence * 0.30) +
      (components.lateArrival * 0.20) +
      (components.earlyDeparture * 0.10);

    return Math.max(0, Math.min(100, total));
  }

  /**
   * Determinar categoría de perfil basado en scoring total
   * @private
   */
  static _determineProfileCategory(scoringTotal) {
    if (scoringTotal >= 90) return 'Ejemplar';
    if (scoringTotal >= 75) return 'Promedio Alto';
    if (scoringTotal >= 60) return 'Promedio';
    if (scoringTotal >= 40) return 'Necesita Mejora';
    return 'Problemático';
  }

  /**
   * Recalcular scoring para todos los empleados de una empresa
   * @param {Integer} companyId - ID de la empresa
   * @returns {Object} - Resumen de recalculación
   */
  static async recalculateCompanyScoring(companyId) {
    try {
      console.log(`🏢 [SCORING] Recalculando scoring para empresa ${companyId}`);

      // Obtener todos los usuarios activos de la empresa
      const users = await User.findAll({
        where: {
          company_id: companyId,
          status: 'active'
        },
        attributes: ['user_id', 'firstName', 'lastName', 'employee_id']
      });

      console.log(`   👥 Usuarios a procesar: ${users.length}`);

      const results = {
        success: [],
        errors: [],
        total: users.length,
        processed: 0
      };

      // Procesar en batch para no sobrecargar
      for (const user of users) {
        try {
          await this.calculateUserScoring(user.user_id, companyId);
          results.success.push(user.user_id);
          results.processed++;
        } catch (error) {
          console.error(`   ❌ Error procesando ${user.firstName} ${user.lastName}:`, error.message);
          results.errors.push({
            userId: user.user_id,
            name: `${user.firstName} ${user.lastName}`,
            error: error.message
          });
        }
      }

      console.log(`   ✅ Recalculación completada: ${results.success.length}/${results.total} exitosos`);

      return results;

    } catch (error) {
      console.error(`❌ [SCORING] Error recalculando empresa:`, error);
      throw error;
    }
  }

  /**
   * Obtener resumen de scoring de una empresa
   * @param {Integer} companyId - ID de la empresa
   * @returns {Object} - Estadísticas agregadas
   */
  static async getCompanyScoringStats(companyId) {
    try {
      const stats = await AttendanceProfile.findOne({
        where: { company_id: companyId },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('scoring_total')), 'avg_total'],
          [sequelize.fn('MIN', sequelize.col('scoring_total')), 'min_total'],
          [sequelize.fn('MAX', sequelize.col('scoring_total')), 'max_total'],
          [sequelize.fn('AVG', sequelize.col('scoring_punctuality')), 'avg_punctuality'],
          [sequelize.fn('AVG', sequelize.col('scoring_absence')), 'avg_absence'],
          [sequelize.fn('AVG', sequelize.col('scoring_late_arrival')), 'avg_late_arrival'],
          [sequelize.fn('AVG', sequelize.col('scoring_early_departure')), 'avg_early_departure'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_employees']
        ],
        raw: true
      });

      // Distribución por categorías
      const distribution = await AttendanceProfile.findAll({
        where: { company_id: companyId },
        attributes: [
          'profile_category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['profile_category'],
        raw: true
      });

      return {
        averages: {
          total: parseFloat(stats.avg_total || 0).toFixed(2),
          punctuality: parseFloat(stats.avg_punctuality || 0).toFixed(2),
          absence: parseFloat(stats.avg_absence || 0).toFixed(2),
          lateArrival: parseFloat(stats.avg_late_arrival || 0).toFixed(2),
          earlyDeparture: parseFloat(stats.avg_early_departure || 0).toFixed(2)
        },
        range: {
          min: parseFloat(stats.min_total || 0).toFixed(2),
          max: parseFloat(stats.max_total || 0).toFixed(2)
        },
        totalEmployees: parseInt(stats.total_employees || 0),
        distribution: distribution.reduce((acc, item) => {
          acc[item.profile_category] = parseInt(item.count);
          return acc;
        }, {})
      };

    } catch (error) {
      console.error(`❌ [SCORING] Error obteniendo stats:`, error);
      throw error;
    }
  }
}

module.exports = AttendanceScoringEngine;
