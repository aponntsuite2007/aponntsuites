# 📧 CIRCUITO COMPLETO DE EMAIL - De NCE.send() hasta el destinatario

**Fecha**: 2026-01-06
**Objetivo**: Trazar CADA PASO desde que se invoca NCE.send() hasta que el email llega al buzón del destinatario

---

## 🎬 PUNTO DE PARTIDA: Código que llama a NCE

```javascript
// EJEMPLO: Aprobación de orden de compra
await NCE.send({
  companyId: 11,
  module: 'procurement',
  workflowKey: 'procurement.order_approval',

  originType: 'purchase_order',
  originId: 'PO-12345',

  recipientType: 'role',
  recipientId: 'approver_l1',

  title: '🔔 Nueva orden requiere aprobación',
  message: 'Orden PO-12345 por $15,000 USD del proveedor XYZ Corp.',

  metadata: {
    order_id: 'PO-12345',
    amount: 15000,
    supplier: 'XYZ Corp'
  },

  priority: 'high',
  channels: ['email', 'push', 'inbox']
});
```

---

## 🔄 CIRCUITO COMPLETO (20 PASOS)

### 📍 PASO 1: NCE.send() - Validación de parámetros

**Archivo**: `NotificationCentralExchange.js` líneas 75-90

```javascript
// Validar parámetros obligatorios
if (!params.companyId) throw new Error('companyId es requerido');
if (!params.workflowKey) throw new Error('workflowKey es requerido');
if (!params.recipientType) throw new Error('recipientType es requerido');
if (!params.recipientId) throw new Error('recipientId es requerido');
if (!params.title) throw new Error('title es requerido');
if (!params.message) throw new Error('message es requerido');
```

**Output**: Parámetros validados ✅

---

### 📍 PASO 2: NCE.send() - Buscar workflow en BD

**Archivo**: `NotificationCentralExchange.js` líneas 95-120

**Query SQL**:
```sql
SELECT * FROM notification_workflows
WHERE process_key = 'procurement.order_approval'
  AND (
    (scope = 'aponnt' AND company_id IS NULL)
    OR (scope = 'company' AND company_id = 11)
  )
  AND is_active = true
LIMIT 1;
```

**Resultado ejemplo**:
```javascript
{
  id: 42,
  process_key: 'procurement.order_approval',
  scope: 'company',
  company_id: 11,
  module: 'procurement',
  channels: ['email', 'push', 'inbox'],
  default_priority: 'high',
  sla_hours: 24,
  escalation_policy: {
    levels: [
      { after: '24h', escalateTo: 'approver_l2' },
      { after: '48h', escalateTo: 'cfo' }
    ]
  },
  email_template_key: 'procurement_approval_request',
  is_active: true
}
```

**Output**: Workflow encontrado y activo ✅

---

### 📍 PASO 3: RecipientResolver.resolve() - Resolver destinatario(s)

**Archivo**: `NotificationRecipientResolver.js` líneas 50-85

**Como recipientType = 'role'**, llama a `resolveByRole()`:

**Query SQL**:
```sql
SELECT u.user_id, u.email, u.full_name, u.company_id
FROM users u
WHERE u.company_id = 11
  AND u.role = 'approver_l1'
  AND u.is_active = true
  AND u.email IS NOT NULL
  AND u.email_verified = true;
```

**Resultado ejemplo**:
```javascript
recipients = [
  {
    user_id: 'uuid-user-456',
    email: 'carlos.aprobador@empresa.com',
    full_name: 'Carlos Aprobador',
    company_id: 11
  },
  {
    user_id: 'uuid-user-789',
    email: 'maria.aprobadora@empresa.com',
    full_name: 'María Aprobadora',
    company_id: 11
  }
]
```

**Output**: 2 destinatarios resueltos ✅

---

### 📍 PASO 4: NCE.send() - Determinar canales

**Archivo**: `NotificationCentralExchange.js` líneas 157-158

```javascript
// Usar canales del request o del workflow
const channels = params.channels || workflow.channels || ['email', 'inbox'];
```

**Resultado**:
```javascript
channels = ['email', 'push', 'inbox']
```

**Output**: Canales determinados ✅

---

### 📍 PASO 5: NCE.send() - Crear registro en notification_log

**Archivo**: `NotificationCentralExchange.js` líneas 180-187

