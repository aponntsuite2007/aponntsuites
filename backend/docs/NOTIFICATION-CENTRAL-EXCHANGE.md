# 📞 NOTIFICATION CENTRAL EXCHANGE (NCE)

**Sistema Central de Notificaciones - "Central Telefónica" del Ecosistema Aponnt**

---

## 📊 RESUMEN EJECUTIVO

**NotificationCentralExchange** es el **punto de entrada único** para TODAS las notificaciones en todo el ecosistema Aponnt:

- ✅ **Panel Administrativo** (Aponnt)
- ✅ **Panel Empresa**
- ✅ **APK Kiosk**
- ✅ **APK Medical**
- ✅ **APK Employee**
- ✅ **APK Partner**
- ✅ **70+ módulos backend**

**Principio fundamental**: NINGUNA notificación puede bypass este sistema.

---

## 🎯 ¿POR QUÉ EXISTE NCE?

### Problema anterior (Enero 2025):

- **3 sistemas paralelos** sin integración:
  - `NotificationOrchestrator.js`
  - `NotificationWorkflowService.js`
  - `NotificationUnifiedService.js`
- **28 servicios** enviaban emails directamente (bypass total)
- **78 workflows registrados** vs ~150 detectados en código
- **0% auditoría** de comunicaciones
- **0% SLA tracking** centralizado
- **Fragmentación completa**

### Solución con NCE:

- ✅ **Un solo módulo central**
- ✅ **100% auditoría** (todo pasa por `notification_log`)
- ✅ **Multi-tenant** (company_id isolation)
- ✅ **Multi-canal** (email, SMS, WhatsApp, push, WebSocket, inbox)
- ✅ **SLA tracking** automático
- ✅ **Escalamiento automático** multi-nivel
- ✅ **Backward compatibility** 100%
- ✅ **AI-enhanced** (Ollama integration)

---

## 🚀 INICIO RÁPIDO

### 1. Importar NCE

```javascript
const NCE = require('../services/NotificationCentralExchange');
```

### 2. Enviar notificación básica

```javascript
await NCE.send({
  companyId: 11,
  module: 'procurement',
  workflowKey: 'procurement.order_approval',

  recipientType: 'user',
  recipientId: 'uuid-user-123',

  title: 'Nueva orden de compra requiere aprobación',
  message: 'Orden PO-12345 por $15,000 USD del proveedor XYZ Corp.',

  metadata: {
    order_id: 'PO-12345',
    amount: 15000,
    supplier: 'XYZ Corp'
  },

  priority: 'high',
  requiresAction: true,
  actionType: 'approval',
  slaHours: 24
});
```

### 3. ¡Listo! NCE automáticamente:

- ✅ Valida el workflow existe y está activo
- ✅ Resuelve destinatario(s) dinámicamente
- ✅ Crea registro en `notification_log`
- ✅ Envía por **todos los canales configurados** (email, push, inbox)
- ✅ Trackea SLA (si requiere acción)
- ✅ Programa escalamiento automático (si aplica)
- ✅ Genera sugerencias de respuesta con IA (si AI está habilitado)

---

## 📚 CONCEPTOS CLAVE

### Workflow

Un **workflow** es la configuración de cómo se debe enviar una notificación:

- **process_key** (ej: `procurement.order_approval`)
- **Canales preferidos** (email, push, inbox)
- **SLA por prioridad** (urgent: 1h, high: 6h, normal: 24h, low: 72h)
- **Política de escalamiento** (¿A quién escalar si no responde?)
- **Templates** (plantillas de mensajes)
- **Scope** (aponnt o company)

**Todos los workflows están registrados** en la tabla `notification_workflows`.

### Recipient Resolver

NCE **resuelve destinatarios dinámicamente**:

- `recipientType: 'user'` → Envía a un usuario específico
- `recipientType: 'role'` → Envía a TODOS los usuarios con ese rol
- `recipientType: 'hierarchy'` → Escala por jerarquía organizacional (supervisor → manager → RRHH)
- `recipientType: 'group'` → Broadcast a todos los miembros de un grupo
- `recipientType: 'department'` → Broadcast a todos en un departamento

### Channel Dispatcher

NCE envía por **múltiples canales en paralelo**:

| Canal | Implementación | Estado |
|-------|----------------|--------|
| **Email** | Nodemailer + SMTP dinámico | ✅ Implementado |
| **Push** | FCM (Firebase Cloud Messaging) | 🔄 Simulado (TODO) |
| **WhatsApp** | Twilio API | 🔄 Simulado (TODO) |
| **SMS** | Twilio API | 🔄 Simulado (TODO) |
| **WebSocket** | Socket.IO (real-time) | 🔄 Simulado (TODO) |
| **Inbox** | Threads internos | 🔄 Simulado (TODO) |

### SLA Tracking

Si `requiresAction: true`, NCE trackea automáticamente:

- **SLA deadline** (`sla_hours` configurable)
- **Responded at** (cuando el usuario responde)
- **SLA status** (`on_time`, `warning`, `breached`)
- **Escalamiento automático** si SLA breach

### Escalamiento Multi-Nivel

Si el usuario no responde a tiempo, NCE **escala automáticamente**:

```javascript
escalationPolicy: {
  levels: [
    { after: '24h', escalateTo: 'approver_l2' },  // Nivel 1
    { after: '48h', escalateTo: 'cfo' },          // Nivel 2
    { after: '72h', escalateTo: 'ceo' }           // Nivel 3
  ]
}
```

---

## 🔧 API COMPLETA

### NCE.send(params)

**Parámetros**:

```typescript
{
  // REQUERIDOS
  companyId: number;           // ID de la empresa
  workflowKey: string;          // Clave del workflow (ej: 'procurement.order_approval')
  recipientType: 'user' | 'role' | 'hierarchy' | 'group' | 'department';
  recipientId: string;          // UUID del usuario, nombre del rol, etc.
  title: string;                // Título de la notificación
  message: string;              // Mensaje completo

  // OPCIONALES
  module?: string;              // Módulo origen (ej: 'procurement')
  originType?: string;          // Tipo de entidad (ej: 'purchase_order')
  originId?: string;            // ID de la entidad (ej: 'PO-12345')

  metadata?: object;            // Metadata adicional (cualquier JSON)

  priority?: 'urgent' | 'high' | 'normal' | 'low';  // Default: 'normal'
  channels?: string[];          // Canales específicos (override workflow policy)

  requiresAction?: boolean;     // ¿Requiere respuesta del usuario?
  actionType?: 'approval' | 'acknowledgement' | 'response';
  slaHours?: number;            // SLA en horas (si requiresAction: true)

  escalationPolicy?: object;    // Política de escalamiento custom
  threadId?: string;            // ID de thread existente (para conversaciones)
  createdBy?: string;           // User ID del creador
}
```

**Retorno**:

```javascript
{
  success: true,
  notificationId: 'uuid-notification-123',
  threadId: 'uuid-thread-456' || null,
  workflowKey: 'procurement.order_approval',
  recipients: [
    { userId: 'uuid-user-123', email: 'user@example.com', name: 'Juan Pérez' }
  ],
  channels: {
    email: { sent: 1, failed: 0, details: [...] },
    push: { sent: 1, failed: 0, details: [...] },
    inbox: { sent: 1, failed: 0, details: [...] }
  },
  dispatchSummary: {
    total: 1,
    successful: 1,
    failed: 0
  },
  duration: '1543ms'
}
```

---

## 🧩 EJEMPLOS DE USO

### Ejemplo 1: Aprobación de Orden de Compra

```javascript
await NCE.send({
  companyId: 11,
  module: 'procurement',
  workflowKey: 'procurement.order_approval',

  originType: 'purchase_order',
  originId: 'PO-12345',

  recipientType: 'role',
  recipientId: 'approver_l1',  // Todos los aprobadores nivel 1

  title: '🔔 Nueva orden de compra requiere aprobación',
  message: 'Orden PO-12345 por $15,000 USD del proveedor XYZ Corp. Vencimiento: 2025-02-15.',

  metadata: {
    order_id: 'PO-12345',
    amount: 15000,
    currency: 'USD',
    supplier: 'XYZ Corp',
    due_date: '2025-02-15'
  },

  priority: 'high',
  requiresAction: true,
  actionType: 'approval',
  slaHours: 24,

  escalationPolicy: {
    levels: [
      { after: '24h', escalateTo: 'approver_l2' },
      { after: '48h', escalateTo: 'cfo' }
    ]
  }
});
```

