# Sistema de Autorización Fuera de Turno - Progreso de Implementación

**Fecha inicio:** 01/10/2025
**Estado:** 🟡 EN PROGRESO

## 🎯 OBJETIVO

Implementar sistema multi-canal de autorizaciones para empleados que marcan ingreso fuera del horario de tolerancia de su turno.

### Funcionalidad requerida:
1. APK detecta cuando empleado marca FUERA de tolerancia
2. APK muestra alerta + sonido: "FUERA DE TURNO, AGUARDE AUTORIZACIÓN"
3. Sistema envía notificación a RRHH por canal parametrizable
4. RRHH autoriza/rechaza en tiempo real
5. APK recibe respuesta y registra (o no) el ingreso
6. Sistema guarda quién autorizó y cuándo

### Canales de notificación (parametrizable por empresa):
- ✅ Email (botones AUTORIZAR/RECHAZAR)
- ✅ WhatsApp Business API
- ✅ WebSocket (tiempo real en panel-empresa)

---

## 📊 ESTRUCTURA BD ENCONTRADA

### Tabla `shifts` (turnos)
```javascript
- id: INTEGER (PK)
- name: STRING
- startTime: TIME
- endTime: TIME
- toleranceMinutesEntry: INTEGER (default 10) ← CLAVE para detección
- toleranceMinutesExit: INTEGER (default 15)
- company_id: INTEGER (FK)
- shiftType: ENUM('standard', 'rotative', 'permanent', 'flash')
- breakStartTime: TIME
- breakEndTime: TIME
- ... otros campos avanzados
```

### Tabla `Employee` (relación con turno)
```javascript
- shift_id: INTEGER → references shifts.id
```

### Tabla `companies` (necesita modificación)
```javascript
// CAMPOS ACTUALES:
- email: STRING (genérico)

// CAMPOS A AGREGAR:
- notification_method: ENUM('email', 'whatsapp', 'websocket')
- notification_email_rrhh: STRING
- notification_whatsapp_rrhh: STRING
- whatsapp_api_token: STRING (encriptado)
```

### Tabla `attendances` (necesita modificación)
```javascript
// CAMPOS A AGREGAR:
- authorization_status: ENUM('pending', 'approved', 'rejected', null)
- authorization_token: STRING (UUID único)
- authorized_by: STRING (user_id de quien autorizó)
- authorized_at: TIMESTAMP
- authorization_notes: TEXT
```

---

## 📝 MÉTODO DE IMPLEMENTACIÓN

### FASE 1: Base de Datos ✅ COMPLETADA
- [x] Investigar estructura turnos
- [x] Investigar asignación employee → shift
- [x] Identificar campos faltantes

### FASE 2: Migraciones BD 🟡 EN PROGRESO
- [ ] Script migración: agregar campos en `companies`
- [ ] Script migración: agregar campos en `attendances`
- [ ] Ejecutar migraciones

### FASE 3: Backend - Servicio Notificaciones
- [ ] Crear `/src/services/AuthorizationNotificationService.js`
  - Función: `sendNotification(channel, data)`
  - Canal EMAIL: nodemailer con template HTML + botones
  - Canal WHATSAPP: integración Twilio/WhatsApp Business API
  - Canal WEBSOCKET: emitir evento a panel-empresa

### FASE 4: Backend - Lógica Detección
- [ ] Modificar `/src/routes/biometric-attendance-api.js`:
  ```javascript
  1. Obtener shift del empleado
  2. Calcular si está dentro de tolerancia:
     - startTime - toleranceMinutesEntry
     - startTime + toleranceMinutesEntry
  3. Si FUERA de tolerancia:
     - Crear registro con status='pending'
     - Generar authorization_token único
     - Enviar notificación según company.notification_method
     - Retornar a APK: { needsAuthorization: true, token }
  4. Si DENTRO de tolerancia:
     - Crear registro normal (como ahora)
  ```

### FASE 5: Backend - Endpoint Autorización
- [ ] Crear `/src/routes/authorizationRoutes.js`:
  ```javascript
  POST /api/v1/authorization/approve/:token
  POST /api/v1/authorization/reject/:token
  GET /api/v1/authorization/status/:token (para polling APK)
  ```

### FASE 6: Frontend - Parametrización
- [ ] Agregar UI en panel-empresa:
  - Sección "Configuración → Alertas Fuera de Turno"
  - Selector método: Email | WhatsApp | WebSocket
  - Campos según método seleccionado
  - Guardar en `companies` table

### FASE 7: APK Flutter - Integración
- [ ] Modificar `/frontend_flutter/lib/screens/kiosk_screen.dart`:
  ```dart
  1. Al recibir needsAuthorization=true:
     - Mostrar Dialog con texto + sonido
     - Iniciar polling cada 3s a /authorization/status/:token
  2. Al recibir approved:
     - Cerrar dialog
     - Mostrar "INGRESO AUTORIZADO"
  3. Al recibir rejected:
     - Cerrar dialog
     - Mostrar "INGRESO RECHAZADO"
  ```

