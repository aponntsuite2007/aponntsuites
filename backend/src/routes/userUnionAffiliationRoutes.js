const express = require('express');
const router = express.Router();
const { UserUnionAffiliation, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/users/:userId/union-affiliation
 * @desc Obtener toda la información de afiliación sindical de un usuario
 * @access Private
 */
router.get('/:userId/union-affiliation', auth, async (req, res) => {
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

    // Solo supervisores/admins o el propio usuario pueden ver su afiliación
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    const affiliation = await UserUnionAffiliation.findAll({
      where: {
        userId: userId,
        companyId: req.user.companyId
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: affiliation.length,
      data: affiliation
    });

  } catch (error) {
    console.error('Error obteniendo afiliación sindical:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/users/:userId/union-affiliation/:affiliationId
 * @desc Obtener una afiliación sindical específica
 * @access Private
 */
router.get('/:userId/union-affiliation/:affiliationId', auth, async (req, res) => {
  try {
    const { userId, affiliationId } = req.params;

    // Solo supervisores/admins o el propio usuario pueden ver su afiliación
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.user_id !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    const affiliation = await UserUnionAffiliation.findOne({
      where: {
        id: affiliationId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!affiliation) {
      return res.status(404).json({
        error: 'Afiliación sindical no encontrada'
      });
    }

    res.json({
      success: true,
      data: affiliation
    });

  } catch (error) {
    console.error('Error obteniendo afiliación sindical:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:userId/union-affiliation
 * @desc Crear nueva afiliación sindical para un usuario
 * @access Private (supervisorOrAdmin)
 */
router.post('/:userId/union-affiliation', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      unionName,
      unionFullName,
      unionCuit,
      membershipNumber,
      affiliationDate,
      resignationDate,
      delegateRole,
      delegateStartDate,
      delegateEndDate,
      sectionOrBranch,
      workplaceDelegate,
      hasFueroSindical,
      fueroStartDate,
      fueroEndDate,
      monthlyDues,
      duesPaymentMethod,
      lastPaymentDate,
      unionPhone,
      unionEmail,
      unionAddress,
      unionDelegateContact,
      membershipCardUrl,
      certificateUrl,
      benefits,
      notes
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
    if (!unionName || !affiliationDate) {
      return res.status(400).json({
        error: 'El nombre del sindicato y la fecha de afiliación son obligatorios'
      });
    }

    // Validar duesPaymentMethod si viene
    if (duesPaymentMethod && !['descuento_automatico', 'transferencia', 'efectivo', 'debito'].includes(duesPaymentMethod)) {
      return res.status(400).json({
        error: 'Método de pago de cuota inválido'
      });
    }

    // Validar delegateRole si viene
    if (delegateRole && !['delegado', 'subdelegado', 'miembro_comision', 'afiliado_simple'].includes(delegateRole)) {
      return res.status(400).json({
        error: 'Rol de delegado inválido. Debe ser: delegado, subdelegado, miembro_comision o afiliado_simple'
      });
    }

    // Crear nueva afiliación sindical
    const newAffiliation = await UserUnionAffiliation.create({
      userId: userId,
      companyId: req.user.companyId,
      unionName,
      unionFullName,
      unionCuit,
      membershipNumber,
      affiliationDate,
      resignationDate,
      isActive: resignationDate ? false : true,
      delegateRole,
      delegateStartDate,
      delegateEndDate,
      sectionOrBranch,
      workplaceDelegate: workplaceDelegate || false,
      hasFueroSindical: hasFueroSindical || false,
      fueroStartDate,
      fueroEndDate,
      monthlyDues,
      duesPaymentMethod,
      lastPaymentDate,
      unionPhone,
      unionEmail,
      unionAddress,
      unionDelegateContact,
      membershipCardUrl,
      certificateUrl,
      benefits,
      notes
    });

    console.log(`✅ [UNION-AFFILIATION] Afiliación sindical creada para usuario ${userId} - Sindicato: ${unionName}`);

    res.status(201).json({
      success: true,
      message: 'Afiliación sindical creada exitosamente',
      data: newAffiliation
    });

  } catch (error) {
    console.error('Error creando afiliación sindical:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:userId/union-affiliation/:affiliationId
 * @desc Actualizar afiliación sindical
 * @access Private (supervisorOrAdmin)
 */
router.put('/:userId/union-affiliation/:affiliationId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, affiliationId } = req.params;

    const affiliation = await UserUnionAffiliation.findOne({
      where: {
        id: affiliationId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!affiliation) {
      return res.status(404).json({
        error: 'Afiliación sindical no encontrada'
      });
    }

    const updateData = { ...req.body };

    // Validar duesPaymentMethod si viene en el update
    if (updateData.duesPaymentMethod && !['descuento_automatico', 'transferencia', 'efectivo', 'debito'].includes(updateData.duesPaymentMethod)) {
      return res.status(400).json({
        error: 'Método de pago de cuota inválido'
      });
    }

    // Validar delegateRole si viene en el update
    if (updateData.delegateRole && !['delegado', 'subdelegado', 'miembro_comision', 'afiliado_simple'].includes(updateData.delegateRole)) {
      return res.status(400).json({
        error: 'Rol de delegado inválido'
      });
    }

    // Si se establece fecha de renuncia, marcar como inactivo
    if (updateData.resignationDate) {
      updateData.isActive = false;
    }

    await affiliation.update(updateData);

    console.log(`✅ [UNION-AFFILIATION] Afiliación sindical ${affiliationId} actualizada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Afiliación sindical actualizada exitosamente',
      data: affiliation
    });

  } catch (error) {
    console.error('Error actualizando afiliación sindical:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/users/:userId/union-affiliation/:affiliationId
 * @desc Eliminar (soft delete) afiliación sindical
 * @access Private (supervisorOrAdmin)
 */
router.delete('/:userId/union-affiliation/:affiliationId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, affiliationId } = req.params;

    const affiliation = await UserUnionAffiliation.findOne({
      where: {
        id: affiliationId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!affiliation) {
      return res.status(404).json({
        error: 'Afiliación sindical no encontrada'
      });
    }

    // Soft delete: marcar como inactiva y registrar fecha de renuncia
    await affiliation.update({
      isActive: false,
      resignationDate: new Date()
    });

    console.log(`✅ [UNION-AFFILIATION] Afiliación sindical ${affiliationId} desactivada para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Afiliación sindical desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando afiliación sindical:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
