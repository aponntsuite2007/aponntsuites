# 📧 SISTEMA DE EMAILS 5 CAPAS - ARQUITECTURA COMPLETA

## 🎯 VISIÓN GENERAL

Sistema profesional de emails con **5 capas independientes** que cubre TODOS los stakeholders del ecosistema Aponnt:

```
                    ┌─────────────────────────┐
                    │    CAPA 1: APONNT      │
                    │    (Plataforma)         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
         ┌──────────▼──────────┐   ┌─────────▼──────────┐
         │ CAPA 2: PARTNERS    │   │ CAPA 3: VENDEDORES │
         │  (Asociados/         │   │   (Comercial)      │
         │   Soporte)           │   │                     │
         └──────────┬──────────┘   └─────────┬───────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  CAPA 4: EMPRESA (ISI)  │
                    │   (Cliente)             │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  CAPA 5: EMPLEADOS      │
                    │   (Usuarios finales)    │
                    └─────────────────────────┘
```

---

## 🏢 CAPA 1: APONNT (Plataforma)

### **Propósito**: Emails transaccionales y comunicación oficial de Aponnt

### **Tipos de Email**:
| Tipo | Email | Uso |
|------|-------|-----|
| `transactional` | noreply@aponnt.com | Bienvenidas, activaciones, confirmaciones |
| `support` | soporte@aponnt.com | Soporte técnico, resolución de problemas |
| `billing` | facturacion@aponnt.com | Facturas, pagos, renovaciones |
| `marketing` | marketing@aponnt.com | Campañas, promociones (opcional) |

### **Configuración**:
```sql
SELECT * FROM aponnt_email_config;
```

### **Ejemplo de Uso**:
```javascript
// Bienvenida a nueva empresa
await emailService.sendFromAponnt('transactional', {
    to: 'contacto@isi.com.ar',
    recipientName: 'ISI',
    subject: '¡Bienvenido a Aponnt!',
    html: '<h1>Tu empresa está activa</h1>',
    category: 'welcome'
});
```

---

## 👥 CAPA 2: PARTNERS/ASOCIADOS (Soporte Técnico)

### **Propósito**: Red de partners que brindan servicios a clientes

### **¿Quiénes son?**:
- Técnicos especializados
- Consultores
- Integradores de sistemas
- Soporte en terreno

### **Tabla**: `partner_emails`

### **Preferencias de Notificaciones**:
- ✅ `receive_service_requests` → Nuevas solicitudes de servicio
- ✅ `receive_commission_alerts` → Alertas de comisiones ganadas
- ✅ `receive_payment_notifications` → Pagos recibidos
- ✅ `receive_review_notifications` → Nuevas reseñas de clientes
- ✅ `receive_support_tickets` → Tickets asignados
- ✅ `receive_mediation_alerts` → Casos de mediación
- ✅ `receive_document_reminders` → Vencimiento de certificados/documentos

### **Sincronización Automática**:
```sql
-- Si se modifica partners.email, automáticamente se sincroniza con partner_emails
UPDATE partners SET email = 'nuevo@email.com' WHERE id = 123;
-- Trigger: partner_emails actualizado automáticamente
```

### **Ejemplo de Uso**:
```javascript
// Notificar a partner de nueva solicitud de servicio
await emailService.sendToPartner(partnerId, 'service_request', {
    subject: 'Nueva Solicitud de Servicio - ISI',
    html: `<p>La empresa ISI requiere instalación de kiosco biométrico</p>`,
    data: {
        company_name: 'ISI',
        service_type: 'instalacion',
        priority: 'high'
    }
});
```

---

## 💼 CAPA 3: VENDEDORES (Equipo Comercial de Aponnt)

### **Propósito**: Equipo de ventas que gestiona clientes y leads

### **¿Quiénes son?**:
- Ejecutivos de ventas
- Account managers
- Gerentes comerciales

### **Tabla**: `vendor_emails`

