# 📧 SISTEMA DE EMAILS MULTICAPA - ARQUITECTURA PROFESIONAL

## 🎯 VISIÓN GENERAL

Sistema de emails con **3 capas independientes** que garantiza:
- ✅ Email institucional **OBLIGATORIO** al crear empresa
- ✅ Sincronización automática de emails de empleados
- ✅ Validación SMTP antes de guardar configuración
- ✅ Logs completos y auditoría de todos los envíos
- ✅ Respeto por preferencias de notificaciones de empleados

---

## 🏗️ ARQUITECTURA DE 3 CAPAS

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA 1: APONNT                          │
│  (Plataforma - Emails transaccionales/soporte/billing)     │
│                                                             │
│  • noreply@aponnt.com (transaccional)                      │
│  • soporte@aponnt.com (soporte técnico)                    │
│  • facturacion@aponnt.com (billing)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   CAPA 2: EMPRESA (ISI)                     │
│         (Email institucional del cliente)                   │
│                                                             │
│  • contacto@isi.com.ar (institucional)                     │
│  • Configuración SMTP validada ✅                           │
│  • Límites: 500/día, 10,000/mes                            │
│  • Templates personalizados                                 │
│  • Firma corporativa                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CAPA 3: EMPLEADOS                              │
│     (Emails individuales con preferencias)                  │
│                                                             │
│  • juan.perez@isi.com.ar → Recibe todas las notif.        │
│  • maria.gomez@isi.com.ar → Solo asistencia y vacaciones  │
│  • Sincronización automática con tabla users               │
│  • Preferencias por tipo de notificación                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 TABLAS DE BASE DE DATOS

### 1. `email_configurations` (Empresa)
**Propósito**: Configuración SMTP de cada empresa cliente

```sql
-- CAMPOS PRINCIPALES
company_id              → FK a companies (ÚNICO)
institutional_email     → email institucional (ÚNICO en sistema)
display_name            → "ISI - Sistema de Asistencia"

-- SMTP (REQUERIDOS)
smtp_host               → smtp.gmail.com
smtp_port               → 587
smtp_user               → contacto@isi.com.ar
smtp_password           → Encriptado (base64 en backend)
smtp_secure             → true/false

-- VERIFICACIÓN
is_verified             → true si pasó validación SMTP
verified_at             → Timestamp de verificación
verification_attempts   → Contador de intentos

-- LÍMITES Y CUOTAS
daily_limit             → 500 (default)
monthly_limit           → 10,000 (default)
current_daily_count     → Contador actual
current_monthly_count   → Contador actual

-- PERSONALIZACIÓN
from_name               → Nombre visible en From
reply_to                → Email de respuesta
cc_copy                 → Copia a admin
signature               → HTML de firma corporativa
```

**IMPORTANTE**: Esta tabla tiene **trigger de validación** que impide insertar si falta algún campo SMTP obligatorio.

### 2. `user_emails` (Empleados)
**Propósito**: Emails de empleados con preferencias de notificaciones

```sql
-- IDENTIFICACIÓN
user_id                 → FK a users (UUID)
company_id              → FK a companies
email                   → Email del empleado
is_primary              → true para email principal

-- VERIFICACIÓN
is_verified             → true si empleado verificó su email
verification_token      → Token único para verificar

-- PREFERENCIAS (BOOLEANAS)
receive_system_notifications    → true/false
receive_attendance_alerts       → true/false
receive_vacation_updates        → true/false
receive_medical_notifications   → true/false
receive_legal_notices           → true/false
receive_shifts_changes          → true/false
receive_payroll_notifications   → true/false

-- FORMATO
email_format            → 'html' o 'text'
email_frequency         → 'instant', 'daily_digest', 'weekly_digest'

-- ESTADO
is_active               → true si email está activo
bounced                 → true si email rebotó
bounce_count            → Contador de rebotes
```

**SINCRONIZACIÓN AUTOMÁTICA**: Esta tabla se actualiza automáticamente cuando se modifica `users.email` mediante trigger.

### 3. `email_logs` (Auditoría)
**Propósito**: Log completo de TODOS los emails enviados

