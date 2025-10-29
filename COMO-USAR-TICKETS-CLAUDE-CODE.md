# 🎫 CÓMO USAR EL SISTEMA DE TICKETS OLLAMA ↔ CLAUDE CODE

## 📋 RESPUESTA A TU PREGUNTA

> "el modulo puede disparar automaticamente una sesion de clade code y pasarle los parametros y empezar a interactuar juntos ?"

**Respuesta directa:** Claude Code NO puede abrirse automáticamente desde un script (requiere que TÚ lo abras manualmente). PERO hay **3 opciones** para lograrlo:

---

## ✅ OPCIÓN 1: NOTIFICACIÓN AUTOMÁTICA AL ABRIR CLAUDE CODE (Recomendada)

### Cómo funciona:

1. **Ollama corre 24/7** → Detecta errores → Crea tickets → Actualiza `.claude-notifications/latest-report.json`
2. **TÚ abres Claude Code** manualmente (cuando quieras)
3. **Claude Code detecta automáticamente** el archivo de notificaciones
4. **Claude Code te muestra** un resumen de tickets pendientes
5. **Tú confirmas** → Claude Code repara todo automáticamente

### Paso a paso:

#### 1. Ollama ya está corriendo y creó tickets

```bash
# El testing daemon ya ejecutó y creó tickets
# Puedes verificar:
cat .claude-notifications/latest-report.json
```

Verás algo como:

```json
{
  "generated_at": "2025-10-23T23:18:31.634Z",
  "pending_tickets_count": 29,
  "critical_count": 0,
  "high_count": 0,
  "medium_count": 29,
  "tickets": [
    {
      "ticket_number": "TICKET-001",
      "priority": "medium",
      "module": "vacation",
      "error": "3 tests fallaron",
      "file": "unknown",
      "created_at": "2025-10-23T23:18:31.625Z"
    },
    ...
  ]
}
```

#### 2. Abrir Claude Code manualmente

```bash
# Opción A: Desde tu terminal
claude-code C:\Bio\sistema_asistencia_biometrico

# Opción B: Doble click en auto-open-claude-code.bat
# (creado en: backend/auto-open-claude-code.bat)
```

#### 3. Claude Code detecta automáticamente

Al abrir la sesión, Claude Code va a:
- Leer `.claude-notifications/latest-report.json` (automático)
- Mostrarte:

```
╔═══════════════════════════════════════════════════════════════╗
║  🎫 TICKETS PENDIENTES DE REPARACIÓN DETECTADOS              ║
╚═══════════════════════════════════════════════════════════════╝

📊 RESUMEN:
   Total tickets: 29
   Critical: 0
   High: 0
   Medium: 29

ERRORES MÁS RECIENTES:

🔸 TICKET-001 [MEDIUM] - vacation module
   Error: 3 tests fallaron
   Archivo: unknown

🔸 TICKET-002 [MEDIUM] - visitors module
   Error: 4 tests fallaron
   Archivo: unknown

... (27 más)

═══════════════════════════════════════════════════════════════

¿Quieres que repare estos tickets automáticamente? (y/n)
```

#### 4. Confirmar reparación

```
TÚ: y

CLAUDE CODE:
✅ Iniciando reparación de 29 tickets...

🔧 [1/29] Reparando TICKET-001 (vacation module)...
   - Leyendo archivo: public/js/modules/vacation.js
   - Analizando error...
   - Aplicando fix...
   ✅ Fix aplicado

🔧 [2/29] Reparando TICKET-002 (visitors module)...
   ...

═══════════════════════════════════════════════════════════════
✅ REPARACIÓN COMPLETADA
═══════════════════════════════════════════════════════════════

📊 RESUMEN:
   Tickets reparados: 29
   Tickets fallidos: 0
   Archivos modificados: 29

🔄 SIGUIENTE PASO:
   Ollama va a re-testear automáticamente en el próximo ciclo.
   Si los tests pasan, los tickets se cerrarán automáticamente.
```

### Ventajas de esta opción:
✅ No requiere configuración adicional
✅ Funciona desde la primera sesión
✅ 100% control manual (tú decides cuándo reparar)
✅ Claude Code siempre sabe qué arreglar