### **Preferencias de Notificaciones**:
- ✅ `receive_lead_notifications` → Nuevos leads asignados
- ✅ `receive_contract_signed` → Contratos firmados
- ✅ `receive_payment_alerts` → Pagos de clientes
- ✅ `receive_renewal_reminders` → Renovaciones próximas
- ✅ `receive_trial_expiry` → Trials por expirar
- ✅ `receive_sales_reports` → Reportes de ventas semanales/mensuales

### **Ejemplo de Uso**:
```javascript
// Notificar a vendedor de nuevo lead
await emailService.sendToVendor(vendorUserId, 'lead', {
    subject: 'Nuevo Lead Asignado - Empresa XYZ',
    html: `<p>Se te ha asignado un nuevo lead de 50 empleados</p>`,
    data: {
        lead_company: 'XYZ SA',
        lead_contact: 'Juan Pérez',
        lead_email: 'juan@xyz.com',
        lead_phone: '+54911...',
        interest_level: 'high'
    }
});

// Notificar a vendedor que su cliente firmó contrato
await emailService.sendToVendor(vendorUserId, 'contract_signed', {
    subject: '¡Contrato Firmado! - ISI',
    html: `<p>Tu cliente ISI firmó el contrato de 100 empleados</p>`,
    data: {
        company: 'ISI',
        contract_value: 150000,
        commission: 15000
    }
});
```

---

## 🏢 CAPA 4: EMPRESA CLIENTE (ISI)

### **Propósito**: Email institucional del cliente para comunicarse con sus empleados

### **Configuración OBLIGATORIA**:
Al crear una empresa, **DEBE** configurar:
- ✅ Email institucional (ej: contacto@isi.com.ar)
- ✅ Servidor SMTP (host, port, user, password)
- ✅ Validación SMTP exitosa (envío de email de prueba)

### **Tabla**: `email_configurations`

### **Validación**:
```javascript
// NO permite crear empresa sin configuración válida
const emailConfig = {
    institutionalEmail: 'contacto@isi.com.ar',
    displayName: 'ISI - Sistema de Asistencia',
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'contacto@isi.com.ar',
        password: 'xxxxxxxxxxxx',
        secure: false
    }
};

// Esto valida SMTP antes de guardar
const result = await emailService.configureCompanyEmail(companyId, emailConfig, userId);

if (!result.success) {
    // NO permite crear la empresa
    throw new Error('Configuración SMTP inválida');
}
```

### **Límites y Cuotas**:
- 📊 **Diario**: 500 emails/día (configurable)
- 📊 **Mensual**: 10,000 emails/mes (configurable)
- 🔄 **Contadores automáticos**: Se resetean automáticamente

### **Ejemplo de Uso**:
```javascript
// Empresa ISI envía recordatorio a sus empleados
await emailService.sendFromCompany(isiCompanyId, {
    to: 'juan.perez@isi.com.ar',
    subject: 'Recordatorio: Registro de Asistencia',
    html: '<p>Recuerda registrar tu asistencia diariamente</p>',
    category: 'reminder'
});
```

---

## 👤 CAPA 5: EMPLEADOS (Usuarios Finales)

### **Propósito**: Emails individuales de empleados con preferencias personalizadas

### **Tabla**: `user_emails`

### **Sincronización Automática**:
```sql
-- Si se modifica users.email, automáticamente se sincroniza con user_emails
UPDATE users SET email = 'nuevo@email.com' WHERE user_id = 'uuid...';
-- Trigger: user_emails actualizado automáticamente
```

### **Preferencias de Notificaciones** (Granulares):
- ✅ `receive_system_notifications` → Notificaciones del sistema
- ✅ `receive_attendance_alerts` → Alertas de asistencia (llegadas tarde, faltas)
- ✅ `receive_vacation_updates` → Actualizaciones de vacaciones
- ✅ `receive_medical_notifications` → Notificaciones médicas (turnos, certificados)
- ✅ `receive_legal_notices` → Avisos legales (despidos, sanciones)
- ✅ `receive_shifts_changes` → Cambios en turnos
- ✅ `receive_payroll_notifications` → Notificaciones de nómina/recibos

