# 🎯 SISTEMA UNIFICADO DE AUDITORÍA Y AUTO-REPARACIÓN

## VISIÓN GENERAL

**UN SOLO SISTEMA** que detecta, diagnostica, repara y aprende de errores - ya sea a demanda o en tiempo real durante sesiones de usuarios.

---

## 🔄 ARQUITECTURA UNIFICADA

```
                    ┌─────────────────────────────────────┐
                    │   PANEL DE CONFIGURACIÓN SISTEMA    │
                    │   (frontend: settings module)       │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────────────┐
                    │  UNIFIED AUDITOR CONTROLLER         │
                    │  (backend: auditorRoutes.js)        │
                    └──────────────┬──────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ MODO PASIVO   │         │ MODO ACTIVO   │         │ MODO ITERATIVO│
│               │         │               │         │               │
│ • Monitorea   │         │ • Tests E2E   │         │ • Ciclos      │
│   usuarios    │         │ • Tests API   │         │   repetidos   │
│   reales      │         │ • Tests BD    │         │ • Auto-repair │
│ • Intercepta  │         │ • Navegador   │         │ • Mejora      │
│   errores     │         │   visible     │         │   incremental │
│ • NO intrusivo│         │ • A demanda   │         │ • Hasta 100%  │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  PRODUCTION ERROR MONITOR  │
                    │  (auto-learning layer)     │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  KNOWLEDGE BASE (Ollama)   │
                    │  (global learning)         │
                    └────────────────────────────┘
```

---

## 🎮 MODOS DE OPERACIÓN

### **1. MODO PASIVO** (Recomendado para Producción)

**¿Qué hace?**
- Se conecta al navegador del usuario ACTUAL
- Monitorea en segundo plano sin interferir
- Detecta errores cuando aparecen naturalmente
- Repara automáticamente si es posible
- Documenta en Knowledge Base

**¿Cuándo usarlo?**
- Durante sesiones normales de usuarios
- Para capturar errores reales en producción
- Para auto-aprendizaje continuo

**Cómo funciona:**
```javascript
// Usuario navega normalmente
Usuario abre módulo "Capacitaciones"
    ↓
Error aparece: "❌ Error cargando capacitaciones"
    ↓
Modo Pasivo detecta automáticamente
    ↓
ProductionErrorMonitor diagnostica
    ↓
Healer intenta reparar
    ↓
Knowledge Base documenta
    ↓
Usuario recibe notificación: "Error detectado y corregido"
```

**Configuración:**
```javascript
// Panel de Configuración → Auditoría
{
  "mode": "passive",
  "autoRepair": true,
  "notifyUsers": true,
  "learningEnabled": true
}
```

---

### **2. MODO ACTIVO** (Recomendado para QA/Desarrollo)

**¿Qué hace?**
- Ejecuta tests completos de TODOS los módulos
- Navega automáticamente cada pantalla
- Testea CRUD (Create, Read, Update, Delete)
- Testea APIs, Base de Datos, Dependencias
- Muestra navegador en tiempo real (opcional)

**¿Cuándo usarlo?**
- Antes de deploy a producción
- Después de cambios grandes
- Para verificar estado completo del sistema

**Cómo funciona:**
```javascript
// Admin dispara desde panel
Admin click en "Ejecutar Auditoría Completa"
    ↓
Sistema ejecuta:
  - EndpointCollector (tests de API)
  - DatabaseCollector (tests de BD)
  - FrontendCollector (tests E2E con Puppeteer)
  - IntegrationCollector (tests de dependencias)
    ↓
Resultados en tiempo real en panel
    ↓
Errores detectados → Auto-reparación (opcional)
    ↓
Resumen final con métricas
```

**Configuración:**
```javascript
// Panel de Configuración → Auditoría
{
  "mode": "active",
  "showBrowser": true,      // Ver navegador en tiempo real
  "parallel": false,         // Secuencial para ver mejor
  "autoHeal": true,          // Reparar automáticamente
  "modules": "all"           // o ["users", "attendance", ...]
}
```

---

### **3. MODO ITERATIVO** (Recomendado para Corrección Masiva)

**¿Qué hace?**
- Ejecuta MÚLTIPLES ciclos de auditoría + reparación
- Cada ciclo mejora sobre el anterior
- Continúa hasta alcanzar objetivo (ej: 100% de tests pasando)
- Navegador visible para ver progreso

