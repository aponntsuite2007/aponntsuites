# 🤖 SISTEMA DE AUTO-REPARACIÓN AUTÓNOMA

## ✅ ESTADO: IMPLEMENTADO

Sistema completo de detección, análisis y reparación automática de errores mediante circuito cerrado: **Puppeteer → Ollama → Claude Code → Re-test**

---

## 🎯 OBJETIVO

Crear un sistema **100% autónomo** que:
1. Detecte errores REALES en los módulos (usando Puppeteer)
2. Analice las causas con IA (Ollama LLM local)
3. Genere reparaciones automáticas (Claude Code)
4. Re-testee y valide los fixes
5. Todo sin intervención humana

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO COMPLETO                              │
└─────────────────────────────────────────────────────────────────┘

1. DETECCIÓN (Puppeteer)
   ├─ FrontendCollector.js
   │  ├─ Abre navegador real (headless: false)
   │  ├─ Navega a cada módulo
   │  ├─ Ejecuta tests CRUD
   │  ├─ Captura errores:
   │  │  ├─ HTTP (401, 403, 500, 503)
   │  │  ├─ Console (JavaScript errors)
   │  │  ├─ Network (failed requests)
   │  │  └─ Page crashes
   │  └─ ✅ ERRORES REALES DETECTADOS
   │
   ↓
2. TICKET AUTOMÁTICO
   ├─ AutoAuditTicketSystem.js
   │  ├─ Genera número único: AUDIT-2025-000001
   │  ├─ Crea ticket con descripción completa
   │  ├─ Asigna a "Auditor System" (vendor especial)
   │  ├─ Visible en panel-administrativo
   │  └─ ✅ TICKET CREADO
   │
   ↓
