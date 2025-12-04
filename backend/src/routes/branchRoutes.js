const express = require('express');
const router = express.Router();
const { Branch, User, Attendance, Holiday } = require('../config/database');
const { Op } = require('sequelize');
const { auth, supervisorOrAdmin } = require('../middleware/auth');
const holidayApiService = require('../services/HolidayApiService');

/**
 * @route GET /api/v1/branches
 * @desc Obtener sucursales
 */
router.get('/', auth, async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const branches = await Branch.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json(branches);

  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/branches/:id
 * @desc Obtener sucursal específica
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);

    if (!branch) {
      return res.status(404).json({
        error: 'Sucursal no encontrada'
      });
    }

    res.json(branch);

  } catch (error) {
    console.error('Error obteniendo sucursal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/branches
 * @desc Crear nueva sucursal
 */
router.post('/', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      address,
      city,
      state,
      postalCode,
      country = 'Argentina',
      phone,
      email,
      latitude,
      longitude,
      gpsRadius = 50,
      timezone = 'America/Argentina/Buenos_Aires',
      isMainOffice = false,
      settings = {},
      managerName,
      managerEmail,
      capacity,
      workingHours = { start: "08:00", end: "17:00" }
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        error: 'Nombre y código son requeridos'
      });
    }

    // Verificar que no exista una sucursal con el mismo código
    const existingBranch = await Branch.findOne({ where: { code } });
    
    if (existingBranch) {
      return res.status(409).json({
        error: 'Ya existe una sucursal con ese código'
      });
    }

    const branch = await Branch.create({
      name,
      code,
      address,
      city,
      state,
      postalCode,
      country,
      phone,
      email,
      latitude,
      longitude,
      gpsRadius,
      timezone,
      isMainOffice,
      settings,
      managerName,
      managerEmail,
      capacity,
      workingHours
    });

    res.status(201).json({
      message: 'Sucursal creada exitosamente',
      branch
    });

  } catch (error) {
    console.error('Error creando sucursal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/branches/:id
 * @desc Actualizar sucursal
 */
router.put('/:id', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);

    if (!branch) {
      return res.status(404).json({
        error: 'Sucursal no encontrada'
      });
    }

    // PROTECCIÓN: Si es sucursal principal (is_main), no permitir cambiar el nombre
    if (branch.is_main === true && req.body.name && req.body.name.toUpperCase() !== 'CENTRAL') {
      return res.status(403).json({
        error: 'No se puede cambiar el nombre de la sucursal CENTRAL. Esta es la sucursal principal de la empresa.',
        code: 'MAIN_BRANCH_NAME_PROTECTED'
      });
    }

    // Si se está cambiando el código, verificar unicidad
    if (req.body.code && req.body.code !== branch.code) {
      const existingBranch = await Branch.findOne({
        where: { code: req.body.code }
      });
      
      if (existingBranch) {
        return res.status(409).json({
          error: 'Ya existe una sucursal con ese código'
        });
      }
    }

    // Detectar si cambió el país
    const oldCountry = branch.country;
    const newCountry = req.body.country;

    await branch.update(req.body);

    // Si cambió el país, sincronizar feriados automáticamente
    let holidaySyncResult = null;
    if (newCountry && newCountry !== oldCountry) {
      try {
        const isSupported = await holidayApiService.isCountrySupported(newCountry);
        if (isSupported) {
          const currentYear = new Date().getFullYear();
          // Sincronizar año actual y siguiente
          holidaySyncResult = await holidayApiService.syncMultipleYears(
            Holiday,
            newCountry,
            currentYear,
            currentYear + 1,
            { onlyNational: true }
          );
          console.log(`🌎 [BRANCH] Feriados sincronizados automáticamente para ${newCountry}`);
        }
      } catch (syncError) {
        console.warn(`⚠️ [BRANCH] Error sincronizando feriados:`, syncError.message);
      }
    }

    res.json({
      message: 'Sucursal actualizada exitosamente',
      branch,
      holidaySync: holidaySyncResult ? {
        synced: true,
        country: newCountry,
        results: holidaySyncResult
      } : null
    });

  } catch (error) {
    console.error('Error actualizando sucursal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/branches/:id
 * @desc Eliminar sucursal
 */
router.delete('/:id', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);

    if (!branch) {
      return res.status(404).json({
        error: 'Sucursal no encontrada'
      });
    }

    // PROTECCIÓN: La sucursal principal (is_main) NO puede ser eliminada
    if (branch.is_main === true) {
      return res.status(403).json({
        error: 'No se puede eliminar la sucursal CENTRAL. Esta es la sucursal principal de la empresa y es necesaria para el sistema de feriados.',
        code: 'MAIN_BRANCH_DELETE_PROTECTED'
      });
    }

    // Verificar si tiene usuarios o registros asociados
    const hasUsers = await User.count({ where: { defaultBranchId: req.params.id } });
    const hasAttendances = await Attendance.count({ where: { BranchId: req.params.id } });

    if (hasUsers > 0 || hasAttendances > 0) {
      // Soft delete
      await branch.update({ isActive: false });
      
      return res.json({
        message: 'Sucursal desactivada exitosamente (tiene registros asociados)'
      });
    } else {
      // Hard delete si no tiene registros asociados
      await branch.destroy();
      
      return res.json({
        message: 'Sucursal eliminada exitosamente'
      });
    }

  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/branches/:id/users
 * @desc Obtener usuarios de una sucursal
 */
router.get('/:id/users', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { 
        defaultBranchId: req.params.id,
        isActive: true
      },
      attributes: ['id', 'legajo', 'firstName', 'lastName', 'email', 'role']
    });

    res.json({
      branchId: req.params.id,
      users
    });

  } catch (error) {
    console.error('Error obteniendo usuarios de sucursal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/branches/:id/stats
 * @desc Obtener estadísticas de una sucursal
 */
router.get('/:id/stats', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const branch = await Branch.findByPk(req.params.id);
    
    if (!branch) {
      return res.status(404).json({
        error: 'Sucursal no encontrada'
      });
    }

    // Contar usuarios activos
    const activeUsers = await User.count({
      where: { 
        defaultBranchId: req.params.id,
        isActive: true
      }
    });

    // Estadísticas de asistencia
    const attendanceWhere = { BranchId: req.params.id };
    if (startDate) attendanceWhere.date = { [Op.gte]: startDate };
    if (endDate) attendanceWhere.date = { ...attendanceWhere.date, [Op.lte]: endDate };

    const attendanceStats = await Attendance.findAll({
      where: attendanceWhere,
      attributes: [
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'totalRecords'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "present" THEN 1 END')), 'presentCount'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "late" THEN 1 END')), 'lateCount'],
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.literal('CASE WHEN status = "absent" THEN 1 END')), 'absentCount'],
        [Attendance.sequelize.fn('AVG', Attendance.sequelize.col('workingHours')), 'avgWorkingHours'],
        [Attendance.sequelize.fn('SUM', Attendance.sequelize.col('overtimeHours')), 'totalOvertimeHours']
      ],
      raw: true
    });

    res.json({
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code
      },
      activeUsers,
      attendance: attendanceStats[0]
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de sucursal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;