const express = require('express');
const router = express.Router();
const { Sanction } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const SanctionWorkflowService = require('../services/SanctionWorkflowService');
const SuspensionBlockingService = require('../services/SuspensionBlockingService');

// Helper: Formatear sanción con alias para compatibilidad
function formatSanction(sanction) {
  const data = sanction.toJSON ? sanction.toJSON() : sanction;
  return {
    ...data,
    // Alias para compatibilidad con tests
    user_id: data.employee_id,
    type_id: data.sanction_type,
    date: data.sanction_date,
    issued_by: data.created_by
  };
}

// Middleware para roles que pueden gestionar sanciones
const canManageSanctions = authorize('admin', 'rrhh', 'supervisor');
const canReviewLegal = authorize('admin', 'legal');
const canConfirmHR = authorize('admin', 'rrhh');

/**
 * @route GET /api/v1/sanctions
 * @desc Obtener todas las sanciones de la empresa
 */
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.user?.companyId || 1;

    console.log(`🚨 [SANCTIONS] Obteniendo sanciones para empresa ${companyId}`);

    const sanctions = await Sanction.findAll({
      where: {
        company_id: companyId
      },
      order: [['sanction_date', 'DESC']]
    });

    // Calcular estadísticas
    const stats = {
      total: sanctions.length,
      active: sanctions.filter(s => s.status === 'active').length,
      major: sanctions.filter(s => s.severity === 'major' && s.status === 'active').length,
      appealed: sanctions.filter(s => s.status === 'appealed').length
    };

    console.log(`✅ [SANCTIONS] Encontradas ${sanctions.length} sanciones`);

    res.json({
      success: true,
      sanctions: sanctions.map(formatSanction),
      stats
    });

  } catch (error) {
    console.error('❌ [SANCTIONS] Error obteniendo sanciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS ESPECÍFICAS (DEBEN IR ANTES DE /:id para evitar conflictos)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route GET /api/v1/sanctions/stats
 * @desc Obtener estadísticas de sanciones (workflow v2)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/stats', auth, canManageSanctions, async (req, res) => {
    try {
        const companyId = req.user?.company_id;
        const periodDays = parseInt(req.query.period) || 30;

        console.log(`📊 [SANCTIONS-STATS] Requesting stats for company ${companyId}, period ${periodDays}`);

        const result = await SanctionWorkflowService.getSanctionStats(companyId, periodDays);

        if (!result.success) {
            console.error('❌ [SANCTIONS-STATS] Error:', result.error);
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS-STATS] Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/v1/sanctions/pending-review
 * @desc Obtener sanciones pendientes de revisión para el usuario actual
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/pending-review', auth, async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const userRole = req.user?.role;
        const companyId = req.user?.company_id;

        console.log(`📋 [SANCTIONS] Pending review for user ${userId}, role ${userRole}, company ${companyId}`);

        const result = await SanctionWorkflowService.getPendingReviews(userId, userRole, companyId);

        if (!result.success) {
            console.error('❌ [SANCTIONS] Error getting pending:', result.error);
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting pending reviews:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/v1/sanctions/types
 * @desc Obtener tipos de sanción disponibles
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/types', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id;
        const result = await SanctionWorkflowService.getSanctionTypes(companyId);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting types:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/v1/sanctions/blocks
 * @desc Obtener bloqueos de suspensión activos
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id
 */
router.get('/blocks', auth, canManageSanctions, async (req, res) => {
    try {
        const companyId = req.user?.company_id;
        const result = await SuspensionBlockingService.getActiveBlocks(companyId);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting blocks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS CON PARÁMETROS (DEBEN IR DESPUÉS de las rutas específicas)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route GET /api/v1/sanctions/:id
 * @desc Obtener sanción específica
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.user?.companyId || 1;
    const sanctionId = req.params.id;

    // Verificar que el ID es un número válido
    if (isNaN(parseInt(sanctionId))) {
      return res.status(400).json({
        error: 'ID de sanción inválido',
        success: false
      });
    }

    const sanction = await Sanction.findOne({
      where: {
        id: sanctionId,
        company_id: companyId
      }
    });

    if (!sanction) {
      return res.status(404).json({
        error: 'Sanción no encontrada',
        success: false
      });
    }

    res.json({
      success: true,
      sanction
    });

  } catch (error) {
    console.error('❌ [SANCTIONS] Error obteniendo sanción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route POST /api/v1/sanctions
 * @desc Crear nueva sanción
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      employee_id,
      employee_name,
      employee_department,
      sanction_type,
      severity,
      title,
      description,
      sanction_date,
      expiration_date,
      points_deducted,
      is_automatic
    } = req.body;

    const companyId = req.user?.company_id || req.user?.companyId || 1;
    const createdBy = req.user?.user_id || req.user?.id;

    console.log('🚨 [SANCTIONS] Creando sanción:', {
      employee_id,
      sanction_type,
      severity,
      companyId
    });

    if (!employee_id || !title || !description) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        success: false
      });
    }

    const sanctionData = {
      company_id: companyId,
      employee_id,
      employee_name: employee_name || 'Empleado',
      employee_department: employee_department || null,
      sanction_type: sanction_type || 'other',
      severity: severity || 'warning',
      title: title.trim(),
      description: description.trim(),
      sanction_date: sanction_date || new Date(),
      expiration_date: expiration_date || null,
      status: 'active',
      points_deducted: points_deducted || 0,
      is_automatic: is_automatic || false,
      created_by: createdBy
    };

    const sanction = await Sanction.create(sanctionData);

    console.log('✅ [SANCTIONS] Sanción creada exitosamente:', sanction.id);

    res.status(201).json({
      success: true,
      sanction,
      message: 'Sanción creada exitosamente'
    });

  } catch (error) {
    console.error('❌ [SANCTIONS] Error creando sanción:', error);

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/sanctions/:id
 * @desc Actualizar sanción
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      sanction_type,
      severity,
      title,
      description,
      sanction_date,
      expiration_date,
      status,
      points_deducted
    } = req.body;

    const companyId = req.user?.company_id || req.user?.companyId || 1;

    console.log('✏️ [SANCTIONS] Actualizando sanción:', req.params.id);

    const sanction = await Sanction.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!sanction) {
      return res.status(404).json({
        error: 'Sanción no encontrada',
        success: false
      });
    }

    const updateData = {};
    if (sanction_type !== undefined) updateData.sanction_type = sanction_type;
    if (severity !== undefined) updateData.severity = severity;
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (sanction_date !== undefined) updateData.sanction_date = sanction_date;
    if (expiration_date !== undefined) updateData.expiration_date = expiration_date;
    if (status !== undefined) updateData.status = status;
    if (points_deducted !== undefined) updateData.points_deducted = points_deducted;

    await sanction.update(updateData);

    console.log('✅ [SANCTIONS] Sanción actualizada exitosamente');

    res.json({
      success: true,
      sanction,
      message: 'Sanción actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ [SANCTIONS] Error actualizando sanción:', error);

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/sanctions/:id
 * @desc Eliminar sanción (cambiar a revoked)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.user?.companyId || 1;

    const sanction = await Sanction.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!sanction) {
      return res.status(404).json({
        error: 'Sanción no encontrada',
        success: false
      });
    }

    await sanction.update({ status: 'revoked' });

    console.log(`✅ [SANCTIONS] Sanción ${sanction.id} marcada como revocada`);

    res.json({
      success: true,
      message: 'Sanción revocada exitosamente'
    });

  } catch (error) {
    console.error('❌ [SANCTIONS] Error revocando sanción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW ENDPOINTS v2.0
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route GET /api/v1/sanctions/types
 * @desc Obtener tipos de sanción disponibles
 */
router.get('/types', auth, async (req, res) => {
    try {
        const companyId = req.user?.company_id;
        const result = await SanctionWorkflowService.getSanctionTypes(companyId);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting types:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/types
 * @desc Crear tipo de sanción personalizado
 */
router.post('/types', auth, canConfirmHR, async (req, res) => {
    try {
        const companyId = req.user?.company_id;
        const result = await SanctionWorkflowService.createSanctionType(companyId, req.body);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error creating type:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/request
 * @desc Crear solicitud de sanción con workflow
 */
router.post('/request', auth, canManageSanctions, async (req, res) => {
    try {
        const requesterId = req.user?.user_id;
        const requesterRole = req.user?.role;
        const ipAddress = req.ip;

        // Agregar company_id al body
        req.body.company_id = req.user?.company_id;

        const result = await SanctionWorkflowService.createSanctionRequest(
            req.body,
            requesterId,
            requesterRole,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error creating request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/:id/submit
 * @desc Enviar sanción a revisión
 */
router.post('/:id/submit', auth, canManageSanctions, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const actorId = req.user?.user_id;
        const actorRole = req.user?.role;
        const ipAddress = req.ip;

        // TODO: Verificar si empresa tiene módulo legal
        const companyHasLegalModule = true;

        const result = await SanctionWorkflowService.submitForReview(
            sanctionId,
            actorId,
            actorRole,
            companyHasLegalModule,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error submitting for review:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/:id/lawyer-approve
 * @desc Abogado aprueba sanción
 */
router.post('/:id/lawyer-approve', auth, canReviewLegal, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const lawyerId = req.user?.user_id;
        const { notes, delivery_method } = req.body;
        const ipAddress = req.ip;

        const result = await SanctionWorkflowService.lawyerApprove(
            sanctionId,
            lawyerId,
            notes,
            delivery_method || 'system',
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error lawyer approve:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/:id/lawyer-reject
 * @desc Abogado rechaza sanción
 */
router.post('/:id/lawyer-reject', auth, canReviewLegal, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const lawyerId = req.user?.user_id;
        const { rejection_reason } = req.body;
        const ipAddress = req.ip;

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar un motivo de rechazo'
            });
        }

        const result = await SanctionWorkflowService.lawyerReject(
            sanctionId,
            lawyerId,
            rejection_reason,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error lawyer reject:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/:id/lawyer-modify
 * @desc Abogado modifica descripción
 */
router.post('/:id/lawyer-modify', auth, canReviewLegal, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const lawyerId = req.user?.user_id;
        const { new_description, notes } = req.body;
        const ipAddress = req.ip;

        if (!new_description) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar la nueva descripción'
            });
        }

        const result = await SanctionWorkflowService.lawyerModifyDescription(
            sanctionId,
            lawyerId,
            new_description,
            notes,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error lawyer modify:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/:id/hr-confirm
 * @desc RRHH confirma y activa sanción
 */
router.post('/:id/hr-confirm', auth, canConfirmHR, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const hrUserId = req.user?.user_id;
        const { suspension_start_date, hr_notes } = req.body;
        const ipAddress = req.ip;

        const result = await SanctionWorkflowService.hrConfirm(
            sanctionId,
            hrUserId,
            suspension_start_date,
            hr_notes,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error HR confirm:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/:id/appeal
 * @desc Empleado registra apelación
 */
router.post('/:id/appeal', auth, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const employeeId = req.user?.user_id;
        const { appeal_notes } = req.body;
        const ipAddress = req.ip;

        if (!appeal_notes) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar el motivo de la apelación'
            });
        }

        const result = await SanctionWorkflowService.registerAppeal(
            sanctionId,
            employeeId,
            appeal_notes,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error registering appeal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/:id/resolve-appeal
 * @desc Resolver apelación
 */
router.post('/:id/resolve-appeal', auth, canConfirmHR, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const resolverId = req.user?.user_id;
        const { approved, resolution_notes } = req.body;
        const ipAddress = req.ip;

        if (approved === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Debe indicar si aprueba o rechaza la apelación'
            });
        }

        const result = await SanctionWorkflowService.resolveAppeal(
            sanctionId,
            resolverId,
            approved,
            resolution_notes,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error resolving appeal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/v1/sanctions/:id/history
 * @desc Obtener historial de una sanción
 */
router.get('/:id/history', auth, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const result = await SanctionWorkflowService.getSanctionHistory(sanctionId);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/v1/sanctions/:id/detail
 * @desc Obtener detalle completo de una sanción
 */
router.get('/:id/detail', auth, async (req, res) => {
    try {
        const sanctionId = parseInt(req.params.id);
        const companyId = req.user?.company_id;

        const result = await SanctionWorkflowService.getSanctionDetail(sanctionId, companyId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/v1/sanctions/employee/:userId/disciplinary-history
 * @desc Obtener historial disciplinario de un empleado
 */
router.get('/employee/:userId/disciplinary-history', auth, async (req, res) => {
    try {
        const employeeId = req.params.userId;
        const companyId = req.user?.company_id;

        const result = await SanctionWorkflowService.getEmployeeDisciplinaryHistory(
            employeeId,
            companyId
        );

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting disciplinary history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUSPENSION BLOCKING ENDPOINTS (Rutas adicionales con :id o específicas)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route GET /api/v1/sanctions/blocks/check/:employeeId
 * @desc Verificar si empleado tiene bloqueo activo
 */
router.get('/blocks/check/:employeeId', auth, async (req, res) => {
    try {
        const employeeId = req.params.employeeId;
        const companyId = req.user?.company_id;

        const result = await SuspensionBlockingService.checkActiveBlock(
            employeeId,
            companyId
        );

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error checking block:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/v1/sanctions/blocks/employee/:employeeId
 * @desc Obtener historial de bloqueos de un empleado
 */
router.get('/blocks/employee/:employeeId', auth, async (req, res) => {
    try {
        const employeeId = req.params.employeeId;
        const companyId = req.user?.company_id;

        const result = await SuspensionBlockingService.getEmployeeBlockHistory(
            employeeId,
            companyId
        );

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error getting employee blocks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/v1/sanctions/blocks/:id/deactivate
 * @desc Desactivar bloqueo manualmente
 */
router.post('/blocks/:id/deactivate', auth, canConfirmHR, async (req, res) => {
    try {
        const blockId = parseInt(req.params.id);
        const userId = req.user?.user_id;
        const { reason } = req.body;

        const result = await SuspensionBlockingService.deactivateBlock(
            blockId,
            userId,
            reason
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SANCTIONS] Error deactivating block:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
