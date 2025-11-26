# 🧠 SISTEMA INTELIGENTE DE TAREAS

**Versión**: 1.0
**Fecha**: 2025-11-24
**Estado**: ✅ IMPLEMENTADO

---

## 📋 ÍNDICE

1. [Visión General](#visión-general)
2. [Problema que Resuelve](#problema-que-resuelve)
3. [Arquitectura](#arquitectura)
4. [Flujo Completo](#flujo-completo)
5. [Componentes](#componentes)
6. [API REST](#api-rest)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Integración con Engineering Dashboard](#integración-con-engineering-dashboard)

---

## 🎯 VISIÓN GENERAL

El **Sistema Inteligente de Tareas** es un cerebro automático que:

1. ✅ **Analiza tareas ANTES de empezar** (evita duplicar trabajo)
2. ✅ **Sincroniza automáticamente AL COMPLETAR** (mantiene todo coordinado)
3. ✅ **Detecta descoordinaciones** (roadmap vs modules vs código real)
4. ✅ **Reorganiza info afectada** (dependencies, progress, status)
5. ✅ **Asigna tareas a Claude Code o humanos** (con contexto completo)

---

## 🔴 PROBLEMA QUE RESUELVE

### Problema Actual

```
Tab 1: "Gestión de Vendedores (40%)"
Tab 2: "Sistema de Jerarquía y Comisiones COMPLETED (100%)"
                    ↑
            SON EL MISMO SISTEMA
            PERO DICEN COSAS DIFERENTES
```

**Causa**: Información hardcodeada que NO se sincroniza automáticamente.

### Solución

**Sistema event-driven** que sincroniza automáticamente AL COMPLETAR una tarea.

---

## 🏗️ ARQUITECTURA

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                 SISTEMA INTELIGENTE DE TAREAS               │
└─────────────────────────────────────────────────────────────┘

1. PRE-TASK ANALYZER (ANTES)
   ├─ Analiza si tarea existe (total/parcial)
   ├─ Busca en roadmap/modules/código
   ├─ Evalúa dependencies
   └─ Genera plan de ejecución

2. POST-TASK SYNCHRONIZER (DESPUÉS)
   ├─ Actualiza roadmap (done: true, completedDate)
   ├─ Analiza cambios en código
   ├─ Detecta descoordinaciones
   ├─ Sincroniza modules con roadmap
   ├─ Actualiza dependencies
   └─ Reorganiza info afectada

3. CODE INTELLIGENCE SERVICE (ANÁLISIS)
   ├─ Analiza código REAL
   ├─ Detecta qué está implementado
   ├─ Calcula progress real
   └─ Genera reportes de inconsistencias
```

---

## 🔄 FLUJO COMPLETO

### 1️⃣ INICIO DE TAREA (PreTaskAnalysis)

```
Usuario: "Implementar sistema de comisiones"
    ↓
🔍 PreTaskAnalyzer
    ├─ Busca en roadmap
    ├─ Busca en modules
    ├─ Busca en código
    └─ Analiza dependencies
    ↓
📊 REPORTE:
    ├─ "✅ Existe en roadmap: phase1_vendorHierarchy (100%)"
    ├─ "✅ Existe en código: VendorCommission.js, etc."
    ├─ "⚠️  Completitud estimada: 85%"
    └─ "📋 Recomendación: Revisar código y completar detalles"
```

### 2️⃣ EJECUCIÓN

```
Claude o humano trabaja en la tarea
    ↓
(NO se monitorea en tiempo real)
    ↓
Hace commits, edita archivos, tests, etc.
```

### 3️⃣ FINALIZACIÓN (⚡ TRIGGER)

```
Usuario: "Tarea completada"  o
Claude: POST /api/task-intelligence/complete
    ↓
🚀 PostTaskSynchronizer (SE DISPARA AUTOMÁTICAMENTE)
    ├─ PASO 1: Actualizar roadmap
    │   ├─ Marcar done: true
    │   ├─ Agregar completedDate
    │   ├─ Recalcular progress de phase
    │   └─ Si 100% → Marcar phase como COMPLETED
    │
    ├─ PASO 2: Analizar cambios en código
    │   ├─ Detectar nuevos archivos
    │   ├─ Detectar nuevas tablas BD
    │   └─ Detectar nuevos endpoints
    │
    ├─ PASO 3: Detectar descoordinaciones
    │   ├─ Comparar modules vs roadmap
    │   ├─ Progress mismatch?
    │   └─ Status mismatch?
    │
    ├─ PASO 4: Sincronizar modules con roadmap
    │   ├─ module.progress = phase.progress
    │   └─ module.status = phase.status
    │
    ├─ PASO 5: Actualizar dependencies
    │   ├─ Buscar phases que dependían de esta
    │   └─ Desbloquear si estaban bloqueadas
    │
    └─ PASO 6: Reorganizar info afectada
        ├─ Actualizar lastUpdated
        └─ Agregar a latestChanges
    ↓
✅ Engineering Dashboard actualizado
   Roadmap sincronizado
   Modules sincronizados
   NO HAY DESCOORDINACIONES
```

---

## 🔧 COMPONENTES

### 1. PreTaskAnalyzer

**Archivo**: `src/services/PreTaskAnalyzer.js`

**Propósito**: Analizar tarea ANTES de empezar

**Métodos**:
- `analyzeTask(task)` - Análisis completo
- `searchInRoadmap()` - Buscar en roadmap
- `searchInModules()` - Buscar en modules
- `searchInCode()` - Buscar evidencia en código
- `analyzeDependencies()` - Analizar dependencies
- `generateRecommendation()` - Generar recomendación
- `generateExecutionPlan()` - Generar plan

**Output**:
```javascript
{
  task: "Implementar...",
  existsInRoadmap: true,
  existsInCode: true,
  completionStatus: {
    estimated: 85,
    confidence: 100
  },
  recommendation: "⚠️ TAREA PARCIALMENTE IMPLEMENTADA",
  executionPlan: [
    "1. Revisar código existente",
    "2. Completar funcionalidades faltantes",
    // ...
  ]
}
```

---

### 2. PostTaskSynchronizer

**Archivo**: `src/services/PostTaskSynchronizer.js`

**Propósito**: Sincronizar TODO al completar tarea

**Métodos**:
- `synchronize(completedTask)` - Sincronización completa
- `updateRoadmap()` - Paso 1
- `analyzeCodeChanges()` - Paso 2
- `detectInconsistencies()` - Paso 3
- `synchronizeModulesWithRoadmap()` - Paso 4
- `updateDependencies()` - Paso 5
- `reorganizeAffectedInfo()` - Paso 6

**Output**:
```javascript
{
  success: true,
  changes: [
    "✅ Marcado done: true",
    "📅 Agregado completedDate: 2025-11-24",
    "📈 Progress actualizado: 85% → 90%",
    "📊 vendedores.progress actualizado a 90%"
  ],
  inconsistencies: [],
  affectedModules: ["vendedores"]
}
```

---

### 3. CodeIntelligenceService

**Archivo**: `src/services/CodeIntelligenceService.js`

**Propósito**: Análisis de código REAL

**Métodos**:
- `analyzeModuleInCode(moduleKey)` - Analizar módulo
- `analyzeBackendFiles()` - Buscar archivos backend
- `analyzeFrontendFiles()` - Buscar archivos frontend
- `analyzeDatabaseSchema()` - Buscar tablas BD
- `analyzeAPIRoutes()` - Buscar endpoints
- `calculateRealProgress()` - Calcular progress real
- `detectInconsistencies()` - Detectar descoordinaciones

---

## 🌐 API REST

**Base URL**: `/api/task-intelligence`

### Endpoints

#### 1. Analizar Tarea (ANTES)

```http
POST /api/task-intelligence/analyze

Body:
{
  "description": "Implementar sistema de comisiones piramidales",
  "moduleKey": "vendedores" // opcional
}

Response:
{
  "success": true,
  "analysis": {
    "existsInRoadmap": true,
    "existsInCode": true,
    "completionStatus": { estimated: 85 },
    "recommendation": "⚠️ TAREA PARCIALMENTE IMPLEMENTADA",
    "executionPlan": [...]
  }
}
```

#### 2. Completar Tarea (DESPUÉS)

```http
POST /api/task-intelligence/complete

Body:
{
  "taskId": "VH-1",
  "phaseKey": "phase1_vendorHierarchy",
  "moduleKey": "vendedores", // opcional
  "completedBy": "claude-code" // o "human"
}

Response:
{
  "success": true,
  "result": {
    "changes": [...],
    "inconsistencies": [],
    "affectedModules": ["vendedores"]
  }
}
```

#### 3. Ver Descoordinaciones

```http
GET /api/task-intelligence/inconsistencies

Response:
{
  "success": true,
  "report": {
    "totalInconsistencies": 2,
    "bySeverity": {
      "HIGH": 2,
      "MEDIUM": 0,
      "LOW": 0
    },
    "details": [
      {
        "type": "PROGRESS_MISMATCH",
        "severity": "HIGH",
        "module": "vendedores",
        "moduleProgress": 40,
        "roadmapProgress": 100,
        "suggestion": "Sincronizar progress"
      }
    ]
  }
}
```

#### 4. Asignar a Claude Code

```http
POST /api/task-intelligence/assign-to-claude

Body:
{
  "taskId": "BC-1",
  "phaseKey": "phase2_budgetsContracts",
  "instructions": "Implementar backend completo para presupuestos"
}

Response:
{
  "success": true,
  "claudeContext": {
    "taskId": "BC-1",
    "preAnalysis": {...},
    "commandToRun": "claude-code --model sonnet-4.5",
    "message": "🎯 TAREA ASIGNADA: BC-1..."
  }
}
```

#### 5. Asignar a Humano

```http
POST /api/task-intelligence/assign-to-human

Body:
{
  "taskId": "BC-2",
  "phaseKey": "phase2_budgetsContracts",
  "assignedTo": "Developer Name"
}

Response:
{
  "success": true,
  "message": "Tarea BC-2 asignada a Developer Name",
  "analysis": {...}
}
```

---

## 💡 EJEMPLOS DE USO

### Ejemplo 1: Claude recibe nueva tarea

```javascript
// 1. Analizar ANTES de empezar
const analysis = await fetch('/api/task-intelligence/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: "Implementar sistema de comisiones",
    moduleKey: "vendedores"
  })
});

console.log(analysis.recommendation);
// "⚠️ TAREA PARCIALMENTE IMPLEMENTADA - Continuar desde código existente"

console.log(analysis.executionPlan);
// ["1. Revisar código existente", "2. Completar funcionalidades", ...]

// 2. Ejecutar tarea (Claude trabaja)
// ...

// 3. AL FINALIZAR, sincronizar
await fetch('/api/task-intelligence/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: "VH-19",
    phaseKey: "phase1_vendorHierarchy",
    completedBy: "claude-code"
  })
});
// ✅ Roadmap actualizado
// ✅ Modules sincronizados
// ✅ Dependencies actualizadas
```

### Ejemplo 2: Ver descoordinaciones

```javascript
const report = await fetch('/api/task-intelligence/inconsistencies');

