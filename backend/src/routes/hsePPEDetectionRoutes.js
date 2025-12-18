/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HSE PPE DETECTION ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * API para detección de EPP con IA (Azure Custom Vision) y casos HSE.
 * Complementa hseRoutes.js con funcionalidades de:
 * - Detección automática de EPP
 * - Casos de accidentes/enfermedades laborales
 * - Regulaciones por país
 * - Correlación violaciones/accidentes
 */

const express = require('express');
const router = express.Router();
const { createHSEServices } = require('../services/hse');

// Servicios HSE (se inicializan con la BD)
let hseServices = null;

/**
 * Middleware para inicializar servicios
 */
router.use((req, res, next) => {
  if (!hseServices && req.app.get('database')) {
    hseServices = createHSEServices(req.app.get('database'), {
      notificationService: req.app.get('notificationService')
    });
    console.log('[HSE-AI] Servicios de detección EPP inicializados');
  }
  req.hse = hseServices;
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE VIOLACIONES (SSOT)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/hse/ai/violations/catalog
 * Obtener catálogo completo de violaciones
 */
router.get('/violations/catalog', async (req, res) => {
  try {
    const { category, forAI, forMedical } = req.query;

    const catalog = await req.hse.violationCatalog.getCatalog({
      category,
      forAI: forAI === 'true',
      forMedical: forMedical === 'true'
    });

    res.json({
      success: true,
      count: catalog.length,
      catalog
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo catálogo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/violations/catalog/grouped
 * Obtener catálogo agrupado por categoría
 */
router.get('/violations/catalog/grouped', async (req, res) => {
  try {
    const grouped = await req.hse.violationCatalog.getCatalogGrouped({
      forMedical: req.query.forMedical === 'true'
    });

    res.json({
      success: true,
      categories: grouped
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo catálogo agrupado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/violations/suggest
 * Sugerir violaciones basadas en CIE-10 o ubicación del cuerpo
 */
router.get('/violations/suggest', async (req, res) => {
  try {
    const { cie10, bodyLocation } = req.query;

    let suggestions = [];

    if (cie10) {
      suggestions = await req.hse.violationCatalog.getRelatedToCIE10(cie10);
    } else if (bodyLocation) {
      suggestions = await req.hse.violationCatalog.getRelatedToBodyLocation(bodyLocation);
    }

    res.json({
      success: true,
      query: { cie10, bodyLocation },
      count: suggestions.length,
      suggestions
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo sugerencias:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/violations/ai-tags
 * Obtener mapeo de tags para Azure Custom Vision
 */
router.get('/violations/ai-tags', async (req, res) => {
  try {
    const tags = await req.hse.violationCatalog.getAIModelTags();

    res.json({
      success: true,
      count: Object.keys(tags).length,
      tags
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo tags IA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REGULACIONES POR PAÍS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/hse/ai/regulations
 * Obtener todas las regulaciones
 */
router.get('/regulations', async (req, res) => {
  try {
    const regulations = await req.hse.countryRegulation.getAllRegulations();

    res.json({
      success: true,
      count: regulations.length,
      regulations
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo regulaciones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/regulations/:countryCode
 * Obtener regulación por país
 */
router.get('/regulations/:countryCode', async (req, res) => {
  try {
    const regulation = await req.hse.countryRegulation.getByCountry(req.params.countryCode);

    res.json({
      success: true,
      regulation
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo regulación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/regulations/:countryCode/consent-document
 * Generar documento de consentimiento para un país
 */
router.get('/regulations/:countryCode/consent-document', async (req, res) => {
  try {
    const companyName = req.query.companyName || 'La Empresa';
    const document = await req.hse.countryRegulation.getConsentDocument(
      req.params.countryCode,
      companyName
    );

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('[HSE-AI] Error generando documento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSENTIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/hse/ai/consents/status/:companyId
 * Obtener estado de consentimiento de empleados
 */
router.get('/consents/status/:companyId', async (req, res) => {
  try {
    const status = await req.hse.countryRegulation.getCompanyConsentStatus(
      parseInt(req.params.companyId)
    );

    const summary = {
      total: status.length,
      active: status.filter(s => s.consent_status === 'ACTIVE').length,
      pending: status.filter(s => s.consent_status === 'NOT_REQUESTED').length,
      denied: status.filter(s => s.consent_status === 'DENIED').length,
      expired: status.filter(s => s.consent_status === 'EXPIRED').length,
      revoked: status.filter(s => s.consent_status === 'REVOKED').length
    };

    res.json({
      success: true,
      summary,
      employees: status
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo estado de consentimientos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hse/ai/consents/register
 * Registrar consentimiento de empleado
 */
router.post('/consents/register', async (req, res) => {
  try {
    const { employeeId, companyId, consentGiven, documentVersion, ipAddress } = req.body;

    const consent = await req.hse.countryRegulation.registerConsent(
      employeeId,
      companyId,
      {
        consentGiven,
        documentVersion,
        ipAddress: ipAddress || req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      success: true,
      consent
    });
  } catch (error) {
    console.error('[HSE-AI] Error registrando consentimiento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓN DE EPP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/hse/ai/ppe/status
 * Verificar estado del servicio de detección
 */
router.get('/ppe/status', async (req, res) => {
  try {
    const isConfigured = req.hse.ppeDetection.isAzureConfigured();

    res.json({
      success: true,
      azureConfigured: isConfigured,
      message: isConfigured
        ? 'Azure Custom Vision configurado correctamente'
        : 'Azure Custom Vision no configurado. Revisar variables de entorno: AZURE_CV_PREDICTION_ENDPOINT, AZURE_CV_PREDICTION_KEY, AZURE_CV_PROJECT_ID'
    });
  } catch (error) {
    console.error('[HSE-AI] Error verificando estado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hse/ai/ppe/detect
 * Detectar EPP en imagen
 */
router.post('/ppe/detect', async (req, res) => {
  try {
    const { imageUrl, imageBase64, companyId, branchId, zoneCode, employeeId, cameraId } = req.body;

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere imageUrl o imageBase64'
      });
    }

    const image = imageUrl || Buffer.from(imageBase64, 'base64');

    const result = await req.hse.ppeDetection.detectPPE(image, {
      companyId,
      branchId,
      zoneCode,
      employeeId,
      cameraId
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[HSE-AI] Error en detección:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/ppe/detections
 * Obtener historial de detecciones
 */
router.get('/ppe/detections', async (req, res) => {
  try {
    const detections = await req.hse.ppeDetection.getDetectionHistory({
      companyId: parseInt(req.query.companyId),
      branchId: req.query.branchId ? parseInt(req.query.branchId) : null,
      employeeId: req.query.employeeId ? parseInt(req.query.employeeId) : null,
      zoneName: req.query.zoneName,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      hasViolations: req.query.hasViolations === 'true' ? true : (req.query.hasViolations === 'false' ? false : undefined),
      status: req.query.status,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    });

    res.json({
      success: true,
      count: detections.length,
      detections
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo detecciones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/ppe/statistics
 * Obtener estadísticas de EPP
 */
router.get('/ppe/statistics', async (req, res) => {
  try {
    const stats = await req.hse.ppeDetection.getStatistics(
      parseInt(req.query.companyId),
      {
        branchId: req.query.branchId ? parseInt(req.query.branchId) : null,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    );

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CASOS HSE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/hse/ai/cases
 * Crear caso HSE desde certificado médico
 */
router.post('/cases', async (req, res) => {
  try {
    const userId = req.user?.id;
    const hseCase = await req.hse.caseService.createFromMedicalCertificate(req.body, userId);

    res.status(201).json({
      success: true,
      case: hseCase
    });
  } catch (error) {
    console.error('[HSE-AI] Error creando caso:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/cases/:caseId
 * Obtener caso por ID
 */
router.get('/cases/:caseId', async (req, res) => {
  try {
    const hseCase = await req.hse.caseService.getCaseById(req.params.caseId);

    if (!hseCase) {
      return res.status(404).json({
        success: false,
        error: 'Caso no encontrado'
      });
    }

    res.json({
      success: true,
      case: hseCase
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo caso:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/cases/pending/:companyId
 * Obtener casos pendientes
 */
router.get('/cases/pending/:companyId', async (req, res) => {
  try {
    const cases = await req.hse.caseService.getPendingCases(
      parseInt(req.params.companyId),
      {
        branchId: req.query.branchId ? parseInt(req.query.branchId) : null,
        assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : null,
        status: req.query.status,
        severity: req.query.severity,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      }
    );

    res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo casos pendientes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hse/ai/cases/:caseId/assign
 * Asignar caso a responsable
 */
router.post('/cases/:caseId/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const userId = req.user?.id;

    const hseCase = await req.hse.caseService.assignCase(
      req.params.caseId,
      assignedTo,
      userId
    );

    res.json({
      success: true,
      case: hseCase
    });
  } catch (error) {
    console.error('[HSE-AI] Error asignando caso:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hse/ai/cases/:caseId/verdict
 * Registrar dictamen de investigación
 */
router.post('/cases/:caseId/verdict', async (req, res) => {
  try {
    const userId = req.user?.id;

    const hseCase = await req.hse.caseService.registerVerdict(
      req.params.caseId,
      req.body,
      userId
    );

    res.json({
      success: true,
      case: hseCase
    });
  } catch (error) {
    console.error('[HSE-AI] Error registrando dictamen:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hse/ai/cases/:caseId/close
 * Cerrar caso HSE
 */
router.post('/cases/:caseId/close', async (req, res) => {
  try {
    const { closingNotes } = req.body;
    const userId = req.user?.id;

    const hseCase = await req.hse.caseService.closeCase(
      req.params.caseId,
      closingNotes,
      userId
    );

    res.json({
      success: true,
      case: hseCase
    });
  } catch (error) {
    console.error('[HSE-AI] Error cerrando caso:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/cases/statistics/:companyId
 * Obtener estadísticas de casos
 */
router.get('/cases/statistics/:companyId', async (req, res) => {
  try {
    const stats = await req.hse.caseService.getCaseStatistics(
      parseInt(req.params.companyId),
      {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    );

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hse/ai/cases/correlation/:companyId
 * Obtener correlación violaciones EPP vs accidentes
 */
router.get('/cases/correlation/:companyId', async (req, res) => {
  try {
    const periodDays = parseInt(req.query.periodDays) || 90;

    const correlation = await req.hse.caseService.getViolationAccidentCorrelation(
      parseInt(req.params.companyId),
      periodDays
    );

    res.json({
      success: true,
      periodDays,
      correlation
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo correlación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ZONAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/hse/ai/zones/:companyId
 * Obtener configuración de zonas para detección IA
 */
router.get('/zones/:companyId', async (req, res) => {
  try {
    const db = req.app.get('database');
    const query = `
      SELECT z.*, array_length(z.required_ppe_codes, 1) as ppe_count
      FROM hse_zone_configurations z
      WHERE company_id = $1 AND is_active = true
      ORDER BY zone_name
    `;
    const result = await db.query(query, [parseInt(req.params.companyId)]);

    res.json({
      success: true,
      count: result.rows.length,
      zones: result.rows
    });
  } catch (error) {
    console.error('[HSE-AI] Error obteniendo zonas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hse/ai/zones
 * Crear/actualizar configuración de zona para detección IA
 */
router.post('/zones', async (req, res) => {
  try {
    const db = req.app.get('database');
    const {
      companyId, branchId, zoneCode, zoneName, zoneDescription,
      requiredPpeCodes, cameraConfig, monitoringSchedule, alertConfig
    } = req.body;

    // Validar que los códigos EPP existen
    const validation = await req.hse.violationCatalog.validateCodes(requiredPpeCodes);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Códigos de EPP inválidos: ${validation.invalid.join(', ')}`
      });
    }

    const query = `
      INSERT INTO hse_zone_configurations (
        company_id, branch_id, zone_code, zone_name, zone_description,
        required_ppe_codes, camera_config, monitoring_schedule, alert_config,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (company_id, branch_id, zone_code)
      DO UPDATE SET
        zone_name = EXCLUDED.zone_name,
        zone_description = EXCLUDED.zone_description,
        required_ppe_codes = EXCLUDED.required_ppe_codes,
        camera_config = EXCLUDED.camera_config,
        monitoring_schedule = EXCLUDED.monitoring_schedule,
        alert_config = EXCLUDED.alert_config,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.query(query, [
      companyId,
      branchId,
      zoneCode,
      zoneName,
      zoneDescription,
      requiredPpeCodes,
      JSON.stringify(cameraConfig || {}),
      JSON.stringify(monitoringSchedule || {}),
      JSON.stringify(alertConfig || {}),
      req.user?.id
    ]);

    res.json({
      success: true,
      zone: result.rows[0]
    });
  } catch (error) {
    console.error('[HSE-AI] Error guardando zona:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
