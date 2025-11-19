const express = require('express');
const router = express.Router();
const { Shift, Branch, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/shifts
 * @desc Obtener turnos
 */
router.get('/', auth, async (req, res) => {
  try {
    const { branchId, isActive } = req.query;
    
    const where = {};
    if (branchId) where.BranchId = branchId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const shifts = await Shift.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({ shifts });

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
    const shift = await Shift.findByPk(req.params.id, {
      include: [
        { model: Branch },
        { model: User, through: { attributes: [] } }
      ]
    });

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
      // Campos básicos
      name,
      description,
      startTime,
      endTime,
      days = [1, 2, 3, 4, 5],
      toleranceMinutesEntry = 10,
      toleranceMinutesExit = 15,
      isActive = true,
      
      // Campos nuevos del sistema avanzado
      shiftType = 'standard',
      breakStartTime,
      breakEndTime,
      
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
      notes
    } = req.body;

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
      description,
      startTime,
      endTime,
      days,
      toleranceMinutesEntry,
      toleranceMinutesExit,
      isActive,
      shiftType,
      breakStartTime,
      breakEndTime,
      rotationPattern,
      cycleStartDate,
      workDays,
      restDays,
      flashStartDate,
      flashEndDate,
      flashPriority,
      allowOverride,
      permanentPriority,
      hourlyRates,
      color,
      notes
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
    const shift = await Shift.findByPk(req.params.id);

    if (!shift) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    await shift.update(req.body);

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
    const shift = await Shift.findByPk(req.params.id);

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
 * @desc Asignar múltiples turnos a múltiples usuarios (bulk assignment)
 * @body { userIds: [userId1, userId2], shiftIds: [shiftId1, shiftId2] }
 */
router.post('/bulk-assign', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userIds, shiftIds } = req.body;

    console.log('[USERS] Asignación bulk de turnos:', { userIds, shiftIds });

    // Validaciones
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'userIds debe ser un array no vacío'
      });
    }

    if (!Array.isArray(shiftIds) || shiftIds.length === 0) {
      return res.status(400).json({
        error: 'shiftIds debe ser un array no vacío'
      });
    }

    // Verificar que usuarios existen
    const users = await User.findAll({
      where: { user_id: userIds }
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        error: 'Algunos usuarios no fueron encontrados'
      });
    }

    // Verificar que turnos existen
    const shifts = await Shift.findAll({
      where: { id: shiftIds }
    });

    if (shifts.length !== shiftIds.length) {
      return res.status(400).json({
        error: 'Algunos turnos no fueron encontrados'
      });
    }

    // ⚠️ FIX: Usar tabla user_shifts directamente (no hay asociación en modelo)
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'attendance_system',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
    });

    let assignedCount = 0;
    try {
      for (const userId of userIds) {
        // 1. Eliminar asignaciones actuales del usuario
        await pool.query('DELETE FROM user_shifts WHERE user_id = $1', [userId]);

        // 2. Insertar nuevas asignaciones
        for (const shiftId of shiftIds) {
          await pool.query(`
            INSERT INTO user_shifts (user_id, shift_id, "createdAt", "updatedAt")
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT DO NOTHING
          `, [userId, shiftId]);
          assignedCount++;
        }
      }

      await pool.end();
      console.log(`[USERS] ✅ ${assignedCount} asignaciones completadas`);

    } catch (dbError) {
      await pool.end();
      throw dbError; // Re-throw para que lo maneje el catch principal
    }

    res.json({
      message: `Asignación exitosa: ${shifts.length} turno(s) asignados a ${users.length} usuario(s)`,
      assigned: assignedCount,
      users: users.length,
      shifts: shifts.length
    });

  } catch (error) {
    console.error('[USERS] Error en asignación bulk de turnos:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

module.exports = router;