console.log(report.totalInconsistencies); // 2

report.details.forEach(inc => {
  console.log(`⚠️ ${inc.type}`);
  console.log(`   ${inc.module}: ${inc.moduleProgress}%`);
  console.log(`   ${inc.roadmapKey}: ${inc.roadmapProgress}%`);
  console.log(`   Sugerencia: ${inc.suggestion}`);
});
```

---

## 🎨 INTEGRACIÓN CON ENGINEERING DASHBOARD

### UI Propuesta

En el Engineering Dashboard, cada tarea del roadmap tendrá:

```
┌─────────────────────────────────────────────────────────┐
│ VH-1: Migración DB - ALTER TABLE companies             │
│ ✅ DONE (Completado: 2025-11-22)                       │
│                                                          │
│ [Ver Detalles] [Reabrir Tarea]                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ BC-1: Diseño completo de arquitectura                  │
│ 📋 PENDING                                              │
│                                                          │
│ [🤖 Asignar a Claude] [👤 Asignar a Humano] [Empezar] │
└─────────────────────────────────────────────────────────┘
```

### Botones Propuestos

1. **"🤖 Asignar a Claude"**:
   - Llama `POST /api/task-intelligence/assign-to-claude`
   - Muestra modal con contexto para Claude
   - Permite agregar instrucciones adicionales
   - Botón "Copiar comando" para ejecutar en terminal

2. **"Empezar"**:
   - Llama `POST /api/task-intelligence/analyze`
   - Muestra análisis pre-tarea
   - Muestra plan de ejecución
   - Botón "Continuar"

3. **"Completar"**:
   - Llama `POST /api/task-intelligence/complete`
   - Dispara sincronización automática
   - Muestra resumen de cambios
   - Muestra descoordinaciones detectadas (si hay)

4. **"🔍 Ver Descoordinaciones"** (botón global):
   - Llama `GET /api/task-intelligence/inconsistencies`
   - Muestra lista de inconsistencias
   - Botón "Sincronizar ahora" para cada una

---

## 📊 FLUJO EN EL DASHBOARD

### Caso de Uso: Usuario quiere implementar nueva feature

```
1. Usuario abre Engineering Dashboard

