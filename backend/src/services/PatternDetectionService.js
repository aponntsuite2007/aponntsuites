const { Sequelize, Op } = require('sequelize');
const { sequelize, AttendancePattern, Attendance, User, AttendanceProfile } = require('../config/database');

/**
 * PatternDetectionService
 *
 * Motor de detección de patrones de comportamiento en asistencia
 *
 * Detecta 15+ patrones categorizados:
 * - Negative (9): tolerance_abuser, last_in_first_out, friday_absentee, etc.
 * - Positive (3): consistent_excellence, overtime_hero, improving_trend
 * - Neutral (3): weekend_overtime, night_shift_stable, flexible_hours
 */
class PatternDetectionService {

  /**
   * Detectar todos los patrones para un usuario
   * @param {UUID} userId - ID del usuario
   * @param {Integer} companyId - ID de la empresa
   * @returns {Array} - Patrones detectados
   */
  static async detectUserPatterns(userId, companyId) {
    try {
      console.log(`🔍 [PATTERNS] Detectando patrones para user ${userId} en company ${companyId}`);

      // Período de análisis: últimos 90 días
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      // Obtener asistencias del período
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

      if (attendances.length === 0) {
        console.log(`   ⚠️  Sin datos de asistencias, no se detectan patrones`);
        return [];
      }

      const detectedPatterns = [];

      // ========== NEGATIVE PATTERNS (9) ==========

      // 1. Tolerance Abuser
      const toleranceAbuserPattern = await this._detectToleranceAbuser(attendances);
      if (toleranceAbuserPattern) detectedPatterns.push(toleranceAbuserPattern);

      // 2. Last In, First Out
      const lastInFirstOutPattern = await this._detectLastInFirstOut(attendances);
      if (lastInFirstOutPattern) detectedPatterns.push(lastInFirstOutPattern);

      // 3. Friday Absentee
      const fridayAbsenteePattern = await this._detectFridayAbsentee(attendances, startDate, endDate);
      if (fridayAbsenteePattern) detectedPatterns.push(fridayAbsenteePattern);

      // 4. Monday Absentee
      const mondayAbsenteePattern = await this._detectMondayAbsentee(attendances, startDate, endDate);
      if (mondayAbsenteePattern) detectedPatterns.push(mondayAbsenteePattern);

      // 5. Late Arrival Streak
      const lateArrivalStreakPattern = await this._detectLateArrivalStreak(attendances);
      if (lateArrivalStreakPattern) detectedPatterns.push(lateArrivalStreakPattern);

      // 6. Absence Spike
      const absenceSpikePattern = await this._detectAbsenceSpike(attendances, userId, companyId);
      if (absenceSpikePattern) detectedPatterns.push(absenceSpikePattern);

      // 7. Early Departure Habit
      const earlyDepartureHabitPattern = await this._detectEarlyDepartureHabit(attendances);
      if (earlyDepartureHabitPattern) detectedPatterns.push(earlyDepartureHabitPattern);

      // 8. Location Outlier
      const locationOutlierPattern = await this._detectLocationOutlier(attendances);
      if (locationOutlierPattern) detectedPatterns.push(locationOutlierPattern);

      // 9. Seasonal Pattern
      const seasonalPattern = await this._detectSeasonalPattern(attendances);
      if (seasonalPattern) detectedPatterns.push(seasonalPattern);

      // ========== POSITIVE PATTERNS (3) ==========

      // 10. Consistent Excellence
      const consistentExcellencePattern = await this._detectConsistentExcellence(userId, companyId);
      if (consistentExcellencePattern) detectedPatterns.push(consistentExcellencePattern);

      // 11. Overtime Hero
      const overtimeHeroPattern = await this._detectOvertimeHero(attendances);
      if (overtimeHeroPattern) detectedPatterns.push(overtimeHeroPattern);

      // 12. Improving Trend
      const improvingTrendPattern = await this._detectImprovingTrend(userId, companyId);
      if (improvingTrendPattern) detectedPatterns.push(improvingTrendPattern);

      // ========== NEUTRAL PATTERNS (3) ==========

      // 13. Weekend Overtime
      const weekendOvertimePattern = await this._detectWeekendOvertime(attendances);
      if (weekendOvertimePattern) detectedPatterns.push(weekendOvertimePattern);

      // 14. Night Shift Stable
      const nightShiftStablePattern = await this._detectNightShiftStable(attendances);
      if (nightShiftStablePattern) detectedPatterns.push(nightShiftStablePattern);

      // 15. Flexible Hours
      const flexibleHoursPattern = await this._detectFlexibleHours(attendances);
      if (flexibleHoursPattern) detectedPatterns.push(flexibleHoursPattern);

      console.log(`   ✅ Patrones detectados: ${detectedPatterns.length}`);
      detectedPatterns.forEach(p => {
        console.log(`      ${p.category === 'negative' ? '⚠️' : p.category === 'positive' ? '✨' : 'ℹ️'} ${p.pattern_name} (${p.severity})`);
      });

      // Guardar patrones detectados en BD
      await this._savePatterns(userId, companyId, detectedPatterns, startDate, endDate);

      return detectedPatterns;

    } catch (error) {
      console.error(`❌ [PATTERNS] Error detectando patrones:`, error);
      throw error;
    }
  }

