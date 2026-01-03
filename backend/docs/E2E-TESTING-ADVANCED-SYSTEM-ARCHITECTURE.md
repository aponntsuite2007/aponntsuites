# 🏗️ ARQUITECTURA: E2E TESTING ADVANCED SYSTEM

**Fecha**: 2025-12-24
**Objetivo**: Sistema de testing E2E más completo, parametrizable y avanzado
**Ubicación**: Tab "E2E Testing Advanced" en panel-empresa.html

---

## 🎯 OBJETIVO DEL SISTEMA

Crear **EL SISTEMA DE TESTING E2E MÁS AVANZADO** que permita:

### ✅ Granularidad máxima
- Testear **1 test específico en 1 módulo**
- Testear **varios tests en varios módulos**
- Testear **TODO el sistema completo** (29 módulos × 8 tests = 232 combinaciones)

### ✅ Circuitos completos
- Testear **flows de negocio completos** (ej: crear usuario → asignar departamento → registrar asistencia)
- **Dependency chains** automáticas (si módulo X depende de Y, testear Y primero)
- **Cross-module integration tests**

### ✅ Presets históricos
- Migrar **24+ batches históricos** como configuraciones guardadas
- Ejecutar "Batch #10 completo" con un click
- Crear presets custom y guardarlos

### ✅ Mejor tecnología actual
- **Real-time progress** (WebSockets)
- **Parallel execution** (múltiples módulos simultáneamente)
- **AI-powered suggestions** (Brain recomienda qué testear)
- **Visual dependency graphs** (D3.js/Cytoscape.js)
- **Test recording & replay** (guardar sesiones)

---

## 📊 COMPONENTES DEL SISTEMA

### 1. FRONTEND: E2E Testing Control V3

**Archivo**: `public/js/modules/e2e-testing-control-v3.js`

#### 🎛️ 5 TABS PRINCIPALES

**TAB 1: Quick Run**
```
┌─────────────────────────────────────────────┐
│ 🚀 QUICK RUN - Ejecutar Rápido             │
├─────────────────────────────────────────────┤
│                                              │
│ Presets Rápidos:                             │
│ [🎯 Full System] [⚡ Critical Only]          │
│ [🔒 Security Tests] [📊 Data Integrity]     │
│                                              │
│ Mis Presets Guardados:                       │
│ • Batch #10 - Full Validation  [▶️]         │
│ • Critical 2 Modules           [▶️]         │
│ • Security CHAOS All           [▶️]         │
│                                              │
│ [➕ Crear Preset Nuevo]                      │
└─────────────────────────────────────────────┘
```