**¿Cuándo usarlo?**
- Sistema nuevo con muchos errores
- Después de migración grande
- Para alcanzar 100% de funcionalidad

**Cómo funciona:**
```javascript
// Admin configura ciclos
Admin: "Ejecutar 500 ciclos hasta 100%"
    ↓
CICLO 1:
  - Auditoría completa → 50% de tests pasan
  - Detecta 23 errores
  - Repara 15 errores
  - Documenta en KB
    ↓
CICLO 2:
  - Auditoría completa → 67% de tests pasan
  - Detecta 8 errores nuevos
  - Repara 6 errores
    ↓
...
    ↓
CICLO 123:
  - Auditoría completa → 100% de tests pasan ✅
  - Sistema detiene automáticamente
  - Resumen final con gráfico de mejora
```

**Configuración:**
```javascript
// Panel de Configuración → Auditoría
{
  "mode": "iterative",
  "maxCycles": 500,
  "targetSuccessRate": 100,  // % de tests que deben pasar
  "showBrowser": true,
  "stopOnTarget": true        // Detener al alcanzar objetivo
}
```

---

## 🎛️ PANEL DE CONTROL UNIFICADO

### **Frontend: settings.html - Nueva sección "Sistema de Auditoría"**

```html
<div class="audit-control-panel">
  <h3>🔍 Sistema de Auditoría y Auto-Reparación</h3>

  <!-- SELECTOR DE MODO -->
  <div class="mode-selector">
    <button class="mode-btn" data-mode="passive">
      🔴 Modo Pasivo
      <small>Monitoreo en tiempo real</small>
    </button>
    <button class="mode-btn active" data-mode="active">
      ▶️ Modo Activo
      <small>Tests completos a demanda</small>
    </button>
    <button class="mode-btn" data-mode="iterative">
      🔁 Modo Iterativo
      <small>Ciclos auto-reparadores</small>
    </button>
  </div>

  <!-- CONFIGURACIÓN SEGÚN MODO -->
  <div class="mode-config" data-config="passive" style="display:none;">
    <h4>Configuración - Modo Pasivo</h4>
    <label>
      <input type="checkbox" id="passive-auto-repair" checked>
      Auto-reparar errores detectados
    </label>
    <label>
      <input type="checkbox" id="passive-notify-users" checked>
      Notificar usuarios cuando se corrige un error
    </label>
    <label>
      <input type="checkbox" id="passive-learning" checked>
      Documentar en Knowledge Base
    </label>
    <button onclick="startPassiveMode()">🔴 Activar Monitoreo</button>
    <button onclick="stopPassiveMode()">⏹️ Detener Monitoreo</button>
  </div>

  <div class="mode-config" data-config="active">
    <h4>Configuración - Modo Activo</h4>
    <label>
      <input type="checkbox" id="active-show-browser" checked>
      Mostrar navegador en tiempo real
    </label>
    <label>
      <input type="checkbox" id="active-auto-heal" checked>
      Auto-reparar errores
    </label>
    <label>
      Módulos a testear:
      <select id="active-modules">
        <option value="all">Todos los módulos</option>
        <option value="critical">Solo módulos críticos</option>
        <option value="custom">Selección personalizada</option>
      </select>
    </label>
    <button onclick="runActiveAudit()">▶️ Ejecutar Auditoría</button>
  </div>

  <div class="mode-config" data-config="iterative" style="display:none;">
    <h4>Configuración - Modo Iterativo</h4>
    <label>
      Ciclos máximos:
      <input type="number" id="iterative-max-cycles" value="100" min="1" max="1000">
    </label>
    <label>
      Objetivo de éxito (%):
      <input type="number" id="iterative-target" value="100" min="50" max="100">
    </label>
    <label>
      <input type="checkbox" id="iterative-show-browser" checked>
      Mostrar navegador
    </label>
    <button onclick="startIterativeCycles()">🔁 Iniciar Ciclos</button>
    <button onclick="stopIterativeCycles()">⏹️ Detener</button>
  </div>

  <!-- ESTADO EN TIEMPO REAL -->
  <div class="audit-status">
    <h4>📊 Estado Actual</h4>
    <div id="audit-status-display">
      <p>Status: <span id="status-text">Inactivo</span></p>
      <p>Modo: <span id="mode-text">-</span></p>
      <p>Progreso: <span id="progress-text">-</span></p>
      <p>Errores detectados: <span id="errors-count">0</span></p>
      <p>Errores reparados: <span id="repairs-count">0</span></p>
    </div>
    <div id="progress-bar" style="display:none;">
      <div class="progress-fill"></div>
    </div>
  </div>

  <!-- RESULTADOS -->
  <div class="audit-results">
    <h4>📋 Últimos Resultados</h4>
    <div id="results-container">
      <!-- Se llena dinámicamente -->
    </div>
  </div>

  <!-- MÉTRICAS HISTÓRICAS -->
  <div class="audit-metrics">
    <h4>📈 Métricas del Sistema</h4>
    <canvas id="metrics-chart"></canvas>
  </div>
</div>
```

