# 🔄 Session Coordination System

Sistema de coordinación para múltiples sesiones de Claude Code trabajando simultáneamente en el mismo proyecto.

## 📋 **Problema que resuelve**

Cuando dos sesiones de Claude Code trabajan en paralelo (una en backend, otra en frontend), necesitamos:
- ✅ **Prevenir conflictos** de escritura en archivos compartidos
- ✅ **Sincronizar cambios** automáticamente
- ✅ **Notificar** cuando la otra sesión modifica algo
- ✅ **Coordinar actualizaciones** del engineering-metadata.js

## 🏗️ **Arquitectura**

```
┌────────────────────────────────────────────────────┐
│                 SESSION COORDINATION                │
├────────────────────────────────────────────────────┤
│                                                     │
│  Session Backend                Session Frontend   │
│  ┌──────────────┐              ┌──────────────┐   │
│  │              │              │              │   │
│  │  Working on: │              │  Working on: │   │
│  │  - server.js │              │  - panel.html│   │
│  │  - routes/*  │              │              │   │
│  └──────┬───────┘              └──────┬───────┘   │
│         │                             │           │
│         └──────────┬──────────────────┘           │
│                    │                               │
│              ┌─────▼─────┐                        │
│              │           │                        │
│              │  session- │                        │
│              │  state.   │                        │
│              │  json     │                        │
│              │           │                        │
│              └───────────┘                        │
│                                                    │
│  ✅ Locks                                         │
│  ✅ Heartbeats                                    │
│  ✅ Change detection                              │
│  ✅ Conflict resolution                           │
│                                                    │
└────────────────────────────────────────────────────┘
```

## 📂 **Archivos del Sistema**

```
backend/
├── .coordination/
│   ├── session-state.json       # Estado compartido (CRÍTICO)
│   └── README.md                 # Esta documentación
├── scripts/
│   ├── session-lock.js          # Gestión de locks
│   └── sync-coordinator.js      # Coordinador de sincronización
└── public/js/modules/
    └── engineering-dashboard.js # Dashboard con auto-refresh
```

## 🚀 **Uso Básico**

### **Para la Sesión Backend:**

```javascript
const SessionLockManager = require('./scripts/session-lock');
const manager = new SessionLockManager('session-backend');

// Antes de modificar engineering-metadata.js
const lockResult = await manager.acquireLock('engineering-metadata.js', 'Actualizando roadmap');

if (lockResult.success) {
  // ... modificar archivo ...

  // Actualizar checksum
  await manager.updateMetadataChecksum();

  // Liberar lock
  await manager.releaseLock('engineering-metadata.js');
} else {
  console.warn('⚠️ Archivo locked por otra sesión:', lockResult.locked_by);
}
```

### **Para la Sesión Frontend:**

El frontend YA tiene auto-refresh implementado en `engineering-dashboard.js`:
- ✅ Polling cada 3 segundos
- ✅ Detección automática de cambios
- ✅ Notificación visual cuando cambia metadata
- ✅ Refresh automático del dashboard

## 🎯 **Comandos CLI**

### **Gestión de Locks:**

```bash
# Adquirir lock
node scripts/session-lock.js acquire session-backend engineering-metadata.js

# Liberar lock
node scripts/session-lock.js release session-backend engineering-metadata.js

# Verificar si está locked
node scripts/session-lock.js check session-backend engineering-metadata.js

# Enviar heartbeat
node scripts/session-lock.js heartbeat session-backend

# Actualizar checksum de metadata
node scripts/session-lock.js update-checksum session-backend

# Detectar cambios en metadata
node scripts/session-lock.js detect-change session-backend
```

### **Coordinación:**

```bash
# Iniciar coordinador (mantiene proceso corriendo)
node scripts/sync-coordinator.js start session-backend

# Ver estado de sesiones
node scripts/sync-coordinator.js status session-backend

# Ver historial de conflictos
node scripts/sync-coordinator.js conflicts session-backend
```

## 📊 **Estado del Sistema**

Puedes ver el estado en tiempo real en:
- **Engineering Dashboard** → Panel de sincronización (arriba)
- **Archivo** `session-state.json` (directo)

## 🔐 **Sistema de Locks**

### **Archivos Protegidos:**

- ✅ `engineering-metadata.js` - Metadata del sistema
- ✅ `backend/server.js` - Servidor principal
- ✅ `backend/public/panel-administrativo.html` - Frontend admin
- ✅ `backend/public/panel-empresa.html` - Frontend empresa

### **Timeout de Locks:**

- **5 minutos** por defecto
- Si una sesión crashea, el lock expira automáticamente

