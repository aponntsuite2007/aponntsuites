const express = require('express');
const router = express.Router();
const { Department } = require('../config/database');
const { auth } = require('../middleware/auth');

// Helper: Transformar departamento al formato del frontend
function formatDepartment(dept) {
  const deptData = dept.toJSON ? dept.toJSON() : dept;
  return {
    id: deptData.id,
    name: deptData.name,
    description: deptData.description,
    address: deptData.address,
    gpsLocation: {
      lat: deptData.gps_lat,
      lng: deptData.gps_lng
    },
    // Alias flat para GPS (compatibilidad con tests)
    gps_lat: deptData.gps_lat,
    gps_lng: deptData.gps_lng,
    coverageRadius: deptData.coverage_radius,
    coverage_radius: deptData.coverage_radius, // Alias snake_case
    isActive: deptData.is_active,
    is_active: deptData.is_active, // Alias snake_case
    createdAt: deptData.created_at,
    updatedAt: deptData.updated_at,
    companyId: deptData.company_id,
    company_id: deptData.company_id, // Alias snake_case
    allow_gps_attendance: deptData.allow_gps_attendance,
    authorized_kiosks: deptData.authorized_kiosks || [],
    // Campos faltantes agregados
    branch_id: deptData.branch_id,
    branchId: deptData.branch_id,  // Alias para frontend
    default_kiosk_id: deptData.default_kiosk_id,
    manager_user_id: deptData.manager_user_id,
    notification_recipients: deptData.notification_recipients
  };
}

/**
 * @route GET /api/v1/departments
 * @desc Obtener todos los departamentos de la empresa del usuario
 */