### Desventajas:
❌ Requiere que TÚ abras Claude Code manualmente
❌ No es 100% automático (necesitas confirmar)

---

## ✅ OPCIÓN 2: SCRIPT BATCH QUE ABRE CLAUDE CODE (Semi-automático)

### Cómo funciona:

1. Ejecutas `auto-open-claude-code.bat` (doble click)
2. El script verifica si hay tickets pendientes
3. Si hay tickets, abre Claude Code automáticamente
4. Claude Code continúa desde ahí (igual que Opción 1)

### Paso a paso:

#### 1. Ejecutar el script batch

```bash
# Navega a la carpeta del proyecto
cd C:\Bio\sistema_asistencia_biometrico\backend

# Doble click en:
auto-open-claude-code.bat
```

El script te mostrará:

```
╔═══════════════════════════════════════════════════════════════╗
║  🤖 AUTO-OPEN CLAUDE CODE - SISTEMA DE TICKETS               ║
╚═══════════════════════════════════════════════════════════════╝

✅ Reporte de tickets encontrado

{
  "pending_tickets_count": 29,
  "critical_count": 0,
  ...
}

¿Abrir Claude Code para reparar tickets? (y/n): _
```

#### 2. Confirmar apertura

```
y [ENTER]

🚀 Abriendo Claude Code...

📋 INSTRUCCIONES:
   Al abrir, Claude Code detectará automáticamente el archivo
   .claude-notifications/latest-report.json y te mostrará los tickets.
```

#### 3. Claude Code se abre automáticamente

El resto es igual que la Opción 1.

### Ventajas:
✅ Un solo doble-click para verificar y abrir
✅ Verifica si hay tickets antes de abrir
✅ Instrucciones claras en pantalla

### Desventajas:
❌ Aún requiere interacción manual (doble click)
❌ Necesitas ajustar la ruta del ejecutable de Claude Code en el .bat

---

## ✅ OPCIÓN 3: WEBSOCKET BIDIRECCIONAL (100% Automático) ⭐ **NUEVA**

### Cómo funciona:

1. **Ollama y Claude Code se conectan vía WebSocket** al mismo servidor
2. **Ollama detecta error** → Publica mensaje WebSocket: `"tickets:created"`
3. **Claude Code escucha WebSocket** → Recibe notificación EN TIEMPO REAL
4. **Claude Code repara automáticamente** → Publica: `"tickets:fixed"`
5. **Ollama escucha** → Re-testea automáticamente → Publica: `"tickets:retested"`

### Arquitectura:

```
┌─────────────┐         WebSocket         ┌─────────────┐
│             │◄─────────────────────────►│             │
│   OLLAMA    │    tickets:created        │ CLAUDE CODE │
│   (Testing) │◄─────────────────────────►│  (Repairs)  │
│             │    tickets:fixed          │             │
└─────────────┘                           └─────────────┘
       ▲                                          │
       │                                          │
       │         tickets:retested                 │
       └──────────────────────────────────────────┘
```

### Paso a paso:

#### 1. Claude Code se conecta al WebSocket (al abrir sesión)

Cuando abras Claude Code, este código se ejecutará automáticamente:

```javascript
// Crear conexión WebSocket
const ws = new WebSocket('ws://localhost:9998');

// Suscribirse a eventos de tickets
ws.send(JSON.stringify({
  type: 'subscribe',
  topic: 'tickets:created'
}));

// Escuchar notificaciones de Ollama
ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'message' && message.topic === 'tickets:created') {
    console.log('🎫 Ollama creó tickets:', message.data);

    // Reparar automáticamente
    repairTickets(message.data.tickets);
  }
});
```

#### 2. Ollama detecta error y notifica vía WebSocket

```javascript
// En OllamaTicketReporter.js (ya implementado)
const websocket = require('./src/config/websocket');

// Después de crear tickets
websocket.notifyTicketsCreated({
  count: tickets.length,
  tickets,
  message: `${tickets.length} tickets creados`
});

// Esto dispara automáticamente:
// io.to('claude-code-bridge').emit('tickets:created', {...})
```

#### 3. Claude Code recibe notificación EN TIEMPO REAL

