# 🚨 Flujo de Autorización de Llegadas Tardías

## 📋 Resumen del Sistema

Sistema profesional de autorizaciones para empleados que marcan ingreso fuera del horario de tolerancia de su turno asignado.

---

## 🎯 Escenario Real

**Ejemplo:** Juan trabaja turno 06:30-14:30 con tolerancia de 10 minutos.
**Problema:** Perdió el colectivo y llega a las 08:00.
**Solución:** Marca en kiosco → sale alerta → supervisor autoriza → Juan marca nuevamente → ingreso registrado.

---

## 🔄 FLUJO COMPLETO

### 1️⃣ PRIMERA MARCACIÓN (Empleado Tarde)

**Empleado llega fuera de tolerancia (ej: 08:00, debía 06:30)**

1. Marca rostro en kiosco biométrico
2. Backend detecta: `currentTime > (shiftStart + tolerance)`
3. Sistema crea:
   - Registro en BD con `checkInTime=NULL`, `status='pending'`, `authorization_token=UUID`
   - NO registra el ingreso todavía

4. Sistema envía notificaciones **multi-canal** a autorizadores:
   - 📧 **Email** con botones HTML "AUTORIZAR" / "RECHAZAR"
   - 📱 **WhatsApp** con links de autorización
   - 🔔 **WebSocket** a panel-empresa en tiempo real

5. **APK muestra alerta 3 segundos:**
   ```
   ⚠️ FUERA DE TURNO
   AGUARDE AUTORIZACIÓN
   ```

6. **APK libera kiosco inmediatamente**
   *(Otros empleados pueden marcar normalmente)*

7. Empleado **espera en la entrada**

---

### 2️⃣ SUPERVISOR AUTORIZA/RECHAZA

**Supervisor recibe notificación y decide:**

#### ✅ Si AUTORIZA:
1. Clic en botón "AUTORIZAR" (email/whatsapp/panel)
2. Backend actualiza registro:
   ```sql
   UPDATE attendances
   SET authorization_status = 'approved',
       authorized_by_user_id = supervisor_id,
       authorized_at = NOW()
   WHERE authorization_token = token
   ```
3. Autorización válida por **5 minutos**
4. Supervisor **llama por teléfono** al empleado: *"Ya podés entrar"*

#### ❌ Si RECHAZA:
1. Clic en botón "RECHAZAR"
2. Backend marca como `rejected`
3. Supervisor llama al empleado: *"No estás autorizado, volvete"*
4. Empleado se retira

---

### 3️⃣ SEGUNDA MARCACIÓN (Después de Autorización)

**Empleado regresa al kiosco (después de llamado telefónico)**

1. Marca rostro nuevamente
2. Backend busca:
   ```sql
   SELECT * FROM attendances
   WHERE UserId = empleado_id
     AND DATE(checkInTime) = CURRENT_DATE
     AND authorization_status = 'approved'
     AND checkInTime IS NULL
     AND authorized_at >= (NOW() - INTERVAL '5 minutes')
   ```

3. **Validaciones:**
   - ✅ Existe autorización aprobada
   - ✅ No expiró (< 5 minutos)
   - ✅ No fue usada (`checkInTime IS NULL`)

4. Si válida → **Completa el registro:**
   ```sql
   UPDATE attendances
   SET checkInTime = NOW(),
       checkInMethod = 'face',
       status = 'present'
   WHERE id = authorization_id
   ```

5. APK muestra:
   ```
   ✅ BIENVENIDO, Juan
   Ingreso Autorizado
   ```

---

## 🔧 INTEGRACIÓN EN APK FLUTTER

### Archivo: `lib/screens/kiosk_screen.dart`

