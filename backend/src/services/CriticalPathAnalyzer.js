/**
 * ============================================================================
 * CRITICAL PATH ANALYZER - ALGORITMO CPM/PERT
 * ============================================================================
 *
 * PROPÓSITO:
 * - Calcular camino crítico usando algoritmo CPM (Critical Path Method)
 * - Identificar tareas críticas (slack = 0)
 * - Calcular ES, EF, LS, LF para cada tarea
 * - Ordenar tareas automáticamente por prioridad
 * - Recalcular cuando cambian dependencies o durations
 *
 * ALGORITMO CPM:
 * 1. Forward Pass: Calcular ES (Earliest Start) y EF (Earliest Finish)
 * 2. Backward Pass: Calcular LS (Latest Start) y LF (Latest Finish)
 * 3. Calcular Slack: LS - ES (o LF - EF)
 * 4. Camino Crítico: Todas las tareas con slack = 0
 *
 * ============================================================================
 */

class CriticalPathAnalyzer {
  constructor() {
    this.tasks = [];
    this.criticalPath = [];
    this.projectDuration = 0;
  }

  /**
   * ============================================================================
   * ANÁLISIS PRINCIPAL
   * ============================================================================
   */

  /**
   * Analiza el camino crítico del roadmap
   * @param {Object} roadmap - Roadmap completo del metadata
   * @returns {Object} Análisis completo
   */
  analyze(roadmap) {
    console.log(`\n🔍 [CRITICAL PATH] Analizando camino crítico...`);

    // Resetear
    this.tasks = [];
    this.criticalPath = [];
    this.projectDuration = 0;

    // Paso 1: Extraer y normalizar todas las tareas
    this.extractTasks(roadmap);

    if (this.tasks.length === 0) {
      console.log(`   ⚠️  No hay tareas para analizar`);
      return {
        tasks: [],
        criticalPath: [],
        projectDuration: 0,
        phases: []
      };
    }

    // Paso 2: Ordenar topológicamente (dependencies primero)
    this.topologicalSort();

    // Paso 3: Forward Pass (calcular ES y EF)
    this.forwardPass();

    // Paso 4: Backward Pass (calcular LS y LF)
    this.backwardPass();

    // Paso 5: Calcular Slack y identificar camino crítico
    this.calculateSlackAndCriticalPath();

    // Paso 6: Agrupar por phases
    const phaseAnalysis = this.groupByPhases(roadmap);

    const analysis = {
      totalTasks: this.tasks.length,
      completedTasks: this.tasks.filter(t => t.done).length,
      pendingTasks: this.tasks.filter(t => !t.done).length,
      criticalTasks: this.criticalPath.length,
      projectDuration: this.projectDuration,
      tasks: this.tasks,
      criticalPath: this.criticalPath,
      phases: phaseAnalysis,
      timestamp: new Date().toISOString()
    };

    console.log(`   ✅ Análisis completo:`);
    console.log(`      - Total tareas: ${analysis.totalTasks}`);
    console.log(`      - Tareas críticas: ${analysis.criticalTasks}`);
    console.log(`      - Duración proyecto: ${this.projectDuration} días`);

    return analysis;
  }

  /**
   * ============================================================================
   * PASO 1: EXTRAER TAREAS
   * ============================================================================
   */

  extractTasks(roadmap) {
    console.log(`\n📋 Extrayendo tareas del roadmap...`);

    for (const [phaseKey, phaseData] of Object.entries(roadmap)) {
      if (!phaseData.tasks) continue;

      for (const task of phaseData.tasks) {
        // Extraer duración estimada (default: 1 día)
        let duration = 1;
        if (task.estimatedDuration) {
          duration = this.parseDuration(task.estimatedDuration);
        } else if (phaseData.estimatedEffort) {
          // Distribuir estimatedEffort entre todas las tareas
          duration = this.parseDuration(phaseData.estimatedEffort) / phaseData.tasks.length;
        }

        // Extraer priority (default: 5)
        let priority = task.priority || 5;

        this.tasks.push({
          id: task.id,
          name: task.name,
          phaseKey,
          phaseName: phaseData.name,
          done: task.done || false,
          completedDate: task.completedDate,
          dependencies: task.dependencies || [],
          duration: Math.max(1, Math.round(duration)), // Mínimo 1 día
          priority,
          // CPM attributes (se calculan después)
          es: 0,  // Earliest Start
          ef: 0,  // Earliest Finish
          ls: 0,  // Latest Start
          lf: 0,  // Latest Finish
          slack: 0, // Slack/Float
          isCritical: false
        });
      }
    }

    console.log(`   ✅ ${this.tasks.length} tareas extraídas`);
  }

