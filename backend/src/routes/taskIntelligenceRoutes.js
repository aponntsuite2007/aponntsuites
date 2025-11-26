/**
 * ============================================================================
 * TASK INTELLIGENCE ROUTES - API REST PARA SISTEMA INTELIGENTE
 * ============================================================================
 *
 * ENDPOINTS:
 *
 * PRE-TAREA:
 * - POST /api/task-intelligence/analyze - Analizar tarea antes de empezar
 *
 * POST-TAREA:
 * - POST /api/task-intelligence/complete - Marcar tarea completada y sincronizar
 * - GET /api/task-intelligence/inconsistencies - Ver descoordinaciones
 *
 * ASIGNACIÓN:
 * - POST /api/task-intelligence/assign-to-claude - Asignar tarea a Claude Code
 * - POST /api/task-intelligence/assign-to-human - Asignar tarea a humano
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const PreTaskAnalyzer = require('../services/PreTaskAnalyzer');
const PostTaskSynchronizer = require('../services/PostTaskSynchronizer');

/**
 * ============================================================================
 * PRE-TASK ANALYSIS
 * ============================================================================
 */

/**
 * POST /api/task-intelligence/analyze
 * Analiza una tarea ANTES de empezar
 *
 * Body:
 * {
 *   "description": "Implementar sistema de comisiones piramidales",
 *   "moduleKey": "vendedores" (opcional)
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { description, moduleKey } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Campo "description" es requerido'
      });
    }

    console.log(`\n📥 [API] Solicitud de análisis pre-tarea: "${description}"`);

    const analysis = await PreTaskAnalyzer.analyzeTask({
      description,
      moduleKey
    });

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error(`❌ Error en análisis pre-tarea: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================================================
 * POST-TASK SYNCHRONIZATION
 * ============================================================================
 */

/**
 * POST /api/task-intelligence/complete
 * Marca una tarea como completada y dispara sincronización automática
 *
 * Body:
 * {
 *   "taskId": "VH-1",
 *   "phaseKey": "phase1_vendorHierarchy",
 *   "moduleKey": "vendedores" (opcional),
 *   "completedBy": "claude-code" | "human"
 * }
 */
