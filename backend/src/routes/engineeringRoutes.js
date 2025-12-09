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

// Cargar metadata
let metadata = require('../../engineering-metadata');

/**
 * Función helper para recargar metadata (después de actualizaciones)
 */
function reloadMetadata() {
  try {
    delete require.cache[require.resolve('../../engineering-metadata')];
    metadata = require('../../engineering-metadata');
    console.log('✅ [ENGINEERING] Metadata recargado');
    return true;
  } catch (error) {
    console.error('❌ [ENGINEERING] Error recargando metadata:', error);
    return false;
  }
}

/**
 * GET /api/engineering/metadata
 * Retorna metadata completo
 */
router.get('/metadata', (req, res) => {
  try {
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('❌ [ENGINEERING] Error en GET /metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/modules
 * Retorna solo sección de módulos técnicos
 */
router.get('/modules', (req, res) => {
  try {
    res.json({
      success: true,
      data: metadata.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/commercial-modules
 * Retorna TODOS los módulos comerciales contratables (SINGLE SOURCE OF TRUTH)
 * Esta es la API que deben usar: panel-administrativo, panel-empresa, index.html
 */
router.get('/commercial-modules', (req, res) => {
  try {
    const commercialModules = metadata.commercialModules;

    if (!commercialModules) {
      return res.status(404).json({
        success: false,
        error: 'commercialModules no encontrado en metadata. Ejecutar: node scripts/consolidate-modules-simple.js'
      });
    }

    res.json({
      success: true,
      data: {
        modules: commercialModules.modules,
        bundles: commercialModules.bundles,
        licensesTiers: commercialModules.licensesTiers,
        stats: commercialModules._stats,
        version: commercialModules._version,
        lastSync: commercialModules._lastSync
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
router.get('/roadmap', (req, res) => {
  try {
    res.json({
      success: true,
      data: metadata.roadmap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/workflows
 * Retorna solo workflows
 */
router.get('/workflows', (req, res) => {
  try {
    res.json({
      success: true,
      data: metadata.workflows
    });
  } catch (error) {
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
router.get('/database', (req, res) => {
  try {
    res.json({
      success: true,
      data: metadata.database
    });
  } catch (error) {
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
router.get('/applications', (req, res) => {
  try {
    res.json({
      success: true,
      data: metadata.applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/engineering/stats
 * Retorna estadísticas agregadas
 */
router.get('/stats', (req, res) => {
  try {
    // Validar que existan las propiedades necesarias
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
