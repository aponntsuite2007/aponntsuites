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
      absenceType
    } = req.query;

    console.log('🔍 [ATTENDANCE] Filtros recibidos:', { page, limit, startDate, endDate, userId, status, absenceType, companyId: req.user.company_id });

    const where = {};

    // OBLIGATORIO: Filtrar por empresa del usuario autenticado
    if (req.user.company_id) {
      where.company_id = req.user.company_id;
    }

    // Los empleados solo pueden ver sus propios registros
    if (req.user.role === 'employee') {
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
    if (req.user && req.user.company_id) {
      sqlWhere += ' AND u.company_id = :companyId';
      replacements.companyId = req.user.company_id;
    }

    // Filtrar por usuario específico (empleados solo ven sus registros)
    if (req.user.role === 'employee') {
      sqlWhere += ' AND a.user_id = :userId';
      replacements.userId = req.user.user_id;
    } else if (userId) {
      sqlWhere += ' AND a.user_id = :userId';
      replacements.userId = userId;
    }

    if (startDate) {
      sqlWhere += ' AND DATE(a.check_in) >= :startDate';
      replacements.startDate = startDate;
    }
    if (endDate) {
      sqlWhere += ' AND DATE(a.check_in) <= :endDate';
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
      INNER JOIN users u ON a.user_id = u.user_id
      WHERE 1=1 ${sqlWhere}
    `, { replacements, type: QueryTypes.SELECT });

    const count = parseInt(countResult.total || 0);

    // Query de datos
    const attendances = await sequelize.query(`
      SELECT
        a.id, a.check_in as "checkInTime", a.check_out as "checkOutTime",
        a.status, a.kiosk_id as "kioskId",
        u.user_id as "User.id", u."firstName" as "User.firstName",
        u."lastName" as "User.lastName", u."employeeId" as "User.employeeId",
        u.email as "User.email"
      FROM attendances a
      INNER JOIN users u ON a.user_id = u.user_id
      WHERE 1=1 ${sqlWhere}
      ORDER BY a.check_in DESC NULLS LAST
      LIMIT :limit OFFSET :offset
    `, { replacements, type: QueryTypes.SELECT });

    console.log('✅ [ATTENDANCE] Encontrados:', count, 'registros');

    res.json({
      success: true,
      data: attendances,
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
    if (req.user && req.user.company_id) {
      sqlWhere += ' AND a.company_id = :companyId';
      replacements.companyId = req.user.company_id;
    }

    // Filtros de fecha - por defecto hoy
    const start = startDate || today;
    const end = endDate || today;

    sqlWhere += ' AND DATE(a.check_in) >= :startDate AND DATE(a.check_in) <= :endDate';
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
    console.log('📊 [ATTENDANCE CHART] Solicitando datos de gráfico para empresa:', req.user.company_id);

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
        DATE(a.check_in) as date,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count
      FROM attendances a
      INNER JOIN users u ON a.user_id = u.user_id
      WHERE u.company_id = :companyId
        AND DATE(a.check_in) >= :startDate
        AND DATE(a.check_in) <= :endDate
      GROUP BY DATE(a.check_in)
      ORDER BY DATE(a.check_in) ASC
    `, {
      replacements: {
        companyId: req.user.company_id,
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

module.exports = router;
