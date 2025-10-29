# MÓDULO DE SOPORTE V2.0 - Sistema Completo con SLA, Escalamiento y Asistente Dual

## 🎯 ESTADO ACTUAL

### ✅ COMPLETADO AL 50%

**Base de datos:** 100% ✅
- 9 tablas creadas y operativas en Render PostgreSQL
- 8 funciones PostgreSQL automatizadas
- 2 triggers automáticos
- 3 planes de SLA pre-configurados

**Backend:** 0% ⏳
- Modelos Sequelize pendientes
- API REST pendiente

**Frontend:** 0% ⏳
- Interfaz de usuario pendiente

---

## 📊 ARQUITECTURA COMPLETA DEL SISTEMA

### FLUJO COMPLETO DE UN TICKET

```
1. Usuario crea ticket en panel-empresa.html
   ↓
2. Sistema detecta plan SLA de la empresa
   ↓
3. ¿Tiene asistente IA contratado?
   ├─ NO → Asistente Fallback (respuestas predefinidas)
   └─ SÍ → Asistente IA con Ollama
   ↓
4. Asistente intenta resolver el problema
   ↓
5. ¿Usuario satisfecho con respuesta?
   ├─ SÍ → Ticket cerrado, no escala
   └─ NO → Continuar escalamiento
   ↓
6. Ticket asignado a vendedor/soporte
   ↓
7. Sistema calcula 3 deadlines según SLA:
   - Primera respuesta (2-24 horas)
   - Resolución completa (8-72 horas)
   - Escalamiento automático (2-8 horas)
   ↓
8. Vendedor trabaja en el ticket
   ↓
9. ¿Responde dentro de deadline de escalamiento?
   ├─ SÍ → Continuar normal
   └─ NO → Escalamiento automático a supervisor
   ↓
10. ¿Vendedor puede resolver solo?
    ├─ SÍ → Marcar como resuelto
    └─ NO → Escalar manualmente a supervisor
    ↓
11. Usuario o admin cierra el ticket
    ↓
12. Usuario evalúa soporte (1-5 estrellas)
```

---

## 🗄️ SCHEMA DE BASE DE DATOS (9 TABLAS)

### TABLA 1: `support_tickets`

Tickets de soporte multi-tenant.

**Campos principales:**
```sql
ticket_id UUID PRIMARY KEY
ticket_number VARCHAR(50) UNIQUE -- "TICKET-2025-000001"
company_id INTEGER FK → companies
created_by_user_id UUID FK → users
module_name VARCHAR(100)
subject VARCHAR(500)
description TEXT
priority VARCHAR(20) -- low, medium, high, urgent
status VARCHAR(50) -- open, in_progress, waiting_customer, resolved, closed

-- Acceso temporal
allow_support_access BOOLEAN
temp_support_user_id UUID FK → users
temp_password_hash VARCHAR(255)
temp_password_expires_at TIMESTAMP

-- Asignación
assigned_to_vendor_id UUID FK → users
escalated_to_supervisor_id UUID FK → users

-- SLA
sla_first_response_deadline TIMESTAMP
sla_resolution_deadline TIMESTAMP
sla_escalation_deadline TIMESTAMP
first_response_at TIMESTAMP

-- Asistente IA
assistant_attempted BOOLEAN
assistant_resolved BOOLEAN

-- Evaluación
rating INTEGER CHECK (1-5)
rating_comment TEXT
rated_at TIMESTAMP
```

### TABLA 2: `support_ticket_messages`

Conversación dentro del ticket.

```sql
message_id UUID PRIMARY KEY
ticket_id UUID FK → support_tickets
user_id UUID FK → users
user_role VARCHAR(50) -- 'customer', 'support', 'admin'
message TEXT
attachments JSONB -- Array de URLs
is_internal BOOLEAN -- Notas internas
created_at TIMESTAMP
```

### TABLA 3: `support_activity_log`

Log transparente de actividad de soporte.

```sql
log_id UUID PRIMARY KEY
ticket_id UUID FK → support_tickets
support_user_id UUID FK → users
company_id INTEGER FK → companies
session_id UUID
session_started_at TIMESTAMP
session_ended_at TIMESTAMP
activity_type VARCHAR(100) -- 'login', 'view_module', 'edit_record', etc.
module_name VARCHAR(100)
action_description TEXT
affected_data JSONB
ip_address VARCHAR(45)
user_agent TEXT
created_at TIMESTAMP
```

### TABLA 4: `company_support_assignments`

Asignación de soporte por empresa.

