const express = require('express');
const router = express.Router();
const { Shift, Branch, User, UserShiftAssignment } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

// Helper: Formatear turno con alias para compatibilidad
function formatShift(shift) {
  console.log('🔧 [SHIFT] formatShift called');
  const data = shift.toJSON ? shift.toJSON() : shift;

  // Calcular duración del descanso si hay horas de inicio/fin
  let breakDuration = 0;
  if (data.breakStartTime && data.breakEndTime) {
    const start = data.breakStartTime.split(':');
    const end = data.breakEndTime.split(':');
    const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
    breakDuration = endMin - startMin;
  }

  // Determinar si es turno nocturno (cruza medianoche)
  let isNightShift = false;
  if (data.startTime && data.endTime) {
    const start = data.startTime.split(':');
    const end = data.endTime.split(':');
    const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
    isNightShift = endMin < startMin; // Termina antes que empieza = cruza medianoche
  }

  return {
    ...data,
    // Alias snake_case para compatibilidad
    start_time: data.startTime,
    end_time: data.endTime,
    break_duration: breakDuration,
    tolerance_minutes: data.toleranceMinutes || data.toleranceMinutesEntry,
    is_active: data.isActive,
    working_days: data.days,
    is_night_shift: isNightShift,
    color: data.color || '#007bff'
  };
}

/**
 * @route GET /api/v1/shifts
 * @desc Obtener turnos filtrados por empresa y opcionalmente por sucursal
 * @query branchId - Filtrar por sucursal
 * @query isActive - Filtrar por estado activo
 */
