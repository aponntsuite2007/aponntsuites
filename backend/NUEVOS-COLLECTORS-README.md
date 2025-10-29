# NUEVOS COLLECTORS - Sistema de Auditoría Extendido

**Fecha**: Octubre 24, 2025
**Status**: ✅ Implementados y listos para uso

---

## 📋 RESUMEN

Se han creado **3 collectors especializados** para el sistema de auditoría automatizada, expandiendo la cobertura de testing más allá de los tests básicos de endpoint y base de datos.

### Collectors implementados:
1. ✅ **NotificationsCollector** - Sistema de notificaciones empresariales
2. ✅ **MedicalWorkflowCollector** - Flujos de trabajo médicos
3. ✅ **RealtimeCollector** - WebSocket y tiempo real

**Total de tests nuevos**: **36 tests** (12 por collector)

---

## 🔔 1. NOTIFICATIONS COLLECTOR

### Archivo
`backend/src/auditor/collectors/NotificationsCollector.js`

### Descripción
Tests completos del módulo de notificaciones empresariales, cubriendo creación, lectura, aprobaciones, SLA, templates, y escalación automática.

### Tests incluidos (12):

| # | Test | Descripción |
|---|------|-------------|
| 1 | **Create Notification** | Crear notificación básica con prioridad |
| 2 | **List Notifications** | Listar notificaciones con filtros |
| 3 | **Mark as Read** | Marcar notificación como leída |
| 4 | **Respond to Notification** | Responder a notificación |
| 5 | **Approval Workflow** | Flujo de aprobación de notificaciones |
| 6 | **SLA Validation** | Validación de SLA y deadlines |
| 7 | **Templates** | Sistema de templates de notificaciones |
| 8 | **Proactive Notifications** | Notificaciones proactivas automáticas |
| 9 | **User Preferences** | Preferencias de notificación por usuario |
| 10 | **Inbox** | Sistema de bandeja de entrada |
| 11 | **Auto-escalation** | Escalación automática de notificaciones |
| 12 | **Statistics** | Estadísticas de notificaciones |

### Casos de uso cubiertos:
- ✅ Notificaciones de sistema
- ✅ Notificaciones con aprobación requerida
- ✅ SLA tracking con deadlines
- ✅ Templates personalizables
- ✅ Preferencias por usuario
- ✅ Auto-escalación cuando expira SLA
- ✅ Estadísticas y reporting

### Endpoints testeados:
```
POST   /api/v1/enterprise/notifications
GET    /api/v1/enterprise/notifications
PATCH  /api/v1/enterprise/notifications/:id/read
POST   /api/v1/enterprise/notifications/:id/respond
POST   /api/v1/enterprise/notifications/:id/approve
GET    /api/v1/enterprise/notifications/templates
GET    /api/v1/enterprise/notifications/preferences
GET    /api/v1/enterprise/notifications/inbox
GET    /api/v1/enterprise/notifications/stats
```

### Ejemplo de uso:
```javascript
const NotificationsCollector = require('./src/auditor/collectors/NotificationsCollector');
const collector = new NotificationsCollector(database, systemRegistry);

const results = await collector.collect(execution_id, {
  company_id: 11
});

// results = array de 12 AuditLog entries
```

---

## 🏥 2. MEDICAL WORKFLOW COLLECTOR

### Archivo
`backend/src/auditor/collectors/MedicalWorkflowCollector.js`

### Descripción
Tests exhaustivos de flujos de trabajo médicos, incluyendo certificados, aprobaciones, validaciones, historial, y integración con el sistema de asistencia.

### Tests incluidos (12):

| # | Test | Descripción |
|---|------|-------------|
| 1 | **Create Medical Certificate** | Crear certificado médico con diagnóstico |
| 2 | **List Certificates** | Listar certificados con filtros |
| 3 | **Approve Certificate** | Aprobar certificado (flujo HR) |
| 4 | **Reject Certificate** | Rechazar certificado con razón |
| 5 | **Date Validation** | Validar que fechas inválidas sean rechazadas |
| 6 | **Attach Documentation** | Adjuntar documentación a certificado |
| 7 | **Employee Medical History** | Historial médico del empleado |
| 8 | **Medical Statistics** | Estadísticas médicas de la empresa |
| 9 | **Extend Certificate** | Extender período de reposo |
| 10 | **Attendance Integration** | Integración con sistema de asistencia |
| 11 | **HR Notifications** | Notificaciones automáticas a RRHH |
| 12 | **Certificate Overlap Detection** | Detectar solapamiento de certificados |

