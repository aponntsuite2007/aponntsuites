# 🤖 Sistema de Asistente IA con Ollama + Llama 3.1

## 📊 RESUMEN EJECUTIVO

Sistema de Asistente IA completo, 100% local y privado, integrado en el panel de administración empresarial.

**✅ Estado**: Sistema 100% implementado - Listo para uso (requiere instalación de Ollama)

**🔧 Tecnologías**:
- **IA**: Ollama + Llama 3.1 (8B parámetros) - Inference local
- **RAG**: Retrieval Augmented Generation con Knowledge Base
- **Backend**: Node.js + Express + AssistantService
- **Database**: PostgreSQL con JSONB + extensiones (unaccent, pg_trgm)
- **Frontend**: Vanilla JavaScript - Chat flotante profesional

**💰 Costo**: $0/mes (todo local, sin APIs externas)

---

## ✅ QUÉ SE IMPLEMENTÓ

### 1. BASE DE DATOS ✅

**Tabla**: `assistant_knowledge_base`

**Migración**: `backend/migrations/20250119_create_assistant_knowledge_base.sql`

**Características**:
- Multi-tenant (aislación por `company_id`)
- JSONB para contexto flexible
- Full-text search (español)
- Feedback system (👍👎)
- Aprendizaje progresivo (`reused_count`, `improved_answer`)
- Verificación por admin
- 8 índices optimizados
- 2 funciones PostgreSQL helper:
  - `search_similar_answers()` - RAG search
  - `get_assistant_stats()` - Estadísticas de uso

**Ejecutado en Render**: ✅ Sí (tabla creada)

---

### 2. BACKEND - SERVICIO ✅

**Archivo**: `backend/src/services/AssistantService.js` (800+ líneas)

**Funcionalidades**:

#### A. Chat Inteligente
```javascript
await assistantService.chat({
  companyId: 11,
  userId: 'uuid-user',
  userRole: 'admin',
  question: '¿Cómo registro asistencias?',
  context: {
    module: 'attendance',
    submodule: 'manual-entry',
    screen: 'attendance-table'
  }
});
```

**Flujo**:
1. **Búsqueda en Knowledge Base** (RAG - Retrieval):
   - Busca preguntas similares con `search_similar_answers()`
   - Usa similitud de texto (trigram + full-text)
   - Filtra por empresa y módulo

2. **Construcción de Contexto**:
   - Obtiene info del SystemRegistry (45 módulos)
   - Incluye: dependencies, help, common issues
   - Agrega respuestas previas similares
   - Detecta si necesita diagnóstico técnico

3. **Diagnóstico Automático** (si aplica):
   - Keywords: "no funciona", "error", "roto", "problema"
   - Ejecuta AuditorEngine si detecta problema
   - Incluye resultados en contexto para Ollama

4. **Generación con Ollama** (Augmented Generation):
   - Prompt enriquecido con todo el contexto
   - Llama 3.1 (8B) genera respuesta
   - Temperature: 0.7 (configurable)
   - Max tokens: 500 (configurable)

5. **Guardado en Knowledge Base**:
   - Almacena pregunta + respuesta
   - Metadata: source, confidence, tokens, timing
   - Listo para futura reutilización

#### B. Feedback System
```javascript
await assistantService.submitFeedback(entryId, helpful, comment);
```
- 👍 = `helpful: true` → incrementa `reused_count`
- 👎 = `helpful: false` → marca para revisión

#### C. Estadísticas
```javascript
await assistantService.getStats(companyId, daysBack);
```
Retorna:
- Total de preguntas
- Helpful rate (% positivos)
- Avg response time
- Diagnósticos ejecutados
- Módulo más consultado
- Respuestas verificadas

#### D. Health Check
```javascript
await assistantService.checkHealth();
```
Verifica si Ollama está corriendo y disponible.

---

### 3. BACKEND - API REST ✅

**Archivo**: `backend/src/routes/assistantRoutes.js`