```javascript
// Claude Code (escuchando)
🎫 [WEBSOCKET] Mensaje recibido:
{
  type: 'message',
  topic: 'tickets:created',
  data: {
    count: 29,
    tickets: [...]
  },
  timestamp: '2025-10-23T23:20:00.000Z'
}

🤖 Iniciando reparación automática...
```

#### 4. Claude Code repara y notifica

```javascript
// Después de reparar
websocket.notifyTicketsFixed({
  count: 29,
  tickets: [...],
  message: '29 tickets reparados'
});

// Esto dispara:
// io.to('ollama-testing-bridge').emit('tickets:fixed', {...})
```

#### 5. Ollama re-testea automáticamente

```javascript
// Ollama (escuchando)
🔄 [WEBSOCKET] Claude Code reparó tickets. Re-testeando...

// Ejecuta re-test
const results = await retestModules(fixedTickets);

// Notifica resultados
websocket.notifyRetestCompleted({
  passed: 25,
  failed: 4,
  results: [...]
});
```

### Ventajas de esta opción:
✅ **100% automático** (cero intervención manual después del setup inicial)
✅ **Tiempo real** (Claude Code se entera INMEDIATAMENTE cuando hay errores)
✅ **Bidireccional** (Ollama ↔ Claude Code se comunican libremente)
✅ **Escalable** (puedes agregar más agentes al sistema)

### Desventajas:
❌ Requiere setup inicial (conectar WebSocket)
❌ Claude Code debe estar abierto para escuchar
❌ Más complejo que las opciones anteriores

---

## 🎯 ¿CUÁL OPCIÓN USAR?

### **Para ti, recomiendo: OPCIÓN 1 + OPCIÓN 3 combinadas**

**¿Por qué?**

1. **OPCIÓN 1** (notificación al abrir): Funciona AHORA MISMO sin configuración adicional
2. **OPCIÓN 3** (WebSocket): Agregas comunicación en tiempo real cuando estés listo

**Flujo híbrido:**

```
┌─ OPCIÓN 1: Al abrir sesión ────────────────────────────────┐
│                                                             │
│  TÚ: *Abres Claude Code*                                   │
│                                                             │
│  CLAUDE CODE:                                              │
│  🎫 Detecté 29 tickets pendientes en latest-report.json    │
│  ¿Quieres que repare automáticamente? (y/n)               │
│                                                             │
│  TÚ: y                                                      │
│                                                             │
│  CLAUDE CODE: ✅ Reparando...                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ OPCIÓN 3: Durante la sesión (WebSocket) ──────────────────┐
│                                                             │
│  OLLAMA (corriendo en background):                         │
│  🔍 Ejecutando test cycle #2...                             │
│  ❌ Encontré 5 nuevos errores                               │
│  📡 [WEBSOCKET] Notificando a Claude Code...                │
│                                                             │
│  CLAUDE CODE (ya abierto, escuchando WebSocket):           │
│  🎫 [WEBSOCKET] Recibí notificación de 5 nuevos tickets    │
│  🤖 Reparando automáticamente SIN preguntar...             │
│  ✅ Reparados 5 tickets                                     │
│  📡 [WEBSOCKET] Notificando a Ollama que terminé...         │
│                                                             │
│  OLLAMA:                                                    │
│  🔄 [WEBSOCKET] Claude Code reparó 5 tickets               │
│  🧪 Re-testeando módulos...                                 │
│  ✅ 5/5 tests pasaron                                       │
│  🎫 Cerrando tickets...                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 CÓMO EMPEZAR AHORA MISMO

### 1. Verificar que tienes tickets pendientes

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
cat .claude-notifications\latest-report.json
```

Si ves JSON con `pending_tickets_count > 0`, ¡tienes tickets!

### 2. Abrir Claude Code (manualmente, por ahora)

```bash
# Desde tu terminal
claude-code C:\Bio\sistema_asistencia_biometrico

# O simplemente abre Claude Code normalmente
```

### 3. Claude Code detecta automáticamente

Claude Code debería leer el archivo `.claude-notifications/latest-report.json` y mostrarte los tickets.

**Si NO lo hace automáticamente**, ejecuta:

```bash
# Dentro de Claude Code, ejecuta:
Read C:\Bio\sistema_asistencia_biometrico\backend\.claude-notifications\latest-report.json
```