### Casos de uso cubiertos:
- ✅ Certificados de reposo médico
- ✅ Aprobación/rechazo por RRHH
- ✅ Validación de fechas y períodos
- ✅ Documentación adjunta (PDFs, imágenes)
- ✅ Historial médico del empleado
- ✅ Estadísticas de ausentismo
- ✅ Extensión de períodos
- ✅ Integración con asistencia (justificación de ausencias)
- ✅ Notificaciones automáticas
- ✅ Detección de solapamientos

### Validaciones especiales:
```javascript
// Test 5: Date Validation - espera RECHAZO como comportamiento correcto
// Si el sistema acepta fechas inválidas → WARNING
// Si el sistema rechaza fechas inválidas → PASS
```

### Endpoints testeados:
```
POST   /api/medical/certificates
GET    /api/medical/certificates
PATCH  /api/medical/certificates/:id/approve
PATCH  /api/medical/certificates/:id/reject
POST   /api/medical/certificates/:id/documents
GET    /api/medical/certificates/employee/:id
GET    /api/medical/statistics
PATCH  /api/medical/certificates/:id/extend
GET    /api/attendance/justified/:employeeId
GET    /api/notifications/hr/medical
```

### Ejemplo de uso:
```javascript
const MedicalWorkflowCollector = require('./src/auditor/collectors/MedicalWorkflowCollector');
const collector = new MedicalWorkflowCollector(database, systemRegistry);

const results = await collector.collect(execution_id, {
  company_id: 11
});

// results = array de 12 AuditLog entries
```

---

## 🔌 3. REALTIME COLLECTOR

### Archivo
`backend/src/auditor/collectors/RealtimeCollector.js`

### Descripción
Tests completos de WebSocket, Socket.IO, y funcionalidades en tiempo real, incluyendo conexión, eventos, desconexión/reconexión, broadcasting, y estabilidad bajo carga.

### Tests incluidos (12):

| # | Test | Descripción |
|---|------|-------------|
| 1 | **WebSocket Connection** | Establecer conexión Socket.IO |
| 2 | **Realtime Attendance Updates** | Actualizaciones de asistencia en tiempo real |
| 3 | **Live Notifications Push** | Push de notificaciones instantáneas |
| 4 | **Socket.IO Event Emission** | Emisión de eventos personalizados |
| 5 | **Socket.IO Event Reception** | Recepción de eventos del servidor |
| 6 | **Disconnect/Reconnect** | Manejo de desconexión y reconexión |
| 7 | **Message Queueing** | Cola de mensajes durante desconexión |
| 8 | **Company Room Broadcast** | Broadcasting a sala de empresa |
| 9 | **Private Messaging** | Mensajería privada entre usuarios |
| 10 | **Connection Stability** | Estabilidad con 10 conexiones simultáneas |
| 11 | **Heartbeat/Ping-Pong** | Mecanismo de keep-alive |
| 12 | **Dashboard Realtime Updates** | Actualizaciones del dashboard en tiempo real |

### Casos de uso cubiertos:
- ✅ Conexión WebSocket básica
- ✅ Autenticación con JWT token
- ✅ Join/leave company rooms
- ✅ Broadcast a todos en una sala
- ✅ Mensajería privada punto a punto
- ✅ Desconexión/reconexión automática
- ✅ Cola de mensajes offline
- ✅ Heartbeat para mantener conexión viva
- ✅ Push notifications en tiempo real
- ✅ Updates del dashboard sin polling
- ✅ Estabilidad con múltiples conexiones

### Tecnologías testeadas:
- **Socket.IO Client** v4.8.1
- **Transport**: WebSocket (prioridad sobre long-polling)
- **Auth**: JWT token en handshake
- **Rooms**: Multicast a empresa-specific rooms
- **Events**: Custom events bidireccionales

