# 🔔 SISTEMA DE NOTIFICACIONES DE EXCELENCIA - DISEÑO COMPLETO V2.0

**Fecha creación:** 2025-10-16
**Fecha actualización:** 2025-10-16
**Versión:** 2.0 - AMPLIADO CON FUNCIONALIDADES DE ALTO IMPACTO
**Estado:** EN IMPLEMENTACIÓN

---

## 📋 RESUMEN EJECUTIVO

Sistema automatizado de notificaciones bidireccional empresa-empleado con múltiples canales, consentimiento GDPR-compliant, tracking completo con timestamp + hash encriptado, y funcionalidades avanzadas de compliance, SLA tracking, centro de costos, notificaciones proactivas y reportes de auditoría con validez legal.

### 🚀 NUEVAS FUNCIONALIDADES V2.0 (Alto Impacto Marketing)

1. **💎 Compliance Dashboard** - Panel de cumplimiento legal en tiempo real que previene multas laborales
2. **⏱️ SLA Tracking + Rankings** - Métricas de eficiencia de aprobadores y cuellos de botella
3. **💰 Centro de Costos** - Cálculo en tiempo real del costo de cada decisión
4. **🤖 Notificaciones Proactivas (IA Preventivo)** - Sistema detecta problemas ANTES de que ocurran
5. **📄 Reportes de Auditoría Exportables** - PDFs legales con firma digital y QR de verificación
6. **📅 Integración con Calendarios** - Sincronización automática con Google Calendar/Outlook
7. **🔌 Sistema Modular Plug & Play** - Todos los módulos premium son opcionales y funcionan sin dependencias hard-coded

---

## 🎯 CAMPOS EN FICHA PERSONAL DEL EMPLEADO

### Obligatorios:
1. **Email** (obligatorio) - Para notificaciones formales
2. **Web Empresa** (obligatorio) - Usuario en portal web empresa

### Opcionales (complementarios):
3. **WhatsApp** (opcional)
4. **SMS** (opcional)
5. **APK Empleado** (opcional) - App móvil

### Campo de Preferencia:
6. **Canal Elegido** - El empleado selecciona cuál es su preferencia para notificaciones formales
   - Las opcionales NO anulan las obligatorias
   - Sirven como complemento

---

## 🔄 FLUJO DE CONSENTIMIENTO (GDPR Compliant)

### 1. Inicio del Circuito
**Trigger:**
- Al dar de alta al empleado
- O en cualquier momento posteriormente

**Acción:**
- Se envía email automático a la dirección registrada en ficha personal
- Solicita consentimiento para notificaciones formales

### 2. Contenido del Email de Consentimiento
```
Asunto: Consentimiento para Notificaciones Formales - [Empresa]

Estimado/a [Nombre Empleado],

Para mantenerlo/a informado/a sobre todos los aspectos importantes de su relación laboral,
necesitamos su consentimiento para enviar notificaciones formales a través de los siguientes canales:

OBLIGATORIOS:
☑️ Email: [email@registrado.com]
☑️ Portal Web Empresa: [usuario]

OPCIONALES (puede seleccionar los que desee):
☐ WhatsApp: [número si está registrado]
☐ SMS: [número si está registrado]
☐ App Móvil Empleado: [si está instalada]

Las notificaciones incluyen:
- Cambios de contraseña
- Suspensiones/sanciones
- Llamados de atención
- Cursos de capacitación
- Cambios en horarios/turnos
- Liquidaciones de sueldo
- Documentación importante
- Y otros eventos relevantes

[BOTÓN: ✅ ACEPTO] [BOTÓN: ❌ NO ACEPTO]

Si acepta, puede seleccionar los canales opcionales adicionales.

Nota: Sin su consentimiento, no podremos enviarle notificaciones formales.
```

### 3. Respuesta del Empleado
**Opción A: ACEPTA**
- Se habilitan canales obligatorios (Email + Web)
- Puede seleccionar opcionales (WS, SMS, APK)
- Se registra timestamp + hash del consentimiento
- Se activa el sistema de notificaciones

**Opción B: NO ACEPTA**
- No se habilitan notificaciones
- Se registra la negativa con timestamp + hash
- El sistema NO puede enviar notificaciones a ese empleado

---