```sql
-- ORIGEN
sender_type             → 'aponnt', 'company', 'employee'
sender_id               → company_id o user_id según tipo
email_config_id         → FK a email_configurations

-- DESTINATARIO
recipient_email         → Email del destinatario
recipient_name          → Nombre del destinatario
recipient_type          → 'company', 'employee', 'external'

-- EMAIL
subject                 → Asunto
body_html               → HTML del email
body_text               → Texto plano

-- METADATA
notification_id         → FK a notificaciones (si aplica)
category                → 'welcome', 'alert', 'notification', etc.
priority                → 'high', 'normal', 'low'

-- ESTADO
status                  → 'pending', 'sent', 'failed', 'bounced', 'opened'
sent_at                 → Timestamp de envío
delivered_at            → Timestamp de entrega
opened_at               → Timestamp de apertura
message_id              → ID del proveedor SMTP
tracking_id             → UUID para tracking

-- ERRORES
error_message           → Mensaje de error si falló
retry_count             → Contador de reintentos
```

### 4. `email_templates` (Templates)
**Propósito**: Templates HTML reutilizables por empresa

```sql
company_id              → FK a companies (NULL = global)
template_key            → 'welcome_employee', 'late_arrival', etc.
template_name           → Nombre descriptivo
subject                 → Asunto del email
body_html               → HTML con variables {{user_name}}
available_variables     → JSONB con variables disponibles
category                → 'attendance', 'vacation', etc.
is_default              → true para templates del sistema
```

### 5. `aponnt_email_config` (Plataforma)
**Propósito**: Configuraciones SMTP de la plataforma Aponnt

```sql
config_type             → 'transactional', 'support', 'billing', 'marketing'
from_email              → noreply@aponnt.com
from_name               → "Aponnt - Sistema Biométrico"
smtp_host, smtp_port, smtp_user, smtp_password
is_active               → true/false
```

---

## 🔧 TRIGGERS AUTOMÁTICOS

### 1. `sync_user_email()`
**Se ejecuta**: Cuando se modifica `users.email`

**Hace**:
- Marca el email anterior como `is_active = false` en `user_emails`
- Inserta o activa el nuevo email en `user_emails`
- Mantiene sincronización bidireccional

**Ejemplo**:
```sql
-- Usuario cambia email en tabla users
UPDATE users SET email = 'nuevo@email.com' WHERE user_id = '123...';

-- Automáticamente:
-- 1. user_emails: viejo@email.com → is_active = false
-- 2. user_emails: nuevo@email.com → is_active = true, is_primary = true
```

### 2. `validate_email_config()`
**Se ejecuta**: ANTES de insertar/actualizar `email_configurations`

**Valida**:
- ✅ `smtp_host` no vacío
- ✅ `smtp_port` entre 1-65535
- ✅ `smtp_user` no vacío
- ✅ `smtp_password` no vacía
- ✅ `institutional_email` formato válido

**Si falla**: `RAISE EXCEPTION` y bloquea la inserción

### 3. `reset_email_counters()`
**Se ejecuta**: ANTES de actualizar `email_configurations`

**Hace**:
- Resetea `current_daily_count = 0` si pasó un día
- Resetea `current_monthly_count = 0` si cambió el mes

---

## 📡 EMAIL SERVICE - USO

### CAPA 1: Enviar desde Aponnt

```javascript
const emailService = require('./services/EmailService');

// Email transaccional de Aponnt a un cliente
await emailService.sendFromAponnt('transactional', {
    to: 'cliente@isi.com.ar',
    recipientName: 'ISI',
    subject: '¡Bienvenido a Aponnt!',
    html: '<h1>Tu empresa está activa</h1>',
    category: 'welcome'
});

// Email de soporte
await emailService.sendFromAponnt('support', {
    to: 'cliente@isi.com.ar',
    subject: 'Ticket #123 - Resuelto',
    html: '<p>Tu consulta ha sido resuelta...</p>'
});
```

### CAPA 2: Configurar y enviar desde Empresa

