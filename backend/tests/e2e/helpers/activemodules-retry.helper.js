/**
 * ═══════════════════════════════════════════════════════════
 * MEJORA #8 y #9: Helper para esperar activeModules con retry
 * ═══════════════════════════════════════════════════════════
 *
 * Este helper implementa:
 * - MEJORA #8: Timeout aumentado de 15s → 25s
 * - MEJORA #9: Retry con exponential backoff (3 intentos con delays: 5s, 10s, 15s)
 *
 * Soluciona el problema de timeout en módulos lentos como:
 * - companies
 * - deploy-manager-3stages
 */

/**
 * Espera a que window.activeModules esté cargado con retry exponential backoff
 *
 * @param {Page} page - Playwright page object
 * @param {number} maxRetries - Máximo número de reintentos (default: 3)
 * @returns {Promise<void>}
 * @throws {Error} Si todos los intentos fallan
 */
async function waitForActiveModulesWithRetry(page, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`   ⏳ [MEJORA #8/#9] Intento ${i + 1}/${maxRetries}: Esperando window.activeModules...`);

      await page.waitForFunction(() => window.activeModules && window.activeModules.length > 0, {
        timeout: 25000 // MEJORA #8: 25s máximo (era 15s en MEJORA #7)
      });

      const modulesCount = await page.evaluate(() => window.activeModules?.length || 0);
      console.log(`   ✅ activeModules cargado: ${modulesCount} módulos (intento ${i + 1})`);
      return; // Éxito, salir

    } catch (err) {
      const waitTime = 5000 * (i + 1); // MEJORA #9: Exponential backoff: 5s, 10s, 15s

      if (i === maxRetries - 1) {
        // Último intento falló
        console.error(`   ❌ MEJORA #9: Todos los intentos fallaron después de ${maxRetries} reintentos`);
        console.error(`   💡 Sugerencia: Verificar que el módulo cargue activeModules correctamente`);
        throw err;
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