router.get('/', auth, async (req, res) => {
  try {
    const { branchId, isActive } = req.query;
    const companyId = req.user.company_id;

    const where = {};

    // Filtro multi-tenant obligatorio
    if (companyId) {
      where.company_id = companyId;
    }

    // Filtros opcionales
    if (branchId) where.BranchId = branchId;
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      where.isActive = true; // Por defecto solo activos
    }

    const shifts = await Shift.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name'] }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ shifts: shifts.map(formatShift) });

  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/shifts/:id
 * @desc Obtener turno específico
 */
router.get('/:id', auth, async (req, res) => {
  try {
    let shift;
    try {
      shift = await Shift.findByPk(req.params.id, {
        include: [
          { model: Branch, as: 'branch', required: false }
        ]
      });
    } catch (includeError) {
      // Fallback without includes if associations not set up
      shift = await Shift.findByPk(req.params.id);
    }

    if (!shift) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    res.json({ shift });

  } catch (error) {
    console.error('Error obteniendo turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/shifts
 * @desc Crear nuevo turno avanzado (soporta standard, rotative, permanent, flash)
 */
router.post('/', auth, supervisorOrAdmin, async (req, res) => {
  try {
    console.log('🕐 [SHIFT-API] Creando turno avanzado:', req.body);
    
    const {
      // Campos básicos (acepta camelCase y snake_case)
      name,
      description,
      startTime: _startTime,
      endTime: _endTime,
      start_time,
      end_time,
      days,
      work_days,
      toleranceMinutesEntry: _tolEntry,
      toleranceMinutesExit: _tolExit,
      entry_tolerance,
      exit_tolerance,
      isActive: _isActive,
      is_active,

      // Campos nuevos del sistema avanzado
      shiftType = 'standard',
      breakStartTime,
      breakEndTime,
      break_duration,

      // Para turnos rotativos
      rotationPattern,
      cycleStartDate,
      workDays,
      restDays,

      // Para turnos flash
      flashStartDate,
      flashEndDate,
      flashPriority = 'normal',
      allowOverride = false,

      // Para turnos permanentes
      permanentPriority = 'normal',

      // Tarifas
      hourlyRates = {
        normal: 1.0,
        overtime: 1.5,
        weekend: 1.5,
        holiday: 2.0
      },

      // Metadata
      color = '#007bff',
      notes,
      code,

      // Sucursal asociada
      branch_id,

      // Flags adicionales del frontend
      is_flexible,
      respect_national_holidays,
      respect_provincial_holidays,
      requires_overtime_approval
    } = req.body;

    // Normalizar: aceptar tanto camelCase como snake_case
    const startTime = _startTime || start_time;
    const endTime = _endTime || end_time;
    const toleranceMinutesEntry = _tolEntry || entry_tolerance || 10;
    const toleranceMinutesExit = _tolExit || exit_tolerance || 15;
    const isActive = _isActive !== undefined ? _isActive : (is_active !== undefined ? is_active : true);

    // Si no se proporciona branch_id, asignar automáticamente la sucursal CENTRAL
    let finalBranchId = branch_id;
    if (!finalBranchId && req.user.company_id) {
      try {
        const centralBranch = await Branch.findOne({
          where: {
            company_id: req.user.company_id,
            is_main: true
          }
        });
        if (centralBranch) {
          finalBranchId = centralBranch.id;
          console.log(`🏢 [SHIFT-API] Asignando sucursal CENTRAL automáticamente: ${centralBranch.id}`);
        }
      } catch (branchErr) {
        console.warn('⚠️ [SHIFT-API] No se pudo obtener sucursal CENTRAL:', branchErr.message);
      }
    }

    // Validaciones básicas
    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Nombre, hora de inicio y fin son requeridos'
      });
    }

    // Validaciones específicas por tipo
    if (shiftType === 'flash') {
      if (!flashStartDate || !flashEndDate) {
        return res.status(400).json({
          error: 'Turnos flash requieren fecha de inicio y fin'
        });
      }
    }

    if (shiftType === 'rotative') {
      if (!rotationPattern && (!workDays || !restDays)) {
        return res.status(400).json({
          error: 'Turnos rotativos requieren patrón o días de trabajo/descanso'
        });
      }
    }

    const shiftData = {
      name,
      code,
      description,
      startTime,
      endTime,
      days: days || work_days || [1, 2, 3, 4, 5],
      toleranceMinutesEntry,
      toleranceMinutesExit,
      isActive,
      shiftType,
      breakStartTime,
      breakEndTime,
      break_duration,
      rotationPattern,
      cycleStartDate,
      global_cycle_start_date: cycleStartDate,
      workDays,
      restDays,
      flashStartDate,
      flashEndDate,
      flashPriority,
      allowOverride,
      permanentPriority,
      hourlyRates,
      color,
      notes,
      is_flexible,
      respect_national_holidays,
      respect_provincial_holidays,
      requires_overtime_approval,
      company_id: req.user.company_id,
      branch_id: finalBranchId
    };

    console.log('🕐 [SHIFT-API] Datos para crear:', shiftData);

    const shift = await Shift.create(shiftData);

    console.log('🕐 [SHIFT-API] Turno creado exitosamente:', shift.id);

    res.status(201).json({
      message: 'Turno creado exitosamente',
      shift: shift
    });

  } catch (error) {
    console.error('🕐 [SHIFT-API] Error creando turno:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

/**
 * @route PUT /api/v1/shifts/:id
 * @desc Actualizar turno
 */
router.put('/:id', auth, supervisorOrAdmin, async (req, res) => {
  try {
    // Multi-tenant: Buscar turno solo de la empresa del usuario
    const shift = await Shift.findOne({
      where: {
        id: req.params.id,
        company_id: req.user.company_id
      }
    });

    if (!shift) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    // Mapear cycleStartDate a global_cycle_start_date si existe
    const updateData = { ...req.body };
    if (updateData.cycleStartDate) {
      updateData.global_cycle_start_date = updateData.cycleStartDate;
    }

    await shift.update(updateData);

    const updatedShift = await Shift.findByPk(req.params.id);

    res.json({
      message: 'Turno actualizado exitosamente',
      shift: updatedShift
    });

  } catch (error) {
    console.error('Error actualizando turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/shifts/:id
 * @desc Eliminar turno
 */
router.delete('/:id', auth, supervisorOrAdmin, async (req, res) => {
  try {
    // Multi-tenant: Buscar turno solo de la empresa del usuario
    const shift = await Shift.findOne({
      where: {
        id: req.params.id,
        company_id: req.user.company_id
      }
    });

    if (!shift) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    // Soft delete
    await shift.update({ isActive: false });

    res.json({
      message: 'Turno desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/shifts/:id/assign-users
 * @desc Asignar usuarios a turno
 */
router.post('/:id/assign-users', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({
        error: 'userIds debe ser un array'
      });
    }

    const shift = await Shift.findByPk(req.params.id);

    if (!shift) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    // Verificar que todos los usuarios existen
    const users = await User.findAll({
      where: { user_id: userIds }
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        error: 'Algunos usuarios no fueron encontrados'
      });
    }

    // Asignar usuarios al turno
    await shift.setUsers(users);

    res.json({
      message: `${users.length} usuario(s) asignado(s) al turno exitosamente`
    });

  } catch (error) {
    console.error('Error asignando usuarios al turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/shifts/:id/users
 * @desc Obtener usuarios asignados a un turno
 */
router.get('/:id/users', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id', 'legajo', 'firstName', 'lastName', 'email'],
        through: { attributes: [] }
      }]
    });

    if (!shift) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    res.json({
      shift: {
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime
      },
      users: shift.Users
    });

  } catch (error) {
    console.error('Error obteniendo usuarios del turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/shifts/bulk-assign
 * @desc Asignar usuario(s) a turno(s) usando user_shift_assignments (fuente única de verdad)
 * @body {
 *   userIds: [userId1, userId2],
 *   shiftIds: [shiftId1, shiftId2],
 *   joinDate: "YYYY-MM-DD" (fecha de acoplamiento al turno),
 *   assignedPhase: "mañana|tarde|noche|..." (fase del ciclo),
 *   groupName: "Nombre del grupo" (opcional),
 *   sector: "Sector" (opcional)
 * }
 */
router.post('/bulk-assign', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userIds, shiftIds, joinDate, assignedPhase, groupName, sector } = req.body;
    const companyId = req.user.company_id;
    const assignedBy = req.user.user_id;

    console.log('[SHIFTS] Asignación a user_shift_assignments:', { userIds, shiftIds, joinDate, assignedPhase, companyId });

    // Validaciones
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds debe ser un array no vacío' });
    }

    if (!Array.isArray(shiftIds) || shiftIds.length === 0) {
      return res.status(400).json({ error: 'shiftIds debe ser un array no vacío' });
    }

    // Obtener el primer turno para extraer info de fase si no se especifica
    const shift = await Shift.findByPk(shiftIds[0]);
    if (!shift) {
      return res.status(400).json({ error: 'Turno no encontrado' });
    }

    // Fase por defecto: primera fase del turno o 'default'
    let phase = assignedPhase;
    if (!phase && shift.phases && Array.isArray(shift.phases) && shift.phases.length > 0) {
      phase = shift.phases.find(p => p.name !== 'descanso' && p.name !== 'franco')?.name || shift.phases[0].name;
    }
    if (!phase) {
      phase = 'default';
    }

    // Fecha de acoplamiento: hoy si no se especifica
    const effectiveJoinDate = joinDate || new Date().toISOString().split('T')[0];

    // Verificar usuarios
    const users = await User.findAll({ where: { user_id: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({ error: 'Algunos usuarios no fueron encontrados' });
    }

    // Verificar turnos
    const shifts = await Shift.findAll({ where: { id: shiftIds } });
    if (shifts.length !== shiftIds.length) {
      return res.status(400).json({ error: 'Algunos turnos no fueron encontrados' });
    }

    // Crear asignaciones usando el modelo UserShiftAssignment
    let assignedCount = 0;
    const errors = [];

    for (const userId of userIds) {
      for (const shiftId of shiftIds) {
        try {
          // El hook beforeCreate desactivará asignaciones previas automáticamente
          await UserShiftAssignment.create({
            user_id: userId,
            shift_id: shiftId,
            company_id: companyId,
            join_date: effectiveJoinDate,
            assigned_phase: phase,
            group_name: groupName || shift.name,
            sector: sector || null,
            assigned_by: assignedBy,
            is_active: true,
            notes: `Asignado desde módulo Usuarios el ${new Date().toISOString()}`
          });
          assignedCount++;
          console.log(`✅ [SHIFTS] Usuario ${userId} asignado a turno ${shiftId} (fase: ${phase}, join_date: ${effectiveJoinDate})`);
        } catch (assignError) {
          console.error(`❌ [SHIFTS] Error asignando usuario ${userId} a turno ${shiftId}:`, assignError.message);
          errors.push({ userId, shiftId, error: assignError.message });
        }
      }
    }

    if (assignedCount === 0 && errors.length > 0) {
      return res.status(400).json({
        error: 'No se pudo realizar ninguna asignación',
        details: errors
      });
    }

    res.json({
      message: `Asignación exitosa: ${assignedCount} asignación(es) en user_shift_assignments`,
      assigned: assignedCount,
      users: users.length,
      shifts: shifts.length,
      joinDate: effectiveJoinDate,
      assignedPhase: phase,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[SHIFTS] Error en asignación:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

module.exports = router;