router.post('/complete', async (req, res) => {
  try {
    const { taskId, phaseKey, moduleKey, completedBy } = req.body;

    if (!taskId || !phaseKey || !completedBy) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: taskId, phaseKey, completedBy'
      });
    }

    console.log(`\n✅ [API] Tarea completada: ${taskId} (${phaseKey})`);
    console.log(`   Completado por: ${completedBy}`);

    const syncResult = await PostTaskSynchronizer.synchronize({
      taskId,
      phaseKey,
      moduleKey,
      completedBy
    });

    res.json({
      success: syncResult.success,
      result: syncResult
    });

  } catch (error) {
    console.error(`❌ Error en sincronización post-tarea: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/task-intelligence/inconsistencies
 * Obtiene lista de descoordinaciones actuales
 */
router.get('/inconsistencies', async (req, res) => {
  try {
    const CodeIntelligenceService = require('../services/CodeIntelligenceService');
    const report = await CodeIntelligenceService.generateInconsistencyReport();

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error(`❌ Error obteniendo inconsistencias: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================================================
 * TASK ASSIGNMENT
 * ============================================================================
 */

/**
 * POST /api/task-intelligence/assign-to-claude
 * Asigna una tarea a Claude Code y prepara sesión
 *
 * Body:
 * {
 *   "taskId": "VH-20",
 *   "phaseKey": "phase2_budgetsContracts",
 *   "instructions": "Implementar backend completo para presupuestos"
 * }
 */
router.post('/assign-to-claude', async (req, res) => {
  try {
    const { taskId, phaseKey, instructions } = req.body;

    if (!taskId || !phaseKey) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: taskId, phaseKey'
      });
    }

    console.log(`\n🤖 [API] Asignando tarea a Claude Code: ${taskId}`);

    // Primero, analizar la tarea
    const analysis = await PreTaskAnalyzer.analyzeTask({
      description: instructions || `Completar tarea ${taskId}`,
      moduleKey: null
    });

    // Generar contexto para Claude
    const projectPath = 'C:\\Bio\\sistema_asistencia_biometrico';
    const claudeContext = {
      taskId,
      phaseKey,
      instructions: instructions || '',
      preAnalysis: analysis,
      commandToRun: `cd ${projectPath} && claude`,
      message: `
════════════════════════════════════════════════════════════════
🎯 TAREA ASIGNADA: ${taskId} (${phaseKey})
════════════════════════════════════════════════════════════════

📁 PROYECTO: ${projectPath}
   Backend:  ${projectPath}\\backend
   Frontend: ${projectPath}\\backend\\public

📋 CONTEXTO PREVIO:
- Existe en roadmap: ${analysis.existsInRoadmap ? 'SÍ' : 'NO'}
- Existe en código: ${analysis.existsInCode ? 'SÍ' : 'NO'}
- Completitud estimada: ${analysis.completionStatus.estimated}%
- Recomendación: ${analysis.recommendation}

📝 PLAN DE EJECUCIÓN:
${analysis.executionPlan.map((step, i) => `${i + 1}. ${step}`).join('\n')}
${instructions ? `\n💬 INSTRUCCIONES ADICIONALES:\n${instructions}` : ''}

════════════════════════════════════════════════════════════════
⚠️ IMPORTANTE AL FINALIZAR:
════════════════════════════════════════════════════════════════
1. Actualizar backend/engineering-metadata.js marcando tarea done: true
2. Ejecutar:
   curl -X POST http://localhost:9998/api/task-intelligence/complete \\
     -H "Content-Type: application/json" \\
     -d '{"taskId": "${taskId}", "phaseKey": "${phaseKey}", "completedBy": "claude-code"}'

📚 DOCUMENTACIÓN: Leer backend/CLAUDE.md para reglas del proyecto
`
    };

    res.json({
      success: true,
      message: 'Tarea asignada a Claude Code',
      claudeContext
    });

  } catch (error) {
    console.error(`❌ Error asignando tarea a Claude: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/task-intelligence/assign-to-human
 * Asigna una tarea a un desarrollador humano
 *
 * Body:
 * {
 *   "taskId": "VH-21",
 *   "phaseKey": "phase2_budgetsContracts",
 *   "assignedTo": "Developer Name"
 * }
 */
router.post('/assign-to-human', async (req, res) => {
  try {
    const { taskId, phaseKey, assignedTo } = req.body;

    if (!taskId || !phaseKey || !assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: taskId, phaseKey, assignedTo'
      });
    }

    console.log(`\n👤 [API] Asignando tarea a humano: ${taskId} → ${assignedTo}`);

    // Analizar tarea
    const analysis = await PreTaskAnalyzer.analyzeTask({
      description: `Tarea ${taskId}`,
      moduleKey: null
    });

    // Actualizar metadata con assignedTo
    const metadataPath = require('path').join(__dirname, '../../engineering-metadata.js');
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    const phase = metadata.roadmap[phaseKey];
    if (phase && phase.tasks) {
      const task = phase.tasks.find(t => t.id === taskId);
      if (task) {
        task.assignedTo = assignedTo;
        task.assignedDate = new Date().toISOString().split('T')[0];

        // Guardar
        const fs = require('fs');
        const content = `/**\n * ENGINEERING METADATA - AUTO-UPDATED\n * Last update: ${new Date().toISOString()}\n */\n\nmodule.exports = ${JSON.stringify(metadata, null, 2)};\n`;
        fs.writeFileSync(metadataPath, content, 'utf8');
      }
    }

    res.json({
      success: true,
      message: `Tarea ${taskId} asignada a ${assignedTo}`,
      analysis
    });

  } catch (error) {
    console.error(`❌ Error asignando tarea a humano: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================================================
 * CREATE PHASE - Crear nueva fase desde TODO list de Claude
 * ============================================================================
 */

/**
 * POST /api/task-intelligence/create-phase
 * Crea una nueva fase en el roadmap desde el TODO list de Claude
 *
 * Body:
 * {
 *   "phaseKey": "nueva_feature_xyz",
 *   "phaseName": "Nueva Feature XYZ",
 *   "description": "Descripción opcional",
 *   "tasks": [
 *     { "id": "XYZ-1", "name": "Primera tarea a realizar" },
 *     { "id": "XYZ-2", "name": "Segunda tarea", "dependencies": ["XYZ-1"] }
 *   ],
 *   "priority": "HIGH" | "MEDIUM" | "LOW",
 *   "dependencies": ["authentication", "users"], // módulos de los que depende
 *   "estimatedEffort": "10-15 horas"
 * }
 */
router.post('/create-phase', async (req, res) => {
  try {
    const { phaseKey, phaseName, description, tasks, priority, dependencies, estimatedEffort } = req.body;

    // Validaciones
    if (!phaseKey || !phaseName || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: phaseKey, phaseName, tasks (array con al menos 1 tarea)'
      });
    }

    // Validar estructura de tasks
    for (const task of tasks) {
      if (!task.id || !task.name) {
        return res.status(400).json({
          success: false,
          error: 'Cada tarea debe tener "id" y "name"'
        });
      }
    }

    console.log(`\n📋 [API] Creando nueva fase en roadmap: "${phaseName}" con ${tasks.length} tareas`);

    // Cargar metadata actual
    const path = require('path');
    const fs = require('fs');
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');

    // Limpiar cache para obtener versión más reciente
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    // Verificar que la fase no exista
    if (metadata.roadmap[phaseKey]) {
      return res.status(400).json({
        success: false,
        error: `La fase "${phaseKey}" ya existe en el roadmap`
      });
    }

    // Crear la nueva fase
    const today = new Date().toISOString().split('T')[0];
    const newPhase = {
      name: phaseName,
      description: description || `Fase creada automáticamente el ${today}`,
      status: "IN_PROGRESS",
      startDate: today,
      completionDate: null,
      progress: 0,
      priority: priority || "MEDIUM",
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        done: false,
        completedDate: null,
        assignedTo: task.assignedTo || null,
        dependencies: task.dependencies || []
      })),
      dependencies: dependencies || [],
      estimatedEffort: estimatedEffort || "Por estimar",
      actualEffort: null,
      documentReference: null,
      createdBy: "claude-code",
      createdAt: new Date().toISOString()
    };

    // Agregar al roadmap
    metadata.roadmap[phaseKey] = newPhase;

    // Actualizar lastUpdated del proyecto
    metadata.project.lastUpdated = new Date().toISOString();

    // Agregar a latestChanges
    metadata.project.latestChanges.unshift(
      `📋 Nueva fase creada: ${phaseName} (${tasks.length} tareas) - ${today}`
    );

    // Limitar latestChanges a 50 entries
    if (metadata.project.latestChanges.length > 50) {
      metadata.project.latestChanges = metadata.project.latestChanges.slice(0, 50);
    }

    // Guardar metadata actualizada
    const content = `/**
 * ENGINEERING METADATA - AUTO-UPDATED
 * Last update: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(metadata, null, 2)};
`;
    fs.writeFileSync(metadataPath, content, 'utf8');

    console.log(`✅ [API] Fase "${phaseName}" creada exitosamente con ${tasks.length} tareas`);

    // Preparar respuesta con contexto para Claude
    const claudeContext = {
      phaseKey,
      phaseName,
      totalTasks: tasks.length,
      taskIds: tasks.map(t => t.id),
      instructions: `
📋 FASE CREADA: ${phaseName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ${tasks.length} tareas agregadas al roadmap
📊 Visible en Engineering Dashboard → Tab Roadmap
🎯 Visible en Engineering Dashboard → Tab Camino Crítico

TAREAS PENDIENTES:
${tasks.map((t, i) => `${i + 1}. [${t.id}] ${t.name}`).join('\n')}

⚠️ AL COMPLETAR CADA TAREA, EJECUTAR:
POST /api/task-intelligence/complete
{
  "taskId": "<TASK_ID>",
  "phaseKey": "${phaseKey}",
  "completedBy": "claude-code"
}

Esto actualizará automáticamente:
- ✅ Roadmap (done: true, completedDate)
- ✅ Progress de la fase (%)
- ✅ Camino Crítico (recalcula slack)
- ✅ Overview (progreso global)
`
    };

    res.json({
      success: true,
      message: `Fase "${phaseName}" creada con ${tasks.length} tareas`,
      phase: newPhase,
      claudeContext
    });

  } catch (error) {
    console.error(`❌ Error creando fase: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/task-intelligence/my-pending-tasks
 * Obtiene todas las tareas pendientes asignadas a claude-code
 */
router.get('/my-pending-tasks', async (req, res) => {
  try {
    const path = require('path');
    const metadataPath = path.join(__dirname, '../../engineering-metadata.js');

    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    const pendingTasks = [];

    // Recorrer todas las fases del roadmap
    for (const [phaseKey, phase] of Object.entries(metadata.roadmap || {})) {
      if (phase.tasks) {
        for (const task of phase.tasks) {
          if (!task.done) {
            pendingTasks.push({
              taskId: task.id,
              taskName: task.name,
              phaseKey,
              phaseName: phase.name,
              priority: phase.priority || 'MEDIUM',
              dependencies: task.dependencies || [],
              assignedTo: task.assignedTo || null
            });
          }
        }
      }
    }

    res.json({
      success: true,
      totalPending: pendingTasks.length,
      tasks: pendingTasks
    });

  } catch (error) {
    console.error(`❌ Error obteniendo tareas pendientes: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
