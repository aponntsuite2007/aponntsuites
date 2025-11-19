const express = require('express');
const router = express.Router();
const { UserProfessionalLicense, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/users/:userId/professional-licenses
 * @desc Obtener todas las licencias profesionales de un usuario
 * @access Private
 */
router.get('/:userId/professional-licenses', auth, async (req, res) => {
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

    const licenses = await UserProfessionalLicense.findAll({
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
    console.error('Error obteniendo licencias profesionales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/users/:userId/professional-licenses/:licenseId
 * @desc Obtener una licencia profesional específica
 * @access Private
 */
router.get('/:userId/professional-licenses/:licenseId', auth, async (req, res) => {
  try {
    const { userId, licenseId } = req.params;

    // Solo supervisores/admins o el propio usuario pueden ver sus licencias
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    const license = await UserProfessionalLicense.findOne({
      where: {
        id: licenseId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!license) {
      return res.status(404).json({
        error: 'Licencia profesional no encontrada'
      });
    }

    res.json({
      success: true,
      data: license
    });

  } catch (error) {
    console.error('Error obteniendo licencia profesional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:userId/professional-licenses
 * @desc Crear nueva licencia profesional para un usuario
 * @access Private (supervisorOrAdmin)
 */
router.post('/:userId/professional-licenses', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      licenseName,
      profession,
      licenseNumber,
      issuingBody,
      issuingCountry,
      jurisdiction,
      issueDate,
      expiryDate,
      certificateUrl,
      verificationUrl,
      requiresRenewal,
      renewalFrequency,
      lastRenewalDate,
      specializations,
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
    if (!licenseName || !profession) {
      return res.status(400).json({
        error: 'El nombre de la licencia y la profesión son obligatorios'
      });
    }

    // Validar renewalFrequency si viene
    if (renewalFrequency && !['anual', 'bienal', 'quinquenal', 'decenal'].includes(renewalFrequency)) {
      return res.status(400).json({
        error: 'Frecuencia de renovación inválida'
      });
    }

    // Crear nueva licencia
    const newLicense = await UserProfessionalLicense.create({
      userId: userId,
      companyId: req.user.companyId,
      licenseName,
      profession,
      licenseNumber,
      issuingBody,
      issuingCountry: issuingCountry || 'Argentina',
      jurisdiction,
      issueDate,
      expiryDate,
      certificateUrl,
      verificationUrl,
      isActive: true,
      requiresRenewal: requiresRenewal !== undefined ? requiresRenewal : true,
      renewalFrequency,
      lastRenewalDate,
      isSuspended: false,
      specializations,
      observations
    });

    console.log(`✅ [PROFESSIONAL-LICENSE] Licencia profesional creada para usuario ${userId} - ${profession}`);

    res.status(201).json({
      success: true,
      message: 'Licencia profesional creada exitosamente',
      data: newLicense
    });

  } catch (error) {
    console.error('Error creando licencia profesional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:userId/professional-licenses/:licenseId
 * @desc Actualizar licencia profesional
 * @access Private (supervisorOrAdmin)
 */
router.put('/:userId/professional-licenses/:licenseId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, licenseId } = req.params;

    const license = await UserProfessionalLicense.findOne({
      where: {
        id: licenseId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!license) {
      return res.status(404).json({
        error: 'Licencia profesional no encontrada'
      });
    }

    const updateData = { ...req.body };

    // Validar renewalFrequency si viene en el update
    if (updateData.renewalFrequency && !['anual', 'bienal', 'quinquenal', 'decenal'].includes(updateData.renewalFrequency)) {
      return res.status(400).json({
        error: 'Frecuencia de renovación inválida'
      });
    }

    await license.update(updateData);

    console.log(`✅ [PROFESSIONAL-LICENSE] Licencia ${licenseId} actualizada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Licencia profesional actualizada exitosamente',
      data: license
    });

  } catch (error) {
    console.error('Error actualizando licencia profesional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/users/:userId/professional-licenses/:licenseId
 * @desc Eliminar (soft delete) licencia profesional
 * @access Private (supervisorOrAdmin)
 */
router.delete('/:userId/professional-licenses/:licenseId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, licenseId } = req.params;

    const license = await UserProfessionalLicense.findOne({
      where: {
        id: licenseId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!license) {
      return res.status(404).json({
        error: 'Licencia profesional no encontrada'
      });
    }

    // Soft delete: marcar como inactiva en lugar de eliminar
    await license.update({ isActive: false });

    console.log(`✅ [PROFESSIONAL-LICENSE] Licencia ${licenseId} desactivada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Licencia profesional desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando licencia profesional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