```sql
assignment_id UUID PRIMARY KEY
company_id INTEGER FK → companies
support_type VARCHAR(50) -- 'original_vendor', 'other_vendor', 'aponnt_support'
assigned_vendor_id UUID FK → users
original_vendor_id UUID FK → users
is_active BOOLEAN
```

### TABLA 5: `support_vendor_stats`

Estadísticas de performance de soporte.

```sql
stat_id UUID PRIMARY KEY
vendor_id UUID FK → users
period_start DATE
period_end DATE
total_tickets INTEGER
tickets_resolved INTEGER
tickets_closed INTEGER
avg_resolution_time_hours DECIMAL
avg_rating DECIMAL(3,2) -- 1.00 a 5.00
calculated_at TIMESTAMP
```

### TABLA 6: `support_sla_plans` ⭐ NUEVA

Planes de SLA contratables.

```sql
plan_id UUID PRIMARY KEY
plan_name VARCHAR(100) UNIQUE -- 'standard', 'pro', 'premium'
display_name VARCHAR(200)

-- Tiempos SLA (en horas)
first_response_hours INTEGER
resolution_hours INTEGER
escalation_hours INTEGER

-- Comercial
price_monthly DECIMAL(10, 2)
has_ai_assistant BOOLEAN -- ¿Incluye IA con Ollama?
priority_level INTEGER

is_active BOOLEAN
```

**Planes pre-configurados:**

| Plan | Respuesta | Resolución | Escalamiento | Precio | Asistente IA |
|------|-----------|------------|--------------|--------|--------------|
| **Standard** | 24h | 72h | 8h | $0.00 (gratis) | ❌ Fallback |
| **Pro** | 8h | 24h | 4h | $29.99/mes | ✅ Ollama |
| **Premium** | 2h | 8h | 2h | $79.99/mes | ✅ Ollama |

### TABLA 7: `support_vendor_supervisors` ⭐ NUEVA

Jerarquía vendor → supervisor.

```sql
assignment_id UUID PRIMARY KEY
vendor_id UUID FK → users
supervisor_id UUID FK → users
assigned_at TIMESTAMP
is_active BOOLEAN
notes TEXT
```

### TABLA 8: `support_escalations` ⭐ NUEVA

Log de escalamientos.

```sql
escalation_id UUID PRIMARY KEY
ticket_id UUID FK → support_tickets
escalated_from_user_id UUID FK → users -- Vendedor
escalated_to_user_id UUID FK → users -- Supervisor
escalation_reason VARCHAR(100) -- 'sla_timeout', 'manual_escalation', 'no_response'
escalated_at TIMESTAMP
resolved_at TIMESTAMP
escalation_notes TEXT
resolution_notes TEXT
```

### TABLA 9: `support_assistant_attempts` ⭐ NUEVA

Log de intentos del asistente IA.

```sql
attempt_id UUID PRIMARY KEY
ticket_id UUID FK → support_tickets
assistant_type VARCHAR(50) -- 'fallback' o 'ai_powered'
user_question TEXT
assistant_response TEXT
confidence_score DECIMAL(3,2) -- 0.00 a 1.00
user_satisfied BOOLEAN -- true=resolvió, false=escalar, null=pendiente
user_feedback TEXT
attempted_at TIMESTAMP
responded_at TIMESTAMP
```

---

## 🔧 FUNCIONES POSTGRESQL (8 FUNCIONES)

### 1. `generate_ticket_number()`

Genera número único auto-incremental: `TICKET-2025-000001`

### 2. `get_company_support_vendor(company_id INTEGER)`

Retorna el vendedor asignado para dar soporte a una empresa.

### 3. `expire_temp_password_on_close()` (TRIGGER)

Expira la contraseña temporal automáticamente al cerrar el ticket.

### 4. `get_vendor_pending_tickets(vendor_id UUID)`

Lista todos los tickets pendientes de un vendedor ordenados por prioridad y antigüedad.

### 5. `calculate_sla_deadlines(company_id, created_at)` ⭐ NUEVA

Calcula los 3 deadlines de SLA según el plan contratado por la empresa.

**Retorna:**
- `first_response_deadline`
- `resolution_deadline`
- `escalation_deadline`

### 6. `get_vendor_supervisor(vendor_id UUID)` ⭐ NUEVA

Retorna el supervisor asignado de un vendedor.

### 7. `auto_escalate_tickets()` ⭐ NUEVA

Retorna todos los tickets que deben escalarse automáticamente por timeout.

**Condiciones para escalar:**
- Status: `open` o `in_progress`
- `sla_escalation_deadline < CURRENT_TIMESTAMP`
- `first_response_at IS NULL` (no ha habido respuesta)
- `escalated_to_supervisor_id IS NULL` (no escalado previamente)
- Vendedor tiene supervisor asignado