**INSERT SQL**:
```sql
INSERT INTO notification_log (
  company_id, workflow_key, workflow_id,
  module, origin_type, origin_id,
  recipient_type, recipient_id,
  title, message, metadata,
  priority, requires_action, action_type, sla_deadline_at,
  channels
) VALUES (
  11, 'procurement.order_approval', 42,
  'procurement', 'purchase_order', 'PO-12345',
  'role', 'approver_l1',
  '🔔 Nueva orden requiere aprobación', 'Orden PO-12345...', '{"order_id":"PO-12345",...}',
  'high', true, 'approval', '2026-01-07 16:00:00',
  '["email","push","inbox"]'
) RETURNING id;
```

**Resultado**:
```javascript
notificationLog = {
  id: 'uuid-notification-abc123',
  created_at: '2026-01-06 16:00:00'
}
```

**Output**: Log creado con ID `uuid-notification-abc123` ✅

---

### 📍 PASO 6: NCE.send() - Loop por destinatarios

**Archivo**: `NotificationCentralExchange.js` líneas 194-218

```javascript
for (const recipient of recipients) { // 2 destinatarios
  const dispatchResult = await this.channelDispatcher.dispatch({
    workflow,
    recipient,
    title: params.title,
    message: params.message,
    metadata: params.metadata,
    channels: ['email', 'push', 'inbox'],
    priority: 'high',
    logId: 'uuid-notification-abc123'
  });
}
```

**DESTINATARIO 1**: carlos.aprobador@empresa.com
**DESTINATARIO 2**: maria.aprobadora@empresa.com

---

### 📍 PASO 7: ChannelDispatcher.dispatch() - Orquestador de canales

**Archivo**: `NotificationChannelDispatcher.js` líneas 40-90

```javascript
async dispatch(params) {
  const { workflow, recipient, channels } = params;

  const dispatchPromises = channels.map(async (channel) => {
    if (channel === 'email') {
      return await this.sendEmail(params);
    }
    // ... otros canales
  });

  await Promise.allSettled(dispatchPromises);
}
```

**Output**: 3 dispatch promises (email, push, inbox) en paralelo ✅

---

## 📧 ENFOQUE EN EL CANAL EMAIL

### 📍 PASO 8: ChannelDispatcher.sendEmail() - Preparar email

**Archivo**: `NotificationChannelDispatcher.js` líneas 154-202

**Input**:
```javascript
{
  workflow: { /* workflow object */ },
  recipient: {
    user_id: 'uuid-user-456',
    email: 'carlos.aprobador@empresa.com',
    full_name: 'Carlos Aprobador'
  },
  title: '🔔 Nueva orden requiere aprobación',
  message: 'Orden PO-12345 por $15,000 USD...',
  metadata: { order_id: 'PO-12345', amount: 15000, supplier: 'XYZ Corp' },
  priority: 'high',
  logId: 'uuid-notification-abc123'
}
```

---

### 📍 PASO 9: ChannelDispatcher._getSmtpConfig() - Resolver SMTP

**Archivo**: `NotificationChannelDispatcher.js` líneas 203-252

**Flujo**:
```
workflow.scope = 'company'
   ↓
_getCompanySmtpConfig(company_id=11, process_key='procurement.order_approval')
```

---

### 📍 PASO 10: _getCompanySmtpConfig() - Buscar mapeo

**Archivo**: `NotificationChannelDispatcher.js` líneas 285-352

**PASO 10.1**: Buscar en `company_email_process_mapping`

**Query SQL**:
```sql
SELECT email_config_id, email_type
FROM company_email_process_mapping
WHERE company_id = 11
  AND process_key = 'procurement.order_approval'
LIMIT 1;
```

**Resultado ejemplo**:
```javascript
{
  email_config_id: 5,
  email_type: 'procurement'
}
```

---

### 📍 PASO 11: _getCompanySmtpConfig() - Obtener config SMTP

**Query SQL**:
```sql
SELECT * FROM company_email_config
WHERE company_id = 11
  AND config_id = 5
  AND is_active = true
LIMIT 1;
```

**Resultado ejemplo**:
```javascript
{
  config_id: 5,
  company_id: 11,
  email_type: 'procurement',
  institutional_email: 'compras@empresa.com',
  display_name: 'Departamento de Compras',
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_user: 'compras@empresa.com',
  smtp_password: 'bXlzZWNyZXRwYXNz', // Base64 encoded
  require_tls: true,
  is_active: true
}
```