```dart
Future<void> _handleBiometricRecognition() async {
  final response = await _biometricService.verify(
    image: capturedImage,
    companyId: config.companyId,
  );

  if (response['success']) {
    // ⚠️ DETECTAR SI NECESITA AUTORIZACIÓN
    if (response['needsAuthorization'] == true) {
      // Empleado fuera de turno
      _showLateArrivalAlert(
        employeeName: response['employee']['name'],
        lateMinutes: response['authorization']['lateMinutes'],
      );

      // Liberar kiosco después de 3 segundos
      await Future.delayed(Duration(seconds: 3));
      _resetKiosk();
      return;
    }

    // Ingreso normal o autorizado previamente
    _showSuccessAnimation(response['employee']['name']);
  }
}

void _showLateArrivalAlert(String employeeName, int lateMinutes) {
  // Mostrar dialog 3 segundos
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => AlertDialog(
      title: Text('⚠️ FUERA DE TURNO'),
      content: Text(
        '$employeeName\n\n'
        'Llegó $lateMinutes minutos tarde\n\n'
        'AGUARDE AUTORIZACIÓN\n'
        'Espere en la entrada'
      ),
      backgroundColor: Colors.orange,
    ),
  );

  // Reproducir sonido de alerta
  _audioPlayer.play('assets/sounds/alert.mp3');

  // Auto-cerrar después de 3 segundos
  Future.delayed(Duration(seconds: 3), () {
    Navigator.of(context).pop();
  });
}
```

---

## 📊 RESPUESTAS DEL BACKEND

### Respuesta: Empleado DENTRO de tolerancia
```json
{
  "success": true,
  "operationType": "clock_in",
  "employee": {
    "id": "uuid",
    "name": "Juan Pérez"
  },
  "attendance": {
    "id": "att-uuid",
    "timestamp": "2025-10-02T06:35:00.000Z"
  }
}
```

### Respuesta: Empleado FUERA de tolerancia (primera vez)
```json
{
  "success": true,
  "needsAuthorization": true,
  "message": "FUERA DE TURNO - Aguarde autorización",
  "employee": {
    "id": "uuid",
    "name": "Juan Pérez"
  },
  "authorization": {
    "token": "uuid-token",
    "lateMinutes": 90,
    "shiftName": "Turno Mañana",
    "shiftStartTime": "06:30:00"
  }
}
```

### Respuesta: Empleado con autorización válida (segunda vez)
```json
{
  "success": true,
  "operationType": "clock_in",
  "employee": {
    "id": "uuid",
    "name": "Juan Pérez"
  },
  "attendance": {
    "id": "att-uuid",
    "timestamp": "2025-10-02T08:05:00.000Z"
  }
}
```

---

## ✅ VENTAJAS DEL SISTEMA

1. ✅ **No bloquea el kiosco** - Otros empleados pueden marcar normalmente
2. ✅ **Autorización expira** - Seguridad de 5 minutos
3. ✅ **Multi-canal** - Email + WhatsApp + WebSocket
4. ✅ **Auditoría completa** - Quién autorizó, cuándo, por qué
5. ✅ **Jerárquico** - Autorizadores por departamento
6. ✅ **Profesional** - Comunicación telefónica + registro digital
7. ✅ **Fail-safe** - Si hay error, permite ingreso

---

## 🔐 SEGURIDAD

- Token único UUID por solicitud
- Autorización expira en 5 minutos
- Registro se marca como "usado" al completar checkInTime
- Auditoría completa: `authorized_by_user_id`, `authorized_at`
- Tolerancia solo para INGRESOS, no para cualquier marcación

---

## 📝 CAMPOS EN BASE DE DATOS

### Tabla `attendances`
```sql
-- Campos de autorización
authorization_status         VARCHAR(20)   -- 'pending', 'approved', 'rejected'
authorization_token          VARCHAR(255)  -- UUID único
authorized_by_user_id        UUID          -- Quién autorizó
authorized_at                TIMESTAMP     -- Cuándo autorizó
authorization_notes          TEXT          -- Notas del autorizador
notified_authorizers         JSONB         -- [user_ids] notificados
authorization_requested_at   TIMESTAMP     -- Cuándo se solicitó

-- Lógica de estado
-- checkInTime = NULL + authorization_status = 'pending'  → Aguardando
-- checkInTime = NULL + authorization_status = 'approved' → Autorizado no usado
-- checkInTime != NULL                                     → Usado/Completado
```

