/**
 * ============================================================================
 * BRAIN ROUTES - API del Cerebro del Ecosistema
 * ============================================================================
 *
 * Endpoints que proporcionan datos EN VIVO del sistema.
 * NO lee de archivos JSON estáticos - todo es escaneado en tiempo real.
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const EcosystemBrainService = require('../services/EcosystemBrainService');

let brainService = null;

// Inicializar servicio con database
function initBrainService(database) {
  if (!brainService) {
    brainService = new EcosystemBrainService(database);
    console.log('🧠 [BRAIN-API] Servicio inicializado');
  }
  return brainService;
}

// Middleware para asegurar que el servicio está inicializado
router.use((req, res, next) => {
  if (!brainService && req.app.get('database')) {
    initBrainService(req.app.get('database'));
  }
  next();
});

/**
 * GET /api/brain/health
 * Health check del cerebro
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    service: 'EcosystemBrainService',
    timestamp: new Date().toISOString(),
    message: 'El cerebro está activo y escaneando'
  });
});

/**
 * GET /api/brain/overview
 * Vista general del ecosistema (para tab Overview)
 */
router.get('/overview', async (req, res) => {
  try {
    const data = await brainService.getOverview();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/backend-files
 * Archivos backend escaneados EN VIVO
 */
router.get('/backend-files', async (req, res) => {
  try {
    const data = await brainService.scanBackendFiles();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en backend-files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/frontend-files
 * Archivos frontend escaneados EN VIVO
 */
router.get('/frontend-files', async (req, res) => {
  try {
    const data = await brainService.scanFrontendFiles();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en frontend-files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/commercial-modules
 * Módulos comerciales desde BD (VIVOS)
 */
router.get('/commercial-modules', async (req, res) => {
  try {
    const data = await brainService.getCommercialModules();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en commercial-modules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/technical-modules
 * Módulos técnicos detectados del código EN VIVO
 */
router.get('/technical-modules', async (req, res) => {
  try {
    const data = await brainService.getTechnicalModules();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en technical-modules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/roadmap
 * Roadmap desde BD con auto-detección
 */
router.get('/roadmap', async (req, res) => {
  try {
    const data = await brainService.getRoadmap();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en roadmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/critical-path
 * Camino crítico (CPM) calculado
 */
router.get('/critical-path', async (req, res) => {
  try {
    const data = await brainService.getCriticalPath();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en critical-path:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/workflows
 * Workflows detectados del código
 */
router.get('/workflows', async (req, res) => {
  try {
    const data = await brainService.getWorkflows();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en workflows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/database
 * Schema de BD introspectado EN VIVO
 */
router.get('/database', async (req, res) => {
  try {
    const data = await brainService.getDatabaseSchema();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en database:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/applications
 * Aplicaciones del ecosistema
 */
router.get('/applications', async (req, res) => {
  try {
    const data = await brainService.getApplications();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en applications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/organigrama
 * Organigrama de Aponnt
 */
router.get('/organigrama', async (req, res) => {
  try {
    const data = await brainService.getOrganigrama();
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en organigrama:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/brain/clear-cache
 * Limpiar cache para forzar escaneo fresco
 */
router.post('/clear-cache', (req, res) => {
  try {
    brainService.clearCache();
    res.json({
      success: true,
      message: 'Cache limpiado - próxima petición escaneará en vivo'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/metadata
 * Metadata completa (reemplaza a /api/engineering/metadata)
 * Combina toda la información viva en un solo objeto
 */
router.get('/metadata', async (req, res) => {
  try {
    const [overview, backend, frontend, commercial, technical, apps, roadmap, workflows] = await Promise.all([
      brainService.getOverview(),
      brainService.scanBackendFiles(),
      brainService.scanFrontendFiles(),
      brainService.getCommercialModules(),
      brainService.getTechnicalModules(),
      brainService.getApplications(),
      brainService.getRoadmap(),
      brainService.getWorkflows()
    ]);

    res.json({
      success: true,
      data: {
        project: overview.project,
        scannedAt: new Date().toISOString(),
        source: 'LIVE_SCAN',
        applications: apps.applications,
        modules: technical.modules,
        commercialModules: commercial,
        backendFiles: backend.categories,
        frontendFiles: frontend.categories,
        roadmap: roadmap.phases,
        workflows: workflows.workflows,
        stats: overview.stats
      }
    });
  } catch (error) {
    console.error('❌ [BRAIN-API] Error en metadata:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/brain/stats
 * Estadísticas agregadas del sistema
 */
router.get('/stats', async (req, res) => {
  try {
    const overview = await brainService.getOverview();
    res.json({
      success: true,
      data: overview.stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar router e inicializador
module.exports = router;
module.exports.initBrainService = initBrainService;
