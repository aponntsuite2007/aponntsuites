const express = require('express');
const router = express.Router();
const { AponntStaff, AponntStaffRole } = require('../config/database');

/**
 * ============================================================================
 * RUTAS: GESTIÓN DE STAFF APONNT
 * ============================================================================
 *
 * CRUD para personal de Aponnt (vendedores, gerentes, desarrollo, etc.)
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

/**
 * GET /api/aponnt/staff
 * Obtener todo el staff (con filtros opcionales)
 */
router.get('/', async (req, res) => {
  try {
    const { area, country, is_active, role_code } = req.query;

    const where = {};
    if (area) where.area = area;
    if (country) where.country = country.toUpperCase();
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const include = [
      {
        model: AponntStaffRole,
        as: 'role',
        where: role_code ? { role_code } : undefined
      },
      {
        model: AponntStaff,
        as: 'supervisor',
        required: false,
        include: [
          {
            model: AponntStaffRole,
            as: 'role'
          }
        ]
      }
    ];

    const staff = await AponntStaff.findAll({
      where,
      include,
      order: [['level', 'ASC'], ['last_name', 'ASC']]
    });

    res.json({
      success: true,
      count: staff.length,
      data: staff
    });

  } catch (error) {
    console.error('❌ Error obteniendo staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo staff',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff/roles
 * Obtener todos los roles disponibles
 */
router.get('/roles', async (req, res) => {
  try {
    const roles = await AponntStaffRole.findAll({
      order: [['level', 'ASC'], ['role_name', 'ASC']]
    });

    res.json({
      success: true,
      count: roles.length,
      data: roles
    });

  } catch (error) {
    console.error('❌ Error obteniendo roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo roles',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff/:id
 * Obtener un staff específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await AponntStaff.findByPk(id, {
      include: [
        {
          model: AponntStaffRole,
          as: 'role'
        },
        {
          model: AponntStaff,
          as: 'supervisor',
          include: [{ model: AponntStaffRole, as: 'role' }]
        },
        {
          model: AponntStaff,
          as: 'subordinates',
          include: [{ model: AponntStaffRole, as: 'role' }]
        }
      ]
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff no encontrado'
      });
    }

    res.json({
      success: true,
      data: staff
    });

  } catch (error) {
    console.error('❌ Error obteniendo staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo staff',
      error: error.message
    });
  }
});

/**
 * POST /api/aponnt/staff
 * Crear nuevo staff
 */
router.post('/', async (req, res) => {
  try {
    const staffData = req.body;

    // Validar campos requeridos
    if (!staffData.first_name || !staffData.last_name || !staffData.email || !staffData.role_id || !staffData.country) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: first_name, last_name, email, role_id, country'
      });
    }

    // Verificar que el email no exista
    const existingStaff = await AponntStaff.findOne({
      where: { email: staffData.email.toLowerCase() }
    });

    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un staff con este email'
      });
    }

    // Crear staff
    const newStaff = await AponntStaff.create({
      ...staffData,
      email: staffData.email.toLowerCase()
    });

    // Recargar con relaciones
    const staffWithRelations = await AponntStaff.findByPk(newStaff.staff_id, {
      include: [
        { model: AponntStaffRole, as: 'role' },
        { model: AponntStaff, as: 'supervisor', include: [{ model: AponntStaffRole, as: 'role' }] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Staff creado exitosamente',
      data: staffWithRelations
    });

  } catch (error) {
    console.error('❌ Error creando staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando staff',
      error: error.message
    });
  }
});

/**
 * PUT /api/aponnt/staff/:id
 * Actualizar staff
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const staff = await AponntStaff.findByPk(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff no encontrado'
      });
    }

    // Si se actualiza el email, verificar que no exista
    if (updates.email && updates.email.toLowerCase() !== staff.email) {
      const existingStaff = await AponntStaff.findOne({
        where: { email: updates.email.toLowerCase() }
      });

      if (existingStaff) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un staff con este email'
        });
      }
    }

    // Actualizar
    await staff.update(updates);

    // Recargar con relaciones
    const staffWithRelations = await AponntStaff.findByPk(id, {
      include: [
        { model: AponntStaffRole, as: 'role' },
        { model: AponntStaff, as: 'supervisor', include: [{ model: AponntStaffRole, as: 'role' }] }
      ]
    });

    res.json({
      success: true,
      message: 'Staff actualizado exitosamente',
      data: staffWithRelations
    });

  } catch (error) {
    console.error('❌ Error actualizando staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando staff',
      error: error.message
    });
  }
});

/**
 * DELETE /api/aponnt/staff/:id
 * Eliminar staff (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await AponntStaff.findByPk(id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff no encontrado'
      });
    }

    // Soft delete
    await staff.update({ is_active: false });

    res.json({
      success: true,
      message: 'Staff desactivado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando staff',
      error: error.message
    });
  }
});

module.exports = router;