### Eventos testeados:
```javascript
// Client → Server
socket.emit('ping', { timestamp });
socket.emit('join_company_room', { company_id });
socket.emit('broadcast_to_company', { message });
socket.emit('send_private_message', { to, message });
socket.emit('subscribe_dashboard', { company_id });

// Server → Client
socket.on('pong', (data) => {});
socket.on('attendance_update', (data) => {});
socket.on('new_notification', (data) => {});
socket.on('company_broadcast', (data) => {});
socket.on('private_message', (data) => {});
socket.on('dashboard_update', (data) => {});
```

### Test de estabilidad:
```javascript
// Test 10: Connection Stability - 10 conexiones simultáneas
// PASS: 10/10 conectadas
// WARNING: 7-9/10 conectadas
// FAIL: <7 conectadas
```

### Cleanup automático:
```javascript
// Al finalizar los tests, todos los sockets se desconectan automáticamente
await collector._cleanupSockets();
```

### Ejemplo de uso:
```javascript
const RealtimeCollector = require('./src/auditor/collectors/RealtimeCollector');
const collector = new RealtimeCollector(database, systemRegistry);

const results = await collector.collect(execution_id, {
  company_id: 11
});

// results = array de 12 AuditLog entries
// collector._cleanupSockets() se ejecuta automáticamente
```

---

## 🚀 INTEGRACIÓN CON AUDITOR ENGINE

### Registro en AuditorEngine

Para usar estos collectors en el sistema de auditoría, deben registrarse en `AuditorEngine.js`:

```javascript
// backend/src/auditor/core/AuditorEngine.js

const NotificationsCollector = require('../collectors/NotificationsCollector');
const MedicalWorkflowCollector = require('../collectors/MedicalWorkflowCollector');
const RealtimeCollector = require('../collectors/RealtimeCollector');

class AuditorEngine {
  constructor() {
    this.collectors = {
      endpoint: new EndpointCollector(this.database, this.registry),
      database: new DatabaseCollector(this.database, this.registry),
      e2e: new E2ECollector(this.database, this.registry),
      frontend: new FrontendCollector(this.database, this.registry),
      androidKiosk: new AndroidKioskCollector(this.database, this.registry),

      // ✅ NUEVOS COLLECTORS
      notifications: new NotificationsCollector(this.database, this.registry),
      medical: new MedicalWorkflowCollector(this.database, this.registry),
      realtime: new RealtimeCollector(this.database, this.registry)
    };
  }

  async runFullAudit(execution_id, config) {
    // ...ejecutar todos los collectors incluyendo los nuevos
    await this.collectors.notifications.collect(execution_id, config);
    await this.collectors.medical.collect(execution_id, config);
    await this.collectors.realtime.collect(execution_id, config);
  }
}
```

---

## 📊 RESULTADOS Y LOGGING

### Estructura de AuditLog

Cada test crea un registro en la tabla `audit_logs`:

```sql
{
  execution_id: 'uuid',
  test_type: 'realtime' | 'notification_workflow' | 'medical_workflow',
  module_name: 'realtime' | 'notifications-enterprise' | 'medical',
  test_name: 'Crear certificado médico',
  status: 'passed' | 'failed' | 'warning',

  response_time_ms: 1234,
  response_status: 201,

  error_type: 'CONNECTION_ERROR',
  error_message: 'WebSocket timeout after 10s',
  error_stack: '...',

  warning_message: 'No se recibieron eventos del servidor',

  severity: 'critical' | 'high' | 'medium' | 'low',

  metadata: {
    socket_id: 'abc123',
    connected: true,
    transport: 'websocket'
  },

  started_at: '2025-10-24T10:00:00Z',
  completed_at: '2025-10-24T10:00:02Z'
}
```

### Niveles de severidad:

- **critical**: Fallo de conexión, autenticación, o funcionalidad core
- **high**: Error en flujo principal (aprobar certificado, enviar notificación)
- **medium**: Warning en features secundarias (broadcast no recibido)
- **low**: Features opcionales (heartbeat, private messaging)

---

## 🧪 TESTING MANUAL

