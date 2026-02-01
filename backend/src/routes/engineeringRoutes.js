/**
 * ============================================================================
 * ENGINEERING ROUTES - API para Engineering Dashboard
 * ============================================================================
 *
 * Endpoints para acceder a engineering-metadata.js desde el frontend
 *
 * METADATA & TECHNICAL MODULES:
 * GET  /api/engineering/metadata         - Metadata completo
 * GET  /api/engineering/modules          - Solo módulos técnicos
 * GET  /api/engineering/roadmap          - Solo roadmap
 * GET  /api/engineering/workflows        - Solo workflows
 * GET  /api/engineering/database         - Solo database schema
 * GET  /api/engineering/applications     - Solo aplicaciones
 * GET  /api/engineering/stats            - Estadísticas agregadas
 * POST /api/engineering/update           - Actualizar metadata (wrapper del script)
 * POST /api/engineering/reload           - Recargar metadata desde disco
 *
 * ⭐ COMMERCIAL MODULES (SINGLE SOURCE OF TRUTH):
 * GET    /api/engineering/commercial-modules                        - Todos los módulos comerciales
 * GET    /api/engineering/commercial-modules/:moduleKey             - Módulo específico por key
 * GET    /api/engineering/commercial-modules/category/:category     - Filtrar por categoría
 * PUT    /api/engineering/commercial-modules/:moduleKey/pricing     - Actualizar precios por tier
 * GET    /api/engineering/bundles                                   - Listar bundles comerciales
 * POST   /api/engineering/bundles                                   - Crear/editar bundle
 * DELETE /api/engineering/bundles/:bundleKey                        - Eliminar bundle
 * POST   /api/engineering/sync-commercial-modules                   - Sincronizar desde registry
 *
 * UTILITIES:
 * GET  /api/engineering/health           - Health check
 * GET  /api/engineering/scan-files       - Escanear archivos del proyecto
 * POST /api/engineering/read-file        - Leer archivo específico
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

// Integración NCE - Notificaciones
const EngineeringNotifications = require('../services/integrations/engineering-notifications');

// ============================================================================
// ECOSYSTEM BRAIN - Fuente de datos VIVOS
// ============================================================================
const EcosystemBrainService = require('../services/EcosystemBrainService');
let brainService = null;

// Intentar cargar metadata estático como FALLBACK
let metadata = null;
try {
  metadata = require('../../engineering-metadata');
  console.log('📦 [ENGINEERING] Metadata estático cargado como fallback');
} catch (e) {
  console.log('🧠 [ENGINEERING] Sin metadata estático - usando Brain Service exclusivamente');
  metadata = { project: {}, modules: {}, commercialModules: { modules: {} }, applications: {} };
}

// Inicializar Brain Service
function initBrainService(database) {
  if (!brainService && database) {
    brainService = new EcosystemBrainService(database);
    console.log('🧠 [ENGINEERING] Brain Service inicializado - datos VIVOS activados');
  }
  return brainService;
}

// Middleware para inicializar Brain si hay database disponible
router.use((req, res, next) => {
  if (!brainService && req.app.get('database')) {
    initBrainService(req.app.get('database'));
  }
  next();
});

/**
 * Helper: Asegurar que Brain Service esté inicializado
 * Se llama en cada endpoint que necesita Brain para datos vivos
 */
function ensureBrainService(req) {
  if (!brainService && req.app.get('database')) {
    initBrainService(req.app.get('database'));
  }
}

/**
 * Función helper para recargar metadata (DEPRECATED - usar Brain)
 */
function reloadMetadata() {
  try {
    if (metadata) {
      delete require.cache[require.resolve('../../engineering-metadata')];
      metadata = require('../../engineering-metadata');
      console.log('✅ [ENGINEERING] Metadata recargado (fallback)');
    }
    return true;
  } catch (error) {
    console.warn('⚠️ [ENGINEERING] Metadata estático no disponible - usando Brain');
    return true; // No es error, Brain es la fuente principal
  }
}

/**
 * GET /api/engineering/metadata
 * Retorna metadata completo - AHORA USA BRAIN SERVICE (datos VIVOS)
 */