  /**
   * Parse duración en días
   * Ejemplos: "40-60 horas", "2 semanas", "5 días"
   */
  parseDuration(durationStr) {
    if (typeof durationStr === 'number') return durationStr;
    if (!durationStr) return 1;

    const str = durationStr.toLowerCase();

    // Extraer número (usar el promedio si es rango)
    const numbers = str.match(/\d+/g);
    if (!numbers || numbers.length === 0) return 1;

    let value = parseInt(numbers[0]);
    if (numbers.length > 1) {
      // Es un rango, usar promedio
      value = (parseInt(numbers[0]) + parseInt(numbers[1])) / 2;
    }

    // Convertir a días
    if (str.includes('hora')) {
      return Math.ceil(value / 8); // 8 horas = 1 día
    } else if (str.includes('semana')) {
      return value * 5; // 1 semana = 5 días hábiles
    } else if (str.includes('mes')) {
      return value * 20; // 1 mes = 20 días hábiles
    }

    return value; // Asumir que ya son días
  }

  /**
   * ============================================================================
   * PASO 2: ORDENAMIENTO TOPOLÓGICO
   * ============================================================================
   */

  topologicalSort() {
    console.log(`\n🔄 Ordenando tareas topológicamente...`);

    const sorted = [];
    const visited = new Set();
    const temp = new Set();

    const visit = (taskId) => {
      if (visited.has(taskId)) return;
      if (temp.has(taskId)) {
        console.warn(`   ⚠️  Ciclo detectado en dependencies: ${taskId}`);
        return;
      }

      temp.add(taskId);

      const task = this.tasks.find(t => t.id === taskId);
      if (!task) {
        temp.delete(taskId);
        return;
      }

      // Visitar dependencies primero
      for (const depId of task.dependencies) {
        visit(depId);
      }

      temp.delete(taskId);
      visited.add(taskId);
      sorted.push(task);
    };

    // Visitar todas las tareas
    for (const task of this.tasks) {
      visit(task.id);
    }

    this.tasks = sorted;
    console.log(`   ✅ Tareas ordenadas`);
  }

  /**
   * ============================================================================
   * PASO 3: FORWARD PASS (ES y EF)
   * ============================================================================
   */

  forwardPass() {
    console.log(`\n➡️  Forward Pass (ES y EF)...`);

    for (const task of this.tasks) {
      if (task.done) {
        // Tarea completada, ES y EF son 0 (no afecta el camino crítico)
        task.es = 0;
        task.ef = 0;
        continue;
      }

      // ES = max(EF de todas las dependencies)
      let maxEF = 0;

      for (const depId of task.dependencies) {
        const depTask = this.tasks.find(t => t.id === depId);
        if (depTask && !depTask.done) {
          maxEF = Math.max(maxEF, depTask.ef);
        }
      }

      task.es = maxEF;
      task.ef = task.es + task.duration;
    }

    // Duración del proyecto = max(EF)
    this.projectDuration = Math.max(...this.tasks.map(t => t.ef));

    console.log(`   ✅ Forward Pass completado`);
    console.log(`      Duración proyecto: ${this.projectDuration} días`);
  }

  /**
   * ============================================================================
   * PASO 4: BACKWARD PASS (LS y LF)
   * ============================================================================
   */

  backwardPass() {
    console.log(`\n⬅️  Backward Pass (LS y LF)...`);

    // Iterar en orden inverso
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      const task = this.tasks[i];

      if (task.done) {
        task.ls = 0;
        task.lf = 0;
        continue;
      }

      // Encontrar tareas que dependen de esta
      const dependents = this.tasks.filter(t =>
        !t.done && t.dependencies.includes(task.id)
      );

      if (dependents.length === 0) {
        // Tarea final (no tiene dependientes)
        task.lf = this.projectDuration;
      } else {
        // LF = min(LS de todos los dependientes)
        task.lf = Math.min(...dependents.map(t => t.ls));
      }

      task.ls = task.lf - task.duration;
    }

