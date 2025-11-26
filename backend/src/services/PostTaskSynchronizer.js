/**
 * ============================================================================
 * POST-TASK SYNCHRONIZER - SINCRONIZACIÓN AUTOMÁTICA AL COMPLETAR
 * ============================================================================
 *
 * PROPÓSITO:
 * Cuando una tarea se completa (Claude o humano), SE DISPARA AUTOMÁTICAMENTE:
 * 1. Actualizar roadmap (marcar done: true, agregar completedDate)
 * 2. Analizar cambios realizados en código
 * 3. Detectar descoordinaciones modules vs roadmap
 * 4. Sincronizar TODO el módulo ingeniería
 * 5. Actualizar relaciones y dependencies
 * 6. Reorganizar info afectada en Engineering Dashboard
 *
 * FLUJO:
 * Tarea completada → Trigger → PostTaskSynchronizer → Todo actualizado
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

class PostTaskSynchronizer {
  constructor() {
    this.backendRoot = path.join(__dirname, '../..');
    this.metadataPath = path.join(this.backendRoot, 'engineering-metadata.js');
  }

  /**
   * ============================================================================
   * SINCRONIZACIÓN PRINCIPAL
   * ============================================================================
   */

  /**
   * Sincroniza todo AL COMPLETAR una tarea
   * @param {Object} completedTask - Tarea completada
   * @param {string} completedTask.taskId - ID de la tarea (ej: "VH-1")
   * @param {string} completedTask.phaseKey - Phase en roadmap (ej: "phase1_vendorHierarchy")
   * @param {string} completedTask.moduleKey - Módulo relacionado (opcional)
   * @param {string} completedTask.completedBy - "claude-code" o "human"
   * @returns {Object} Resultado de la sincronización
   */
  async synchronize(completedTask) {
    console.log(`\n🚀 [POST-TASK SYNCHRONIZER] Iniciando sincronización...`);
    console.log(`   Tarea: ${completedTask.taskId}`);
    console.log(`   Phase: ${completedTask.phaseKey}`);
    console.log(`   Completado por: ${completedTask.completedBy}`);

    const syncResult = {
      timestamp: new Date().toISOString(),
      taskId: completedTask.taskId,
      phaseKey: completedTask.phaseKey,
      moduleKey: completedTask.moduleKey,
      steps: [],
      changes: [],
      inconsistencies: [],
      affectedModules: [],
      success: false,
      error: null
    };

    try {
      // PASO 1: Actualizar roadmap
      await this.updateRoadmap(completedTask, syncResult);

      // PASO 2: Analizar cambios en código
      await this.analyzeCodeChanges(completedTask, syncResult);

      // PASO 3: Detectar descoordinaciones
      await this.detectInconsistencies(completedTask, syncResult);

      // PASO 4: Sincronizar modules con roadmap
      await this.synchronizeModulesWithRoadmap(completedTask, syncResult);

      // PASO 5: Actualizar dependencies
      await this.updateDependencies(completedTask, syncResult);

      // PASO 6: Reorganizar info afectada
      await this.reorganizeAffectedInfo(completedTask, syncResult);

      // PASO 7: Actualizar stack tecnológico (si cambiaron tecnologías)
      await this.updateTechnologyStack(completedTask, syncResult);

      // PASO 8: Generar reporte
      this.generateSyncReport(syncResult);

      syncResult.success = true;

    } catch (error) {
      console.error(`❌ Error en sincronización: ${error.message}`);
      syncResult.error = error.message;
      syncResult.success = false;
    }

    return syncResult;
  }

  /**
   * ============================================================================
   * PASO 1: ACTUALIZAR ROADMAP
   * ============================================================================
   */

  async updateRoadmap(task, result) {
    console.log(`\n📊 PASO 1: Actualizando roadmap...`);

    try {
      // Leer metadata actual
      delete require.cache[require.resolve(this.metadataPath)];
      const metadata = require(this.metadataPath);

      if (!metadata.roadmap || !metadata.roadmap[task.phaseKey]) {
        throw new Error(`Phase ${task.phaseKey} no encontrada en roadmap`);
      }

      const phase = metadata.roadmap[task.phaseKey];

      // Buscar la tarea
      const taskIndex = phase.tasks?.findIndex(t => t.id === task.taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${task.taskId} no encontrada en phase ${task.phaseKey}`);
      }

      const taskItem = phase.tasks[taskIndex];

      // Actualizar tarea
      const changes = [];
      if (!taskItem.done) {
        taskItem.done = true;
        changes.push(`✅ Marcado done: true`);
      }

      if (!taskItem.completedDate) {
        taskItem.completedDate = new Date().toISOString().split('T')[0];
        changes.push(`📅 Agregado completedDate: ${taskItem.completedDate}`);
      }

      if (!taskItem.completedBy) {
        taskItem.completedBy = task.completedBy;
        changes.push(`👤 Agregado completedBy: ${task.completedBy}`);
      }

      // Recalcular progress de la phase
      const totalTasks = phase.tasks.length;
      const doneTasks = phase.tasks.filter(t => t.done).length;
      const oldProgress = phase.progress;
      const newProgress = Math.round((doneTasks / totalTasks) * 100);

      if (oldProgress !== newProgress) {
        phase.progress = newProgress;
        changes.push(`📈 Progress actualizado: ${oldProgress}% → ${newProgress}%`);
      }

      // Si todas las tareas están done, marcar phase como COMPLETED
      if (doneTasks === totalTasks && phase.status !== 'COMPLETED') {
        phase.status = 'COMPLETED';
        phase.actualCompletion = new Date().toISOString().split('T')[0];
        changes.push(`🎉 Phase marcada como COMPLETED`);
      }

      result.steps.push({
        step: 1,
        name: 'Actualizar roadmap',
        status: 'success',
        changes
      });

      result.changes.push(...changes);

      console.log(`   ✅ Roadmap actualizado:`);
      changes.forEach(c => console.log(`      ${c}`));

      // GUARDAR CAMBIOS AL ARCHIVO
      await this.saveMetadata(metadata);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      result.steps.push({
        step: 1,
        name: 'Actualizar roadmap',
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * ============================================================================
   * PASO 2: ANALIZAR CAMBIOS EN CÓDIGO
   * ============================================================================
   */

  async analyzeCodeChanges(task, result) {
    console.log(`\n💻 PASO 2: Analizando cambios en código...`);

    try {
      const changes = {
        newFiles: [],
        modifiedFiles: [],
        newTables: [],
        newEndpoints: []
      };

      // Aquí podrías integrar con Git para ver qué cambió
      // Por ahora, hacemos análisis estático

      // Buscar archivos relacionados con la tarea
      const keywords = this.extractKeywordsFromTask(task);

      // Buscar nuevos modelos
      const modelsDir = path.join(this.backendRoot, 'src/models');
      if (fs.existsSync(modelsDir)) {
        const files = fs.readdirSync(modelsDir);
        for (const file of files) {
          if (keywords.some(kw => file.toLowerCase().includes(kw.toLowerCase()))) {
            changes.newFiles.push(`models/${file}`);
          }
        }
      }

      result.steps.push({
        step: 2,
        name: 'Analizar cambios en código',
        status: 'success',
        changes
      });

      if (changes.newFiles.length > 0) {
        console.log(`   ✅ Archivos nuevos detectados: ${changes.newFiles.length}`);
      } else {
        console.log(`   ℹ️  No se detectaron archivos nuevos evidentes`);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      result.steps.push({
        step: 2,
        name: 'Analizar cambios en código',
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * ============================================================================
   * PASO 3: DETECTAR DESCOORDINACIONES
   * ============================================================================
   */

  async detectInconsistencies(task, result) {
    console.log(`\n🔍 PASO 3: Detectando descoordinaciones...`);

    try {
      delete require.cache[require.resolve(this.metadataPath)];
      const metadata = require(this.metadataPath);

      const inconsistencies = [];

      // Comparar roadmap vs modules
      const phase = metadata.roadmap[task.phaseKey];
      if (!phase) {
        return;
      }

      // Buscar módulo relacionado
      for (const [moduleKey, moduleData] of Object.entries(metadata.modules || {})) {
        // Si el nombre del módulo coincide con el nombre de la phase
        const phaseNameLower = phase.name.toLowerCase();
        const moduleNameLower = moduleData.name.toLowerCase();

        if (this.namesAreRelated(phaseNameLower, moduleNameLower)) {
          // Comparar progress
          if (Math.abs(moduleData.progress - phase.progress) > 10) {
            inconsistencies.push({
              type: 'PROGRESS_MISMATCH',
              severity: 'HIGH',
              module: moduleKey,
              moduleProgress: moduleData.progress,
              phaseKey: task.phaseKey,
              phaseProgress: phase.progress,
              difference: Math.abs(moduleData.progress - phase.progress)
            });

            console.log(`   ⚠️  DESCOORDINACIÓN: modules.${moduleKey} (${moduleData.progress}%) vs roadmap.${task.phaseKey} (${phase.progress}%)`);
          }

          // Comparar status
          if (moduleData.status !== phase.status) {
            inconsistencies.push({
              type: 'STATUS_MISMATCH',
              severity: 'HIGH',
              module: moduleKey,
              moduleStatus: moduleData.status,
              phaseKey: task.phaseKey,
              phaseStatus: phase.status
            });

            console.log(`   ⚠️  DESCOORDINACIÓN: modules.${moduleKey}.status (${moduleData.status}) vs roadmap.${task.phaseKey}.status (${phase.status})`);
          }

          result.affectedModules.push(moduleKey);
        }
      }

      result.inconsistencies = inconsistencies;

      result.steps.push({
        step: 3,
        name: 'Detectar descoordinaciones',
        status: 'success',
        inconsistencies
      });

      if (inconsistencies.length === 0) {
        console.log(`   ✅ No se encontraron descoordinaciones`);
      } else {
        console.log(`   ⚠️  ${inconsistencies.length} descoordinaciones encontradas`);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      result.steps.push({
        step: 3,
        name: 'Detectar descoordinaciones',
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * ============================================================================
   * PASO 4: SINCRONIZAR MODULES CON ROADMAP
   * ============================================================================
   */

  async synchronizeModulesWithRoadmap(task, result) {
    console.log(`\n🔄 PASO 4: Sincronizando modules con roadmap...`);

    try {
      delete require.cache[require.resolve(this.metadataPath)];
      const metadata = require(this.metadataPath);

      const phase = metadata.roadmap[task.phaseKey];
      const changes = [];

      // Para cada módulo afectado, sincronizar con la phase
      for (const moduleKey of result.affectedModules) {
        const module = metadata.modules[moduleKey];

        if (module.progress !== phase.progress) {
          module.progress = phase.progress;
          changes.push(`📊 ${moduleKey}.progress actualizado a ${phase.progress}%`);
        }

        if (module.status !== phase.status) {
          module.status = phase.status;
          changes.push(`📌 ${moduleKey}.status actualizado a ${phase.status}`);
        }
      }

      if (changes.length > 0) {
        result.changes.push(...changes);
        result.steps.push({
          step: 4,
          name: 'Sincronizar modules con roadmap',
          status: 'success',
          changes
        });

        console.log(`   ✅ Módulos sincronizados:`);
        changes.forEach(c => console.log(`      ${c}`));

        // GUARDAR CAMBIOS
        await this.saveMetadata(metadata);

      } else {
        console.log(`   ℹ️  No hay cambios que sincronizar`);
        result.steps.push({
          step: 4,
          name: 'Sincronizar modules con roadmap',
          status: 'success',
          changes: []
        });
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      result.steps.push({
        step: 4,
        name: 'Sincronizar modules con roadmap',
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * ============================================================================
   * PASO 5: ACTUALIZAR DEPENDENCIES
   * ============================================================================
   */

  async updateDependencies(task, result) {
    console.log(`\n🔗 PASO 5: Actualizando dependencies...`);

    try {
      delete require.cache[require.resolve(this.metadataPath)];
      const metadata = require(this.metadataPath);

      const phase = metadata.roadmap[task.phaseKey];
      const changes = [];

      // Si la phase está COMPLETED, buscar phases que dependen de esta
      if (phase.status === 'COMPLETED') {
        for (const [otherPhaseKey, otherPhase] of Object.entries(metadata.roadmap)) {
          if (otherPhase.dependencies && otherPhase.dependencies.includes(task.phaseKey)) {
            // Esta phase depende de la que acabamos de completar
            changes.push(`✅ ${otherPhaseKey} puede comenzar (dependency ${task.phaseKey} completada)`);

            // Si estaba bloqueada, cambiar status
            if (otherPhase.status === 'BLOCKED') {
              otherPhase.status = 'PLANNED';
              changes.push(`🔓 ${otherPhaseKey} desbloqueada`);
            }
          }
        }
      }

      result.steps.push({
        step: 5,
        name: 'Actualizar dependencies',
        status: 'success',
        changes
      });

      if (changes.length > 0) {
        console.log(`   ✅ Dependencies actualizadas:`);
        changes.forEach(c => console.log(`      ${c}`));

        await this.saveMetadata(metadata);
      } else {
        console.log(`   ℹ️  No hay dependencies que actualizar`);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      result.steps.push({
        step: 5,
        name: 'Actualizar dependencies',
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * ============================================================================
   * PASO 6: REORGANIZAR INFO AFECTADA
   * ============================================================================
   */

  async reorganizeAffectedInfo(task, result) {
    console.log(`\n🎯 PASO 6: Reorganizando info afectada...`);

    try {
      // Actualizar lastUpdated en project
      delete require.cache[require.resolve(this.metadataPath)];
      const metadata = require(this.metadataPath);

      metadata.project.lastUpdated = new Date().toISOString();

      // Agregar a latestChanges
      const changeDescription = `✅ ${task.taskId} completado: ${task.phaseKey}`;
      if (!metadata.project.latestChanges.includes(changeDescription)) {
        metadata.project.latestChanges.unshift(changeDescription);
        // Mantener solo los últimos 20
        metadata.project.latestChanges = metadata.project.latestChanges.slice(0, 20);
      }

      result.steps.push({
        step: 6,
        name: 'Reorganizar info afectada',
        status: 'success',
        changes: ['lastUpdated actualizado', 'latestChanges actualizado']
      });

      console.log(`   ✅ Info reorganizada`);

      await this.saveMetadata(metadata);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      result.steps.push({
        step: 6,
        name: 'Reorganizar info afectada',
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * ============================================================================
   * PASO 7: ACTUALIZAR STACK TECNOLÓGICO
   * ============================================================================
   */

  async updateTechnologyStack(task, result) {
    console.log(`\n🏆 PASO 7: Actualizando stack tecnológico...`);

    try {
      const TechnologyDetector = require('./TechnologyDetector');

      // Leer metadata actual
      delete require.cache[require.resolve(this.metadataPath)];
      const metadata = require(this.metadataPath);

      let technologiesUpdated = 0;
      const modulesToUpdate = [];

      // Determinar qué módulos actualizar
      if (task.moduleKey) {
        // Si se especificó un módulo, solo actualizar ese
        modulesToUpdate.push(task.moduleKey);
      } else {
        // Si no, buscar módulos relacionados por el phaseKey
        for (const [moduleKey, moduleData] of Object.entries(metadata.modules || {})) {
          const moduleNameLower = (moduleData.name || '').toLowerCase();
          const phaseKeyLower = (task.phaseKey || '').toLowerCase();

          if (moduleNameLower.includes(phaseKeyLower) ||
              phaseKeyLower.includes(moduleKey.toLowerCase())) {
            modulesToUpdate.push(moduleKey);
          }
        }
      }

      // Si no se encontraron módulos relacionados, actualizar todos (safety)
      if (modulesToUpdate.length === 0) {
        console.log(`   ⚠️ No se detectaron módulos específicos, re-analizando todos...`);
        modulesToUpdate.push(...Object.keys(metadata.modules || {}));
      }

      // Actualizar tecnologías de cada módulo
      for (const moduleKey of modulesToUpdate) {
        const moduleData = metadata.modules[moduleKey];
        if (!moduleData) continue;

        console.log(`   🔍 Analizando: ${moduleKey}...`);

        try {
          // Detectar tecnologías
          const technologies = await TechnologyDetector.analyzeModule(moduleKey, moduleData);

          const techCount = Object.values(technologies).reduce((sum, arr) => sum + arr.length, 0);

          // Actualizar solo si cambió el número de tecnologías o no existen
          const previousCount = moduleData.technologies?.detectedCount || 0;
          if (techCount !== previousCount || !moduleData.technologies) {

            // Generar descripciones
            const technicalDesc = TechnologyDetector.generateTechnicalDescription(technologies);
            const marketingDesc = TechnologyDetector.generateMarketingDescription(technologies);

            // Actualizar en metadata
            moduleData.technologies = {
              backend: technologies.backend.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              frontend: technologies.frontend.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              database: technologies.database.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              ai: technologies.ai.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              apis: technologies.apis.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              security: technologies.security.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              realtime: technologies.realtime.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              testing: technologies.testing.map(t => ({
                name: t.name,
                description: t.description,
                icon: t.icon
              })),
              technical: technicalDesc,
              marketing: marketingDesc,
              detectedAt: new Date().toISOString(),
              detectedCount: techCount
            };

            technologiesUpdated++;
            console.log(`   ✅ ${moduleKey}: ${techCount} tecnologías (${techCount - previousCount > 0 ? '+' : ''}${techCount - previousCount})`);

            result.changes.push({
              module: moduleKey,
              type: 'technology_stack_updated',
              before: previousCount,
              after: techCount
            });
          } else {
            console.log(`   ⏭️ ${moduleKey}: Sin cambios (${techCount} tecnologías)`);
          }
        } catch (error) {
          console.error(`   ⚠️ Error analizando ${moduleKey}: ${error.message}`);
        }
      }

      // Actualizar timestamp general
      if (!metadata.systemInfo) metadata.systemInfo = {};
      metadata.systemInfo.technologiesLastUpdated = new Date().toISOString();

      // Calcular total de tecnologías
      let totalTechnologies = 0;
      for (const moduleData of Object.values(metadata.modules || {})) {
        if (moduleData.technologies) {
          totalTechnologies += moduleData.technologies.detectedCount || 0;
        }
      }
      metadata.systemInfo.totalTechnologiesDetected = totalTechnologies;

      result.steps.push({
        step: 7,
        name: 'Actualizar stack tecnológico',
        status: 'success',
        modulesUpdated: technologiesUpdated,
        totalTechnologies
      });

      console.log(`   ✅ ${technologiesUpdated} módulos actualizados`);
      console.log(`   📊 Total tecnologías en sistema: ${totalTechnologies}`);

      await this.saveMetadata(metadata);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      result.steps.push({
        step: 7,
        name: 'Actualizar stack tecnológico',
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * ============================================================================
   * GUARDAR METADATA
   * ============================================================================
   */

  async saveMetadata(metadata) {
    try {
      const content = `/**\n * ENGINEERING METADATA - AUTO-UPDATED\n * Last sync: ${new Date().toISOString()}\n */\n\nmodule.exports = ${JSON.stringify(metadata, null, 2)};\n`;

      fs.writeFileSync(this.metadataPath, content, 'utf8');
      console.log(`   💾 Metadata guardado en disco`);
    } catch (error) {
      console.error(`   ❌ Error guardando metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * ============================================================================
   * REPORTE
   * ============================================================================
   */

  generateSyncReport(result) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 RESUMEN DE SINCRONIZACIÓN POST-TAREA`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Tarea: ${result.taskId}`);
    console.log(`Phase: ${result.phaseKey}`);
    console.log(`Módulos afectados: ${result.affectedModules.length}`);
    console.log(`Cambios realizados: ${result.changes.length}`);
    console.log(`Descoordinaciones detectadas: ${result.inconsistencies.length}`);
    console.log(`Estado: ${result.success ? '✅ ÉXITO' : '❌ ERROR'}`);
    console.log(`${'='.repeat(70)}\n`);
  }

  /**
   * ============================================================================
   * UTILIDADES
   * ============================================================================
   */

  extractKeywordsFromTask(task) {
    const keywords = [];
    if (task.taskId) keywords.push(task.taskId.toLowerCase());
    if (task.phaseKey) keywords.push(task.phaseKey.toLowerCase());
    if (task.moduleKey) keywords.push(task.moduleKey.toLowerCase());
    return keywords;
  }

  namesAreRelated(name1, name2) {
    // Extraer palabras clave de ambos nombres
    const words1 = name1.split(/\s+/).filter(w => w.length > 3);
    const words2 = name2.split(/\s+/).filter(w => w.length > 3);

    // Si comparten al menos 2 palabras, están relacionados
    const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    return commonWords.length >= 2;
  }
}

module.exports = new PostTaskSynchronizer();