### 8. `get_company_assistant_type(company_id INTEGER)` ⭐ NUEVA

Retorna `'fallback'` o `'ai_powered'` según el plan SLA contratado.

---

## 🤖 SISTEMA DUAL DE ASISTENTE IA

### Modo 1: Fallback (Sin IA Comercial)

**Plan:** Standard ($0.00)

**Características:**
- Respuestas predefinidas basadas en `assistant_knowledge_base`
- Búsqueda por similitud de texto
- Sin Ollama/LLM
- Gratis, incluido por defecto

**Flujo:**
```javascript
const assistantType = await sequelize.query("SELECT get_company_assistant_type(:companyId)");

if (assistantType === 'fallback') {
  // Buscar respuestas en knowledge base
  const response = await AssistantKnowledgeBase.findOne({
    where: {
      question: { [Op.iLike]: `%${userQuestion}%` }
    },
    order: [['helpful_count', 'DESC']]
  });

  if (response) {
    return {
      answer: response.answer,
      confidence: 0.70, // Fijo para fallback
      source: 'knowledge_base'
    };
  } else {
    return {
      answer: "Lo siento, no tengo una respuesta específica. Por favor, crea un ticket para que nuestro equipo te ayude.",
      confidence: 0.00,
      source: 'default_fallback'
    };
  }
}
```

### Modo 2: AI-Powered (Con Ollama)

**Planes:** Pro ($29.99) y Premium ($79.99)

**Características:**
- Usa Ollama con modelo Llama 3.1 (8B)
- RAG (Retrieval Augmented Generation)
- Context-aware
- Auto-diagnóstico con AuditorEngine
- Confidence score dinámico

**Flujo:**
```javascript
if (assistantType === 'ai_powered') {
  // Buscar contexto relevante en knowledge base
  const context = await searchSimilarAnswers(userQuestion);

  // Generar respuesta con Ollama
  const response = await ollama.generate({
    model: 'llama3.1:8b',
    prompt: `
      Contexto previo:
      ${context.map(c => c.answer).join('\n')}

      Pregunta del usuario:
      ${userQuestion}

      Responde de forma clara y concisa en español.
    `,
    temperature: 0.7,
    max_tokens: 500
  });

  return {
    answer: response.text,
    confidence: calculateConfidence(response),
    source: 'ollama_llama3.1'
  };
}
```

### Flujo de Escalamiento con Asistente

```
1. Usuario crea ticket
   ↓
2. Sistema consulta plan de empresa
   ↓
3. Asistente (fallback o IA) intenta resolver
   ↓
4. Registrar intento en support_assistant_attempts
   ↓
5. Mostrar respuesta al usuario con botones:
   [✅ Esto resolvió mi problema] [❌ Necesito más ayuda]
   ↓
6. Si usuario hace click en "✅ Esto resolvió mi problema":
   - ticket.assistant_resolved = true
   - ticket.status = 'closed'
   - NO escalar a soporte
   ↓
7. Si usuario hace click en "❌ Necesito más ayuda":
   - ticket.assistant_resolved = false
   - Escalar a vendedor asignado
   - Iniciar SLA timers
```

---

## ⏱️ SISTEMA DE SLA Y ESCALAMIENTO

### Cálculo Automático de Deadlines

Al crear un ticket, el trigger `set_ticket_sla_deadlines()` calcula automáticamente:

```sql
-- Ejemplo para plan Pro (8h respuesta, 24h resolución, 4h escalamiento)
-- Ticket creado: 2025-01-23 10:00:00

sla_first_response_deadline = 2025-01-23 18:00:00  -- +8 horas
sla_resolution_deadline     = 2025-01-24 10:00:00  -- +24 horas
sla_escalation_deadline     = 2025-01-23 14:00:00  -- +4 horas
```

### Escalamiento Automático

**Cron Job** (ejecutar cada 5 minutos):

```javascript
// Detectar tickets que deben escalarse
const ticketsToEscalate = await sequelize.query("SELECT * FROM auto_escalate_tickets()");

for (const ticket of ticketsToEscalate) {
  // Escalar a supervisor
  await SupportTicket.update({
    escalated_to_supervisor_id: ticket.supervisor_id,
    status: 'in_progress'
  }, {
    where: { ticket_id: ticket.ticket_id }
  });

  // Registrar escalamiento
  await SupportEscalation.create({
    ticket_id: ticket.ticket_id,
    escalated_from_user_id: ticket.vendor_id,
    escalated_to_user_id: ticket.supervisor_id,
    escalation_reason: 'sla_timeout',
    escalation_notes: `Escalado automáticamente por timeout (${plan.escalation_hours}h sin respuesta)`
  });

  // Notificar a supervisor
  await Notification.create({
    user_id: ticket.supervisor_id,
    type: 'ticket_escalated',
    title: `Ticket escalado: ${ticket.ticket_number}`,
    message: `El ticket de ${companyName} fue escalado por timeout`,
    link: `/support/tickets/${ticket.ticket_id}`,
    priority: 'high'
  });
}
```