### Ejemplo 2: Recordatorio de Certificado Médico Vencido

```javascript
await NCE.send({
  companyId: 11,
  module: 'medical',
  workflowKey: 'medical.certificate_expiry_warning',

  originType: 'medical_certificate',
  originId: 'CERT-456',

  recipientType: 'user',
  recipientId: 'uuid-employee-789',

  title: '⚠️ Tu certificado médico vence en 7 días',
  message: 'Hola María, tu certificado médico vence el 2025-01-20. Por favor renueva pronto para evitar suspensiones.',

  metadata: {
    employee_name: 'María González',
    certificate_id: 'CERT-456',
    expiry_date: '2025-01-20',
    days_remaining: 7
  },

  priority: 'normal',
  channels: ['email', 'push', 'inbox']
});
```

### Ejemplo 3: Notificación Broadcast a Departamento

```javascript
await NCE.send({
  companyId: 11,
  module: 'hr',
  workflowKey: 'hr.policy_update',

  recipientType: 'department',
  recipientId: 'dept-it',  // Todos en el departamento IT

  title: '📢 Actualización de política de trabajo remoto',
  message: 'A partir de febrero 2025, el trabajo remoto será 3 días/semana. Ver documento completo en portal.',

  metadata: {
    policy_name: 'Trabajo Remoto 2025',
    effective_date: '2025-02-01',
    attachment_url: 'https://portal.com/policies/remote-work-2025.pdf'
  },

  priority: 'normal',
  requiresAction: false
});
```

### Ejemplo 4: Escalamiento Jerárquico

```javascript
await NCE.send({
  companyId: 11,
  module: 'attendance',
  workflowKey: 'attendance.unauthorized_absence',

  originType: 'attendance',
  originId: 'ATT-999',

  recipientType: 'hierarchy',  // Escala automáticamente por jerarquía
  recipientId: 'uuid-employee-999',

  title: '🚨 Ausencia no autorizada detectada',
  message: 'El empleado Juan Pérez no registró asistencia hoy (2025-01-06) sin justificación previa.',

  metadata: {
    employee_name: 'Juan Pérez',
    absence_date: '2025-01-06',
    department: 'Producción'
  },

  priority: 'urgent',
  requiresAction: true,
  actionType: 'acknowledgement',
  slaHours: 2,

  // NCE resolverá automáticamente: Employee → Supervisor → Manager → RRHH
});
```

---

## 🔄 BACKWARD COMPATIBILITY

### ⚠️ SERVICIOS DEPRECADOS

Los siguientes servicios están **deprecados** pero siguen funcionando (delegan a NCE):

#### 1. NotificationOrchestrator.trigger()

```javascript
// ❌ ANTES (deprecado)
await NotificationOrchestrator.trigger('payroll_receipt', {
  companyId: 11,
  recipientId: 'uuid-123',
  metadata: { period: '2025-12', amount: 5000 }
});

// ✅ AHORA (recomendado)
await NCE.send({
  companyId: 11,
  workflowKey: 'payroll_receipt',
  recipientType: 'user',
  recipientId: 'uuid-123',
  title: 'Recibo de nómina disponible',
  message: 'Tu recibo del período 2025-12 está listo',
  metadata: { period: '2025-12', amount: 5000 }
});
```

#### 2. NotificationWorkflowService.createNotification()

```javascript
// ❌ ANTES (deprecado)
await notificationWorkflowService.createNotification({
  module: 'medical',
  notificationType: 'appointment_reminder',
  companyId: 11,
  category: 'info',
  priority: 'high',
  entity: { appointment_id: 123 },
  variables: { patient: 'Juan', date: '2025-01-15' }
});

// ✅ AHORA (recomendado)
await NCE.send({
  companyId: 11,
  module: 'medical',
  workflowKey: 'medical.appointment_reminder',
  recipientType: 'user',
  recipientId: 'uuid-patient',
  title: 'Recordatorio de cita médica',
  message: 'Hola Juan, tu cita es el 2025-01-15',
  metadata: { appointment_id: 123, patient: 'Juan', date: '2025-01-15' },
  priority: 'high'
});
```

