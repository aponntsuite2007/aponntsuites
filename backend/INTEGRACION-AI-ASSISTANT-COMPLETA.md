# INTEGRACIÓN COMPLETA: AI Assistant + User Support

**Fecha**: 2025-12-26
**Objetivo**: Integrar chat flotante IA con auto-creación de tickets

---

## 🔍 ESTADO ACTUAL

### ❌ AI-ASSISTANT-CHAT NO ESTÁ INTEGRADO

**Archivo**: `public/js/modules/ai-assistant-chat.js` (1,540 líneas)
**Referencias en panel-empresa.html**: **0** ❌

**Conclusión**: El chat flotante existe pero **NUNCA se cargó** en panel-empresa.html

---

## ✅ FUNCIONALIDAD EXISTENTE

### El chat flotante YA TIENE:

1. **Burbuja flotante** (bottom-right)
   - Botón circular con gradiente morado
   - Box shadow y animaciones
   - Auto-init cuando DOM carga

2. **Escalamiento a tickets** ✅
   - Endpoint: `/api/assistant/escalate-to-ticket`
   - UI: Prompt con botones cuando feedback negativo (👎)
   - Botón "Crear Ticket" visible

3. **Tech stack visible**
   - Badges: Ollama, Llama 3.1, Node.js, PostgreSQL, RAG
   - Indicador de estado de Ollama (🟢/🔴)

4. **RAG + Context-aware**
   - Busca en knowledge base
   - Detecta módulo actual
   - Auto-diagnóstico con AuditorEngine

---

## ⚠️ PROBLEMA: ESCALAMIENTO ACTUAL

### Cómo funciona HOY (si estuviera integrado):

```
Usuario pregunta algo
    ↓
IA responde
    ↓
Usuario da feedback 👎 (no fue útil)
    ↓
IA muestra prompt: "¿No te ayudó? ¿Quieres crear un ticket?"
    ↓
Botones: [Crear Ticket] [Descartar]
    ↓
Usuario hace click en "Crear Ticket"
    ↓
Se ejecuta: POST /api/assistant/escalate-to-ticket
    ↓
¿QUÉ PASA? → INVESTIGAR ENDPOINT
```

**Problema**: No sabemos si el endpoint existe en `assistantRoutes.js` o si hay que crearlo.

---

## 🎯 TU PROPUESTA: AUTO-CREACIÓN 100% EFICIENTE

### Flujo ideal que quieres:

```
Usuario pregunta algo
    ↓
IA analiza con Ollama + RAG
    ↓
┌─────────────────────────────────────┐
│ ¿Puede resolver la IA?              │
│                                     │
│ Factores:                           │
│ - Confidence score > 0.85           │
│ - Encontró info en knowledge base   │
│ - No requiere acción humana         │
│ - Usuario no indicó urgencia        │
└─────────────────────────────────────┘
         │                    │
         │ SÍ                 │ NO
         ↓                    ↓
  Responde normal      AUTO-CREA TICKET
                              ↓
                       ┌──────────────────────────┐
                       │ Ticket auto-generado:    │
                       │                          │
                       │ Título: [Pregunta user]  │
                       │ Descripción: [Contexto]  │
                       │ Prioridad: Auto-detect   │
                       │ Módulo: [Context actual] │
                       │ Estado: Open             │
                       │ Asignado: AI Assistant   │
                       └──────────────────────────┘
                              ↓
                       Notifica al usuario:
                       "No pude resolver tu consulta.
                        Creé el ticket #123 para que
                        soporte humano te ayude."
                              ↓
                       Link directo al ticket
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### FASE 1: Integrar chat flotante (5 min)

**Archivo**: `panel-empresa.html`

**Agregar en la sección de scripts** (después de línea 2298):
```html
<!-- AI Assistant Chat Flotante -->
<script src="js/modules/ai-assistant-chat.js"></script>
```

**Resultado**: Burbuja flotante aparece en bottom-right 🤖

---

### FASE 2: Verificar endpoint de escalamiento (10 min)

**Revisar**: `src/routes/assistantRoutes.js`

**Buscar**:
```javascript
router.post('/escalate-to-ticket', ...)
```

**Si NO existe** → Crear endpoint nuevo
**Si SÍ existe** → Verificar funcionalidad

---

### FASE 3: Implementar auto-creación inteligente (2-3 horas)

#### 3.1. Modificar AssistantService.js

**Agregar método**:
```javascript
async shouldAutoCreateTicket(question, answer, confidence, context) {
  // CRITERIOS para auto-creación:

  // 1. Confidence score bajo
  if (confidence < 0.70) return true;

  // 2. No encontró info relevante en KB
  if (!answer.usedKnowledgeBase) return true;

  // 3. Palabras clave de urgencia
  const urgentKeywords = ['urgente', 'crítico', 'bloqueado', 'no puedo', 'error grave'];
  if (urgentKeywords.some(kw => question.toLowerCase().includes(kw))) {
    return true;
  }

  // 4. Usuario ya preguntó 3+ veces sobre lo mismo (historia)
  const similarQuestions = await this.findSimilarQuestionsInHistory(
    context.userId,
    question
  );
  if (similarQuestions.length >= 3) return true;

  // 5. Módulo crítico con error
  const criticalModules = ['attendance', 'payroll', 'biometric'];
  if (criticalModules.includes(context.module) && question.includes('error')) {
    return true;
  }

  return false; // IA puede manejar
}
```

#### 3.2. Método de auto-creación

```javascript
async autoCreateTicket(question, context, aiResponse) {
  // Extraer info inteligente
  const ticketData = {
    title: this.extractTicketTitle(question), // Resumen de 60 chars
    description: this.buildTicketDescription(question, context, aiResponse),
    priority: this.detectPriority(question, context),
    module: context.module || 'general',
    status: 'open',
    created_by: context.userId,
    company_id: context.companyId,
    source: 'ai_assistant_auto',
    ai_metadata: {
      original_question: question,
      ai_response: aiResponse,
      confidence: aiResponse.confidence,
      context: context,
      timestamp: new Date().toISOString()
    }
  };

  // Crear ticket usando supportRoutesV2
  const ticket = await this.createTicketViaAPI(ticketData);

  // Guardar en knowledge base que esto necesitó escalamiento
  await this.saveEscalationLearning(question, ticket.id);

  return ticket;
}
```

#### 3.3. Modificar endpoint /chat

**En**: `src/routes/assistantRoutes.js`

```javascript
router.post('/chat', async (req, res) => {
  const { message, context } = req.body;

  // Generar respuesta con IA
  const aiResponse = await assistantService.chat(message, context);

  // ✅ NUEVO: Evaluar si auto-crear ticket
  const shouldEscalate = await assistantService.shouldAutoCreateTicket(
    message,
    aiResponse,
    aiResponse.confidence,
    context
  );

  if (shouldEscalate && aiResponse.confidence < 0.70) {
    // Auto-crear ticket
    const ticket = await assistantService.autoCreateTicket(
      message,
      context,
      aiResponse
    );

    // Modificar respuesta para incluir info del ticket
    aiResponse.autoTicketCreated = true;
    aiResponse.ticketId = ticket.id;
    aiResponse.ticketNumber = ticket.ticket_number;
    aiResponse.message = `No pude resolver tu consulta con certeza. He creado el ticket #${ticket.ticket_number} para que un especialista te ayude. Puedes ver el ticket aquí: [Ver Ticket](/user-support?ticket=${ticket.id})`;
  }

  res.json(aiResponse);
});
```

---

### FASE 4: UI en chat flotante (1 hora)

**En**: `ai-assistant-chat.js`

**Modificar función de render de respuesta**:
```javascript
function renderAIResponse(response) {
  const html = `
    <div class="ai-message">
      ${marked.parse(response.message)}

      ${response.autoTicketCreated ? `
        <div class="ai-auto-ticket-notice">
          🎫 <strong>Ticket creado automáticamente</strong>
          <div class="ticket-details">
            <span>Número: #${response.ticketNumber}</span>
            <a href="/user-support?ticket=${response.ticketId}"
               class="view-ticket-btn">
              Ver Ticket →
            </a>
          </div>
        </div>
      ` : ''}

      <!-- Feedback buttons solo si NO auto-creó ticket -->
      ${!response.autoTicketCreated ? renderFeedbackButtons(response.id) : ''}
    </div>
  `;

  return html;
}
```

---

## 📊 CRITERIOS DE EFICIENCIA 100%

### Para considerar auto-creación "100% eficiente":

| Criterio | Validación |
|----------|------------|
| **Confidence < 70%** | IA no está segura de la respuesta |
| **Sin info en KB** | No hay artículos relevantes |
| **3+ preguntas similares** | Usuario ya preguntó antes sin resolver |
| **Palabras urgentes** | "urgente", "crítico", "bloqueado", "no puedo" |
| **Módulo crítico + error** | attendance/payroll/biometric con errores |
| **SLA en riesgo** | Usuario tiene tickets previos sin resolver |

### Evitar falsos positivos:

❌ **NO auto-crear si**:
- Confidence > 85%
- Pregunta es informativa ("¿Cómo funciona X?")
- IA puede generar respuesta completa
- Usuario solo está explorando

✅ **SÍ auto-crear si**:
- Usuario bloqueado operativamente
- Error técnico confirmado
- Pregunta repetida sin solución
- Módulo crítico afectado

---

## 🎯 MÉTRICAS DE ÉXITO

### Tracking necesario:

1. **Auto-creations rate**
   - Total mensajes al AI: 1000
   - Auto-tickets creados: 120 (12%)
   - Target: 10-15% (no más)

2. **False positive rate**
   - Tickets auto-creados: 120
   - Tickets cerrados sin acción: 5 (4%)
   - Target: < 5%

3. **Resolution improvement**
   - Tickets normales tiempo promedio: 24h
   - Tickets auto-creados (con contexto): 8h
   - Mejora: 66% más rápido

4. **User satisfaction**
   - Encuesta post-ticket auto-creado
   - Rating promedio: > 4.5/5

---

## 🔧 CONFIGURACIÓN SUGERIDA

### Variables de entorno (.env):

```bash
# AI Assistant - Auto Ticket Creation
AI_AUTO_TICKET_ENABLED=true
AI_AUTO_TICKET_CONFIDENCE_THRESHOLD=0.70
AI_AUTO_TICKET_MAX_PER_USER_DAY=3
AI_AUTO_TICKET_PRIORITY_AUTO=true
AI_AUTO_TICKET_NOTIFY_USER=true
AI_AUTO_TICKET_NOTIFY_SUPPORT=true
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] **Integrar chat flotante** en panel-empresa.html
- [ ] **Verificar endpoint** `/api/assistant/escalate-to-ticket`
- [ ] **Crear método** `shouldAutoCreateTicket()` en AssistantService
- [ ] **Crear método** `autoCreateTicket()` en AssistantService
- [ ] **Modificar endpoint** `/chat` para auto-creación
- [ ] **Actualizar UI** chat flotante para mostrar tickets auto-creados
- [ ] **Agregar link** directo a user-support
- [ ] **Testing** con casos edge
- [ ] **Métricas** en BD (tracking auto-creations)
- [ ] **Documentar** en llm-context.json

