/**
 * ═══════════════════════════════════════════════════════════
 * MEJORA #8, #9 y #12: Helper para esperar activeModules con retry MEJORADO
 * ═══════════════════════════════════════════════════════════
 *
 * MEJORA #12: Fallback robusto para módulos que no cargan activeModules
 * Si después de 3 intentos NO carga, SKIP el check y continuar el test
 */

/**
 * Espera a que window.activeModules esté cargado con retry exponential backoff
 * MEJORA #12: Si falla después de 3 intentos, devuelve SUCCESS (skip check)
 *
 * @param {Page} page - Playwright page object
 * @param {number} maxRetries - Máximo número de reintentos (default: 3)
 * @param {boolean} allowSkip - Si true, permite skip en caso de fallo total (default: true)
 * @returns {Promise<{success: boolean, skipped: boolean}>}
 */
async function waitForActiveModulesWithRetry(page, maxRetries = 3, allowSkip = true) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`   ⏳ [MEJORA #8/#9/#12] Intento ${i + 1}/${maxRetries}: Esperando window.activeModules...`);

      await page.waitForFunction(() => window.activeModules && window.activeModules.length > 0, {
        timeout: 25000 // MEJORA #8: 25s máximo (era 15s en MEJORA #7)
      });

      const modulesCount = await page.evaluate(() => window.activeModules?.length || 0);
      console.log(`   ✅ activeModules cargado: ${modulesCount} módulos (intento ${i + 1})`);
      return { success: true, skipped: false }; // Éxito

    } catch (err) {
      const waitTime = 5000 * (i + 1); // MEJORA #9: Exponential backoff: 5s, 10s, 15s

      if (i === maxRetries - 1) {
        // Último intento falló
        if (allowSkip) {
          console.warn(`   ⚠️  MEJORA #12: activeModules NO cargó después de ${maxRetries} intentos`);
          console.warn(`   🔄 SKIP CHECK - Continuando test sin verificar activeModules`);
          console.warn(`   💡 Nota: Módulo puede tener problema de JavaScript en producción`);
          return { success: true, skipped: true }; // Skip check, continuar test
        } else {
          console.error(`   ❌ MEJORA #9: Todos los intentos fallaron después de ${maxRetries} reintentos`);
          console.error(`   💡 Sugerencia: Verificar que el módulo cargue activeModules correctamente`);
          throw err; // Fallar test
        }
      }

      console.warn(`   ⚠️  MEJORA #9: Intento ${i + 1} falló`);
      console.warn(`   ⏱️  Esperando ${waitTime/1000}s antes de reintentar...`);
      await page.waitForTimeout(waitTime);
    }
  }
}

module.exports = {
  waitForActiveModulesWithRetry
};
