/**
 * ═══════════════════════════════════════════════════════════
 * CHAOS TESTING ENGINE - Simula "Ejército de Testers Humanos"
 * ═══════════════════════════════════════════════════════════
 *
 * Genera acciones ALEATORIAS para encontrar bugs que un test
 * predecible nunca encontraría:
 *
 * - Monkey Testing: Clicks aleatorios, tipos random
 * - Fuzzing: Valores maliciosos (XSS, SQL injection, overflow)
 * - Race Conditions: Acciones simultáneas rápidas
 * - Edge Cases: Valores límite, negativos, vacíos
 * - Stress Testing: Repetición masiva de acciones
 */

const { faker } = require('@faker-js/faker/locale/es');

/**
 * MONKEY TESTING - Acciones completamente aleatorias
 * Simula un usuario "mono" que hace click en cualquier lado
 */
async function monkeyTest(page, duration = 30000) {
  console.log(`\n🐵 [CHAOS] Iniciando Monkey Testing (${duration}ms)...`);

  const startTime = Date.now();
  let actions = 0;
  const errors = [];

  while (Date.now() - startTime < duration) {
    try {
      // Acción aleatoria
      const action = Math.random();

      if (action < 0.3) {
        // 30% - Click aleatorio
        const x = Math.floor(Math.random() * 1920);
        const y = Math.floor(Math.random() * 1080);
        await page.mouse.click(x, y);
        actions++;
      } else if (action < 0.5) {
        // 20% - Tecla aleatoria
        const keys = ['Enter', 'Escape', 'Tab', 'Space', 'Backspace'];
        const key = keys[Math.floor(Math.random() * keys.length)];
        await page.keyboard.press(key);
        actions++;
      } else if (action < 0.7) {
        // 20% - Scroll aleatorio
        await page.mouse.wheel(0, Math.random() > 0.5 ? 100 : -100);
        actions++;
      } else {
        // 30% - Tipeo aleatorio
        const text = faker.lorem.word();
        await page.keyboard.type(text);
        actions++;
      }

      await page.waitForTimeout(100); // 100ms entre acciones

    } catch (err) {
      errors.push({
        action: actions,
        error: err.message
      });
    }
  }

  console.log(`   ✅ Monkey Test completado: ${actions} acciones, ${errors.length} errores`);
  return { actions, errors };
}

/**
 * FUZZING - Valores maliciosos/extremos en campos
 * Intenta romper validaciones con inputs peligrosos
 */
function getFuzzingValues() {
  return {
    // XSS Attacks
    xss: [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>'
    ],

    // SQL Injection
    sql: [
      "' OR '1'='1",
      "'; DROP TABLE users--",
      "1' UNION SELECT NULL--",
      "admin'--"
    ],

    // Buffer Overflow
    overflow: [
      'A'.repeat(10000),
      'あ'.repeat(5000), // Caracteres unicode
      '🚀'.repeat(1000), // Emojis
      '\n'.repeat(1000)  // Newlines
    ],

    // Edge Cases Numéricos
    numbers: [
      -999999999,
      999999999,
      0,
      -1,
      0.000001,
      NaN,
      Infinity,
      -Infinity
    ],

    // Caracteres Especiales
    special: [
      '\\"\';--',
      '../../../etc/passwd',
      '${7*7}', // Template injection
      '%00', // Null byte
      '\u0000' // Unicode null
    ],

    // Formatos Incorrectos
    formats: [
      'not-an-email',
      '123-not-a-phone',
      '99/99/9999', // Fecha inválida
      'https://invalid url with spaces.com'
    ]
  };
}

/**
 * Aplica fuzzing a un campo específico
 */