2. Ve roadmap con todas las tasks

3. Hace click en "BC-1: Diseño de arquitectura"

4. Ve modal con:
   ┌─────────────────────────────────────────┐
   │ 🔍 ANÁLISIS PRE-TAREA                  │
   │                                         │
   │ ✅ Existe en roadmap: NO               │
   │ ✅ Existe en código: NO                │
   │ ✅ Completitud: 0%                     │
   │                                         │
   │ 📋 Recomendación:                      │
   │ "🆕 TAREA NUEVA - Comenzar desde cero"│
   │                                         │
   │ 📝 Plan de ejecución:                  │
   │ 1. Análisis de requerimientos          │
   │ 2. Diseño de arquitectura              │
   │ 3. Crear entrada en roadmap            │
   │ ...                                     │
   │                                         │
   │ [🤖 Asignar a Claude] [👤 A Humano]   │
   │ [📝 Empezar yo mismo]                  │
   └─────────────────────────────────────────┘

5. Usuario elige "🤖 Asignar a Claude"

6. Ve modal de asignación:
   ┌─────────────────────────────────────────┐
   │ 🤖 ASIGNAR A CLAUDE CODE                │
   │                                         │
   │ Tarea: BC-1                             │
   │ Phase: phase2_budgetsContracts          │
   │                                         │
   │ Instrucciones adicionales:              │
   │ ┌─────────────────────────────────────┐│
   │ │ Implementar backend usando Sequelize││
   │ │ Incluir tests con Jest              ││
   │ └─────────────────────────────────────┘│
   │                                         │
   │ Comando para ejecutar:                  │
   │ ┌─────────────────────────────────────┐│
   │ │ claude-code --model sonnet-4.5      ││
   │ └─────────────────────────────────────┘│
   │                                         │
   │ [Copiar Comando] [Cancelar]             │
   └─────────────────────────────────────────┘

