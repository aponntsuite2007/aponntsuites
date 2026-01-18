/**
 * 📅 USER CALENDAR ROUTES - Calendario Personal del Empleado
 *
 * Endpoints para obtener calendario visual de trabajo del usuario
 * mostrando días de trabajo, descansos, asistencias, faltas y tardanzas
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ShiftCalculatorService = require('../services/ShiftCalculatorService');
const { Attendance, User, Shift, UserShiftAssignment } = require('../config/database');
const { Op } = require('sequelize');

/**
 * GET /api/v1/users/:userId/calendar
 *
 * Obtiene calendario personal del usuario con:
 * - Días de trabajo según su turno rotativo
 * - Días de descanso/franco
 * - Asistencias registradas
 * - Faltas (días que debía trabajar pero no asistió)
 * - Tardanzas
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD) - default: inicio del mes actual
 * - endDate: Fecha fin (YYYY-MM-DD) - default: fin del mes actual
 * - month: Mes (1-12) - opcional
 * - year: Año (YYYY) - opcional
 */
router.get('/:userId/calendar', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    let { startDate, endDate, month, year } = req.query;

    console.log('📅 [USER-CALENDAR] Request:', { userId, startDate, endDate, month, year });

    // Si se especifica mes/año, generar rango del mes
    if (month && year) {
      const monthNum = parseInt(month) - 1; // JavaScript months are 0-indexed
      const yearNum = parseInt(year);
      const firstDay = new Date(yearNum, monthNum, 1);
      const lastDay = new Date(yearNum, monthNum + 1, 0);

      startDate = firstDay.toISOString().split('T')[0];
      endDate = lastDay.toISOString().split('T')[0];
    }

    // Default: mes actual
    if (!startDate || !endDate) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      startDate = firstDay.toISOString().split('T')[0];
      endDate = lastDay.toISOString().split('T')[0];
    }

    // Verificar usuario
    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ['user_id', 'firstName', 'lastName', 'usuario', 'legajo', 'company_id']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar permisos (solo puede ver su propio calendario o admins)
    if (req.user.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para ver este calendario'
      });
    }

    // Multi-tenant: verificar mismo company_id
    if (user.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para ver este calendario'
      });
    }

    // ========================================
    // 1. GENERAR CALENDARIO DE TURNOS ESPERADOS
    // ========================================

    console.log('🔄 [USER-CALENDAR] Generando calendario con ShiftCalculatorService...');

    const shiftCalendar = await ShiftCalculatorService.generateUserCalendar(
      userId,
      startDate,
      endDate
    );

    console.log(`✅ [USER-CALENDAR] Calendario generado: ${shiftCalendar.length} días`);

    // ========================================
    // 2. OBTENER ASISTENCIAS REGISTRADAS EN ESTE RANGO
    // ========================================

    const attendances = await Attendance.findAll({
      where: {
        user_id: userId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['date', 'status', 'check_in', 'check_out', 'workingHours', 'notes'],
      order: [['date', 'ASC']]
    });

    console.log(`✅ [USER-CALENDAR] Asistencias encontradas: ${attendances.length}`);

    // Crear mapa de asistencias por fecha para lookup rápido
    const attendanceMap = {};
    attendances.forEach(att => {
      attendanceMap[att.date] = att;
    });

    // ========================================
    // 3. COMBINAR CALENDARIO CON ASISTENCIAS
    // ========================================

    const calendar = shiftCalendar.map(day => {
      const dateKey = day.date;
      const attendance = attendanceMap[dateKey];

      // Determinar el estado del día
      let dayStatus = 'scheduled'; // Por defecto: día programado (futuro)
      let statusColor = 'blue';
      let statusLabel = 'Programado';

      const today = new Date().toISOString().split('T')[0];
      const isPast = dateKey < today;
      const isToday = dateKey === today;

      if (day.shouldWork) {
        // Día que DEBÍA trabajar
        if (attendance) {
          // Asistió
          if (attendance.status === 'late') {
            dayStatus = 'late';
            statusColor = 'orange';
            statusLabel = 'Llegó Tarde';
          } else if (attendance.status === 'present') {
            dayStatus = 'present';
            statusColor = 'green';
            statusLabel = 'Asistió';
          } else if (attendance.status === 'absent') {
            dayStatus = 'absent';
            statusColor = 'red';
            statusLabel = 'Falta';
          }
        } else if (isPast) {
          // Día pasado sin registro = falta
          dayStatus = 'absent';
          statusColor = 'red';
          statusLabel = 'Falta';
        } else if (isToday) {
          dayStatus = 'today';
          statusColor = 'yellow';
          statusLabel = 'Hoy';
        } else {
          // Futuro
          dayStatus = 'scheduled';
          statusColor = 'blue';
          statusLabel = 'Programado';
        }
      } else {
        // Día de descanso/franco
        dayStatus = 'rest';
        statusColor = 'gray';
        statusLabel = 'Descanso';
      }

      return {
        date: dateKey,
        dayOfWeek: new Date(dateKey).getDay(),
        dayOfMonth: new Date(dateKey).getDate(),

        // Información del turno
        shouldWork: day.shouldWork,
        shift: day.shift,
        assignment: day.assignment,
        isRotative: day.isRotative,
        phase: day.userAssignedPhase,
        groupName: day.userGroupName,

        // Estado visual
        status: dayStatus,
        statusColor: statusColor,
        statusLabel: statusLabel,

        // Asistencia (si existe)
        attendance: attendance ? {
          check_in: attendance.check_in,
          check_out: attendance.check_out,
          workingHours: attendance.workingHours,
          isLate: attendance.status === 'late',
          notes: attendance.notes
        } : null,

        // Metadata adicional
        isPast: isPast,
        isToday: isToday,
        isFuture: !isPast && !isToday
      };
    });

    // ========================================
    // 4. CALCULAR ESTADÍSTICAS DEL PERÍODO
    // ========================================

    const stats = {
      totalDays: calendar.length,
      workDays: calendar.filter(d => d.shouldWork).length,
      restDays: calendar.filter(d => !d.shouldWork).length,

      // Solo días pasados
      pastWorkDays: calendar.filter(d => d.shouldWork && d.isPast).length,
      attended: calendar.filter(d => d.status === 'present').length,
      late: calendar.filter(d => d.status === 'late').length,
      absent: calendar.filter(d => d.status === 'absent').length,

      // Futuros
      scheduledDays: calendar.filter(d => d.status === 'scheduled').length
    };

    // Porcentajes (sobre días trabajados pasados)
    if (stats.pastWorkDays > 0) {
      stats.attendanceRate = ((stats.attended / stats.pastWorkDays) * 100).toFixed(1);
      stats.lateRate = ((stats.late / stats.pastWorkDays) * 100).toFixed(1);
      stats.absenceRate = ((stats.absent / stats.pastWorkDays) * 100).toFixed(1);
    } else {
      stats.attendanceRate = 0;
      stats.lateRate = 0;
      stats.absenceRate = 0;
    }

    // ========================================
    // 5. OBTENER INFO DEL TURNO ACTUAL
    // ========================================

    const currentAssignment = await UserShiftAssignment.findOne({
      where: {
        user_id: userId,
        is_active: true
      },
      include: [{
        model: Shift,
        as: 'shift',
        attributes: ['id', 'name', 'shiftType', 'startTime', 'endTime', 'phases', 'global_cycle_start_date']
      }],
      order: [['join_date', 'DESC']]
    });

    // ========================================
    // RESPUESTA FINAL
    // ========================================

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        nombre: user.nombre,
        apellido: user.apellido,
        usuario: user.usuario,
        legajo: user.legajo
      },
      currentShift: currentAssignment ? {
        shift: currentAssignment.shift,
        assigned_phase: currentAssignment.assigned_phase,
        group_name: currentAssignment.group_name,
        sector: currentAssignment.sector,
        join_date: currentAssignment.join_date
      } : null,
      period: {
        startDate,
        endDate,
        totalDays: calendar.length
      },
      calendar: calendar,
      stats: stats
    });

  } catch (error) {
    console.error('❌ [USER-CALENDAR] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar calendario del usuario',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/users/:userId/calendar/summary
 *
 * Resumen rápido del calendario del usuario (sin día por día)
 * Útil para widgets y dashboards
 */
router.get('/:userId/calendar/summary', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    // Calcular rango del mes
    const monthNum = month ? parseInt(month) - 1 : new Date().getMonth();
    const yearNum = year ? parseInt(year) : new Date().getFullYear();
    const firstDay = new Date(yearNum, monthNum, 1);
    const lastDay = new Date(yearNum, monthNum + 1, 0);

    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    // Verificar usuario y permisos
    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ['user_id', 'company_id']
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (user.company_id !== req.user.company_id) {
      return res.status(403).json({ success: false, error: 'No tiene permisos' });
    }

    // Generar calendario
    const shiftCalendar = await ShiftCalculatorService.generateUserCalendar(userId, startDate, endDate);

    // Obtener asistencias
    const attendances = await Attendance.findAll({
      where: {
        user_id: userId,
        date: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['date', 'status']
    });

    const attendanceMap = {};
    attendances.forEach(att => {
      attendanceMap[att.date] = att;
    });

    // Calcular stats
    const today = new Date().toISOString().split('T')[0];
    const workDays = shiftCalendar.filter(d => d.shouldWork);
    const pastWorkDays = workDays.filter(d => d.date < today);

    let attended = 0;
    let late = 0;
    let absent = 0;

    pastWorkDays.forEach(day => {
      const att = attendanceMap[day.date];
      if (att) {
        if (att.status === 'late') {
          late++;
        } else if (att.status === 'present') {
          attended++;
        }
      } else {
        absent++;
      }
    });

    const stats = {
      month: monthNum + 1,
      year: yearNum,
      totalDays: shiftCalendar.length,
      workDays: workDays.length,
      restDays: shiftCalendar.filter(d => !d.shouldWork).length,
      pastWorkDays: pastWorkDays.length,
      attended,
      late,
      absent,
      attendanceRate: pastWorkDays.length > 0 ? ((attended / pastWorkDays.length) * 100).toFixed(1) : 0,
      lateRate: pastWorkDays.length > 0 ? ((late / pastWorkDays.length) * 100).toFixed(1) : 0,
      absenceRate: pastWorkDays.length > 0 ? ((absent / pastWorkDays.length) * 100).toFixed(1) : 0
    };

    res.json({
      success: true,
      summary: stats
    });

  } catch (error) {
    console.error('❌ [USER-CALENDAR-SUMMARY] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar resumen',
      message: error.message
    });
  }
});

module.exports = router;