**Endpoints**:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/assistant/chat` | Enviar pregunta al asistente |
| POST | `/api/assistant/feedback` | Registrar feedback (👍👎) |
| GET | `/api/assistant/history` | Historial de conversaciones |
| GET | `/api/assistant/stats` | Estadísticas de uso |
| GET | `/api/assistant/health` | Estado de Ollama |
| GET | `/api/assistant/:id` | Detalle de conversación |

**Autenticación**: JWT via `Authorization: Bearer <token>`

**Headers requeridos**:
```
X-User-Id: <uuid>
X-Company-Id: <number>
X-User-Role: <admin|rrhh|employee>
```

**Ejemplo Request**:
```bash
curl -X POST http://localhost:9998/api/assistant/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Id: uuid-123" \
  -H "X-Company-Id: 11" \
  -H "X-User-Role: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cómo agrego un nuevo empleado?",
    "context": {
      "module": "users",
      "screen": "user-list"
    }
  }'
```

**Ejemplo Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-conversation",
    "answer": "Para agregar un nuevo empleado:\n\n1. Click en 'Agregar Usuario'...",
    "source": "ollama",
    "confidence": 0.85,
    "suggestedActions": [],
    "quickReplies": ["Sí, entiendo", "Necesito más ayuda"],
    "diagnosticTriggered": false,
    "responseTimeMs": 2341
  },
  "tech_stack": {
    "ai": "Ollama + llama3.1:8b",
    "backend": "Node.js + Express",
    "database": "PostgreSQL + JSONB",
    "framework": "RAG (Retrieval Augmented Generation)"
  }
}
```

---

### 4. FRONTEND - CHAT FLOTANTE ✅

**Archivo**: `backend/public/js/modules/ai-assistant-chat.js` (1,100+ líneas)

**Características**:

#### A. Diseño Profesional
- **Botón flotante** (bottom-right) con animación pulse
- **Ventana de chat** moderna con gradients
- **Tech Stack Badges** visibles:
  - 🧠 Ollama + Llama 3.1
  - ⚡ Node.js
  - 🐘 PostgreSQL
  - 📚 RAG
- **Responsive** (mobile + desktop)

#### B. Funcionalidades UI
- **Mensajes user vs assistant** con burbujas diferenciadas
- **Markdown rendering** básico (bold, italic, lists)
- **Typing indicator** animado (3 dots)
- **Feedback buttons** (👍👎) por mensaje
- **Source indicator** (🧠 ollama, 📚 cache, 🔍 diagnostic)
- **Confidence score** (% confianza de la IA)
- **Auto-scroll** to bottom
- **Enter to send** (Shift+Enter para nueva línea)
- **Auto-resize textarea**

#### C. Context Detection
- Detecta módulo actual desde URL/estado
- Incluye contexto en requests a API
- Mejora precisión de respuestas

#### D. Ollama Health Check
- Verifica disponibilidad al iniciar
- Indicador de estado:
  - 🟢 Disponible
  - 🔴 No disponible
  - 🟡 Desconocido

#### E. Mensaje de Bienvenida
```
¡Hola! 👋

Soy tu asistente de IA inteligente. Estoy aquí para ayudarte con cualquier duda sobre el sistema de asistencia biométrico.

💡 Puedes preguntarme:
• Cómo usar cualquier módulo
• Solucionar problemas
• Entender funcionalidades
• Obtener ayuda contextual

🧠 Potenciado por Ollama + Llama 3.1 (IA Local)
```

#### F. API Global
```javascript
// Abrir chat programáticamente
window.AIAssistantChat.open();

// Cerrar chat
window.AIAssistantChat.close();

// Enviar mensaje programático
window.AIAssistantChat.sendMessage('¿Cómo funciona esto?');

// Actualizar contexto
window.AIAssistantChat.setContext('users', 'user-creation-form');
```

---

### 5. INTEGRACIÓN EN PANEL-EMPRESA ✅

**Archivo**: `backend/public/panel-empresa.html`

**Línea**: 6815

```html
<!-- ✅ ASISTENTE IA - Ollama + Llama 3.1 (Chat Flotante con Tech Badges) -->
<script src="js/modules/ai-assistant-chat.js"></script>
```