### Escalamiento Manual por Vendedor

```javascript
// Vendedor puede escalar manualmente
router.post('/api/support/tickets/:id/escalate', async (req, res) => {
  const ticket = await SupportTicket.findByPk(req.params.id);
  const supervisorId = await sequelize.query("SELECT get_vendor_supervisor(:vendorId)", {
    replacements: { vendorId: req.user.user_id }
  });

  if (!supervisorId) {
    return res.status(400).json({ error: 'No tienes supervisor asignado' });
  }

  await ticket.update({
    escalated_to_supervisor_id: supervisorId,
    status: 'in_progress'
  });

  await SupportEscalation.create({
    ticket_id: ticket.ticket_id,
    escalated_from_user_id: req.user.user_id,
    escalated_to_user_id: supervisorId,
    escalation_reason: 'manual_escalation',
    escalation_notes: req.body.notes
  });

  res.json({ success: true });
});
```

---

## 🏢 CONFIGURACIÓN DESDE PANEL ADMINISTRATIVO

### Asignar Plan SLA a Empresa

```javascript
// Panel Administrativo → Empresas → Editar → Plan de Soporte
router.patch('/api/admin/companies/:id/sla-plan', async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  const plan = await SupportSLAPlan.findOne({
    where: { plan_name: req.body.planName }
  });

  await company.update({
    support_sla_plan_id: plan.plan_id
  });

  res.json({ success: true, plan });
});
```

### Asignar Supervisor a Vendedor

```javascript
// Panel Administrativo → Soporte → Asignar Supervisor
router.post('/api/admin/support/assign-supervisor', async (req, res) => {
  await SupportVendorSupervisor.create({
    vendor_id: req.body.vendorId,
    supervisor_id: req.body.supervisorId,
    assigned_by_user_id: req.user.user_id,
    is_active: true
  });

  res.json({ success: true });
});
```

### Ver Tickets Escalados (Vista Supervisor)

```javascript
router.get('/api/support/supervisor/escalated-tickets', async (req, res) => {
  const tickets = await SupportTicket.findAll({
    where: {
      escalated_to_supervisor_id: req.user.user_id,
      status: { [Op.in]: ['open', 'in_progress'] }
    },
    include: [
      { model: Company, as: 'company' },
      { model: User, as: 'creator' },
      { model: User, as: 'vendor' },
      { model: SupportEscalation, as: 'escalations' }
    ],
    order: [['priority', 'ASC'], ['created_at', 'ASC']]
  });

  res.json(tickets);
});
```

---

## 📝 PRÓXIMOS PASOS (BACKEND Y FRONTEND)

### MODELOS SEQUELIZE (Pendiente)

Crear 9 archivos en `src/models/`:

1. `SupportTicket.js`
2. `SupportTicketMessage.js`
3. `SupportActivityLog.js`
4. `CompanySupportAssignment.js`
5. `SupportVendorStats.js`
6. `SupportSLAPlan.js` ⭐ NUEVO
7. `SupportVendorSupervisor.js` ⭐ NUEVO
8. `SupportEscalation.js` ⭐ NUEVO
9. `SupportAssistantAttempt.js` ⭐ NUEVO

### API REST (Pendiente)

Archivo: `src/routes/supportRoutes.js`

**Endpoints a crear:**

```
# Tickets
POST   /api/support/tickets                    - Crear ticket (con intento asistente)
GET    /api/support/tickets                    - Listar mis tickets
GET    /api/support/tickets/:id                - Detalle ticket
PATCH  /api/support/tickets/:id                - Actualizar ticket
POST   /api/support/tickets/:id/close          - Cerrar ticket
POST   /api/support/tickets/:id/rate           - Evaluar soporte (1-5 estrellas)
POST   /api/support/tickets/:id/escalate       - Escalar manualmente a supervisor

# Mensajes
POST   /api/support/tickets/:id/messages       - Enviar mensaje
GET    /api/support/tickets/:id/messages       - Ver conversación

# Activity Log
GET    /api/support/tickets/:id/activity       - Ver log de actividad

# Asistente IA
POST   /api/support/assistant/try-resolve      - Intentar resolver con asistente
POST   /api/support/assistant/feedback         - Dar feedback (resolvió o no)

# Supervisor
GET    /api/support/supervisor/escalated-tickets - Tickets escalados a mí
GET    /api/support/supervisor/my-vendors       - Vendedores bajo mi supervisión

# Admin
GET    /api/admin/support/sla-plans            - Listar planes
POST   /api/admin/support/assign-supervisor    - Asignar supervisor a vendedor
PATCH  /api/admin/companies/:id/sla-plan       - Cambiar plan SLA de empresa
GET    /api/admin/support/escalations          - Ver todos los escalamientos
```

