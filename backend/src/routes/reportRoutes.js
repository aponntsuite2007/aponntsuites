const express = require('express');
const router = express.Router();
const { Attendance, User, Branch, Shift } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');
const { Op } = require('sequelize');

/**
 * @route GET /api/v1/reports/attendance
 * @desc Generar reporte de asistencias
 */
router.get('/attendance', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      branchId,
      userId,
      format = 'json'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Fechas de inicio y fin son requeridas'
      });
    }

    const where = {
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (branchId) where.BranchId = branchId;
    if (userId) where.UserId = userId;

    const attendances = await Attendance.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['legajo', 'firstName', 'lastName', 'email']
        },
        {
          model: Branch,
          attributes: ['name', 'code']
        }
      ],
      order: [['date', 'DESC'], ['checkInTime', 'DESC']]
    });

    if (format === 'excel') {
      return await generateAttendanceExcel(attendances, res, { startDate, endDate });
    }

    // Calcular totales
    const summary = {
      totalRecords: attendances.length,
      presentCount: attendances.filter(a => a.status === 'present').length,
      lateCount: attendances.filter(a => a.status === 'late').length,
      absentCount: attendances.filter(a => a.status === 'absent').length,
      totalWorkingHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      totalOvertimeHours: attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0)
    };

    res.json({
      summary,
      attendances,
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/reports/users-summary
 * @desc Reporte resumen por usuario
 */
router.get('/users-summary', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      branchId,
      format = 'json'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Fechas de inicio y fin son requeridas'
      });
    }

    const whereUser = { isActive: true };
    if (branchId) whereUser.defaultBranchId = branchId;

    const users = await User.findAll({
      where: whereUser,
      attributes: ['id', 'legajo', 'firstName', 'lastName', 'email'],
      include: [{
        model: Branch,
        as: 'defaultBranch',
        attributes: ['name', 'code']
      }]
    });

    const userSummaries = await Promise.all(users.map(async (user) => {
      const attendances = await Attendance.findAll({
        where: {
          UserId: user.user_id,
          date: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      const workingDays = moment(endDate).diff(moment(startDate), 'days') + 1;
      
      return {
        user: {
          id: user.user_id,
          legajo: user.legajo,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          branch: user.defaultBranch?.name
        },
        stats: {
          workingDays,
          attendedDays: attendances.length,
          presentDays: attendances.filter(a => a.status === 'present').length,
          lateDays: attendances.filter(a => a.status === 'late').length,
          totalHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
          overtimeHours: attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
          lateMinutes: attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0),
          attendanceRate: Math.round((attendances.length / workingDays) * 100)
        }
      };
    }));

    if (format === 'excel') {
      return await generateUserSummaryExcel(userSummaries, res, { startDate, endDate });
    }

    res.json({
      period: { startDate, endDate },
      userSummaries
    });

  } catch (error) {
    console.error('Error generando reporte de usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/reports/daily-summary
 * @desc Reporte resumen diario
 */
router.get('/daily-summary', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      branchId
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Fechas de inicio y fin son requeridas'
      });
    }

    const where = {
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (branchId) where.BranchId = branchId;

    // Agrupar por fecha
    const dailyStats = await Attendance.findAll({
      where,
      attributes: [
        'date',
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'totalRecords'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "present" THEN 1 END')), 'presentCount'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "late" THEN 1 END')), 'lateCount'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "absent" THEN 1 END')), 'absentCount'],
        [Attendance.sequelize.fn('SUM', Attendance.sequelize.col('workingHours')), 'totalWorkingHours'],
        [Attendance.sequelize.fn('SUM', Attendance.sequelize.col('overtimeHours')), 'totalOvertimeHours']
      ],
      group: ['date'],
      order: [['date', 'DESC']],
      raw: true
    });

    res.json({
      period: { startDate, endDate },
      dailyStats
    });

  } catch (error) {
    console.error('Error generando reporte diario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    { header: 'Sucursal', key: 'branch', width: 20 },
    { header: 'Entrada', key: 'checkIn', width: 15 },
    { header: 'Salida', key: 'checkOut', width: 15 },
    { header: 'Horas Trabajadas', key: 'workingHours', width: 18 },
    { header: 'Horas Extra', key: 'overtimeHours', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
    { header: 'Minutos de Retraso', key: 'lateMinutes', width: 18 }
  ];

  // Agregar datos
  attendances.forEach(attendance => {
    worksheet.addRow({
      date: moment(attendance.date).format('DD/MM/YYYY'),
      legajo: attendance.User.legajo,
      name: `${attendance.User.firstName} ${attendance.User.lastName}`,
      branch: attendance.Branch?.name || 'N/A',
      checkIn: attendance.checkInTime ? moment(attendance.checkInTime).format('HH:mm') : 'N/A',
      checkOut: attendance.checkOutTime ? moment(attendance.checkOutTime).format('HH:mm') : 'N/A',
      workingHours: attendance.workingHours || 0,
      overtimeHours: attendance.overtimeHours || 0,
      status: attendance.status,
      lateMinutes: attendance.lateMinutes || 0
    });
  });

  // Estilo del header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

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
    { header: 'Sucursal', key: 'branch', width: 20 },
    { header: 'Días Laborales', key: 'workingDays', width: 15 },
    { header: 'Días Asistidos', key: 'attendedDays', width: 15 },
    { header: 'Días Puntuales', key: 'presentDays', width: 15 },
    { header: 'Días Tarde', key: 'lateDays', width: 15 },
    { header: 'Total Horas', key: 'totalHours', width: 15 },
    { header: 'Horas Extra', key: 'overtimeHours', width: 15 },
    { header: '% Asistencia', key: 'attendanceRate', width: 15 }
  ];

  // Agregar datos
  userSummaries.forEach(summary => {
    worksheet.addRow({
      legajo: summary.user.legajo,
      name: summary.user.fullName,
      email: summary.user.email,
      branch: summary.user.branch || 'N/A',
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
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
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