---

### 📍 PASO 12: _getCompanySmtpConfig() - Desencriptar password

**Archivo**: `NotificationChannelDispatcher.js` línea 345

```javascript
const password = Buffer.from(config.smtp_password, 'base64').toString('utf8');
// password = 'mysecretpass'
```

**Output SMTP Config**:
```javascript
smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  username: 'compras@empresa.com',
  password: 'mysecretpass',
  fromEmail: 'compras@empresa.com',
  fromName: 'Departamento de Compras',
  requireTls: true
}
```

---

### 📍 PASO 13: sendEmail() - Crear transporter de Nodemailer

**Archivo**: `NotificationChannelDispatcher.js` líneas 165-176

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // port 587 usa STARTTLS
  auth: {
    user: 'compras@empresa.com',
    pass: 'mysecretpass'
  },
  tls: {
    rejectUnauthorized: true
  }
});
```

**Output**: Transporter configurado ✅

---

### 📍 PASO 14: sendEmail() - Renderizar template HTML

**Archivo**: `NotificationChannelDispatcher.js` líneas 420-580

```javascript
const emailContent = this._renderEmailTemplate({
  workflow,
  title: '🔔 Nueva orden requiere aprobación',
  message: 'Orden PO-12345 por $15,000 USD...',
  metadata: { order_id: 'PO-12345', amount: 15000, supplier: 'XYZ Corp' },
  priority: 'high',
  logId: 'uuid-notification-abc123'
});
```

**Resultado HTML**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .priority-high { border-left: 4px solid #ff9800; }
    .btn-approve { background: #28a745; color: white; padding: 10px 20px; }
    .btn-reject { background: #dc3545; color: white; padding: 10px 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚠️ 🔔 Nueva orden requiere aprobación</h2>
    </div>
    <div class="content priority-high">
      <p>Orden PO-12345 por $15,000 USD del proveedor XYZ Corp.</p>

      <div class="metadata">
        <strong>Orden:</strong> PO-12345<br>
        <strong>Monto:</strong> $15,000 USD<br>
        <strong>Proveedor:</strong> XYZ Corp
      </div>

      <div class="action-buttons">
        <a href="http://localhost:9998/api/notifications/uuid-notification-abc123/respond?action=approve"
           class="btn-approve">✅ Aprobar</a>
        <a href="http://localhost:9998/api/notifications/uuid-notification-abc123/respond?action=reject"
           class="btn-reject">❌ Rechazar</a>
      </div>
    </div>
    <div class="footer">
      <strong>Módulo:</strong> procurement<br>
      <strong>Proceso:</strong> Aprobación de orden de compra<br>
      <strong>Prioridad:</strong> Alta<br>
      <strong>SLA:</strong> 24 horas
    </div>
  </div>
</body>
</html>
```

**Subject**: `⚠️ 🔔 Nueva orden requiere aprobación`

---

### 📍 PASO 15: sendEmail() - Enviar email vía SMTP

**Archivo**: `NotificationChannelDispatcher.js` líneas 178-191

```javascript
const info = await transporter.sendMail({
  from: '"Departamento de Compras" <compras@empresa.com>',
  to: 'carlos.aprobador@empresa.com',
  subject: '⚠️ 🔔 Nueva orden requiere aprobación',
  text: 'Orden PO-12345 por $15,000 USD...', // Versión texto plano
  html: emailContent.html // HTML generado en PASO 14
});
```

**Nodemailer realiza**:
1. Conecta a `smtp.gmail.com:587`
2. Inicia STARTTLS
3. Autentica con `compras@empresa.com` / `mysecretpass`
4. Envía comando SMTP `MAIL FROM: <compras@empresa.com>`
5. Envía comando SMTP `RCPT TO: <carlos.aprobador@empresa.com>`
6. Envía contenido del email (headers + body)
7. Cierra conexión

**Response de SMTP**:
```javascript
info = {
  messageId: '<abc123def456@smtp.gmail.com>',
  accepted: ['carlos.aprobador@empresa.com'],
  rejected: [],
  response: '250 2.0.0 OK 1234567890 qwerty'
}
```

**Output**: Email aceptado por servidor SMTP ✅

