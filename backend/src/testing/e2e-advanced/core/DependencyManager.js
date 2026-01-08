/**
 * DependencyManager - Gestiona dependencias entre fases
 *
 * RESPONSABILIDADES:
 * - Definir qué fases dependen de otras
 * - Construir plan de ejecución (topological sort)
 * - Validar si se puede proceder a siguiente stage
 *
 * EJEMPLO DE DEPENDENCIAS:
 * - Load Testing depende de E2E (score >= 90%)
 * - Monitoring depende de E2E + Load (score >= 85%)
 * - Security es independiente (puede ejecutar siempre)
 *
 * @module DependencyManager
 * @version 2.0.0
 */

class DependencyManager {
  constructor() {
    // Map de dependencias: { phaseName: { requires, minScore } }
    this.dependencies = new Map();
  }

  /**
   * Define dependencias entre fases
   *
   * @param {Object} deps - Objeto con dependencias
   * @example
   * dependencyManager.setDependencies({
   *   'load': { requires: 'e2e', minScore: 90 },
   *   'monitoring': { requires: ['e2e', 'load'], minScore: 85 }
   * });
   */
  setDependencies(deps) {
    Object.entries(deps).forEach(([phaseName, config]) => {
      this.dependencies.set(phaseName, {
        requires: Array.isArray(config.requires)
          ? config.requires
          : (config.requires ? [config.requires] : []),
        minScore: config.minScore || 0
      });
    });
  }

  /**
   * Construye plan de ejecución basado en dependencias (topological sort)
   *
   * @param {string[]} phases - Fases a ejecutar
   * @returns {Array<string[]>} Array de stages, cada stage contiene fases que pueden ejecutarse en paralelo
   *
   * @example
   * // Input: ['e2e', 'load', 'security', 'monitoring']
   * // Output: [
   * //   ['e2e', 'security'],  // Stage 1: independientes
   * //   ['load'],             // Stage 2: depende de e2e
   * //   ['monitoring']        // Stage 3: depende de e2e + load
   * // ]
   */
  buildExecutionPlan(phases) {
    const plan = [];
    const completed = new Set();
    const remaining = new Set(phases);

    while (remaining.size > 0) {
      const readyPhases = [];

      for (const phase of remaining) {
        if (this._canExecute(phase, completed)) {
          readyPhases.push(phase);
        }
      }

      if (readyPhases.length === 0) {
        // Deadlock - hay dependencias circulares o fases con dependencias no satisfechas
        const problematic = Array.from(remaining);
        throw new Error(`Deadlock detectado: no se pueden ejecutar fases ${problematic.join(', ')}. Revisa dependencias circulares.`);
      }

      plan.push(readyPhases);

      readyPhases.forEach(phase => {
        completed.add(phase);
        remaining.delete(phase);
      });
    }

    return plan;
  }

  /**
   * Verifica si se puede ejecutar una fase dado el estado actual
   * @private
   */
  _canExecute(phase, completed) {
    const deps = this.dependencies.get(phase);

    if (!deps || deps.requires.length === 0) {
      // No tiene dependencias, puede ejecutar
      return true;
    }

    // Verificar que TODAS las dependencias estén completed
    return deps.requires.every(requiredPhase => completed.has(requiredPhase));
  }

  /**
   * Verifica si se puede proceder al siguiente stage dado los resultados actuales
   *
   * @param {Object} results - Resultados actuales { phaseName: { score, status, ... } }
   * @param {string[]} nextStage - Fases del próximo stage
   * @returns {boolean}
   */
  canProceed(results, nextStage) {
    if (!nextStage || nextStage.length === 0) {
      return true;  // No hay más stages
    }

    for (const phase of nextStage) {
      const deps = this.dependencies.get(phase);

      if (!deps || deps.requires.length === 0) {
        continue;  // No tiene dependencias
      }

      // Verificar cada dependencia
      for (const requiredPhase of deps.requires) {
        const result = results[requiredPhase];

        if (!result) {
          console.log(`⚠️  [DEPS] Fase ${phase} requiere ${requiredPhase} pero no se ejecutó`);
          return false;
        }

        if (result.status === 'failed') {
          console.log(`⚠️  [DEPS] Fase ${phase} requiere ${requiredPhase} pero falló`);
          return false;
        }

        if (result.score < deps.minScore) {
          console.log(`⚠️  [DEPS] Fase ${phase} requiere ${requiredPhase} con score >= ${deps.minScore}%, obtuvo ${result.score}%`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Obtiene las dependencias de una fase
   *
   * @param {string} phaseName - Nombre de la fase
   * @returns {Object} { requires: string[], minScore: number }
   */
  getDependencies(phaseName) {
    return this.dependencies.get(phaseName) || { requires: [], minScore: 0 };
  }

  /**
   * Verifica si hay dependencias circulares
   *
   * @returns {boolean}
   */
  hasCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (phase) => {
      visited.add(phase);
      recursionStack.add(phase);

      const deps = this.dependencies.get(phase);
      if (deps && deps.requires.length > 0) {
        for (const dep of deps.requires) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;  // Ciclo detectado
          }
        }
      }

      recursionStack.delete(phase);
      return false;
    };

    for (const phase of this.dependencies.keys()) {
      if (!visited.has(phase)) {
        if (hasCycle(phase)) return true;
      }
    }

    return false;
  }

  /**
   * Obtiene todas las dependencias (para debugging)
   *
   * @returns {Object}
   */
  getAllDependencies() {
    const deps = {};
    this.dependencies.forEach((value, key) => {
      deps[key] = value;
    });
    return deps;
  }
}

module.exports = DependencyManager;
