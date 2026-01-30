/**
 * OFFBOARDING ROUTES
 * API REST para el proceso de baja de empresas.
 * Todos los endpoints requieren autenticación de staff Aponnt.
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const CompanyOffboardingService = require('../services/CompanyOffboardingService');
const CompanyDataPurgeService = require('../services/CompanyDataPurgeService');

// Middleware de autenticación staff Aponnt
function requireStaffAuth(req, res, next) {
  // Verificar que es staff autenticado
  if (!req.staffUser && !req.user) {
    return res.status(401).json({ error: 'Autenticación de staff requerida' });
  }
  req.staffId = req.staffUser?.id || req.user?.staffId || req.user?.id;
  req.staffRole = req.staffUser?.role || req.user?.role || '';
  next();
}

// Middleware de rol mínimo gerente (level <= 1 = gerente o superior)
function requireManagerRole(req, res, next) {
  const level = req.staffUser?.level ?? req.user?.level;

  if (level === undefined || level === null || level > 1) {
    return res.status(403).json({
      error: 'Permiso denegado',
      message: `Se requiere rol de gerente o superior. Nivel actual: ${level ?? 'desconocido'}`
    });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS DE CONSULTA
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/offboarding/companies-at-risk
 * Lista empresas con facturas vencidas > 30 días
 */
router.get('/companies-at-risk', requireStaffAuth, async (req, res) => {
  try {
    const companies = await CompanyOffboardingService.getCompaniesAtRisk();
    res.json({
      success: true,
      count: companies.length,
      companies
    });
  } catch (error) {
    console.error('❌ [Offboarding API] Error en companies-at-risk:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/offboarding/:companyId/status
 * Estado actual del proceso de offboarding + timeline
 */
router.get('/:companyId/status', requireStaffAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const status = await CompanyOffboardingService.getOffboardingStatus(parseInt(companyId));
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('❌ [Offboarding API] Error en status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/offboarding/events/:companyId
 * Timeline de todos los eventos del proceso
 */
router.get('/events/:companyId', requireStaffAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const status = await CompanyOffboardingService.getOffboardingStatus(parseInt(companyId));
    res.json({
      success: true,
      companyId: parseInt(companyId),
      events: status.timeline
    });
  } catch (error) {
    console.error('❌ [Offboarding API] Error en events:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/offboarding/:companyId/data-summary
 * Resumen de datos que serían borrados (dry-run)
 */
router.get('/:companyId/data-summary', requireStaffAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const summary = await CompanyDataPurgeService.getDataSummary(parseInt(companyId));
    res.json({
      success: true,
      companyId: parseInt(companyId),
      ...summary,
      preservedTables: CompanyDataPurgeService.getPreservedTables()
    });
  } catch (error) {
    console.error('❌ [Offboarding API] Error en data-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS DE ACCIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/offboarding/:companyId/initiate
 * Inicia proceso de baja manualmente
 */
router.post('/:companyId/initiate', requireStaffAuth, requireManagerRole, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { invoiceId, reason } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ error: 'invoiceId es requerido' });
    }

    const result = await CompanyOffboardingService.initiateWarning(
      parseInt(companyId),
      parseInt(invoiceId),
      req.staffId
    );

    res.json(result);
  } catch (error) {
    console.error('❌ [Offboarding API] Error en initiate:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/offboarding/:companyId/export
 * Fuerza generación de export
 */
router.post('/:companyId/export', requireStaffAuth, requireManagerRole, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await CompanyOffboardingService.initiateExport(
      parseInt(companyId),
      req.staffId
    );
    res.json(result);
  } catch (error) {
    console.error('❌ [Offboarding API] Error en export:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/offboarding/:companyId/confirm
 * Confirma baja definitiva → ejecuta purga
 * REQUIERE: rol >= gerente + confirmationCode (últimos 4 del CUIT)
 */
router.post('/:companyId/confirm', requireStaffAuth, requireManagerRole, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { reason, confirmationCode } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason es requerido' });
    }
    if (!confirmationCode) {
      return res.status(400).json({ error: 'confirmationCode es requerido (últimos 4 dígitos del CUIT)' });
    }

    const result = await CompanyOffboardingService.confirmOffboarding(
      parseInt(companyId),
      req.staffId,
      reason,
      confirmationCode
    );

    res.json(result);
  } catch (error) {
    console.error('❌ [Offboarding API] Error en confirm:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/offboarding/:companyId/cancel
 * Cancela proceso de offboarding (ej: cliente pagó)
 */
router.post('/:companyId/cancel', requireStaffAuth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason es requerido' });
    }

    const result = await CompanyOffboardingService.cancelOffboarding(
      parseInt(companyId),
      req.staffId,
      reason
    );

    res.json(result);
  } catch (error) {
    console.error('❌ [Offboarding API] Error en cancel:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/offboarding/:companyId/export/download
 * Descarga el ZIP de export (link temporal para archivo local)
 */
router.get('/:companyId/export/download', requireStaffAuth, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Buscar el archivo más reciente de export para esta empresa
    const exportsDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({ error: 'No hay exports disponibles' });
    }

    const files = fs.readdirSync(exportsDir)
      .filter(f => f.includes(`_${companyId}_`) || f.includes(`export_`))
      .sort()
      .reverse();

    // Buscar por companyId en nombre o por slug
    const { sequelize: sq } = require('../config/database');
    const { QueryTypes: QT } = require('sequelize');
    const [company] = await sq.query(
      'SELECT slug FROM companies WHERE company_id = :companyId',
      { replacements: { companyId: parseInt(companyId) }, type: QT.SELECT }
    );

    let targetFile = null;
    if (company) {
      targetFile = files.find(f => f.includes(company.slug));
    }
    if (!targetFile) {
      targetFile = files[0];
    }

    if (!targetFile) {
      return res.status(404).json({ error: 'Export no encontrado para esta empresa' });
    }

    const filePath = path.join(exportsDir, targetFile);
    res.download(filePath, targetFile);
  } catch (error) {
    console.error('❌ [Offboarding API] Error en download:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offboarding/:companyId/dry-run
 * Ejecuta un dry-run de la purga (cuenta registros sin borrar)
 */
router.post('/:companyId/dry-run', requireStaffAuth, requireManagerRole, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await CompanyDataPurgeService.dryRun(parseInt(companyId));
    res.json({
      success: true,
      companyId: parseInt(companyId),
      dryRun: true,
      ...result
    });
  } catch (error) {
    console.error('❌ [Offboarding API] Error en dry-run:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
