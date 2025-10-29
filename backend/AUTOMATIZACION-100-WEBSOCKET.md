# 🚀 AUTOMATIZACIÓN 100% - SISTEMA WEBSOCKET OLLAMA ↔ CLAUDE CODE

## 🎯 RESUMEN EJECUTIVO

Sistema **completamente automatizado** que permite que Ollama (testing 24/7) y Claude Code (reparación automática) trabajen juntos **sin intervención manual**.

### Flujo 100% automático:

```
OLLAMA (24/7)                    CLAUDE CODE (24/7)
     │                                  │
     │  1. Ejecuta tests                │
     │  2. Detecta 10 errores           │
     │  3. Crea 10 tickets              │
     │  4. Notifica vía WebSocket       │
     ├──────────────────────────────────>│
     │                                  │  5. Recibe notificación
     │                                  │  6. Lee tickets desde BD
     │                                  │  7. Repara automáticamente
     │                                  │  8. Marca tickets como FIXED
     │                                  │  9. Notifica vía WebSocket
     │<──────────────────────────────────┤
     │ 10. Recibe notificación          │
     │ 11. Re-testea módulos            │
     │ 12. Cierra tickets exitosos      │
     │ 13. Reabre los que fallaron      │
     │ 14. Ciclo se repite cada 30min   │
     │                                  │
     ▼                                  ▼
```

---

## 📦 COMPONENTES DEL SISTEMA

### 1. OllamaTicketReporter (con WebSocket)
**Archivo**: `src/auditor/reporters/OllamaTicketReporter.js`

**Qué hace**:
- Analiza resultados de tests de Ollama
- Crea tickets en BD
- **Notifica vía WebSocket** a Claude Code
- Actualiza archivo `.claude-notifications/latest-report.json` (backup)

**Código clave**:
```javascript
// Al crear tickets
if (this.websocket && ticketsCreated.length > 0) {
  this.websocket.notifyTicketsCreated({
    count: ticketsCreated.length,
    tickets: [...]
  });
}
```

### 2. ClaudeCodeWebSocketClient (Agente de reparación)
**Archivo**: `claude-code-websocket-client.js`

**Qué hace**:
- Se conecta al servidor WebSocket
- **Escucha eventos** de Ollama (tickets creados)
- **Repara automáticamente** todos los tickets pendientes
- **Notifica vía WebSocket** cuando termina
- Corre 24/7

**Código clave**:
```javascript
// Escuchar evento de tickets creados
this.socket.on('tickets:created', (data) => {
  console.log(`🎫 Ollama creó ${data.count} tickets`);

  // Reparar AUTOMÁTICAMENTE (sin preguntar)
  await this.repairTickets(pendingTickets);

  // Notificar que terminamos
  this.notifyTicketsFixed(repairedTickets);
});
```

### 3. WebSocket Server (Intermediario)
**Archivo**: `src/config/websocket.js`

**Qué hace**:
- Maneja conexiones WebSocket
- Enruta eventos entre Ollama y Claude Code
- Funciones: `notifyTicketsCreated()`, `notifyTicketsFixed()`, `notifyRetestCompleted()`

### 4. Testing Tickets (Base de datos)
**Tabla**: `testing_tickets`
**Migración**: `migrations/20251023_create_testing_tickets.sql`

**Estados del ticket**:
```
PENDING_REPAIR → IN_REPAIR → FIXED → RETESTING → CLOSED
                                 ↓
                              REOPENED (si re-test falla)
                                 ↓
                              BLOCKED (si auto-repair falla)
```

---

## 🚀 CÓMO USAR EL SISTEMA (3 PASOS)

### PASO 1: Ejecutar servidor backend (si no está corriendo)

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
PORT=9998 npm start
```

Deberías ver:
```
✅ WebSocket iniciado
🌐 Servidor corriendo en http://localhost:9998
```

### PASO 2: Ejecutar Claude Code WebSocket Client (agente de reparación)

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
node claude-code-websocket-client.js
```