```javascript
// 1. Al crear empresa (VALIDACIÓN OBLIGATORIA)
const emailConfig = {
    institutionalEmail: 'contacto@isi.com.ar',
    displayName: 'ISI - Sistema de Asistencia',
    fromName: 'ISI',
    replyTo: 'soporte@isi.com.ar',
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'contacto@isi.com.ar',
        password: 'app_password_here',
        secure: false
    }
};

// Esto valida SMTP antes de guardar (envía email de prueba)
const result = await emailService.configureCompanyEmail(
    companyId,
    emailConfig,
    userId
);

if (!result.success) {
    throw new Error('Configuración SMTP inválida');
}

// 2. Enviar email desde la empresa
await emailService.sendFromCompany(companyId, {
    to: 'empleado@isi.com.ar',
    recipientName: 'Juan Pérez',
    recipientType: 'employee',
    subject: 'Recordatorio: Registro de asistencia',
    html: '<p>Estimado Juan, recuerda registrar tu asistencia...</p>',
    category: 'attendance',
    notificationId: 456 // Opcional: ID de notificación
});
```

### CAPA 3: Enviar a Empleados (con preferencias)

```javascript
// Enviar a un solo empleado
await emailService.sendToEmployee(
    userId,
    'attendance', // Tipo de notificación
    {
        subject: 'Llegada tardía registrada',
        html: '<p>Hola {{firstName}}, hoy llegaste 15 min tarde...</p>',
        category: 'alert'
    }
);

// Enviar a múltiples empleados
const userIds = ['uuid1', 'uuid2', 'uuid3'];
const results = await emailService.sendToMultipleEmployees(
    userIds,
    'shifts', // Tipo de notificación
    {
        subject: 'Cambio en tus turnos',
        html: '<p>Tus turnos han sido actualizados...</p>'
    }
);

console.log(`Enviados: ${results.sent}, Fallidos: ${results.failed}, Omitidos: ${results.skipped}`);
```

---

## 🎨 INTEGRACIÓN EN PANEL ADMINISTRATIVO

### Formulario de Alta de Empresa

```html
<!-- SECCIÓN: Email Institucional (OBLIGATORIA) -->
<div class="section">
    <h3>📧 Configuración de Email Institucional</h3>
    <p class="warning">⚠️ Esta configuración es OBLIGATORIA para crear la empresa</p>

    <!-- Email institucional -->
    <label>Email Institucional: *</label>
    <input type="email" id="institutionalEmail" required
           placeholder="contacto@empresa.com">

    <!-- Nombre para mostrar -->
    <label>Nombre para Mostrar: *</label>
    <input type="text" id="displayName" required
           placeholder="Empresa SRL - Sistema de Asistencia">

    <!-- Configuración SMTP -->
    <h4>Configuración SMTP</h4>
    <div class="smtp-config">
        <label>Servidor SMTP: *</label>
        <input type="text" id="smtpHost" required placeholder="smtp.gmail.com">

        <label>Puerto: *</label>
        <input type="number" id="smtpPort" required value="587">

        <label>Usuario SMTP: *</label>
        <input type="text" id="smtpUser" required placeholder="correo@empresa.com">

        <label>Contraseña SMTP: *</label>
        <input type="password" id="smtpPassword" required>
        <small>💡 Para Gmail, usa una "Contraseña de Aplicación"</small>

        <label>
            <input type="checkbox" id="smtpSecure">
            Usar SSL/TLS (puerto 465)
        </label>
    </div>

    <!-- Email de respuesta (opcional) -->
    <label>Email de Respuesta (opcional):</label>
    <input type="email" id="replyTo" placeholder="soporte@empresa.com">

    <!-- Botón de validación -->
    <button type="button" class="btn-validate" onclick="validateSMTP()">
        🔍 Validar Configuración SMTP
    </button>
    <div id="smtpValidationResult"></div>
</div>

<script>
async function validateSMTP() {
    const config = {
        host: document.getElementById('smtpHost').value,
        port: document.getElementById('smtpPort').value,
        user: document.getElementById('smtpUser').value,
        password: document.getElementById('smtpPassword').value,
        secure: document.getElementById('smtpSecure').checked,
        fromName: document.getElementById('displayName').value
    };

    const resultDiv = document.getElementById('smtpValidationResult');
    resultDiv.innerHTML = '⏳ Validando configuración SMTP...';

    try {
        const response = await fetch('/api/v1/email/validate-smtp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const result = await response.json();

        if (result.valid) {
            resultDiv.innerHTML = '✅ Configuración SMTP válida. Email de prueba enviado.';
            resultDiv.className = 'success';
            // Habilitar botón de crear empresa
            document.getElementById('btnCreateCompany').disabled = false;
        } else {
            resultDiv.innerHTML = `❌ Error: ${result.error}`;
            resultDiv.className = 'error';
        }
    } catch (error) {
        resultDiv.innerHTML = `❌ Error: ${error.message}`;
        resultDiv.className = 'error';
    }
}

async function createCompany() {
    // ... otros datos de la empresa ...

    const emailConfig = {
        institutionalEmail: document.getElementById('institutionalEmail').value,
        displayName: document.getElementById('displayName').value,
        fromName: document.getElementById('displayName').value.split('-')[0].trim(),
        replyTo: document.getElementById('replyTo').value,
        smtp: {
            host: document.getElementById('smtpHost').value,
            port: parseInt(document.getElementById('smtpPort').value),
            user: document.getElementById('smtpUser').value,
            password: document.getElementById('smtpPassword').value,
            secure: document.getElementById('smtpSecure').checked
        }
    };

    const response = await fetch('/api/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...companyData,
            emailConfig
        })
    });

    // ...
}
</script>
```

