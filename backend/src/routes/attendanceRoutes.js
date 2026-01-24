const express = require('express');
const router = express.Router();
const { Attendance, User, Branch, Shift, Department, sequelize } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const moment = require('moment-timezone');
const { Op, QueryTypes } = require('sequelize');

// Importar servicio de notificaciones enterprise
const NotificationWorkflowService = require('../services/NotificationWorkflowService');

// Importar sistema modular Plug & Play
const { useModuleIfAvailable } = require('../utils/moduleHelper');

// Integración NCE - Notificaciones
const AttendanceNotifications = require('../services/integrations/attendance-notifications');

// Importar rutas de estadísticas avanzadas
const advancedStatsRouter = require('./attendance_stats_advanced');

// Importar servicio de cálculo de horas extras
const OvertimeCalculatorService = require('../services/OvertimeCalculatorService');

/**
 * @route POST /api/v1/attendance
 * @desc Crear asistencia manual (entrada/salida completa)
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      user_id,
      date,
      time_in,
      time_out,
      status = 'present'
    } = req.body;

    // Validaciones
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id es requerido'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date es requerida'
      });
    }

    // Verificar que el usuario existe y pertenece a la misma empresa
    const user = await User.findOne({
      where: {
        user_id,
        company_id: req.user.company_id
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o no pertenece a la empresa'
      });
    }

    // Combinar fecha y hora - usar Date objects
    const check_in_datetime = time_in ? new Date(`${date}T${time_in}`) : new Date();
    const check_out_datetime = time_out ? new Date(`${date}T${time_out}`) : null;

    // Crear asistencia
    const attendance = await Attendance.create({
      user_id,
      company_id: req.user.company_id,
      date: date, // Fecha en formato YYYY-MM-DD
      check_in: check_in_datetime, // Date object (NOT NULL)
      check_out: check_out_datetime, // Date object (nullable)
      isManualEntry: true,
      checkInMethod: 'manual',
      notes: `Creado por ${req.user.usuario || req.user.user_id}`
    });

    res.status(201).json({
      success: true,
      message: 'Asistencia creada exitosamente',
      data: attendance
    });

  } catch (error) {
    console.error('❌ Error creando asistencia manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando asistencia',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/attendance/checkin
 * @desc Registrar entrada
 */
