# 🔧 ESTRATEGIA DE MIGRACIÓN - LateArrivalAuthorizationService

**Fecha**: 2026-01-06
**Archivo**: `backend/src/services/LateArrivalAuthorizationService.js`
**Tamaño**: 25,372 tokens (~2,500 líneas)
**Estado actual**: BYPASS PARCIAL (4 métodos envían emails directamente)

---

## 📊 ANÁLISIS DE BYPASS

### Bypass detectados (4):

| Línea | Método | Subject | Destinatario | Workflow NCE |
|-------|--------|---------|--------------|--------------|
| **1105** | `_sendEmailNotification()` | ⚠️ Autorización Requerida - Llegada Tardía... | `authorizer.email` (supervisor/manager) | `attendance.late_arrival_authorization_request` |
| **1269** | `_sendFallbackNotification()` | ⚠️ [FALLBACK] Autorización Requerida... | `company.fallback_notification_email` (RRHH) | `attendance.late_arrival_authorization_request` |
| **2102** | `_sendEmployeeNotificationEmail()` | ⏳ Solicitud de Autorización Enviada... | `employeeData.email` | `attendance.late_arrival_processed` |
| **2187** | `_sendEmployeeResultEmail()` | ✅ APROBADA / ❌ RECHAZADA | `employeeData.email` | `attendance.late_arrival_approved` / `rejected` |

### ✅ Integración parcial existente:

- **Línea 1304**: Método `_sendViaUnifiedNotificationSystem()` ya usa `NotificationUnifiedService`
- **Nota**: Según FASE 1 del plan NCE, `NotificationUnifiedService` delega a NCE
- **Problema**: Los 4 métodos de email directo COEXISTEN con el sistema unificado

---

## 🎯 ESTRATEGIA DE MIGRACIÓN (ENFOQUE MÍNIMAMENTE INVASIVO)

### ❌ LO QUE NO HAREMOS:
- ~~Reescribir todo el servicio~~ (muy riesgoso, 2,500 líneas)
- ~~Modificar lógica de negocio~~ (funciona correctamente)
- ~~Cambiar API pública del servicio~~ (usada por routes)

### ✅ LO QUE HAREMOS:
**Reemplazo quirúrgico de las 4 llamadas `sendMail()` con `NCE.send()`**

---

## 📝 PLAN DE MIGRACIÓN (4 REEMPLAZOS)

### **REEMPLAZO 1** - Línea 1105 (_sendEmailNotification)

#### ANTES:
```javascript
await this.emailTransporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: authorizer.email,
  subject: `⚠️ Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
  html: htmlContent
});
```

#### DESPUÉS:
```javascript
const NCE = require('./NotificationCentralExchange');