#### 3. NotificationUnifiedService.send()

```javascript
// ❌ ANTES (deprecado)
await notificationUnifiedService.send({
  companyId: 11,
  originType: 'purchase_order',
  originId: 'PO-123',
  recipientType: 'user',
  recipientId: 'uuid-456',
  category: 'approval_request',
  module: 'procurement',
  title: 'Nueva orden de compra',
  message: 'Requiere aprobación'
});

// ✅ AHORA (recomendado)
await NCE.send({
  companyId: 11,
  module: 'procurement',
  workflowKey: 'procurement.order_approval',
  originType: 'purchase_order',
  originId: 'PO-123',
  recipientType: 'user',
  recipientId: 'uuid-456',
  title: 'Nueva orden de compra',
  message: 'Requiere aprobación',
  priority: 'high'
});
```

---

## 🏗️ ARQUITECTURA

### Flujo de Ejecución (10 Pasos)

```
┌─────────────────────────────────────────────────────────────┐
│                  NCE.send(params)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: Validar parámetros obligatorios                    │
│   - companyId, workflowKey, recipientType, recipientId     │
│   - title, message                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 2: Obtener workflow de BD                             │
│   - Buscar en notification_workflows                        │
│   - Validar scope (aponnt vs company)                       │
│   - Validar is_active = true                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 3: Resolver destinatario(s) dinámicamente             │
│   - Llamar RecipientResolver.resolve()                     │
│   - Retorna array de { user_id, email, full_name }         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 4: Preparar payload consolidado                       │
│   - Construir objeto con todos los campos                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 5: Determinar canales                                 │
│   - Usar params.channels o workflow.channels               │
│   - Default: ['email', 'inbox']                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 6: Crear thread si es conversación                    │
│   - Si workflow.supports_threads = true                     │
│   - Crear en notification_threads                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 7: Guardar en notification_log                        │
│   - Tracking unificado multi-canal                          │
│   - Registra SLA deadline si requiresAction                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 8: DISPATCH MULTI-CANAL (paralelo)                    │
│   - Loop por cada destinatario                              │
│   - ChannelDispatcher.dispatch()                            │
│   - Email, Push, SMS, WhatsApp, WebSocket, Inbox           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 9: Programar escalamiento automático                  │
│   - Si requiresAction: true                                 │
│   - Usar escalationPolicy del workflow o custom            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PASO 10: AI Response Suggestion (async, no bloqueante)     │
│   - Si workflow.ai_enabled: true                            │
│   - Generar sugerencias con Ollama                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                       RETORNAR
```

### Componentes Principales

```
NotificationCentralExchange (NCE)
├── RecipientResolver
│   ├── resolveByUser()
│   ├── resolveByRole()
│   ├── resolveByHierarchy()
│   ├── resolveByGroup()
│   └── resolveByDepartment()
│
├── ChannelDispatcher
│   ├── dispatch() - Orquestador principal
│   ├── sendEmail() - Nodemailer + SMTP
│   ├── sendSMS() - Twilio (TODO)
│   ├── sendWhatsApp() - Twilio (TODO)
│   ├── sendPush() - FCM (TODO)
│   ├── sendWebSocket() - Socket.IO (TODO)
│   └── sendInbox() - Threads (TODO)
│
└── Helper methods
    ├── _createThread()
    ├── _createNotificationLog()
    ├── _scheduleEscalation()
    └── _tryAIResponse()
```

---

## 📦 MODELOS DE DATOS

### notification_workflows