Deberías ver:
```
╔═══════════════════════════════════════════════════════════════╗
║  🤖 CLAUDE CODE WEBSOCKET CLIENT - Automatización 100%       ║
╚═══════════════════════════════════════════════════════════════╝

⚙️  Configuración:
   Servidor: http://localhost:9998
   Auto-repair: ACTIVO ✅
   Max concurrent: 3

✅ Conectado a BD
✅ HybridHealer inicializado

🔌 Conectando a WebSocket...
✅ Conectado a WebSocket
   Socket ID: abc123xyz

📡 Suscribiéndose a topics...
   ✅ claude-code-bridge
   ✅ auditor-updates

🎧 Escuchando eventos de Ollama...
```

### PASO 3: Ejecutar Ollama Testing Daemon (testing 24/7)

**Opción A**: Una sola ejecución
```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
node demo-ticket-system.js
```

**Opción B**: Daemon continuo (24/7)
```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
node ollama-testing-daemon.js
```

**Opción C**: Con PM2 (producción)
```bash
pm2 start ollama-testing-daemon.js --name "ollama-tester"
pm2 start claude-code-websocket-client.js --name "claude-code-agent"
pm2 save
pm2 startup
```

---

## 📊 CICLO COMPLETO EN ACCIÓN

### 1️⃣ Ollama detecta errores

```
╔═══════════════════════════════════════════════════════════════╗
║  🔄 CICLO #1 - TESTING EXHAUSTIVO INICIADO                   ║
╚═══════════════════════════════════════════════════════════════╝

⏰ Inicio: 2025-10-23 20:30:00

═══════════════════════════════════════════════════════════════
FASE 1: Simulación de usuario real (500 repeticiones/módulo)
═══════════════════════════════════════════════════════════════

🧪 Testing módulo: users...
   ❌ Error: Cannot read property 'map' of undefined
   📍 Archivo: public/js/modules/users.js:127

🧪 Testing módulo: shifts...
   ❌ Error: Modal does not close when clicking outside
   📍 Archivo: public/js/modules/shifts.js:89

... (27 módulos más)

✅ Simulación completada:
   Actions ejecutadas: 22,000
   Errores detectados: 29

═══════════════════════════════════════════════════════════════
FASE 4: Creando tickets para Claude Code
═══════════════════════════════════════════════════════════════

🎫 [TICKET-REPORTER] Procesando 29 errores...
   ✅ Ticket creado: TICKET-001 [medium]
   ✅ Ticket creado: TICKET-002 [medium]
   ...
   ✅ Ticket creado: TICKET-029 [medium]

🎫 [TICKET-REPORTER] 29 tickets procesados
📡 [WEBSOCKET] Notificación enviada a Claude Code
```

### 2️⃣ Claude Code recibe notificación y repara

```
╔═══════════════════════════════════════════════════════════════╗
║  🎫 TICKETS CREADOS - Notificación de Ollama                 ║
╚═══════════════════════════════════════════════════════════════╝

📊 Total tickets: 29
⏰ Timestamp: 2025-10-23T20:32:15.000Z
📝 Mensaje: 29 nuevos tickets creados

📋 Tickets pendientes en BD: 29

╔═══════════════════════════════════════════════════════════════╗
║  🔧 REPARACIÓN AUTOMÁTICA INICIADA                           ║
╚═══════════════════════════════════════════════════════════════╝

📊 Total a reparar: 29

🔧 [1/29] Reparando TICKET-001...
   Módulo: users
   Error: Cannot read property 'map' of undefined
   Archivo: public/js/modules/users.js:127
   ✅ Reparado exitosamente

🔧 [2/29] Reparando TICKET-002...
   Módulo: shifts
   Error: Modal does not close when clicking outside
   Archivo: public/js/modules/shifts.js:89
   ✅ Reparado exitosamente

... (27 más)

╔═══════════════════════════════════════════════════════════════╗
║  ✅ REPARACIÓN COMPLETADA                                     ║
╚═══════════════════════════════════════════════════════════════╝

📊 RESULTADOS:
   Reparados: 25 ✅
   Fallidos: 4 ❌
   Omitidos: 0 ⏭️

📡 [WEBSOCKET] Notificando 25 tickets reparados a Ollama...
```