---

### 📍 PASO 16: Servidor SMTP (Gmail) procesa email

**Ubicación**: Servidores de Gmail (smtp.gmail.com)

**Proceso Gmail**:
1. ✅ Valida SPF (Sender Policy Framework)
2. ✅ Valida DKIM (DomainKeys Identified Mail)
3. ✅ Valida DMARC
4. ✅ Escanea por spam/virus
5. ✅ Determina bandeja (Inbox, Spam, Promotions)
6. ✅ Enruta a servidor de destino

**Resultado**: Email pasa validaciones, va a Inbox ✅

---

### 📍 PASO 17: Gmail enruta a servidor de destino

**Proceso**:
1. Gmail hace lookup DNS MX de `empresa.com`:
   ```
   empresa.com.  MX  10  mail.empresa.com.
   ```
2. Gmail conecta a `mail.empresa.com:25` (SMTP)
3. Gmail envía email al servidor del destinatario
4. Servidor del destinatario acepta email

**Response**:
```
250 2.0.0 OK: queued as ABC123XYZ
```

---

### 📍 PASO 18: Servidor de email del destinatario procesa

**Ubicación**: `mail.empresa.com` (servidor de email de la empresa)

**Proceso**:
1. ✅ Recibe email de Gmail
2. ✅ Valida headers
3. ✅ Escanea por virus/spam
4. ✅ Aplica filtros corporativos
5. ✅ Almacena en buzón del usuario `carlos.aprobador@empresa.com`

**Resultado**: Email almacenado en buzón ✅

---

### 📍 PASO 19: Cliente de email del destinatario descarga

**Cliente**: Outlook, Gmail web, Thunderbird, etc.

**Protocolo**: IMAP o POP3

**Proceso**:
1. Cliente conecta a `mail.empresa.com:993` (IMAP SSL)
2. Autentica como `carlos.aprobador@empresa.com`
3. Descarga nuevos emails de bandeja Inbox
4. Renderiza HTML del email

**Resultado**: Destinatario VE el email en su cliente ✅

---

### 📍 PASO 20: Destinatario lee email y toma acción

**Cliente de email muestra**:

```
De: Departamento de Compras <compras@empresa.com>
Para: Carlos Aprobador <carlos.aprobador@empresa.com>
Asunto: ⚠️ 🔔 Nueva orden requiere aprobación
Fecha: 6 de enero de 2026, 16:00

[Contenido HTML renderizado con botones Aprobar/Rechazar]

Orden PO-12345 por $15,000 USD del proveedor XYZ Corp.

Orden: PO-12345
Monto: $15,000 USD
Proveedor: XYZ Corp

[Botón: ✅ Aprobar] [Botón: ❌ Rechazar]

Módulo: procurement
Proceso: Aprobación de orden de compra
Prioridad: Alta
SLA: 24 horas
```

**Destinatario hace click en "✅ Aprobar"**:
- Browser abre: `http://localhost:9998/api/notifications/uuid-notification-abc123/respond?action=approve`
- Backend registra respuesta en `notification_log`
- Actualiza `responded_at`, `response_type='approved'`
- Workflow continúa (siguiente paso del proceso de procurement)

---

## 🔁 CIRCUITO COMPLETO RESUMIDO

