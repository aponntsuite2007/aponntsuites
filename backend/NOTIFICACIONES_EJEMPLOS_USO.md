# 🧪 SISTEMA DE NOTIFICACIONES V2.0 - EJEMPLOS DE USO

**Fecha:** 2025-10-16
**Versión:** 2.0

---

## 📋 TABLA DE CONTENIDOS

1. [Configuración Inicial](#configuración-inicial)
2. [Ejemplos con cURL](#ejemplos-con-curl)
3. [Ejemplos con JavaScript/Node.js](#ejemplos-con-javascriptnodejs)
4. [Flujos Completos](#flujos-completos)
5. [Testing Manual](#testing-manual)

---

## 🔧 CONFIGURACIÓN INICIAL

### 1. Ejecutar Migraciones SQL

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend

# Ejecutar creación de tablas
psql -U postgres -d biometric_db -f database/migrations/20251016_create_notification_system_tables.sql

# Insertar datos iniciales
psql -U postgres -d biometric_db -f database/migrations/20251016_insert_notification_system_data.sql

# Verificar tablas creadas
psql -U postgres -d biometric_db -c "\dt notification_*"
```

### 2. Configurar Variables de Entorno

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=biometric_db
DB_USER=postgres
DB_PASSWORD=tu_password

JWT_SECRET=tu_secret_key
BASE_URL=http://localhost:3000
```

### 3. Activar Módulos para una Empresa (Opcional)

```javascript
// Activar módulo de compatibilidad para empresa 11
const moduleService = require('./src/services/moduleService');

await moduleService.activateModule(
    11,                          // companyId
    'shift_compatibility',       // moduleCode
    {},                          // config
    new Date('2026-01-01'),      // expiresAt
    null                         // userLimit
);

// Verificar módulos activos
const activeModules = await moduleService.getActiveModules(11);
console.log('Módulos activos:', activeModules);
```

---

## 📡 EJEMPLOS CON cURL

### 1. Listar Tipos de Solicitud Disponibles

```bash
curl -X GET http://localhost:3000/api/notifications/request-types \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "Content-Type: application/json"
```

**Respuesta:**
```json
{
  "success": true,
  "request_types": [
    {
      "code": "vacation_request",
      "category": "time_off",
      "display_name_es": "Solicitud de Vacaciones Anuales",
      "icon": "🏖️",
      "color": "#007bff",
      "form_fields": [...]
    },
    ...
  ]
}
```

### 2. Crear Solicitud de Vacaciones

```bash
curl -X POST http://localhost:3000/api/notifications/requests \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "Content-Type: application/json" \
  -d '{
    "request_type_code": "vacation_request",
    "form_data": {
      "vacation_type": "Vacaciones anuales",
      "start_date": "2025-11-01",
      "end_date": "2025-11-10",
      "reason": "Viaje familiar"
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Solicitud creada exitosamente",
  "group": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "group_type": "vacation_request",
    "status": "open",
    "created_at": "2025-10-16T10:30:00.000Z"
  },
  "message": {
    "id": "...",
    "deadline_at": "2025-10-18T10:30:00.000Z",
    "requires_response": true
  }
}
```

### 3. Obtener Mis Grupos de Notificaciones

```bash
curl -X GET "http://localhost:3000/api/notifications/groups?status=open" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11"
```

**Respuesta:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "group_type": "vacation_request",
      "subject": "[SOLICITUD PENDIENTE] Vacaciones - EMP-ISI-001",
      "status": "open",
      "unread_count": 2,
      "message_count": 3,
      "created_at": "2025-10-16T10:30:00.000Z"
    }
  ]
}
```

### 4. Ver Cadena Completa de Mensajes de un Grupo

```bash
curl -X GET http://localhost:3000/api/notifications/groups/550e8400-e29b-41d4-a716-446655440000/messages \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11"
```

**Respuesta:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-1",
      "sequence_number": 1,
      "sender_type": "employee",
      "sender_id": "EMP-ISI-001",
      "recipient_type": "supervisor",
      "recipient_id": "SUP-001",
      "message_type": "request",
      "subject": "Solicitud de Vacaciones",
      "content": "...",
      "created_at": "2025-10-16T10:30:00.000Z",
      "deadline_at": "2025-10-18T10:30:00.000Z",
      "requires_response": true,
      "responded_at": null,
      "message_hash": "a3f5b8c9d2e1f4a7...",
      "context_data": []
    },
    {
      "id": "msg-2",
      "sequence_number": 2,
      "message_type": "approval",
      "content": "Aprobado",
      ...
    }
  ]
}
```

### 5. Responder a una Solicitud (Aprobar)

```bash
curl -X POST http://localhost:3000/api/notifications/groups/550e8400-e29b-41d4-a716-446655440000/respond \
  -H "x-employee-id: SUP-001" \
  -H "x-company-id: 11" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "msg-1",
    "action": "approve",
    "comments": "Aprobado. Que disfrute sus vacaciones."
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Solicitud aprobada exitosamente"
}
```

### 6. Rechazar una Solicitud

```bash
curl -X POST http://localhost:3000/api/notifications/groups/550e8400-e29b-41d4-a716-446655440000/respond \
  -H "x-employee-id: SUP-001" \
  -H "x-company-id: 11" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "msg-1",
    "action": "reject",
    "comments": "No hay cobertura suficiente en el equipo para esas fechas."
  }'
```

### 7. Marcar Mensaje como Leído

```bash
curl -X POST http://localhost:3000/api/notifications/messages/msg-1/read \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11"
```

### 8. Obtener Estadísticas de Notificaciones

```bash
curl -X GET http://localhost:3000/api/notifications/stats \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11"
```

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "open_groups": 3,
    "closed_groups": 12,
    "unread_messages": 5,
    "pending_responses": 2
  }
}
```

### 9. Listar Módulos Activos de mi Empresa

```bash
curl -X GET http://localhost:3000/api/notifications/modules \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11"
```

**Respuesta:**
```json
{
  "success": true,
  "modules": [
    {
      "module_code": "users",
      "module_name": "Gestión de Usuarios",
      "category": "core",
      "is_active": true
    },
    {
      "module_code": "shift_compatibility",
      "module_name": "Matriz de Compatibilidad",
      "category": "premium",
      "is_active": true,
      "licensed_since": "2025-01-01",
      "license_expires_at": "2026-01-01"
    }
  ]
}
```

### 10. Ver Catálogo Completo de Módulos

```bash
curl -X GET http://localhost:3000/api/notifications/modules/catalog \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11"
```

---

## 💻 EJEMPLOS CON JAVASCRIPT/NODE.JS

### Ejemplo 1: Crear Solicitud de Cambio de Turno

```javascript
const requestService = require('./src/services/requestService');