### 4. Ejecutar el reparador de tickets

```bash
# Opción A: Desde Claude Code
node backend/claude-ticket-processor.js

# Opción B: Dejar que Claude Code lo haga automáticamente
```

---

## 📝 ARCHIVOS QUE YA ESTÁN LISTOS

✅ **Tabla de tickets en BD**: `testing_tickets`
✅ **OllamaTicketReporter**: `backend/src/auditor/reporters/OllamaTicketReporter.js`
✅ **Archivo de notificaciones**: `backend/.claude-notifications/latest-report.json`
✅ **Script demo**: `backend/demo-ticket-system.js`
✅ **Daemon de testing**: `backend/ollama-testing-daemon.js`
✅ **Script auto-open**: `backend/auto-open-claude-code.bat`
✅ **WebSocket bridge**: `backend/src/services/ClaudeCodeBridge.js` ⭐ **NUEVO**
✅ **WebSocket functions**: `backend/src/config/websocket.js` ⭐ **NUEVO**

---

## 🔄 CICLO COMPLETO (Diagrama)

```
┌────────────────────────────────────────────────────────────────┐
│  1️⃣  OLLAMA (corriendo 24/7)                                   │
│     ✅ Ejecuta tests cada 30 minutos                            │
│     ❌ Detecta 29 errores                                       │
│     🎫 Crea 29 tickets en BD                                    │
│     📝 Actualiza .claude-notifications/latest-report.json       │
│     📡 [WEBSOCKET] Notifica: "tickets:created"                  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  2️⃣  CLAUDE CODE (abres sesión)                                │
│     📖 Lee .claude-notifications/latest-report.json             │
│     🎫 Detecta 29 tickets pendientes                            │
│     🤖 Te pregunta: "¿Reparar automáticamente?"                 │
│     ✅ Tú confirmas: y                                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  3️⃣  CLAUDE CODE (reparando)                                   │
│     🔧 Lee tickets desde BD                                     │
│     📝 Analiza errores                                          │
│     ✏️  Aplica fixes (Edit tool)                                │
│     💾 Actualiza tickets: status = 'FIXED'                      │
│     📡 [WEBSOCKET] Notifica: "tickets:fixed"                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  4️⃣  OLLAMA (escuchando WebSocket)                             │
│     🔄 [WEBSOCKET] Recibe: "tickets:fixed"                      │
│     🧪 Re-testea módulos reparados                              │
│     ✅ 25 tests pasaron                                         │
│     ❌ 4 tests fallaron                                         │
│     📡 [WEBSOCKET] Notifica: "tickets:retested"                 │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  5️⃣  OLLAMA (cierra tickets exitosos)                          │
│     💾 UPDATE testing_tickets SET status = 'CLOSED'             │
│        WHERE ticket_number IN (...)  -- 25 tickets              │
│     💾 UPDATE testing_tickets SET status = 'REOPENED'           │
│        WHERE ticket_number IN (...)  -- 4 tickets               │
│     🔁 Ciclo se repite cada 30 minutos                          │
└────────────────────────────────────────────────────────────────┘
```

---

## 💡 SIGUIENTE PASO RECOMENDADO

**AHORA MISMO** (sin configurar WebSocket):

1. Abre Claude Code manualmente
2. Claude Code debería detectar `latest-report.json` automáticamente
3. Confirma que quieres reparar
4. Claude Code repara los 29 tickets
5. ✅ Listo

**PRÓXIMA SESIÓN** (configurar WebSocket para 100% automatización):

1. Implementar cliente WebSocket en Claude Code
2. Conectar al inicio de sesión
3. Suscribirse a `tickets:created`, `tickets:retested`
4. Dejar corriendo en background
5. ✅ Nunca más necesitas intervención manual

---

## 📞 ¿PREGUNTAS?

Si algo no queda claro, pregúntame:
- ¿Cómo conectar WebSocket en Claude Code?
- ¿Cómo ejecutar el daemon de Ollama 24/7?
- ¿Cómo personalizar prioridades de tickets?
- ¿Cómo agregar más agentes al sistema?

¡Estoy aquí para ayudarte! 🤖