await NCE.send({
  companyId: employeeData.company_id,
  module: 'attendance',
  workflowKey: 'attendance.late_arrival_authorization_request',

  originType: 'attendance',
  originId: authorizationToken, // O attendanceId si está disponible

  recipientType: 'user',
  recipientId: authorizer.user_id, // Necesitamos el user_id del authorizer

  title: `⚠️ Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
  message: `${employeeData.first_name} ${employeeData.last_name} (${employeeData.legajo}) llegó tarde ${lateMinutes} min al turno ${shiftData.name}.`,

  metadata: {
    employeeId: employeeData.id,
    employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
    employeeLegajo: employeeData.legajo,
    departmentName: employeeData.department_name,
    shiftName: shiftData.name,
    shiftStartTime: shiftData.startTime,
    lateMinutes,
    authorizationToken,
    approveUrl: `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`,
    rejectUrl: `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`,
    escalationInfo: authorizer.notify_escalation ? authorizer.escalation_info : null
  },

  priority: authorizer.notify_escalation ? 'urgent' : 'high',
  requiresAction: true,
  actionType: 'approval',
  slaHours: 0.25, // 15 minutos

  channels: ['email', 'push', 'websocket'], // Real-time

  escalationPolicy: {
    levels: [
      { after: '15m', escalateTo: 'manager' },
      { after: '30m', escalateTo: 'hr_manager' }
    ]
  }
});
```

---

### **REEMPLAZO 2** - Línea 1269 (_sendFallbackNotification)

#### ANTES:
```javascript
await this.emailTransporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: company.fallback_notification_email,
  subject: `⚠️ [FALLBACK] Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
  html: htmlContent
});
```

#### DESPUÉS:
```javascript
await NCE.send({
  companyId: employeeData.company_id,
  module: 'attendance',
  workflowKey: 'attendance.late_arrival_authorization_request',

  originType: 'attendance',
  originId: authorizationToken,

  // Fallback: enviar a rol hr_manager (RRHH)
  recipientType: 'role',
  recipientId: 'hr_manager',

  title: `⚠️ [FALLBACK] Autorización Requerida - Llegada Tardía ${employeeData.first_name} ${employeeData.last_name}`,
  message: `FALLBACK: No se encontró supervisor disponible. ${employeeData.first_name} ${employeeData.last_name} llegó tarde ${lateMinutes} min.`,

  metadata: {
    employeeId: employeeData.id,
    employeeName: `${employeeData.first_name} ${employeeData.last_name}`,
    employeeLegajo: employeeData.legajo,
    departmentName: employeeData.department_name,
    shiftName: shiftData.name,
    lateMinutes,
    authorizationToken,
    approveUrl: `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`,
    rejectUrl: `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`,
    isFallback: true
  },

  priority: 'urgent', // Fallback siempre es urgente
  requiresAction: true,
  actionType: 'approval',
  slaHours: 0.25,

  channels: ['email', 'push']
});
```

---

### **REEMPLAZO 3** - Línea 2102 (_sendEmployeeNotificationEmail)

#### ANTES:
```javascript
await this.emailTransporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: employeeData.email,
  subject: `⏳ Solicitud de Autorización Enviada - ${lateMinutes} min de retraso`,
  html: htmlContent
});
```

#### DESPUÉS:
```javascript
await NCE.send({
  companyId: employeeData.company_id,
  module: 'attendance',
  workflowKey: 'attendance.late_arrival_processed',

  originType: 'attendance',
  originId: authorizationToken,

  recipientType: 'user',
  recipientId: employeeData.user_id, // Necesitamos mapear employee → user

  title: `⏳ Solicitud de Autorización Enviada`,
  message: `Tu solicitud de autorización por ${lateMinutes} min de retraso fue enviada al supervisor. Recibirás una notificación cuando sea respondida.`,

  metadata: {
    lateMinutes,
    shiftName: shiftData.name,
    authorizationToken,
    windowMinutes
  },

  priority: 'normal',
  requiresAction: false, // Solo informativo

  channels: ['email', 'push'] // No inbox para empleado en este caso
});
```

---

### **REEMPLAZO 4** - Línea 2187 (_sendEmployeeResultEmail)

#### ANTES:
```javascript
await this.emailTransporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: employeeData.email,
  subject: `${isApproved ? '✅ APROBADA' : '❌ RECHAZADA'} - Tu solicitud de autorización`,
  html: htmlContent
});
```

#### DESPUÉS:
```javascript
const workflowKey = status === 'approved'
  ? 'attendance.late_arrival_approved'
  : 'attendance.late_arrival_rejected';

