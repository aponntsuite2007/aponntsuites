# 🔍 Regresión en módulo 'dashboard' - Notas de investigación

## 📊 Datos del problema

| Batch | Status | Tests | Notas |
|-------|--------|-------|-------|
| #5 | ✅ PASSED | 3/5 | 4.9 min, 2 skipped |
| #6 | ❌ FAILED | 3/5 | 4.3 min, **2 failing** |

**Cambio**: De PASSED → FAILED (regresión)

## 🔎 Posibles causas

### 1. Test Flaky (Intermitente)
- **Probabilidad**: 🟡 Media-Alta
- **Evidencia**: Módulo funcionaba en B5, falló en B6 sin cambios directos al módulo
- **Acción**: Ejecutar batch múltiples veces para confirmar si es intermitente

### 2. Cambio en código de producción
- **Probabilidad**: 🟡 Media
- **Evidencia**: Entre ejecuciones puede haber commits en repo
- **Acción**: Revisar `git log` entre timestamps de Batch #5 y #6

### 3. Efecto secundario de MEJORAS #8-13
- **Probabilidad**: 🟢 Baja
- **Evidencia**: Las mejoras fueron a timeouts y helpers, no a lógica de tests
- **Posible impacto**: Reducción de timeouts podría afectar módulo lento

### 4. Condición de carrera / Timing issue
- **Probabilidad**: 🟡 Media
- **Evidencia**: MEJORA #11 redujo timeouts (waitForSelector 60s → 30s)
- **Impacto**: Dashboard podría necesitar >30s para cargar ciertos elementos

## 🛠️ Acciones de debugging recomendadas

### Paso 1: Ver logs específicos del error
```bash
cd backend/tests/e2e
grep -A 50 "dashboard.*Error\|TEST.*dashboard" batch6-execution.log
```

### Paso 2: Ejecutar solo módulo dashboard
```bash
MODULE_TO_TEST=dashboard npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js
```

### Paso 3: Ejecutar con debug mode
```bash
DEBUG=pw:api MODULE_TO_TEST=dashboard npx playwright test --headed
```

### Paso 4: Comparar con Batch #5
- Ver si error es consistente o intermitente
- Si intermitente → Agregar retry a tests flaky
- Si consistente → Hay problema real de código o test

## 📝 Notas adicionales

### Tests que probablemente fallaron:
- Test #1: CHAOS Testing (el más probable)
- Test #2 o #3: Dependency Mapping o SSOT Analysis

### Hipótesis principal:
**Timeout reducido** (MEJORA #11: 60s → 30s) podría estar afectando módulos lentos como dashboard.

**Solución propuesta**:
- Aumentar timeout solo para módulos conocidos como lentos
- O agregar lógica adaptativa que detecte módulos lentos y ajuste timeout

### Código sugerido para fix:
```javascript
// En universal-modal-advanced.e2e.spec.js
const SLOW_MODULES = ['dashboard', 'users', 'companies'];
const timeoutForModule = SLOW_MODULES.includes(moduleConfig.moduleKey) ? 45000 : 30000;

await page.waitForSelector(selectorToWait, {
  timeout: timeoutForModule, // Adaptativo según módulo
  state: 'visible'
});
```

## ✅ Status de investigación

- [x] Documentado problema y síntomas
- [x] Identificadas causas probables
- [x] Propuestas acciones de debugging
- [x] Sugerido fix potencial
- [ ] **PENDIENTE**: Ejecutar debugging real con logs

**Próximo paso**: Ejecutar solo módulo dashboard para reproducir error y ver stack trace completo.