### 3️⃣ Ollama re-testea automáticamente

```
╔═══════════════════════════════════════════════════════════════╗
║  🔄 RE-TEST SOLICITADO - Notificación de Claude Code         ║
╚═══════════════════════════════════════════════════════════════╝

📊 Tickets a re-testear: 25
⏰ Timestamp: 2025-10-23T20:35:00.000Z

🧪 Re-testeando: users...
   ✅ Test pasó

🧪 Re-testeando: shifts...
   ✅ Test pasó

... (23 más)

╔═══════════════════════════════════════════════════════════════╗
║  ✅ RE-TEST COMPLETADO                                        ║
╚═══════════════════════════════════════════════════════════════╝

📊 RESULTADOS:
   Pasaron: 23 ✅
   Fallaron: 2 ❌

💾 Actualizando tickets:
   TICKET-001 → CLOSED ✅
   TICKET-002 → CLOSED ✅
   ...
   TICKET-023 → CLOSED ✅
   TICKET-024 → REOPENED 🔄
   TICKET-025 → REOPENED 🔄

📡 [WEBSOCKET] Notificando resultados a Claude Code...
```

### 4️⃣ Ciclo se repite cada 30 minutos

```
⏭️  Próximo ciclo en 30 minutos

═══════════════════════════════════════════════════════════════
📊 ESTADÍSTICAS GLOBALES
═══════════════════════════════════════════════════════════════
   Ciclos ejecutados: 1
   Total errores detectados: 29
   Total tickets creados: 29
   Tickets cerrados: 23
   Tickets reabiertos: 2
   Tickets bloqueados: 4
   Success rate: 79.3%
═══════════════════════════════════════════════════════════════
```

---

## ⚙️ CONFIGURACIÓN

### Variables de entorno (.env)

```bash
# WebSocket
WEBSOCKET_URL=http://localhost:9998

# Claude Code Auto-Repair
AUTO_REPAIR=true  # false para deshabilitar auto-repair
MAX_CONCURRENT_REPAIRS=3

# Ollama Testing Daemon
TEST_INTERVAL=1800000  # 30 minutos en ms
REPETITIONS_PER_MODULE=500
COMPANY_ID=11
ENABLE_TICKETS=true
```

---

## 🛠️ TROUBLESHOOTING

### Problema: Claude Code no recibe notificaciones

**Verificar**:
```bash
# 1. ¿Está el servidor corriendo?
curl http://localhost:9998/api/v1/health

# 2. ¿Está el cliente WebSocket conectado?
# Deberías ver en logs del cliente:
# ✅ Conectado a WebSocket
# Socket ID: abc123xyz

# 3. ¿Hay tickets pendientes?
# Revisar BD:
SELECT COUNT(*) FROM testing_tickets WHERE status = 'PENDING_REPAIR';
```

**Solución**:
- Reiniciar servidor: `PORT=9998 npm start`
- Reiniciar cliente: `node claude-code-websocket-client.js`

### Problema: Auto-repair no funciona

**Verificar**:
```bash
# 1. ¿Está AUTO_REPAIR=true en .env?
cat .env | grep AUTO_REPAIR

# 2. ¿HybridHealer está funcionando?
# Deberías ver en logs:
# ✅ HybridHealer inicializado
```

**Solución**:
- Asegurarse que `AUTO_REPAIR=true` en `.env`
- Reiniciar cliente WebSocket

### Problema: Tickets no se cierran después de repair

**Verificar**:
```bash
# 1. ¿Se notificó a Ollama?
# Deberías ver en logs de Claude Code:
# 📡 [WEBSOCKET] Notificando 25 tickets reparados a Ollama...

# 2. ¿Ollama está escuchando?
# Deberías ver en logs de Ollama:
# 🔄 [WEBSOCKET] Claude Code reparó tickets. Re-testeando...
```

**Solución**:
- Verificar que ambos agentes estén conectados al WebSocket
- Verificar que Ollama esté en modo daemon (corriendo continuamente)

---

## 📈 MÉTRICAS Y MONITOREO

### Estadísticas del Claude Code Agent