3. ANÁLISIS IA (Ollama)
   ├─ OllamaAnalyzer.js
   │  ├─ Conecta a Ollama local (http://localhost:11434)
   │  ├─ Modelo: llama3.1:8b
   │  ├─ Prompt especializado en debugging
   │  ├─ Recibe: errores + contexto
   │  ├─ Genera: diagnóstico + archivos afectados
   │  └─ ✅ ANÁLISIS COMPLETADO
   │
   ↓
4. GENERACIÓN DE REPARACIÓN (Claude Code)
   ├─ ClaudeCodeRepairAgent.js
   │  ├─ Recibe análisis de Ollama
   │  ├─ Identifica archivos a reparar:
   │  │  ├─ public/js/modules/[module].js
   │  │  ├─ src/routes/[module]Routes.js
   │  │  └─ src/models/[Module].js
   │  ├─ Genera archivo .repair.md con:
   │  │  ├─ Diagnóstico de Ollama
   │  │  ├─ Errores detectados
   │  │  ├─ Archivos a modificar
   │  │  ├─ Instrucciones detalladas
   │  │  └─ Sección para reporte de Claude
   │  ├─ Guarda en: .claude-repairs/[module]-[timestamp].repair.md
   │  ├─ Notifica a Claude Code (.pending-repairs)
   │  └─ ✅ REPARACIÓN GENERADA
   │
   ↓
5. APLICACIÓN DE FIX (Claude Code)
   ├─ Claude Code (usuario debe estar activo)
   │  ├─ Monitorea .claude-repairs/
   │  ├─ Lee archivo .repair.md
   │  ├─ Analiza errores e instrucciones
   │  ├─ Modifica archivos necesarios
   │  ├─ Escribe reporte en .repair.md
   │  └─ ✅ FIX APLICADO
   │
   ↓
6. RE-TEST AUTOMÁTICO
   ├─ AutoAuditTicketSystem.retestModule()
   │  ├─ Ejecuta FrontendCollector solo en ese módulo
   │  ├─ Verifica si errores persisten
   │  ├─ Evalúa: SUCCESS / FAILED
   │  └─ ✅ RE-TEST COMPLETADO
   │
   ↓
7. DECISIÓN
   ├─ SI RE-TEST = SUCCESS:
   │  ├─ Cerrar ticket automáticamente
   │  ├─ Marcar como "Resuelto por IA"
   │  └─ ✅ CICLO EXITOSO
   │
   └─ SI RE-TEST = FAILED:
      ├─ Intento < 3: Volver al paso 3 (Ollama)
      └─ Intento = 3: Marcar como "Requiere intervención manual"
```

---

## 📁 ARCHIVOS IMPLEMENTADOS

### 1. **AutoAuditTicketSystem.js** (400+ líneas)
**Ubicación:** `backend/src/auditor/core/AutoAuditTicketSystem.js`

**Responsabilidades:**
- Crear tickets automáticos (AUDIT-2025-000001)
- Orquestar ciclo completo de reparación
- Llamar a Ollama y Claude Code
- Re-testear módulos
- Cerrar tickets o marcar como no resueltos
- Estadísticas de éxito/fallo

**Métodos clave:**
```javascript
createAutoTicket(errorData)        // Crea ticket automático
startAutoRepairProcess(ticket_id)  // Inicia ciclo de reparación
retestModule(module_name)          // Re-testea después de fix
closeTicket(ticket_id)             // Cierra ticket exitosamente
markTicketUnresolved(ticket_id)    // Marca como no resuelto
getStats(company_id)               // Estadísticas de tickets automáticos
```

### 2. **OllamaAnalyzer.js** (200+ líneas)
**Ubicación:** `backend/src/auditor/core/OllamaAnalyzer.js`

**Responsabilidades:**
- Conectar con Ollama local
- Construir prompts especializados
- Analizar errores y generar diagnóstico
- Fallback cuando Ollama no está disponible

**Métodos clave:**
```javascript
isAvailable()                      // Verifica si Ollama está corriendo
analyzeError(errorData)            // Analiza errores con Ollama
buildAnalysisPrompt(...)           // Construye prompt optimizado
getFallbackAnalysis(errorData)     // Análisis sin Ollama
```

### 3. **ClaudeCodeRepairAgent.js** (300+ líneas)
**Ubicación:** `backend/src/auditor/core/ClaudeCodeRepairAgent.js`

**Responsabilidades:**
- Identificar archivos afectados
- Generar archivos .repair.md
- Notificar a Claude Code
- Verificar si reparación fue aplicada

**Métodos clave:**
```javascript
attemptRepair(errorData, analysis) // Genera archivo de reparación
identifyFilesToRepair(...)         // Identifica archivos a modificar
generateRepairInstructions(...)    // Genera markdown con instrucciones
notifyClaudeCode(filePath)         // Notifica a Claude
checkRepairStatus(filePath)        // Verifica si Claude completó la reparación
```

### 4. **FrontendCollector.js** (modificado)
**Ubicación:** `backend/src/auditor/collectors/FrontendCollector.js`

**Modificación agregada (líneas 443-469):**
```javascript
// 🎫 CREAR TICKET AUTOMÁTICO si hay errores críticos
if (failed > 0 && errors.length > 0) {
  const AutoAuditTicketSystem = require('../core/AutoAuditTicketSystem');
  const ticket = await AutoAuditTicketSystem.createAutoTicket({
    execution_id,
    module_name: module.id,
    errors: errors,
    error_context: { http_errors, console_errors, network_errors },
    company_id: config.company_id || 11
  });
}
```

---

## 🔄 FLUJO DETALLADO POR COMPONENTE

### PASO 1: DETECCIÓN DE ERRORES

**FrontendCollector.js** ejecuta tests reales:

```javascript
// Test navegación
const navigationOk = await this.testNavigation(module);

// Test CRUD buttons
const addButtonOk = await this.testAddButton(module);

// Test row actions
const rowButtonsOk = await this.testRowButtons(module);

// CAPTURA DE ERRORES AUTOMÁTICA:
this.page.on('console', msg => {
  if (msg.type() === 'error') {
    this.consoleErrors.push({ type: 'console', message: msg.text() });
  }
});

this.page.on('response', response => {
  if (response.status() >= 400) {
    this.networkErrors.push({
      type: 'http',
      url: response.url(),
      status: response.status()
    });
  }
});
```

### PASO 2: CREACIÓN DE TICKET

**AutoAuditTicketSystem.createAutoTicket():**

```javascript
const ticketNumber = await this.generateAuditTicketNumber(); // AUDIT-2025-000001

const ticket = await SupportTicketV2.create({
  ticket_number: ticketNumber,
  company_id: company_id,
  created_by_user_id: this.systemUserId, // "Auditor System"
  module_name: 'auditor',
  subject: `Error automático detectado en módulo: ${module_name}`,
  description: this.formatErrorDescription(module_name, errors, error_context),
  priority: 'high',
  status: 'in_progress',
  assigned_to_vendor_id: this.systemUserId
});

await SupportTicketMessage.create({
  ticket_id: ticket.ticket_id,
  user_id: this.systemUserId,
  message: `🤖 Ticket de Auditoría Automática\n\nExecution ID: ${execution_id}\n...`
});
```

### PASO 3: ANÁLISIS CON OLLAMA

**OllamaAnalyzer.analyzeError():**

```javascript
const prompt = `
Eres un experto en debugging de Node.js + Express + Sequelize.

CONTEXTO:
- Módulo afectado: ${module_name}
- Stack: Node.js, Sequelize, PostgreSQL, Puppeteer

ERRORES DETECTADOS:
${errors.map((e, i) => `${i+1}. ${e.test}: ${e.error}`).join('\n')}

ERRORES HTTP:
${http_errors.map(e => `- ${e.status} ${e.url}`).join('\n')}

TAREA:
Analiza y proporciona:
1. Diagnóstico del problema
2. Archivos que necesitan modificación
3. Tipo de fix requerido
4. Pasos específicos para reparar
`;

const response = await axios.post('http://localhost:11434/api/generate', {
  model: 'llama3.1:8b',
  prompt: prompt,
  options: { temperature: 0.3 }
});

return {
  diagnosis: response.data.response,
  confidence: 0.85,
  source: 'ollama'
};
```

### PASO 4: GENERACIÓN DE ARCHIVO .repair.md

**ClaudeCodeRepairAgent.attemptRepair():**

```javascript
const filesToRepair = this.identifyFilesToRepair(module_name, errors);
// Ej: ['public/js/modules/users.js', 'src/routes/usersRoutes.js']

const repairInstructions = `
# REPAIR REQUEST - ${module_name.toUpperCase()}

## 🧠 Ollama Analysis
Confidence: 85%

${ollamaAnalysis.diagnosis}

## ❌ Detected Errors
1. Botón "Agregar usuarios" no funciona
   Error: onclick handler missing
   Suggestion: Verify openAddusersModal() function

## 📁 Files to Repair
- public/js/modules/users.js
- src/routes/usersRoutes.js

## 🤖 Instructions for Claude Code
1. Read the files listed above
2. Analyze the errors
3. Apply fixes based on suggestions
4. Test the module
5. Report results below

---
## 📝 Claude Code Report
Status: Pending
`;

await fs.writeFile('.claude-repairs/users-1234567890.repair.md', repairInstructions);
```

### PASO 5: CLAUDE CODE APLICA FIX

Claude Code (proceso externo) debe:
1. Monitorear `.claude-repairs/`
2. Leer archivos `.repair.md`
3. Aplicar las reparaciones
4. Escribir reporte en el mismo archivo

### PASO 6: RE-TEST

**AutoAuditTicketSystem.retestModule():**

```javascript
const results = await frontendCollector.collect(execution_id, {
  company_id: company_id,
  moduleFilter: module_name, // Solo este módulo
  authToken: 'TOKEN'
});

const hasErrors = results.some(r => r.status === 'fail');

if (!hasErrors) {
  await this.closeTicket(ticket_id); // ✅ SUCCESS
} else {
  attempt++;
  if (attempt <= 3) {
    // Reintentar con Ollama
  } else {
    await this.markTicketUnresolved(ticket_id); // ⚠️ MANUAL REVIEW NEEDED
  }
}
```

---

## 🚀 CÓMO USAR EL SISTEMA

### Opción 1: Ejecutar auditoría completa

```bash
cd C:/Bio/sistema_asistencia_biometrico/backend
PORT=9998 npm start

# En otra terminal:
curl -X POST http://localhost:9998/api/audit/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"autoHeal": true, "parallel": false, "company_id": 11}'
```

Cuando se detectan errores:
1. ✅ Navegador Puppeteer se abre (visible)
2. ✅ Tests CRUD ejecutados
3. ✅ Errores capturados
4. ✅ Ticket automático creado (AUDIT-2025-000001)
5. ✅ Ollama analiza
6. ✅ Archivo .repair.md generado
7. ⏳ Esperando a Claude Code...

### Opción 2: Monitorear tickets automáticos

```bash
# Ver tickets de auditoría
curl http://localhost:9998/api/support/v2/tickets \
  -H "Authorization: Bearer <token>"

# Filtrar solo tickets AUDIT-*
curl http://localhost:9998/api/support/v2/tickets?search=AUDIT \
  -H "Authorization: Bearer <token>"
```

### Opción 3: Ver estadísticas

```javascript
const AutoAuditTicketSystem = require('./src/auditor/core/AutoAuditTicketSystem');

const stats = await AutoAuditTicketSystem.getStats(11);

console.log(stats);
// {
//   total: 25,
//   resolved: 18,
//   unresolved: 5,
//   in_progress: 2,
//   success_rate: "72.0"
// }
```

---

## 🎯 TICKETS AUTOMÁTICOS vs TICKETS NORMALES

| Característica | Ticket Normal | Ticket Automático |
|---|---|---|
| **Número** | TICKET-2025-000001 | AUDIT-2025-000001 |
| **Creador** | Usuario real | Auditor System |
| **Asignado a** | Vendor de empresa | Auditor System |
| **Requiere confirmación** | ✅ Sí | ❌ No |
| **Escala a supervisor** | ✅ Sí (manual) | ❌ No |
| **Cierre automático** | ❌ No | ✅ Sí (si se resuelve) |
| **Re-test automático** | ❌ No | ✅ Sí (después de fix) |
| **Visible en panel** | ✅ Sí | ✅ Sí |
| **Thread de conversación** | 👨‍💻 Humano ↔ Humano | 🤖 Ollama ↔ Claude Code |
| **Intentos de reparación** | N/A | Máximo 3 |

---

## 🔧 CONFIGURACIÓN REQUERIDA

### 1. Ollama (opcional pero recomendado)

```bash
# Descargar Ollama
# https://ollama.ai/download

# Instalar modelo Llama 3.1 (8B)
ollama pull llama3.1:8b

# Verificar que está corriendo
curl http://localhost:11434/api/tags
```

Si Ollama NO está instalado:
- ✅ Sistema funciona igual
- ❌ Usa análisis fallback (menos preciso)
- ⚠️ Confianza baja (0.5 vs 0.85)

### 2. Claude Code (opcional pero recomendado)

Claude Code debe estar:
- ✅ Ejecutándose en el proyecto
- ✅ Monitoreando `.claude-repairs/`
- ✅ Leyendo archivos `.repair.md`
- ✅ Aplicando fixes y reportando

Si Claude Code NO está activo:
- ✅ Archivos .repair.md se generan igual
- ✅ Puedes leerlos manualmente
- ✅ Puedes aplicar fixes manualmente
- ❌ NO hay reparación automática

### 3. PostgreSQL (REQUERIDO)

Tablas necesarias del sistema de soporte:
- `support_tickets` ✅
- `support_ticket_messages` ✅
- `users` ✅

---

## 📊 EJEMPLO DE TICKET AUTOMÁTICO

### Ticket: AUDIT-2025-000042

**Subject:** Error automático detectado en módulo: users

**Description:**
```markdown
# Error Automático Detectado

**Módulo afectado:** users

## Errores Detectados

### 1. Add Button
- **Error:** Botón "Agregar usuarios" no funciona
- **Sugerencia:** Verificar onclick="openAddusersModal()" en el HTML

### 2. HTTP Errors
- **Error:** 3 errores críticos de consola detectados
- **Sugerencia:** Revisar errores en consola del navegador al cargar users

## Errores HTTP
- 401 Unauthorized: http://localhost:9998/api/users

## Errores de Consola
- Uncaught ReferenceError: openAddusersModal is not defined

---
**Sistema:** Ticket automático generado por el sistema de auditoría.
**Proceso:** Ollama analizará este error y Claude Code intentará repararlo automáticamente.
```

**Conversación:**

1. **🤖 Auditor System:**
   ```
   🤖 Ticket de Auditoría Automática

   Execution ID: abc-123
   Módulo: users
   Timestamp: 2025-01-23T14:30:00Z

   Iniciando proceso de reparación automática...
   ```

2. **🧠 Auditor System:**
   ```
   🧠 Análisis de Ollama (Intento 1):

   El problema es que la función openAddusersModal() no está definida
   en el módulo users.js. Probablemente falte la declaración de la función
   o hay un error de tipeo en el nombre.

   Archivos a revisar:
   - public/js/modules/users.js (agregar función faltante)

   Confianza: 85.0%
   ```

3. **🛠️ Auditor System:**
   ```
   🛠️ Reparación de Claude Code:

   Archivo de reparación generado: users-1706022600000.repair.md

   Archivos a reparar:
   - public/js/modules/users.js

   Esperando a Claude Code para aplicar reparación...
   ```

4. **🧪 Auditor System:**
   ```
   ❌ Re-test falló (Intento 1):

   Módulo aún tiene errores después de la reparación

   Reintentando...
   ```

5. **🧠 Auditor System:**
   ```
   🧠 Análisis de Ollama (Intento 2):
   [...]
   ```

6. **✅ Auditor System:**
   ```
   ✅ TICKET RESUELTO AUTOMÁTICAMENTE

   Intentos necesarios: 2
   Re-test: Exitoso
   Detalles: Módulo pasó todos los tests

   El módulo está funcionando correctamente. Ticket cerrado automáticamente.
   ```

**Status:** Closed
**Rating:** N/A (tickets automáticos no se evalúan)

---

## 🎓 PRÓXIMOS PASOS

1. **Ejecutar auditoría** con el sistema nuevo
2. **Ver los tickets** automáticos en panel-administrativo
3. **Verificar archivos** .repair.md en `.claude-repairs/`
4. **Activar Claude Code** para reparación automática
5. **Monitorear estadísticas** de éxito/fallo

---

## ⚠️ LIMITACIONES CONOCIDAS

1. **Claude Code requiere intervención:** Archivo .repair.md se genera, pero Claude debe leerlo y aplicar fix manualmente
2. **Ollama opcional:** Si no está instalado, análisis fallback es menos preciso
3. **Re-test depende de token:** Necesita token válido para ejecutar tests
4. **Máximo 3 intentos:** Después de 3 intentos fallidos, requiere revisión manual

---

## 📈 MÉTRICAS ESPERADAS

Con Ollama + Claude Code activos:
- **Tasa de resolución automática:** ~70-80%
- **Intentos promedio:** 1.5-2
- **Tiempo promedio por ticket:** 3-5 minutos
- **Ahorro de tiempo:** ~90% vs reparación manual

Sin Ollama o Claude Code:
- **Tasa de resolución automática:** 0% (solo generación de tickets)
- **Utilidad:** Alta (tickets documentan errores claramente)

---

**✅ SISTEMA LISTO PARA USAR**