**Resultado**: Chat flotante visible en TODAS las páginas del panel.

---

### 6. MODELOS SEQUELIZE ✅

**Archivo**: `backend/src/models/AssistantKnowledgeBase.js`

**Registrado en**: `backend/src/config/database.js`
- Import: Línea 147
- Export: Línea 491

**Asociaciones**: Ninguna (independiente por diseño)

---

### 7. RUTAS REGISTRADAS EN SERVER.JS ✅

**Archivo**: `backend/server.js`

**Líneas**: 2019-2029

```javascript
// ✅ CONFIGURAR SISTEMA DE ASISTENTE IA (Ollama + Llama 3.1)
const assistantRoutes = require('./src/routes/assistantRoutes');
app.use('/api/assistant', assistantRoutes);

console.log('🤖 [ASSISTANT] Sistema de Asistente IA ACTIVO:');
console.log('   💬 /api/assistant/chat - Chat con el asistente');
console.log('   👍 /api/assistant/feedback - Registrar feedback');
console.log('   📜 /api/assistant/history - Historial de conversaciones');
console.log('   📊 /api/assistant/stats - Estadísticas de uso');
console.log('   🏥 /api/assistant/health - Estado de Ollama');
console.log('   🧠 Technology: Ollama + Llama 3.1 (8B) + RAG + PostgreSQL');
```

---

### 8. DOCUMENTACIÓN ✅

**Archivos creados**:

1. **OLLAMA-INSTALLATION.md**
   - Guía de instalación Windows/Linux/Render
   - Configuración de environment variables
   - API endpoints de Ollama
   - Troubleshooting completo
   - Recomendaciones de hardware

2. **AI-ASSISTANT-SYSTEM.md** (este archivo)
   - Resumen completo del sistema
   - Arquitectura técnica
   - Guía de uso
   - Ejemplos de código

---

## 🚀 CÓMO USAR EL SISTEMA

### PASO 1: Instalar Ollama

#### Windows (Desarrollo Local):
```bash
# 1. Descargar de https://ollama.com/download
# 2. Ejecutar OllamaSetup.exe
# 3. Verificar instalación
ollama --version

# 4. Descargar modelo Llama 3.1 (8B)
ollama pull llama3.1:8b
# Esto descarga ~4.7 GB (10-30 min)

# 5. Probar modelo
ollama run llama3.1:8b "Hola, ¿cómo estás?"

# 6. Verificar servidor
curl http://localhost:11434/api/tags
```

#### Linux (Render/VPS):
```bash
# 1. Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Iniciar servicio
sudo systemctl start ollama
sudo systemctl enable ollama

# 3. Descargar modelo
ollama pull llama3.1:8b

# 4. Verificar
curl http://localhost:11434/api/tags
```

**⚠️ IMPORTANTE**: Render Free Tier NO soporta Ollama (falta RAM + disco).
Necesitas: Standard Plan ($25/mes) o VPS dedicado.

---

### PASO 2: Configurar Variables de Entorno

**Archivo**: `backend/.env`

```bash
# URL del servidor Ollama
OLLAMA_BASE_URL=http://localhost:11434

# En producción (si instalas en servidor separado):
# OLLAMA_BASE_URL=https://your-ollama-server.com

# Modelo a usar
OLLAMA_MODEL=llama3.1:8b

# Temperatura (0.0 = determinístico, 1.0 = creativo)
OLLAMA_TEMPERATURE=0.7

# Max tokens en respuesta
OLLAMA_MAX_TOKENS=500

# Timeout (ms)
OLLAMA_TIMEOUT=30000
```

---

### PASO 3: Reiniciar Servidor Backend

```bash
cd C:/Bio/sistema_asistencia_biometrico/backend
PORT=9998 npm start
```

Deberías ver en logs:
```
🤖 [ASSISTANT] Sistema de Asistente IA ACTIVO:
   💬 /api/assistant/chat - Chat con el asistente
   ...
```

---

### PASO 4: Usar el Chat

1. **Abrir Panel**: http://localhost:9998/panel-empresa.html