7. Usuario ejecuta comando en terminal

8. Claude trabaja y al finalizar llama:
   POST /api/task-intelligence/complete

9. Dashboard se actualiza automáticamente:
   ✅ Task marcada como done
   ✅ Progress bar actualizado
   ✅ Modules sincronizados
   ✅ NO HAY DESCOORDINACIONES
```

---

## 🚀 COMANDOS ÚTILES

### Ejecutar demo

```bash
cd backend
node scripts/demo-task-intelligence.js
```

### Testing

```bash
# Analizar tarea
curl -X POST http://localhost:9998/api/task-intelligence/analyze \
  -H "Content-Type: application/json" \
  -d '{"description": "Implementar sistema de comisiones"}'

# Completar tarea
curl -X POST http://localhost:9998/api/task-intelligence/complete \
  -H "Content-Type: application/json" \
  -d '{"taskId":"VH-1","phaseKey":"phase1_vendorHierarchy","completedBy":"claude-code"}'

# Ver descoordinaciones
curl http://localhost:9998/api/task-intelligence/inconsistencies
```

---

## ✅ VENTAJAS DEL SISTEMA

1. **No más información descoordinada** - Todo se sincroniza automáticamente
2. **Evita duplicar trabajo** - Analiza ANTES de empezar
3. **Contexto completo para Claude** - Sabe exactamente qué hacer
4. **Trazabilidad perfecta** - Todo cambio queda registrado
5. **Dependencies inteligentes** - Desbloquea tareas automáticamente
6. **Event-driven** - No monitoreo constante, solo cuando se completa
7. **Confiable** - Basado en código REAL, no suposiciones

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **IMPLEMENTADO**: PreTaskAnalyzer
2. ✅ **IMPLEMENTADO**: PostTaskSynchronizer
3. ✅ **IMPLEMENTADO**: API REST
4. ✅ **IMPLEMENTADO**: Integración en server.js
5. ⏳ **PENDIENTE**: UI en Engineering Dashboard
6. ⏳ **PENDIENTE**: Integración con Claude Code CLI

---

**Última actualización**: 2025-11-24
**Autor**: Sistema Inteligente de Tareas
