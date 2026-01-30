/**
 * COMPANY RESTORE ROUTES
 * API para restauración de empresas desde ZIP de export.
 *
 * SEGURIDAD EXTREMA:
 * - Solo staff nivel 0 (director/superadmin)
 * - Múltiples validaciones
 * - Audit trail completo
 *
 * @version 1.0.0
 * @date 2026-01-28
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CompanyDataRestoreService = require('../services/CompanyDataRestoreService');
const CompanyDataExportService = require('../services/CompanyDataExportService');

// Directorio para uploads temporales de ZIPs
const UPLOAD_DIR = path.join(__dirname, '../../uploads/restore-zips');

// Asegurar que existe el directorio
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de multer para subir ZIPs
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `restore_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos ZIP'));
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARES DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════════════════

// Middleware: Requiere autenticación de staff
function requireStaffAuth(req, res, next) {
  if (!req.staffUser && !req.user) {
    return res.status(401).json({ error: 'Autenticación de staff requerida' });
  }
  req.staffId = req.staffUser?.staff_id || req.staffUser?.id || req.user?.staffId || req.user?.id;
  req.staffLevel = req.staffUser?.level ?? req.user?.level;
  next();
}

// Middleware: Solo nivel director o superior (level 0)
function requireDirectorLevel(req, res, next) {
  const level = req.staffLevel;

  if (level === undefined || level === null || level > 0) {
    return res.status(403).json({
      error: 'Permiso denegado',
      message: `Se requiere nivel director o superior (level 0). Nivel actual: ${level ?? 'desconocido'}`,
      requiredLevel: 0
    });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/restore/candidates
 * Lista empresas candidatas para restauración (status = cancelled, offboarding_status = completed)
 */