  // ========================================================================
  // NEGATIVE PATTERNS DETECTION
  // ========================================================================

  /**
   * Patrón: Tolerance Abuser
   * Detecta si usa los minutos de tolerancia cada vez que puede (>60% de días)
   * @private
   */
  static async _detectToleranceAbuser(attendances) {
    const lateWithinTolerance = attendances.filter(att =>
      att.late_arrival_minutes > 0 && att.late_arrival_minutes <= 10
    );

    const lateTotal = attendances.filter(att => att.late_arrival_minutes > 0);

    if (lateTotal.length === 0) return null;

    const toleranceUsageRate = (lateWithinTolerance.length / attendances.length) * 100;

    if (toleranceUsageRate > 60) {
      return {
        pattern_id: 'tolerance_abuser',
        pattern_name: 'Abusador de Tolerancia',
        pattern_category: 'negative',
        severity: 'medium',
        confidence_score: Math.min(95, 60 + (toleranceUsageRate - 60)),
        occurrences_count: lateWithinTolerance.length,
        threshold_value: 60,
        actual_value: toleranceUsageRate,
        scoring_impact: -8,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Last In, First Out
   * Detecta si tiende a ser el último en entrar y primero en salir
   * @private
   */
  static async _detectLastInFirstOut(attendances) {
    const withCheckIn = attendances.filter(att => att.check_in_time);
    const withCheckOut = attendances.filter(att => att.check_out_time);

    if (withCheckIn.length < 10) return null; // Necesita muestra mínima

    const lateDays = withCheckIn.filter(att => att.late_arrival_minutes > 5).length;
    const earlyDepartureDays = withCheckOut.filter(att => att.early_departure_minutes > 5).length;

    const lateRate = (lateDays / withCheckIn.length) * 100;
    const earlyRate = (earlyDepartureDays / withCheckOut.length) * 100;

    if (lateRate > 50 && earlyRate > 50) {
      return {
        pattern_id: 'last_in_first_out',
        pattern_name: 'Último en Entrar, Primero en Salir',
        pattern_category: 'negative',
        severity: 'high',
        confidence_score: Math.min(95, 50 + ((lateRate + earlyRate) / 2 - 50)),
        occurrences_count: lateDays + earlyDepartureDays,
        threshold_value: 50,
        actual_value: (lateRate + earlyRate) / 2,
        scoring_impact: -5,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Friday Absentee
   * Detecta tendencia a faltar los viernes
   * @private
   */
  static async _detectFridayAbsentee(attendances, startDate, endDate) {
    const fridays = this._getFridaysBetween(startDate, endDate);
    const attendanceDates = attendances.map(att => att.attendance_date.toISOString().split('T')[0]);

    const missedFridays = fridays.filter(friday => !attendanceDates.includes(friday));
    const fridayAbsenceRate = (missedFridays.length / fridays.length) * 100;

    if (fridayAbsenceRate > 30) {
      return {
        pattern_id: 'friday_absentee',
        pattern_name: 'Tendencia a Faltar Viernes',
        pattern_category: 'negative',
        severity: 'medium',
        confidence_score: Math.min(95, 30 + (fridayAbsenceRate - 30)),
        occurrences_count: missedFridays.length,
        threshold_value: 30,
        actual_value: fridayAbsenceRate,
        scoring_impact: -6,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Monday Absentee
   * Detecta tendencia a faltar los lunes
   * @private
   */
  static async _detectMondayAbsentee(attendances, startDate, endDate) {
    const mondays = this._getMondaysBetween(startDate, endDate);
    const attendanceDates = attendances.map(att => att.attendance_date.toISOString().split('T')[0]);

    const missedMondays = mondays.filter(monday => !attendanceDates.includes(monday));
    const mondayAbsenceRate = (missedMondays.length / mondays.length) * 100;

    if (mondayAbsenceRate > 30) {
      return {
        pattern_id: 'monday_absentee',
        pattern_name: 'Tendencia a Faltar Lunes',
        pattern_category: 'negative',
        severity: 'medium',
        confidence_score: Math.min(95, 30 + (mondayAbsenceRate - 30)),
        occurrences_count: missedMondays.length,
        threshold_value: 30,
        actual_value: mondayAbsenceRate,
        scoring_impact: -6,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Late Arrival Streak
   * Detecta 3+ llegadas tarde consecutivas
   * @private
   */
  static async _detectLateArrivalStreak(attendances) {
    let maxStreak = 0;
    let currentStreak = 0;

    for (const att of attendances) {
      if (att.late_arrival_minutes && att.late_arrival_minutes > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    if (maxStreak >= 3) {
      return {
        pattern_id: 'late_arrival_streak',
        pattern_name: 'Racha de Llegadas Tarde',
        pattern_category: 'negative',
        severity: maxStreak >= 5 ? 'critical' : 'high',
        confidence_score: 90,
        occurrences_count: maxStreak,
        threshold_value: 3,
        actual_value: maxStreak,
        scoring_impact: -7,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Absence Spike
   * Detecta aumento súbito de ausencias (>50% vs promedio)
   * @private
   */
  static async _detectAbsenceSpike(attendances, userId, companyId) {
    // Dividir período en dos mitades
    const midpoint = Math.floor(attendances.length / 2);
    const firstHalf = attendances.slice(0, midpoint);
    const secondHalf = attendances.slice(midpoint);

    if (firstHalf.length < 10 || secondHalf.length < 10) return null;

    const firstHalfPresent = firstHalf.filter(att => att.check_in_time).length;
    const secondHalfPresent = secondHalf.filter(att => att.check_in_time).length;

    const firstHalfAbsenceRate = ((firstHalf.length - firstHalfPresent) / firstHalf.length) * 100;
    const secondHalfAbsenceRate = ((secondHalf.length - secondHalfPresent) / secondHalf.length) * 100;

    const increase = secondHalfAbsenceRate - firstHalfAbsenceRate;

    if (increase > 50) {
      return {
        pattern_id: 'absence_spike',
        pattern_name: 'Pico de Ausencias Recientes',
        pattern_category: 'negative',
        severity: 'critical',
        confidence_score: 85,
        occurrences_count: secondHalf.length - secondHalfPresent,
        threshold_value: 50,
        actual_value: increase,
        scoring_impact: -10,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Early Departure Habit
   * Detecta si sale antes >30% de los días
   * @private
   */
  static async _detectEarlyDepartureHabit(attendances) {
    const withCheckOut = attendances.filter(att => att.check_out_time);
    if (withCheckOut.length < 10) return null;

    const earlyDepartures = withCheckOut.filter(att => att.early_departure_minutes > 5);
    const earlyDepartureRate = (earlyDepartures.length / withCheckOut.length) * 100;

    if (earlyDepartureRate > 30) {
      return {
        pattern_id: 'early_departure_habit',
        pattern_name: 'Hábito de Salidas Anticipadas',
        pattern_category: 'negative',
        severity: 'medium',
        confidence_score: Math.min(95, 30 + (earlyDepartureRate - 30)),
        occurrences_count: earlyDepartures.length,
        threshold_value: 30,
        actual_value: earlyDepartureRate,
        scoring_impact: -4,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Location Outlier
   * Detecta fichados fuera de radio permitido (>20%)
   * @private
   */
  static async _detectLocationOutlier(attendances) {
    const withLocation = attendances.filter(att => att.location_status);
    if (withLocation.length < 10) return null;

    const outsideRadius = withLocation.filter(att => att.location_status === 'outside_radius');
    const outlierRate = (outsideRadius.length / withLocation.length) * 100;

    if (outlierRate > 20) {
      return {
        pattern_id: 'location_outlier',
        pattern_name: 'Fichados Fuera de Ubicación',
        pattern_category: 'negative',
        severity: 'high',
        confidence_score: 85,
        occurrences_count: outsideRadius.length,
        threshold_value: 20,
        actual_value: outlierRate,
        scoring_impact: -8,
        requires_action: true
      };
    }

    return null;
  }

  /**
   * Patrón: Seasonal Pattern
   * Detecta picos de ausencias en meses específicos
   * @private
   */
  static async _detectSeasonalPattern(attendances) {
    // Agrupar por mes
    const monthlyAbsences = {};

    for (let month = 0; month < 12; month++) {
      monthlyAbsences[month] = { total: 0, absent: 0 };
    }

    attendances.forEach(att => {
      const month = att.attendance_date.getMonth();
      monthlyAbsences[month].total++;
      if (!att.check_in_time) {
        monthlyAbsences[month].absent++;
      }
    });

    // Buscar mes con tasa de ausencia >50% mayor que promedio
    const avgAbsenceRate = Object.values(monthlyAbsences)
      .filter(m => m.total > 0)
      .reduce((sum, m) => sum + (m.absent / m.total), 0) / 12;

    for (const [month, data] of Object.entries(monthlyAbsences)) {
      if (data.total > 0) {
        const monthRate = data.absent / data.total;
        if (monthRate > avgAbsenceRate * 1.5) {
          return {
            pattern_id: 'seasonal_pattern',
            pattern_name: `Pico de Ausencias en ${this._getMonthName(parseInt(month))}`,
            pattern_category: 'negative',
            severity: 'low',
            confidence_score: 70,
            occurrences_count: data.absent,
            threshold_value: avgAbsenceRate * 1.5,
            actual_value: monthRate,
            scoring_impact: -3,
            requires_action: false
          };
        }
      }
    }

    return null;
  }

  // ========================================================================
  // POSITIVE PATTERNS DETECTION
  // ========================================================================

  /**
   * Patrón: Consistent Excellence
   * Detecta scoring >95 por 30+ días consecutivos
   * @private
   */
  static async _detectConsistentExcellence(userId, companyId) {
    const profile = await AttendanceProfile.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    if (!profile) return null;

    if (profile.scoring_total >= 95 && profile.total_days >= 30) {
      return {
        pattern_id: 'consistent_excellence',
        pattern_name: 'Excelencia Consistente',
        pattern_category: 'positive',
        severity: 'low',
        confidence_score: 95,
        occurrences_count: profile.total_days,
        threshold_value: 95,
        actual_value: parseFloat(profile.scoring_total),
        scoring_impact: 15,
        requires_action: false
      };
    }

    return null;
  }

  /**
   * Patrón: Overtime Hero
   * Detecta horas extras >15% del total de horas
   * @private
   */
  static async _detectOvertimeHero(attendances) {
    const totalOvertimeHours = attendances.reduce((sum, att) =>
      sum + (parseFloat(att.overtime_hours) || 0), 0
    );

    const totalWorkHours = attendances.reduce((sum, att) =>
      sum + (parseFloat(att.worked_hours) || 8), 0
    );

    if (totalWorkHours === 0) return null;

    const overtimeRate = (totalOvertimeHours / totalWorkHours) * 100;

    if (overtimeRate > 15) {
      return {
        pattern_id: 'overtime_hero',
        pattern_name: 'Héroe de Horas Extras',
        pattern_category: 'positive',
        severity: 'low',
        confidence_score: 85,
        occurrences_count: Math.floor(totalOvertimeHours),
        threshold_value: 15,
        actual_value: overtimeRate,
        scoring_impact: 10,
        requires_action: false
      };
    }

    return null;
  }

  /**
   * Patrón: Improving Trend
   * Detecta scoring que subió >10 puntos en 30 días
   * @private
   */
  static async _detectImprovingTrend(userId, companyId) {
    // Buscar el scoring actual y el de hace 30 días en ScoringHistory
    const { ScoringHistory } = require('../config/database');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const currentProfile = await AttendanceProfile.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    const oldScore = await ScoringHistory.findOne({
      where: {
        user_id: userId,
        company_id: companyId,
        snapshot_date: { [Op.lte]: thirtyDaysAgo }
      },
      order: [['snapshot_date', 'DESC']]
    });

    if (!currentProfile || !oldScore) return null;

    const improvement = parseFloat(currentProfile.scoring_total) - parseFloat(oldScore.scoring_total);

    if (improvement > 10) {
      return {
        pattern_id: 'improving_trend',
        pattern_name: 'Tendencia de Mejora',
        pattern_category: 'positive',
        severity: 'low',
        confidence_score: 80,
        occurrences_count: 1,
        threshold_value: 10,
        actual_value: improvement,
        scoring_impact: 12,
        requires_action: false
      };
    }

    return null;
  }

  // ========================================================================
  // NEUTRAL PATTERNS DETECTION
  // ========================================================================

  /**
   * Patrón: Weekend Overtime
   * Detecta trabajo frecuente en fines de semana
   * @private
   */
  static async _detectWeekendOvertime(attendances) {
    const weekendDays = attendances.filter(att => {
      const dayOfWeek = att.attendance_date.getDay();
      return (dayOfWeek === 0 || dayOfWeek === 6) && att.check_in_time;
    });

    if (weekendDays.length > 8) { // >2 fines de semana por mes
      return {
        pattern_id: 'weekend_overtime',
        pattern_name: 'Trabajo en Fines de Semana',
        pattern_category: 'neutral',
        severity: 'low',
        confidence_score: 75,
        occurrences_count: weekendDays.length,
        threshold_value: 8,
        actual_value: weekendDays.length,
        scoring_impact: 0,
        requires_action: false
      };
    }

    return null;
  }

  /**
   * Patrón: Night Shift Stable
   * Detecta buen cumplimiento de horarios nocturnos
   * @private
   */
  static async _detectNightShiftStable(attendances) {
    const nightShiftDays = attendances.filter(att => {
      if (!att.check_in_time) return false;
      const hour = new Date(att.check_in_time).getHours();
      return hour >= 22 || hour <= 6;
    });

    if (nightShiftDays.length > 20) {
      const lateDays = nightShiftDays.filter(att => att.late_arrival_minutes > 5);
      const punctualityRate = ((nightShiftDays.length - lateDays.length) / nightShiftDays.length) * 100;

      if (punctualityRate > 80) {
        return {
          pattern_id: 'night_shift_stable',
          pattern_name: 'Estable en Turno Noche',
          pattern_category: 'neutral',
          severity: 'low',
          confidence_score: 80,
          occurrences_count: nightShiftDays.length,
          threshold_value: 80,
          actual_value: punctualityRate,
          scoring_impact: 5,
          requires_action: false
        };
      }
    }

    return null;
  }

  /**
   * Patrón: Flexible Hours
   * Detecta horarios irregulares pero cumple mínimo
   * @private
   */
  static async _detectFlexibleHours(attendances) {
    const withCheckIn = attendances.filter(att => att.check_in_time);
    if (withCheckIn.length < 10) return null;

    // Calcular varianza en hora de entrada
    const checkInHours = withCheckIn.map(att => new Date(att.check_in_time).getHours());
    const avgHour = checkInHours.reduce((sum, h) => sum + h, 0) / checkInHours.length;
    const variance = checkInHours.reduce((sum, h) => sum + Math.pow(h - avgHour, 2), 0) / checkInHours.length;

    // Varianza alta pero cumple horas mínimas
    if (variance > 2) {
      const avgWorkedHours = attendances.reduce((sum, att) =>
        sum + (parseFloat(att.worked_hours) || 0), 0
      ) / attendances.length;

      if (avgWorkedHours >= 8) {
        return {
          pattern_id: 'flexible_hours',
          pattern_name: 'Horarios Flexibles',
          pattern_category: 'neutral',
          severity: 'low',
          confidence_score: 70,
          occurrences_count: withCheckIn.length,
          threshold_value: 2,
          actual_value: variance,
          scoring_impact: 0,
          requires_action: false
        };
      }
    }

    return null;
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Guardar patrones detectados en BD
   * @private
   */
  static async _savePatterns(userId, companyId, patterns, startDate, endDate) {
    try {
      // Marcar patrones anteriores como resueltos
      await AttendancePattern.update(
        { status: 'resolved', resolved_at: new Date() },
        {
          where: {
            user_id: userId,
            company_id: companyId,
            status: 'active'
          }
        }
      );

      // Crear nuevos patrones
      for (const pattern of patterns) {
        await AttendancePattern.create({
          user_id: userId,
          company_id: companyId,
          pattern_id: pattern.pattern_id,
          pattern_name: pattern.pattern_name,
          pattern_category: pattern.pattern_category,
          detection_date: new Date(),
          severity: pattern.severity,
          confidence_score: pattern.confidence_score,
          occurrences_count: pattern.occurrences_count,
          detection_period_start: startDate,
          detection_period_end: endDate,
          threshold_value: pattern.threshold_value,
          actual_value: pattern.actual_value,
          scoring_impact: pattern.scoring_impact,
          requires_action: pattern.requires_action,
          status: 'active'
        });
      }

      console.log(`   💾 ${patterns.length} patrones guardados en BD`);

    } catch (error) {
      console.error(`❌ Error guardando patrones:`, error);
    }
  }

  /**
   * Obtener viernes entre dos fechas
   * @private
   */
  static _getFridaysBetween(startDate, endDate) {
    const fridays = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() === 5) {
        fridays.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    return fridays;
  }

  /**
   * Obtener lunes entre dos fechas
   * @private
   */
  static _getMondaysBetween(startDate, endDate) {
    const mondays = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() === 1) {
        mondays.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    return mondays;
  }

  /**
   * Obtener nombre de mes
   * @private
   */
  static _getMonthName(month) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  }
}

module.exports = PatternDetectionService;