El cliente WebSocket muestra estadísticas cada vez que se completa un re-test:

```
═══════════════════════════════════════════════════════════════
📊 ESTADÍSTICAS DEL AGENTE
═══════════════════════════════════════════════════════════════
⏱️  Uptime: 2h 15m
✅ Tickets reparados: 47
❌ Tickets fallidos: 3
🔄 En progreso: 0
═══════════════════════════════════════════════════════════════
```

### Estadísticas de tickets en BD

```sql
SELECT * FROM get_ticket_stats();
```

Retorna:
```
total_tickets         | 50
pending_repair        | 0
in_repair             | 0
fixed_pending_retest  | 0
closed                | 47
blocked               | 3
reopened              | 0
success_rate          | 94.0%
avg_time_to_fix_min   | 2.5
avg_time_to_close_min | 15.3
```

---

## 🎯 VENTAJAS DEL SISTEMA AUTOMATIZADO

✅ **Cero intervención manual** - Una vez configurado, trabaja solo
✅ **Testing continuo 24/7** - Detecta errores en tiempo real
✅ **Reparación automática** - Claude Code repara sin preguntar
✅ **Re-testing automático** - Ollama verifica que los fixes funcionan
✅ **Métricas completas** - Sabes exactamente qué funciona y qué no
✅ **Sin costo de APIs** - Todo local con Ollama
✅ **Escalable** - Puedes agregar más agentes (linters, security scans, etc.)

---

## 🔮 PRÓXIMOS PASOS (Opcional)

### 1. Agregar más agentes al sistema

Puedes crear otros agentes que se comuniquen vía WebSocket:

```javascript
// security-scanner-agent.js
socket.on('tickets:created', async (data) => {
  const securityIssues = await scanForSecurityIssues(data.tickets);
  socket.emit('security:issues_found', securityIssues);
});
```

### 2. Dashboard en tiempo real

Crear un dashboard web que muestre:
- Tickets pendientes
- Agentes conectados
- Historial de reparaciones
- Gráficas de success rate

### 3. Alertas por Telegram/Email

Notificar cuando:
- Se detectan errores críticos
- Auto-repair falla múltiples veces
- Success rate cae por debajo de X%

```javascript
// telegram-notifier-agent.js
socket.on('tickets:created', async (data) => {
  if (data.tickets.some(t => t.priority === 'critical')) {
    await sendTelegramAlert('🚨 Errores críticos detectados!');
  }
});
```

---

## 📞 SOPORTE

Si tienes problemas o quieres agregar funcionalidades:

1. **Revisar logs**: Tanto del servidor, cliente WebSocket y daemon de Ollama
2. **Verificar BD**: `SELECT * FROM testing_tickets WHERE status = 'BLOCKED'`
3. **Reiniciar sistema**: Matar procesos y volver a ejecutar los 3 pasos

---

## 📝 ARCHIVOS CLAVE DEL SISTEMA

```
backend/
├── claude-code-websocket-client.js       ← Agente de reparación 24/7
├── ollama-testing-daemon.js              ← Testing 24/7
├── demo-ticket-system.js                 ← Demo del sistema completo
├── src/
│   ├── config/
│   │   └── websocket.js                  ← WebSocket server + funciones
│   ├── auditor/
│   │   ├── reporters/
│   │   │   └── OllamaTicketReporter.js   ← Crea tickets + notifica
│   │   ├── healers/
│   │   │   └── HybridHealer.js           ← Auto-repair engine
│   └── services/
│       └── ClaudeCodeBridge.js           ← Bridge WebSocket (opcional)
├── migrations/
│   └── 20251023_create_testing_tickets.sql ← Tabla de tickets
└── .claude-notifications/
    ├── latest-report.json                ← Backup (archivo)
    └── README.md                         ← Docs del sistema

Documentación:
├── AUTOMATIZACION-100-WEBSOCKET.md       ← ESTE ARCHIVO
└── COMO-USAR-TICKETS-CLAUDE-CODE.md      ← Guía general
```

---

¡Listo! El sistema está **100% automatizado** y funcionará **para siempre** sin intervención manual. 🚀