router.get('/', auth, async (req, res) => {
  try {
    // Obtener company_id del usuario autenticado o usar 1 por defecto para APONNT
    const companyId = req.user?.company_id || 1;

    console.log(`📋 [DEPARTMENTS] Obteniendo departamentos para empresa ${companyId}`);

    const departments = await Department.findAll({
      where: {
        is_active: true,
        company_id: companyId
      },
      order: [['name', 'ASC']]
    });

    console.log(`✅ [DEPARTMENTS] Encontrados ${departments.length} departamentos`);

    // Transformar datos al formato que espera el frontend
    const formattedDepartments = departments.map(formatDepartment);

    res.json({
      success: true,
      departments: formattedDepartments,
      count: formattedDepartments.length
    });

  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/departments/:id
 * @desc Obtener departamento específico
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({
        error: 'Departamento no encontrado',
        success: false
      });
    }

    res.json({
      success: true,
      data: formatDepartment(department)
    });

  } catch (error) {
    console.error('Error obteniendo departamento:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route POST /api/v1/departments
 * @desc Crear nuevo departamento
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      gps_lat,
      gps_lng,
      coverage_radius,
      coverageRadius,
      gpsLocation,
      allow_gps_attendance,
      authorized_kiosks,
      branch_id,
      branchId,
      default_kiosk_id,
      manager_user_id
    } = req.body;

    const companyId = req.user?.company_id || 1;

    console.log('📝 [DEPARTMENTS] Creando departamento:', {
      name,
      companyId,
      branch_id: branch_id || branchId,
      bodyData: req.body
    });

    if (!name) {
      return res.status(400).json({
        error: 'El nombre del departamento es requerido',
        success: false
      });
    }

    // Mapear datos del frontend al formato de la base de datos
    const departmentData = {
      name: name.trim(),
      description: description || '',
      address: address || '',
      gps_lat: gpsLocation?.lat || gps_lat || null,
      gps_lng: gpsLocation?.lng || gps_lng || null,
      coverage_radius: coverageRadius || coverage_radius || 50,
      is_active: true,
      company_id: companyId,
      allow_gps_attendance: allow_gps_attendance || false,
      authorized_kiosks: authorized_kiosks || [],
      // Campos faltantes agregados
      branch_id: branch_id || branchId || null,
      default_kiosk_id: default_kiosk_id || null,
      manager_user_id: manager_user_id || null
    };

    console.log('📝 [DEPARTMENTS] Datos procesados:', departmentData);

    const department = await Department.create(departmentData);

    console.log('✅ [DEPARTMENTS] Departamento creado exitosamente:', department.id);

    res.status(201).json({
      success: true,
      data: formatDepartment(department),
      message: 'Departamento creado exitosamente'
    });

  } catch (error) {
    console.error('❌ [DEPARTMENTS] Error creando departamento:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Ya existe un departamento con ese nombre en esta empresa',
        success: false
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos de departamento inválidos: ' + error.message,
        success: false
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/departments/:id
 * @desc Actualizar departamento
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      gps_lat,
      gps_lng,
      coverage_radius,
      coverageRadius,
      gpsLocation,
      allow_gps_attendance,
      authorized_kiosks,
      branch_id,
      branchId,
      default_kiosk_id,
      manager_user_id
    } = req.body;

    const companyId = req.user?.company_id || 1;

    console.log('✏️ [DEPARTMENTS] Actualizando departamento:', req.params.id, {
      bodyData: req.body,
      companyId,
      branch_id: branch_id || branchId
    });

    const department = await Department.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!department) {
      return res.status(404).json({
        error: 'Departamento no encontrado',
        success: false
      });
    }

    // Preparar datos de actualización (solo actualizar campos enviados)
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;

    // Actualizar GPS si viene en cualquier formato
    if (gpsLocation?.lat !== undefined || gps_lat !== undefined) {
      updateData.gps_lat = gpsLocation?.lat || gps_lat || null;
    }
    if (gpsLocation?.lng !== undefined || gps_lng !== undefined) {
      updateData.gps_lng = gpsLocation?.lng || gps_lng || null;
    }

    // Actualizar radio de cobertura
    if (coverageRadius !== undefined || coverage_radius !== undefined) {
      updateData.coverage_radius = coverageRadius || coverage_radius;
    }

    // Actualizar nuevos campos de autorización
    if (allow_gps_attendance !== undefined) {
      updateData.allow_gps_attendance = allow_gps_attendance;
    }
    if (authorized_kiosks !== undefined) {
      updateData.authorized_kiosks = authorized_kiosks;
    }

    // Campos faltantes agregados
    if (branch_id !== undefined || branchId !== undefined) {
      updateData.branch_id = branch_id || branchId || null;
    }
    if (default_kiosk_id !== undefined) {
      updateData.default_kiosk_id = default_kiosk_id;
    }
    if (manager_user_id !== undefined) {
      updateData.manager_user_id = manager_user_id;
    }

    console.log('✏️ [DEPARTMENTS] Datos a actualizar:', updateData);

    await department.update(updateData);

    console.log('✅ [DEPARTMENTS] Departamento actualizado exitosamente');

    res.json({
      success: true,
      data: formatDepartment(department),
      message: 'Departamento actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ [DEPARTMENTS] Error actualizando departamento:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Ya existe un departamento con ese nombre en esta empresa',
        success: false
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos de departamento inválidos: ' + error.message,
        success: false
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/departments/:id
 * @desc Eliminar departamento (soft delete)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const department = await Department.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!department) {
      return res.status(404).json({
        error: 'Departamento no encontrado',
        success: false
      });
    }

    await department.update({ is_active: false });

    res.json({
      success: true,
      message: 'Departamento eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando departamento:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/departments/:id/users
 * @desc Obtener usuarios de un departamento
 */
router.get('/:id/users', auth, async (req, res) => {
  try {
    const { User } = require('../config/database');
    const companyId = req.user?.company_id || 1;

    // Verificar que el departamento pertenece a la empresa del usuario
    const department = await Department.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!department) {
      return res.status(404).json({
        error: 'Departamento no encontrado',
        success: false
      });
    }

    const users = await User.findAll({
      where: {
        departmentId: req.params.id,
        is_active: true
      },
      attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'role'],
      order: [['firstName', 'ASC']]
    });

    res.json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error('Error obteniendo usuarios del departamento:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

module.exports = router;