async function solicitarCambioTurno() {
    try {
        const result = await requestService.createRequest(
            'EMP-001',              // Pedro (solicitante)
            'shift_swap_request',   // Tipo de solicitud
            {
                target_employee_id: 'EMP-002',  // Juan (con quien cambiar)
                swap_date: '2025-10-20',
                reason: 'Tengo un compromiso familiar ese día'
            },
            11  // companyId
        );

        console.log('✅ Solicitud creada:', result.group.id);
        console.log('📤 Notificación enviada a:', result.message.recipient_id);
        console.log('⏰ Deadline:', result.message.deadline_at);

        return result;

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

solicitarCambioTurno();
```

### Ejemplo 2: Verificar si Módulo está Activo

```javascript
const moduleService = require('./src/services/moduleService');

async function verificarModulo() {
    const companyId = 11;
    const moduleCode = 'shift_compatibility';

    const isActive = await moduleService.isModuleActive(companyId, moduleCode);

    if (isActive) {
        console.log(`✅ Módulo "${moduleCode}" está activo para empresa ${companyId}`);
        // Ejecutar funcionalidad del módulo
    } else {
        console.log(`⏭️ Módulo "${moduleCode}" no está activo, saltando validación`);
        // Continuar sin módulo
    }
}

verificarModulo();
```

### Ejemplo 3: Ejecutar Función Solo si Módulo Activo

```javascript
const moduleService = require('./src/services/moduleService');

async function validarCompatibilidad(emp1, emp2) {
    const result = await moduleService.executeIfModuleActive(
        11,  // companyId
        'shift_compatibility',
        async () => {
            // MÓDULO ACTIVO → Ejecutar validación
            console.log('✅ Validando compatibilidad de tareas...');

            // Lógica de validación
            const compatible = await checkTaskCompatibility(emp1, emp2);

            return { compatible, checked: true };
        },
        async () => {
            // MÓDULO INACTIVO → Fallback
            console.log('⏭️ Módulo no activo, saltando validación');
            return { compatible: true, checked: false, skipped: true };
        }
    );

    return result;
}
```

### Ejemplo 4: Obtener Grupos y Mensajes

```javascript
const db = require('./src/config/database');

async function obtenerNotificaciones(employeeId, companyId) {
    // Obtener grupos abiertos
    const grupos = await db.query(`
        SELECT * FROM notification_groups
        WHERE company_id = $1
        AND (initiator_id = $2 OR EXISTS (
            SELECT 1 FROM notification_messages
            WHERE group_id = notification_groups.id
            AND (sender_id = $2 OR recipient_id = $2)
        ))
        AND status = 'open'
        ORDER BY created_at DESC
    `, [companyId, employeeId]);

    console.log(`📋 Tienes ${grupos.rows.length} notificaciones abiertas:`);

    // Para cada grupo, obtener mensajes
    for (const grupo of grupos.rows) {
        const mensajes = await db.query(`
            SELECT * FROM notification_messages
            WHERE group_id = $1
            ORDER BY sequence_number ASC
        `, [grupo.id]);

        console.log(`\n🔗 Grupo: ${grupo.subject}`);
        console.log(`   Mensajes: ${mensajes.rows.length}`);
        console.log(`   Estado: ${grupo.status}`);
    }
}

obtenerNotificaciones('EMP-ISI-001', 11);
```

---

## 🔄 FLUJOS COMPLETOS

### FLUJO 1: Solicitud de Vacaciones Completa

```javascript
// PASO 1: Empleado solicita vacaciones
const result = await requestService.createRequest(
    'EMP-001',
    'vacation_request',
    {
        vacation_type: 'Vacaciones anuales',
        start_date: '2025-11-01',
        end_date: '2025-11-10',
        reason: 'Viaje familiar'
    },
    11
);

const groupId = result.group.id;
const messageId = result.message.id;

// PASO 2: Supervisor aprueba (48 horas después)
// Simular aprobación del supervisor SUP-001
await db.query(`
    UPDATE notification_messages
    SET responded_at = NOW()
    WHERE id = $1
`, [messageId]);

// Crear respuesta de aprobación
await flowExecutorService.executeNextStep(groupId, 2, {
    approved_by: 'SUP-001',
    comments: 'Aprobado'
});

// PASO 3: RRHH aprueba (24 horas después)
// El flujo continúa automáticamente...

// PASO 4: Sistema ejecuta acciones
// - Deduce días de vacaciones
// - Bloquea asistencia en esas fechas
// - Sincroniza calendario (si módulo activo)

// PASO 5: Notifica a todos
// - Empleado recibe confirmación
// - Supervisor recibe confirmación
// - RRHH recibe confirmación
// - Grupo se cierra
```

### FLUJO 2: Cambio de Turno con Validación de Compatibilidad

```javascript
// PASO 1: Pedro solicita cambio con Juan
const result = await requestService.createRequest(
    'EMP-PEDRO',
    'shift_swap_request',
    {
        target_employee_id: 'EMP-JUAN',
        swap_date: '2025-10-20',
        reason: 'Compromiso familiar'
    },
    11
);

// PASO 2: Juan recibe notificación y acepta
// ...

// PASO 3: Sistema valida compatibilidad (si módulo activo)
const compatResult = await moduleService.executeIfModuleActive(
    11,
    'shift_compatibility',
    async () => {
        // Validar si médico puede cambiar con farmacia
        const compat = await checkTaskCompatibility('EMP-PEDRO', 'EMP-JUAN');

        if (!compat.compatible) {
            await flowExecutorService.endChainAndNotifyAll(
                groupId,
                'incompatible_tasks',
                { reason: 'Médico no puede cambiar con farmacia' }
            );
            return { valid: false };
        }

        return { valid: true };
    },
    async () => {
        // Módulo no activo → saltear validación
        return { valid: true, skipped: true };
    }
);

// PASO 4: Supervisor aprueba
// ...

// PASO 5: RRHH aprueba con análisis de costos
// Sistema calcula automáticamente:
// - ¿Genera horas extra?
// - ¿Viola período de descanso?
// - Costo estimado
// Y muestra alertas a RRHH en la notificación

// PASO 6: Sistema ejecuta cambios
// - Actualiza asignaciones de turno
// - Actualiza permisos de kiosco (Pedro NO puede fichar, Juan SÍ)
// - Notifica a ART (si módulo activo)

// PASO 7: Todos reciben confirmación
```

---

## 🧪 TESTING MANUAL

### Test 1: Sistema Plug & Play

```javascript
// Verificar que sistema funciona SIN módulo de compatibilidad
await moduleService.deactivateModule(11, 'shift_compatibility');

// Crear solicitud de cambio de turno
const result = await requestService.createRequest(
    'EMP-001',
    'shift_swap_request',
    { target_employee_id: 'EMP-002', swap_date: '2025-10-20' },
    11
);

// Verificar en logs que el paso de compatibilidad se SALTEA
// Debe mostrar: "⏭️ Módulo shift_compatibility no activo, saltando validación"

// El flujo debe CONTINUAR sin problemas al siguiente paso
```

### Test 2: Validaciones de Negocio

```javascript
// Test: Solicitar vacaciones con menos de 15 días de anticipación
try {
    await requestService.createRequest(
        'EMP-001',
        'vacation_request',
        {
            start_date: '2025-10-18',  // Solo 2 días de anticipación
            end_date: '2025-10-20'
        },
        11
    );
} catch (error) {
    console.log('✅ Validación funcionó:', error.message);
    // Debe mostrar: "Debe solicitar con al menos 15 días de anticipación (tiene 2 días)"
}
```

### Test 3: Flujo Completo con Rechazo

```javascript
// Crear solicitud
const result = await requestService.createRequest('EMP-001', 'vacation_request', {...}, 11);

// Supervisor RECHAZA
await db.query(`
    UPDATE notification_messages SET responded_at = NOW() WHERE id = $1
`, [result.message.id]);

await flowExecutorService.endChainAndNotifyAll(
    result.group.id,
    'rejected',
    { rejected_by: 'SUP-001', reason: 'No hay cobertura' }
);

// Verificar que:
// 1. Grupo se cerró (status = 'closed')
// 2. Todos los participantes recibieron notificación
// 3. No se ejecutaron pasos siguientes
```

### Test 4: Hash y Auditoría

```javascript
// Crear solicitud
const result = await requestService.createRequest('EMP-001', 'vacation_request', {...}, 11);

// Obtener mensaje
const message = await db.query('SELECT * FROM notification_messages WHERE id = $1', [result.message.id]);

// Verificar hash
console.log('Hash SHA-256:', message.rows[0].message_hash);
console.log('Longitud:', message.rows[0].message_hash.length);  // Debe ser 64 caracteres

// Verificar audit log
const auditLog = await db.query('SELECT * FROM notification_audit_log WHERE group_id = $1', [result.group.id]);
console.log('Entradas de auditoría:', auditLog.rows.length);  // Debe ser > 0
```

---

## 🔍 QUERIES ÚTILES PARA DEBUGGING

### Ver todos los grupos abiertos

```sql
SELECT
    ng.id,
    ng.subject,
    ng.status,
    ng.created_at,
    COUNT(nm.id) as message_count
FROM notification_groups ng
LEFT JOIN notification_messages nm ON nm.group_id = ng.id
WHERE ng.company_id = 11
AND ng.status = 'open'
GROUP BY ng.id
ORDER BY ng.created_at DESC;
```

### Ver cadena completa de un grupo

```sql
SELECT
    nm.sequence_number,
    nm.sender_type,
    nm.sender_id,
    nm.recipient_type,
    nm.recipient_id,
    nm.message_type,
    nm.content,
    nm.created_at,
    nm.deadline_at,
    nm.responded_at
FROM notification_messages nm
WHERE nm.group_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY nm.sequence_number ASC;
```

### Ver módulos activos por empresa

```sql
SELECT
    sm.module_code,
    sm.module_name,
    sm.category,
    cm.is_active,
    cm.license_expires_at
FROM system_modules sm
LEFT JOIN company_modules cm ON sm.module_code = cm.module_code AND cm.company_id = 11
WHERE sm.is_core = true OR cm.is_active = true
ORDER BY sm.category, sm.module_name;
```

### Ver audit log de un grupo

```sql
SELECT
    nal.action,
    nal.actor_id,
    nal.actor_type,
    nal.timestamp,
    nal.metadata
FROM notification_audit_log nal
WHERE nal.group_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY nal.timestamp ASC;
```

---

## ✅ CHECKLIST DE TESTING

- [ ] Crear solicitud de vacaciones
- [ ] Crear solicitud de cambio de turno
- [ ] Aprobar solicitud
- [ ] Rechazar solicitud
- [ ] Verificar flujo completo (inicio a fin)
- [ ] Probar con módulo activo
- [ ] Probar con módulo inactivo (debe saltar paso)
- [ ] Verificar validaciones de negocio
- [ ] Verificar cálculo de hash SHA-256
- [ ] Verificar audit log
- [ ] Marcar mensajes como leídos
- [ ] Verificar estadísticas
- [ ] Listar módulos activos
- [ ] Activar/desactivar módulo

---

**Última actualización:** 2025-10-16
**Versión:** 1.0
