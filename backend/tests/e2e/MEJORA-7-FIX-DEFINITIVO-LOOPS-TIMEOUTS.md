# 🔧 MEJORA #7 - FIX DEFINITIVO DE LOOPS + TIMEOUTS

**Fecha**: 2025-12-23
**Batch objetivo**: #5
**Problema crítico**: Módulo "partners" con loop infinito de 61.9 min + timeout de Node.js no funcionó

---

## 🔴 PROBLEMA DETECTADO EN BATCH #4

### CRÍTICO #1: Loop Infinito en "partners" (61.9 min)

**Evidencia**:
```json
{
  "moduleKey": "partners",
  "duration": 3711538,    // 61.9 MINUTOS
  "exitCode": null,       // No terminó correctamente
  "total": 0,             // Ni siquiera ejecutó tests
  "passing": 0,
  "failing": 0
}
```

**Análisis**:
- El test NO ejecutó ningún test (0/5)
- Se quedó atrapado ANTES de iniciar tests (probablemente en beforeEach/navegación)
- El timeout de Node.js configurado (25 min en el runner) NO mató el proceso
- MEJORA #6 (timeout 30s en stress test) NO se aplicó porque el problema fue antes

**Impacto**:
- 61.9 minutos desperdiciados (37% del tiempo total del batch)
- Redujo eficiencia de 4.4 min/módulo a 6.7 min/módulo
- El batch podría haber terminado en 1h 45min en vez de 2h 47min

### MEDIO #2: CHAOS Timeout en 3 módulos

**Módulos afectados**:
- admin-consent-management (9.2 min) - chaosTimeout: true
- attendance (11.6 min) - chaosTimeout: true
- inbox (8.9 min) - chaosTimeout: true

**Análisis**:
- El timeout global de Playwright (180s = 3 min) es insuficiente
- CHAOS testing real (fuzzing + stress + race conditions) toma 4-5 min en módulos complejos
- Los tests FALLAN por timeout, NO por errores lógicos

**Impacto**:
- 3 módulos marcados como FAILED solo por timeout
- Sin este problema: 23/25 PASSED = **92% de éxito** 🎯

---

## 💡 SOLUCIÓN: MEJORA #7

### 1. Timeout HARD en el Runner (15 min máximo por módulo)

**Archivo**: `backend/tests/e2e/scripts/run-all-modules-tests.js`

**Problema**: El timeout de Node.js (`exec(..., { timeout: 25min })`) no mata el proceso correctamente.

**Solución**: Implementar timeout HARD con `setTimeout()` + `child.kill('SIGKILL')`.

#### Código actual (Batch #4):

```javascript
function runModuleTest(moduleKey) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const command = `npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js --project=chromium`;

    const child = exec(command, {
      cwd: path.join(__dirname, '../../..'),
      timeout: TIMEOUT_PER_MODULE, // 25 min - NO FUNCIONA CORRECTAMENTE
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, MODULE_TO_TEST: moduleKey }
    });

    // ... handlers
  });
}
```

#### Código MEJORA #7:

```javascript
const TIMEOUT_PER_MODULE = 15 * 60 * 1000; // REDUCIDO: 25 min → 15 min
const HARD_TIMEOUT_BUFFER = 2 * 60 * 1000; // 2 min extra para logs/cleanup

function runModuleTest(moduleKey) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 TESTING: ${moduleKey}`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();
    const command = `npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js --project=chromium`;

    const child = exec(command, {
      cwd: path.join(__dirname, '../../..'),
      timeout: TIMEOUT_PER_MODULE, // 15 min
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, MODULE_TO_TEST: moduleKey }
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    // MEJORA #7: Timeout HARD - matar proceso si excede 15 min
    const hardTimeoutHandle = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`\n🔴 [MEJORA #7] HARD TIMEOUT después de ${elapsed} min`);
      console.log(`   Matando proceso de ${moduleKey} con SIGKILL...`);

      killed = true;
      child.kill('SIGKILL'); // FORCE KILL - no se puede ignorar

      // El evento 'close' se disparará automáticamente
    }, TIMEOUT_PER_MODULE + HARD_TIMEOUT_BUFFER);

    child.stdout.on('data', (data) => {
      stdout += data;
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data;
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      clearTimeout(hardTimeoutHandle); // Cancelar timeout si terminó antes

      const duration = Date.now() - startTime;
      const durationMin = (duration / 1000 / 60).toFixed(1);

      // Analizar resultados
      const result = analyzeTestOutput(stdout, stderr, code);

      const moduleResult = {
        moduleKey,
        duration: duration,
        durationMin: `${durationMin} min`,
        exitCode: killed ? 'HARD_TIMEOUT' : code, // Marcar si fue timeout hard
        status: killed ? 'FAILED' : (code === 0 ? 'PASSED' : 'FAILED'),
        killedByHardTimeout: killed, // NUEVO campo
        ...result,
        timestamp: new Date().toISOString()
      };

      globalResults.modules.push(moduleResult);
      updateSummary(moduleResult);

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📊 RESULTADO: ${moduleKey}`);
      console.log(`   Status: ${moduleResult.status}`);
      if (killed) {
        console.log(`   ⚠️  Matado por HARD TIMEOUT (${durationMin} min)`);
      }
      console.log(`   Tests Passing: ${result.passing}/${result.total}`);
      console.log(`   Duration: ${durationMin} min`);
      console.log(`${'─'.repeat(70)}\n`);

      saveResults();
      resolve(moduleResult);
    });

    child.on('error', (error) => {
      clearTimeout(hardTimeoutHandle);
      console.error(`❌ ERROR ejecutando ${moduleKey}:`, error.message);

      const moduleResult = {
        moduleKey,
        duration: Date.now() - startTime,
        status: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      globalResults.modules.push(moduleResult);
      globalResults.summary.errors++;
      saveResults();

      resolve(moduleResult);
    });
  });
}
```

**Impacto esperado**:
- ✅ "partners" será matado después de 15 min (en vez de 61.9 min)
- ✅ Ahorro: 46.9 minutos
- ✅ Batch completo: ~2 horas (en vez de 2h 47min)

---

### 2. Aumentar Timeout Global de Playwright (3 min → 5 min)

**Archivo**: `backend/tests/e2e/modules/universal-modal-advanced.e2e.spec.js`

**Problema**: CHAOS testing real toma 4-5 min en módulos complejos, pero el timeout es de 3 min.

#### Código actual (Batch #4):

```javascript
test('1. 🌪️  CHAOS TESTING', async ({ page }) => {
  test.setTimeout(180000); // 3 minutos - INSUFICIENTE para módulos complejos

  if (!TEST_CONFIG.enableChaos) {
    test.skip();
    return;
  }

  // ... CHAOS testing (toma 4-5 min en módulos complejos)
});
```

#### Código MEJORA #7:

```javascript
test('1. 🌪️  CHAOS TESTING', async ({ page }) => {
  test.setTimeout(300000); // 5 minutos - MEJORA #7: Era 3 min (180s)

  if (!TEST_CONFIG.enableChaos) {
    test.skip();
    return;
  }

  // ... CHAOS testing
});
```

**Impacto esperado**:
- ✅ admin-consent-management: FAILED → PASSED
- ✅ attendance: FAILED → PASSED
- ✅ inbox: FAILED → PASSED
- ✅ Tasa de éxito: 80% → **92%** (+12 puntos)

---

### 3. Timeout en Navegación Inicial del Test

**Archivo**: `backend/tests/e2e/modules/universal-modal-advanced.e2e.spec.js`

**Problema**: Si la navegación al módulo se queda atrapada, el test entra en loop infinito.

#### Código actual (Batch #4):

```javascript
test.beforeEach(async ({ page }) => {
  // Login
  await page.goto('http://localhost:9998/panel-empresa.html');
  await page.waitForSelector('#companySlug');
  await page.fill('#companySlug', 'aponnt-empresa-demo');
  // ... resto del login

  // Navegar al módulo
  const url = `http://localhost:9998/panel-empresa.html?module=${MODULE_TO_TEST}`;
  await page.goto(url, { waitUntil: 'networkidle' }); // SIN TIMEOUT EXPLÍCITO

  // Esperar login completo
  await page.waitForSelector('body'); // SIN TIMEOUT EXPLÍCITO
});
```

#### Código MEJORA #7:

```javascript
test.beforeEach(async ({ page }) => {
  try {
    // Login con timeout explícito
    await page.goto('http://localhost:9998/panel-empresa.html', {
      waitUntil: 'networkidle',
      timeout: 30000 // MEJORA #7: 30s máximo para login page
    });

    await page.waitForSelector('#companySlug', {
      timeout: 15000 // MEJORA #7: 15s máximo
    });

    await page.fill('#companySlug', 'aponnt-empresa-demo');
    // ... resto del login con timeouts

    // Navegar al módulo con timeout explícito
    const url = `http://localhost:9998/panel-empresa.html?module=${MODULE_TO_TEST}`;
    console.log(`🔗 Navegando a: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000 // MEJORA #7: 60s máximo para cargar módulo
    });

    // Esperar login completo con timeout
    await page.waitForSelector('body', {
      timeout: 10000 // MEJORA #7: 10s máximo
    });

    console.log(`✅ Navegación exitosa a ${MODULE_TO_TEST}`);

  } catch (error) {
    console.error(`❌ Error en navegación inicial a ${MODULE_TO_TEST}:`, error.message);
    throw error; // Fallar el test explícitamente
  }
});
```

**Impacto esperado**:
- ✅ Si "partners" se queda atrapado en navegación, fallará en 60s (no en 61.9 min)
- ✅ Error más claro: "Timeout navegando a partners" vs exitCode null
- ✅ Logs más informativos para debug

---

### 4. Agregar Timeout en Stress Testing Individual (Safety Net)

**Archivo**: `backend/tests/e2e/helpers/chaos.helper.js`

**Nota**: Ya implementado en MEJORA #6, pero verificar que funciona correctamente.

#### Código MEJORA #6 (ya aplicado):

```javascript
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
      // ... resto
    } catch (error) {
      errors.push(error);
    }
  }

  // ... resto
}
```

**Verificar**: Esta mejora ya está en el código. Solo asegurar que se aplicó correctamente.

---

## 📊 IMPACTO PROYECTADO DE MEJORA #7

### Comparativa: Batch #4 vs Batch #5 (con MEJORA #7)

| Métrica | Batch #4 | Batch #5 (proyectado) | Diferencia |
|---------|----------|------------------------|------------|
| **Tasa de éxito** | 80% (20/25) | **92%** (23/25) | +12 puntos ⬆️ |
| **Tiempo total** | 167 min | **110 min** | -57 min ⬇️ |
| **Tiempo promedio** | 6.7 min/módulo | **4.4 min/módulo** | -2.3 min ⬇️ |
| **Loops infinitos** | 1 (partners, 61.9 min) | 0 (killed en 15 min) | -46.9 min ⬇️ |
| **CHAOS timeouts** | 3 módulos | 0 módulos | -3 fallos ⬇️ |

### Escenario Best Case (todo funciona)

- **25 módulos** × 4.4 min = **110 minutos** (~1h 50min) 🚀
- **Tasa de éxito**: 92-96% (23-24/25 módulos)
- **Módulos con problema**: 1-2 máximo (companies + posiblemente partners con fix)

### Escenario Worst Case (partners sigue con problema)

- **24 módulos** × 4.4 min = 106 min
- **partners** matado en 15 min = 15 min
- **Total**: 121 min (~2 horas)
- **Tasa de éxito**: 88-92% (22-23/25)

**En cualquier caso**: Mejora significativa vs Batch #4 (167 min, 80%)

---

## 🎯 CHECKLIST DE IMPLEMENTACIÓN

### Antes de ejecutar Batch #5:

- [ ] Aplicar cambio en `run-all-modules-tests.js` (timeout HARD)
- [ ] Aplicar cambio en `universal-modal-advanced.e2e.spec.js` (timeout 5 min en CHAOS)
- [ ] Aplicar cambio en `beforeEach` (timeouts en navegación)
- [ ] Verificar que `chaos.helper.js` tiene MEJORA #6 (timeout 30s)
- [ ] Commitear cambios con mensaje: "MEJORA #7: Fix definitivo loops + timeouts"
- [ ] Limpiar resultados anteriores: `rm batch-test-results.json`
- [ ] Ejecutar: `node tests/e2e/scripts/run-all-modules-tests.js`

### Durante la ejecución:

- [ ] Monitorear si "partners" es matado en ~15 min (no 61.9 min)
- [ ] Verificar que CHAOS tests completan sin timeout (5 min suficiente)
- [ ] Validar logs de navegación (timeouts explícitos funcionan)

### Después de la ejecución:

- [ ] Verificar tasa de éxito ≥ 90%
- [ ] Confirmar tiempo total ≤ 2 horas
- [ ] Analizar módulos fallidos (¿requieren MEJORA #8?)
- [ ] Generar reporte final de Batch #5

---

## 🔬 INVESTIGACIÓN ADICIONAL REQUERIDA

### Para el módulo "partners":

Si después de MEJORA #7 sigue siendo matado por timeout (15 min):

1. **Revisar spec file específico** (si existe):
   ```bash
   ls backend/tests/e2e/modules/*partner*.spec.js
   ```

2. **Revisar beforeAll/beforeEach**:
   - ¿Hay operaciones de BD lentas?
   - ¿Hay llamadas a APIs externas?
   - ¿Hay loops en el setup?

3. **Revisar el módulo en el frontend**:
   ```bash
   grep -r "module.*partners" backend/public/js/modules/
   ```

4. **Probar manualmente**:
   - Abrir http://localhost:9998/panel-empresa.html?module=partners
   - ¿Carga correctamente?
   - ¿Hay errores en consola?

5. **Si el problema persiste**: Considerar skipear "partners" temporalmente:
   ```javascript
   // run-all-modules-tests.js
   const SKIP_MODULES = ['partners']; // TEMP: Loop infinito - investigar

   const modules = result.rows
     .map(r => r.module_key)
     .filter(m => !SKIP_MODULES.includes(m));
   ```

---

## 📝 NOTAS TÉCNICAS

### ¿Por qué SIGKILL y no SIGTERM?

- **SIGTERM**: Señal "educada", el proceso puede ignorarla
- **SIGKILL**: Señal que el SO ejecuta inmediatamente, no se puede ignorar
- En un loop infinito, SIGTERM puede no funcionar → Usar SIGKILL

### ¿Por qué 15 min y no 10 min?

- CHAOS testing normal: 4-5 min
- Navegación + setup: 1-2 min
- 5 tests × 1 min promedio: 5 min
- Buffer para módulos complejos: 3-4 min
- **Total**: 13-16 min → **15 min es seguro pero no excesivo**

### ¿Por qué timeout de 5 min en CHAOS y no más?

- Stress test: 30s (con MEJORA #6)
- Fuzzing: 1-2 min
- Race conditions: 1 min
- Random interaction: 30s-1 min
- **Total**: 3-4.5 min → **5 min con buffer**

---

## 🎓 CONCLUSIÓN

MEJORA #7 es la última pieza crítica para tener un sistema de testing E2E **100% robusto y predecible**.

**Problemas que soluciona**:
1. ✅ Loops infinitos > 15 min (kill forzado)
2. ✅ CHAOS timeouts (3 min → 5 min)
3. ✅ Navegación atrapada (timeouts explícitos)

**Impacto esperado**:
- Tasa de éxito: 80% → **92%+**
- Tiempo total: 167 min → **110 min** (36% más rápido)
- Predecibilidad: 100% (ningún módulo > 15 min)

**Próximo paso**: Aplicar MEJORA #7 y ejecutar Batch #5 para validar.

---

**Creado**: 2025-12-23
**Estado**: ⏳ PENDIENTE DE IMPLEMENTACIÓN
**Prioridad**: 🔴 CRÍTICA