async function fuzzField(page, selector, fieldName) {
  console.log(`   🎯 Fuzzing campo: ${fieldName}`);

  const fuzzValues = getFuzzingValues();
  const allValues = [
    ...fuzzValues.xss,
    ...fuzzValues.sql,
    ...fuzzValues.special,
    ...fuzzValues.formats
  ];

  const results = [];

  for (const value of allValues.slice(0, 5)) { // Probar 5 valores por campo
    try {
      await page.fill(selector, String(value));
      await page.waitForTimeout(200);

      // Intentar guardar
      const saveButton = await page.$('button:has-text("Guardar")');
      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }

      results.push({
        value,
        status: 'accepted', // Si no lanzó error, fue aceptado (¡malo!)
        risk: 'HIGH'
      });

    } catch (err) {
      results.push({
        value,
        status: 'rejected',
        error: err.message,
        risk: 'LOW' // Fue rechazado correctamente
      });
    }
  }

  const highRisk = results.filter(r => r.status === 'accepted');
  if (highRisk.length > 0) {
    console.log(`   ⚠️  VULNERABILIDAD: ${fieldName} acepta valores maliciosos`);
  } else {
    console.log(`   ✅ ${fieldName} rechaza valores maliciosos`);
  }

  return results;
}

/**
 * RACE CONDITIONS - Acciones simultáneas rápidas
 * Intenta provocar bugs de concurrencia
 */
async function raceConditionTest(page, actions) {
  console.log(`\n🏁 [CHAOS] Testing Race Conditions...`);

  const results = [];

  // Ejecutar TODAS las acciones simultáneamente
  const promises = actions.map(async (action, index) => {
    try {
      await action(page);
      return { index, status: 'success' };
    } catch (err) {
      return { index, status: 'error', error: err.message };
    }
  });

  const outcomes = await Promise.all(promises);

  const errors = outcomes.filter(o => o.status === 'error');
  console.log(`   ✅ Race conditions: ${errors.length} errores de ${actions.length} acciones`);

  return outcomes;
}

/**
 * STRESS TESTING - Repetición masiva
 * Ejecuta la misma acción 100+ veces para encontrar memory leaks
 *
 * MEJORA #6: Timeout de seguridad para evitar loops infinitos
 */
async function stressTest(page, action, iterations = 100) {
  console.log(`\n💪 [CHAOS] Stress Testing (${iterations} iteraciones)...`);

  const MAX_STRESS_TIME = 30000; // 30s máximo (MEJORA #6)
  const startTime = Date.now();

  const memoryUsage = [];
  const errors = [];

  for (let i = 0; i < iterations; i++) {
    // MEJORA #6: Break si excede timeout
    if (Date.now() - startTime > MAX_STRESS_TIME) {
      console.log(`   ⏱️  [MEJORA #6] Stress test timeout - completado ${i}/${iterations} iteraciones (30s límite)`);
      break;
    }

    try {
      await action(page);

      // Medir memoria cada 10 iteraciones
      if (i % 10 === 0) {
        const metrics = await page.metrics();
        memoryUsage.push({
          iteration: i,
          jsHeap: metrics.JSHeapUsedSize / 1024 / 1024, // MB
          totalHeap: metrics.JSHeapTotalSize / 1024 / 1024
        });
      }

    } catch (err) {
      errors.push({
        iteration: i,
        error: err.message
      });
    }
  }

  // Detectar memory leak
  const startMem = memoryUsage[0]?.jsHeap || 0;
  const endMem = memoryUsage[memoryUsage.length - 1]?.jsHeap || 0;
  const growth = endMem - startMem;

  console.log(`   📊 Memoria inicial: ${startMem.toFixed(2)}MB`);
  console.log(`   📊 Memoria final: ${endMem.toFixed(2)}MB`);
  console.log(`   📊 Crecimiento: ${growth.toFixed(2)}MB`);

  if (growth > 50) {
    console.log(`   ⚠️  POSIBLE MEMORY LEAK detectado`);
  } else {
    console.log(`   ✅ Sin memory leaks detectados`);
  }

  return {
    iterations,
    errors: errors.length,
    memoryGrowth: growth,
    hasMemoryLeak: growth > 50
  };
}

