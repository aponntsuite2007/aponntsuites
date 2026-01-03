# COMPARACIÓN: user-support vs ai-assistant

**Fecha**: 2025-12-26
**Objetivo**: Comparar ambos módulos para entender diferencias y errores

---

## 📊 RESUMEN EJECUTIVO

| Aspecto | user-support | ai-assistant |
|---------|--------------|--------------|
| **Propósito** | Dashboard de tickets de soporte para USUARIOS | Chat flotante con IA (Ollama) |
| **Frontend** | ✅ `user-support-dashboard.js` | ✅ `ai-assistant-chat.js` |
| **Líneas** | 1,510 | 1,539 |
| **Tamaño** | 45.0 KB | 46.1 KB |
| **Fecha** | 2025-12-16 | 2025-12-16 |
| **Integrado** | ✅ SÍ - panel-empresa.html | ✅ SÍ - panel-empresa.html |
| **Métodos async** | 10 | 7 |
| **Estado** | ⚠️ Errores en consola | ✅ Funcional |

---

## 🔧 BACKEND COMPARTIDO

Ambos usan el **MISMO backend**:

1. **`src/routes/assistantRoutes.js`** (657 líneas)
   - API REST completa
   - Endpoints para chat, tickets, feedback

2. **`src/services/AssistantService.js`** (1,256 líneas)
   - Integración con Ollama
   - RAG (Retrieval Augmented Generation)
   - Auto-diagnóstico con AuditorEngine

3. **`src/models/AssistantKnowledgeBase.js`** (192 líneas)
   - Tabla GLOBAL de conocimiento compartido

4. **`src/models/AssistantConversation.js`** (190 líneas)
   - Tabla MULTI-TENANT de conversaciones privadas

**Backend total**: 2,295 líneas (70.4 KB)

---

## 📋 FUNCIONALIDADES COMPARADAS

### USER-SUPPORT (Dashboard de Tickets)

**Funciones principales**:
- ✅ Ver lista de tickets propios
- ✅ Crear nuevo ticket
- ✅ Ver detalle de ticket con chat
- ✅ Enviar mensajes en ticket
- ✅ Ver tickets escalados desde IA
- ✅ Filtrar por status/prioridad
- ✅ Stats (total, open, resolved, AI escalated)
- ✅ Dark theme consistente

**API Endpoints** (esperados):
```
GET  /api/assistant/tickets          - Listar tickets
POST /api/assistant/tickets          - Crear ticket
GET  /api/assistant/tickets/:id      - Ver detalle
POST /api/assistant/tickets/:id/msg  - Enviar mensaje
GET  /api/assistant/history          - Historial conversaciones
POST /api/assistant/feedback         - Feedback 👍👎
```

**Vistas**:
1. `list` → Grid de tickets con stats
2. `detail` → Chat de ticket específico
3. `create` → Form para nuevo ticket

---

### AI-ASSISTANT (Chat Flotante)

**Funciones principales**:
- ✅ Chat flotante bottom-right 🤖
- ✅ Preguntar cualquier duda al asistente IA
- ✅ Integración con Ollama + Llama 3.1
- ✅ RAG (busca en knowledge base)
- ✅ Context-aware (detecta módulo actual)
- ✅ Feedback 👍👎
- ✅ Tech stack badges visibles
- ✅ Markdown rendering

**API Endpoints**:
```
POST /api/assistant/chat     - Enviar pregunta
POST /api/assistant/feedback - Registrar feedback
GET  /api/assistant/history  - Ver historial
GET  /api/assistant/health   - Estado Ollama
```

**Vistas**:
1. Botón flotante (minimizado)
2. Chat expandido con mensajes
3. Input para preguntas

---

## ⚠️ ERRORES DETECTADOS (user-support)

Según los logs mostrados:
```
[PROGRESSIVE] Cargando módulo: user-support
🔄 [SMART-CONFIG] 📦 Cargando user-support...
📦 [PROGRESSIVE] Creando script para: user-support
📦 [PROGRESSIVE] Usando USER SUPPORT DASHBOARD v1.0
📦 [PROGRESSIVE] Script creado con src: http://localhost:9998/js/modules/user-support-dashboard.js?v=1766761592300
📦 [PROGRESSIVE] URL completa será: [VACÍA - ERROR]
```

**Problemas detectados**:
1. ❌ **URL completa vacía** - No se completa el log
2. ⚠️ **Posible error al cargar** el script
3. ⚠️ **Mensajes duplicados** en consola (se repite 2 veces)

**Causas probables**:
1. Error en el código de carga progresiva (línea ~6100 panel-empresa.html)
2. Script se carga pero falla al ejecutar
3. `UserSupportDashboard` no se inicializa correctamente
4. Posible error de CORS o 404 en recursos

---

## 🔍 DIFERENCIAS CLAVE

| Característica | user-support | ai-assistant |
|----------------|--------------|--------------|
| **UI** | Dashboard completo multi-vista | Chat flotante simple |
| **Propósito** | Gestión de tickets formales | Asistente conversacional |
| **Escalamiento** | Tickets pueden escalar a soporte | Chat puede crear tickets |
| **SLA** | ✅ Tracking de tiempos | ❌ No aplica |
| **Prioridad** | ✅ Low/Medium/High/Urgent | ❌ No aplica |
| **Status** | ✅ Open/InProgress/Resolved/Closed | ❌ No aplica (conversacional) |
| **Historial** | Por ticket con mensajes | Por conversación global |
| **Módulos** | Lista de módulos relacionados | Detección automática de contexto |

---

## 🎯 QUÉ TIENE CADA UNO

### ✅ Solo user-support tiene:
- Dashboard de tickets con grid
- Filtros (status, priority)
- Stats cards (total, open, resolved, AI escalated)
- CRUD completo de tickets
- Asignación de prioridad
- Tracking de módulos relacionados
- Vista de detalle con chat interno
- Form de creación de tickets

### ✅ Solo ai-assistant tiene:
- Chat flotante minimizable
- Integración directa con Ollama
- RAG (búsqueda en knowledge base)
- Auto-diagnóstico con AuditorEngine
- Context detection automático
- Tech stack badges
- Markdown rendering avanzado
- Estado de Ollama (health check)

### ✅ Ambos comparten:
- Backend (AssistantService + Routes)
- Modelos BD (AssistantKnowledgeBase, AssistantConversation)
- Sistema de feedback 👍👎
- Dark theme
- Auth token localStorage/sessionStorage

---

## 🚨 PRÓXIMOS PASOS

### 1. Identificar error específico de user-support
```bash
# Abrir navegador en http://localhost:9998/panel-empresa.html
# F12 → Console
# Navegar a "Soporte / Tickets"
# Copiar TODOS los errores rojos
```

### 2. Verificar que endpoints existen
```bash
cd backend
grep -n "router.*tickets" src/routes/assistantRoutes.js
```

### 3. Comparar con config E2E
```bash
cat tests/e2e/configs/user-support.config.js
```

---

**Estado actual**: user-support tiene frontend pero presenta errores al cargar. Necesitamos ver el error específico para reparar.
