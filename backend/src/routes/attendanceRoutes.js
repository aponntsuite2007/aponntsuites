const express = require('express');
const router = express.Router();
const { Attendance, User, Branch, Shift, sequelize } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const moment = require('moment-timezone');
const { Op, QueryTypes } = require('sequelize');

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
        UserId: req.user.user_id,
        date: today
      }
    });

    if (existingRecord && existingRecord.checkInTime) {
      return res.status(409).json({
        error: 'Ya existe un registro de entrada para hoy'
      });
    }

    // Si no existe registro, crear uno nuevo
    let attendance;
    if (!existingRecord) {
      attendance = await Attendance.create({
        UserId: req.user.user_id,
        date: today,
        checkInTime: now,
        checkInMethod: method,
        checkInLocation: location,
        BranchId: branchId,
        notes,
        isManualEntry: method === 'manual'
      });
    } else {
      // Actualizar registro existente
      attendance = await existingRecord.update({
        checkInTime: now,
        checkInMethod: method,
        checkInLocation: location,
        BranchId: branchId || existingRecord.BranchId,
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
        UserId: req.user.user_id,
        date: today
      }
    });

    if (!attendance) {
      return res.status(404).json({
        error: 'No existe registro de entrada para hoy'
      });
    }

    if (!attendance.checkInTime) {
      return res.status(400).json({
        error: 'Debe registrar entrada antes de la salida'
      });
    }

    if (attendance.checkOutTime) {
      return res.status(409).json({
        error: 'Ya existe un registro de salida para hoy'
      });
    }

    // Actualizar con datos de salida
    await attendance.update({
      checkOutTime: now,
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
      where.UserId = req.user.user_id;
    } else if (userId) {
      where.UserId = userId;
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

    if (startDate) {
      sqlWhere += ' AND a.date >= :startDate';
      replacements.startDate = startDate;
    }
    if (endDate) {
      sqlWhere += ' AND a.date <= :endDate';
      replacements.endDate = endDate;
    }
    if (branchId) {
      sqlWhere += ' AND a."BranchId" = :branchId';
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

    // Query de datos
    const attendances = await sequelize.query(`
      SELECT
        a.id, a.date, a."checkInTime", a."checkOutTime",
        a."checkInMethod", a."checkOutMethod", a."workingHours",
        a.status, a.notes, a."BranchId",
        u.user_id as "User.id", u."firstName" as "User.firstName",
        u."lastName" as "User.lastName", u."employeeId" as "User.employeeId",
        u.email as "User.email"
      FROM attendances a
      INNER JOIN users u ON a."UserId" = u.user_id
      WHERE 1=1 ${sqlWhere}
      ORDER BY a.date DESC, a."checkInTime" DESC
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
    if (req.user.role === 'employee' && attendance.UserId !== req.user.user_id) {
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
        UserId: req.user.user_id,
        date: today
      }
    });

    const status = {
      hasCheckedIn: !!(attendance && attendance.checkInTime),
      hasCheckedOut: !!(attendance && attendance.checkOutTime),
      attendance: attendance || null,
      canCheckIn: true,
      canCheckOut: !!(attendance && attendance.checkInTime && !attendance.checkOutTime)
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
      ...(checkInTime && { checkInTime: new Date(checkInTime) }),
      ...(checkOutTime && { checkOutTime: new Date(checkOutTime) }),
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
    const { startDate, endDate, branchId } = req.query;

    console.log('📊 [ATTENDANCE STATS] Solicitando estadísticas para empresa:', req.user.company_id);

    const where = {};

    // Filtros de fecha - por defecto hoy
    if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else {
      // Por defecto, estadísticas de hoy
      const today = new Date().toISOString().split('T')[0];
      where.date = { [Op.gte]: today };
    }

    if (endDate) {
      where.date = { ...where.date, [Op.lte]: endDate };
    } else if (!startDate) {
      // Si no hay startDate, solo hoy
      const today = new Date().toISOString().split('T')[0];
      where.date = today;
    }

    if (branchId) where.BranchId = branchId;

    console.log('📊 [ATTENDANCE STATS] Query WHERE:', where);

    const stats = await Attendance.findAll({
      where,
      attributes: [
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'totalRecords'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = \'present\' THEN 1 END')), 'presentCount'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = \'late\' THEN 1 END')), 'lateCount'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = \'absent\' THEN 1 END')), 'absentCount'],
        [Attendance.sequelize.fn('AVG', Attendance.sequelize.col('workingHours')), 'avgWorkingHours']
      ],
      raw: true
    });

    const result = stats[0] || {
      totalRecords: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      avgWorkingHours: 0,
      totalOvertimeHours: 0
    };

    console.log('📊 [ATTENDANCE STATS] Resultado:', result);

    res.json({
      success: true,
      data: result,
      filters: { startDate, endDate, branchId, companyId: req.user.company_id }
    });

  } catch (error) {
    console.error('❌ [ATTENDANCE STATS] Error obteniendo estadísticas:', error);
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
async function calculateAttendanceStats(attendance) {
  if (!attendance.checkInTime) return;

  const checkIn = moment(attendance.checkInTime);
  const checkOut = attendance.checkOutTime ? moment(attendance.checkOutTime) : null;

  // Calcular horas trabajadas
  if (checkOut) {
    const duration = moment.duration(checkOut.diff(checkIn));
    attendance.workingHours = duration.asHours();
  }

  // TODO: Implementar lógica más compleja basada en turnos asignados
  // Por ahora, lógica básica
  const scheduledStart = moment(attendance.date + ' 08:00', 'YYYY-MM-DD HH:mm');
  const toleranceMinutes = parseInt(process.env.TOLERANCE_MINUTES_ENTRY) || 10;

  if (checkIn.isAfter(scheduledStart.clone().add(toleranceMinutes, 'minutes'))) {
    attendance.status = 'late';
    // attendance.lateMinutes = moment.duration(checkIn.diff(scheduledStart)).asMinutes(); // Field doesn't exist in table
  } else {
    attendance.status = 'present';
  }

  await attendance.save();
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
          UserId: foundUser.id,
          date: today
        },
        attributes: ['id', 'date', 'checkInTime', 'checkOutTime', 'checkInMethod', 'checkOutMethod', 
                    'workingHours', 'status', 'notes', 'BranchId', 'UserId', 'createdAt', 'updatedAt']
      });

      if (existingRecord && existingRecord.checkInTime) {
        return res.status(409).json({
          error: 'Ya existe un registro de entrada para hoy',
          attendance: existingRecord
        });
      }

      let attendance;
      if (!existingRecord) {
        attendance = await Attendance.create({
          UserId: foundUser.id,
          date: today,
          checkInTime: recordTime,
          checkInMethod: method.toLowerCase(),
          notes: `Registrado desde aplicación móvil - ${method}`
        });
      } else {
        attendance = await existingRecord.update({
          checkInTime: recordTime,
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
          UserId: foundUser.id,
          date: today
        },
        attributes: ['id', 'date', 'checkInTime', 'checkOutTime', 'checkInMethod', 'checkOutMethod', 
                    'workingHours', 'status', 'notes', 'BranchId', 'UserId', 'createdAt', 'updatedAt']
      });

      if (!attendance) {
        return res.status(404).json({
          error: 'No existe registro de entrada para hoy'
        });
      }

      if (!attendance.checkInTime) {
        return res.status(400).json({
          error: 'Debe registrar entrada antes de la salida'
        });
      }

      if (attendance.checkOutTime) {
        return res.status(409).json({
          error: 'Ya existe un registro de salida para hoy',
          attendance: attendance
        });
      }

      await attendance.update({
        checkOutTime: recordTime,
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