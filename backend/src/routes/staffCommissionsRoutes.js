const express = require('express');
const router = express.Router();
const StaffCommissionService = require('../services/StaffCommissionService');

/**
 * ============================================================================
 * RUTAS: COMISIONES DE STAFF APONNT (Sistema Piramidal)
 * ============================================================================
 *
 * Endpoints para consultar comisiones piramidales del staff de ventas.
 *
 * Autor: Claude Code
 * Fecha: 2025-01-22
 */

/**
 * GET /api/aponnt/staff-commissions/:staffId
 * Obtener resumen completo de comisiones de un staff
 *
 * Query params:
 * - month: Mes (1-12) opcional
 * - year: Año opcional
 */
router.get('/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query;

    console.log(`📊 [API] Solicitud de comisiones para staff ${staffId}`);

    const summary = await StaffCommissionService.getStaffCommissionSummary(
      staffId,
      month ? parseInt(month) : null,
      year ? parseInt(year) : null
    );

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Staff no encontrado'
      });
    }

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Error obteniendo comisiones de staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo comisiones',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff-commissions/:staffId/pyramid
 * Calcular solo la comisión piramidal de un staff
 *
 * Query params:
 * - month: Mes (1-12) opcional
 * - year: Año opcional
 */
router.get('/:staffId/pyramid', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query;

    const pyramidCommission = await StaffCommissionService.calculatePyramidCommission(
      staffId,
      month ? parseInt(month) : null,
      year ? parseInt(year) : null
    );

    res.json({
      success: true,
      data: {
        staff_id: staffId,
        pyramid_commission_usd: pyramidCommission,
        period: {
          month: month ? parseInt(month) : null,
          year: year ? parseInt(year) : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Error calculando comisión piramidal:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculando comisión piramidal',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff-commissions/:staffId/subordinates
 * Obtener jerarquía completa de subordinados
 *
 * Query params:
 * - maxDepth: Profundidad máxima (default: 10)
 */
router.get('/:staffId/subordinates', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { maxDepth } = req.query;

    const subordinates = await StaffCommissionService.getStaffSubordinatesRecursive(
      staffId,
      maxDepth ? parseInt(maxDepth) : 10
    );

    res.json({
      success: true,
      data: {
        staff_id: staffId,
        subordinates_count: subordinates.length,
        subordinates
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo subordinados:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo subordinados',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff-commissions/:staffId/pyramid-percentage
 * Obtener porcentaje piramidal efectivo de un staff
 */
router.get('/:staffId/pyramid-percentage', async (req, res) => {
  try {
    const { staffId } = req.params;

    const percentage = await StaffCommissionService.getStaffPyramidPercentage(staffId);

    if (!percentage) {
      return res.status(404).json({
        success: false,
        message: 'Staff no encontrado'
      });
    }

    res.json({
      success: true,
      data: percentage
    });

  } catch (error) {
    console.error('❌ Error obteniendo % piramidal:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo % piramidal',
      error: error.message
    });
  }
});

/**
 * PUT /api/aponnt/staff-commissions/:staffId/pyramid-percentage
 * Actualizar override de porcentaje piramidal
 *
 * Body:
 * - percentage: Nuevo % (0-100) o null para usar % del rol
 */
router.put('/:staffId/pyramid-percentage', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { percentage } = req.body;

    if (percentage !== null && (isNaN(percentage) || percentage < 0 || percentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje debe ser un número entre 0 y 100, o null'
      });
    }

    const updated = await StaffCommissionService.updateStaffPyramidPercentageOverride(
      staffId,
      percentage
    );

    res.json({
      success: true,
      message: 'Porcentaje piramidal actualizado exitosamente',
      data: updated
    });

  } catch (error) {
    console.error('❌ Error actualizando % piramidal:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando % piramidal',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff-commissions/:staffId/projection
 * Obtener proyección de comisiones para el mes actual
 */
router.get('/:staffId/projection', async (req, res) => {
  try {
    const { staffId } = req.params;

    const projection = await StaffCommissionService.getMonthlyCommissionProjection(staffId);

    if (!projection) {
      return res.status(404).json({
        success: false,
        message: 'Staff no encontrado'
      });
    }

    res.json({
      success: true,
      data: projection
    });

  } catch (error) {
    console.error('❌ Error calculando proyección:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculando proyección',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff-commissions/team/summary
 * Obtener resumen de comisiones de todo el equipo de ventas
 *
 * Query params:
 * - country: Código ISO-2 (AR, BR, CL, etc.) opcional
 * - month: Mes (1-12) opcional
 * - year: Año opcional
 */
router.get('/team/summary', async (req, res) => {
  try {
    const { country, month, year } = req.query;

    const teamSummary = await StaffCommissionService.getSalesTeamCommissionsSummary(
      country || null,
      month ? parseInt(month) : null,
      year ? parseInt(year) : null
    );

    res.json({
      success: true,
      data: teamSummary
    });

  } catch (error) {
    console.error('❌ Error obteniendo resumen del equipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo resumen del equipo',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff-commissions/team/ranking
 * Obtener ranking de staff por comisiones totales
 *
 * Query params:
 * - month: Mes (1-12) opcional
 * - year: Año opcional
 * - limit: Cantidad de resultados (default: 10)
 */
router.get('/team/ranking', async (req, res) => {
  try {
    const { month, year, limit } = req.query;

    const ranking = await StaffCommissionService.getTopStaffByCommissions(
      month ? parseInt(month) : null,
      year ? parseInt(year) : null,
      limit ? parseInt(limit) : 10
    );

    res.json({
      success: true,
      data: {
        count: ranking.length,
        period: {
          month: month ? parseInt(month) : null,
          year: year ? parseInt(year) : null
        },
        ranking
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo ranking',
      error: error.message
    });
  }
});

module.exports = router;