### **Formatos**:
- `html` o `text`
- `instant`, `daily_digest`, `weekly_digest`

### **Ejemplo de Uso**:
```javascript
// Enviar notificación a empleado (respeta sus preferencias)
await emailService.sendToEmployee(employeeUserId, 'attendance', {
    subject: 'Llegada Tardía Registrada',
    html: '<p>Hola Juan, hoy llegaste 15 minutos tarde...</p>',
    category: 'alert'
});

// Si el empleado tiene desactivado receive_attendance_alerts = false
// → El email NO se envía (se respeta su preferencia)
```

---

## 📊 TABLAS DE BASE DE DATOS

| Tabla | Propósito | FK Principal |
|-------|-----------|--------------|
| `aponnt_email_config` | Configuraciones de Aponnt | - |
| `partner_emails` | Emails de partners | `partners.id` |
| `vendor_emails` | Emails de vendedores | `users.user_id` |
| `support_emails` | Emails de soporte | `users.user_id` |
| `email_configurations` | Emails institucionales de empresas | `companies.id` |
| `user_emails` | Emails de empleados | `users.user_id` |
| `email_logs` | Log de TODOS los emails enviados | - |
| `email_templates` | Templates HTML reutilizables | `companies.id` (nullable) |

---

## 🔄 FLUJOS DE COMUNICACIÓN

### **FLUJO 1: Aponnt → Empresa (Bienvenida)**
```
Aponnt crea empresa ISI
    ↓
EmailService.sendFromAponnt('transactional', {...})
    ↓
Email: noreply@aponnt.com → contacto@isi.com.ar
    ↓
Log: email_logs (sender_type = 'aponnt')
```

### **FLUJO 2: Empresa → Empleado (Notificación)**
```
ISI genera alerta de asistencia para Juan
    ↓
EmailService.sendToEmployee(juanId, 'attendance', {...})
    ↓
Verifica: user_emails.receive_attendance_alerts = true
    ↓
Obtiene config: email_configurations de ISI
    ↓
Envía: contacto@isi.com.ar → juan.perez@isi.com.ar
    ↓
Log: email_logs (sender_type = 'company', sender_id = ISI.id)
```

### **FLUJO 3: Vendedor → Empresa (Seguimiento)**
```
Vendedor de Aponnt hace follow-up con ISI
    ↓
EmailService.sendFromVendor(vendorId, {...})
    ↓
Email: vendedor@aponnt.com → contacto@isi.com.ar
    ↓
Log: email_logs (sender_type = 'vendor')
```

### **FLUJO 4: Partner → Empresa (Servicio Completado)**
```
Partner completa instalación en ISI
    ↓
EmailService.sendFromPartner(partnerId, {...})
    ↓
Email: partner@email.com → contacto@isi.com.ar
    ↓
Log: email_logs (sender_type = 'partner')
```

### **FLUJO 5: Sistema → Partner (Nueva Solicitud)**
```
ISI crea solicitud de servicio
    ↓
EmailService.sendToPartner(partnerId, 'service_request', {...})
    ↓
Verifica: partner_emails.receive_service_requests = true
    ↓
Envía: noreply@aponnt.com → partner@email.com
    ↓
Log: email_logs (sender_type = 'aponnt', category = 'partner_notification')
```

---

## 🔐 VALIDACIONES Y REGLAS

### **REGLA 1: Email institucional OBLIGATORIO para crear empresa**
```javascript
// En panel-administrativo: Crear Empresa
// ❌ NO permite continuar sin configurar email SMTP válido

if (!emailConfig || !emailConfig.smtp) {
    throw new Error('Configuración de email institucional es OBLIGATORIA');
}

const validation = await emailService.validateCompanySMTP(emailConfig.smtp);
if (!validation.valid) {
    throw new Error('Configuración SMTP inválida. No se puede crear la empresa.');
}
```