```
┌─────────────────────────────────────────────────────────────┐
│ 1. NCE.send() - Validación                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Buscar workflow en BD (notification_workflows)          │
│    → process_key = 'procurement.order_approval'            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RecipientResolver.resolve()                             │
│    → recipientType='role' → resolveByRole()                │
│    → Query: users WHERE role='approver_l1'                 │
│    → Resultado: 2 usuarios con emails                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Determinar canales: ['email', 'push', 'inbox']         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Crear registro en notification_log                      │
│    → INSERT con todos los campos                           │
│    → Retorna ID: 'uuid-notification-abc123'                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Loop por destinatarios (2 usuarios)                     │
│    DESTINATARIO 1: carlos.aprobador@empresa.com            │
│    DESTINATARIO 2: maria.aprobadora@empresa.com            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ChannelDispatcher.dispatch()                            │
│    → Promise.allSettled(['email', 'push', 'inbox'])        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. ChannelDispatcher.sendEmail()                           │
│    → workflow, recipient, title, message, metadata         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. _getSmtpConfig()                                        │
│    → workflow.scope = 'company'                            │
│    → Llama _getCompanySmtpConfig(11, 'procurement...')    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. Query: company_email_process_mapping                   │
│     WHERE company_id=11 AND process_key='procurement...'   │
│     → Resultado: email_config_id=5                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. Query: company_email_config WHERE config_id=5         │
│     → institutional_email: 'compras@empresa.com'           │
│     → smtp_host: 'smtp.gmail.com'                          │
│     → smtp_user: 'compras@empresa.com'                     │
│     → smtp_password: 'bXlzZWNyZXRwYXNz' (Base64)          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 12. Desencriptar password                                  │
│     → Buffer.from(base64).toString('utf8')                 │
│     → password = 'mysecretpass'                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 13. Crear Nodemailer transporter                           │
│     nodemailer.createTransport({                           │
│       host: 'smtp.gmail.com',                              │
│       port: 587,                                           │
│       auth: { user: 'compras@...', pass: '...' }          │
│     })                                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 14. Renderizar HTML template                               │
│     _renderEmailTemplate() →                               │
│     → Subject con emoji de prioridad                       │
│     → HTML con estilos por prioridad                       │
│     → Botones de acción (Aprobar/Rechazar)                 │
│     → Footer con metadata                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 15. transporter.sendMail()                                 │
│     from: 'Departamento de Compras <compras@empresa.com>' │
│     to: 'carlos.aprobador@empresa.com'                     │
│     subject: '⚠️ 🔔 Nueva orden requiere aprobación'      │
│     html: [template HTML]                                  │
│                                                             │
│     NODEMAILER INTERNAMENTE:                               │
│     → Conecta a smtp.gmail.com:587                         │
│     → STARTTLS                                             │
│     → AUTH compras@empresa.com / mysecretpass              │
│     → MAIL FROM: <compras@empresa.com>                     │
│     → RCPT TO: <carlos.aprobador@empresa.com>              │
│     → DATA [contenido email]                               │
│     → QUIT                                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 16. GMAIL SMTP Server (smtp.gmail.com)                    │
│     ✅ Valida SPF, DKIM, DMARC                            │
│     ✅ Escanea spam/virus                                 │
│     ✅ Determina bandeja (Inbox)                          │
│     ✅ Acepta email: 250 OK                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 17. Gmail → Servidor destino (mail.empresa.com)           │
│     → DNS MX lookup de empresa.com                         │
│     → Conecta a mail.empresa.com:25                        │
│     → SMTP delivery                                         │
│     → 250 OK: queued as ABC123                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 18. Servidor mail.empresa.com                             │
│     ✅ Recibe email de Gmail                              │
│     ✅ Valida headers                                      │
│     ✅ Escanea virus/spam corporativo                     │
│     ✅ Almacena en buzón de carlos.aprobador@empresa.com  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 19. Cliente de email del destinatario                     │
│     (Outlook / Gmail web / Thunderbird)                    │
│     → Conecta vía IMAP a mail.empresa.com:993             │
│     → AUTH carlos.aprobador@empresa.com                    │
│     → FETCH nuevos emails                                  │
│     → Renderiza HTML                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 20. DESTINATARIO VE EL EMAIL                              │
│     📧 De: Departamento de Compras                        │
│     📧 Asunto: ⚠️ Nueva orden requiere aprobación        │
│     📧 [Botón: ✅ Aprobar] [Botón: ❌ Rechazar]          │
│                                                             │
│     DESTINATARIO HACE CLICK EN "✅ Aprobar":              │
│     → Browser: GET /api/notifications/uuid-.../respond    │
│     → Backend actualiza notification_log                   │
│     → responded_at = NOW()                                 │
│     → response_type = 'approved'                           │
│     → Workflow continúa...                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 DETALLES TÉCNICOS IMPORTANTES

### 1. **¿De dónde sale el email del EMISOR?**

**Respuesta**: De la tabla `company_email_config` filtrada por `company_id` y `process_key`.

**Flujo**:
```
process_key = 'procurement.order_approval'
   ↓
company_email_process_mapping → email_config_id = 5
   ↓
company_email_config WHERE config_id = 5
   ↓
