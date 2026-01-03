/**
 * Script para aplicar MEJORA #11
 * Fix chaosTimeout en módulo 'users' (14 min → 5 min)
 *
 * Problema: waitForSelector con timeout 60s + múltiples esperas = timeouts acumulados
 * Solución: Reducir timeout de 60s → 30s y agregar hard timeout wrapper
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../modules/universal-modal-advanced.e2e.spec.js');

console.log('📝 Aplicando MEJORA #11 (Fix chaosTimeout users)...');
console.log(`📂 Archivo: ${filePath}`);

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');
let changesCount = 0;

// FIX 1: Reducir timeout de waitForSelector de 60s → 30s
const oldWaitTimeout = `    await page.waitForSelector(selectorToWait, {
      timeout: 60000,     // Aumentado de 30s a 60s
      state: 'visible'    // Esperar que sea visible, no solo que exista
    })`;

const newWaitTimeout = `    await page.waitForSelector(selectorToWait, {
      timeout: 30000,     // MEJORA #11: Reducido de 60s a 30s para evitar timeouts acumulados
      state: 'visible'    // Esperar que sea visible, no solo que exista
    })`;

if (content.includes('timeout: 60000')) {
  content = content.replace(oldWaitTimeout, newWaitTimeout);
  changesCount++;
  console.log('✅ FIX 1: waitForSelector timeout reducido (60s → 30s)');
}

// FIX 2: Actualizar mensaje de fallback timeout
const oldFallbackMsg = `      console.log(\`   ⚠️  Selector \${selectorToWait} no encontrado después de 60s\`);`;
const newFallbackMsg = `      console.log(\`   ⚠️  Selector \${selectorToWait} no encontrado después de 30s\`);`;

if (content.includes('60s`);')) {
  content = content.replace(oldFallbackMsg, newFallbackMsg);
  changesCount++;
  console.log('✅ FIX 2: Mensaje de fallback actualizado');
}

// FIX 3: Reducir timeout del stress test de 30s → 15s
const oldStressTimeout = `      await chaosHelper.stressTest(page, fieldsToFuzz, {
        timeout: 30000, // MEJORA #6: Aumentado de 60s a 30s (antes era ilimitado)
        iterations: TEST_CONFIG.chaos.stressIterations
      });`;

const newStressTimeout = `      await chaosHelper.stressTest(page, fieldsToFuzz, {
        timeout: 15000, // MEJORA #11: Reducido de 30s a 15s para evitar timeouts acumulados
        iterations: TEST_CONFIG.chaos.stressIterations
      });`;

if (content.includes('timeout: 30000, // MEJORA #6')) {
  content = content.replace(oldStressTimeout, newStressTimeout);
  changesCount++;
  console.log('✅ FIX 3: Stress test timeout reducido (30s → 15s)');
}

// Guardar archivo
if (changesCount > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`💾 Archivo guardado con ${changesCount} cambios`);
  console.log('\n🎯 MEJORA #11 aplicada:');
  console.log('   ✅ waitForSelector: 60s → 30s');
  console.log('   ✅ stressTest: 30s → 15s');
  console.log('   ✅ Total timeouts reducidos: ~45s menos por test');
  console.log('\n📊 Proyección:');
  console.log('   - Timeout acumulado antes: ~120s (60+30+otros)');
  console.log('   - Timeout acumulado ahora: ~75s (30+15+otros)');
  console.log('   - Margen para 5 min timeout: ✅ Amplio');
} else {
  console.log('ℹ️  No se encontraron cambios para aplicar (ya están aplicados?)');
}
