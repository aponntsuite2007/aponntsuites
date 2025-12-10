/**
 * ============================================================================
 * CRITICAL PATH ROUTES - API REST PARA CAMINO CRÍTICO
 * ============================================================================
 *
 * ENDPOINTS:
 * - GET  /api/critical-path/analyze - Calcular camino crítico
 * - POST /api/critical-path/update-priority - Actualizar prioridad de tarea
 * - POST /api/critical-path/reorder - Reordenar tareas
 * - GET  /api/critical-path/suggested-order - Orden sugerido
 * - GET  /api/critical-path/statistics - Estadísticas del proyecto
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const CriticalPathAnalyzer = require('../services/CriticalPathAnalyzer');
const fs = require('fs');
const path = require('path');

// Referencia al Brain Service (se inyecta desde server.js)
let brainService = null;

/**
 * Middleware para obtener Brain Service del app
 */
router.use((req, res, next) => {
  if (!brainService) {
    brainService = req.app.get('brainService');
  }
  next();
});

/**
 * GET /api/critical-path/analyze
 * Calcula el camino crítico del roadmap completo
 * AHORA ENRIQUECIDO con datos LIVE del Brain
 */
router.get('/analyze', async (req, res) => {
  try {
    console.log(`\n📥 [API] Solicitud de análisis de camino crítico (con Brain)`);

    // Leer metadata (PLAN)
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    if (!metadata.roadmap) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró roadmap en metadata'
      });
    }

    // Analizar camino crítico (PLAN base)
    const analysis = CriticalPathAnalyzer.analyze(metadata.roadmap);

    // Enriquecer con datos LIVE del Brain si está disponible
    if (brainService) {
      try {
        // Obtener archivos escaneados por el Brain
        const backendFiles = await brainService.scanBackendFiles();
        const frontendFiles = await brainService.scanFrontendFiles();

        // Combinar todos los archivos escaneados (estructura: categories.X.files)
        const allFiles = [
          ...(backendFiles?.categories?.routes?.files || []),
          ...(backendFiles?.categories?.services?.files || []),
          ...(backendFiles?.categories?.models?.files || []),
          ...(frontendFiles?.categories?.modules?.files || []),
          ...(frontendFiles?.categories?.pages?.files || [])
        ];

        // Mapear nombres de archivos a un set para búsqueda rápida
        const liveFileNames = new Set(
          allFiles.map(f => {
            const basename = path.basename(f.path || f.name || '', '.js').toLowerCase();
            return basename;
          })
        );

        // Enriquecer tareas con verificación LIVE
        analysis.tasks = analysis.tasks.map(task => {
          // Intentar detectar si el archivo relacionado existe
          const taskNameLower = (task.name || '').toLowerCase();

          // Patrones para detectar archivos relacionados
          const filePatterns = [
            // "ConsentRegionService.js" -> "consentregionservice"
            taskNameLower.split(' ')[0].replace(/\.js$/i, '').replace(/[^a-z0-9]/gi, ''),
            // Buscar por nombre de módulo
            taskNameLower.includes('route') ? 'routes' : null,
            taskNameLower.includes('service') ? 'service' : null,
            taskNameLower.includes('model') ? 'model' : null
          ].filter(Boolean);

          // Verificar si algún archivo LIVE coincide
          let liveVerified = false;
          let liveFile = null;

          for (const pattern of filePatterns) {
            for (const fileName of liveFileNames) {
              if (fileName.includes(pattern) || pattern.includes(fileName)) {
                liveVerified = true;
                liveFile = fileName;
                break;
              }
            }
            if (liveVerified) break;
          }

          return {
            ...task,
            liveVerified,
            liveFile,
            dataSource: liveVerified ? 'BRAIN_VERIFIED' : 'ROADMAP_ONLY'
          };
        });

        analysis.brainConnected = true;
        analysis.liveFilesScanned = liveFileNames.size;
        console.log(`   🧠 Brain conectado: ${liveFileNames.size} archivos verificados`);

      } catch (brainError) {
        console.log(`   ⚠️ Brain no disponible: ${brainError.message}`);
        analysis.brainConnected = false;
      }
    } else {
      analysis.brainConnected = false;
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error(`❌ Error en análisis de camino crítico: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/critical-path/update-priority
 * Actualiza la prioridad de una tarea y recalcula
 *
 * Body:
 * {
 *   "taskId": "VH-1",
 *   "phaseKey": "phase1_vendorHierarchy",
 *   "priority": 8
 * }
 */
router.post('/update-priority', async (req, res) => {
  try {
    const { taskId, phaseKey, priority } = req.body;

    if (!taskId || !phaseKey || priority === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: taskId, phaseKey, priority'
      });
    }

    if (priority < 1 || priority > 10) {
      return res.status(400).json({
        success: false,
        error: 'Priority debe estar entre 1 y 10'
      });
    }

    console.log(`\n✏️  [API] Actualizando prioridad: ${taskId} → ${priority}`);

    // Leer metadata
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    // Buscar y actualizar tarea
    const phase = metadata.roadmap[phaseKey];
    if (!phase || !phase.tasks) {
      return res.status(404).json({
        success: false,
        error: `Phase ${phaseKey} no encontrada`
      });
    }

    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task ${taskId} no encontrada`
      });
    }

    const oldPriority = task.priority || 5;
    task.priority = priority;

    // Guardar metadata
    const content = `/**\n * ENGINEERING METADATA - AUTO-UPDATED\n * Last update: ${new Date().toISOString()}\n */\n\nmodule.exports = ${JSON.stringify(metadata, null, 2)};\n`;
    fs.writeFileSync(metadataPath, content, 'utf8');

    // Recalcular camino crítico
    const analysis = CriticalPathAnalyzer.analyze(metadata.roadmap);

    res.json({
      success: true,
      message: `Prioridad actualizada: ${oldPriority} → ${priority}`,
      analysis
    });

  } catch (error) {
    console.error(`❌ Error actualizando prioridad: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/critical-path/reorder
 * Reordena tareas en el roadmap según un nuevo orden
 *
 * Body:
 * {
 *   "phaseKey": "phase1_vendorHierarchy",
 *   "taskOrder": ["VH-3", "VH-1", "VH-2", ...]
 * }
 */
router.post('/reorder', async (req, res) => {
  try {
    const { phaseKey, taskOrder } = req.body;

    if (!phaseKey || !taskOrder || !Array.isArray(taskOrder)) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: phaseKey, taskOrder (array)'
      });
    }

    console.log(`\n🔄 [API] Reordenando tareas en ${phaseKey}`);

    // Leer metadata
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    const phase = metadata.roadmap[phaseKey];
    if (!phase || !phase.tasks) {
      return res.status(404).json({
        success: false,
        error: `Phase ${phaseKey} no encontrada`
      });
    }

    // Reordenar tareas
    const reorderedTasks = [];
    const taskMap = new Map(phase.tasks.map(t => [t.id, t]));

    for (const taskId of taskOrder) {
      const task = taskMap.get(taskId);
      if (task) {
        reorderedTasks.push(task);
        taskMap.delete(taskId);
      }
    }

    // Agregar tareas no incluidas en taskOrder al final
    taskMap.forEach(task => {
      reorderedTasks.push(task);
    });

    phase.tasks = reorderedTasks;

    // Guardar metadata
    const content = `/**\n * ENGINEERING METADATA - AUTO-UPDATED\n * Last update: ${new Date().toISOString()}\n */\n\nmodule.exports = ${JSON.stringify(metadata, null, 2)};\n`;
    fs.writeFileSync(metadataPath, content, 'utf8');

    // Recalcular camino crítico
    const analysis = CriticalPathAnalyzer.analyze(metadata.roadmap);

    res.json({
      success: true,
      message: `Tareas reordenadas en ${phaseKey}`,
      newOrder: reorderedTasks.map(t => t.id),
      analysis
    });

  } catch (error) {
    console.error(`❌ Error reordenando tareas: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/critical-path/suggested-order
 * Obtiene el orden sugerido de tareas basado en CPM
 */
router.get('/suggested-order', async (req, res) => {
  try {
    console.log(`\n💡 [API] Solicitud de orden sugerido`);

    // Leer metadata
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    // Analizar camino crítico
    CriticalPathAnalyzer.analyze(metadata.roadmap);

    // Obtener orden sugerido
    const suggestedOrder = CriticalPathAnalyzer.getSuggestedOrder();

    res.json({
      success: true,
      suggestedOrder: suggestedOrder.map(t => ({
        id: t.id,
        name: t.name,
        phaseKey: t.phaseKey,
        isCritical: t.isCritical,
        slack: t.slack,
        priority: t.priority,
        es: t.es,
        ef: t.ef,
        duration: t.duration
      }))
    });

  } catch (error) {
    console.error(`❌ Error obteniendo orden sugerido: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/critical-path/statistics
 * Obtiene estadísticas del proyecto
 */
router.get('/statistics', async (req, res) => {
  try {
    console.log(`\n📊 [API] Solicitud de estadísticas`);

    // Leer metadata
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    // Analizar camino crítico
    CriticalPathAnalyzer.analyze(metadata.roadmap);

    // Obtener estadísticas
    const statistics = CriticalPathAnalyzer.getStatistics();

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