## 🏗️ INTEGRACIÓN CON DASHBOARD BIOMÉTRICO

**Módulo actual:** Dashboard Biométrico > Consentimientos Biométricos

**Nueva sección a agregar:**
```
🔐 Consentimientos Biométricos
    ├── Consentimiento Captura Facial ✅
    ├── Consentimiento Huella Dactilar ✅
    └── 🆕 Consentimiento Notificaciones ⬅️ AGREGAR AQUÍ
```

**Tabla de gestión:**
| Empleado | Email | Canal Preferido | WS | SMS | APK | Estado | Fecha Consentimiento | Hash |
|----------|-------|----------------|----|----|-----|--------|---------------------|------|
| Juan Pérez | juan@mail.com | Email + Web | ✅ | ❌ | ✅ | ✅ Activo | 2025-01-15 10:30 | a3f5b... |

---

## 🤖 GENERACIÓN AUTOMÁTICA DE NOTIFICACIONES

### Eventos que Generan Notificaciones:

#### 1. Seguridad/Acceso
- ✉️ Cambio de contraseña (usuario o admin)
- ✉️ Reseteo de contraseña
- ✉️ Cambio de permisos/rol
- ✉️ Acceso desde nueva ubicación/dispositivo

#### 2. Recursos Humanos
- ✉️ Suspensión (con detalle de días y motivo)
- ✉️ Llamado de atención (formal/informal)
- ✉️ Sanción disciplinaria
- ✉️ Cambio de turno/horario
- ✉️ Asignación a nuevo departamento
- ✉️ Cambio de supervisor/manager

#### 3. Capacitación
- ✉️ Curso de capacitación asignado
- ✉️ Recordatorio de curso próximo (48h antes)
- ✉️ Certificado de capacitación disponible
- ✉️ Curso completado

#### 4. Documentación
- ✉️ Documento nuevo disponible (contrato, addendum)
- ✉️ Documento requiere firma
- ✉️ Documento firmado confirmado
- ✉️ Vencimiento de documentación (30 días antes)

#### 5. Asistencia
- ✉️ Marcación de entrada/salida (si configurado)
- ✉️ Tardanza registrada
- ✉️ Ausencia injustificada
- ✉️ Solicitud de permiso aprobada/rechazada

#### 6. Nómina
- ✉️ Liquidación de sueldo disponible
- ✉️ Recibo de sueldo generado
- ✉️ Cambio salarial
- ✉️ Bonificación/premio

#### 7. Vacaciones
- ✉️ Solicitud de vacaciones aprobada/rechazada
- ✉️ Recordatorio de vacaciones pendientes
- ✉️ Días de vacaciones acreditados

#### 8. Salud/Seguridad
- ✉️ Examen médico programado
- ✉️ Certificado médico vencido/por vencer
- ✉️ ART - Reporte de accidente
- ✉️ Licencia médica aprobada

#### 9. Evaluaciones
- ✉️ Evaluación de desempeño disponible
- ✉️ Feedback de evaluación
- ✉️ Objetivos actualizados

#### 10. Sistema
- ✉️ Actualización de política de empresa
- ✉️ Mantenimiento programado del sistema
- ✉️ Nueva funcionalidad disponible

---

## 📊 MÓDULO "NOTIFICACIONES COMPLETAS"

**Ubicación:** Menú principal > Notificaciones

### Funcionalidades:

#### 1. Envío de Notificaciones
- Envío individual
- Envío masivo (por departamento, rol, etc.)
- Envío programado (fecha/hora futura)
- Envío recurrente (semanal, mensual)

#### 2. Recepción de Notificaciones
- Bandeja de entrada (empleado)
- Notificaciones no leídas (badge contador)
- Marcar como leído/no leído
- Archivar notificaciones

#### 3. Templates de Notificaciones
- Templates predefinidos por tipo
- Variables dinámicas: {nombre}, {fecha}, {motivo}, etc.
- Multi-idioma (ES, EN, PT, DE, IT, FR)
- Editor visual de templates

#### 4. Filtros y Búsqueda
- Por tipo de notificación
- Por fecha (rango)
- Por empleado/departamento
- Por estado (enviada, leída, pendiente)
- Por canal (email, WS, SMS, APK, web)

---

## 🔒 SISTEMA DE TRACKING Y SEGURIDAD