institutional_email = 'compras@empresa.com'
display_name = 'Departamento de Compras'
```

**Resultado**: Email se envía desde `"Departamento de Compras" <compras@empresa.com>`

---

### 2. **¿De dónde sale el email del DESTINATARIO?**

**Respuesta**: De la tabla `users` filtrada por `recipientType` y `recipientId`.

**Flujo**:
```
recipientType = 'role'
recipientId = 'approver_l1'
   ↓
RecipientResolver.resolveByRole()
   ↓
SELECT email FROM users WHERE company_id=11 AND role='approver_l1'
   ↓
Resultado: ['carlos.aprobador@empresa.com', 'maria.aprobadora@empresa.com']
```

**Resultado**: 2 emails de destinatarios resueltos

---

### 3. **¿Cómo sabe qué servidor SMTP usar?**

**Respuesta**: De la configuración SMTP en `company_email_config`.

**Jerarquía**:
1. **Empresa tiene SMTP propio?** → Usa `company_email_config`
2. **Si no** → Fallback a Aponnt SMTP (`aponnt_email_config`)

**Ejemplo Empresa**:
```
smtp_host = 'smtp.gmail.com'
smtp_port = 587
smtp_user = 'compras@empresa.com'
smtp_password = 'bXlzZWNyZXRwYXNz' (Base64)
```

**Ejemplo Aponnt** (si scope='aponnt'):
```
smtp_host = 'smtp.sendgrid.net'
smtp_port = 587
smtp_user = 'apikey'
smtp_password = 'SG.abc123...'
```

---

### 4. **¿Qué pasa si el email falla?**

**Manejo de errores en ChannelDispatcher.sendEmail()**:

```javascript
try {
  const info = await transporter.sendMail({ ... });

  return {
    provider: 'nodemailer',
    messageId: info.messageId,
    smtpHost: smtpConfig.host,
    fromEmail: smtpConfig.fromEmail,
    timestamp: new Date().toISOString(),
    status: 'sent'
  };

} catch (error) {
  console.error(`❌ [ChannelDispatcher] Error enviando email:`, error.message);

  return {
    provider: 'nodemailer',
    error: error.message,
    smtpHost: smtpConfig.host,
    fromEmail: smtpConfig.fromEmail,
    timestamp: new Date().toISOString(),
    status: 'failed'
  };
}
```

**NCE registra el fallo** pero **NO bloquea otros canales** (Push, Inbox siguen ejecutándose).

---

### 5. **¿Se trackea la entrega y lectura del email?**

**Actualmente**: NO (campos están en `notification_log` pero no implementados)

**Campos en notification_log**:
```sql
email_sent_at TIMESTAMP,        -- ✅ Se registra cuando Nodemailer retorna OK
email_delivered_at TIMESTAMP,   -- ❌ TODO: Webhook de SMTP provider
email_read_at TIMESTAMP,        -- ❌ TODO: Pixel de tracking o webhook
```

**Implementación futura** (FASE 2-3):
- Webhook de SendGrid/Mailgun para `delivered`, `opened`, `clicked`
- Pixel de tracking 1x1 en HTML para `read_at`

---

## ✅ CONCLUSIÓN

### El circuito COMPLETO de email es:

1. **NCE.send()** - Validación y workflow lookup
2. **RecipientResolver** - De `recipientType + recipientId` → emails concretos
3. **notification_log** - Registro de tracking
4. **ChannelDispatcher** - Orquestador multi-canal
5. **SMTP Resolution** - De `process_key` → config SMTP específica
6. **Nodemailer** - Construcción y envío SMTP
7. **SMTP Server (Gmail)** - Validaciones y routing
8. **Servidor destino** - Buzón del destinatario
9. **Cliente de email** - Renderizado y lectura
10. **Respuesta** - Click en botón → Actualiza notification_log

### Ventajas del sistema NCE:

- ✅ **Single entry point** (cuando se eliminen los bypass)
- ✅ **SMTP dinámico** por proceso (procurement usa email de compras, HR usa email de RRHH)
- ✅ **Multi-tenant** (cada empresa su SMTP)
- ✅ **100% auditable** (todo en notification_log)
- ✅ **Multi-destinatario** (role, hierarchy, department)
- ✅ **Multi-canal** (email, push, inbox en paralelo)

---

**GENERADO**: 2026-01-06
**PRÓXIMA ACCIÓN**: Eliminar bypass (FASE 4) para que TODO pase por NCE