### 1. Ejecutar NotificationsCollector:
```bash
cd backend
node -e "
const { database } = require('./src/config/database');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
const NotificationsCollector = require('./src/auditor/collectors/NotificationsCollector');

const registry = new SystemRegistry();
const collector = new NotificationsCollector(database, registry);

collector.collect('test-exec-1', { company_id: 11 })
  .then(results => console.log('✅ Tests:', results.length))
  .catch(err => console.error('❌ Error:', err));
"
```

### 2. Ejecutar MedicalWorkflowCollector:
```bash
node -e "
const { database } = require('./src/config/database');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
const MedicalWorkflowCollector = require('./src/auditor/collectors/MedicalWorkflowCollector');

const registry = new SystemRegistry();
const collector = new MedicalWorkflowCollector(database, registry);

collector.collect('test-exec-2', { company_id: 11 })
  .then(results => console.log('✅ Tests:', results.length))
  .catch(err => console.error('❌ Error:', err));
"
```

### 3. Ejecutar RealtimeCollector:
```bash
node -e "
const { database } = require('./src/config/database');
const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
const RealtimeCollector = require('./src/auditor/collectors/RealtimeCollector');

const registry = new SystemRegistry();
const collector = new RealtimeCollector(database, registry);

collector.collect('test-exec-3', { company_id: 11 })
  .then(results => {
    console.log('✅ Tests:', results.length);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
"
```

---

## 🔧 DEPENDENCIAS

### Ya instaladas:
- ✅ `axios` (^1.12.2) - HTTP requests
- ✅ `socket.io-client` (^4.8.1) - WebSocket client
- ✅ `sequelize` (^6.37.7) - Database ORM
- ✅ `jsonwebtoken` (^9.0.2) - JWT tokens

### No se requieren dependencias adicionales

---

## 📈 MÉTRICAS DE COBERTURA

### Antes de estos collectors:
- **EndpointCollector**: 37 módulos × ~15 endpoints = ~555 tests
- **DatabaseCollector**: 37 tablas × ~8 checks = ~296 tests
- **FrontendCollector**: 37 módulos × 10 CRUD tests = 370 tests
- **E2ECollector**: ~25 workflows E2E
- **AndroidKioskCollector**: ~15 tests APK

**Total anterior**: ~1,261 tests

### Con los nuevos collectors:
- **NotificationsCollector**: +12 tests
- **MedicalWorkflowCollector**: +12 tests
- **RealtimeCollector**: +12 tests

**Total nuevo**: ~1,297 tests (+2.9% coverage)

---

## 🎯 PRÓXIMOS PASOS

### Collectors sugeridos para implementar:

1. **PayrollCollector** - Nóminas y cálculos salariales
2. **VacationCollector** - Gestión de vacaciones
3. **ReportsCollector** - Sistema de reportes
4. **IntegrationCollector** - Integraciones externas (APIs terceros)
5. **SecurityCollector** - Tests de seguridad (XSS, CSRF, SQL injection)
6. **PerformanceCollector** - Load testing y benchmarks
7. **BackupCollector** - Backups y disaster recovery

---

## ❓ TROUBLESHOOTING

### Problema: RealtimeCollector timeout en conexión
**Causa**: Servidor WebSocket no disponible en `http://localhost:9998`
**Solución**:
```bash
# Verificar que el servidor esté corriendo
netstat -ano | findstr :9998

# Reiniciar servidor si es necesario
cd backend && PORT=9998 npm start
```

### Problema: NotificationsCollector 404 en endpoints
**Causa**: Rutas de notificaciones no registradas
**Solución**:
```javascript
// Verificar en server.js que las rutas estén registradas
app.use('/api/v1/enterprise', enterpriseRoutes);
```

### Problema: MedicalWorkflowCollector sin data
**Causa**: No hay datos de prueba en BD
**Solución**:
```bash
# Generar datos fake con UniversalSeeder
node -e "
const UniversalSeeder = require('./src/auditor/seeders/UniversalSeeder');
const seeder = new UniversalSeeder(database);
seeder.seedMedical(11, 50); // 50 certificados médicos
"
```

---

## 📞 SOPORTE

Para issues o preguntas sobre estos collectors:
1. Revisar logs de AuditLog en base de datos
2. Ejecutar collectors individualmente para aislar problemas
3. Verificar que servidor esté corriendo en puerto correcto
4. Comprobar que endpoints existan y respondan

**Happy Testing!** 🚀
