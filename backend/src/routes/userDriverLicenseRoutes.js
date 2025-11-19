const express = require('express');
const router = express.Router();
const { UserDriverLicense, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/users/:userId/driver-licenses
 * @desc Obtener todas las licencias de conducir de un usuario
 * @access Private
 */
router.get('/:userId/driver-licenses', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar que el usuario existe
    const user = await User.findOne({
      where: { user_id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Solo supervisores/admins o el propio usuario pueden ver sus licencias
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    const licenses = await UserDriverLicense.findAll({
      where: {
        userId: userId,
        companyId: req.user.companyId
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: licenses.length,
      data: licenses
    });

  } catch (error) {
    console.error('Error obteniendo licencias de conducir:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/users/:userId/driver-licenses/:licenseId
 * @desc Obtener una licencia de conducir específica
 * @access Private
 */
router.get('/:userId/driver-licenses/:licenseId', auth, async (req, res) => {
  try {
    const { userId, licenseId } = req.params;

    // Solo supervisores/admins o el propio usuario pueden ver sus licencias
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    const license = await UserDriverLicense.findOne({
      where: {
        id: licenseId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!license) {
      return res.status(404).json({
        error: 'Licencia de conducir no encontrada'
      });
    }

    res.json({
      success: true,
      data: license
    });

  } catch (error) {
    console.error('Error obteniendo licencia de conducir:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:userId/driver-licenses
 * @desc Crear nueva licencia de conducir para un usuario
 * @access Private (supervisorOrAdmin)
 */
router.post('/:userId/driver-licenses', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      licenseType,
      licenseNumber,
      licenseClass,
      subclass,
      issueDate,
      expiryDate,
      photoUrl,
      issuingAuthority,
      restrictions,
      requiresGlasses,
      suspensionStartDate,
      suspensionEndDate,
      suspensionReason,
      observations
    } = req.body;

    // Verificar que el usuario existe
    const user = await User.findOne({
      where: { user_id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Validaciones básicas
    if (!licenseType || !['nacional', 'internacional', 'pasajeros'].includes(licenseType)) {
      return res.status(400).json({
        error: 'Tipo de licencia inválido. Debe ser: nacional, internacional o pasajeros'
      });
    }

    // Crear nueva licencia
    const newLicense = await UserDriverLicense.create({
      userId: userId,
      companyId: req.user.companyId,
      licenseType,
      licenseNumber,
      licenseClass,
      subclass,
      issueDate,
      expiryDate,
      photoUrl,
      issuingAuthority,
      restrictions,
      requiresGlasses: requiresGlasses || false,
      suspensionStartDate,
      suspensionEndDate,
      suspensionReason,
      isActive: true,
      observations
    });

    console.log(`✅ [DRIVER-LICENSE] Licencia creada para usuario ${userId} - Tipo: ${licenseType}`);

    res.status(201).json({
      success: true,
      message: 'Licencia de conducir creada exitosamente',
      data: newLicense
    });

  } catch (error) {
    console.error('Error creando licencia de conducir:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:userId/driver-licenses/:licenseId
 * @desc Actualizar licencia de conducir
 * @access Private (supervisorOrAdmin)
 */
router.put('/:userId/driver-licenses/:licenseId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, licenseId } = req.params;

    const license = await UserDriverLicense.findOne({
      where: {
        id: licenseId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!license) {
      return res.status(404).json({
        error: 'Licencia de conducir no encontrada'
      });
    }

    const updateData = { ...req.body };

    // Validar licenseType si viene en el update
    if (updateData.licenseType && !['nacional', 'internacional', 'pasajeros'].includes(updateData.licenseType)) {
      return res.status(400).json({
        error: 'Tipo de licencia inválido'
      });
    }

    await license.update(updateData);

    console.log(`✅ [DRIVER-LICENSE] Licencia ${licenseId} actualizada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Licencia de conducir actualizada exitosamente',
      data: license
    });

  } catch (error) {
    console.error('Error actualizando licencia de conducir:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/users/:userId/driver-licenses/:licenseId
 * @desc Eliminar (soft delete) licencia de conducir
 * @access Private (supervisorOrAdmin)
 */
router.delete('/:userId/driver-licenses/:licenseId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, licenseId } = req.params;

    const license = await UserDriverLicense.findOne({
      where: {
        id: licenseId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!license) {
      return res.status(404).json({
        error: 'Licencia de conducir no encontrada'
      });
    }

    // Soft delete: marcar como inactiva en lugar de eliminar
    await license.update({ isActive: false });

    console.log(`✅ [DRIVER-LICENSE] Licencia ${licenseId} desactivada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Licencia de conducir desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando licencia de conducir:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