/**
 * BOUNDARY TESTING - Valores límite
 * Prueba los límites de cada campo
 */
async function boundaryTest(page, selector, fieldType, fieldName) {
  console.log(`   🎯 Boundary testing: ${fieldName} (${fieldType})`);

  const boundaryValues = {
    text: ['', 'a', 'A'.repeat(255), 'A'.repeat(256), 'A'.repeat(10000)],
    number: [-1, 0, 1, 999999, 1000000, 2147483647, 2147483648],
    email: ['a@b.c', 'x'.repeat(64) + '@' + 'y'.repeat(63) + '.com'],
    date: ['1900-01-01', '2099-12-31', '2100-01-01', '0000-00-00']
  };

  const values = boundaryValues[fieldType] || boundaryValues.text;
  const results = [];

  for (const value of values) {
    try {
      await page.fill(selector, String(value));
      await page.waitForTimeout(100);

      const isValid = await page.evaluate((sel) => {
        const input = document.querySelector(sel);
        return input ? input.validity.valid : true;
      }, selector);

      results.push({
        value,
        length: String(value).length,
        accepted: isValid
      });

    } catch (err) {
      results.push({
        value,
        error: err.message
      });
    }
  }

  return results;
}

/**
 * CHAOS ORCHESTRATOR - Ejecuta TODO
 * Combina todos los tipos de chaos testing
 */
async function runFullChaosTest(page, config = {}) {
  console.log('\n═══════════════════════════════════════════');
  console.log('🌪️  CHAOS TESTING ENGINE - FULL RUN');
  console.log('═══════════════════════════════════════════\n');

  const results = {
    monkey: null,
    fuzzing: {},
    raceConditions: null,
    stress: null,
    boundaries: {},
    summary: {
      totalErrors: 0,
      vulnerabilities: 0,
      memoryLeaks: 0
    }
  };

  // 1. Monkey Testing (30 segundos)
  if (config.monkey !== false) {
    results.monkey = await monkeyTest(page, config.monkeyDuration || 30000);
    results.summary.totalErrors += results.monkey.errors.length;
  }

  // 2. Fuzzing (si se proveen campos)
  if (config.fuzzFields) {
    for (const [selector, fieldName] of Object.entries(config.fuzzFields)) {
      results.fuzzing[fieldName] = await fuzzField(page, selector, fieldName);

      const vulnerable = results.fuzzing[fieldName].filter(r => r.status === 'accepted');
      results.summary.vulnerabilities += vulnerable.length;
    }
  }

  // 3. Race Conditions (si se proveen acciones)
  if (config.raceActions) {
    results.raceConditions = await raceConditionTest(page, config.raceActions);
    const errors = results.raceConditions.filter(r => r.status === 'error');
    results.summary.totalErrors += errors.length;
  }

  // 4. Stress Testing (si se provee acción)
  if (config.stressAction) {
    results.stress = await stressTest(page, config.stressAction, config.stressIterations || 100);
    results.summary.totalErrors += results.stress.errors;
    if (results.stress.hasMemoryLeak) {
      results.summary.memoryLeaks++;
    }
  }

  // 5. Boundary Testing (si se proveen campos)
  if (config.boundaryFields) {
    for (const [selector, { type, name }] of Object.entries(config.boundaryFields)) {
      results.boundaries[name] = await boundaryTest(page, selector, type, name);
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 CHAOS TESTING SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`Total Errors: ${results.summary.totalErrors}`);
  console.log(`Vulnerabilities: ${results.summary.vulnerabilities}`);
  console.log(`Memory Leaks: ${results.summary.memoryLeaks}`);
  console.log('═══════════════════════════════════════════\n');

  return results;
}

module.exports = {
  monkeyTest,
  fuzzField,
  getFuzzingValues,
  raceConditionTest,
  stressTest,
  boundaryTest,
  runFullChaosTest
};