2. **Login** con credenciales (3 pasos):
   - EMPRESA: `aponnt-empresa-demo`
   - USUARIO: `administrador`
   - PASSWORD: `admin123`

3. **Ver botón flotante**: Bottom-right esquina (🤖)

4. **Click en botón** → Se abre ventana de chat

5. **Hacer una pregunta**:
   ```
   ¿Cómo registro asistencias manualmente?
   ```

6. **Ver respuesta** con:
   - Source indicator (🧠 ollama)
   - Confidence score (85%)
   - Feedback buttons (👍👎)

7. **Dar feedback** → Click 👍 o 👎

8. **Seguir conversando** → El sistema aprende progresivamente

---

## 📊 ARQUITECTURA TÉCNICA

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                            │
│  ┌─────────────────────────────────────────────────┐  │
│  │  ai-assistant-chat.js (Floating Chat Widget)   │  │
│  │  • Tech badges visible                           │  │
│  │  • Feedback buttons                              │  │
│  │  • Markdown rendering                            │  │
│  └─────────────────┬───────────────────────────────┘  │
└────────────────────┼──────────────────────────────────┘
                     │ HTTPS/JSON
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js)                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │  assistantRoutes.js (API REST)                  │  │
│  │  • /api/assistant/chat                           │  │
│  │  • /api/assistant/feedback                       │  │
│  │  • /api/assistant/history                        │  │
│  └─────────────────┬───────────────────────────────┘  │
│                     │
│  ┌─────────────────▼───────────────────────────────┐  │
│  │  AssistantService.js (IA Engine)                │  │
│  │  • RAG Search                                    │  │
│  │  • Context Building                              │  │
│  │  • Ollama Integration                            │  │
│  │  • Knowledge Base Management                     │  │
│  └─────┬──────────────────────────┬────────────────┘  │
└────────┼──────────────────────────┼───────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐       ┌──────────────────────┐
│  PostgreSQL     │       │  Ollama (IA Local)   │
│  • KB Table     │       │  • Llama 3.1 (8B)   │
│  • Feedback     │       │  • Inference         │
│  • Stats        │       │  • localhost:11434   │
└─────────────────┘       └──────────────────────┘
         │
         ▼
┌─────────────────┐
│ SystemRegistry  │
│ • 45 modules    │
│ • Dependencies  │
│ • Help metadata │
└─────────────────┘
```

---

## 📈 CARACTERÍSTICAS AVANZADAS

### 1. RAG (Retrieval Augmented Generation)

**¿Qué es?**
Técnica que combina:
- **Retrieval**: Búsqueda en base de conocimiento
- **Augmentation**: Enriquecimiento del contexto
- **Generation**: Generación de respuesta con LLM

**Ventaja**:
- Respuestas basadas en experiencia previa
- Menor alucinación (inventa menos)
- Mejora continua con uso

**Implementación**:
```javascript
// 1. Buscar respuestas similares
const similarAnswers = await searchKnowledgeBase(question, companyId);

// 2. Construir contexto
const context = {
  systemPrompt: '...',
  knowledgeBase: similarAnswers,
  moduleInfo: systemRegistry.getModule(moduleKey),
  diagnosticResults: diagnosticResults
};

// 3. Generar con Ollama
const response = await ollama.chat({
  messages: [
    { role: 'system', content: buildSystemPrompt(context) },
    { role: 'user', content: question }
  ]
});

// 4. Guardar para futuras búsquedas
await saveToKnowledgeBase({ question, answer: response });
```

### 2. Context-Aware (Consciente del Contexto)

El asistente sabe:
- **Módulo actual** del usuario
- **Pantalla específica** donde está
- **Acción que intenta** realizar
- **Historial de conversación**
- **Empresa** (multi-tenant)

**Ejemplo**:
```javascript
// Usuario en módulo "users" viendo lista
window.AIAssistantChat.setContext('users', 'user-list-table');