**TAB 2: Matrix Builder** (⭐ EL MÁS IMPORTANTE)
```
┌──────────────────────────────────────────────────────────────┐
│ 🎛️ MATRIX BUILDER - Construcción Avanzada                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌────────── SELECTOR DE TESTS ──────────┐                   │
│ │ TESTS BÁSICOS (5):                     │                   │
│ │ ☑️ SETUP (crear datos)                 │                   │
│ │ ☑️ CHAOS (50 iter)                     │                   │
│ │ ☑️ DEPENDENCY (relaciones)             │                   │
│ │ ☑️ SSOT (integridad)                   │                   │
│ │ ☑️ BRAIN (feedback)                    │                   │
│ │                                         │                   │
│ │ TESTS AVANZADOS (8):                   │                   │
│ │ ☐ XSS Injection                        │                   │
│ │ ☐ SQL Injection                        │                   │
│ │ ☐ Buffer Overflow                      │                   │
│ │ ☐ Race Conditions                      │                   │
│ │ ☐ Memory Leaks                         │                   │
│ │ ☐ Performance (load 100+)              │                   │
│ │ ☐ Accessibility (WCAG)                 │                   │
│ │ ☐ Cross-browser (Chrome/FF/Safari)     │                   │
│ └─────────────────────────────────────────┘                   │
│                                                               │
│ ┌────────── SELECTOR DE MÓDULOS ─────────────────────────┐  │
│ │                                                          │  │
│ │ 📁 CORE (5 módulos):        [✅ Todos] [❌ Ninguno]     │  │
│ │   ☑️ users (5/5 ✅)                                     │  │
│ │   ☑️ companies (2/5 ⚠️)                                 │  │
│ │   ☑️ attendance (5/5 ✅)                                │  │
│ │   ☐ departments                                         │  │
│ │   ☐ roles-permissions                                   │  │
│ │                                                          │  │
│ │ 📁 RRHH (8 módulos):        [✅ Todos] [❌ Ninguno]     │  │
│ │   ☐ payroll                                             │  │
│ │   ☐ vacations                                           │  │
│ │   ☐ medical-leaves                                      │  │
│ │   ... (5 más)                                           │  │
│ │                                                          │  │
│ │ 📁 ADVANCED (16 módulos):   [✅ Todos] [❌ Ninguno]     │  │
│ │   ... (collapsed)                                       │  │
│ │                                                          │  │
│ │ [🧠 Seleccionar por Brain] [⚠️ Solo con problemas]      │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ CONFIGURACIÓN AVANZADA:                                       │
│ Ejecución: ○ Secuencial  ● Paralelo (max 3 simultáneos)     │
│ Timeout: [5 min ▼] por módulo                                │
│ Retry: [3 intentos ▼] con exponential backoff                │
│ Brain Integration: ☑️ Activar feedback loop                  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ RESUMEN:                                                 │  │
│ │ Tests seleccionados: 5                                   │  │
│ │ Módulos seleccionados: 3                                 │  │
│ │ Total combinaciones: 15                                  │  │
│ │ Tiempo estimado: ~25 minutos                             │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ [💾 Guardar como Preset]  [🚀 Ejecutar Ahora]               │
└──────────────────────────────────────────────────────────────┘
```