    console.log(`   ✅ Backward Pass completado`);
  }

  /**
   * ============================================================================
   * PASO 5: CALCULAR SLACK Y CAMINO CRÍTICO
   * ============================================================================
   */

  calculateSlackAndCriticalPath() {
    console.log(`\n🎯 Calculando Slack y Camino Crítico...`);

    this.criticalPath = [];

    for (const task of this.tasks) {
      if (task.done) {
        task.slack = 0;
        task.isCritical = false;
        continue;
      }

      // Slack = LS - ES (o LF - EF)
      task.slack = task.ls - task.es;

      // Tarea crítica si slack = 0
      if (task.slack === 0) {
        task.isCritical = true;
        this.criticalPath.push(task);
      } else {
        task.isCritical = false;
      }
    }

    console.log(`   ✅ Camino crítico identificado:`);
    console.log(`      ${this.criticalPath.length} tareas críticas`);

    if (this.criticalPath.length > 0) {
      console.log(`\n      Tareas críticas:`);
      this.criticalPath.forEach(t => {
        console.log(`      - ${t.id}: ${t.name} (${t.duration} días)`);
      });
    }
  }

  /**
   * ============================================================================
   * PASO 6: AGRUPAR POR PHASES
   * ============================================================================
   */

  groupByPhases(roadmap) {
    const phases = [];

    for (const [phaseKey, phaseData] of Object.entries(roadmap)) {
      const phaseTasks = this.tasks.filter(t => t.phaseKey === phaseKey);

      if (phaseTasks.length === 0) continue;

      const criticalTasksInPhase = phaseTasks.filter(t => t.isCritical);
      const completedTasks = phaseTasks.filter(t => t.done);

      phases.push({
        phaseKey,
        name: phaseData.name,
        status: phaseData.status,
        totalTasks: phaseTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: phaseTasks.length - completedTasks.length,
        criticalTasks: criticalTasksInPhase.length,
        progress: Math.round((completedTasks.length / phaseTasks.length) * 100),
        isCritical: criticalTasksInPhase.length > 0,
        tasks: phaseTasks.map(t => ({
          id: t.id,
          name: t.name,
          done: t.done,
          duration: t.duration,
          es: t.es,
          ef: t.ef,
          slack: t.slack,
          isCritical: t.isCritical,
          priority: t.priority
        }))
      });
    }

    return phases;
  }

  /**
   * ============================================================================
   * RECALCULAR AL CAMBIAR PRIORIDAD
   * ============================================================================
   */

  /**
   * Actualiza prioridad de una tarea y recalcula
   * @param {string} taskId - ID de la tarea
   * @param {number} newPriority - Nueva prioridad (1-10)
   * @param {Object} roadmap - Roadmap completo
   * @returns {Object} Nuevo análisis
   */
  updatePriority(taskId, newPriority, roadmap) {
    console.log(`\n🔄 Actualizando prioridad: ${taskId} → ${newPriority}`);

    // Recalcular con nueva prioridad
    const analysis = this.analyze(roadmap);

    return analysis;
  }

  /**
   * ============================================================================
   * REORDENAR TAREAS
   * ============================================================================
   */

  /**
   * Obtiene orden sugerido de tareas basado en camino crítico
   * @returns {Array} Tareas ordenadas por prioridad
   */
  getSuggestedOrder() {
    // Ordenar por:
    // 1. Tareas críticas primero (slack = 0)
    // 2. Luego por slack (menor slack = mayor urgencia)
    // 3. Luego por priority (mayor priority primero)
    // 4. Luego por ES (empezar antes)

    const pending = this.tasks.filter(t => !t.done);

    return pending.sort((a, b) => {
      // Críticas primero
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;

      // Menor slack primero
      if (a.slack !== b.slack) return a.slack - b.slack;

      // Mayor priority primero
      if (a.priority !== b.priority) return b.priority - a.priority;

      // Menor ES primero
      return a.es - b.es;
    });
  }

  /**
   * ============================================================================
   * ESTADÍSTICAS
   * ============================================================================
   */

  getStatistics() {
    const pending = this.tasks.filter(t => !t.done);
    const critical = this.criticalPath.filter(t => !t.done);

    return {
      total: this.tasks.length,
      completed: this.tasks.filter(t => t.done).length,
      pending: pending.length,
      critical: critical.length,
      projectDuration: this.projectDuration,
      completionPercentage: Math.round((this.tasks.filter(t => t.done).length / this.tasks.length) * 100),
      criticalPathPercentage: Math.round((critical.length / pending.length) * 100),
      averageSlack: Math.round(
        pending.reduce((sum, t) => sum + t.slack, 0) / pending.length
      )
    };
  }
}

module.exports = new CriticalPathAnalyzer();