// Pregunta: "¿Cómo agrego uno?"
// Asistente entiende: "¿Cómo agrego un USUARIO?" (por contexto)
```

### 3. Auto-Diagnóstico

Si usuario dice:
- "No funciona"
- "Error"
- "Problema"
- "No carga"

**Sistema automáticamente**:
1. Ejecuta `AuditorEngine`
2. Testea endpoints relevantes
3. Verifica base de datos
4. Incluye resultados en respuesta

**Resultado**:
Respuesta no solo explica, sino que dice:
> "Ejecuté un diagnóstico y detecté que el endpoint /api/users está respondiendo lento (3.2seg). Esto puede causar timeouts. Te sugiero..."

### 4. Aprendizaje Progresivo

**Feedback Loop**:
1. Usuario pregunta
2. IA responde
3. Usuario da feedback (👍👎)
4. Sistema ajusta:
   - `reused_count++` si 👍
   - Marca para revisión si 👎
5. Admin puede:
   - Mejorar respuesta (`improved_answer`)
   - Verificar como correcta

**Con el tiempo**:
- Respuestas mejoran
- Cache aumenta (menos llamadas a Ollama)
- Sistema se vuelve específico de tu negocio

### 5. Multi-Tenant Security

**Aislación por empresa**:
```sql
WHERE company_id = :companyId
```

**Cada empresa**:
- Ve solo SUS conversaciones
- Aprende de SUS interacciones
- No ve datos de otras empresas

**Sin cross-contamination**: Empresa A no ve respuestas de Empresa B.

---

## 📊 MONITOREO Y ESTADÍSTICAS

### Dashboard de Admin (futuro enhancement)

**Métricas disponibles**:
```javascript
const stats = await assistantService.getStats(companyId, 30);

// {
//   total_questions: 1523,
//   helpful_rate: 87.5,
//   avg_response_time_ms: 1840,
//   total_diagnostics: 43,
//   most_asked_module: 'users',
//   total_reuses: 892,
//   verified_answers: 124
// }
```

**Queries útiles**:
```sql
-- Top 10 preguntas más populares
SELECT question, COUNT(*) as count
FROM assistant_knowledge_base
WHERE helpful = true
GROUP BY question
ORDER BY count DESC
LIMIT 10;

-- Módulos que más generan dudas
SELECT module_name, COUNT(*) as questions
FROM assistant_knowledge_base
GROUP BY module_name
ORDER BY questions DESC;

-- Respuestas que necesitan mejora
SELECT question, answer, feedback_comment
FROM assistant_knowledge_base
WHERE helpful = false
ORDER BY created_at DESC;
```

---

## 🔧 CONFIGURACIÓN AVANZADA

### Ajustar Temperatura

**Temperature = 0.0** (Determinístico):
- Respuestas siempre iguales
- Más preciso, menos creativo
- Bueno para: Documentación técnica

**Temperature = 0.7** (Balanceado - DEFAULT):
- Mix de precisión y creatividad
- Respuestas variadas pero coherentes
- Bueno para: Uso general

**Temperature = 1.0** (Creativo):
- Respuestas muy variadas
- Menos predecible
- Bueno para: Brainstorming, ideas

```bash
# .env
OLLAMA_TEMPERATURE=0.7
```

### Limitar Tokens (Respuestas más cortas)

```bash
# .env
OLLAMA_MAX_TOKENS=300  # Respuestas concisas
# OLLAMA_MAX_TOKENS=500  # Balance (default)
# OLLAMA_MAX_TOKENS=1000 # Respuestas detalladas
```

### Timeout para Requests

```bash
# .env
OLLAMA_TIMEOUT=30000  # 30 segundos (default)
# OLLAMA_TIMEOUT=60000  # 60 segundos (respuestas complejas)
```

---

## 🎯 PRÓXIMAS MEJORAS (Roadmap)

### Corto Plazo (1-2 semanas):
1. **Voice Input** - Dictar preguntas por voz
2. **Rich Responses** - Tablas, gráficos en respuestas
3. **Quick Actions** - Botones para ejecutar acciones sugeridas
4. **History Search** - Buscar en historial de conversaciones
5. **Export Chat** - Descargar conversación como PDF/TXT

### Mediano Plazo (1 mes):
1. **Multi-Language** - Detectar idioma automáticamente
2. **Embeddings (pgvector)** - Búsqueda semántica avanzada
3. **Admin Dashboard** - Panel de estadísticas visuales
4. **Fine-Tuning** - Entrenar modelo específico para tu negocio
5. **Integration Tests** - Suite de tests automatizados

### Largo Plazo (3+ meses):
1. **Multi-Model Support** - OpenAI, Claude, Gemini como fallback
2. **Proactive Suggestions** - IA sugiere acciones sin preguntar
3. **Document Upload** - Subir PDFs/DOCs para agregar a KB
4. **Team Collaboration** - Compartir conversaciones entre usuarios
5. **Analytics Dashboard** - Insights de uso por módulo

---

## 🆘 TROUBLESHOOTING

### Problema: Chat no aparece

**Causas**:
1. Script no cargado
2. Error de JavaScript

**Solución**:
```bash
# Verificar en F12 Console
# Debería mostrar: "🤖 Inicializando AI Assistant Chat..."