### Deadline + Timestamp + Hash

**Cada notificación registra:**

```javascript
{
  notification_id: "NOT-2025-001234",
  employee_id: "EMP-ISI-001",
  type: "password_change",
  subject: "Cambio de contraseña realizado",
  content: "Su contraseña ha sido modificada exitosamente...",
  channels: ["email", "web", "whatsapp"],

  // TRACKING
  created_at: "2025-10-16T14:30:00.000Z",
  sent_at: "2025-10-16T14:30:05.123Z",
  read_at: "2025-10-16T15:45:00.000Z",
  deadline: "2025-10-23T14:30:00.000Z", // 7 días después

  // SEGURIDAD
  hash: "a3f5b8c9d2e1f4a7b8c9d2e1f4a7b8c9d2e1f4a7b8c9d2e1f4a7b8c9d2e1f4a7",
  hash_algorithm: "SHA-256",
  digital_signature: "base64_signature_here",

  // ENTREGA
  delivery_status: {
    email: {
      sent: true,
      delivered: true,
      opened: true,
      timestamp: "2025-10-16T15:45:00.000Z"
    },
    web: {
      sent: true,
      delivered: true,
      read: true,
      timestamp: "2025-10-16T15:45:00.000Z"
    },
    whatsapp: {
      sent: true,
      delivered: true,
      read: false,
      timestamp: null
    }
  },

  // METADATA
  priority: "high", // low, medium, high, urgent
  requires_action: true,
  action_taken: false,
  action_deadline: "2025-10-18T23:59:59.000Z",

  // AUDITORIA
  created_by: "SYSTEM",
  created_by_user_id: "admin@empresa.com",
  ip_address: "192.168.1.100",
  user_agent: "Chrome 118.0.0.0"
}
```

### LOG de Notificaciones (PostgreSQL)

**Tabla:** `notifications_log`

```sql
CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id VARCHAR(50) UNIQUE NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  company_id INTEGER NOT NULL,

  -- Contenido
  type VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  template_id INTEGER,

  -- Canales
  channels JSONB NOT NULL, -- ["email", "web", "whatsapp"]
  preferred_channel VARCHAR(20),

  -- Tracking temporal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,

  -- Seguridad y hash
  content_hash VARCHAR(255) NOT NULL,
  hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',
  digital_signature TEXT,
  encryption_key_id VARCHAR(100),

  -- Estado de entrega
  delivery_status JSONB,
  delivery_attempts INTEGER DEFAULT 0,
  last_delivery_attempt TIMESTAMP WITH TIME ZONE,

  -- Prioridad y acción
  priority VARCHAR(20) DEFAULT 'medium',
  requires_action BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  action_deadline TIMESTAMP WITH TIME ZONE,
  action_data JSONB,

  -- Auditoría
  created_by VARCHAR(100),
  created_by_user_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Indices
  CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_notifications_employee ON notifications_log(employee_id);
CREATE INDEX idx_notifications_company ON notifications_log(company_id);
CREATE INDEX idx_notifications_type ON notifications_log(type);
CREATE INDEX idx_notifications_created ON notifications_log(created_at DESC);
CREATE INDEX idx_notifications_deadline ON notifications_log(deadline);
CREATE INDEX idx_notifications_read ON notifications_log(read_at) WHERE read_at IS NULL;
```

### Generación de Hash

```javascript
// Función para generar hash encriptado
async function generateNotificationHash(notification) {
  const content = JSON.stringify({
    notification_id: notification.id,
    employee_id: notification.employee_id,
    type: notification.type,
    created_at: notification.created_at,
    content: notification.content
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

// Verificación de integridad
async function verifyNotificationIntegrity(notification, storedHash) {
  const calculatedHash = await generateNotificationHash(notification);
  return calculatedHash === storedHash;
}
```

---

## 🚨 CONDICIÓN CRÍTICA: CONSENTIMIENTO OBLIGATORIO

