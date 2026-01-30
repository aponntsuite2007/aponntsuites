const express = require('express');
const router = express.Router();
const { Attendance, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const sequelize = require('../config/database').sequelize;

/**
 * @route GET /api/reports/attendance
 * @desc Generar reporte de asistencias (JSON o Excel)
 */
router.get('/attendance', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      format = 'json'
    } = req.query;

    const companyId = req.user.company_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Fechas de inicio y fin son requeridas'
      });
    }

    // Query directa para evitar problemas de asociaciones
    const [attendances] = await sequelize.query(`
      SELECT
        a.id,
        a.date,
        a."checkInTime",
        a."checkOutTime",
        a."workingHours",
        a.overtime_hours,
        a.status,
        a.is_late,
        a.minutes_late,
        a.is_justified,
        a.absence_type,
        u.user_id,
        u.legajo,
        u."firstName",
        u."lastName",
        u.email,
        d.name as department_name
      FROM attendances a
      LEFT JOIN users u ON a."UserId" = u.user_id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE a.company_id = :companyId
        AND a.date BETWEEN :startDate AND :endDate
        ${userId ? 'AND a."UserId" = :userId' : ''}
      ORDER BY a.date DESC, a."checkInTime" DESC
    `, {
      replacements: { companyId, startDate, endDate, userId }
    });

    if (format === 'excel') {
      return await generateAttendanceExcel(attendances, res, { startDate, endDate });
    }

    // Calcular totales
    const summary = {
      totalRecords: attendances.length,
      presentCount: attendances.filter(a => a.status === 'present').length,
      lateCount: attendances.filter(a => a.status === 'late' || a.is_late).length,
      absentCount: attendances.filter(a => a.status === 'absent').length,
      totalWorkingHours: attendances.reduce((sum, a) => sum + (parseFloat(a.workingHours) || 0), 0),
      totalOvertimeHours: attendances.reduce((sum, a) => sum + (parseFloat(a.overtime_hours) || 0), 0)
    };

    res.json({
      success: true,
      summary,
      data: attendances,
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

/**
 * @route GET /api/reports/user-summary
 * @desc Reporte resumen por usuario
 */
router.get('/user-summary', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    const companyId = req.user.company_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Fechas de inicio y fin son requeridas'
      });
    }

    // Query para obtener resumen por usuario
    const [userSummaries] = await sequelize.query(`
      SELECT
        u.user_id,
        u.legajo,
        u."firstName",
        u."lastName",
        u.email,
        d.name as department_name,
        COUNT(a.id) as attended_days,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'late' OR a.is_late = true THEN 1 END) as late_days,
        COALESCE(SUM(a."workingHours"), 0) as total_hours,
        COALESCE(SUM(a.overtime_hours), 0) as overtime_hours,
        COALESCE(SUM(a.minutes_late), 0) as late_minutes
      FROM users u
      LEFT JOIN attendances a ON a."UserId" = u.user_id
        AND a.date BETWEEN :startDate AND :endDate
        AND a.company_id = :companyId
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.company_id = :companyId
        AND u.is_active = true
      GROUP BY u.user_id, u.legajo, u."firstName", u."lastName", u.email, d.name
      ORDER BY u."lastName", u."firstName"
    `, {
      replacements: { companyId, startDate, endDate }
    });

    const workingDays = moment(endDate).diff(moment(startDate), 'days') + 1;

    const formattedSummaries = userSummaries.map(u => ({
      user: {
        id: u.user_id,
        legajo: u.legajo,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        department: u.department_name
      },
      stats: {
        workingDays,
        attendedDays: parseInt(u.attended_days) || 0,
        presentDays: parseInt(u.present_days) || 0,
        lateDays: parseInt(u.late_days) || 0,
        totalHours: parseFloat(u.total_hours) || 0,
        overtimeHours: parseFloat(u.overtime_hours) || 0,
        lateMinutes: parseInt(u.late_minutes) || 0,
        attendanceRate: workingDays > 0 ? Math.round(((parseInt(u.attended_days) || 0) / workingDays) * 100) : 0
      }
    }));

    if (format === 'excel') {
      return await generateUserSummaryExcel(formattedSummaries, res, { startDate, endDate });
    }

    res.json({
      success: true,
      period: { startDate, endDate },
      data: formattedSummaries
    });

  } catch (error) {
    console.error('Error generando reporte de usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

/**
 * @route GET /api/reports/daily-summary
 * @desc Reporte resumen diario
 */
router.get('/daily-summary', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    const companyId = req.user.company_id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Fechas de inicio y fin son requeridas'
      });
    }

    // Query agrupada por fecha
    const [dailyStats] = await sequelize.query(`
      SELECT
        date,
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'late' OR is_late = true THEN 1 END) as late_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COALESCE(SUM("workingHours"), 0) as total_working_hours,
        COALESCE(SUM(overtime_hours), 0) as total_overtime_hours
      FROM attendances
      WHERE company_id = :companyId
        AND date BETWEEN :startDate AND :endDate
      GROUP BY date
      ORDER BY date DESC
    `, {
      replacements: { companyId, startDate, endDate }
    });

    res.json({
      success: true,
      period: { startDate, endDate },
      data: dailyStats
    });

  } catch (error) {
    console.error('Error generando reporte diario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

/**
 * Generar Excel de asistencias
 */
async function generateAttendanceExcel(attendances, res, period) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Asistencias');

  // Configurar columnas
  worksheet.columns = [
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Legajo', key: 'legajo', width: 15 },
    { header: 'Nombre', key: 'name', width: 25 },
    { header: 'Departamento', key: 'department', width: 20 },
    { header: 'Entrada', key: 'checkIn', width: 15 },
    { header: 'Salida', key: 'checkOut', width: 15 },
    { header: 'Horas Trabajadas', key: 'workingHours', width: 18 },
    { header: 'Horas Extra', key: 'overtimeHours', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
    { header: 'Min. Retraso', key: 'lateMinutes', width: 15 },
    { header: 'Justificado', key: 'justified', width: 12 }
  ];

  // Agregar datos
  attendances.forEach(attendance => {
    worksheet.addRow({
      date: moment(attendance.date).format('DD/MM/YYYY'),
      legajo: attendance.legajo || 'N/A',
      name: attendance.firstName && attendance.lastName
        ? `${attendance.firstName} ${attendance.lastName}`
        : 'N/A',
      department: attendance.department_name || 'N/A',
      checkIn: attendance.checkInTime ? moment(attendance.checkInTime).format('HH:mm') : 'N/A',
      checkOut: attendance.checkOutTime ? moment(attendance.checkOutTime).format('HH:mm') : 'N/A',
      workingHours: parseFloat(attendance.workingHours) || 0,
      overtimeHours: parseFloat(attendance.overtime_hours) || 0,
      status: attendance.status || 'N/A',
      lateMinutes: parseInt(attendance.minutes_late) || 0,
      justified: attendance.is_justified ? 'Sí' : 'No'
    });
  });

  // Estilo del header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Configurar respuesta
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="reporte_asistencias_${period.startDate}_${period.endDate}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Generar Excel de resumen por usuario
 */
async function generateUserSummaryExcel(userSummaries, res, period) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resumen por Usuario');

  // Configurar columnas
  worksheet.columns = [
    { header: 'Legajo', key: 'legajo', width: 15 },
    { header: 'Nombre', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Departamento', key: 'department', width: 20 },
    { header: 'Días Laborales', key: 'workingDays', width: 15 },
    { header: 'Días Asistidos', key: 'attendedDays', width: 15 },
    { header: 'Días Puntuales', key: 'presentDays', width: 15 },
    { header: 'Días Tarde', key: 'lateDays', width: 12 },
    { header: 'Total Horas', key: 'totalHours', width: 12 },
    { header: 'Horas Extra', key: 'overtimeHours', width: 12 },
    { header: '% Asistencia', key: 'attendanceRate', width: 12 }
  ];

  // Agregar datos
  userSummaries.forEach(summary => {
    worksheet.addRow({
      legajo: summary.user.legajo,
      name: summary.user.fullName,
      email: summary.user.email,
      department: summary.user.department || 'N/A',
      workingDays: summary.stats.workingDays,
      attendedDays: summary.stats.attendedDays,
      presentDays: summary.stats.presentDays,
      lateDays: summary.stats.lateDays,
      totalHours: Math.round(summary.stats.totalHours * 100) / 100,
      overtimeHours: Math.round(summary.stats.overtimeHours * 100) / 100,
      attendanceRate: `${summary.stats.attendanceRate}%`
    });
  });

  // Estilo del header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Configurar respuesta
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="resumen_usuarios_${period.startDate}_${period.endDate}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = router;