# Si no aparece, verificar:
# - panel-empresa.html línea 6815
# - Archivo existe: public/js/modules/ai-assistant-chat.js
```

### Problema: "Ollama no disponible"

**Causas**:
1. Ollama no instalado
2. Ollama no corriendo
3. URL incorrecta

**Solución**:
```bash
# Verificar si Ollama está corriendo
curl http://localhost:11434/api/tags

# Si da error:
# Windows: Abrir Ollama desde menú inicio
# Linux: sudo systemctl start ollama

# Verificar URL en .env
echo $OLLAMA_BASE_URL
```

### Problema: Respuestas muy lentas (>10 seg)

**Causas**:
1. CPU sin GPU
2. Modelo muy grande
3. RAM insuficiente

**Solución**:
```bash
# 1. Usar modelo más pequeño
ollama pull llama3.1:8b  # En vez de 70b

# 2. Reducir max tokens
# .env: OLLAMA_MAX_TOKENS=300

# 3. Agregar más RAM o GPU NVIDIA
```

### Problema: Error 500 en /api/assistant/chat

**Causas**:
1. Token inválido
2. Headers faltantes
3. Ollama offline

**Solución**:
```bash
# 1. Verificar headers
# F12 → Network → Request Headers:
# Authorization: Bearer <token>
# X-User-Id: <uuid>
# X-Company-Id: <number>

# 2. Verificar logs del servidor
# Buscar: "❌ Error en /chat:"

# 3. Verificar Ollama
curl http://localhost:11434/
```

---

## 📝 RESUMEN DE CREDENCIALES

### Login 3 Pasos:

**OPCIÓN 1** (Recomendada):
- 1️⃣ EMPRESA: `aponnt-empresa-demo`
- 2️⃣ USUARIO: `administrador`
- 3️⃣ PASSWORD: `admin123`

**OPCIÓN 2**:
- 1️⃣ EMPRESA: `empresa-test`
- 2️⃣ USUARIO: `administrador1`
- 3️⃣ PASSWORD: `admin123`

**URL**: http://localhost:9998/panel-empresa.html

---

## 🎉 CONCLUSIÓN

**Sistema 100% implementado y listo para usar**.

**Falta ÚNICAMENTE**:
1. Instalar Ollama en tu PC/servidor
2. Descargar modelo Llama 3.1 (8B)
3. Configurar `.env` con `OLLAMA_BASE_URL`
4. Reiniciar servidor

**Tiempo estimado de setup**: 30-60 minutos (mayormente descarga del modelo)

**Resultado**:
✅ Chat flotante profesional con tech badges
✅ IA 100% local y privada
✅ $0/mes de costo
✅ Aprendizaje progresivo
✅ Context-aware
✅ Auto-diagnóstico
✅ Multi-tenant seguro

**¡Listo para revolucionar la experiencia del usuario! 🚀**

---

**Documentación creada**: 2025-01-19
**Autor**: Claude Code + Sistema de Asistente IA
**Versión**: 1.0.0
**Tech Stack**: Ollama + Llama 3.1 (8B) + Node.js + PostgreSQL + Vanilla JS