### **REGLA 2: Sincronización automática bidireccional**
```sql
-- Cambio en users.email → Trigger → user_emails actualizado
-- Cambio en partners.email → Trigger → partner_emails actualizado
```

### **REGLA 3: Respeto por preferencias individuales**
```javascript
// Si empleado desactiva receive_attendance_alerts = false
// → Sistema NO envía emails de tipo 'attendance' a ese empleado
```

### **REGLA 4: Límites de envío por empresa**
```javascript
// Antes de enviar, verificar:
const withinLimits = await emailService.checkEmailLimits(companyId);
if (!withinLimits) {
    throw new Error('Límite de emails alcanzado (500/día o 10,000/mes)');
}
```

### **REGLA 5: Log completo y auditoría**
```sql
-- TODOS los emails se registran en email_logs
-- Incluye: sender, recipient, status, opened, bounced, etc.
SELECT * FROM email_logs WHERE company_id = 123 ORDER BY created_at DESC;
```

---

## 📈 VISTAS Y ESTADÍSTICAS

### **Vista 1: Resumen por tipo de usuario**
```sql
SELECT * FROM v_email_summary_by_type;
```
**Retorna**:
| user_type | total_users | verified_configs | total_emails_today |
|-----------|-------------|------------------|-------------------|
| company | 10 | 8 | 245 |
| employee | 500 | 450 | - |
| partner | 25 | 20 | - |
| vendor | 5 | 5 | - |
| support | 3 | 3 | - |

### **Vista 2: Estadísticas por tipo de sender**
```sql
SELECT * FROM v_email_logs_by_sender_type;
```
**Retorna**:
| sender_type | total_sent | sent_success | bounced | success_rate | open_rate |
|-------------|------------|--------------|---------|--------------|-----------|
| aponnt | 150 | 148 | 2 | 98.67% | 65.54% |
| company | 1250 | 1200 | 50 | 96.00% | 45.00% |
| employee | 50 | 48 | 2 | 96.00% | 40.00% |
| partner | 30 | 30 | 0 | 100.00% | 80.00% |
| vendor | 45 | 44 | 1 | 97.78% | 55.56% |

### **Vista 3: Configuraciones de email por empresa**
```sql
SELECT * FROM v_email_configurations_summary WHERE company_id = 123;
```

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### **Paso 1: Ejecutar Migraciones**
```bash
cd backend

# Migración principal
psql -U postgres -d attendance_system -f migrations/20251028_email_system_multicapa.sql

# Migración de extensión
psql -U postgres -d attendance_system -f migrations/20251028_extend_email_for_partners_vendors.sql
```

### **Paso 2: Instalar Dependencias**
```bash
npm install nodemailer
```

### **Paso 3: Configurar .env**
```bash
# Configuración de Aponnt (plataforma)
APONNT_TRANSACTIONAL_EMAIL=noreply@aponnt.com
APONNT_TRANSACTIONAL_PASSWORD=app_password_here
APONNT_SUPPORT_EMAIL=soporte@aponnt.com
APONNT_SUPPORT_PASSWORD=app_password_here
APONNT_BILLING_EMAIL=facturacion@aponnt.com
APONNT_BILLING_PASSWORD=app_password_here
```

### **Paso 4: Actualizar aponnt_email_config**
```sql
UPDATE aponnt_email_config
SET smtp_password = 'TU_PASSWORD_REAL'
WHERE config_type = 'transactional';
```

### **Paso 5: Integrar con Panel Administrativo**
Ver archivo: `EMAIL-SYSTEM-ARCHITECTURE.md` sección "INTEGRACIÓN EN PANEL ADMINISTRATIVO"

---

## 🎯 CASOS DE USO REALES