---

## 🔐 VALIDACIONES IMPLEMENTADAS

### Backend (server.js o route)

```javascript
// POST /api/v1/companies
app.post('/api/v1/companies', authenticateToken, async (req, res) => {
    try {
        const { companyData, emailConfig } = req.body;

        // 1. VALIDAR que emailConfig esté presente
        if (!emailConfig) {
            return res.status(400).json({
                success: false,
                error: 'Configuración de email institucional es OBLIGATORIA'
            });
        }

        // 2. VALIDAR campos requeridos
        const required = ['institutionalEmail', 'displayName', 'smtp'];
        for (const field of required) {
            if (!emailConfig[field]) {
                return res.status(400).json({
                    success: false,
                    error: `Campo ${field} es obligatorio`
                });
            }
        }

        // 3. VALIDAR campos SMTP
        const smtpRequired = ['host', 'port', 'user', 'password'];
        for (const field of smtpRequired) {
            if (!emailConfig.smtp[field]) {
                return res.status(400).json({
                    success: false,
                    error: `Campo SMTP ${field} es obligatorio`
                });
            }
        }

        // 4. CREAR EMPRESA
        const company = await db.Company.create(companyData);

        // 5. CONFIGURAR Y VALIDAR EMAIL (CRÍTICO)
        const emailResult = await emailService.configureCompanyEmail(
            company.id,
            emailConfig,
            req.user.userId
        );

        if (!emailResult.success) {
            // ROLLBACK: Eliminar empresa si falla configuración de email
            await db.Company.destroy({ where: { id: company.id } });

            return res.status(400).json({
                success: false,
                error: 'Configuración de email inválida. Empresa no creada.',
                details: emailResult.error
            });
        }

        // 6. ENVIAR EMAIL DE BIENVENIDA desde Aponnt
        await emailService.sendFromAponnt('transactional', {
            to: emailConfig.institutionalEmail,
            recipientName: companyData.name,
            subject: '¡Bienvenido a Aponnt!',
            html: `<h1>Empresa ${companyData.name} activada</h1>
                   <p>Tu email institucional ${emailConfig.institutionalEmail} está verificado.</p>`,
            category: 'welcome'
        });

        res.json({
            success: true,
            company,
            emailConfigured: true
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### 1. Ejecutar Migración

```bash
cd backend
psql -U postgres -d attendance_system -f migrations/20251028_email_system_multicapa.sql
```

### 2. Instalar dependencias

```bash
npm install nodemailer
```

### 3. Configurar .env (Aponnt)

```bash
# Emails de Aponnt (plataforma)
APONNT_TRANSACTIONAL_EMAIL=noreply@aponnt.com
APONNT_TRANSACTIONAL_PASSWORD=app_password_here
APONNT_SUPPORT_EMAIL=soporte@aponnt.com
APONNT_SUPPORT_PASSWORD=app_password_here
```

### 4. Actualizar las configuraciones en `aponnt_email_config`

```sql
UPDATE aponnt_email_config
SET smtp_password = 'TU_PASSWORD_REAL'
WHERE config_type = 'transactional';
```

---

## 📊 VISTAS Y ESTADÍSTICAS

### Ver resumen de emails por empresa

```sql
SELECT * FROM v_email_configurations_summary;
```

**Retorna**:
- Email institucional
- Estado de verificación
- Emails enviados hoy
- Límites diarios/mensuales
- Total de empleados con email

### Ver estadísticas de entrega

```sql
SELECT * FROM v_email_stats_by_company WHERE company_id = 123;
```

**Retorna**:
- Total enviados
- Total entregados
- Total rebotados
- Tasa de entrega (%)
- Tasa de apertura (%)

---

## ✅ FLUJO COMPLETO - EJEMPLO REAL

### Escenario: ISI crea su empresa y envía notificaciones

```javascript
// 1. APONNT CREA EMPRESA ISI
const isiCompany = await db.Company.create({
    name: 'ISI',
    slug: 'isi',
    contact_email: 'contacto@isi.com.ar'
});

