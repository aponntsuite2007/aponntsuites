/**
 * ============================================================================
 * ENGINEERING ROUTES - API para Engineering Dashboard
 * ============================================================================
 *
 * Endpoints para acceder a engineering-metadata.js desde el frontend
 *
 * GET  /api/engineering/metadata         - Metadata completo
 * GET  /api/engineering/modules          - Solo módulos
 * GET  /api/engineering/roadmap          - Solo roadmap
 * GET  /api/engineering/workflows        - Solo workflows
 * GET  /api/engineering/database         - Solo database schema
 * GET  /api/engineering/applications     - Solo aplicaciones
 * POST /api/engineering/update           - Actualizar metadata (wrapper del script)
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
 * Retorna solo sección de módulos
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
    // Calcular stats
    const totalModules = Object.keys(metadata.modules).length;
    const completedModules = Object.values(metadata.modules).filter(m => m.status === 'PRODUCTION' || m.status === 'COMPLETE').length;
    const inProgressModules = Object.values(metadata.modules).filter(m => m.status === 'IN_PROGRESS').length;
    const plannedModules = Object.values(metadata.modules).filter(m => m.status === 'PLANNED').length;

    const totalPhases = Object.keys(metadata.roadmap).length;
    const completedPhases = Object.values(metadata.roadmap).filter(p => p.status === 'COMPLETE').length;
    const inProgressPhases = Object.values(metadata.roadmap).filter(p => p.status === 'IN_PROGRESS').length;

    // Calcular total de tareas en roadmap
    let totalTasks = 0;
    let completedTasks = 0;
    Object.values(metadata.roadmap).forEach(phase => {
      if (phase.tasks) {
        totalTasks += phase.tasks.length;
        completedTasks += phase.tasks.filter(t => t.done).length;
      }
    });

    const totalApplications = Object.keys(metadata.applications).length;
    const completedApplications = Object.values(metadata.applications).filter(a => a.status === 'PRODUCTION' || a.status === 'COMPLETE').length;

    const totalTables = metadata.database.totalTables || 0;
    const productionTables = Object.values(metadata.database.tables).filter(t => t.status === 'PRODUCTION').length;
    const plannedTables = Object.values(metadata.database.tables).filter(t => t.status === 'PLANNED').length;

    res.json({
      success: true,
      data: {
        project: {
          totalProgress: metadata.project.totalProgress,
          currentPhase: metadata.project.currentPhase,
          version: metadata.project.version
        },
        modules: {
          total: totalModules,
          completed: completedModules,
          inProgress: inProgressModules,
          planned: plannedModules,
          completionRate: Math.round((completedModules / totalModules) * 100)
        },
        roadmap: {
          totalPhases,
          completedPhases,
          inProgressPhases,
          totalTasks,
          completedTasks,
          taskCompletionRate: Math.round((completedTasks / totalTasks) * 100)
        },
        applications: {
          total: totalApplications,
          completed: completedApplications,
          completionRate: Math.round((completedApplications / totalApplications) * 100)
        },
        database: {
          totalTables,
          productionTables,
          plannedTables,
          completionRate: Math.round((productionTables / totalTables) * 100)
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

module.exports = router;