```javascript
// Verificación antes de enviar notificación
async function canSendNotification(employeeId) {
  const consent = await db.query(
    'SELECT consent_given FROM notification_consents WHERE employee_id = $1',
    [employeeId]
  );

  if (!consent || !consent.consent_given) {
    console.warn(`⚠️ Notificación bloqueada: Empleado ${employeeId} sin consentimiento`);

    // Registrar intento bloqueado
    await db.query(
      'INSERT INTO notification_attempts_blocked (employee_id, reason, timestamp) VALUES ($1, $2, NOW())',
      [employeeId, 'NO_CONSENT']
    );

    return false;
  }

  return true;
}

// Envío con validación
async function sendNotification(notification) {
  // VALIDAR CONSENTIMIENTO PRIMERO
  if (!await canSendNotification(notification.employee_id)) {
    throw new Error('NO_CONSENT: Employee has not given consent for notifications');
  }

  // Proceder con envío...
  await deliverNotification(notification);
}
```

---

## 📱 CANALES DE ENTREGA

### 1. Email (OBLIGATORIO)
- SMTP con autenticación
- Templates HTML responsive
- Tracking de apertura (pixel invisible)
- Tracking de clicks
- Retry automático (3 intentos)

### 2. Portal Web Empresa (OBLIGATORIO)
- Badge de notificaciones no leídas
- Centro de notificaciones con dropdown
- Vista de notificación completa
- Marcar leída/archivar
- Push notifications del browser

### 3. WhatsApp (OPCIONAL)
- WhatsApp Business API
- Templates pre-aprobados por WhatsApp
- Confirmación de lectura
- Mensajes con botones de acción

### 4. SMS (OPCIONAL)
- Gateway SMS (Twilio/AWS SNS)
- Máximo 160 caracteres
- URL corta con más info
- Confirmación de entrega

### 5. App Móvil (OPCIONAL)
- Firebase Cloud Messaging (FCM)
- Push notifications
- Badge contador
- Deep linking a sección específica

---

## 🎨 DISEÑO UI/UX

### Dashboard de Notificaciones