router.post('/checkin', auth, async (req, res) => {
  try {
    const {
      method = 'manual',
      location,
      branchId,
      notes
    } = req.body;

    const today = moment().tz(process.env.TIMEZONE).format('YYYY-MM-DD');
    const now = new Date();

    // Verificar si ya existe registro para hoy
    const existingRecord = await Attendance.findOne({
      where: {
        user_id: req.user.user_id,
        date: today
      }
    });

    if (existingRecord && existingRecord.check_in) {
      return res.status(409).json({
        error: 'Ya existe un registro de entrada para hoy'
      });
    }

    // Si no existe registro, crear uno nuevo
    let attendance;
    if (!existingRecord) {
      attendance = await Attendance.create({
        user_id: req.user.user_id,
        date: today,
        check_in: now,
        checkInMethod: method,
        checkInLocation: location,
        kiosk_id: branchId,
        notes,
        isManualEntry: method === 'manual'
      });
    } else {
      // Actualizar registro existente
      attendance = await existingRecord.update({
        check_in: now,
        checkInMethod: method,
        checkInLocation: location,
        kiosk_id: branchId || existingRecord.kiosk_id,
        notes: existingRecord.notes ? `${existingRecord.notes}\n${notes}` : notes,
        isManualEntry: method === 'manual'
      });
    }

    // Calcular estadísticas
    await calculateAttendanceStats(attendance);

    // Obtener el registro completo sin relaciones por ahora
    const fullRecord = await Attendance.findByPk(attendance.id);

    res.status(201).json({
      message: 'Entrada registrada exitosamente',
      attendance: fullRecord
    });

  } catch (error) {
    console.error('Error registrando entrada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/attendance/checkout
 * @desc Registrar salida
 */
router.post('/checkout', auth, async (req, res) => {
  try {
    const {
      method = 'manual',
      location,
      notes
    } = req.body;

    const today = moment().tz(process.env.TIMEZONE).format('YYYY-MM-DD');
    const now = new Date();

    // Buscar registro de hoy
    const attendance = await Attendance.findOne({
      where: {
        user_id: req.user.user_id,
        date: today
      }
    });

    if (!attendance) {
      return res.status(404).json({
        error: 'No existe registro de entrada para hoy'
      });
    }

    if (!attendance.check_in) {
      return res.status(400).json({
        error: 'Debe registrar entrada antes de la salida'
      });
    }

    if (attendance.check_out) {
      return res.status(409).json({
        error: 'Ya existe un registro de salida para hoy'
      });
    }

    // Actualizar con datos de salida
    await attendance.update({
      check_out: now,
      checkOutMethod: method,
      checkOutLocation: location,
      notes: attendance.notes ? `${attendance.notes}\n${notes}` : notes
    });

    // Calcular estadísticas
    await calculateAttendanceStats(attendance);

    // Obtener el registro completo sin relaciones por ahora
    const fullRecord = await Attendance.findByPk(attendance.id);

    res.json({
      message: 'Salida registrada exitosamente',
      attendance: fullRecord
    });

  } catch (error) {
    console.error('Error registrando salida:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/attendance
 * @desc Obtener registros de asistencia
 */
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      userId,
      branchId,
      status,
      absenceType,
      selfView // NUEVO: Para Mi Espacio - fuerza ver solo datos propios
    } = req.query;

    console.log('🔍 [ATTENDANCE] Filtros recibidos:', { page, limit, startDate, endDate, userId, status, absenceType, selfView, companyId: req.user.companyId });

    const where = {};

    // OBLIGATORIO: Filtrar por empresa del usuario autenticado
    if (req.user.companyId) {
      where.company_id = req.user.companyId;
    }

    // selfView=true: Usuario quiere ver solo sus datos (desde Mi Espacio)
    // Esto aplica incluso si es admin/supervisor
    const isSelfView = selfView === 'true' || selfView === true;

    // Los empleados SIEMPRE ven solo sus propios registros
    // Admin/supervisores también si vienen de Mi Espacio (selfView=true)
    if (req.user.role === 'employee' || isSelfView) {
      where.user_id = req.user.user_id;
    } else if (userId) {
      where.user_id = userId;
    }

    // Filtros de fecha
    if (startDate) {
      where.date = { [Op.gte]: startDate };
    }
    if (endDate) {
      where.date = { ...where.date, [Op.lte]: endDate };
    } else if (!startDate) {
      // Si no se especifica rango, mostrar últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.date = { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] };
    }

    if (branchId) where.BranchId = branchId;
    if (status) where.status = status;
    if (absenceType) where.absenceType = absenceType;

    const offset = (page - 1) * limit;

    console.log('🔍 [ATTENDANCE] Query WHERE:', where);

    // Construir SQL directo para evitar conflictos de nombres de columnas
    let sqlWhere = '';
    const replacements = { limit: parseInt(limit), offset };

    // CRÍTICO: Filtrar por empresa del usuario autenticado
    if (req.user && req.user.companyId) {
      sqlWhere += ' AND u.company_id = :companyId';
      replacements.companyId = req.user.companyId;
    }

    // Filtrar por usuario específico
    // Empleados SIEMPRE ven solo sus registros
    // Admin/supervisores también si vienen de Mi Espacio (selfView=true)
    if (req.user.role === 'employee' || isSelfView) {
      sqlWhere += ' AND a."UserId" = :userId';
      replacements.userId = req.user.user_id;
    } else if (userId) {
      sqlWhere += ' AND a."UserId" = :userId';
      replacements.userId = userId;
    }

    if (startDate) {
      sqlWhere += ' AND DATE(a."checkInTime") >= :startDate';
      replacements.startDate = startDate;
    }
    if (endDate) {
      sqlWhere += ' AND DATE(a."checkInTime") <= :endDate';
      replacements.endDate = endDate;
    }
    if (branchId) {
      sqlWhere += ' AND a.kiosk_id = :branchId';
      replacements.branchId = branchId;
    }
    if (status) {
      sqlWhere += ' AND a.status = :status';
      replacements.status = status;
    }

    // Query de conteo
    const [countResult] = await sequelize.query(`
      SELECT COUNT(a.id) as total
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE 1=1 ${sqlWhere}
    `, { replacements, type: QueryTypes.SELECT });

    const count = parseInt(countResult.total || 0);

    // Query de datos - campos mapeados para frontend CON INFO DE TURNO, SUCURSAL, DEPTO, SECTOR, DESTINO HE
    const attendances = await sequelize.query(`
      SELECT
        a.id,
        a.date,
        a."checkInTime" as check_in,
        a."checkOutTime" as check_out,
        a.status,
        a.is_late,
        a.kiosk_id as "kioskId",
        a.overtime_hours,
        a.overtime_destination,
        CONCAT(u."firstName", ' ', u."lastName") as user_name,
        u."employeeId" as legajo,
        u.user_id,
        u.email as user_email,
        u.branch_id,
        u.department_id,
        u.sector_id,
        br.name as branch_name,
        d.name as department_name,
        sec.name as sector_name,
        s.id as shift_id,
        s.name as shift_name,
        s."startTime" as shift_start,
        s."endTime" as shift_end,
        s."hourlyRates" as shift_hourly_rates,
        s."toleranceConfig" as shift_tolerance,
        s."breakStartTime" as shift_break_start,
        s."breakEndTime" as shift_break_end
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      LEFT JOIN branches br ON u.branch_id = br.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN sectors sec ON u.sector_id = sec.id
      LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
      LEFT JOIN shifts s ON s.id = usa.shift_id
      WHERE 1=1 ${sqlWhere}
      ORDER BY a."checkInTime" DESC NULLS LAST
      LIMIT :limit OFFSET :offset
    `, { replacements, type: QueryTypes.SELECT });

    console.log('✅ [ATTENDANCE] Encontrados:', count, 'registros');

    // Procesar asistencias con cálculo de horas extras
    const companyId = req.user.company_id || req.user.companyId;
    const processedAttendances = await Promise.all(attendances.map(async (att) => {
      // Construir objeto shift si hay datos
      const shift = att.shift_id ? {
        id: att.shift_id,
        name: att.shift_name,
        startTime: att.shift_start,
        endTime: att.shift_end,
        hourlyRates: att.shift_hourly_rates,
        toleranceConfig: att.shift_tolerance,
        breakStartTime: att.shift_break_start,
        breakEndTime: att.shift_break_end
      } : null;

      // Verificar si es feriado
      const isHoliday = await OvertimeCalculatorService.isHoliday(att.date, companyId);

      // Calcular desglose de horas
      const hoursBreakdown = OvertimeCalculatorService.calculateHoursBreakdown(att, shift, isHoliday);

      // Detectar tardanza según turno
      const lateInfo = OvertimeCalculatorService.detectLateArrival(att, shift);

      return {
        id: att.id,
        date: att.date,
        check_in: att.check_in,
        check_out: att.check_out,
        status: att.status,
        is_late: att.is_late || lateInfo.isLate,
        kioskId: att.kioskId,
        user_name: att.user_name,
        legajo: att.legajo,
        user_id: att.user_id,
        user_email: att.user_email,
        // Sucursal, Departamento, Sector
        branch_id: att.branch_id,
        branch_name: att.branch_name,
        department_id: att.department_id,
        department_name: att.department_name,
        sector_id: att.sector_id,
        sector_name: att.sector_name,
        // Horas extras y destino
        overtime_hours: att.overtime_hours,
        overtime_destination: att.overtime_destination,
        shift: shift ? {
          id: shift.id,
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime
        } : null,
        hours: hoursBreakdown,
        lateInfo
      };
    }));

    res.json({
      success: true,
      data: processedAttendances,
      pagination: {
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        totalRecords: count,
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ [ATTENDANCE] Error obteniendo asistencias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/v1/attendance/stats
 * @desc Obtener estadísticas básicas - DEBE estar antes de /:id
 * @query startDate - Fecha inicio (opcional, default: hace 30 días)
 * @query endDate - Fecha fin (opcional, default: hoy)
 * @query selfView - Si true, mostrar solo datos del usuario actual
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate, selfView } = req.query;
    const companyId = req.user.company_id || req.user.companyId;
    const isSelfView = selfView === 'true' || selfView === true;

    // Si no se especifica rango, usar últimos 30 días
    let dateStart = startDate;
    let dateEnd = endDate || new Date().toISOString().split('T')[0];

    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateStart = thirtyDaysAgo.toISOString().split('T')[0];
    }

    // Construir filtro por usuario si es selfView o es empleado
    let userFilter = '';
    const replacements = { companyId, dateStart, dateEnd };

    if (req.user.role === 'employee' || isSelfView) {
      userFilter = 'AND a."UserId" = :userId';
      replacements.userId = req.user.user_id;
    }

    console.log('📊 [ATTENDANCE STATS] Empresa:', companyId, '| Rango:', dateStart, 'a', dateEnd, '| selfView:', isSelfView);

    const [stats] = await sequelize.query(`
      SELECT
        COUNT(a.id) as total,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'late' OR a.is_late = true THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'present' AND a.is_late = false THEN 1 END) as "onTime"
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE u.company_id = :companyId
        AND a.date >= :dateStart
        AND a.date <= :dateEnd
        ${userFilter}
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    console.log('✅ [ATTENDANCE STATS] Resultado:', stats);
    res.json(stats || { total: 0, present: 0, late: 0, absent: 0, onTime: 0 });
  } catch (error) {
    console.error('❌ [ATTENDANCE STATS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attendance/:id
 * @desc Obtener registro específico
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        error: 'Registro no encontrado'
      });
    }

    // Los empleados solo pueden ver sus propios registros
    if (req.user.role === 'employee' && attendance.user_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    res.json(attendance);

  } catch (error) {
    console.error('Error obteniendo registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/attendance/today/status
 * @desc Obtener estado de asistencia de hoy
 */
router.get('/today/status', auth, async (req, res) => {
  try {
    const today = moment().tz(process.env.TIMEZONE).format('YYYY-MM-DD');

    const attendance = await Attendance.findOne({
      where: {
        user_id: req.user.user_id,
        date: today
      }
    });

    const status = {
      hasCheckedIn: !!(attendance && attendance.check_in),
      hasCheckedOut: !!(attendance && attendance.check_out),
      attendance: attendance || null,
      canCheckIn: true,
      canCheckOut: !!(attendance && attendance.check_in && !attendance.check_out)
    };

    res.json(status);

  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/attendance/:id
 * @desc Actualizar registro de asistencia (solo supervisores/admin)
 */
router.put('/:id', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      checkInTime,
      checkOutTime,
      notes,
      status,
      manualEntryReason
    } = req.body;

    const attendance = await Attendance.findByPk(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        error: 'Registro no encontrado'
      });
    }

    const updateData = {
      ...(checkInTime && { check_in: new Date(checkInTime) }),
      ...(checkOutTime && { check_out: new Date(checkOutTime) }),
      ...(notes && { notes }),
      ...(status && { status }),
      ...(manualEntryReason && { manualEntryReason, isManualEntry: true })
    };

    await attendance.update(updateData);

    // Recalcular estadísticas
    await calculateAttendanceStats(attendance);

    // Obtener registro actualizado
    const updatedRecord = await Attendance.findByPk(req.params.id);

    res.json({
      message: 'Registro actualizado exitosamente',
      attendance: updatedRecord
    });

  } catch (error) {
    console.error('Error actualizando registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/attendance/stats
 * @desc Obtener estadísticas básicas (alias simple para el frontend)
 */
router.get('/stats', auth, async (req, res) => {
  try {
    console.log('📊 [ATTENDANCE STATS] Obteniendo estadísticas básicas para empresa:', req.user.company_id);

    // Obtener estadísticas del día actual
    const today = new Date().toISOString().split('T')[0];

    const [stats] = await sequelize.query(`
      SELECT
        COUNT(a.id) as total,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE u.company_id = :companyId
        AND a.date >= :today
    `, {
      replacements: {
        companyId: req.user.company_id,
        today: today
      },
      type: QueryTypes.SELECT
    });

    const result = stats || {
      total: 0,
      present: 0,
      late: 0,
      absent: 0
    };

    console.log('✅ [ATTENDANCE STATS] Estadísticas obtenidas:', result);

    res.json(result);

  } catch (error) {
    console.error('❌ [ATTENDANCE STATS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/attendance/stats/summary
 * @desc Obtener resumen estadístico
 */
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate, kioskId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let sqlWhere = '';
    const replacements = {};

    // CRÍTICO: Filtrar por empresa del usuario autenticado
    if (req.user && req.user.companyId) {
      sqlWhere += ' AND u.company_id = :companyId';
      replacements.companyId = req.user.companyId;
    }

    // Filtros de fecha - por defecto hoy
    const start = startDate || today;
    const end = endDate || today;

    sqlWhere += ' AND DATE(a."checkInTime") >= :startDate AND DATE(a."checkInTime") <= :endDate';
    replacements.startDate = start;
    replacements.endDate = end;

    if (kioskId) {
      sqlWhere += ' AND a.kiosk_id = :kioskId';
      replacements.kioskId = kioskId;
    }

    const [stats] = await sequelize.query(`
      SELECT
        COUNT(a.id) as "totalRecords",
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as "presentCount",
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as "lateCount",
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as "absentCount",
        0 as "avgWorkingHours"
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE 1=1 ${sqlWhere}
    `, { replacements, type: QueryTypes.SELECT });

    const result = stats || {
      totalRecords: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      avgWorkingHours: 0
    };

    res.json({
      success: true,
      data: result,
      filters: { startDate: start, endDate: end, kioskId }
    });

  } catch (error) {
    console.error('❌ [ATTENDANCE STATS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/attendance/stats/chart
 * @desc Obtener datos para el gráfico de asistencia (últimos 30 días)
 */
router.get('/stats/chart', auth, async (req, res) => {
  try {
    console.log('📊 [ATTENDANCE CHART] Solicitando datos de gráfico para empresa:', req.user.companyId);

    // Calcular rango de fechas (últimos 30 días)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29); // 30 días incluyendo hoy

    // Formatear fechas para SQL
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query para obtener datos agrupados por fecha y estado
    const chartData = await sequelize.query(`
      SELECT
        DATE(a."checkInTime") as date,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE u.company_id = :companyId
        AND DATE(a."checkInTime") >= :startDate
        AND DATE(a."checkInTime") <= :endDate
      GROUP BY DATE(a."checkInTime")
      ORDER BY DATE(a."checkInTime") ASC
    `, {
      replacements: {
        companyId: req.user.companyId,
        startDate: startDateStr,
        endDate: endDateStr
      },
      type: QueryTypes.SELECT
    });

    // Crear arrays para los últimos 30 días (incluso si no hay datos para algunos días)
    const labels = [];
    const presentData = [];
    const lateArrivalsData = [];
    const absencesData = [];

    // Generar todos los días en el rango
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Formatear label como DD/MM
      const [year, month, day] = dateStr.split('-');
      labels.push(`${day}/${month}`);

      // Buscar datos para este día
      const dayData = chartData.find(d => d.date === dateStr);

      presentData.push(dayData ? parseInt(dayData.present_count) : 0);
      lateArrivalsData.push(dayData ? parseInt(dayData.late_count) : 0);
      absencesData.push(dayData ? parseInt(dayData.absent_count) : 0);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('✅ [ATTENDANCE CHART] Datos generados:', {
      days: labels.length,
      totalPresent: presentData.reduce((a, b) => a + b, 0),
      totalLate: lateArrivalsData.reduce((a, b) => a + b, 0),
      totalAbsent: absencesData.reduce((a, b) => a + b, 0)
    });

    res.json({
      success: true,
      labels,
      present: presentData,
      lateArrivals: lateArrivalsData,
      absences: absencesData
    });

  } catch (error) {
    console.error('❌ [ATTENDANCE CHART] Error obteniendo datos del gráfico:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Función auxiliar para calcular estadísticas de asistencia
 */
/**
 * Calcular estadísticas de asistencia y generar notificaciones si es necesario
 * INTEGRADO CON SISTEMA DE NOTIFICACIONES ENTERPRISE V3.0
 */
async function calculateAttendanceStats(attendance) {
  if (!attendance.check_in) return;

  const checkIn = moment(attendance.check_in);
  const checkOut = attendance.check_out ? moment(attendance.check_out) : null;

  // Calcular horas trabajadas
  if (checkOut) {
    const duration = moment.duration(checkOut.diff(checkIn));
    attendance.workingHours = duration.asHours();
  }

  try {
    // Obtener usuario con turno y departamento
    const user = await User.findByPk(attendance.user_id, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'supervisor_id']
        }
      ]
    });

    if (!user) {
      console.log('[calculateAttendanceStats] Usuario no encontrado');
      attendance.status = 'present';
      await attendance.save();
      return;
    }

    // Obtener turno del usuario
    let shift = null;
    if (user.primary_shift_id) {
      shift = await Shift.findByPk(user.primary_shift_id);
    }

    // Si no tiene turno asignado, usar horario por defecto
    const scheduledStart = shift
      ? moment(attendance.date + ' ' + shift.start_time, 'YYYY-MM-DD HH:mm:ss')
      : moment(attendance.date + ' 08:00', 'YYYY-MM-DD HH:mm');

    // Obtener tolerancia del turno o usar por defecto
    const toleranceMinutes = shift?.tolerance_minutes_entry
      || parseInt(process.env.TOLERANCE_MINUTES_ENTRY)
      || 10;

    // Calcular minutos de retraso
    const minutesLate = checkIn.diff(scheduledStart, 'minutes');

    // Determinar si está dentro de tolerancia
    const isWithinTolerance = minutesLate <= toleranceMinutes;
    const requiresAuthorization = minutesLate > toleranceMinutes;

    // Actualizar attendance
    if (requiresAuthorization) {
      attendance.status = 'late';
      attendance.minutes_late = minutesLate;
      attendance.is_within_tolerance = false;
      attendance.requires_authorization = true;
      attendance.authorization_status = 'pending_supervisor';

      // Calcular deadline para el supervisor (30 minutos)
      const deadline = moment(attendance.check_in).add(30, 'minutes').toDate();
      attendance.supervisor_authorization_deadline = deadline;

      // Obtener supervisor del turno o departamento
      let supervisorId = null;
      if (shift && shift.supervisor_id) {
        supervisorId = shift.supervisor_id;
      } else if (user.department && user.department.supervisor_id) {
        supervisorId = user.department.supervisor_id;
      }

      attendance.supervisor_id = supervisorId;

      await attendance.save();

      // 🔔 GENERAR NOTIFICACIÓN CON WORKFLOW AUTOMÁTICO
      console.log(`🔔 [ATTENDANCE] Generando notificación de llegada tarde: ${user.firstName} ${user.lastName} - ${minutesLate} min`);

      // 🔌 PLUG & PLAY: Solo se envía si el módulo 'notifications-enterprise' está activo
      await useModuleIfAvailable(user.company_id, 'notifications-enterprise', async () => {
        return await NotificationWorkflowService.createNotification({
          module: 'attendance',
          notificationType: 'late_arrival_approval',
          companyId: user.company_id,
          category: 'approval_request',
          priority: minutesLate > 30 ? 'high' : 'medium',
          templateKey: 'attendance_late_arrival_approval',
          variables: {
            employee_name: `${user.firstName} ${user.lastName}`,
            employee_id: user.employeeId || user.user_id.substring(0, 8),
            department: user.department?.name || 'Sin departamento',
            minutes_late: minutesLate,
            shift_name: shift?.name || 'Sin turno asignado',
            tolerance_minutes: toleranceMinutes,
            kiosk_name: attendance.kiosk_id ? `Kiosk ${attendance.kiosk_id}` : 'Manual',
            check_in_time: checkIn.format('HH:mm'),
            expected_time: scheduledStart.format('HH:mm')
          },
          relatedEntityType: 'attendance',
          relatedEntityId: attendance.id,
          relatedUserId: user.user_id,
          relatedDepartmentId: user.department?.id,
          relatedKioskId: attendance.kiosk_id,
          relatedAttendanceId: attendance.id,
          entity: {
            requires_authorization: true,
            minutes_late: minutesLate
          },
          sendEmail: minutesLate > 30, // Enviar email si es retraso mayor a 30 min
          metadata: {
            shift_id: shift?.id,
            scheduled_time: scheduledStart.format(),
            actual_time: checkIn.format(),
            tolerance: toleranceMinutes,
            auto_generated: true
          }
        });
      }, () => {
        // Fallback: Módulo no activo, asistencia registrada sin notificar
        console.log('⏭️  [ATTENDANCE] Módulo notificaciones no activo - Asistencia registrada sin notificar');
        return null;
      });

      console.log(`✅ [ATTENDANCE] Notificación generada para asistencia ${attendance.id}`);

    } else if (minutesLate > 0 && minutesLate <= toleranceMinutes) {
      // Llegó tarde pero dentro de tolerancia
      attendance.status = 'present';
      attendance.minutes_late = minutesLate;
      attendance.is_within_tolerance = true;
      attendance.requires_authorization = false;
      await attendance.save();

      console.log(`ℹ️ [ATTENDANCE] Llegada dentro de tolerancia: ${user.firstName} ${user.lastName} - ${minutesLate} min`);

    } else {
      // Llegó a tiempo o temprano
      attendance.status = 'present';
      attendance.minutes_late = 0;
      attendance.minutes_early = minutesLate < 0 ? Math.abs(minutesLate) : 0;
      attendance.is_within_tolerance = true;
      attendance.requires_authorization = false;
      await attendance.save();

      console.log(`✅ [ATTENDANCE] Llegada puntual: ${user.firstName} ${user.lastName}`);
    }

  } catch (error) {
    console.error('[calculateAttendanceStats] Error:', error);
    // Si falla, al menos guardar status básico
    attendance.status = 'present';
    await attendance.save();
  }
}

/**
 * @route POST /api/v1/attendance/mobile
 * @desc Endpoint para recibir datos del móvil (sin autenticación)
 */
router.post('/mobile', async (req, res) => {
  try {
    const {
      user,
      type,
      method,
      timestamp,
      device = 'mobile_app'
    } = req.body;

    console.log('Datos recibidos del móvil:', { user, type, method, timestamp, device });

    // Buscar usuario por employeeId o email
    const foundUser = await User.findOne({
      where: {
        [Op.or]: [
          { employeeId: user },
          { email: user }
        ]
      }
    });

    if (!foundUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        user: user
      });
    }

    const today = moment().tz(process.env.TIMEZONE || 'America/Argentina/Buenos_Aires').format('YYYY-MM-DD');
    const recordTime = new Date(timestamp || Date.now());

    if (type.toLowerCase() === 'entrada') {
      // Verificar si ya existe registro de entrada para hoy
      const existingRecord = await Attendance.findOne({
        where: {
          user_id: foundUser.id,
          date: today
        },
        attributes: ['id', 'date', 'check_in', 'check_out', 'checkInMethod', 'checkOutMethod',
                    'workingHours', 'status', 'notes', 'kiosk_id', 'user_id', 'createdAt', 'updatedAt']
      });

      if (existingRecord && existingRecord.check_in) {
        return res.status(409).json({
          error: 'Ya existe un registro de entrada para hoy',
          attendance: existingRecord
        });
      }

      let attendance;
      if (!existingRecord) {
        attendance = await Attendance.create({
          user_id: foundUser.id,
          date: today,
          check_in: recordTime,
          checkInMethod: method.toLowerCase(),
          notes: `Registrado desde aplicación móvil - ${method}`
        });
      } else {
        attendance = await existingRecord.update({
          check_in: recordTime,
          checkInMethod: method.toLowerCase(),
          notes: existingRecord.notes ?
            `${existingRecord.notes}\nEntrada: ${method} desde móvil` :
            `Registrado desde aplicación móvil - ${method}`
        });
      }

      // await calculateAttendanceStats(attendance); // Temporarily disabled for mobile endpoint
      
      res.status(201).json({
        success: true,
        message: 'Entrada registrada exitosamente desde móvil',
        attendance: attendance,
        user: foundUser.employeeId
      });

    } else if (type.toLowerCase() === 'salida') {
      // Buscar registro de entrada de hoy
      const attendance = await Attendance.findOne({
        where: {
          user_id: foundUser.id,
          date: today
        },
        attributes: ['id', 'date', 'check_in', 'check_out', 'checkInMethod', 'checkOutMethod',
                    'workingHours', 'status', 'notes', 'kiosk_id', 'user_id', 'createdAt', 'updatedAt']
      });

      if (!attendance) {
        return res.status(404).json({
          error: 'No existe registro de entrada para hoy'
        });
      }

      if (!attendance.check_in) {
        return res.status(400).json({
          error: 'Debe registrar entrada antes de la salida'
        });
      }

      if (attendance.check_out) {
        return res.status(409).json({
          error: 'Ya existe un registro de salida para hoy',
          attendance: attendance
        });
      }

      await attendance.update({
        check_out: recordTime,
        checkOutMethod: method.toLowerCase(),
        notes: attendance.notes ? 
          `${attendance.notes}\nSalida: ${method} desde móvil` : 
          `Salida registrada desde aplicación móvil - ${method}`
      });

      // await calculateAttendanceStats(attendance); // Temporarily disabled for mobile endpoint

      res.json({
        success: true,
        message: 'Salida registrada exitosamente desde móvil',
        attendance: attendance,
        user: foundUser.employeeId
      });

    } else {
      return res.status(400).json({
        error: 'Tipo de registro inválido. Use "entrada" o "salida"'
      });
    }

  } catch (error) {
    console.error('Error procesando datos del móvil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// ========================================
// PP-7-IMPL-2: ENDPOINT DE JUSTIFICACIÓN DE AUSENCIAS
// ========================================
/**
 * @route PUT /api/v1/attendance/:id/justify
 * @desc Justificar una ausencia o tardanza (RRHH/Admin)
 * @access Private (supervisorOrAdmin)
 *
 * DATO ÚNICO: La justificación se guarda en attendance y liquidación lee de aquí.
 * FALLBACK: Permite justificar manualmente sin módulo médico.
 */
router.put('/:id/justify', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      is_justified,
      absence_type,
      absence_reason,
      medical_certificate_id
    } = req.body;

    // Validar que se proporcione al menos is_justified
    if (typeof is_justified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_justified es requerido (true/false)'
      });
    }

    // Validar absence_type si se proporciona
    const validAbsenceTypes = [
      'medical', 'vacation', 'suspension', 'personal', 'bereavement',
      'maternity', 'paternity', 'study', 'union', 'other'
    ];

    if (absence_type && !validAbsenceTypes.includes(absence_type)) {
      return res.status(400).json({
        success: false,
        message: 'absence_type inválido. Valores permitidos: ' + validAbsenceTypes.join(', ')
      });
    }

    // Si absence_type es "other", requerir absence_reason
    if (absence_type === 'other' && !absence_reason) {
      return res.status(400).json({
        success: false,
        message: 'absence_reason es requerido cuando absence_type es "other"'
      });
    }

    // Buscar la asistencia
    const attendance = await Attendance.findOne({
      where: {
        id,
        company_id: req.user.company_id
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Registro de asistencia no encontrado'
      });
    }

    // Preparar datos de actualización
    const updateData = {
      is_justified,
      absence_type: absence_type || null,
      absence_reason: absence_reason || null,
      justified_by: req.user.user_id,
      justified_at: new Date()
    };

    // Si se proporciona medical_certificate_id (integración con módulo médico)
    if (medical_certificate_id) {
      updateData.medical_certificate_id = medical_certificate_id;
    }

    // Actualizar el registro
    await attendance.update(updateData);

    // Recargar para obtener datos actualizados
    await attendance.reload();

    // Log para auditoría
    console.log(`✅ PP-7: Justificación aplicada a attendance ${id} por ${req.user.usuario || req.user.user_id}`);
    console.log(`   - is_justified: ${is_justified}, absence_type: ${absence_type || 'N/A'}`);

    res.json({
      success: true,
      message: is_justified
        ? 'Ausencia justificada exitosamente'
        : 'Justificación removida exitosamente',
      data: {
        id: attendance.id,
        user_id: attendance.user_id,
        date: attendance.date,
        status: attendance.status,
        is_justified: attendance.is_justified,
        absence_type: attendance.absence_type,
        absence_reason: attendance.absence_reason,
        justified_by: attendance.justified_by,
        justified_at: attendance.justified_at,
        medical_certificate_id: attendance.medical_certificate_id
      }
    });

  } catch (error) {
    console.error('❌ Error justificando ausencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al justificar ausencia',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/attendance/unjustified
 * @desc Listar ausencias no justificadas (para liquidación)
 * @access Private (supervisorOrAdmin)
 */
router.get('/unjustified', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;

    // Construir where
    const where = {
      company_id: req.user.company_id,
      is_justified: false,
      status: {
        [Op.in]: ['absent', 'no_show', 'late']
      }
    };

    // Filtrar por rango de fechas
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date]
      };
    }

    // Filtrar por usuario
    if (user_id) {
      where.user_id = user_id;
    }

    const unjustified = await Attendance.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['user_id', 'usuario', 'nombre', 'apellido', 'employeeId']
      }],
      order: [['date', 'DESC']],
      limit: 500
    });

    res.json({
      success: true,
      count: unjustified.length,
      data: unjustified
    });

  } catch (error) {
    console.error('❌ Error obteniendo ausencias no justificadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ausencias no justificadas',
      error: error.message
    });
  }
});

// ========================================
// 📊 ESTADÍSTICAS DETALLADAS CON HORAS EXTRAS
// ========================================

/**
 * @route GET /api/v1/attendance/stats/detailed
 * @desc Obtener estadísticas detalladas con desglose de horas normales/extras
 * @query startDate - Fecha inicio (opcional, default: hace 30 días)
 * @query endDate - Fecha fin (opcional, default: hoy)
 * @query groupBy - Agrupar por: user, shift, department (default: user)
 */
router.get('/stats/detailed', auth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'user' } = req.query;
    const companyId = req.user.company_id || req.user.companyId;

    // Calcular rango de fechas
    let dateStart = startDate;
    let dateEnd = endDate || new Date().toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateStart = thirtyDaysAgo.toISOString().split('T')[0];
    }

    console.log('📊 [DETAILED STATS] Empresa:', companyId, '| Rango:', dateStart, 'a', dateEnd);

    // Query con info completa
    const attendances = await sequelize.query(`
      SELECT
        a.id,
        a.date,
        a."checkInTime" as check_in,
        a."checkOutTime" as check_out,
        a.status,
        a.is_late,
        a."UserId" as user_id,
        CONCAT(u."firstName", ' ', u."lastName") as user_name,
        u."employeeId" as legajo,
        u.department_id,
        d.name as department_name,
        s.id as shift_id,
        s.name as shift_name,
        s."startTime" as shift_start,
        s."endTime" as shift_end,
        s."hourlyRates" as shift_hourly_rates,
        s."toleranceConfig" as shift_tolerance,
        s."breakStartTime" as shift_break_start,
        s."breakEndTime" as shift_break_end
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
      LEFT JOIN shifts s ON s.id = usa.shift_id
      WHERE u.company_id = :companyId
        AND a.date >= :dateStart
        AND a.date <= :dateEnd
      ORDER BY a.date DESC, u."lastName" ASC
    `, {
      replacements: { companyId, dateStart, dateEnd },
      type: QueryTypes.SELECT
    });

    // Procesar cada asistencia con cálculo de horas
    const processedData = await Promise.all(attendances.map(async (att) => {
      const shift = att.shift_id ? {
        id: att.shift_id,
        name: att.shift_name,
        startTime: att.shift_start,
        endTime: att.shift_end,
        hourlyRates: att.shift_hourly_rates,
        toleranceConfig: att.shift_tolerance,
        breakStartTime: att.shift_break_start,
        breakEndTime: att.shift_break_end
      } : null;

      const isHoliday = await OvertimeCalculatorService.isHoliday(att.date, companyId);
      const hoursBreakdown = OvertimeCalculatorService.calculateHoursBreakdown(att, shift, isHoliday);
      const lateInfo = OvertimeCalculatorService.detectLateArrival(att, shift);
      const earlyInfo = OvertimeCalculatorService.detectEarlyDeparture(att, shift);

      return {
        ...att,
        shift,
        hours: hoursBreakdown,
        hoursBreakdown: hoursBreakdown,  // Para calculateAggregatedStats
        lateInfo,
        earlyInfo
      };
    }));

    // Calcular estadísticas agregadas
    const aggregatedStats = OvertimeCalculatorService.calculateAggregatedStats(processedData);

    // Agrupar según parámetro
    let groupedStats = {};
    if (groupBy === 'shift') {
      // Agrupar por turno
      processedData.forEach(att => {
        const key = att.shift_name || 'Sin turno asignado';
        if (!groupedStats[key]) {
          groupedStats[key] = {
            shiftName: key,
            shiftId: att.shift_id,
            totalHours: 0,
            normalHours: 0,
            overtimeHours: 0,
            days: 0,
            employees: new Set()
          };
        }
        groupedStats[key].totalHours += att.hours.effectiveHours;
        groupedStats[key].normalHours += att.hours.normalHours;
        groupedStats[key].overtimeHours += att.hours.overtimeHours;
        groupedStats[key].days++;
        groupedStats[key].employees.add(att.user_id);
      });

      // Convertir Sets a conteo
      Object.keys(groupedStats).forEach(k => {
        groupedStats[k].employeeCount = groupedStats[k].employees.size;
        delete groupedStats[k].employees;
        groupedStats[k].totalHours = parseFloat(groupedStats[k].totalHours.toFixed(2));
        groupedStats[k].normalHours = parseFloat(groupedStats[k].normalHours.toFixed(2));
        groupedStats[k].overtimeHours = parseFloat(groupedStats[k].overtimeHours.toFixed(2));
      });

    } else if (groupBy === 'department') {
      // Agrupar por departamento
      processedData.forEach(att => {
        const key = att.department_name || 'Sin departamento';
        if (!groupedStats[key]) {
          groupedStats[key] = {
            departmentName: key,
            departmentId: att.department_id,
            totalHours: 0,
            normalHours: 0,
            overtimeHours: 0,
            days: 0,
            employees: new Set()
          };
        }
        groupedStats[key].totalHours += att.hours.effectiveHours;
        groupedStats[key].normalHours += att.hours.normalHours;
        groupedStats[key].overtimeHours += att.hours.overtimeHours;
        groupedStats[key].days++;
        groupedStats[key].employees.add(att.user_id);
      });

      Object.keys(groupedStats).forEach(k => {
        groupedStats[k].employeeCount = groupedStats[k].employees.size;
        delete groupedStats[k].employees;
        groupedStats[k].totalHours = parseFloat(groupedStats[k].totalHours.toFixed(2));
        groupedStats[k].normalHours = parseFloat(groupedStats[k].normalHours.toFixed(2));
        groupedStats[k].overtimeHours = parseFloat(groupedStats[k].overtimeHours.toFixed(2));
      });
    }

    res.json({
      success: true,
      data: {
        dateRange: { start: dateStart, end: dateEnd },
        summary: {
          totalRecords: aggregatedStats.totalRecords,
          totalHours: aggregatedStats.totalHours,
          normalHours: aggregatedStats.totalNormalHours,
          overtimeHours: aggregatedStats.totalOvertimeHours,
          averageHoursPerDay: aggregatedStats.averageHoursPerDay,
          byDayType: aggregatedStats.byDayType
        },
        byUser: aggregatedStats.byUserArray,
        grouped: groupBy !== 'user' ? Object.values(groupedStats) : null,
        records: processedData
      }
    });

  } catch (error) {
    console.error('❌ [DETAILED STATS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/v1/attendance/stats/overtime-summary
 * @desc Resumen rápido de horas extras del período
 * @query startDate - Fecha inicio
 * @query endDate - Fecha fin
 */
router.get('/stats/overtime-summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.user.company_id || req.user.companyId;

    let dateStart = startDate;
    let dateEnd = endDate || new Date().toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateStart = thirtyDaysAgo.toISOString().split('T')[0];
    }

    // Query optimizada para resumen
    const attendances = await sequelize.query(`
      SELECT
        a.date,
        a."checkInTime" as check_in,
        a."checkOutTime" as check_out,
        a."UserId" as user_id,
        s."startTime" as shift_start,
        s."endTime" as shift_end,
        s."hourlyRates" as shift_hourly_rates,
        s."breakStartTime" as shift_break_start,
        s."breakEndTime" as shift_break_end
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
      LEFT JOIN shifts s ON s.id = usa.shift_id
      WHERE u.company_id = :companyId
        AND a.date >= :dateStart
        AND a.date <= :dateEnd
        AND a."checkInTime" IS NOT NULL
        AND a."checkOutTime" IS NOT NULL
    `, {
      replacements: { companyId, dateStart, dateEnd },
      type: QueryTypes.SELECT
    });

    // Calcular totales
    let totalNormalHours = 0;
    let totalOvertimeHours = 0;
    let totalWeekendHours = 0;
    let totalHolidayHours = 0;
    let recordsWithOvertime = 0;

    for (const att of attendances) {
      const shift = {
        startTime: att.shift_start || '08:00',
        endTime: att.shift_end || '17:00',
        hourlyRates: att.shift_hourly_rates || { normal: 1, overtime: 1.5 },
        breakStartTime: att.shift_break_start,
        breakEndTime: att.shift_break_end
      };

      const isHoliday = await OvertimeCalculatorService.isHoliday(att.date, companyId);
      const breakdown = OvertimeCalculatorService.calculateHoursBreakdown(att, shift, isHoliday);

      totalNormalHours += breakdown.normalHours;
      totalOvertimeHours += breakdown.overtimeHours;

      if (breakdown.isWeekend) {
        totalWeekendHours += breakdown.effectiveHours;
      }
      if (breakdown.isHoliday) {
        totalHolidayHours += breakdown.effectiveHours;
      }
      if (breakdown.overtimeHours > 0) {
        recordsWithOvertime++;
      }
    }

    res.json({
      success: true,
      data: {
        dateRange: { start: dateStart, end: dateEnd },
        totalRecords: attendances.length,
        recordsWithOvertime,
        hours: {
          total: parseFloat((totalNormalHours + totalOvertimeHours).toFixed(2)),
          normal: parseFloat(totalNormalHours.toFixed(2)),
          overtime: parseFloat(totalOvertimeHours.toFixed(2)),
          weekend: parseFloat(totalWeekendHours.toFixed(2)),
          holiday: parseFloat(totalHolidayHours.toFixed(2))
        },
        overtimePercentage: attendances.length > 0
          ? parseFloat(((recordsWithOvertime / attendances.length) * 100).toFixed(1))
          : 0
      }
    });

  } catch (error) {
    console.error('❌ [OVERTIME SUMMARY] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// 🌤️ WEATHER PATTERN STATS
// ========================================

/**
 * @route GET /api/v1/attendance/stats/weather-patterns
 * @desc Estadísticas de tardanzas por patrón climático
 * @query startDate - Fecha inicio
 * @query endDate - Fecha fin
 */
router.get('/stats/weather-patterns', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.user.company_id || req.user.companyId;

    let dateStart = startDate;
    let dateEnd = endDate || new Date().toISOString().split('T')[0];
    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateStart = thirtyDaysAgo.toISOString().split('T')[0];
    }

    // Importar servicio dinámicamente
    const WeatherPatternService = require('../services/WeatherPatternService');
    const stats = await WeatherPatternService.getStatsByWeatherPattern(companyId, dateStart, dateEnd);

    res.json({
      success: true,
      data: {
        dateRange: { start: dateStart, end: dateEnd },
        byPattern: stats.byPattern,
        summary: stats.summary,
        insights: {
          mostImpactful: stats.summary.mostImpactfulPattern,
          recommendation: generateWeatherRecommendation(stats.summary.mostImpactfulPattern)
        }
      }
    });

  } catch (error) {
    console.error('❌ [WEATHER PATTERNS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper para generar recomendaciones basadas en clima
function generateWeatherRecommendation(impact) {
  if (!impact || !impact.pattern || impact.pattern === 'UNKNOWN') {
    return 'No hay suficientes datos para generar recomendaciones.';
  }

  const recommendations = {
    ADVERSO_LLUVIA: `Los días lluviosos aumentan las tardanzas en ${impact.increasePercent || 0}%. Considere flexibilizar horarios de entrada en días de lluvia o habilitar trabajo remoto.`,
    ADVERSO_FRIO: `El frío extremo aumenta las tardanzas en ${impact.increasePercent || 0}%. Considere ajustar horarios de entrada en meses de invierno.`,
    NOCTURNO: `Los turnos nocturnos tienen ${impact.increasePercent || 0}% más tardanzas. Revise los tiempos de transporte y considere incentivos para puntualidad nocturna.`
  };

  return recommendations[impact.pattern] || 'Analice los patrones específicos para su organización.';
}

// ========================================
// 📅 YEAR-OVER-YEAR COMPARISON
// ========================================

/**
 * @route GET /api/v1/attendance/stats/year-comparison
 * @desc Comparación interanual: período actual vs mismo período año anterior
 * @query startDate - Fecha inicio período actual
 * @query endDate - Fecha fin período actual
 * @returns Métricas comparativas con ponderación por cantidad de personal
 */
router.get('/stats/year-comparison', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.user.company_id || req.user.companyId;

    // Fechas período actual
    let currentStart = startDate || moment().subtract(30, 'days').format('YYYY-MM-DD');
    let currentEnd = endDate || moment().format('YYYY-MM-DD');

    // Fechas mismo período año anterior
    const previousStart = moment(currentStart).subtract(1, 'year').format('YYYY-MM-DD');
    const previousEnd = moment(currentEnd).subtract(1, 'year').format('YYYY-MM-DD');

    // Query para obtener métricas de un período
    const getPeriodMetrics = async (start, end) => {
      const [result] = await sequelize.query(`
        SELECT
          COUNT(DISTINCT a."UserId") as unique_employees,
          COUNT(*) as total_records,
          COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN a.status = 'late' OR a.is_late = true THEN 1 END) as late_count,
          COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
          AVG(CASE WHEN a.is_late = true THEN COALESCE(a.minutes_late, 0) END) as avg_late_minutes,
          AVG(
            CASE WHEN a."checkOutTime" IS NOT NULL AND a."checkInTime" IS NOT NULL
            THEN EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime")) / 3600
            END
          ) as avg_hours_worked
        FROM attendances a
        WHERE a.company_id = :companyId
          AND a.date >= :start
          AND a.date <= :end
      `, {
        replacements: { companyId, start, end },
        type: QueryTypes.SELECT
      });
      return result;
    };

    // Obtener métricas de ambos períodos en paralelo
    const [currentMetrics, previousMetrics] = await Promise.all([
      getPeriodMetrics(currentStart, currentEnd),
      getPeriodMetrics(previousStart, previousEnd)
    ]);

    // Calcular porcentajes
    const calcPercent = (count, total) => total > 0 ? (count / total * 100) : 0;

    const current = {
      period: { start: currentStart, end: currentEnd },
      employees: parseInt(currentMetrics.unique_employees) || 0,
      totalRecords: parseInt(currentMetrics.total_records) || 0,
      presentCount: parseInt(currentMetrics.present_count) || 0,
      lateCount: parseInt(currentMetrics.late_count) || 0,
      absentCount: parseInt(currentMetrics.absent_count) || 0,
      avgLateMinutes: parseFloat(currentMetrics.avg_late_minutes) || 0,
      avgHoursWorked: parseFloat(currentMetrics.avg_hours_worked) || 0
    };
    current.attendanceRate = calcPercent(current.presentCount + current.lateCount, current.totalRecords);
    current.lateRate = calcPercent(current.lateCount, current.totalRecords);
    current.absentRate = calcPercent(current.absentCount, current.totalRecords);

    const previous = {
      period: { start: previousStart, end: previousEnd },
      employees: parseInt(previousMetrics.unique_employees) || 0,
      totalRecords: parseInt(previousMetrics.total_records) || 0,
      presentCount: parseInt(previousMetrics.present_count) || 0,
      lateCount: parseInt(previousMetrics.late_count) || 0,
      absentCount: parseInt(previousMetrics.absent_count) || 0,
      avgLateMinutes: parseFloat(previousMetrics.avg_late_minutes) || 0,
      avgHoursWorked: parseFloat(previousMetrics.avg_hours_worked) || 0
    };
    previous.attendanceRate = calcPercent(previous.presentCount + previous.lateCount, previous.totalRecords);
    previous.lateRate = calcPercent(previous.lateCount, previous.totalRecords);
    previous.absentRate = calcPercent(previous.absentCount, previous.totalRecords);

    // Factor de ponderación por cambio de personal
    const employeeRatio = previous.employees > 0 ? current.employees / previous.employees : 1;

    // Calcular variaciones (positivo = mejora, negativo = empeora)
    const variations = {
      attendanceRate: {
        absolute: current.attendanceRate - previous.attendanceRate,
        relative: previous.attendanceRate > 0
          ? ((current.attendanceRate - previous.attendanceRate) / previous.attendanceRate * 100)
          : 0
      },
      lateRate: {
        absolute: previous.lateRate - current.lateRate, // Invertido: menos es mejor
        relative: previous.lateRate > 0
          ? ((previous.lateRate - current.lateRate) / previous.lateRate * 100)
          : 0
      },
      absentRate: {
        absolute: previous.absentRate - current.absentRate, // Invertido: menos es mejor
        relative: previous.absentRate > 0
          ? ((previous.absentRate - current.absentRate) / previous.absentRate * 100)
          : 0
      },
      avgLateMinutes: {
        absolute: previous.avgLateMinutes - current.avgLateMinutes, // Invertido
        relative: previous.avgLateMinutes > 0
          ? ((previous.avgLateMinutes - current.avgLateMinutes) / previous.avgLateMinutes * 100)
          : 0
      },
      employeeGrowth: {
        absolute: current.employees - previous.employees,
        relative: previous.employees > 0
          ? ((current.employees - previous.employees) / previous.employees * 100)
          : 0
      }
    };

    // Generar insights
    const insights = [];

    if (variations.attendanceRate.absolute > 2) {
      insights.push({
        type: 'positive',
        metric: 'asistencia',
        message: `La asistencia mejoró ${variations.attendanceRate.absolute.toFixed(1)} puntos porcentuales vs año anterior`
      });
    } else if (variations.attendanceRate.absolute < -2) {
      insights.push({
        type: 'negative',
        metric: 'asistencia',
        message: `La asistencia disminuyó ${Math.abs(variations.attendanceRate.absolute).toFixed(1)} puntos porcentuales vs año anterior`
      });
    }

    if (variations.lateRate.absolute > 2) {
      insights.push({
        type: 'positive',
        metric: 'puntualidad',
        message: `Las tardanzas se redujeron ${variations.lateRate.absolute.toFixed(1)} puntos porcentuales vs año anterior`
      });
    } else if (variations.lateRate.absolute < -2) {
      insights.push({
        type: 'negative',
        metric: 'puntualidad',
        message: `Las tardanzas aumentaron ${Math.abs(variations.lateRate.absolute).toFixed(1)} puntos porcentuales vs año anterior`
      });
    }

    if (employeeRatio > 1.1) {
      insights.push({
        type: 'info',
        metric: 'personal',
        message: `El personal creció ${((employeeRatio - 1) * 100).toFixed(0)}% vs año anterior. Las métricas por persona son comparables.`
      });
    } else if (employeeRatio < 0.9) {
      insights.push({
        type: 'info',
        metric: 'personal',
        message: `El personal se redujo ${((1 - employeeRatio) * 100).toFixed(0)}% vs año anterior.`
      });
    }

    // Si no hay datos del año anterior
    if (previous.totalRecords === 0) {
      insights.push({
        type: 'info',
        metric: 'datos',
        message: 'No hay datos del mismo período del año anterior para comparar.'
      });
    }

    res.json({
      success: true,
      data: {
        current,
        previous,
        variations,
        employeeRatio: parseFloat(employeeRatio.toFixed(2)),
        insights,
        hasHistoricalData: previous.totalRecords > 0
      }
    });

  } catch (error) {
    console.error('❌ [YEAR COMPARISON] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// 🚨 MODO EVACUACIÓN / HEADCOUNT EN TIEMPO REAL
// ========================================

/**
 * GET /api/v1/attendance/headcount
 * Retorna empleados que están DENTRO del edificio ahora
 * (check_in hoy sin check_out = adentro)
 * Útil para: evacuaciones, emergencias, control de aforo
 */
router.get('/headcount', auth, async (req, res) => {
  try {
    const { companyId, branchId, departmentId } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId requerido' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Empleados con check_in hoy pero sin check_out = están adentro
    const [insideEmployees] = await sequelize.query(`
      SELECT
        a.id as attendance_id,
        a."checkInTime" as check_in_time,
        a."breakOutTime" as break_out_time,
        a."breakInTime" as break_in_time,
        u.user_id,
        u."firstName" as first_name,
        u."lastName" as last_name,
        u.legajo,
        u.department_id,
        d.name as department_name,
        s.name as shift_name,
        EXTRACT(EPOCH FROM (NOW() - a."checkInTime")) / 3600 as hours_inside
      FROM attendances a
      JOIN users u ON a."UserId" = u.user_id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
      LEFT JOIN shifts s ON usa.shift_id = s.id
      WHERE a.company_id = :companyId
        AND (DATE(a."checkInTime") = :today OR a.work_date = :today)
        AND a."checkOutTime" IS NULL
        AND a.status != 'pending_authorization'
        ${branchId ? 'AND u.branch_id = :branchId' : ''}
        ${departmentId ? 'AND u.department_id = :departmentId' : ''}
      ORDER BY a."checkInTime" ASC
    `, {
      replacements: { companyId, today, ...(branchId && { branchId }), ...(departmentId && { departmentId }) }
    });

    // Empleados que salieron hoy (para el total del día)
    const [outsideCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM attendances
      WHERE company_id = :companyId
        AND (DATE("checkInTime") = :today OR work_date = :today)
        AND "checkOutTime" IS NOT NULL
    `, { replacements: { companyId, today } });

    // Clasificar: adentro vs en break
    const inside = insideEmployees.map(emp => ({
      ...emp,
      status: emp.break_out_time && !emp.break_in_time ? 'on_break' : 'inside',
      hours_inside: parseFloat(emp.hours_inside || 0).toFixed(1)
    }));

    const insideCount = inside.filter(e => e.status === 'inside').length;
    const onBreakCount = inside.filter(e => e.status === 'on_break').length;

    // Agrupar por departamento
    const byDepartment = {};
    inside.forEach(emp => {
      const dept = emp.department_name || 'Sin departamento';
      if (!byDepartment[dept]) byDepartment[dept] = { count: 0, employees: [] };
      byDepartment[dept].count++;
      byDepartment[dept].employees.push(emp);
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalInside: insideCount,
        onBreak: onBreakCount,
        totalPresent: insideCount + onBreakCount,
        alreadyLeft: parseInt(outsideCount[0]?.count || 0)
      },
      employees: inside,
      byDepartment
    });

  } catch (error) {
    console.error('❌ [HEADCOUNT] Error:', error.message);
    res.status(500).json({ success: false, error: 'Error obteniendo headcount' });
  }
});

// ========================================
// 📊 MOUNT ADVANCED STATS ROUTES
// ========================================
router.use('/stats', advancedStatsRouter);

module.exports = router;

