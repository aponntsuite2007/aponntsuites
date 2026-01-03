/**
 * LEARNING HELPER - Wrapper para E2ELearningEngine
 *
 * Facilita la integración del motor de aprendizaje en los tests E2E
 */

const E2ELearningEngine = require('../core/E2ELearningEngine');

// Instancia singleton del motor de aprendizaje
let learningEngine = null;

/**
 * Inicializar motor de aprendizaje (llamar al inicio de cada test suite)
 */
function initLearningEngine() {
  if (!learningEngine) {
    learningEngine = new E2ELearningEngine();
    console.log('🧠 [LEARNING] Motor de aprendizaje continuo ACTIVO');
  }
  return learningEngine;
}

/**
 * Obtener instancia del motor (crear si no existe)
 */
function getLearningEngine() {
  if (!learningEngine) {
    return initLearningEngine();
  }
  return learningEngine;
}

/**
 * Registrar error y obtener fix sugerido
 *
 * @param {string} moduleKey - Clave del módulo
 * @param {string} testName - Nombre del test
 * @param {Error} error - Error capturado
 * @param {Object} context - Contexto adicional (usedFallback, etc.)
 * @returns {Object|null} - Fix sugerido o null
 */
async function handleError(moduleKey, testName, error, context = {}) {
  const engine = getLearningEngine();

  console.log(`\n🔍 [LEARNING] Analizando error en ${moduleKey} > ${testName}...`);

  const suggestedFix = engine.recordError(moduleKey, testName, error, context);

  if (suggestedFix && suggestedFix.autoApply) {
    console.log(`🤖 [LEARNING] Aplicando fix automáticamente...`);

    const result = await engine.applyFix(suggestedFix, {
      moduleKey,
      testName,
      ...context
    });

    if (result.applied) {
      console.log(`✅ [LEARNING] Fix aplicado con éxito`);
      return result.result;
    } else {
      console.log(`⚠️  [LEARNING] No se pudo aplicar fix: ${result.reason || result.error}`);
    }
  }

  return suggestedFix;
}

/**
 * Validar mejora después de aplicar fix
 *
 * @param {string} moduleKey - Clave del módulo
 * @param {string} testName - Nombre del test
 * @param {Object} beforeResult - Resultado antes del fix
 * @param {Object} afterResult - Resultado después del fix
 */
function validateImprovement(moduleKey, testName, beforeResult, afterResult) {
  const engine = getLearningEngine();
  return engine.validateImprovement(moduleKey, testName, beforeResult, afterResult);
}

/**
 * Finalizar ejecución y guardar conocimiento
 */
async function finalize() {
  if (learningEngine) {
    console.log('\n🔄 [LEARNING] Finalizando y guardando conocimiento adquirido...');
    const metrics = await learningEngine.finalizeExecution();
    return metrics;
  }
  return null;
}

/**
 * Obtener estadísticas del aprendizaje
 */
function getStats() {
  const engine = getLearningEngine();
  return engine.getStats();
}

/**
 * Verificar si debe skipear un test basado en contexto
 *
 * @param {Object} context - Contexto del test
 * @returns {Object} - { shouldSkip: boolean, reason: string }
 */
function shouldSkipTest(testName, context) {
  // Si usó fallback y es test de DEPENDENCY o SSOT, skip
  if (context.usedFallback) {
    if (testName.includes('DEPENDENCY MAPPING')) {
      console.log(`⏭️  [LEARNING] Auto-skip test (usedFallback=true)`);
      return {
        shouldSkip: true,
        reason: 'Fallback activo - selectores no disponibles para DEPENDENCY test'
      };
    }

    if (testName.includes('SSOT ANALYSIS')) {
      console.log(`⏭️  [LEARNING] Auto-skip test (usedFallback=true)`);
      return {
        shouldSkip: true,
        reason: 'Fallback activo - selectores no disponibles para SSOT test'
      };
    }
  }

  // Si Brain auth falló (401), skip test del BRAIN
  if (context.brainAuthFailed && testName.includes('BRAIN')) {
    console.log(`⏭️  [LEARNING] Auto-skip test (brainAuthFailed=true)`);
    return {
      shouldSkip: true,
      reason: 'Brain API retorna 401 - auth inválido'
    };
  }

  return { shouldSkip: false };
}

/**
 * Ajustar configuración basado en aprendizaje
 *
 * @param {Object} config - Configuración actual
 * @param {Object} context - Contexto
 * @returns {Object} - Configuración ajustada
 */
function adjustConfig(config, context) {
  const adjusted = { ...config };

  // Ajustar timeout si es necesario
  if (context.moduleLoadsSlow) {
    adjusted.timeout = 60000; // Aumentar a 60s
    console.log(`⚙️  [LEARNING] Timeout ajustado: 30s → 60s`);
  }

  // Activar fallback si selector principal falla frecuentemente
  if (context.selectorFailureCount > 2) {
    adjusted.useFallback = true;
    console.log(`⚙️  [LEARNING] Fallback activado automáticamente`);
  }

  return adjusted;
}

module.exports = {
  initLearningEngine,
  getLearningEngine,
  handleError,
  validateImprovement,
  finalize,
  getStats,
  shouldSkipTest,
  adjustConfig
};