### FRONTEND (Pendiente)

Archivo: `public/js/modules/support.js`

**3 Vistas:**

1. **Vista Cliente (Empresa)**:
   - Botón "Solicitar Soporte" en menú lateral
   - Formulario de creación de ticket
   - Modal con intento de asistente IA (fallback o Ollama)
   - Lista de mis tickets con badges de status y SLA
   - Detalle de ticket con conversación
   - Botón "Cerrar Ticket" (solo creador o admin)
   - Modal de evaluación (1-5 estrellas)

2. **Vista Vendedor/Soporte**:
   - Bandeja de tickets asignados
   - Vista kanban con columnas: Open, In Progress, Waiting Customer, Resolved
   - Contadores de SLA (tiempo restante en rojo/amarillo/verde)
   - Detalle de ticket con conversación
   - Botón "Escalar a Supervisor"
   - Acceso rápido a empresa (si autorizó acceso temporal)
   - Botón "Marcar como Resuelto"

3. **Vista Supervisor**:
   - Tickets escalados de todos mis vendedores
   - Priorización automática por SLA crítico
   - Estadísticas de vendedores bajo supervisión
   - Reasignar tickets a otros vendedores
   - Ver historial de escalamientos

---

## 📊 ESTADÍSTICAS Y MÉTRICAS

El sistema calculará:

### Por Vendedor:
- Total de tickets atendidos
- Tasa de resolución (resueltos / total)
- Tiempo promedio de primera respuesta
- Tiempo promedio de resolución completa
- % cumplimiento de SLA
- Rating promedio (1-5 estrellas)
- Tickets escalados (menor es mejor)

### Por Supervisor:
- Total de tickets escalados recibidos
- Tiempo promedio de resolución post-escalamiento
- Vendedores bajo supervisión
- Tickets críticos (superaron deadline de resolución)

### Por Empresa:
- Total de tickets abiertos
- Módulos con más problemas
- % de tickets resueltos por asistente IA (sin escalar)
- Tiempo promedio de resolución

### Global (Aponnt):
- Total de tickets del mes
- Vendedor con mejor rating
- Supervisor más eficiente
- % de uso de asistente IA
- ROI del asistente IA (tickets resueltos sin escalar)
- Módulo con más tickets (identificar bugs recurrentes)

---

## 🎉 RESUMEN DE LO COMPLETADO

### ✅ Base de Datos: 100%

- 9 tablas creadas en Render PostgreSQL
- 8 funciones PostgreSQL operativas
- 2 triggers automáticos
- 3 planes de SLA pre-configurados
- Todas las empresas tienen plan Standard asignado

### ⏳ Backend: 0%

- Modelos Sequelize pendientes
- API REST pendiente
- Integración con asistente IA pendiente

### ⏳ Frontend: 0%

- Interfaz de usuario pendiente

---

## 📂 ARCHIVOS CREADOS

1. `migrations/20251023_create_support_system.sql` (450 líneas)
2. `migrations/20251023_add_support_sla_escalation.sql` (400 líneas)
3. `scripts/run-support-migration.js` (90 líneas)
4. `scripts/run-support-sla-migration.js` (80 líneas)
5. `MODULO-SOPORTE-README.md` (documentación inicial)
6. `MODULO-SOPORTE-COMPLETO-V2.md` (este archivo - documentación completa)

---

## 🚀 ESTIMACIÓN DE TIEMPO RESTANTE

- **Modelos Sequelize:** 3-4 horas (9 modelos con relaciones)
- **API REST:** 6-8 horas (20+ endpoints)
- **Integración Asistente IA:** 2-3 horas
- **Frontend completo:** 10-12 horas (3 vistas completas)

**Total estimado:** 22-27 horas de desarrollo

---

**Fecha de creación:** 2025-01-23
**Versión:** 2.0
**Autor:** Claude Code
**Estado:** Schema 100% ✅ | Backend 0% ⏳ | Frontend 0% ⏳