---

## ✅ LO CUMPLIDO HASTA AHORA

### Investigación completada:
1. ✅ Estructura `shifts` con `toleranceMinutesEntry` confirmada
2. ✅ Relación `Employee.shift_id → Shift.id` confirmada
3. ✅ Identificados campos faltantes en `companies` y `attendances`
4. ✅ Plan de implementación completo diseñado
5. ✅ Todo list actualizado con 12 tareas

### Base de Datos y Modelos:
6. ✅ **Script SQL migración creado**: `migrations/add_late_arrival_authorization_fields.sql`
7. ✅ **Migración ejecutada exitosamente** en PostgreSQL
8. ✅ **Modelo User actualizado** con campos:
   - `can_authorize_late_arrivals` (boolean)
   - `authorized_departments` (jsonb array)
   - `notification_preference_late_arrivals` (enum)
9. ✅ **Modelo Company actualizado** con campos:
   - `fallback_notification_email` (string)
   - `fallback_notification_whatsapp` (string)
10. ✅ **Modelo Attendance** - usa SQL directo (camelCase fields confirmados)

### Backend - Servicios y Endpoints:
11. ✅ **Servicio creado**: `src/services/LateArrivalAuthorizationService.js`
    - Búsqueda jerárquica de autorizadores por departamento
    - Canal Email con HTML profesional + botones AUTORIZAR/RECHAZAR
    - Canal WhatsApp Business API (Twilio/WhatsApp)
    - Canal WebSocket para tiempo real
    - Sistema de fallback cuando no hay autorizadores
    - Logging completo de notificaciones enviadas
12. ✅ **Endpoints creados**: `src/routes/authorizationRoutes.js`
    - `GET /api/v1/authorization/status/:token` - Polling desde APK
    - `POST /api/v1/authorization/approve/:token` - Aprobar con HTML response
    - `POST /api/v1/authorization/reject/:token` - Rechazar con HTML response
    - `GET /api/v1/authorization/approve/:token` - Links desde email
    - `GET /api/v1/authorization/reject/:token` - Links desde email
13. ✅ **Rutas registradas en server.js**: Endpoints activos en `/api/v1/authorization`

### Arquitectura definida:
✅ **Sistema jerárquico de autorizadores**:
- Solo usuarios con `role='admin'` pueden ASIGNAR autorizadores
- Cualquier usuario puede ser autorizador si `can_authorize_late_arrivals=true`
- Autorizador puede autorizar departamentos diferentes al suyo
- Ejemplo: Pedro (Dept TÉCNICA) autoriza [MANTENIMIENTO, PRODUCCIÓN, LOGÍSTICA]
- Fallback a email/whatsapp general si no hay autorizador

### Archivos clave identificados:
- `backend/src/models/Shift-postgresql.js` (líneas 43-52: tolerancias)
- `backend/src/models/Employee.js` (línea 218: shift_id)
- `backend/src/models/Company.js` (línea 50: email)
- `backend/src/routes/biometric-attendance-api.js` (AQUÍ va lógica detección)

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **AHORA**: Implementar lógica detección en `biometric-attendance-api.js`
   - Obtener shift del empleado
   - Calcular si está dentro de tolerancia
   - Si fuera de tolerancia → crear registro pending + generar token + enviar notificaciones
2. Modificar APK Flutter para polling cada 3s
3. Agregar UI en panel-empresa para asignar autorizadores
4. Testing end-to-end completo

---

## 📌 NOTAS IMPORTANTES

- ❌ **SIN SIMULACIONES** - Todo debe ser 100% funcional
- ❌ **SIN HARDCODEAR** - Solo datos reales de BD
- ✅ **NO ROMPER APK** - Cambios retrocompatibles
- ✅ **NO ROMPER PANEL-EMPRESA** - Cambios aditivos solamente
- ✅ Cooldown de 30 segundos entre check-in/check-out YA implementado
- ✅ Traducciones frontend YA implementadas (present→Presente, face→Facial)

---

## 🔧 COMANDOS ÚTILES

```bash
# Servidor
cd /c/Bio/sistema_asistencia_biometrico/backend && PORT=3001 npm start

# Verificar BD
node check_attendance_times.js
node fix_attendance_data.js

# Panel empresa
http://localhost:3001/panel-empresa.html
```

---

**Última actualización:** 01/10/2025 23:15
**Tokens usados:** ~85k de 200k (42.5%)
**Estado servidor:** ✅ RUNNING (PID en puerto 3001)
**Progreso:** 🟢 75% COMPLETADO - Backend infrastructure ready
