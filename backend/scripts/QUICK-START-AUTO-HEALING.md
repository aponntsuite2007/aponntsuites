# 🚨 AUTO-HEALING: DASHBOARD CON LOGS DETALLADOS EN TIEMPO REAL

## ✅ SOLUCIÓN IMPLEMENTADA (2025-12-11)

El dashboard ahora captura **TODOS** los logs en tiempo real, incluyendo:
- 📍 Login paso a paso (PASO 1, PASO 2, PASO 3)
- 🔍 Descubrimiento de módulos ("📦 Testeando módulo X de Y")
- ⚙️ Operaciones internas (clicks, esperas, validaciones)
- ✅ Progreso detallado con emojis

**Actualización automática**: El dashboard hace polling cada 3 segundos para mostrar logs en tiempo real.

## 💡 CÓMO USAR EL DASHBOARD

1. Ir a: `http://localhost:9998/panel-administrativo.html`
2. Click en "Auditor Dashboard" (solo admins)
3. Click en "▶️ Ejecutar Auto-Healing"
4. **Ver logs detallados en tiempo real** en la sección de logs
5. **🛑 Detener Ejecución**: Si necesitas cancelar, usa el botón rojo que aparece durante la ejecución
6. Opcional: Tildar "👁️ Ver navegador en vivo" para ver Chromium

## ❌ PROBLEMA ANTERIOR: Dashboard se queda en "Iniciando navegador..."

**CAUSA**: Playwright/Chromium puede fallar al iniciar en Windows.

## ✅ SOLUCIÓN: Ejecutar desde CLI

```bash
cd C:/Bio/sistema_asistencia_biometrico/backend

# Test rápido (1 iteración):
node scripts/run-auto-healing-cycle.js --max-iterations=1

# Producción (5 iteraciones):
node scripts/run-auto-healing-cycle.js
```

## 📊 QUÉ HACE

1. ✅ Login en empresa ISI
2. ✅ Descubre UI de 42 módulos (usando Playwright)
3. ✅ Encuentra gaps (elementos NO documentados en Brain)
4. ✅ ACTUALIZA `modules-registry.json` automáticamente
5. ✅ Re-testea hasta gaps === 0

## 📁 OUTPUT

- `backend/logs/auto-healing-cycle-TIMESTAMP.json` - Reporte completo
- `backend/src/auditor/registry/modules-registry.json` - Brain actualizado

## ⏱️ DURACIÓN

- 1 iteración: ~15-30 min
- 5 iteraciones: ~1-2 horas

## 🔧 CONFIGURACIÓN

Editar `backend/scripts/run-auto-healing-cycle.js` líneas 15-19:

```javascript
const MAX_ITERATIONS = 1;        // ← Cambiar aquí
const COMPANY_SLUG = 'isi';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const HEADLESS = true;           // false = ver navegador
```

## 🎯 ALTERNATIVA: Ver README completo

```bash
# Ver documentación completa:
cat backend/scripts/README-UNIVERSAL-DISCOVERY.md

# Línea 41 tiene el comando exacto:
node scripts/run-auto-healing-cycle.js
```

## 💡 TIP: Si Playwright falla

```bash
# Instalar navegador Chromium:
cd backend
npx playwright install chromium

# Re-ejecutar:
node scripts/run-auto-healing-cycle.js --max-iterations=1
```