## ⚠️ **Prevención de Conflictos**

### **Flujo Seguro:**

```
1. Session Backend quiere modificar metadata
2. Verifica lock: ¿está libre?
   - ❌ NO → Espera o avisa al usuario
   - ✅ SÍ → Adquiere lock
3. Modifica archivo
4. Actualiza checksum
5. Libera lock
6. Session Frontend detecta cambio (polling)
7. Frontend muestra notificación
8. Frontend hace refresh automático
```

## 🧪 **Testing del Sistema**

### **Test 1: Detección de Cambios**

```bash
# Terminal 1: Iniciar coordinador frontend
node scripts/sync-coordinator.js start session-frontend

# Terminal 2: Simular cambio en metadata
node scripts/session-lock.js update-checksum session-backend

# Resultado: Frontend detecta cambio en 3 segundos
```

### **Test 2: Sistema de Locks**

```bash
# Terminal 1: Adquirir lock
node scripts/session-lock.js acquire session-backend engineering-metadata.js

# Terminal 2: Intentar adquirir mismo lock
node scripts/session-lock.js acquire session-frontend engineering-metadata.js

# Resultado: Error - File locked by session-backend
```

## 📝 **Buenas Prácticas**

### **DO ✅**

- Siempre adquirir lock antes de modificar archivos compartidos
- Actualizar checksum después de modificar metadata
- Liberar locks inmediatamente después de usar
- Enviar heartbeats periódicos

### **DON'T ❌**

- NO modificar `session-state.json` manualmente
- NO ignorar errores de locks
- NO mantener locks más de 5 minutos
- NO modificar `engineering-metadata.js` sin lock

## 🔧 **Troubleshooting**

### **"Lock stuck"**

```bash
# Ver locks activos
node scripts/sync-coordinator.js status session-frontend

# Si un lock está stuck, editarlo manualmente en session-state.json
# O esperar 5 minutos para que expire automáticamente
```

### **"Frontend no detecta cambios"**

1. Verificar que el servidor esté corriendo
2. Abrir F12 Console → Buscar logs `[SYNC]`
3. Verificar que el polling esté activo (cada 3 segundos)

### **"Conflictos frecuentes"**

```bash
# Ver historial de conflictos
node scripts/sync-coordinator.js conflicts session-backend

# Analizar qué sesión está causando problemas
```

## 📈 **Monitoreo**

### **Dashboard Visual:**

Abre el Engineering Dashboard:
1. Click en botón "🏗️ Engineering" (header)
2. Mira el panel "Session Coordination System"
3. Verás indicadores de ambas sesiones

### **Logs en Consola:**

```javascript
// Frontend logs:
🔄 [SYNC] Renderizando dashboard...
🔔 [SYNC] Cambios detectados en metadata, actualizando...
✅ [ENGINEERING] Dashboard actualizado

// Backend logs (si usas sync-coordinator):
🔔 Metadata cambió: { last_modified_by: 'session-backend' }
👥 Otras sesiones activas: [ 'session-frontend' ]
```

## 🎓 **Ejemplo Completo**

### **Escenario: Usuario le pide a Backend implementar módulo X**

```javascript
// Backend (Session Backend)
const manager = new SessionLockManager('session-backend');

// 1. Adquirir lock
const lock = await manager.acquireLock('engineering-metadata.js', 'Implementando módulo X');

if (lock.success) {
  // 2. Implementar código
  await implementModuleX();

  // 3. Actualizar engineering-metadata.js
  await updateMetadata({
    modules: {
      moduleX: {
        status: 'COMPLETE',
        progress: 100,
        done: true
      }
    }
  });

  // 4. Actualizar checksum
  await manager.updateMetadataChecksum();

  // 5. Liberar lock
  await manager.releaseLock('engineering-metadata.js');

  console.log('✅ Módulo X implementado y metadata actualizado');
}

// Frontend (Automático)
// En 3 segundos o menos:
// - Detecta cambio
// - Muestra notificación: "🔄 Metadata actualizado por otra sesión"
// - Refresh automático del dashboard
// - Usuario ve módulo X con status COMPLETE
```

## 🔮 **Futuras Mejoras**

- [ ] WebSocket para sync en tiempo real (en vez de polling)
- [ ] UI para resolver conflictos manualmente
- [ ] Historial de cambios con diff
- [ ] Rollback automático en caso de conflicto
- [ ] Integración con Git para commits automáticos

---

## 📞 **Soporte**

Si tienes problemas:
1. Revisar logs en consola del navegador
2. Verificar `session-state.json`
3. Revisar este README
4. Preguntar a Claude Code 😉