### **Caso 1: Alta de nueva empresa ISI**
```javascript
// 1. Vendedor de Aponnt crea empresa ISI en panel-administrativo
// 2. Sistema requiere configuración de email SMTP (OBLIGATORIO)
// 3. Vendedor ingresa datos SMTP de ISI
// 4. Sistema valida enviando email de prueba a contacto@isi.com.ar
// 5. Si validación OK, empresa se crea
// 6. Aponnt envía email de bienvenida desde noreply@aponnt.com
// 7. Vendedor recibe notificación de nuevo cliente
```

### **Caso 2: Empleado llega tarde**
```javascript
// 1. Juan Pérez registra asistencia a las 09:15 (15 min tarde)
// 2. Sistema genera alerta de tardanza
// 3. EmailService.sendToEmployee(juanId, 'attendance', {...})
// 4. Verifica: juan.receive_attendance_alerts = true ✅
// 5. Envía desde: contacto@isi.com.ar → juan.perez@isi.com.ar
// 6. Log en email_logs
// 7. Si Juan abre el email, se registra en opened_at
```

### **Caso 3: ISI requiere soporte técnico**
```javascript
// 1. ISI crea ticket de soporte desde panel-empresa
// 2. Sistema asigna ticket a partner más cercano
// 3. EmailService.sendToPartner(partnerId, 'support_ticket', {...})
// 4. Verifica: partner.receive_support_tickets = true ✅
// 5. Envía desde: noreply@aponnt.com → partner@email.com
// 6. Partner ve email y acepta el trabajo
// 7. Sistema notifica a ISI que partner fue asignado
```

### **Caso 4: Vendedor cierra venta**
```javascript
// 1. Vendedor firma contrato con nueva empresa XYZ
// 2. Sistema actualiza estado del lead a "cliente"
// 3. EmailService.sendToVendor(vendorId, 'contract_signed', {...})
// 4. Vendedor recibe: "¡Felicitaciones! XYZ firmó contrato de $50,000"
// 5. EmailService.sendFromAponnt('transactional', {...}) → XYZ
// 6. XYZ recibe: "Bienvenido a Aponnt, tu empresa está activa"
```

### **Caso 5: Partner completa instalación**
```javascript
// 1. Partner instala kiosco biométrico en ISI
// 2. Partner marca servicio como completado
// 3. EmailService.sendToCompany(isiId, {...})
// 4. ISI recibe: "Instalación completada por {{partner_name}}"
// 5. EmailService.sendToPartner(partnerId, 'payment', {...})
// 6. Partner recibe: "Pago de $5,000 procesado (comisión incluida)"
```

---

## ✅ RESUMEN EJECUTIVO

### **¿Qué tenemos?**
- ✅ Sistema de emails con **5 capas independientes**
- ✅ **11 tablas** de base de datos (8 principales + 3 auxiliares)
- ✅ **Validación SMTP obligatoria** al crear empresas
- ✅ **Sincronización automática** mediante triggers
- ✅ **Preferencias granulares** por tipo de usuario y notificación
- ✅ **Logs completos** y auditoría de todos los envíos
- ✅ **Templates reutilizables** por empresa
- ✅ **Límites y cuotas** configurables
- ✅ **Vistas y estadísticas** profesionales

### **¿Qué falta integrar?**
- 📝 Actualizar formulario de alta de empresa (panel-administrativo.html)
- 📝 Crear ruta POST /api/v1/email/validate-smtp
- 📝 Modificar POST /api/v1/companies para requerir emailConfig
- 📝 Integrar con sistema de notificaciones existente
- 📝 Crear interfaz de preferencias de email para empleados

### **Archivos Creados**:
1. ✅ `migrations/20251028_email_system_multicapa.sql`
2. ✅ `migrations/20251028_extend_email_for_partners_vendors.sql`
3. ✅ `src/services/EmailService.js`
4. ✅ `EMAIL-SYSTEM-ARCHITECTURE.md`
5. ✅ `SISTEMA-EMAIL-5-CAPAS-COMPLETO.md` (este archivo)

---

**Autor**: Sistema Biométrico Aponnt
**Fecha**: 2025-10-28
**Versión**: 2.0.0 (5 Capas Completa)