---

## 🔗 BACKEND: Unified Auditor Controller

### **Nueva ruta: `/api/audit/unified`**

```javascript
// auditorRoutes.js - NUEVO CONTROLADOR UNIFICADO

router.post('/unified/start', auth, requireAdmin, async (req, res) => {
  const { mode, config } = req.body;

  switch (mode) {
    case 'passive':
      return await startPassiveMode(req, res, config);
    case 'active':
      return await startActiveMode(req, res, config);
    case 'iterative':
      return await startIterativeMode(req, res, config);
    default:
      return res.status(400).json({ error: 'Invalid mode' });
  }
});

router.post('/unified/stop', auth, requireAdmin, async (req, res) => {
  // Detener cualquier modo que esté corriendo
  if (passiveMonitor) passiveMonitor.stop();
  if (iterativeAuditor) iterativeAuditor.stop();
  // ...
});

router.get('/unified/status', auth, requireAdmin, async (req, res) => {
  // Retornar estado actual unificado
  res.json({
    mode: currentMode,
    isRunning: isAnyModeRunning(),
    metrics: getCurrentMetrics(),
    progress: getCurrentProgress()
  });
});
```

---

## 🧠 AUTO-APRENDIZAJE CONTINUO

**Todos los modos** alimentan el mismo ciclo de aprendizaje:

```
Error Detectado (cualquier modo)
    ↓
ProductionErrorMonitor.reportError()
    ↓
Diagnóstico con AuditorEngine
    ↓
Reparación con Healers
    ↓
Documentación en Knowledge Base
    ↓
Ollama aprende
    ↓
Próximo usuario pregunta → Recibe solución real
```

---

## 📊 MÉTRICAS UNIFICADAS

```javascript
// Todas las métricas en un solo lugar
{
  "system": {
    "overallHealth": 87.3,        // % de salud general
    "totalModules": 44,
    "functionalModules": 38,
    "criticalIssues": 2,
    "warnings": 6
  },
  "passive": {
    "isActive": true,
    "errorsDetected": 45,
    "errorsRepaired": 32,
    "successRate": 71.1
  },
  "active": {
    "lastRun": "2025-10-20T20:30:00Z",
    "testsRun": 156,
    "testsPassed": 142,
    "testsFailed": 14
  },
  "iterative": {
    "isRunning": false,
    "cyclesCompleted": 0,
    "targetReached": false
  },
  "learning": {
    "knowledgeEntries": 127,
    "ollamaAvailable": true,
    "lastLearned": "2025-10-20T21:15:00Z"
  }
}
```

---

## ✅ PRÓXIMOS PASOS DE IMPLEMENTACIÓN

1. ✅ **Crear UnifiedAuditorController** en backend
2. ✅ **Integrar en settings.html** - Panel de control visual
3. ✅ **Conectar con ProductionErrorMonitor**
4. ✅ **WebSocket para actualizaciones en tiempo real**
5. ✅ **Gráficos de métricas** con Chart.js
6. ✅ **Notificaciones push** cuando se detecta/repara error

---

## 🎯 RESULTADO FINAL

**Un solo panel** en Configuración del Sistema donde:

- ✅ Activas/desactivas monitoreo pasivo
- ✅ Ejecutas auditorías completas a demanda
- ✅ Lanzas ciclos iterativos de auto-reparación
- ✅ Ves estado en tiempo real
- ✅ Ves métricas históricas
- ✅ Todo se auto-documenta en Knowledge Base
- ✅ Ollama aprende de cada error
- ✅ Sistema mejora continuamente

**Sin salir del sistema, sin abrir navegadores externos, todo integrado.**

---

¿Te gusta esta visión? ¿Implementamos el panel unificado? 🚀
