# 🔍 UNIVERSAL MODULE DISCOVERY SYSTEM

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Características](#características)
3. [Arquitectura](#arquitectura)
4. [Métodos Implementados](#métodos-implementados)
5. [Scripts Disponibles](#scripts-disponibles)
6. [Guía de Uso](#guía-de-uso)
7. [Resultados y Reportes](#resultados-y-reportes)
8. [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

El **Universal Module Discovery System** es un sistema inteligente de testing automatizado que:

- ✅ Descubre la estructura UI de módulos sin asumir selectores hardcoded
- ✅ Detecta botones, modales, tabs, file uploads e integraciones dinámicamente
- ✅ Cross-reference con Brain metadata para identificar gaps
- ✅ Genera reportes detallados de elementos NO documentados
- ✅ Se adapta a la estructura real del frontend

**Problema que resuelve**: Los tests tradicionales asumen selectores específicos que fallan cuando cambia el frontend. Este sistema **descubre** dinámicamente qué existe en el módulo y testea lo que encuentra.

---

## 🎯 Características

### 1. **Intelligent Button Discovery**
- Descubre TODOS los botones visibles en la página
- Scoring inteligente por keywords (crear, editar, eliminar, etc.)
- No requiere conocer selectores específicos

### 2. **Modal Detection Avanzado**
- 18 selectores alternativos para encontrar modales
- Sistema de reintentos (configurable: 5x1s, 10x2s, etc.)
- Detección de modales anidados por z-index

### 3. **Auto-Scroll Form Filling**
- Hace scroll automático a cada campo antes de llenarlo
- Soluciona problema de campos fuera del viewport
- Espera animaciones (300ms) antes de interactuar

### 4. **Tabs Discovery**
- Detecta tabs con 8 patrones diferentes (.nav-tabs, [role="tablist"], etc.)
- Clickea cada tab para explorar su contenido
- Reporta inputs/botones/uploads por tab

### 5. **File Uploads Detection**
- Encuentra input[type="file"] automáticamente
- Detecta integración con DMS (data-dms, class*="dms")
- Identifica uploads múltiples

### 6. **Brain Cross-Reference**
- Compara UI descubierta vs Brain metadata
- Identifica elementos NO documentados (gaps)
- Genera recomendaciones priorizadas

---

## 🏗️ Arquitectura

```
Phase4TestOrchestrator (Orchestrator principal)
    │
    ├─ discoverAllButtons()           → Descubre todos los botones
    ├─ findButtonByKeywords()         → Encuentra botón con scoring
    ├─ discoverModalStructure()       → Detecta modales con 18 selectores
    ├─ fillFormIntelligently()        → Llena formulario con auto-scroll
    ├─ clickButtonByText()            → Click por texto
    │
    ├─ discoverTabs()                 → Detecta tabs
    ├─ discoverFileUploads()          → Detecta file uploads
    ├─ discoverNestedModals()         → Detecta modales anidados
    │
    ├─ discoverModuleStructure()      → MASTER: Discovery completo
    └─ crossReferenceWithBrain()      → Compara con Brain metadata
```

---

## 🛠️ Métodos Implementados

### Métodos Básicos (Fase 1)

#### 1. `discoverAllButtons()`
Descubre todos los botones visibles en la página.

**Retorna**:
```javascript
[
  {
    text: "Agregar Usuario",
    classes: "btn btn-primary",
    id: "addUserBtn",
    onclick: "showAddUser()",
    href: null,
    dataAction: "create"
  },
  // ... más botones
]
```

#### 2. `findButtonByKeywords(keywords, preferredAction)`
Encuentra el mejor botón candidato usando scoring.

**Parámetros**:
- `keywords`: Array de palabras clave (ej: ['crear', 'nuevo', 'agregar'])
- `preferredAction`: Acción preferida (ej: 'create', 'edit', 'delete')

**Scoring**:
- +10 por keyword match
- +15 por dataAction match
- +5 por btn-primary class

**Ejemplo**:
```javascript
const createBtn = await orchestrator.findButtonByKeywords(
  ['crear', 'nuevo', 'agregar'],
  'create'
);
```

#### 3. `discoverModalStructure(maxRetries = 5, retryDelay = 1000)`
Encuentra modales con 18 selectores alternativos + reintentos.

**Selectores**:
- `.modal[style*="display: block"]`
- `.modal.show`, `.modal.fade.show`
- `[role="dialog"]`
- `[class*="modal"]`, `[class*="dialog"]`
- ... y 12 más

**Retorna**:
```javascript
{
  found: true,
  selector: ".modal.show",
  inputCount: 8,
  inputs: [...],
  buttons: [...],
  dimensions: { width: 600, height: 400 }
}
```

#### 4. `fillFormIntelligently(inputs, prefix = 'Test')`
Llena formulario con scroll automático.

**Características**:
- scrollIntoView() antes de cada campo
- wait(300ms) para animaciones
- Valor inteligente por nombre de campo (name, email, address, etc.)
- Maneja selects y checkboxes

**Ejemplo**:
```javascript
const filled = await orchestrator.fillFormIntelligently(modal.inputs, 'AutoTest');
// filled.success: Array de campos llenados
// filled.failed: Array de campos que fallaron
```

#### 5. `clickButtonByText(text)`
Clickea botón por texto exacto.

---

### Métodos Avanzados (Fase 2)

#### 6. `discoverTabs()`
Detecta tabs con 8 patrones diferentes.

**Retorna**:
```javascript
{
  found: true,
  count: 3,
  tabs: [
    { id: "tab1", label: "Datos Básicos", active: true },
    { id: "tab2", label: "Documentos", active: false },
    { id: "tab3", label: "Vencimientos", active: false }
  ]
}
```

#### 7. `discoverFileUploads()`
Detecta file uploads + DMS integration.

**Retorna**:
```javascript
{
  found: true,
  count: 2,
  uploads: [
    {
      name: "profilePhoto",
      accept: "image/*",
      multiple: false,
      dmsIntegration: true,
      label: "Foto de Perfil"
    }
  ]
}
```

#### 8. `discoverNestedModals()`
Detecta jerarquía de modales por z-index.

**Retorna**:
```javascript
{
  found: true,
  count: 2,
  nested: true,
  modals: [
    { selector: ".modal.show", zIndex: 1050, level: 1 },
    { selector: "[role='dialog']", zIndex: 1055, level: 2 }
  ]
}
```

#### 9. `discoverModuleStructure(moduleName)` ⭐ MASTER
Ejecuta discovery completo del módulo.

**Retorna**:
```javascript
{
  moduleName: "users",
  timestamp: "2025-12-11T17:00:00.000Z",
  structure: {
    buttons: { count: 5, items: [...] },
    modals: { found: false, count: 0 },
    tabs: { found: true, count: 3, tabs: [...] },
    fileUploads: { found: true, count: 2, uploads: [...] },
    integrations: {
      dms: true,
      vencimientos: false,
      calendar: false,
      map: false
    },
    totalInputs: 17
  }
}
```

#### 10. `crossReferenceWithBrain(discovery, moduleKey)` 🧠
Compara UI descubierta con Brain metadata.

**Retorna**:
```javascript
{
  moduleKey: "users",
  brainMetadata: {
    name: "Gestión de Usuarios",
    category: "core",
    hasEndpoints: false,
    hasTables: false
  },
  discoveredUI: {
    buttons: 5,
    modals: 0,
    tabs: 3,
    fileUploads: 2
  },
  gaps: {
    undocumented: [
      { type: "button", text: "Agregar Usuario", recommendation: "..." },
      { type: "tab", label: "Documentos", recommendation: "..." }
    ],
    recommendations: [
      { priority: "HIGH", action: "update_brain_metadata", description: "..." }
    ]
  }
}
```

---

## 📜 Scripts Disponibles

### 1. **demo-intelligent-testing.js** ✅ Demo Básico
Demuestra métodos básicos de discovery.

**Uso**:
```bash
cd backend
node scripts/demo-intelligent-testing.js
```

**Qué hace**:
- Descubre botones
- Encuentra botón "CREAR" con scoring
- Descubre modal con reintentos
- Llena formulario
- Clickea botón GUARDAR

**Duración**: ~30 segundos
**Módulo**: organizational-structure

---

### 2. **demo-with-scroll.js** ✅ Demo con Scroll
Demuestra scroll automático en formularios.

**Uso**:
```bash
cd backend
node scripts/demo-with-scroll.js
```

**Qué hace**:
- Click en botón CREAR
- Descubre modal
- Llena 9 campos con scroll automático
- Verifica registro en PostgreSQL

**Duración**: ~40 segundos
**Módulo**: organizational-structure
**Resultado esperado**: ✅ 9/9 campos llenados (100%)

---

### 3. **universal-discovery-demo.js** ✅ Discovery Universal
Demuestra sistema completo + cross-reference con Brain.

**Uso**:
```bash
cd backend
node scripts/universal-discovery-demo.js
```

**Qué hace**:
- Discovery completo del módulo
- Cross-reference con Brain
- Identifica gaps (elementos NO documentados)
- Genera recomendaciones
- Guarda reporte JSON

**Duración**: ~20 segundos
**Módulo**: users
**Output**: `logs/discovery-users-TIMESTAMP.json`

---

### 4. **universal-discovery-deep.js** 🔄 Deep Discovery
Descubre estructura interna de modales (tabs, uploads, nested modals).

**Uso**:
```bash
cd backend
node scripts/universal-discovery-deep.js
```

**Qué hace**:
- Discovery de vista principal
- Click en botón CREAR
- Descubre tabs DENTRO del modal
- Explora cada tab
- Detecta file uploads + DMS
- Detecta modales anidados

**Duración**: ~60 segundos
**Módulo**: users
**Status**: 🔄 En desarrollo (modal users usa patrón diferente)

---

### 5. **universal-discovery-quick-scan.js** ⚡ Quick Scan
Scan rápido de 10 módulos para validación.

**Uso**:
```bash
cd backend
node scripts/universal-discovery-quick-scan.js
```

**Qué hace**:
- Testea primeros 10 módulos activos
- Discovery básico por módulo
- Reporta botones + gaps
- Guardaprogreso

**Duración**: ~3-5 minutos
**Output**: `logs/discovery-quick-scan-TIMESTAMP.json`

**Recomendado**: Ejecutar esto ANTES del scan completo

---

### 6. **universal-discovery-all-modules.js** 🚀 Scan Completo
Scan completo de los 45 módulos del sistema.

**Uso**:
```bash
cd backend
node scripts/universal-discovery-all-modules.js
```

**Qué hace**:
- Login UNA vez
- Itera sobre 45 módulos activos
- Discovery completo + cross-reference por cada uno
- Guarda progreso cada 5 módulos
- Genera reporte consolidado final
- Identifica top 10 módulos con más gaps
- Detecta patrones de UI globales

**Duración**: ~20-30 minutos
**Outputs**:
- `logs/discovery-all-modules-partial-TIMESTAMP.json` (cada 5 módulos)
- `logs/discovery-all-modules-FINAL-TIMESTAMP.json` (reporte completo)
- `logs/discovery-all-modules-SUMMARY-TIMESTAMP.txt` (resumen legible)

**Módulos saltados**: kiosks-apk, support-base, mi-espacio

---

## 📚 Guía de Uso

### Caso de Uso 1: Validar que el Sistema Funciona

**Paso 1**: Ejecutar quick scan
```bash
cd backend
node scripts/universal-discovery-quick-scan.js
```

**Resultado esperado**:
```
Testeados: 10/10
Fallidos: 0
Total Botones: ~150-200
Total Gaps: ~20-40
```

Si esto funciona, el sistema está listo.

---

### Caso de Uso 2: Descubrir Gaps en un Módulo Específico

**Paso 1**: Editar `universal-discovery-demo.js` línea 43:
```javascript
const MODULE_KEY = 'tu-modulo'; // Cambiar aquí
```

**Paso 2**: Ejecutar
```bash
node scripts/universal-discovery-demo.js
```

**Paso 3**: Revisar reporte
```bash
cat logs/discovery-tu-modulo-*.json
```

**Paso 4**: Actualizar Brain metadata con gaps encontrados

---

### Caso de Uso 3: Análisis Completo del Sistema

**Paso 1**: Ejecutar scan completo (20-30 min)
```bash
node scripts/universal-discovery-all-modules.js
```

**Paso 2**: Revisar resumen
```bash
cat logs/discovery-all-modules-SUMMARY-*.txt
```

**Paso 3**: Identificar top módulos con gaps
```
TOP 10 MÓDULOS CON GAPS:
   1. users (15 gaps)
   2. attendance (12 gaps)
   3. medical (10 gaps)
   ...
```

**Paso 4**: Priorizar actualización de Brain metadata

---

## 📊 Resultados y Reportes

### Reporte JSON Individual

Ubicación: `logs/discovery-MODULENAME-TIMESTAMP.json`

```json
{
  "discovery": {
    "moduleName": "users",
    "structure": {
      "buttons": { "count": 5, "items": [...] },
      "modals": { "count": 0 },
      "tabs": { "count": 3, "tabs": [...] },
      "fileUploads": { "count": 2 }
    }
  },
  "comparison": {
    "gaps": {
      "undocumented": [
        { "type": "button", "text": "Agregar Usuario" },
        { "type": "tab", "label": "Documentos" }
      ],
      "recommendations": [...]
    }
  }
}
```

---

### Reporte Consolidado (Todos los Módulos)

Ubicación: `logs/discovery-all-modules-FINAL-TIMESTAMP.json`

```json
{
  "totalModules": 45,
  "tested": 42,
  "skipped": 3,
  "failed": 0,
  "consolidatedStats": {
    "totalButtons": 523,
    "totalModals": 38,
    "totalTabs": 67,
    "totalFileUploads": 12,
    "totalUndocumented": 156
  },
  "modules": [...]
}
```

---

### Resumen Legible (TXT)

Ubicación: `logs/discovery-all-modules-SUMMARY-TIMESTAMP.txt`

```
╔════════════════════════════════════════════════════════════╗
║  REPORTE DISCOVERY - TODOS LOS MÓDULOS                    ║
╚════════════════════════════════════════════════════════════╝

📊 ESTADÍSTICAS:
   Total módulos: 45
   Testeados: 42
   Fallidos: 0

🎨 ELEMENTOS DESCUBIERTOS:
   Botones: 523
   Tabs: 67
   File Uploads: 12

⚠️  GAPS:
   Elementos NO documentados: 156

🔝 TOP MÓDULOS CON GAPS:
   1. users (15 gaps)
   2. attendance (12 gaps)
```

---

## 🛠️ Troubleshooting

### Problema 1: Modal no se encuentra

**Síntoma**: `discoverModalStructure()` retorna `found: false`

**Causas**:
1. Modal usa patrón diferente a los 18 selectores
2. Se necesita más tiempo de espera
3. Modal no se abre (botón no funciona)

**Solución**:
```javascript
// Aumentar reintentos y delay
const modal = await orchestrator.discoverModalStructure(10, 2000);

// O agregar selector específico en Phase4TestOrchestrator.js línea 5742
const selectors = [
  '.modal.show',
  '.tu-selector-custom', // ← Agregar aquí
  // ...
];
```

---

### Problema 2: Campos no se llenan (fuera de viewport)

**Síntoma**: `page.fill: Timeout - element is not visible`

**Causa**: Campo está fuera del viewport en modal scrollable

**Solución**: Ya implementado en `fillFormIntelligently()` con scroll automático.

Si persiste, aumentar wait time:
```javascript
// En Phase4TestOrchestrator.js línea 5835
await this.wait(500); // Aumentar de 300ms a 500ms
```

---

### Problema 3: Cross-reference devuelve "No endpoints documentados"

**Síntoma**: `brainMetadata.hasEndpoints: false`

**Causa**: Brain metadata está desactualizado o incompleto

**Solución**: Actualizar `modules-registry.json` con:
```json
{
  "module_key": "users",
  "apiEndpoints": [
    { "method": "GET", "path": "/api/v1/users" },
    { "method": "POST", "path": "/api/v1/users" }
  ]
}
```

---

### Problema 4: Script se cuelga o timeout

**Síntoma**: Script no avanza después de X módulos

**Causas**:
1. Módulo específico tiene issue (loop infinito, modal que no cierra)
2. Browser crasheó

**Solución**:
1. Ver logs parciales: `logs/discovery-all-modules-partial-*.json`
2. Identificar último módulo procesado
3. Agregar módulo a SKIP_MODULES en el script
4. Reiniciar desde ese punto

---

## 🎓 Best Practices

### 1. Ejecutar Quick Scan Primero
Antes de correr los 45 módulos, valida con 10:
```bash
node scripts/universal-discovery-quick-scan.js
```

### 2. Revisar Logs Parciales
El script guarda cada 5 módulos. Si algo falla, no pierdes todo.

### 3. Headless para Production
En CI/CD, usar headless: true para más velocidad:
```javascript
const orchestrator = new Phase4TestOrchestrator({
  headless: true, // ← Sin UI
  slowMo: 0,
  timeout: 30000
}, database.sequelize);
```

### 4. Actualizar Brain Regularmente
Ejecutar discovery cada 2 semanas y actualizar Brain metadata.

### 5. Priorizar Módulos Core
Si tienes gaps, priorizar:
1. Core (users, attendance, dashboard)
2. RRHH (vacation, payroll)
3. Compliance (legal, art-management)

---

## 📈 Roadmap

### ✅ Fase 1: Discovery Básico (COMPLETADO)
- [x] Descubrir botones
- [x] Detectar modales
- [x] Llenar formularios con scroll
- [x] Cross-reference con Brain

### ✅ Fase 2: Universal Discovery (COMPLETADO)
- [x] Detectar tabs
- [x] Detectar file uploads
- [x] Detectar modales anidados
- [x] Script maestro para 45 módulos

### 🔄 Fase 3: Deep Discovery (EN PROGRESO)
- [x] Explorar tabs dentro de modales
- [ ] Detectar botones que abren modales anidados
- [ ] Testear file uploads (upload real)
- [ ] Validar vencimientos triggers

### ⏳ Fase 4: Auto-Testing (PENDIENTE)
- [ ] CRUD completo automatizado por módulo
- [ ] Validación de datos en PostgreSQL
- [ ] Screenshots de errores
- [ ] Integración con CI/CD

---

## 🤝 Contribuir

Para agregar nuevos métodos de discovery:

1. Agregar método en `Phase4TestOrchestrator.js`
2. Documentar en este archivo
3. Crear script de demo
4. Actualizar tests

---

## 📞 Soporte

Si encuentras un bug o tienes una pregunta:
1. Revisar [Troubleshooting](#troubleshooting)
2. Revisar logs en `backend/logs/phase4-*.json`
3. Revisar screenshot si fue generado
4. Crear issue con detalles

---

**Última actualización**: 2025-12-11
**Versión**: 2.0.0
**Autor**: Claude Code Integration Team