**TAB 3: Flows & Circuits** (⭐ NUEVO - LO MÁS COMPLEJO)
```
┌──────────────────────────────────────────────────────────────┐
│ 🔄 FLOWS & CIRCUITS - Circuitos Completos de Negocio        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ FLOWS PREDEFINIDOS:                                           │
│                                                               │
│ ┌─ 📋 FLOW: Onboarding Empleado Completo ─────────────────┐ │
│ │ 1. [users] Crear usuario                    ✅ 2.3s     │ │
│ │ 2. [departments] Asignar departamento       ✅ 1.1s     │ │
│ │ 3. [roles-permissions] Asignar rol          ✅ 0.8s     │ │
│ │ 4. [biometric-consent] Registrar consenti.. ✅ 1.5s     │ │
│ │ 5. [attendance] Primera asistencia          ✅ 2.0s     │ │
│ │                                                           │ │
│ │ Estado: ✅ PASSED (7.7s total)                           │ │
│ │ [▶️ Ejecutar] [👁️ Ver Detalles] [📊 Ver Grafo]          │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─ 💰 FLOW: Ciclo de Nómina Completo ──────────────────────┐ │
│ │ 1. [hours-cube] Calcular horas trabajadas   ⏳ Running  │ │
│ │ 2. [payroll] Generar liquidación            ⏸️ Waiting   │ │
│ │ 3. [payroll] Aprobar nómina                 ⏸️ Waiting   │ │
│ │ 4. [notifications] Enviar notificación      ⏸️ Waiting   │ │
│ │                                                           │ │
│ │ Estado: ⏳ IN PROGRESS (1/4 completados)                 │ │
│ │ [⏹️ Detener] [👁️ Ver Logs]                               │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─ 🔒 FLOW: Security Audit Completo ────────────────────────┐│
│ │ Tests de seguridad en TODOS los módulos (29)             ││
│ │ • XSS Injection                                           ││
│ │ • SQL Injection                                           ││
│ │ • CSRF Protection                                         ││
│ │ • Auth Bypass                                             ││
│ │                                                           ││
│ │ [▶️ Ejecutar Security Audit]                             ││
│ └───────────────────────────────────────────────────────────┘│
│                                                               │
│ [➕ Crear Flow Custom]                                        │
│                                                               │
│ DEPENDENCY GRAPH (Visual):                                    │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │         [users] ──┬──> [departments]                     │  │
│ │            │      └──> [roles-permissions]               │  │
│ │            │                                              │  │
│ │            └────────> [attendance] ──> [payroll]         │  │
│ │                          │                                │  │
│ │                          └──> [vacations]                │  │
│ │                                                           │  │
│ │ [🔍 Expandir Grafo Completo]                             │  │
│ └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**TAB 4: Live Monitor**
```
┌──────────────────────────────────────────────────────────────┐
│ 📊 LIVE MONITOR - Ejecución en Tiempo Real                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ EJECUCIÓN ACTUAL: Batch #10 - Full Validation                │
│ Inicio: 17:32  |  Elapsed: 00:38:15  |  ETA: 01:22:00       │
│                                                               │
│ ┌─ PROGRESS BAR ─────────────────────────────────────────┐  │
│ │ ████████████░░░░░░░░░░░░░░░░░░░░  38% (11/29 módulos)  │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ MÓDULOS COMPLETADOS (11):                                     │
│ ✅ admin-consent-management    3/5 tests  9.3 min            │
│ ✅ associate-marketplace       5/5 tests  1.9 min            │
│ ✅ associate-workflow-panel    3/5 tests  5.9 min            │
│ ❌ attendance                  4/5 tests  9.6 min ⚠️         │
│ ... (7 más)                                                   │
│                                                               │
│ EN PROGRESO (1):                                              │
│ ⏳ dashboard                   2/5 tests  [████░░] 3.2 min   │
│    └─ CHAOS Testing running... (50/100 iterations)           │
│                                                               │
│ PENDIENTES (18):                                              │
│ ⏸️ database-sync, deploy-manager, ...                        │
│                                                               │
│ [⏹️ Detener Ejecución] [📄 Ver Logs Completos]               │
└──────────────────────────────────────────────────────────────┘
```

**TAB 5: History & Analytics**
```
┌──────────────────────────────────────────────────────────────┐
│ 📜 HISTORY & ANALYTICS - Historial y Análisis               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ ÚLTIMAS EJECUCIONES:                                          │
│                                                               │
│ ┌─ Batch #10 - Full Validation ─────────────────────────┐   │
│ │ 2025-12-24 17:32  |  Duración: 2h 6min                 │   │
│ │ Resultado: 28/29 PASSED (96.5%) ⬆️ +3.4%              │   │
│ │ Mejoras aplicadas: #23, #24                            │   │
│ │                                                         │   │
│ │ Detalles:                                               │   │
│ │ • attendance: 5/5 ✅ (era 4/5) ← MEJORA #23+24        │   │
│ │ • companies: 2/5 ⚠️ (sin cambios)                      │   │
│ │ • Otros 27: PASSED ✅                                  │   │
│ │                                                         │   │
│ │ [🔄 Re-ejecutar] [📊 Ver Gráficos] [💾 Exportar]      │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌─ Batch #9 - Con MEJORA #22 ───────────────────────────┐   │
│ │ 2025-12-24 15:25  |  Duración: 2h 6min                 │   │
│ │ Resultado: 27/29 PASSED (93.1%)                        │   │
│ │ [📊 Comparar con #10]                                  │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ GRÁFICOS DE TENDENCIA:                                        │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │  Success Rate Over Time                                  │  │
│ │  100% ┤                                          ●       │  │
│ │   90% ┤                                    ●             │  │
│ │   80% ┤                           ●                      │  │
│ │   70% ┤                    ●                             │  │
│ │   60% ┤              ●                                   │  │
│ │   50% ┤        ●                                         │  │
│ │   40% ┤  ●                                               │  │
│ │       └─────┬─────┬─────┬─────┬─────┬─────┬─────┬────   │  │
│ │            B1   B2   B4   B5   B6   B7   B9  B10         │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ [📊 Ver Analytics Completos] [📈 Generar Reporte]            │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 BACKEND: API REST

**Archivo**: `src/routes/e2eTestingAdvancedRoutes.js`

### 📋 ENDPOINTS

#### 1. Ejecución de Tests

```javascript
POST /api/e2e-advanced/execute
Body: {
  mode: "matrix" | "preset" | "flow",

  // Para mode: "matrix"
  selectedTests: ["setup", "chaos", "ssot"],
  selectedModules: ["users", "attendance"],
  config: {
    parallel: true,
    maxParallel: 3,
    timeout: 300000,
    retries: 3,
    brainIntegration: true
  },

  // Para mode: "preset"
  presetId: "batch-10-full",

  // Para mode: "flow"
  flowId: "onboarding-completo"
}

Response: {
  executionId: "exec_1735064400000",
  status: "running",
  estimatedDuration: 7800000, // ms
  websocketChannel: "e2e-exec-1735064400000"
}
```

#### 2. Gestión de Presets

```javascript
// Listar presets
GET /api/e2e-advanced/presets
Response: {
  presets: [
    {
      id: "batch-10-full",
      name: "Batch #10 - Full Validation",
      description: "29 módulos, 5 tests, MEJORAS #23+#24",
      config: { ... },
      tags: ["full", "validation", "production"],
      createdAt: "2025-12-24T17:32:00Z",
      createdBy: "admin@isi.com",
      timesExecuted: 3,
      avgDuration: 7800000,
      lastResult: { passed: 28, total: 29, rate: 96.5 }
    }
  ]
}

// Crear preset
POST /api/e2e-advanced/presets
Body: {
  name: "Mi Preset Custom",
  description: "...",
  config: { ... },
  tags: ["custom"]
}

// Ejecutar preset
POST /api/e2e-advanced/presets/:id/execute
```

#### 3. Flows de Negocio

```javascript
// Listar flows
GET /api/e2e-advanced/flows
Response: {
  flows: [
    {
      id: "onboarding-completo",
      name: "Onboarding Empleado Completo",
      steps: [
        { module: "users", action: "create", testType: "crud" },
        { module: "departments", action: "assign", testType: "integration" },
        { module: "roles-permissions", action: "assign", testType: "integration" },
        { module: "biometric-consent", action: "register", testType: "crud" },
        { module: "attendance", action: "create-first", testType: "crud" }
      ],
      dependencies: ["users", "departments", "roles-permissions"],
      estimatedDuration: 8000,
      category: "onboarding"
    }
  ]
}

// Ejecutar flow
POST /api/e2e-advanced/flows/:id/execute
```

#### 4. Monitoreo en Tiempo Real

```javascript
// WebSocket endpoint
WS /api/e2e-advanced/monitor/:executionId

// Mensajes emitidos:
{
  type: "module_started",
  module: "users",
  timestamp: "..."
}
{
  type: "test_completed",
  module: "users",
  test: "chaos",
  status: "passed",
  duration: 2300,
  timestamp: "..."
}
{
  type: "execution_completed",
  summary: { total: 29, passed: 28, failed: 1, rate: 96.5 },
  duration: 7800000,
  timestamp: "..."
}
```

#### 5. Analytics e Historial

```javascript
// Obtener historial
GET /api/e2e-advanced/executions?limit=20&offset=0
Response: {
  executions: [
    {
      id: "exec_...",
      presetName: "Batch #10",
      startTime: "...",
      duration: 7800000,
      summary: { ... },
      improvements: ["#23", "#24"]
    }
  ],
  total: 150
}

// Obtener analytics
GET /api/e2e-advanced/analytics?period=7d
Response: {
  successRateTrend: [
    { date: "2025-12-18", rate: 80 },
    { date: "2025-12-20", rate: 86.2 },
    { date: "2025-12-24", rate: 96.5 }
  ],
  avgDuration: 7200000,
  topFailingModules: [
    { module: "companies", failRate: 60 }
  ],
  improvementsImpact: [
    { improvement: "#23", rateIncrease: 3.4 }
  ]
}

// Comparar ejecuciones
GET /api/e2e-advanced/executions/compare?ids=exec1,exec2
```

---

## 🗄️ BASE DE DATOS

### Tablas nuevas

#### `e2e_test_presets`
```sql
CREATE TABLE e2e_test_presets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- { selectedTests, selectedModules, config }
  tags TEXT[], -- ['full', 'validation', 'security']
  created_by INTEGER REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  times_executed INTEGER DEFAULT 0,
  avg_duration INTEGER, -- milisegundos
  last_result JSONB -- { passed, total, rate }
);
```

#### `e2e_test_flows`
```sql
CREATE TABLE e2e_test_flows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL, -- [{ module, action, testType }, ...]
  dependencies TEXT[], -- ['users', 'departments']
  category VARCHAR(50), -- 'onboarding', 'payroll', 'security'
  estimated_duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

#### `e2e_test_executions`
```sql
CREATE TABLE e2e_test_executions (
  id VARCHAR(50) PRIMARY KEY, -- exec_timestamp
  preset_id INTEGER REFERENCES e2e_test_presets(id),
  flow_id INTEGER REFERENCES e2e_test_flows(id),
  mode VARCHAR(20), -- 'matrix', 'preset', 'flow'
  config JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration INTEGER,
  summary JSONB, -- { total, passed, failed, rate }
  results JSONB, -- Detalles por módulo
  improvements TEXT[], -- ['#23', '#24']
  executed_by INTEGER REFERENCES users(user_id)
);
```

---

## 🔄 FLUJO DE EJECUCIÓN

### Modo 1: Matrix (granular)

```
1. Usuario selecciona tests + módulos en UI
2. Click "Ejecutar Ahora"
3. Frontend → POST /api/e2e-advanced/execute
4. Backend:
   a. Crear execution_id
   b. Registrar en e2e_test_executions
   c. Spawnar proceso Node.js con Playwright
   d. Iniciar WebSocket para streaming
5. Playwright ejecuta tests:
   - Si parallel: 3 módulos simultáneamente (Promise.all)
   - Si secuencial: 1 por vez
6. Backend emite eventos WebSocket:
   - module_started, test_completed, etc.
7. Frontend actualiza UI en tiempo real
8. Al completar:
   - Actualizar e2e_test_executions
   - Si es preset, actualizar stats en e2e_test_presets
   - Cerrar WebSocket
9. Mostrar resumen final
```

### Modo 2: Flow (circuito completo)

```
1. Usuario selecciona flow predefinido
2. Click "Ejecutar Flow"
3. Backend resuelve dependencias:
   - Si flow requiere [users, departments, attendance]
   - Verificar que users esté OK antes de departments
4. Ejecutar steps en orden:
   Step 1: [users] Create → Test CRUD completo
   Step 2: [departments] Assign → Test integration
   Step 3: [attendance] Create → Test cascade
5. Si un step falla:
   - Detener flow (fail-fast)
   - O continuar y marcar como degraded (configurable)
6. Al completar flow:
   - Verificar estado final (todos los datos creados están OK)
   - Cleanup automático (borrar datos de prueba)
```

---

## 🎨 TECNOLOGÍAS USADAS

### Frontend
- **Framework**: Vanilla JS (compatible con sistema actual)
- **UI Components**: Custom (consistente con panel-empresa.html)
- **Grafos de dependencias**: D3.js o Cytoscape.js
- **Charts**: Chart.js para analytics
- **WebSockets**: Socket.io (real-time updates)
- **State Management**: LocalStorage + in-memory

### Backend
- **Framework**: Express.js (ya existente)
- **Testing**: Playwright (ya existente)
- **WebSocket**: Socket.io
- **Process Management**: child_process (ya usado)
- **Queue**: Bull (opcional, para cola de ejecuciones)

### Base de Datos
- **PostgreSQL** (ya existente)
- **JSONB** para configs flexibles

---

## 📊 FEATURES AVANZADAS

### 1. Ejecución Paralela Inteligente
```javascript
// Backend determina qué módulos pueden correr en paralelo
const parallelGroups = [
  ['users', 'companies', 'departments'], // Grupo 1 (independientes)
  ['attendance', 'payroll'],             // Grupo 2 (dependen de Grupo 1)
  ['notifications', 'inbox']             // Grupo 3 (dependen de Grupo 2)
];

// Ejecutar cada grupo con Promise.all
for (const group of parallelGroups) {
  await Promise.all(group.map(mod => runTests(mod)));
}
```

### 2. Smart Retry con Learning
```javascript
// Si módulo falla 3 veces por timeout, aumentar timeout automáticamente
if (retries >= 3 && error.type === 'timeout') {
  config.timeout = config.timeout * 1.5;
  console.log(`[SMART] Aumentando timeout: ${config.timeout}ms`);
}
```

### 3. Brain Integration Avanzada
```javascript
// Antes de ejecutar, preguntar a Brain qué testear
const brainSuggestions = await fetch('/api/brain/suggest-tests');
// Brain responde: "Testear attendance porque tuvo cambios recientes"

// Después de ejecutar, enviar resultados a Brain
await fetch('/api/brain/feedback', {
  body: { results, improvements: ['#23', '#24'] }
});
```

### 4. Test Recording
```javascript
// Guardar screenshots + video de cada test
await page.video(); // Playwright feature
// Almacenar en: /test-results/exec_xxx/module_yyy/video.webm
```

### 5. Diff Visualization
```javascript
// Comparar 2 ejecuciones visualmente
GET /api/e2e-advanced/executions/compare?ids=exec1,exec2
// Frontend muestra:
// ✅ users: 5/5 → 5/5 (sin cambios)
// ⬆️ attendance: 4/5 → 5/5 (+1 test, MEJORA #23+#24)
// ⬇️ companies: 3/5 → 2/5 (-1 test, ⚠️ regression)
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### FASE 1: Backend Core (2-3 horas)
- ✅ Crear `e2eTestingAdvancedRoutes.js`
- ✅ Endpoints básicos (execute, presets, flows)
- ✅ Migración BD (3 tablas nuevas)
- ✅ WebSocket setup

### FASE 2: Frontend V3 (3-4 horas)
- ✅ 5 tabs (Quick, Matrix, Flows, Live, History)
- ✅ Matrix builder con grid 29×8
- ✅ WebSocket client para live updates
- ✅ Preset CRUD

### FASE 3: Flows & Dependencies (2-3 horas)
- ✅ Sistema de flows predefinidos
- ✅ Dependency resolver
- ✅ Grafo visual con D3.js

### FASE 4: Migración de Batches (1-2 horas)
- ✅ Crear 10+ presets desde batches históricos
- ✅ Seed inicial con Batch #10, #9, etc.

### FASE 5: Features Avanzadas (2-3 horas)
- ✅ Parallel execution
- ✅ Smart retry
- ✅ Analytics & charts
- ✅ Diff visualization

### FASE 6: Testing & Polish (1-2 horas)
- ✅ Testear sistema completo
- ✅ Documentación
- ✅ Video demo

**TIEMPO TOTAL**: ~12-17 horas (1.5-2 días full-time)

---

## 📝 NOTAS IMPORTANTES

1. **Backward compatibility**: El sistema actual (`e2e-testing-control-v2.js`) seguirá funcionando. V3 es una expansión.

2. **Gradual rollout**: Implementar por fases. No necesitamos TODO de golpe.

3. **User feedback**: Después de cada fase, validar con usuario que va en la dirección correcta.

4. **Performance**: Ejecución paralela puede reducir tiempo de 2h a ~45min (3 módulos simultáneos).

5. **Escalabilidad**: Con queue (Bull), podemos encolar múltiples ejecuciones y procesarlas secuencialmente.

---

**Status**: 📋 ARQUITECTURA COMPLETA DISEÑADA
**Próximo paso**: Implementar FASE 1 (Backend Core)
