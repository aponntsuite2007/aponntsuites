const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
 *
 * 🔐 SEGURIDAD: Todas las rutas requieren autenticación de staff Aponnt
 */

// 🔐 MIDDLEWARE DE AUTENTICACIÓN
const verifyAponntStaffToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.error('❌ [AUTH] JWT_SECRET no configurado');
      return res.status(500).json({
        success: false,
        error: 'Error de configuración del servidor'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.staff_id && !decoded.staffId) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: Se requiere token de staff Aponnt'
      });
    }

    req.staff = {
      id: decoded.staff_id || decoded.staffId,
      email: decoded.email,
      level: decoded.level || 1
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado' });
    }
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

// 🔐 Aplicar autenticación a TODAS las rutas
router.use(verifyAponntStaffToken);
console.log('🔐 [STAFF-ROUTES] Autenticación habilitada para todas las rutas');

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
 * GET /api/aponnt/staff/vendors
 * Obtener solo vendedores (staff con role comercial/ventas)
 */
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await AponntStaff.findAll({
      include: [
        {
          model: AponntStaffRole,
          as: 'role',
          where: {
            role_code: ['VENDOR', 'VENDEDOR', 'COMERCIAL', 'SALES']
          }
        }
      ],
      where: {
        is_active: true
      },
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });

    res.json({
      success: true,
      data: vendors,
      count: vendors.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo vendedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo vendedores',
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

    // Obtener datos del rol para level y area si no se proporcionan
    let level = staffData.level;
    let area = staffData.area;

    if (level === undefined || level === null || area === undefined || area === null) {
      const role = await AponntStaffRole.findByPk(staffData.role_id);
      if (role) {
        if (level === undefined || level === null) level = role.level || 4;
        if (area === undefined || area === null) area = role.role_area || 'ventas';
      } else {
        level = level ?? 4;
        area = area ?? 'ventas';
      }
    }

    // Crear staff
    const newStaff = await AponntStaff.create({
      ...staffData,
      email: staffData.email.toLowerCase(),
      level,
      area,
      is_active: staffData.is_active !== false // Default true
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

/**
 * GET /api/aponnt/staff/organigrama/data
 * Obtener estructura del organigrama con staff agrupado por rol
 */
router.get('/organigrama/data', async (req, res) => {
  try {
    // Obtener todos los roles
    const roles = await AponntStaffRole.findAll({
      order: [['level', 'ASC'], ['role_area', 'ASC']]
    });

    // Obtener todo el staff activo con sus roles
    const staff = await AponntStaff.findAll({
      where: { is_active: true },
      include: [{
        model: AponntStaffRole,
        as: 'role'
      }],
      order: [['level', 'ASC'], ['last_name', 'ASC']]
    });

    // Agrupar staff por role_code
    const staffByRole = {};
    staff.forEach(s => {
      const roleCode = s.role?.role_code || 'SIN_ROL';
      if (!staffByRole[roleCode]) {
        staffByRole[roleCode] = [];
      }
      // Filtrar usuarios de testing
      const name = `${s.first_name} ${s.last_name}`.trim();
      if (!name.includes('Automatizado') &&
          !name.includes('TEST-USERS') &&
          !name.includes('Sistema Testing') &&
          !name.includes('Test User')) {
        staffByRole[roleCode].push({
          id: s.staff_id,
          name: name,
          email: s.email,
          area: s.area,
          level: s.level
        });
      }
    });

    // Estructura del organigrama por niveles
    const organigrama = {
      nivel0: [], // Dirección
      nivel1: [], // Gerencias
      nivel2: [], // Jefaturas
      nivel3: [], // Coordinadores
      nivel4: [], // Operativos
      externos: [] // Staff externo
    };

    roles.forEach(role => {
      const roleData = {
        code: role.role_code,
        name: role.role_name,
        area: role.role_area,
        level: role.level,
        reportsTo: role.reports_to_role_code,
        isSales: role.is_sales_role,
        staff: staffByRole[role.role_code] || []
      };

      if (role.role_area === 'externo') {
        organigrama.externos.push(roleData);
      } else if (role.level === 0) {
        organigrama.nivel0.push(roleData);
      } else if (role.level === 1) {
        organigrama.nivel1.push(roleData);
      } else if (role.level === 2) {
        organigrama.nivel2.push(roleData);
      } else if (role.level === 3) {
        organigrama.nivel3.push(roleData);
      } else {
        organigrama.nivel4.push(roleData);
      }
    });

    // Estadísticas
    const stats = {
      totalRoles: roles.length,
      totalStaff: staff.length,
      staffPorArea: {},
      rolesVacios: roles.filter(r => !staffByRole[r.role_code] || staffByRole[r.role_code].length === 0).length
    };

    staff.forEach(s => {
      stats.staffPorArea[s.area] = (stats.staffPorArea[s.area] || 0) + 1;
    });

    res.json({
      success: true,
      data: organigrama,
      stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo organigrama:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo organigrama',
      error: error.message
    });
  }
});

module.exports = router;