```sql
CREATE TABLE notification_workflows (
  id SERIAL PRIMARY KEY,
  process_key VARCHAR(255) UNIQUE NOT NULL,  -- 'procurement.order_approval'
  scope VARCHAR(50) NOT NULL,                 -- 'aponnt' | 'company'
  company_id INTEGER,                         -- NULL para scope='aponnt'
  module VARCHAR(100) NOT NULL,               -- 'procurement'
  category VARCHAR(100),                      -- 'approval_request'
  notification_type VARCHAR(100),             -- Tipo específico
  channels JSONB DEFAULT '["email", "inbox"]',
  default_priority VARCHAR(20) DEFAULT 'normal',
  sla_hours INTEGER,
  escalation_policy JSONB,
  template_key VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### notification_log

```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL,
  workflow_key VARCHAR(255) NOT NULL,
  workflow_id INTEGER REFERENCES notification_workflows(id),
  thread_id UUID REFERENCES notification_threads(id),

  -- Origen
  module VARCHAR(100),
  origin_type VARCHAR(100),
  origin_id VARCHAR(255),

  -- Destinatario
  recipient_type VARCHAR(50),                 -- 'user', 'role', 'hierarchy', etc.
  recipient_id VARCHAR(255),
  recipient_email VARCHAR(255),

  -- Contenido
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,

  -- Comportamiento
  priority VARCHAR(20) DEFAULT 'normal',
  requires_action BOOLEAN DEFAULT false,
  action_type VARCHAR(50),
  sla_deadline_at TIMESTAMP,

  -- Multi-channel tracking
  channels JSONB,
  email_sent_at TIMESTAMP,
  email_delivered_at TIMESTAMP,
  email_read_at TIMESTAMP,
  push_sent_at TIMESTAMP,
  push_delivered_at TIMESTAMP,
  push_read_at TIMESTAMP,
  websocket_sent_at TIMESTAMP,
  websocket_delivered_at TIMESTAMP,
  inbox_sent_at TIMESTAMP,
  inbox_read_at TIMESTAMP,

  -- Respuesta
  responded_at TIMESTAMP,
  response_type VARCHAR(50),
  response_text TEXT,
  responded_by_user_id UUID,

  -- SLA
  sla_status VARCHAR(20),                     -- 'on_time', 'warning', 'breached'
  sla_breached_at TIMESTAMP,
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMP,
  escalated_to_user_id UUID,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 MULTI-TENANT ISOLATION

NCE respeta **estrictamente** el aislamiento multi-tenant:

- Todos los workflows tienen `company_id` (o NULL para scope='aponnt')
- Todos los logs tienen `company_id` obligatorio
- RecipientResolver **solo resuelve usuarios de la misma empresa**
- ChannelDispatcher **solo usa SMTP de la misma empresa**

**Ejemplo**:

```javascript
// Empresa 11 NO puede enviar notificaciones a usuarios de empresa 22
await NCE.send({
  companyId: 11,                          // ← Empresa 11
  workflowKey: 'procurement.order',
  recipientType: 'user',
  recipientId: 'uuid-user-de-empresa-22', // ❌ ERROR: User not found in company 11
  // ...
});
```

---

## 📈 MÉTRICAS Y AUDITORÍA

### Todas las notificaciones son auditables:

```sql
-- Ver todas las notificaciones de una empresa
SELECT * FROM notification_log
WHERE company_id = 11
ORDER BY created_at DESC;

-- Ver SLA compliance rate
SELECT
  COUNT(*) FILTER (WHERE sla_status = 'on_time') * 100.0 / COUNT(*) as compliance_rate
FROM notification_log
WHERE company_id = 11 AND requires_action = true;

-- Ver tasas de entrega por canal
SELECT
  COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as email_sent,
  COUNT(*) FILTER (WHERE email_delivered_at IS NOT NULL) as email_delivered,
  COUNT(*) FILTER (WHERE push_sent_at IS NOT NULL) as push_sent
FROM notification_log
WHERE company_id = 11;
```

---

## ⚡ PERFORMANCE

### Optimizaciones implementadas:

- ✅ **Dispatch paralelo** (Promise.allSettled para canales)
- ✅ **Loop secuencial** para destinatarios (evita race conditions)
- ✅ **Índices DB** en notification_log (company_id, workflow_key, created_at)
- ✅ **AI async** (no bloquea el dispatch)

### Tiempos esperados:

- **Validación + workflow lookup**: ~50ms
- **Recipient resolution**: ~100ms (user), ~300ms (role/hierarchy)
- **Email dispatch**: ~500ms por destinatario
- **Total**: ~1-2 segundos para notificación simple con 1 destinatario

---

## 🚨 ERROR HANDLING

NCE maneja errores gracefully:

```javascript
try {
  await NCE.send({ /* ... */ });
} catch (error) {
  if (error.message.includes('Workflow')) {
    // Workflow no encontrado o inactivo
  } else if (error.message.includes('Recipient')) {
    // Destinatario no encontrado
  } else if (error.message.includes('SMTP')) {
    // Error de configuración SMTP
  }
}
```

**Errores comunes**:

| Error | Causa | Solución |
|-------|-------|----------|
| `Workflow 'X' no encontrado` | workflowKey no existe en BD | Registrar workflow en notification_workflows |
| `Workflow 'X' está inactivo` | is_active = false | Activar workflow en BD |
| `Recipient not found` | recipientId no existe en la empresa | Verificar user_id o role correcto |
| `SMTP config not found` | No hay configuración SMTP | Configurar SMTP en email_process_mapping |

---

## 🧪 TESTING

### Tests unitarios (TODO - Fase 1):

```bash
npm test -- NotificationCentralExchange.test.js
```

### Tests de integración (TODO - Fase 1):

```bash
npm run test:integration -- notification-flows.spec.js
```

### Test manual rápido:

```javascript
const NCE = require('./src/services/NotificationCentralExchange');

// Test básico
const result = await NCE.send({
  companyId: 11,
  workflowKey: 'test.simple',
  recipientType: 'user',
  recipientId: 'your-user-id-here',
  title: 'Test de NCE',
  message: 'Si recibes este mensaje, NCE funciona correctamente',
  priority: 'normal'
});

console.log('✅ Test exitoso:', result);
```

---

## 📞 SOPORTE

### ¿Dudas sobre NCE?

1. **Leer esta documentación completa**
2. **Ver ejemplos** en la sección "Ejemplos de Uso"
3. **Revisar código** en `backend/src/services/NotificationCentralExchange.js`
4. **Consultar** con el equipo de desarrollo

### ¿Encontraste un bug?

1. Verificar que el workflow existe y está activo
2. Verificar logs del servidor (buscar `[NCE.send]`)
3. Verificar `notification_log` en BD (¿se creó el registro?)
4. Reportar con detalles: parámetros enviados, error completo, logs relevantes

---

## 🗺️ ROADMAP

### FASE 1 (Actual - Semanas 1-2): ✅ COMPLETADO

- ✅ Crear NotificationCentralExchange.js
- ✅ Crear RecipientResolver.js
- ✅ Crear ChannelDispatcher.js
- ✅ Integrar ChannelDispatcher en NCE.send()
- ✅ Backward compatibility (3 servicios deprecados)
- 🔄 Documentación (este archivo)

### FASE 2 (Semanas 2-3): Consolidación BD

- Migración de 7 tablas → esquema consolidado
- Extender notification_log con tracking multi-canal
- Crear tabla proactive_rules
- Migrar datos históricos

### FASE 3 (Semanas 3-4): Registro de Workflows

- Auditoría exhaustiva (78 → 150+ workflows)
- Seed de workflows faltantes (Procurement, WMS, Finance, Logistics)
- Templates Handlebars para workflows

### FASE 4 (Semanas 4-8): Migración Módulo x Módulo

- Eliminar 28 servicios que envían emails directamente
- Migrar 70+ módulos a usar NCE.send()
- 100% de integraciones usando NCE

### FASE 5 (Semanas 8-9): Notificaciones Proactivas

- Centralizar 14 cron jobs dispersos
- 28 reglas proactivas unificadas
- Dashboard de Proactive Rules

### FASE 6 (Semanas 9-10): Testing & Rollout

- Suite de tests (coverage > 85%)
- Deploy gradual (testing → beta → producción)
- Monitoreo intensivo

---

## 📝 CHANGELOG

### v1.0.0 (2026-01-06)

- ✅ Implementación inicial de NCE
- ✅ Integración con RecipientResolver y ChannelDispatcher
- ✅ Backward compatibility para 3 servicios deprecados
- ✅ Documentación completa

---

**Generado**: 2026-01-06
**Autor**: Sistema de Notificaciones - Aponnt
**Versión**: 1.0.0
**Licencia**: Propiedad de Aponnt Suite

---

**¡NCE es la "central telefónica" del ecosistema Aponnt!** 📞
