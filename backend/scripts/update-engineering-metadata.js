#!/usr/bin/env node
/**
 * ============================================================================
 * SCRIPT: UPDATE ENGINEERING METADATA
 * ============================================================================
 *
 * Este script DEBE ejecutarse después de CADA cambio significativo.
 *
 * ⚠️ PARA CLAUDE CODE:
 * Después de completar una tarea, SIEMPRE ejecutar:
 *
 *   node scripts/update-engineering-metadata.js --task <task-id> --done
 *
 * Ejemplos:
 *   node scripts/update-engineering-metadata.js --task VH-1 --done
 *   node scripts/update-engineering-metadata.js --module users --progress 100 --status COMPLETE
 *   node scripts/update-engineering-metadata.js --add-issue "Error en campo X"
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Cargar metadata
const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');
let metadata = require(metadataPath);

// Parsear argumentos
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key] = value;
    i++;
  }
}

// Helper: Actualizar timestamp
function updateTimestamp() {
  const now = new Date().toISOString();
  metadata.project.lastUpdated = now;
  return now;
}

// Helper: Marcar tarea como completada
function markTaskDone(taskId) {
  let found = false;

  // Buscar en roadmap
  for (const phaseKey in metadata.roadmap) {
    const phase = metadata.roadmap[phaseKey];
    if (phase.tasks) {
      const task = phase.tasks.find(t => t.id === taskId);
      if (task) {
        task.done = true;
        found = true;
        console.log(`✅ Tarea ${taskId} marcada como completada en ${phaseKey}`);

        // Recalcular progress de la fase
        const totalTasks = phase.tasks.length;
        const doneTasks = phase.tasks.filter(t => t.done).length;
        phase.progress = Math.round((doneTasks / totalTasks) * 100);
        console.log(`📊 Progress de ${phase.name}: ${phase.progress}%`);
      }
    }
  }

  if (!found) {
    console.error(`❌ Tarea ${taskId} no encontrada en roadmap`);
  }

  return found;
}

// Helper: Actualizar progreso de módulo
function updateModuleProgress(moduleKey, progress, status) {
  if (metadata.modules[moduleKey]) {
    if (progress !== undefined) {
      metadata.modules[moduleKey].progress = parseInt(progress);
      console.log(`📊 Módulo ${moduleKey}: ${progress}% completado`);
    }
    if (status) {
      metadata.modules[moduleKey].status = status;
      console.log(`🔄 Módulo ${moduleKey}: estado → ${status}`);
    }
    metadata.modules[moduleKey].lastUpdated = new Date().toISOString().split('T')[0];
  } else {
    console.error(`❌ Módulo ${moduleKey} no encontrado`);
  }
}

// Helper: Agregar issue conocido
function addKnownIssue(moduleKey, issue) {
  if (metadata.modules[moduleKey]) {
    if (!metadata.modules[moduleKey].knownIssues) {
      metadata.modules[moduleKey].knownIssues = [];
    }
    metadata.modules[moduleKey].knownIssues.push(issue);
    console.log(`⚠️ Issue agregado a ${moduleKey}: ${issue}`);
  } else {
    console.error(`❌ Módulo ${moduleKey} no encontrado`);
  }
}

// Helper: Guardar metadata actualizado
function saveMetadata() {
  const content = `module.exports = ${JSON.stringify(metadata, null, 2)};`;
  fs.writeFileSync(metadataPath, content, 'utf8');
  console.log(`💾 Metadata guardado en ${metadataPath}`);
}

// ==================== COMANDOS ====================

// Comando: --task <id> --done
if (options.task && options.done !== undefined) {
  markTaskDone(options.task);
  updateTimestamp();
  saveMetadata();
}

// Comando: --module <key> --progress <num> --status <status>
else if (options.module) {
  updateModuleProgress(options.module, options.progress, options.status);
  updateTimestamp();
  saveMetadata();
}

// Comando: --add-issue <message> --module <key>
else if (options['add-issue'] && options.module) {
  addKnownIssue(options.module, options['add-issue']);
  updateTimestamp();
  saveMetadata();
}

// Comando: --help
else if (options.help) {
  console.log(`
📋 UPDATE ENGINEERING METADATA - Comandos disponibles:

1. Marcar tarea como completada:
   node scripts/update-engineering-metadata.js --task VH-1 --done

2. Actualizar progreso de módulo:
   node scripts/update-engineering-metadata.js --module users --progress 100 --status COMPLETE

3. Agregar issue conocido:
   node scripts/update-engineering-metadata.js --module users --add-issue "Error en campo X"

4. Ver ayuda:
   node scripts/update-engineering-metadata.js --help
  `);
}

else {
  console.error('❌ Comando no reconocido. Usa --help para ver comandos disponibles.');
  process.exit(1);
}
