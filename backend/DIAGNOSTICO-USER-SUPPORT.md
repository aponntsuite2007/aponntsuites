# DIAGNÓSTICO: user-support - Errores de Consola

**Fecha**: 2025-12-26
**Módulo**: user-support (Dashboard de Tickets)
**Status**: ⚠️ Errores al cargar

---

## 🔍 HALLAZGOS PRINCIPALES

### ✅ BACKEND EXISTE Y ES COMPLETO

**Archivo**: `src/routes/supportRoutesV2.js`

**Endpoints disponibles**:
```
POST   /api/support/v2/tickets                    - Crear ticket
GET    /api/support/v2/tickets                    - Listar tickets
GET    /api/support/v2/tickets/:ticket_id         - Ver detalle
POST   /api/support/v2/tickets/:ticket_id/messages - Enviar mensaje
PATCH  /api/support/v2/tickets/:ticket_id/status  - Cambiar status
POST   /api/support/v2/tickets/:ticket_id/rate    - Calificar ticket
POST   /api/support/v2/tickets/:ticket_id/escalate - Escalar a soporte
GET    /api/support/v2/tickets/:ticket_id/activity - Ver actividad
GET    /api/support/v2/sla-plans                  - Ver planes SLA
PATCH  /api/support/v2/companies/:id/sla-plan     - Actualizar SLA
POST   /api/support/v2/vendors/:id/assign-supervisor - Asignar supervisor
POST   /api/support/v2/monitor/start              - Iniciar monitor
```

**Conclusión**: ✅ La API backend está completa y bien estructurada

---

### ✅ FRONTEND EXISTE

**Archivo**: `public/js/modules/user-support-dashboard.js`
- Líneas: 1,510
- Tamaño: 45.0 KB
- Fecha: 2025-12-16
- Métodos async: 10

**Funcionalidades**:
- ✅ Dashboard con stats
- ✅ Lista de tickets con filtros
- ✅ Vista de detalle con chat
- ✅ Crear nuevo ticket
- ✅ Enviar mensajes
- ✅ Dark theme consistente

---

### ✅ INTEGRACIÓN EN PANEL-EMPRESA

**Archivo**: `public/panel-empresa.html`

**Líneas donde aparece**:
- Línea 2298: `<script src="js/modules/user-support-dashboard.js"></script>`
- Línea 4347: `{ id: 'user-support', name: 'Soporte / Tickets', icon: '🎫' }`
- Línea 5221: Módulo CORE incluido
- Línea 6100: Carga progresiva del script

**Conclusión**: ✅ El módulo SÍ está integrado correctamente

---

## ⚠️ PROBLEMA DETECTADO

### Error en logs de consola:
```
[PROGRESSIVE] Cargando módulo: user-support
🔄 [SMART-CONFIG] 📦 Cargando user-support...
📦 [PROGRESSIVE] Creando script para: user-support
📦 [PROGRESSIVE] Usando USER SUPPORT DASHBOARD v1.0
📦 [PROGRESSIVE] Script creado con src: http://localhost:9998/js/modules/user-support-dashboard.js?v=1766761592300
📦 [PROGRESSIVE] URL completa será: [VACÍA - NO SE COMPLETA EL LOG]
```

**Mensajes duplicados**: Se repite 2 veces idéntico

---

## 🔍 CAUSAS PROBABLES

### 1. ❌ Ruta NO registrada en server.js
Si `supportRoutesV2.js` NO está registrado en server.js:
```javascript
// Debería haber algo como:
const supportRoutesV2 = require('./src/routes/supportRoutesV2');
app.use('/api/support/v2', supportRoutesV2);
```

**Verificar**: `grep -n "supportRoutes" server.js`

### 2. ❌ Error al inicializar UserSupportDashboard
Si el constructor o método `init()` falla:
```javascript
// En user-support-dashboard.js línea ~72
async init(containerId) {
  // Si container no existe → Error silencioso
  this.container = document.getElementById(containerId);
  if (!this.container) {
    console.error('[USER-SUPPORT] Container not found:', containerId);
    return; // ← Sale sin hacer nada
  }
}
```

**Posible problema**: El `containerId` pasado no existe en el DOM

### 3. ❌ Error en carga progresiva (panel-empresa.html ~línea 6100)
```javascript
} else if (tabName === 'user-support') {
    script.src = `js/modules/user-support-dashboard.js?v=${cacheBuster}`;
    console.log('📦 [PROGRESSIVE] URL completa será:', script.src); // ← Log vacío
}
```

**Problema**: El log se ejecuta ANTES de que `script.src` esté completo

### 4. ❌ Conflicto con otro módulo
El mensaje duplicado sugiere que se está cargando 2 veces.

**Posible causa**:
- Script incluido en línea 2298 (carga inicial)
- Script cargado dinámicamente en línea 6100 (carga progresiva)
- → CONFLICTO: Se carga 2 veces

---

## 🎯 PLAN DE REPARACIÓN

### PASO 1: Verificar registro en server.js
```bash
grep -A 5 -B 5 "supportRoutesV2\|/api/support" server.js
```

**Si NO aparece** → Agregar:
```javascript
const supportRoutesV2 = require('./src/routes/supportRoutesV2');
app.use('/api/support/v2', supportRoutesV2);
```

### PASO 2: Testear endpoint manualmente
```bash
# Con servidor corriendo:
curl -H "Authorization: Bearer <token>" http://localhost:9998/api/support/v2/tickets
```

**Respuesta esperada**: JSON con tickets o `[]`
**Si da 404**: La ruta NO está registrada

### PASO 3: Ver errores COMPLETOS en navegador
```
1. Abrir http://localhost:9998/panel-empresa.html
2. Login con credenciales válidas
3. F12 → Console (limpiar)
4. Click en "Soporte / Tickets" 🎫
5. Copiar TODOS los mensajes (rojos, amarillos, azules)
```

### PASO 4: Revisar inicialización
En `panel-empresa.html`, buscar cómo se inicializa:
```javascript
// Debería haber algo como:
if (window.UserSupportDashboard) {
  const dashboard = new UserSupportDashboard();
  dashboard.init('user-support-container'); // ← Verificar que este ID exista
}
```

### PASO 5: Eliminar carga duplicada
**Opción A**: Remover script estático (línea 2298)
**Opción B**: Remover carga progresiva (línea 6100)

**Recomendado**: Usar SOLO carga progresiva (eliminar línea 2298)

---

## 📊 COMPARACIÓN CON AI-ASSISTANT

| Aspecto | user-support | ai-assistant |
|---------|--------------|--------------|
| **Backend** | supportRoutesV2.js | assistantRoutes.js |
| **Endpoints** | `/api/support/v2/*` | `/api/assistant/*` |
| **Frontend** | user-support-dashboard.js | ai-assistant-chat.js |
| **Integrado** | ✅ SÍ | ✅ SÍ |
| **Funciona** | ❌ Errores consola | ✅ OK |

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Verificar server.js** → ¿Está registrado supportRoutesV2?
2. **Testear endpoint** → `curl /api/support/v2/tickets`
3. **Ver errores completos** → Abrir navegador F12
4. **Comparar con working module** → Ver cómo se inicializa ai-assistant

---

**Siguiente acción**: Verificar si supportRoutesV2 está en server.js