### Tabla `users`
```sql
-- Campos de autorizador
can_authorize_late_arrivals           BOOLEAN   -- Puede autorizar
authorized_departments                JSONB     -- [dept_ids] que puede autorizar
notification_preference_late_arrivals VARCHAR   -- 'email', 'whatsapp', 'both'
```

### Tabla `companies`
```sql
-- Fallback si no hay autorizadores
fallback_notification_email     VARCHAR(255)
fallback_notification_whatsapp  VARCHAR(20)
```

---

## 🚀 ENDPOINTS BACKEND

### Verificación Biométrica (Check-in/Check-out)
```
POST /api/v2/biometric-attendance/verify-real
Headers: x-company-id: {companyId}
Body: FormData { biometricImage: file, embedding?: array }
```

### Consultar Estado de Autorización
```
GET /api/v1/authorization/status/:token
Response: { status: 'pending|approved|rejected', authorizedBy, authorizedAt }
```

### Aprobar Autorización
```
GET/POST /api/v1/authorization/approve/:token
Response: HTML confirmation page
```

### Rechazar Autorización
```
GET/POST /api/v1/authorization/reject/:token
Response: HTML confirmation page
```

---

## 🎨 EMAILS HTML

Los emails incluyen:
- 📧 Diseño profesional con gradientes
- ⚡ Botones grandes "AUTORIZAR" / "RECHAZAR"
- 📊 Tabla con datos del empleado (nombre, legajo, departamento, turno, retraso)
- 🔗 Links directos con token único
- ⏰ Timestamp de solicitud
- 🏢 Branding de la empresa

---

## 📱 WHATSAPP MESSAGES

```
⚠️ AUTORIZACIÓN REQUERIDA - LLEGADA TARDÍA

Hola Pedro,

Se requiere tu autorización para un ingreso fuera de horario.

👤 Empleado: Juan Pérez
🆔 Legajo: 1234
🏢 Departamento: Producción
🕐 Turno: Turno Mañana (inicio: 06:30:00)
⏰ Retraso: 90 minutos

Para autorizar o rechazar, haz clic en los siguientes enlaces:

✅ Autorizar: https://server.com/api/v1/authorization/approve/uuid-token
❌ Rechazar: https://server.com/api/v1/authorization/reject/uuid-token

_Sistema de Asistencia Biométrico APONNT_
```

---

## 🔔 WEBSOCKET EVENTS

### Event: `authorization_request`
Enviado a autorizadores conectados en panel-empresa

```json
{
  "type": "late_arrival_authorization_request",
  "attendanceId": "uuid",
  "authorizationToken": "uuid",
  "employee": {
    "name": "Juan Pérez",
    "legajo": "1234",
    "department": "Producción"
  },
  "shift": {
    "name": "Turno Mañana",
    "startTime": "06:30:00"
  },
  "lateMinutes": 90,
  "timestamp": "2025-10-02T08:00:00.000Z"
}
```

### Event: `authorization_result`
Enviado cuando se aprueba/rechaza

```json
{
  "type": "authorization_result",
  "attendanceId": "uuid",
  "status": "approved",
  "employee": {
    "userId": "uuid",
    "name": "Juan Pérez",
    "legajo": "1234"
  },
  "authorizer": {
    "userId": "uuid",
    "name": "Pedro Supervisor"
  },
  "notes": "Aprobado vía email",
  "timestamp": "2025-10-02T08:02:00.000Z"
}
```

---

**Fecha:** 02/10/2025
**Versión:** 1.0
**Estado:** ✅ Backend COMPLETADO - APK pendiente