await NCE.send({
  companyId: employeeData.company_id,
  module: 'attendance',
  workflowKey,

  originType: 'attendance',
  originId: authorizationToken,

  recipientType: 'user',
  recipientId: employeeData.user_id,

  title: status === 'approved'
    ? '✅ APROBADA - Tu solicitud de autorización'
    : '❌ RECHAZADA - Tu solicitud de autorización',
  message: status === 'approved'
    ? `Tu supervisor ${authorizerData.first_name} aprobó tu ingreso tardío. Tienes ${windowMinutes} min para fichar.`
    : `Tu supervisor ${authorizerData.first_name} rechazó tu solicitud. ${notes || 'Sin comentarios.'}`,

  metadata: {
    status,
    authorizerName: `${authorizerData.first_name} ${authorizerData.last_name}`,
    authorizationWindow: authorizationWindow,
    windowMinutes,
    notes
  },

  priority: status === 'approved' ? 'urgent' : 'high', // Aprobada = urgente (debe fichar YA)
  requiresAction: false,

  channels: ['push', 'websocket'] // Real-time para que sepa INMEDIATAMENTE
});
```

---

## 🔧 MODIFICACIONES NECESARIAS AL ARCHIVO

### 1. Agregar import de NCE al inicio del archivo:

```javascript
// Al inicio del archivo (línea ~10)
const NCE = require('./NotificationCentralExchange');
```

### 2. Modificar las 4 líneas de `sendMail()` con los bloques DESPUÉS mostrados arriba

### 3. ⚠️ IMPORTANTE - Mapeo employee → user:

El servicio trabaja con `employeeData` pero NCE necesita `recipientId` (user_id). Opciones:

**Opción A** (Recomendada): Agregar user_id al employeeData en la query inicial
**Opción B**: Agregar helper method:
```javascript
async _getUserId(employeeId, companyId) {
  const user = await this.db.query(`
    SELECT user_id FROM users WHERE employee_id = $1 AND company_id = $2
  `, [employeeId, companyId]);
  return user.rows[0]?.user_id;
}
```

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ **0 llamadas a `sendMail()`** en el archivo (verificar con grep)
2. ✅ **4 workflows funcionando** en notification_log
3. ✅ **Backward compatibility 100%** - Las rutas que usan este servicio siguen funcionando
4. ✅ **Tests de integración pasando** - Flujo completo de late arrival request

---

## 🧪 PLAN DE TESTING

### Test 1: Solicitud de autorización (BYPASS 1)
```javascript
// Empleado llega tarde → Supervisor recibe email/push via NCE
const result = await lateArrivalService.sendAuthorizationRequest({
  employeeData: {...},
  shiftData: {...},
  lateMinutes: 15
});
// Verificar: notification_log con workflow attendance.late_arrival_authorization_request
```

### Test 2: Fallback a RRHH (BYPASS 2)
```javascript
// No hay supervisor → RRHH recibe notificación
// Verificar: notification_log con recipientType='role', recipientId='hr_manager'
```

### Test 3: Confirmación al empleado (BYPASS 3)
```javascript
// Empleado recibe confirmación de solicitud enviada
// Verificar: notification_log con workflow attendance.late_arrival_processed
```

### Test 4: Resultado al empleado (BYPASS 4)
```javascript
// Supervisor aprueba → Empleado recibe push inmediato
// Supervisor rechaza → Empleado recibe notificación de rechazo
// Verificar: 2 workflows (approved/rejected) en notification_log
```

---

## 📊 MÉTRICAS DE MIGRACIÓN

- **Líneas modificadas**: ~20 líneas (solo los 4 bloques sendMail)
- **Líneas agregadas**: ~100 líneas (4 bloques NCE.send con metadata completa)
- **Riesgo**: BAJO (cambios quirúrgicos, no afecta lógica de negocio)
- **Tiempo estimado**: 2-3 horas (incluyendo testing)

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Ejecutar migración SQL de workflows (ya creada: `20260106_seed_all_notification_workflows.sql`)
2. ✅ Implementar los 4 reemplazos en LateArrivalAuthorizationService.js
3. ✅ Agregar mapeo employee → user
4. ✅ Testing manual del flujo completo
5. ✅ Verificar grep: `0` resultados para `sendMail` en este archivo
6. ✅ Commit: "MIGRATION: LateArrivalAuthorizationService → NCE (4 bypass eliminated)"

---

**GENERADO**: 2026-01-06
**ESTADO**: Plan listo para implementación
**SIGUIENTE**: Implementar reemplazos + testing