```
┌─────────────────────────────────────────────────┐
│ 🔔 Centro de Notificaciones                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Resumen                                      │
│  ├─ No leídas: 12                               │
│  ├─ Pendientes de acción: 3                     │
│  └─ Total: 147                                  │
│                                                  │
│  🔍 Filtros                                      │
│  [Tipo ▼] [Fecha ▼] [Estado ▼] [Canal ▼]      │
│                                                  │
│  📋 Lista de Notificaciones                     │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔴 URGENTE - Cambio de contraseña        │  │
│  │ Hace 2 horas · Email, Web                │  │
│  │ [Ver detalles]                           │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ 📘 Curso de capacitación asignado        │  │
│  │ Hace 1 día · Email, WhatsApp             │  │
│  │ [Acción requerida] Inscribirse antes     │  │
│  │ del 20/10/2025                           │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [Cargar más...]                                │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ STACK TECNOLÓGICO

### Backend
- **Node.js + Express** - API REST
- **PostgreSQL** - Base de datos principal
- **Redis** - Cola de notificaciones
- **Bull** - Job queue para envíos programados

### Email
- **Nodemailer** - SMTP
- **SendGrid/AWS SES** - Alternativa cloud

### WhatsApp
- **Twilio WhatsApp API**
- **Meta WhatsApp Business API**

### SMS
- **Twilio**
- **AWS SNS**

### Push Notifications
- **Firebase Cloud Messaging (FCM)**
- **OneSignal** - Alternativa

---

## 💎 FUNCIONALIDAD 1: COMPLIANCE DASHBOARD

### Objetivo
Panel de cumplimiento legal que muestra en tiempo real el estado de cumplimiento de todas las leyes laborales argentinas, previniendo multas costosas.

### Valor de Marketing
*"Sistema que previene multas laborales automáticamente - Ahorre hasta $500.000 por infracción evitada"*

### Implementación

**Tabla: compliance_rules**
```sql
CREATE TABLE compliance_rules (
    id SERIAL PRIMARY KEY,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    legal_reference VARCHAR(255), -- "Art. 197 LCT - Descanso entre jornadas"
    rule_type VARCHAR(30), -- 'rest_period', 'overtime_limit', 'vacation_expiry'
    severity VARCHAR(20), -- 'info', 'warning', 'critical'
    check_frequency VARCHAR(20), -- 'realtime', 'daily', 'weekly'
    fine_amount_min DECIMAL(10,2), -- Multa mínima si se viola
    fine_amount_max DECIMAL(10,2), -- Multa máxima
    validation_query TEXT, -- Query SQL para validar
    active BOOLEAN DEFAULT true
);
```

**Tabla: compliance_violations**
```sql
CREATE TABLE compliance_violations (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    rule_code VARCHAR(50) REFERENCES compliance_rules(rule_code),
    employee_id VARCHAR(100),
    violation_date TIMESTAMP DEFAULT NOW(),
    violation_data JSONB, -- Detalles específicos
    estimated_fine DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'exempted'
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    INDEX idx_company_active (company_id, status)
);
```

**Dashboard UI**
```
┌────────────────────────────────────────────────┐
│ 📊 PANEL DE CUMPLIMIENTO LEGAL                │
├────────────────────────────────────────────────┤
│ ✅ Cumplimiento General: 98.5%                │
│                                                │
│ ⚠️ ALERTAS CRÍTICAS (3)                       │
│ • 2 empleados cerca del límite de horas extra │
│ • 1 violación de descanso semanal detectada   │
│ • 5 vacaciones próximas a vencer (30 días)    │
│                                                │
│ 📈 MÉTRICAS DE RIESGO                         │
│ • Períodos de descanso: ✅ 100% cumplido     │
│ • Horas extra dentro de límite: ⚠️ 92%       │
│ • Licencias médicas documentadas: ✅ 100%    │
│ • Vacaciones otorgadas en plazo: ✅ 95%      │
│                                                │
│ 💰 RIESGO ESTIMADO DE MULTAS: $0             │
└────────────────────────────────────────────────┘
```

---

## ⏱️ FUNCIONALIDAD 2: SLA TRACKING + RANKINGS

### Objetivo
Medir tiempos de respuesta de supervisores, RRHH, etc. Mostrar rankings y cuellos de botella para optimizar procesos.

### Valor de Marketing
*"Identifique cuellos de botella en su organización - Reduzca tiempos de aprobación en 60%"*

### Implementación

**Tabla: sla_metrics**
```sql
CREATE TABLE sla_metrics (
    id SERIAL PRIMARY KEY,
    approver_id VARCHAR(100),
    approver_role VARCHAR(50),
    department_id INT,
    request_type VARCHAR(50),

    -- Métricas
    total_requests INT DEFAULT 0,
    avg_response_hours DECIMAL(10,2),
    median_response_hours DECIMAL(10,2),
    min_response_hours DECIMAL(10,2),
    max_response_hours DECIMAL(10,2),

    -- SLA
    sla_target_hours INT,
    within_sla_count INT DEFAULT 0,
    outside_sla_count INT DEFAULT 0,
    sla_compliance_percent DECIMAL(5,2),

    -- Período
    period_start DATE,
    period_end DATE,

    INDEX idx_approver_period (approver_id, period_start)
);
```

**Dashboard UI**
```
┌──────────────────────────────────────────────────┐
│ ⏱️ TIEMPOS DE RESPUESTA (últimos 30 días)       │
├──────────────────────────────────────────────────┤
│ Promedio empresa: 8.5 horas                     │
│ SLA definido: 24 horas                          │
│ Cumplimiento: 94%                                │
│                                                  │
│ 📊 RANKING DE APROBADORES                       │
│ 1. Carlos Gómez (Supervisor) - 4.2h promedio ✅│
│ 2. María López (RRHH) - 6.8h promedio ✅       │
│ 3. Pedro Ruiz (Supervisor) - 18.5h promedio ⚠️ │
│ 4. Ana Martín (RRHH) - 28.3h promedio ❌       │
└──────────────────────────────────────────────────┘
```

---

## 💰 FUNCIONALIDAD 3: CENTRO DE COSTOS EN TIEMPO REAL

### Objetivo
Mostrar cuánto CUESTA cada decisión en pesos reales. Permitir control presupuestario en tiempo real.

### Valor de Marketing
*"Controle costos laborales en tiempo real - Empresas reducen 15% del gasto en horas extra"*

### Implementación

**Tabla: cost_budgets**
```sql
CREATE TABLE cost_budgets (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    department_id INT,
    cost_category VARCHAR(50), -- 'overtime', 'leave', 'shift_swaps'
    budget_amount DECIMAL(10,2),
    period_start DATE,
    period_end DATE,
    current_spent DECIMAL(10,2) DEFAULT 0,
    alert_threshold_percent INT DEFAULT 90,
    INDEX idx_company_period (company_id, period_start)
);
```

**Tabla: cost_transactions**
```sql
CREATE TABLE cost_transactions (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    department_id INT,
    employee_id VARCHAR(100),
    notification_group_id UUID REFERENCES notification_groups(id),
    cost_category VARCHAR(50),
    amount DECIMAL(10,2),
    description TEXT,
    transaction_date TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    INDEX idx_company_date (company_id, transaction_date)
);
```

**Dashboard UI**
```
┌──────────────────────────────────────────────────┐
│ 💰 CENTRO DE COSTOS - Octubre 2025              │
├──────────────────────────────────────────────────┤
│ Total horas extra aprobadas: $485,320           │
│ Total licencias pagas: $125,000                  │
│ Total cambios de turno con costo: $42,500       │
│ ────────────────────────────────────────────────│
│ TOTAL MES: $652,820                              │
│ Presupuesto: $600,000                            │
│ Exceso: $52,820 (8.8%) ⚠️                       │
└──────────────────────────────────────────────────┘
```

---

## 🤖 FUNCIONALIDAD 4: NOTIFICACIONES PROACTIVAS (IA PREVENTIVO)

### Objetivo
Sistema detecta situaciones problemáticas ANTES de que ocurran y crea notificaciones automáticas.

### Valor de Marketing
*"Sistema con Inteligencia Preventiva - Detecta problemas ANTES de que ocurran"*

### Implementación

**Tabla: proactive_rules**
```sql
CREATE TABLE proactive_rules (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    rule_name VARCHAR(100),
    rule_type VARCHAR(50), -- 'vacation_expiry', 'overtime_limit', 'rest_violation'

    -- Condición que dispara la regla
    trigger_condition TEXT, -- Query SQL o lógica
    trigger_threshold JSONB, -- {"days_until_expiry": 45, "percentage": 90}

    -- Acción automática
    auto_action VARCHAR(50), -- 'create_notification', 'send_alert', 'block_action'
    notification_recipients JSONB, -- ["employee", "supervisor", "rrhh"]
    notification_template_id INT,

    -- Prioridad
    priority VARCHAR(20), -- 'low', 'medium', 'high', 'critical'

    active BOOLEAN DEFAULT true
);
```

**Ejemplos de reglas proactivas**:
- Empleado con 18 días de vacaciones sin usar que vencen en 45 días → Notifica automáticamente
- Empleado con 28h de horas extra este mes (límite 30h) → Alerta al supervisor
- Empleado trabajó hasta las 22:00, turno mañana 06:00 → BLOQUEA fichaje automáticamente

---

## 📄 FUNCIONALIDAD 5: REPORTES DE AUDITORÍA EXPORTABLES

### Objetivo
Exportar cadenas completas de notificaciones como PDFs legales con firmas digitales y QR de verificación.

### Valor de Marketing
*"Reportes con validez legal - Protéjase en auditorías y juicios laborales"*

### Implementación

**PDF generado incluye:**
- Cadena completa de mensajes con timestamps
- Hash SHA-256 de cada mensaje
- Firma digital del sistema
- QR code para verificación online
- Referencia legal (Ley 25.506 Firma Digital Argentina)
- Validación de integridad de toda la cadena

**Endpoint API:**
```
GET /api/notifications/groups/:groupId/export/pdf
→ Genera PDF con validez legal
```

---

## 📅 FUNCIONALIDAD 6: INTEGRACIÓN CON CALENDARIOS

### Objetivo
Cuando se aprueba un cambio de turno, permiso, etc., se sincroniza automáticamente con el calendario personal del empleado.

### Valor de Marketing
*"Sincronización automática con calendarios - Sus empleados siempre saben cuándo trabajar"*

### Implementación

**Integraciones:**
- Google Calendar API
- Microsoft Outlook API
- iCal/ICS export

**Tabla: calendar_integrations**
```sql
CREATE TABLE calendar_integrations (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL,
    calendar_provider VARCHAR(20), -- 'google', 'outlook', 'ical'
    access_token TEXT,
    refresh_token TEXT,
    calendar_id VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    UNIQUE(employee_id, calendar_provider)
);
```

---

## 🔌 SISTEMA MODULAR PLUG & PLAY

### Concepto Universal
**TODOS** los módulos premium son opcionales (excepto CORE). El sistema funciona perfectamente sin ellos.

### Regla Universal
```
SI módulo activo → Ejecutar función
SI módulo inactivo → Saltar y continuar
```

### Módulos CORE (siempre activos)
- `users` - Gestión de usuarios
- `attendance` - Control de asistencia
- `notifications` - Sistema de notificaciones
- `auth` - Autenticación

### Módulos PREMIUM (opcionales)
- `shift_compatibility` - Matriz de compatibilidad de tareas
- `art_integration` - Integración con ART
- `medical` - Gestión médica
- `visitors` - Control de visitas
- `payroll` - Nómina y liquidaciones
- `biometric_advanced` - Funciones avanzadas de biometría
- `reports_advanced` - Reportes avanzados
- `compliance_dashboard` - Dashboard de cumplimiento legal
- `sla_tracking` - Métricas de SLA y rankings
- `cost_center` - Centro de costos en tiempo real
- `proactive_notifications` - Notificaciones preventivas

### Tabla: system_modules
```sql
CREATE TABLE system_modules (
    id SERIAL PRIMARY KEY,
    module_code VARCHAR(50) UNIQUE NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'core', 'premium', 'integration'
    is_core BOOLEAN DEFAULT false,
    requires_license BOOLEAN DEFAULT true,
    depends_on_modules JSONB,
    optional_for_modules JSONB,
    config_schema JSONB,
    api_endpoints JSONB,
    version VARCHAR(20),
    active BOOLEAN DEFAULT true
);
```

### Tabla: company_modules
```sql
CREATE TABLE company_modules (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    module_code VARCHAR(50) NOT NULL REFERENCES system_modules(module_code),
    is_active BOOLEAN DEFAULT true,
    licensed_since TIMESTAMP DEFAULT NOW(),
    license_expires_at TIMESTAMP,
    module_config JSONB,
    user_limit INT,
    usage_count INT DEFAULT 0,
    UNIQUE(company_id, module_code)
);
```

---

## 📅 PLAN DE IMPLEMENTACIÓN V2.0 (IMPLEMENTACIÓN INMEDIATA)

### Fase 1: Base de Datos y Backend (Semana 1)
- [ ] Crear tablas: `notifications_log`, `notification_consents`, `notification_templates`
- [ ] API endpoints: crear, enviar, marcar leído, archivar
- [ ] Sistema de hash y encriptación
- [ ] Bull queue para procesamiento asíncrono

### Fase 2: Consentimientos (Semana 2)
- [ ] Integrar con Dashboard Biométrico > Consentimientos
- [ ] Email de solicitud de consentimiento
- [ ] Landing page de aceptación/rechazo
- [ ] Validación de consentimiento en todos los envíos

### Fase 3: Canales de Entrega (Semana 3)
- [ ] Email (SMTP + templates)
- [ ] Portal Web (UI + real-time)
- [ ] WhatsApp Business API
- [ ] SMS Gateway
- [ ] Push notifications móvil

### Fase 4: Automatización (Semana 4)
- [ ] Triggers automáticos por eventos
- [ ] Templates predefinidos
- [ ] Sistema de deadlines
- [ ] Retry automático

### Fase 5: UI/UX (Semana 5)
- [ ] Centro de notificaciones empleado
- [ ] Panel admin de notificaciones
- [ ] Filtros y búsqueda
- [ ] Estadísticas y reportes

### Fase 6: Testing y Deploy (Semana 6)
- [ ] Testing unitario
- [ ] Testing integración
- [ ] Testing de carga
- [ ] Deploy producción

---

## ✅ ESTADO ACTUAL

**PENDIENTE:** Primero completar sistema de traducciones multi-idioma

**Módulos a traducir antes:**
1. departments.js
2. shifts.js
3. dashboard.js
4. settings.js
5. + 22 módulos restantes

**Una vez completadas traducciones:** Iniciar Fase 1 del sistema de notificaciones

---

**Documento creado por:** Claude Code
**Revisión requerida:** Equipo de desarrollo
**Aprobación pendiente:** Product Owner
