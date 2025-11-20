/**
 * =====================================================================
 * RUTAS: Vendor Commissions Routes (Sistema de Roles y Comisiones)
 * =====================================================================
 *
 * Nuevas rutas para el sistema de roles jerárquicos y comisiones piramidales.
 *
 * IMPORTANTE:
 * - Estas rutas SON NUEVAS, NO modifican rutas existentes
 * - Son 100% ADICIONALES a la funcionalidad existente
 * - NO rompen panel-empresa.html ni panel-administrativo.html
 *
 * Base Path: /api/vendors/*
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const VendorHierarchyService = require('../services/VendorHierarchyService');

// Middleware de autenticación Aponnt Staff (implementar según necesidad)
const requireAponntAuth = (req, res, next) => {
  // TODO: Implementar autenticación real cuando se integre con frontend
  // Por ahora solo pasa, ya que esto es backend-only
  next();
};

/**
 * GET /api/vendors/statistics/:vendorId
 * Obtiene estadísticas completas de un vendedor
 */
router.get('/statistics/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    const stats = await sequelize.query(
      `SELECT * FROM vendor_statistics WHERE vendor_id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (stats.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estadísticas no encontradas'
      });
    }

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Error getting vendor statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/companies/:vendorId
 * Obtiene empresas visibles para un vendedor según su rol
 */
router.get('/companies/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Obtener rol del vendedor
    const vendor = await sequelize.query(
      `SELECT role FROM aponnt_staff WHERE id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (vendor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }

    const { role } = vendor[0];

    // Obtener IDs de empresas visibles
    const visibleIds = await VendorHierarchyService.getVisibleCompanyIds(vendorId, role);

    // Si no tiene empresas visibles, devolver array vacío
    if (visibleIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Obtener datos completos de las empresas
    const companies = await sequelize.query(
      `SELECT company_id, name, slug, is_active, monthly_total,
              assigned_vendor_id, support_vendor_id,
              sales_commission_usd, support_commission_usd
       FROM companies
       WHERE company_id = ANY(:visibleIds)
       ORDER BY name ASC`,
      {
        replacements: { visibleIds },
        type: QueryTypes.SELECT
      }
    );

    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error getting vendor companies:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empresas',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/subordinates/:vendorId
 * Obtiene subordinados de un vendedor según su rol
 */
router.get('/subordinates/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Obtener rol del vendedor
    const vendor = await sequelize.query(
      `SELECT role FROM aponnt_staff WHERE id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (vendor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }

    const { role } = vendor[0];

    // Obtener IDs de subordinados
    const subordinateIds = await VendorHierarchyService.getSubordinateIds(vendorId, role);

    // Si no tiene subordinados, devolver array vacío
    if (subordinateIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Obtener datos completos de los subordinados
    const subordinates = await sequelize.query(
      `SELECT id, first_name, last_name, email, role, is_active
       FROM aponnt_staff
       WHERE id = ANY(:subordinateIds)
       ORDER BY first_name ASC, last_name ASC`,
      {
        replacements: { subordinateIds },
        type: QueryTypes.SELECT
      }
    );

    res.json({ success: true, data: subordinates });
  } catch (error) {
    console.error('Error getting vendor subordinates:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener subordinados',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/commission-summary/:vendorId
 * Obtiene resumen de comisiones de un vendedor (usa función PostgreSQL)
 */
router.get('/commission-summary/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { month, year } = req.query;

    const summary = await sequelize.query(
      `SELECT * FROM get_staff_commission_summary(:vendorId, :month, :year)`,
      {
        replacements: {
          vendorId,
          month: month || null,
          year: year || null
        },
        type: QueryTypes.SELECT
      }
    );

    if (summary.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado o sin comisiones'
      });
    }

    res.json({ success: true, data: summary[0] });
  } catch (error) {
    console.error('Error getting commission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de comisiones',
      error: error.message
    });
  }
});

/**
 * POST /api/vendors/refresh-statistics/:vendorId
 * Recalcula estadísticas de un vendedor (llamando a función PostgreSQL)
 */
router.post('/refresh-statistics/:vendorId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;

    await sequelize.query(
      `SELECT refresh_vendor_statistics(:vendorId)`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    // Obtener estadísticas actualizadas
    const stats = await sequelize.query(
      `SELECT * FROM vendor_statistics WHERE vendor_id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      message: 'Estadísticas actualizadas correctamente',
      data: stats[0] || null
    });
  } catch (error) {
    console.error('Error refreshing vendor statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estadísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/can-view-company/:vendorId/:companyId
 * Verifica si un vendedor puede ver una empresa específica
 */
router.get('/can-view-company/:vendorId/:companyId', requireAponntAuth, async (req, res) => {
  try {
    const { vendorId, companyId } = req.params;

    // Obtener rol del vendedor
    const vendor = await sequelize.query(
      `SELECT role FROM aponnt_staff WHERE id = :vendorId`,
      {
        replacements: { vendorId },
        type: QueryTypes.SELECT
      }
    );

    if (vendor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor no encontrado'
      });
    }

    const { role } = vendor[0];

    // Verificar permiso
    const canView = await VendorHierarchyService.canViewCompany(vendorId, role, parseInt(companyId));

    res.json({ success: true, canView });
  } catch (error) {
    console.error('Error checking company access:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso',
      error: error.message
    });
  }
});

module.exports = router;
