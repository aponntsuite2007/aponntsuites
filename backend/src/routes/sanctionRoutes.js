const express = require('express');
const router = express.Router();
const { Sanction } = require('../config/database');
const { auth } = require('../middleware/auth');

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
      sanctions,
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

/**
 * @route GET /api/v1/sanctions/:id
 * @desc Obtener sanción específica
 */
router.get('/:id', auth, async (req, res) => {
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

module.exports = router;