router.get('/metadata', async (req, res) => {
  try {
    // Si tenemos Brain Service, usar datos VIVOS
    if (brainService) {
      console.log('🧠 [ENGINEERING] Sirviendo metadata desde Brain (VIVO)');
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

      // Si roadmap del Brain está vacío, usar metadata estático como fallback
      const roadmapData = (roadmap.phases && roadmap.phases.length > 0)
        ? roadmap.phases
        : (metadata?.roadmap || {});

      // Si workflows del Brain está vacío, usar metadata estático
      const workflowsData = (workflows.workflows && workflows.workflows.length > 0)
        ? workflows.workflows
        : (metadata?.workflows || []);

      // Calcular stats del proyecto para el frontend
      const roadmapForStats = metadata?.roadmap || {};
      let totalTasks = 0;
      let completedTasks = 0;
      let currentPhase = 'DEVELOPMENT';

      Object.values(roadmapForStats).forEach(phase => {
        if (phase.status === 'IN_PROGRESS') {
          currentPhase = phase.name || 'IN_PROGRESS';
        }
        if (phase.tasks) {
          totalTasks += phase.tasks.length;
          completedTasks += phase.tasks.filter(t => t.done).length;
        }
      });

      const totalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Construir project con todos los campos necesarios
      const projectData = {
        ...(overview.project || {}),
        ...(metadata?.project || {}),
        totalProgress,
        currentPhase,
        lastUpdated: new Date().toISOString()
      };

      return res.json({
        success: true,
        source: 'LIVE_BRAIN',
        data: {
          project: projectData,
          scannedAt: new Date().toISOString(),
          applications: apps.applications,
          modules: technical.modules,
          commercialModules: {
            modules: commercial.modules.reduce((acc, m) => { acc[m.key] = m; return acc; }, {}),
            _stats: commercial.stats,
            byCategory: commercial.byCategory
          },
          backendFiles: backend.categories,
          frontendFiles: frontend.categories,
          roadmap: roadmapData,
          workflows: workflowsData,
          database: metadata?.database || null, // Usar metadata para database hasta que Brain lo tenga
          techStack: metadata?.techStack || overview.project,
          stats: overview.stats
        }
      });
    }

    // Fallback a metadata estático
    console.log('📦 [ENGINEERING] Sirviendo metadata estático (fallback)');
    res.json({
      success: true,
      source: 'STATIC_FILE',
      data: metadata
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en GET /metadata:', error);
    // Si falla Brain, intentar fallback
    if (metadata) {
      return res.json({
        success: true,
        source: 'STATIC_FALLBACK',
        data: metadata
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/modules
 * Retorna módulos técnicos - AHORA USA BRAIN SERVICE (datos vivos)
 */
router.get('/modules', async (req, res) => {
  try {
    ensureBrainService(req);

    if (brainService) {
      console.log('🧠 [ENGINEERING] Módulos técnicos desde Brain (VIVO)');
      const technicalModules = await brainService.getTechnicalModules();

      return res.json({
        success: true,
        source: 'LIVE_BRAIN',
        data: technicalModules.modules || []
      });
    }

    // Fallback a metadata estático
    console.log('📦 [ENGINEERING] Módulos técnicos desde metadata (fallback)');
    res.json({
      success: true,
      source: 'STATIC_FALLBACK',
      data: metadata.modules
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en GET /modules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/commercial-modules
 * Retorna catálogo comercial racionalizado desde v_modules_by_panel + APKs
 * Esta es la API que deben usar: tab Módulos Comerciales, presupuestos
 *
 * Estructura:
 * - CORE: Módulos base (9 de panel-empresa + 3 APKs) - Se venden como paquete
 * - OPCIONALES: Módulos adicionales (27 de panel-empresa)
 */
router.get('/commercial-modules', async (req, res) => {
  try {
    const database = req.app.get('database') || require('../config/database');

    // 1. Obtener módulos de panel-empresa (tarjetas)
    const [panelModules] = await database.sequelize.query(`
      SELECT
        module_key as key,
        name,
        description,
        icon,
        category,
        is_core as "isCore",
        commercial_type as "commercialType",
        COALESCE((SELECT base_price FROM system_modules sm WHERE sm.module_key = v.module_key), 0) as "basePrice"
      FROM v_modules_by_panel v
      WHERE target_panel = 'panel-empresa'
        AND show_as_card = true
      ORDER BY is_core DESC, display_order, name
    `);

    // 2. Obtener APKs (CORE pero no aparecen como tarjetas)
    const [apkModules] = await database.sequelize.query(`
      SELECT
        module_key as key,
        name,
        description,
        icon,
        category,
        is_core as "isCore",
        'apk-complementaria' as "commercialType",
        base_price as "basePrice",
        module_type as "moduleType"
      FROM system_modules
      WHERE module_key IN ('apk-kiosk', 'web-kiosk', 'apk-employee')
        AND is_active = true
      ORDER BY display_order
    `);

    // 3. Combinar: CORE = módulos core de panel + APKs
    const coreModules = [
      ...panelModules.filter(m => m.isCore),
      ...apkModules
    ];

    const optionalModules = panelModules.filter(m => !m.isCore);

    // 4. Agrupar por categoría para el frontend
    const byCategory = {
      core: { name: 'Paquete Base (CORE)', modules: coreModules },
      optional: { name: 'Módulos Opcionales', modules: optionalModules }
    };

    // 5. Stats
    const stats = {
      totalCore: coreModules.length,
      totalOptional: optionalModules.length,
      total: coreModules.length + optionalModules.length
    };

    // 6. Obtener precio del paquete CORE desde system_settings
    let corePricePerEmployee = 15.00; // Default
    try {
      const [settings] = await database.sequelize.query(`
        SELECT value FROM system_settings WHERE key = 'core_package_price_per_employee'
      `);
      if (settings.length > 0) {
        corePricePerEmployee = parseFloat(settings[0].value) || 15.00;
      }
    } catch (e) {
      console.log('[COMMERCIAL] system_settings no disponible, usando precio default');
    }

    console.log(`📦 [COMMERCIAL] Catálogo: ${stats.totalCore} CORE + ${stats.totalOptional} OPCIONALES = ${stats.total} total`);

    res.json({
      success: true,
      source: 'DATABASE_SSOT',
      data: {
        modules: [...coreModules, ...optionalModules],
        coreModules,
        optionalModules,
        byCategory,
        stats,
        corePricePerEmployee,
        bundles: metadata?.commercialModules?.bundles || {},
        lastSync: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error en GET /commercial-modules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engineering/commercial-modules/core-price
 * Actualiza el precio del paquete CORE por empleado
 * Body: { price: number }
 */
router.put('/commercial-modules/core-price', async (req, res) => {
  try {
    const { price } = req.body;
    const database = req.app.get('database') || require('../config/database');

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Precio inválido. Debe ser un número >= 0'
      });
    }

    console.log(`💰 [PRICING] Actualizando precio CORE a: $${price}/empleado`);

    // Insertar o actualizar en system_settings (incluye category y display_name que son NOT NULL)
    await database.sequelize.query(`
      INSERT INTO system_settings (category, key, value, default_value, data_type, display_name, description, sort_order, created_at, updated_at)
      VALUES ('billing', 'core_package_price_per_employee', $1, '15.00', 'number', 'Precio Paquete CORE', 'Precio del paquete CORE por empleado/mes (USD)', 100, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
    `, {
      bind: [price.toString()]
    });

    res.json({
      success: true,
      message: `Precio del paquete CORE actualizado a $${price}/empleado`,
      newPrice: price
    });

  } catch (error) {
    console.error('❌ [PRICING] Error actualizando precio CORE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engineering/commercial-modules/:moduleKey/price
 * Actualiza el precio base de un módulo específico
 * Body: { price: number }
 */
router.put('/commercial-modules/:moduleKey/price', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const { price } = req.body;
    const database = req.app.get('database') || require('../config/database');

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Precio inválido. Debe ser un número >= 0'
      });
    }

    console.log(`💰 [PRICING] Actualizando precio de ${moduleKey} a: $${price}`);

    // Actualizar en system_modules
    const [result] = await database.sequelize.query(`
      UPDATE system_modules
      SET base_price = $1, updated_at = NOW()
      WHERE module_key = $2
      RETURNING module_key, name, base_price
    `, {
      bind: [price, moduleKey]
    });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Módulo '${moduleKey}' no encontrado`
      });
    }

    res.json({
      success: true,
      message: `Precio de '${result[0].name}' actualizado a $${price}`,
      module: result[0]
    });

  } catch (error) {
    console.error('❌ [PRICING] Error actualizando precio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/commercial-modules/:moduleKey
 * Retorna UN módulo comercial específico por key
 */
router.get('/commercial-modules/:moduleKey', (req, res) => {
  try {
    const { moduleKey } = req.params;
    const commercialModules = metadata.commercialModules;

    if (!commercialModules || !commercialModules.modules) {
      return res.status(404).json({
        success: false,
        error: 'commercialModules no encontrado'
      });
    }

    const module = commercialModules.modules[moduleKey];

    if (!module) {
      return res.status(404).json({
        success: false,
        error: `Módulo "${moduleKey}" no encontrado`,
        availableModules: Object.keys(commercialModules.modules)
      });
    }

    res.json({
      success: true,
      data: module
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/bundles
 * Retorna todos los bundles comerciales (paquetes con descuento)
 */
router.get('/bundles', (req, res) => {
  try {
    const bundles = metadata.commercialModules?.bundles;

    if (!bundles) {
      return res.status(404).json({
        success: false,
        error: 'bundles no encontrado'
      });
    }

    res.json({
      success: true,
      data: bundles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/commercial-modules/category/:category
 * Retorna módulos comerciales filtrados por categoría
 * Categorías: core, rrhh, operations, sales, analytics, integrations, advanced
 */
router.get('/commercial-modules/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const commercialModules = metadata.commercialModules?.modules;

    if (!commercialModules) {
      return res.status(404).json({
        success: false,
        error: 'commercialModules no encontrado'
      });
    }

    // Filtrar por categoría
    const filtered = Object.entries(commercialModules)
      .filter(([key, module]) => module.category === category)
      .reduce((acc, [key, module]) => {
        acc[key] = module;
        return acc;
      }, {});

    res.json({
      success: true,
      data: {
        category,
        count: Object.keys(filtered).length,
        modules: filtered
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/engineering/commercial-modules/:moduleKey/pricing
 * Actualiza los precios por tier de un módulo comercial específico
 * Body: { pricing: { tier1: number, tier2: number, tier3: number } }
 */
router.put('/commercial-modules/:moduleKey/pricing', (req, res) => {
  try {
    const { moduleKey } = req.params;
    const { pricing } = req.body;

    console.log(`💰 [ENGINEERING] Actualizando precios del módulo: ${moduleKey}`);

    // Validar que el módulo existe
    if (!metadata.commercialModules || !metadata.commercialModules.modules || !metadata.commercialModules.modules[moduleKey]) {
      return res.status(404).json({
        success: false,
        error: `Módulo "${moduleKey}" no encontrado`,
        availableModules: metadata.commercialModules?.modules ? Object.keys(metadata.commercialModules.modules) : []
      });
    }

    // Validar que se enviaron los precios
    if (!pricing || typeof pricing !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere objeto "pricing" con tier1, tier2, tier3'
      });
    }

    const { tier1, tier2, tier3 } = pricing;

    // Validar que los precios sean números válidos
    if (typeof tier1 !== 'number' || typeof tier2 !== 'number' || typeof tier3 !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Los precios deben ser números válidos'
      });
    }

    if (tier1 < 0 || tier2 < 0 || tier3 < 0) {
      return res.status(400).json({
        success: false,
        error: 'Los precios no pueden ser negativos'
      });
    }

    // Actualizar precios en el metadata en memoria
    const module = metadata.commercialModules.modules[moduleKey];

    if (!module.pricingTiers) {
      module.pricingTiers = {
        tier1: { range: "1-50", price: 0 },
        tier2: { range: "51-100", price: 0 },
        tier3: { range: "101+", price: 0 }
      };
    }

    module.pricingTiers.tier1.price = tier1;
    module.pricingTiers.tier2.price = tier2;
    module.pricingTiers.tier3.price = tier3;

    // Actualizar basePrice con el tier1 (precio base por defecto)
    module.basePrice = tier1;

    // Guardar el archivo metadata actualizado
    const fs = require('fs');
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');

    const content = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(metadata, null, 2)};
`;

    fs.writeFileSync(metadataPath, content, 'utf8');
    console.log(`✅ [ENGINEERING] Archivo engineering-metadata.js actualizado`);

    // Recargar metadata desde disco
    const reloaded = reloadMetadata();

    if (!reloaded) {
      return res.status(500).json({
        success: false,
        error: 'Error recargando metadata después de actualización'
      });
    }

    console.log(`✅ [ENGINEERING] Precios actualizados para módulo: ${moduleKey}`);
    console.log(`   - Tier 1 (1-50): $${tier1}`);
    console.log(`   - Tier 2 (51-100): $${tier2}`);
    console.log(`   - Tier 3 (101+): $${tier3}`);

    res.json({
      success: true,
      message: `Precios actualizados correctamente para módulo "${module.name}"`,
      module: {
        key: moduleKey,
        name: module.name,
        pricingTiers: module.pricingTiers,
        basePrice: module.basePrice
      }
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error actualizando precios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/engineering/bundles
 * Crea o edita un bundle comercial
 * Body: {
 *   bundleKey: string (opcional para editar),
 *   name: string,
 *   description: string,
 *   modules: string[] (array de moduleKeys),
 *   discount_percentage: number (0-100),
 *   category: string
 * }
 */
router.post('/bundles', (req, res) => {
  try {
    const { bundleKey, name, description, modules, discount_percentage, category } = req.body;

    console.log(`🎁 [ENGINEERING] ${bundleKey ? 'Editando' : 'Creando'} bundle: ${name}`);

    // Validaciones básicas
    if (!name || !modules || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere: name, modules (array no vacío)'
      });
    }

    if (discount_percentage !== undefined && (discount_percentage < 0 || discount_percentage > 100)) {
      return res.status(400).json({
        success: false,
        error: 'discount_percentage debe estar entre 0 y 100'
      });
    }

    // Validar que todos los módulos existen
    const commercialModules = metadata.commercialModules?.modules;
    if (!commercialModules) {
      return res.status(500).json({
        success: false,
        error: 'commercialModules no encontrado en metadata'
      });
    }

    const invalidModules = modules.filter(moduleKey => !commercialModules[moduleKey]);
    if (invalidModules.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Módulos no encontrados: ${invalidModules.join(', ')}`,
        availableModules: Object.keys(commercialModules)
      });
    }

    // Calcular precio total del bundle (suma de basePrice de cada módulo)
    let totalPrice = 0;
    modules.forEach(moduleKey => {
      const module = commercialModules[moduleKey];
      totalPrice += parseFloat(module.basePrice || 0);
    });

    // Aplicar descuento
    const discountAmount = totalPrice * (discount_percentage || 0) / 100;
    const bundlePrice = totalPrice - discountAmount;

    // Generar bundleKey si es nuevo
    const finalBundleKey = bundleKey || `bundle-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

    // Crear o actualizar bundle
    if (!metadata.commercialModules.bundles) {
      metadata.commercialModules.bundles = {};
    }

    const bundleData = {
      key: finalBundleKey,
      name,
      description: description || '',
      modules,
      module_count: modules.length,
      total_price_without_discount: totalPrice,
      discount_percentage: discount_percentage || 0,
      discount_amount: discountAmount,
      bundle_price: bundlePrice,
      category: category || 'custom',
      created_at: metadata.commercialModules.bundles[finalBundleKey]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    metadata.commercialModules.bundles[finalBundleKey] = bundleData;

    // Guardar el archivo metadata actualizado
    const fs = require('fs');
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');

    const content = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(metadata, null, 2)};
`;

    fs.writeFileSync(metadataPath, content, 'utf8');
    console.log(`✅ [ENGINEERING] Archivo engineering-metadata.js actualizado`);

    // Recargar metadata desde disco
    const reloaded = reloadMetadata();

    if (!reloaded) {
      return res.status(500).json({
        success: false,
        error: 'Error recargando metadata después de actualización'
      });
    }

    console.log(`✅ [ENGINEERING] Bundle ${bundleKey ? 'editado' : 'creado'}: ${finalBundleKey}`);
    console.log(`   - Nombre: ${name}`);
    console.log(`   - Módulos: ${modules.length}`);
    console.log(`   - Precio sin descuento: $${totalPrice}`);
    console.log(`   - Descuento: ${discount_percentage}% ($${discountAmount})`);
    console.log(`   - Precio final: $${bundlePrice}`);

    res.json({
      success: true,
      message: `Bundle ${bundleKey ? 'editado' : 'creado'} correctamente: "${name}"`,
      bundle: bundleData
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error gestionando bundle:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/engineering/bundles/:bundleKey
 * Elimina un bundle comercial
 */
router.delete('/bundles/:bundleKey', (req, res) => {
  try {
    const { bundleKey } = req.params;

    console.log(`🗑️ [ENGINEERING] Eliminando bundle: ${bundleKey}`);

    if (!metadata.commercialModules?.bundles?.[bundleKey]) {
      return res.status(404).json({
        success: false,
        error: `Bundle "${bundleKey}" no encontrado`,
        availableBundles: metadata.commercialModules?.bundles ? Object.keys(metadata.commercialModules.bundles) : []
      });
    }

    const bundleName = metadata.commercialModules.bundles[bundleKey].name;

    // Eliminar bundle
    delete metadata.commercialModules.bundles[bundleKey];

    // Guardar el archivo metadata actualizado
    const fs = require('fs');
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');

    const content = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(metadata, null, 2)};
`;

    fs.writeFileSync(metadataPath, content, 'utf8');
    console.log(`✅ [ENGINEERING] Archivo engineering-metadata.js actualizado`);

    // Recargar metadata desde disco
    const reloaded = reloadMetadata();

    if (!reloaded) {
      return res.status(500).json({
        success: false,
        error: 'Error recargando metadata después de eliminación'
      });
    }

    console.log(`✅ [ENGINEERING] Bundle eliminado: ${bundleKey}`);

    res.json({
      success: true,
      message: `Bundle "${bundleName}" eliminado correctamente`
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error eliminando bundle:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/engineering/sync-commercial-modules
 * Sincroniza módulos comerciales desde BD (system_modules) - FUENTE ÚNICA DE VERDAD
 * Ejecuta: scripts/sync-commercial-modules-from-db.js
 */
router.post('/sync-commercial-modules', (req, res) => {
  try {
    const command = 'node scripts/sync-commercial-modules-from-db.js';

    console.log('🔄 [ENGINEERING] Sincronizando módulos comerciales desde BD...');

    exec(command, { cwd: path.join(__dirname, '..', '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ [ENGINEERING] Error ejecutando sincronización:', error);
        return res.status(500).json({
          success: false,
          error: error.message,
          stderr,
          stdout
        });
      }

      // Recargar metadata después de sincronizar
      const reloaded = reloadMetadata();

      if (!reloaded) {
        return res.status(500).json({
          success: false,
          error: 'Error recargando metadata después de sincronización'
        });
      }

      console.log('✅ [ENGINEERING] Módulos comerciales sincronizados desde BD');

      res.json({
        success: true,
        message: 'Módulos comerciales sincronizados desde BD (system_modules)',
        output: stdout,
        stats: metadata.commercialModules?._stats,
        syncedFrom: metadata.commercialModules?._syncedFrom,
        version: metadata.commercialModules?._version,
        lastSync: metadata.commercialModules?._lastSync
      });
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en sync-commercial-modules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/roadmap
 * Retorna solo roadmap
 */
/**
 * GET /api/engineering/roadmap
 * Retorna roadmap del proyecto - AHORA USA BRAIN SERVICE (datos vivos)
 */
router.get('/roadmap', async (req, res) => {
  try {
    ensureBrainService(req);

    if (brainService) {
      console.log('🧠 [ENGINEERING] Roadmap desde Brain (VIVO)');
      const roadmapData = await brainService.getRoadmap();

      return res.json({
        success: true,
        source: 'LIVE_BRAIN',
        data: roadmapData.phases && roadmapData.phases.length > 0
          ? roadmapData.phases
          : metadata.roadmap || {}
      });
    }

    // Fallback a metadata estático
    console.log('📦 [ENGINEERING] Roadmap desde metadata (fallback)');
    res.json({
      success: true,
      source: 'STATIC_FALLBACK',
      data: metadata.roadmap
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en GET /roadmap:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/workflows
 * Retorna workflows - AHORA USA BRAIN SERVICE con workflows CONECTADOS
 */
router.get('/workflows', async (req, res) => {
  try {
    // Si tenemos Brain Service, usar workflows CONECTADOS
    if (brainService) {
      console.log('🧠 [ENGINEERING] Workflows desde Brain (CONECTADOS)');
      const connectedWorkflows = await brainService.getWorkflowsConnected();

      return res.json({
        success: true,
        source: 'BRAIN_CONNECTED',
        scannedAt: connectedWorkflows.scannedAt,
        data: {
          workflows: connectedWorkflows.workflows,
          stats: connectedWorkflows.stats
        }
      });
    }

    // Fallback a metadata estático
    res.json({
      success: true,
      source: 'STATIC_METADATA',
      data: metadata.workflows
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/workflows/:workflowId
 * Retorna un workflow específico con detalles completos
 */
router.get('/workflows/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    if (!brainService) {
      return res.status(503).json({
        success: false,
        error: 'Brain Service no disponible'
      });
    }

    const { workflows } = await brainService.getWorkflowsConnected();
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: `Workflow ${workflowId} no encontrado`,
        available: workflows.map(w => ({ id: w.id, name: w.displayName }))
      });
    }

    res.json({
      success: true,
      source: 'BRAIN_CONNECTED',
      data: workflow
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error obteniendo workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/workflows/:workflowId/tutorial
 * Genera un tutorial dinámico para un workflow específico
 * ESTA ES LA FUNCIONALIDAD CLAVE PARA TUTORIALES AUTÓNOMOS
 */
router.get('/workflows/:workflowId/tutorial', async (req, res) => {
  try {
    const { workflowId } = req.params;

    if (!brainService) {
      return res.status(503).json({
        success: false,
        error: 'Brain Service no disponible para generar tutoriales'
      });
    }

    console.log(`📚 [ENGINEERING] Generando tutorial para: ${workflowId}`);

    const tutorial = await brainService.generateTutorialForWorkflow(workflowId);

    if (tutorial.error) {
      return res.status(404).json({
        success: false,
        error: tutorial.error,
        suggestion: tutorial.suggestion,
        available: tutorial.available
      });
    }

    res.json({
      success: true,
      source: 'BRAIN_TUTORIAL_GENERATOR',
      data: tutorial
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error generando tutorial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/tutorials
 * Lista todos los workflows que pueden generar tutoriales
 */
router.get('/tutorials', async (req, res) => {
  try {
    if (!brainService) {
      return res.status(503).json({
        success: false,
        error: 'Brain Service no disponible'
      });
    }

    const { workflows, stats } = await brainService.getWorkflowsConnected();

    // Filtrar solo los que pueden generar tutoriales
    const tutorialCapable = workflows.filter(w => w.tutorialCapable);

    res.json({
      success: true,
      source: 'BRAIN_TUTORIAL_GENERATOR',
      data: {
        totalWorkflows: stats.total,
        tutorialCapable: stats.tutorialCapable,
        tutorials: tutorialCapable.map(w => ({
          id: w.id,
          name: w.displayName,
          stageCount: w.stageCount,
          totalSteps: w.totalSteps,
          connectedModules: w.connectedModules,
          status: w.status,
          completeness: w.completeness,
          tutorialUrl: `/api/engineering/workflows/${w.id}/tutorial`
        }))
      }
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error listando tutoriales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/database
 * Retorna solo database schema
 */
/**
 * GET /api/engineering/database
 * Retorna schema de base de datos - AHORA USA BRAIN SERVICE (datos vivos desde Sequelize)
 * Para cada campo, detecta qué módulos/procesos del código lo usan
 */
router.get('/database', async (req, res) => {
  try {
    ensureBrainService(req);

    if (brainService) {
      console.log('🧠 [ENGINEERING] Database Schema desde Brain (VIVO - Sequelize)');
      const dbSchema = await brainService.getDatabaseSchema();

      return res.json({
        success: true,
        source: 'LIVE_BRAIN_SEQUELIZE',
        data: dbSchema
      });
    }

    // Fallback a metadata estático
    console.log('📦 [ENGINEERING] Database Schema desde metadata (fallback)');
    res.json({
      success: true,
      source: 'STATIC_FALLBACK',
      data: metadata.database
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en GET /database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/applications
 * Retorna solo aplicaciones del ecosistema
 */
/**
 * GET /api/engineering/applications
 * Retorna aplicaciones del ecosistema - AHORA USA BRAIN SERVICE (datos vivos)
 */
router.get('/applications', async (req, res) => {
  try {
    ensureBrainService(req);

    if (brainService) {
      console.log('🧠 [ENGINEERING] Aplicaciones desde Brain (VIVO)');
      const apps = await brainService.getApplications();

      return res.json({
        success: true,
        source: 'LIVE_BRAIN',
        data: apps.applications || []
      });
    }

    // Fallback a metadata estático
    console.log('📦 [ENGINEERING] Aplicaciones desde metadata (fallback)');
    res.json({
      success: true,
      source: 'STATIC_FALLBACK',
      data: metadata.applications
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en GET /applications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/stats
 * Retorna estadísticas agregadas - AHORA USA BRAIN SERVICE con STATUS INFERIDO
 */
router.get('/stats', async (req, res) => {
  try {
    // Si tenemos Brain Service, usar datos VIVOS con STATUS INFERIDO
    if (brainService) {
      console.log('🧠 [ENGINEERING] Stats desde Brain (VIVO con inferencia)');

      // Obtener datos del Brain con status inferido
      const [overview, technical, workflows, apps] = await Promise.all([
        brainService.getOverview(),
        brainService.getTechnicalModules(),
        brainService.getWorkflows(),
        brainService.getApplications()
      ]);

      const brainStats = overview.stats || {};

      // Obtener roadmap del metadata para calcular tareas (Brain usa BD para esto)
      const roadmapData = metadata?.roadmap || {};
      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressPhases = 0;
      let completedPhases = 0;

      Object.values(roadmapData).forEach(phase => {
        if (phase.status === 'IN_PROGRESS') inProgressPhases++;
        if (phase.status === 'COMPLETE' || phase.status === 'COMPLETED') completedPhases++;
        if (phase.tasks) {
          totalTasks += phase.tasks.length;
          completedTasks += phase.tasks.filter(t => t.done).length;
        }
      });

      // ⭐ USAR MÓDULOS TÉCNICOS DEL BRAIN CON STATUS INFERIDO
      const technicalStats = technical.stats || {};
      const totalModules = technical.totalModules || 0;
      const productionModules = technicalStats.production || 0;
      const inProgressModules = technicalStats.in_progress || 0;
      const developmentModules = technicalStats.development || 0;
      const plannedModules = technicalStats.planned || 0;

      // Construir respuesta en el formato esperado por el frontend
      return res.json({
        success: true,
        source: 'LIVE_BRAIN_INFERRED',
        data: {
          ...brainStats,
          // ⭐ Módulos técnicos con status inferido del código
          modules: {
            total: totalModules,
            completed: productionModules,
            inProgress: inProgressModules,
            development: developmentModules,
            planned: plannedModules,
            completionRate: totalModules > 0 ? Math.round((productionModules / totalModules) * 100) : 0,
            averageProgress: technicalStats.averageProgress || 0,
            // Info comercial del Brain
            commercial: brainStats.modules?.commercial || 45,
            core: brainStats.modules?.core || 18,
            premium: brainStats.modules?.premium || 27
          },
          // Roadmap desde metadata (hasta que Brain use BD)
          roadmap: {
            totalPhases: Object.keys(roadmapData).length,
            completedPhases,
            inProgressPhases,
            totalTasks,
            completedTasks,
            taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          },
          // ⭐ Workflows con status inferido
          workflows: {
            total: workflows.stats?.total || 0,
            implemented: workflows.stats?.implemented || 0,
            partial: workflows.stats?.partial || 0,
            planned: workflows.stats?.planned || 0,
            stateMachines: workflows.stats?.stateMachines || 0
          },
          // ⭐ Applications con status inferido
          applications: {
            total: apps.stats?.total || 0,
            production: apps.stats?.production || 0,
            inProgress: apps.stats?.in_progress || 0,
            averageProgress: apps.stats?.averageProgress || 0
          }
        }
      });
    }

    // Fallback a metadata estático
    console.log('📦 [ENGINEERING] Stats desde metadata estático');
    const modules = metadata.modules || {};
    const roadmap = metadata.roadmap || {};
    const applications = metadata.applications || {};
    const database = metadata.database || {};
    const dbTables = database.tables || database.schema || {};

    // Calcular stats
    const totalModules = Object.keys(modules).length;
    const completedModules = Object.values(modules).filter(m => m.status === 'PRODUCTION' || m.status === 'COMPLETE').length;
    const inProgressModules = Object.values(modules).filter(m => m.status === 'IN_PROGRESS').length;
    const plannedModules = Object.values(modules).filter(m => m.status === 'PLANNED').length;

    const totalPhases = Object.keys(roadmap).length;
    const completedPhases = Object.values(roadmap).filter(p => p.status === 'COMPLETE' || p.status === 'COMPLETED').length;
    const inProgressPhases = Object.values(roadmap).filter(p => p.status === 'IN_PROGRESS').length;

    // Calcular total de tareas en roadmap
    let totalTasks = 0;
    let completedTasks = 0;
    Object.values(roadmap).forEach(phase => {
      if (phase.tasks) {
        totalTasks += phase.tasks.length;
        completedTasks += phase.tasks.filter(t => t.done).length;
      }
    });

    const totalApplications = Object.keys(applications).length;
    const completedApplications = Object.values(applications).filter(a => a.status === 'PRODUCTION' || a.status === 'COMPLETE').length;

    const totalTables = database.totalTables || Object.keys(dbTables).length || 0;
    const productionTables = Object.values(dbTables).filter(t => t.status === 'PRODUCTION').length;
    const plannedTables = Object.values(dbTables).filter(t => t.status === 'PLANNED').length;

    const project = metadata.project || {};

    res.json({
      success: true,
      data: {
        project: {
          totalProgress: project.totalProgress || 0,
          currentPhase: project.currentPhase || 'DEVELOPMENT',
          version: project.version || '1.0.0'
        },
        modules: {
          total: totalModules,
          completed: completedModules,
          inProgress: inProgressModules,
          planned: plannedModules,
          completionRate: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
        },
        roadmap: {
          totalPhases,
          completedPhases,
          inProgressPhases,
          totalTasks,
          completedTasks,
          taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        applications: {
          total: totalApplications,
          completed: completedApplications,
          completionRate: totalApplications > 0 ? Math.round((completedApplications / totalApplications) * 100) : 0
        },
        database: {
          totalTables,
          productionTables,
          plannedTables,
          completionRate: totalTables > 0 ? Math.round((productionTables / totalTables) * 100) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/engineering/update
 * Actualizar metadata usando el script
 */
router.post('/update', (req, res) => {
  try {
    const { task, module, progress, status, addIssue } = req.body;

    let command = 'node scripts/update-engineering-metadata.js';

    if (task) {
      command += ` --task ${task} --done`;
    } else if (module) {
      if (progress !== undefined) {
        command += ` --module ${module} --progress ${progress}`;
      }
      if (status) {
        command += ` --status ${status}`;
      }
      if (addIssue) {
        command += ` --add-issue "${addIssue}"`;
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Se requiere task o module'
      });
    }

    // Ejecutar script
    exec(command, { cwd: path.join(__dirname, '..', '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ [ENGINEERING] Error ejecutando script:', error);
        return res.status(500).json({
          success: false,
          error: error.message,
          stderr
        });
      }

      // Recargar metadata
      reloadMetadata();

      res.json({
        success: true,
        message: 'Metadata actualizado correctamente',
        output: stdout
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/engineering/reload
 * Recargar metadata desde disco (sin ejecutar script)
 */
router.post('/reload', (req, res) => {
  try {
    const success = reloadMetadata();

    if (success) {
      res.json({
        success: true,
        message: 'Metadata recargado correctamente',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error recargando metadata'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/health
 * Health check del servicio
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Engineering Dashboard API',
    status: 'healthy',
    metadataLoaded: !!metadata,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/engineering/full-system-status
 * ⭐ NUEVO: Estado completo del Brain Orchestrator
 * Combina: Orchestrator + Sistema Nervioso + Ecosystem Brain + MetadataWriter
 * Este endpoint es el "sistema nervioso central" del dashboard
 */
router.get('/full-system-status', async (req, res) => {
  try {
    // Obtener BrainOrchestrator
    const { getInstanceSync } = require('../brain/BrainOrchestrator');
    const brain = getInstanceSync();

    if (!brain) {
      return res.status(503).json({
        success: false,
        error: 'Brain Orchestrator no inicializado',
        message: 'El Brain Orchestrator aún no está disponible. Intenta de nuevo en unos segundos.',
        timestamp: new Date().toISOString()
      });
    }

    // Obtener estado completo del sistema
    const systemStatus = await brain.getFullSystemStatus();

    res.json({
      success: true,
      data: systemStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error obteniendo full system status:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del sistema',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/engineering/scan-files
 * Escanea todos los archivos .js/.html del proyecto AGRUPADOS POR MÓDULO
 * Query params: type=backend|frontend|all (default: all)
 */
router.get('/scan-files', (req, res) => {
  try {
    const fs = require('fs');
    const { type = 'all' } = req.query;

    const backendRoot = path.join(__dirname, '..', '..');
    const rawFiles = {
      backend: [],
      frontend: []
    };

    // Mapeo de palabras clave a módulos
    const moduleMapping = {
      // Core modules
      'user': { key: 'users', name: 'Usuarios' },
      'attendance': { key: 'attendance', name: 'Asistencias' },
      'department': { key: 'departments', name: 'Departamentos' },
      'shift': { key: 'shifts', name: 'Turnos' },
      'kiosk': { key: 'kiosks', name: 'Kioscos' },
      'company': { key: 'companies', name: 'Empresas' },
      'partner': { key: 'partners', name: 'Partners' },
      'vendor': { key: 'vendors', name: 'Vendors' },

      // Medical & Vacation
      'medical': { key: 'medical', name: 'Médico' },
      'vacation': { key: 'vacation', name: 'Vacaciones' },
      'legal': { key: 'legal', name: 'Legal' },

      // Notifications & Support
      'notification': { key: 'notifications', name: 'Notificaciones' },
      'support': { key: 'support', name: 'Soporte' },
      'inbox': { key: 'inbox', name: 'Bandeja' },

      // Biometric
      'biometric': { key: 'biometric', name: 'Biométrico' },
      'face': { key: 'facial', name: 'Facial' },
      'consent': { key: 'consent', name: 'Consentimientos' },

      // AI & Auditor
      'assistant': { key: 'assistant', name: 'Asistente IA' },
      'auditor': { key: 'auditor', name: 'Auditor' },
      'knowledge': { key: 'knowledge', name: 'Knowledge Base' },

      // SIAC/ERP
      'cliente': { key: 'clientes', name: 'Clientes' },
      'facturacion': { key: 'facturacion', name: 'Facturación' },
      'invoicing': { key: 'invoicing', name: 'Facturación' },
      'siac': { key: 'siac', name: 'SIAC/ERP' },

      // Otros
      'auth': { key: 'auth', name: 'Autenticación' },
      'report': { key: 'reports', name: 'Reportes' },
      'analytics': { key: 'analytics', name: 'Analíticas' },
      'commission': { key: 'commissions', name: 'Comisiones' },
      'holiday': { key: 'holidays', name: 'Feriados' }
    };

    // Función para detectar módulo de un archivo
    function detectModule(filePath, fileName) {
      const lowerPath = filePath.toLowerCase();
      const lowerName = fileName.toLowerCase();

      // Buscar match en el path o nombre
      for (const [keyword, moduleInfo] of Object.entries(moduleMapping)) {
        if (lowerPath.includes(keyword) || lowerName.includes(keyword)) {
          return moduleInfo;
        }
      }

      // Si no se detecta, usar categoría genérica
      if (lowerPath.includes('migration')) return { key: 'migrations', name: '🔧 Migraciones' };
      if (lowerPath.includes('script')) return { key: 'scripts', name: '⚙️ Scripts' };
      if (lowerPath.includes('model')) return { key: 'models', name: '📦 Modelos' };
      if (lowerPath.includes('route')) return { key: 'routes', name: '🛣️ Rutas' };
      if (lowerPath.includes('service')) return { key: 'services', name: '🔧 Servicios' };
      if (lowerPath.includes('middleware')) return { key: 'middleware', name: '🛡️ Middleware' };

      return { key: 'otros', name: '📁 Otros' };
    }

    // Función recursiva para escanear directorios
    function scanDirectory(dir, baseDir, category) {
      try {
        const items = fs.readdirSync(dir);

        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

          // Ignorar node_modules, .git, etc.
          if (item === 'node_modules' || item === '.git' || item === '.env' || item.startsWith('.')) {
            return;
          }

          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            // Recursivo para subdirectorios
            scanDirectory(fullPath, baseDir, category);
          } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.html'))) {
            // Archivos .js y .html
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n').length;

            const moduleInfo = detectModule(relativePath, item);

            rawFiles[category].push({
              file: relativePath,
              fullPath: fullPath,
              name: item,
              size: stat.size,
              lines: lines,
              modified: stat.mtime,
              directory: path.dirname(relativePath).replace(/\\/g, '/'),
              module: moduleInfo.key,
              moduleName: moduleInfo.name
            });
          }
        });
      } catch (error) {
        console.error(`Error escaneando ${dir}:`, error.message);
      }
    }

    // Escanear backend (src/, migrations/, scripts/, etc.)
    if (type === 'all' || type === 'backend') {
      const backendDirs = ['src', 'migrations', 'scripts'];
      backendDirs.forEach(dir => {
        const dirPath = path.join(backendRoot, dir);
        if (fs.existsSync(dirPath)) {
          scanDirectory(dirPath, backendRoot, 'backend');
        }
      });
    }

    // Escanear frontend (public/js/ + HTMLs principales)
    if (type === 'all' || type === 'frontend') {
      // 1. Scripts JS
      const frontendDir = path.join(backendRoot, 'public', 'js');
      if (fs.existsSync(frontendDir)) {
        scanDirectory(frontendDir, path.join(backendRoot, 'public'), 'frontend');
      }

      // 2. HTMLs principales
      const htmls = ['index.html', 'panel-empresa.html', 'panel-administrativo.html'];
      htmls.forEach(htmlFile => {
        const htmlPath = path.join(backendRoot, 'public', htmlFile);
        if (fs.existsSync(htmlPath)) {
          const stat = fs.statSync(htmlPath);
          const content = fs.readFileSync(htmlPath, 'utf8');
          const lines = content.split('\n').length;

          rawFiles.frontend.push({
            file: htmlFile,
            fullPath: htmlPath,
            name: htmlFile,
            size: stat.size,
            lines: lines,
            modified: stat.mtime,
            directory: 'public',
            module: 'html-pages',
            moduleName: '🌐 Páginas HTML'
          });
        }
      });

      // 3. Buscar APKs (si existen)
      const apkDir = path.join(backendRoot, 'public', 'apk');
      if (fs.existsSync(apkDir)) {
        scanDirectory(apkDir, path.join(backendRoot, 'public'), 'frontend');
      }
    }

    // Agrupar por módulo
    function groupByModule(files) {
      const grouped = {};

      files.forEach(file => {
        const moduleKey = file.module;
        if (!grouped[moduleKey]) {
          grouped[moduleKey] = {
            module: moduleKey,
            moduleName: file.moduleName,
            files: []
          };
        }
        grouped[moduleKey].files.push(file);
      });

      // Ordenar archivos dentro de cada módulo
      Object.values(grouped).forEach(module => {
        module.files.sort((a, b) => a.file.localeCompare(b.file));
      });

      // Convertir a array y ordenar por nombre de módulo
      return Object.values(grouped).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
    }

    const groupedBackend = groupByModule(rawFiles.backend);
    const groupedFrontend = groupByModule(rawFiles.frontend);

    res.json({
      success: true,
      data: {
        backend: groupedBackend,
        frontend: groupedFrontend,
        totalBackend: rawFiles.backend.length,
        totalFrontend: rawFiles.frontend.length,
        totalFiles: rawFiles.backend.length + rawFiles.frontend.length,
        totalModulesBackend: groupedBackend.length,
        totalModulesFrontend: groupedFrontend.length
      }
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error escaneando archivos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/engineering/read-file
 * Lee un archivo de código y retorna su contenido
 * Body: { filePath: string, lines: string } (lines opcional, ej: "1-100")
 */
router.post('/read-file', (req, res) => {
  try {
    const fs = require('fs');
    const { filePath, lines } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'filePath es requerido'
      });
    }

    // Seguridad: Prevenir directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.startsWith('\\')) {
      return res.status(403).json({
        success: false,
        error: 'Ruta de archivo inválida (seguridad)'
      });
    }

    // Construir ruta completa desde la raíz del backend
    const backendRoot = path.join(__dirname, '..', '..');
    const fullPath = path.join(backendRoot, normalizedPath);

    // Verificar que el archivo existe
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: `Archivo no encontrado: ${filePath}`
      });
    }

    // Leer archivo completo
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const fileLines = fileContent.split('\n');

    let resultLines = fileLines;
    let startLine = 1;
    let endLine = fileLines.length;

    // Si se especifica un rango de líneas (ej: "1-100" o "50-150")
    if (lines && lines.includes('-')) {
      const [start, end] = lines.split('-').map(n => parseInt(n.trim()));

      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        startLine = start;
        endLine = Math.min(end, fileLines.length);
        resultLines = fileLines.slice(start - 1, end);
      }
    }

    // Retornar contenido con metadatos
    res.json({
      success: true,
      data: {
        filePath,
        totalLines: fileLines.length,
        requestedLines: lines || 'all',
        startLine,
        endLine,
        content: resultLines.join('\n'),
        lines: resultLines
      }
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error leyendo archivo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/engineering/update-task-description
 * Actualizar la descripción de una tarea específica en el roadmap
 */
router.post('/update-task-description', (req, res) => {
  try {
    const { taskId, phaseKey, description } = req.body;

    if (!taskId || !phaseKey || !description) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere taskId, phaseKey y description'
      });
    }

    // Recargar metadata para tener la versión más reciente
    reloadMetadata();

    // Buscar la fase y la tarea
    const phase = metadata.roadmap?.[phaseKey];
    if (!phase) {
      return res.status(404).json({
        success: false,
        error: `Fase "${phaseKey}" no encontrada en roadmap`
      });
    }

    if (!phase.tasks || !Array.isArray(phase.tasks)) {
      return res.status(404).json({
        success: false,
        error: `La fase "${phaseKey}" no tiene tareas`
      });
    }

    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Tarea "${taskId}" no encontrada en fase "${phaseKey}"`
      });
    }

    // Actualizar la descripción
    task.description = description;
    task.descriptionUpdatedAt = new Date().toISOString();

    // Guardar el archivo metadata
    const fs = require('fs');
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');
    const content = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(metadata, null, 2)};
`;
    fs.writeFileSync(metadataPath, content, 'utf8');

    // Recargar para confirmar
    reloadMetadata();

    console.log(`✅ [ENGINEERING] Descripción actualizada para tarea ${taskId}`);

    res.json({
      success: true,
      message: `Descripción de tarea ${taskId} actualizada`,
      task: {
        id: task.id,
        name: task.name,
        description: task.description
      }
    });

  } catch (error) {
    console.error('❌ [ENGINEERING] Error actualizando descripción:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