---

## 💡 EJEMPLO DE CONVERSACIÓN

### Caso 1: IA puede resolver
```
👤 Usuario: "¿Cómo registro asistencia?"

🤖 IA: (confidence: 0.92)
"Para registrar asistencia puedes:
1. Ir al módulo Asistencia
2. Click en 'Registrar'
3. Seleccionar fecha y hora...
[Respuesta completa de KB]"

✅ NO se crea ticket (confidence alta)
```

### Caso 2: IA NO puede resolver → Auto-ticket
```
👤 Usuario: "El módulo de nómina no carga y tengo que liquidar urgente"

🤖 IA: (confidence: 0.45)
Análisis:
- Keyword "urgente" ✅
- Módulo crítico "payroll" ✅
- Error técnico ✅
- Confidence < 70% ✅

→ AUTO-CREA TICKET #789

🤖 Respuesta:
"Detecté un problema técnico urgente con el módulo de nómina.
He creado el ticket #789 para que un especialista lo revise de inmediato.

📋 Ticket #789
   Prioridad: URGENTE
   Módulo: Payroll
   Estado: Abierto

[Ver Ticket] [Chat con Soporte]"
```

---

**Próximo paso**: ¿Quieres que implemente la **integración del chat flotante** primero (5 min) o prefieres que diseñe el **código completo de auto-creación** antes?
