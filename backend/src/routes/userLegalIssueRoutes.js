const express = require('express');
const router = express.Router();
const { UserLegalIssue, User } = require('../config/database');
const { auth, supervisorOrAdmin } = require('../middleware/auth');

/**
 * @route GET /api/v1/users/:userId/legal-issues
 * @desc Obtener todos los asuntos legales de un usuario
 * @access Private (supervisorOrAdmin - información sensible)
 */
router.get('/:userId/legal-issues', auth, supervisorOrAdmin, async (req, res) => {
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

    const legalIssues = await UserLegalIssue.findAll({
      where: {
        userId: userId,
        companyId: req.user.companyId
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: legalIssues.length,
      data: legalIssues
    });

  } catch (error) {
    console.error('Error obteniendo asuntos legales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/users/:userId/legal-issues/:issueId
 * @desc Obtener un asunto legal específico
 * @access Private (supervisorOrAdmin)
 */
router.get('/:userId/legal-issues/:issueId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, issueId } = req.params;

    const legalIssue = await UserLegalIssue.findOne({
      where: {
        id: issueId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!legalIssue) {
      return res.status(404).json({
        error: 'Asunto legal no encontrado'
      });
    }

    res.json({
      success: true,
      data: legalIssue
    });

  } catch (error) {
    console.error('Error obteniendo asunto legal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:userId/legal-issues
 * @desc Crear nuevo asunto legal para un usuario
 * @access Private (supervisorOrAdmin - información sensible)
 */
router.post('/:userId/legal-issues', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      issueType,
      issueSubtype,
      caseNumber,
      court,
      jurisdiction,
      filingDate,
      resolutionDate,
      lastHearingDate,
      nextHearingDate,
      status,
      description,
      plaintiff,
      defendant,
      outcome,
      sentenceDetails,
      fineAmount,
      affectsEmployment,
      employmentRestrictionDetails,
      documentUrl,
      notes,
      isConfidential
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
    if (!issueType || !['penal', 'civil', 'laboral', 'comercial', 'administrativo', 'otro'].includes(issueType)) {
      return res.status(400).json({
        error: 'Tipo de asunto inválido. Debe ser: penal, civil, laboral, comercial, administrativo u otro'
      });
    }

    if (status && !['en_tramite', 'resuelto', 'archivado', 'desestimado', 'apelacion', 'ejecutoria'].includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido'
      });
    }

    // Crear nuevo asunto legal
    const newLegalIssue = await UserLegalIssue.create({
      userId: userId,
      companyId: req.user.companyId,
      issueType,
      issueSubtype,
      caseNumber,
      court,
      jurisdiction,
      filingDate,
      resolutionDate,
      lastHearingDate,
      nextHearingDate,
      status: status || 'en_tramite',
      description,
      plaintiff,
      defendant,
      outcome,
      sentenceDetails,
      fineAmount,
      affectsEmployment: affectsEmployment || false,
      employmentRestrictionDetails,
      documentUrl,
      notes,
      isConfidential: isConfidential || false
    });

    console.log(`✅ [LEGAL-ISSUE] Asunto legal creado para usuario ${userId} - Tipo: ${issueType}`);

    res.status(201).json({
      success: true,
      message: 'Asunto legal creado exitosamente',
      data: newLegalIssue
    });

  } catch (error) {
    console.error('Error creando asunto legal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:userId/legal-issues/:issueId
 * @desc Actualizar asunto legal
 * @access Private (supervisorOrAdmin)
 */
router.put('/:userId/legal-issues/:issueId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, issueId } = req.params;

    const legalIssue = await UserLegalIssue.findOne({
      where: {
        id: issueId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!legalIssue) {
      return res.status(404).json({
        error: 'Asunto legal no encontrado'
      });
    }

    const updateData = { ...req.body };

    // Validar issueType si viene en el update
    if (updateData.issueType && !['penal', 'civil', 'laboral', 'comercial', 'administrativo', 'otro'].includes(updateData.issueType)) {
      return res.status(400).json({
        error: 'Tipo de asunto inválido'
      });
    }

    // Validar status si viene en el update
    if (updateData.status && !['en_tramite', 'resuelto', 'archivado', 'desestimado', 'apelacion', 'ejecutoria'].includes(updateData.status)) {
      return res.status(400).json({
        error: 'Estado inválido'
      });
    }

    await legalIssue.update(updateData);

    console.log(`✅ [LEGAL-ISSUE] Asunto legal ${issueId} actualizado para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Asunto legal actualizado exitosamente',
      data: legalIssue
    });

  } catch (error) {
    console.error('Error actualizando asunto legal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/users/:userId/legal-issues/:issueId
 * @desc Eliminar (hard delete) asunto legal
 * @access Private (supervisorOrAdmin)
 * @note Hard delete debido a la naturaleza sensible de la información
 */
router.delete('/:userId/legal-issues/:issueId', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { userId, issueId } = req.params;

    const legalIssue = await UserLegalIssue.findOne({
      where: {
        id: issueId,
        userId: userId,
        companyId: req.user.companyId
      }
    });

    if (!legalIssue) {
      return res.status(404).json({
        error: 'Asunto legal no encontrado'
      });
    }

    // Hard delete por razones de privacidad
    await legalIssue.destroy();

    console.log(`✅ [LEGAL-ISSUE] Asunto legal ${issueId} eliminado para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Asunto legal eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando asunto legal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
