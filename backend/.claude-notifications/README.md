# 🎫 CLAUDE CODE TICKET SYSTEM

Este directorio contiene la **notificación automática** que Claude Code lee al abrir una sesión.

## 📋 FUNCIONAMIENTO

### 1. **Ollama detecta error** (corriendo 24/7)
```javascript
// Ollama ejecuta tests continuamente
// Cuando encuentra error → Escribe en latest-report.json
```

### 2. **Claude Code abre sesión** (automático)
```javascript
// Al abrir Claude Code:
// 1. Lee .claude-notifications/latest-report.json
// 2. Muestra resumen de tickets pendientes
// 3. Pregunta si quieres que repare automáticamente
```

### 3. **Claude Code repara** (con confirmación)
```javascript
// Si aceptas:
// 1. Lee tickets desde BD
// 2. Aplica fixes
// 3. Marca tickets como FIXED
// 4. Notifica a Ollama para re-test
```

### 4. **Ollama re-testea** (automático)
```javascript
// Ollama recibe notificación
// Re-ejecuta tests específicos
// Cierra tickets si pasan
```

---

## 📂 ARCHIVOS

### `latest-report.json`
```json
{
  "generated_at": "2025-10-23T22:00:00Z",
  "pending_tickets_count": 3,
  "critical_count": 1,
  "high_count": 2,
  "tickets": [
    {
      "ticket_number": "TICKET-001",
      "priority": "critical",
      "module": "users",
      "error": "Cannot read property 'map' of undefined",
      "file": "users.js:127"
    }
  ]
}
```

---

## 🔧 USO EN CLAUDE CODE

**Claude Code detecta automáticamente** este archivo y muestra:

```
🎫 TICKETS PENDIENTES DE REPARACIÓN:

  [CRITICAL] TICKET-001: users.js:127
  ❌ Cannot read property 'map' of undefined

  [HIGH] TICKET-002: shifts.js:89
  ❌ Modal no cierra al hacer click

¿Quieres que repare estos tickets automáticamente? (y/n)
```

---

## 🚀 DAEMON DE OLLAMA

El daemon de Ollama corre en background (Windows Service / systemd):

```bash
# Windows
node ollama-testing-daemon.js

# Corre indefinidamente:
# - Cada 30 minutos ejecuta tests
# - Detecta errores
# - Crea tickets en BD
# - Actualiza latest-report.json
```

---

## 💡 BENEFICIOS

✅ **Testing continuo 24/7** sin intervención manual
✅ **Claude Code siempre sabe qué arreglar** al abrir sesión
✅ **No uses API externa** (solo Ollama local)
✅ **Registro completo** de todos los errores y fixes
✅ **Métricas automáticas** (tiempo de fix, tasa de éxito)