router.get('/candidates', requireStaffAuth, requireDirectorLevel, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');

    const candidates = await sequelize.query(`
      SELECT
        c.company_id,
        c.name,
        c.slug,
        c.tax_id,
        c.status,
        c.offboarding_status,
        c.offboarding_confirmed_at,
        c.data_export_url,
        c.cancellation_reason,
        -- Verificar si tiene contrato nuevo
        (SELECT COUNT(*) FROM procurement_contracts pc
         WHERE pc.company_id = c.company_id
           AND pc.status = 'active'
           AND pc.start_date >= c.offboarding_confirmed_at) as has_new_contract
      FROM companies c
      WHERE c.status = 'cancelled'
        AND c.offboarding_status = 'completed'
      ORDER BY c.offboarding_confirmed_at DESC
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      count: candidates.length,
      candidates: candidates.map(c => ({
        ...c,
        has_new_contract: parseInt(c.has_new_contract) > 0,
        can_restore: parseInt(c.has_new_contract) > 0
      }))
    });
  } catch (error) {
    console.error('[Restore] Error listando candidatos:', error);
    res.status(500).json({ error: 'Error al listar candidatos', details: error.message });
  }
});

/**
 * POST /api/restore/:companyId/upload
 * Sube el archivo ZIP para restauración
 */
router.post('/:companyId/upload',
  requireStaffAuth,
  requireDirectorLevel,
  upload.single('zipFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió archivo ZIP' });
      }

      const companyId = parseInt(req.params.companyId);
      const zipPath = req.file.path;

      res.json({
        success: true,
        message: 'ZIP subido correctamente',
        companyId,
        zipPath,
        fileName: req.file.originalname,
        size: req.file.size,
        sizeMB: (req.file.size / 1024 / 1024).toFixed(2)
      });
    } catch (error) {
      console.error('[Restore] Error subiendo ZIP:', error);
      res.status(500).json({ error: 'Error al subir ZIP', details: error.message });
    }
  }
);

/**
 * POST /api/restore/:companyId/validate
 * Valida compatibilidad del ZIP sin ejecutar restauración
 */
router.post('/:companyId/validate', requireStaffAuth, requireDirectorLevel, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { zipPath } = req.body;

    if (!zipPath) {
      return res.status(400).json({ error: 'Se requiere zipPath' });
    }

    // Validar restauración completa
    const validation = await CompanyDataRestoreService.validateRestoration(
      companyId,
      req.staffId,
      zipPath
    );

    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('[Restore] Error validando:', error);
    res.status(500).json({ error: 'Error al validar', details: error.message });
  }
});

/**
 * POST /api/restore/:companyId/dry-run
 * Ejecuta simulación de restauración sin modificar datos
 */
router.post('/:companyId/dry-run', requireStaffAuth, requireDirectorLevel, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { zipPath } = req.body;

    if (!zipPath) {
      return res.status(400).json({ error: 'Se requiere zipPath' });
    }

    const result = await CompanyDataRestoreService.dryRun(
      companyId,
      req.staffId,
      zipPath
    );

    res.json({
      success: true,
      dryRun: true,
      result
    });
  } catch (error) {
    console.error('[Restore] Error en dry-run:', error);
    res.status(500).json({ error: 'Error en dry-run', details: error.message });
  }
});

/**
 * POST /api/restore/:companyId/execute
 * Ejecuta la restauración real (DESTRUCTIVO - borra datos actuales)
 */
router.post('/:companyId/execute', requireStaffAuth, requireDirectorLevel, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { zipPath, confirmationCode } = req.body;

    if (!zipPath) {
      return res.status(400).json({ error: 'Se requiere zipPath' });
    }

    if (!confirmationCode) {
      return res.status(400).json({
        error: 'Se requiere código de confirmación',
        message: 'Debe ingresar el CUIT completo de la empresa como código de confirmación'
      });
    }

    const result = await CompanyDataRestoreService.restoreFromZip(
      companyId,
      req.staffId,
      zipPath,
      confirmationCode
    );

    if (result.success) {
      // Limpiar ZIP temporal después de restauración exitosa
      try {
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
      } catch (e) { /* ignore */ }

      res.json({
        success: true,
        message: `Empresa ${companyId} restaurada exitosamente`,
        result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No se pudo completar la restauración',
        errors: result.errors,
        warnings: result.warnings
      });
    }
  } catch (error) {
    console.error('[Restore] Error ejecutando restauración:', error);
    res.status(500).json({ error: 'Error al restaurar', details: error.message });
  }
});

/**
 * POST /api/restore/:companyId/compatibility-check
 * Verifica compatibilidad de un ZIP sin validar permisos de empresa
 * (útil para pre-validación antes de subir)
 */
router.post('/:companyId/compatibility-check', requireStaffAuth, requireDirectorLevel, async (req, res) => {
  try {
    const { zipPath } = req.body;

    if (!zipPath) {
      return res.status(400).json({ error: 'Se requiere zipPath' });
    }

    if (!fs.existsSync(zipPath)) {
      return res.status(400).json({ error: 'Archivo no encontrado', zipPath });
    }

    const compatibility = await CompanyDataExportService.validateCompatibility(zipPath);

    res.json({
      success: true,
      compatibility
    });
  } catch (error) {
    console.error('[Restore] Error verificando compatibilidad:', error);
    res.status(500).json({ error: 'Error al verificar compatibilidad', details: error.message });
  }
});

/**
 * DELETE /api/restore/cleanup/:fileName
 * Elimina un ZIP temporal subido
 */
router.delete('/cleanup/:fileName', requireStaffAuth, requireDirectorLevel, async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(UPLOAD_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Archivo eliminado',
      fileName
    });
  } catch (error) {
    console.error('[Restore] Error eliminando archivo:', error);
    res.status(500).json({ error: 'Error al eliminar archivo', details: error.message });
  }
});

/**
 * GET /api/restore/history/:companyId
 * Historial de restauraciones de una empresa
 */
router.get('/history/:companyId', requireStaffAuth, requireDirectorLevel, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { sequelize } = require('../config/database');
    const { QueryTypes } = require('sequelize');

    const history = await sequelize.query(`
      SELECT
        e.id,
        e.event_type,
        e.triggered_by_staff_id,
        s.first_name || ' ' || s.last_name as staff_name,
        e.metadata,
        e.created_at
      FROM company_offboarding_events e
      LEFT JOIN aponnt_staff s ON s.staff_id = e.triggered_by_staff_id
      WHERE e.company_id = :companyId
        AND e.event_type = 'company_restored'
      ORDER BY e.created_at DESC
    `, { replacements: { companyId }, type: QueryTypes.SELECT });

    res.json({
      success: true,
      companyId,
      history
    });
  } catch (error) {
    console.error('[Restore] Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener historial', details: error.message });
  }
});

module.exports = router;