// 2. APONNT CONFIGURA EMAIL INSTITUCIONAL DE ISI (OBLIGATORIO)
await emailService.configureCompanyEmail(isiCompany.id, {
    institutionalEmail: 'contacto@isi.com.ar',
    displayName: 'ISI - Sistema de Asistencia',
    fromName: 'ISI',
    replyTo: 'soporte@isi.com.ar',
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'contacto@isi.com.ar',
        password: 'xxxxxxxxxxxx',
        secure: false
    }
}, adminUserId);
// ☝️ Esto valida SMTP enviando email de prueba a contacto@isi.com.ar

// 3. APONNT ENVÍA EMAIL DE BIENVENIDA A ISI
await emailService.sendFromAponnt('transactional', {
    to: 'contacto@isi.com.ar',
    recipientName: 'ISI',
    subject: '¡Bienvenidos a Aponnt!',
    html: '<h1>Tu empresa ISI está activa</h1>',
    category: 'welcome'
});

// 4. ISI CREA EMPLEADO JUAN PÉREZ
const juanPerez = await db.User.create({
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@isi.com.ar',  // ☝️ Trigger automático crea entrada en user_emails
    company_id: isiCompany.id
});

// 5. ISI ENVÍA NOTIFICACIÓN A JUAN DESDE SU EMAIL INSTITUCIONAL
await emailService.sendToEmployee(juanPerez.user_id, 'attendance', {
    subject: 'Registro de asistencia - Llegada tardía',
    html: `<p>Hola Juan,</p>
           <p>Hoy llegaste 15 minutos tarde (09:15 AM).</p>
           <p>Horario esperado: 09:00 AM</p>`,
    category: 'alert'
});
// ☝️ Se envía desde: contacto@isi.com.ar (email institucional de ISI)
//     Respeta preferencias: receive_attendance_alerts debe ser true

// 6. JUAN CAMBIA SU EMAIL
await db.User.update(
    { email: 'juan.nuevo@isi.com.ar' },
    { where: { user_id: juanPerez.user_id } }
);
// ☝️ Trigger automático:
//     - user_emails: juan.perez@isi.com.ar → is_active = false
//     - user_emails: juan.nuevo@isi.com.ar → is_active = true, is_primary = true

// 7. VERIFICAR ESTADÍSTICAS DE ISI
const stats = await emailService.getCompanyEmailStats(isiCompany.id);
console.log(`ISI envió ${stats.total_sent} emails con ${stats.delivery_rate}% de entrega`);
```

---

## 🎓 PARA LA PRÓXIMA SESIÓN

**Sistema implementado**:
- ✅ Migración SQL con 5 tablas
- ✅ EmailService con 3 capas
- ✅ Triggers de sincronización automática
- ✅ Validación SMTP obligatoria
- ✅ Logs y auditoría completa

**Pendiente de integración**:
- 📝 Actualizar formulario de alta de empresa en panel-administrativo.html
- 📝 Agregar ruta POST /api/v1/email/validate-smtp
- 📝 Modificar POST /api/v1/companies para requerir emailConfig
- 📝 Integrar con Sistema de Notificaciones existente
- 📝 Crear templates HTML por defecto

**Próximos pasos**:
1. Ejecutar migración SQL
2. Probar validación SMTP con Gmail
3. Crear empresa de prueba con configuración de email
4. Verificar logs en `email_logs`

---

**Autor**: Sistema Biométrico Aponnt
**Fecha**: 2025-10-28
**Versión**: 1.0.0
