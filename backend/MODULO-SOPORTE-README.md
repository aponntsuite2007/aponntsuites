# MÓDULO DE SOPORTE - Sistema Completo

## 📋 RESUMEN EJECUTIVO

Se ha diseñado e implementado el schema de base de datos completo para el **Módulo de Soporte**, un sistema multi-tenant para gestión de tickets de soporte técnico con las siguientes características:

### ✅ LO QUE SE COMPLETÓ ESTA NOCHE (2025-01-23)

1. ✅ **Schema de Base de Datos Diseñado** - 5 tablas con relaciones completas
2. ✅ **Migración SQL Creada** - `migrations/20251023_create_support_system.sql`
3. ✅ **Migración Ejecutada en Render PostgreSQL** - Todas las tablas creadas exitosamente
4. ✅ **Funciones PostgreSQL Implementadas** - 4 funciones helper automatizadas

---

## 🎯 CARACTERÍSTICAS IMPLEMENTADAS

### 1. Tickets Multi-Tenant con ID Único

- **Numeración automática**: `TICKET-2025-000001`, `TICKET-2025-000002`, etc.
- **Multi-tenant**: Cada ticket pertenece a una empresa específica
- **Prioridades**: low, medium, high, urgent
- **Estados**: open, in_progress, waiting_customer, resolved, closed

### 2. Acceso Temporal de Soporte

- **Autorización del cliente**: El usuario puede autorizar o denegar acceso temporal
- **Contraseña aleatoria**: Se genera automáticamente al autorizar acceso
- **Caducidad automática**: La contraseña expira al cerrar el ticket
- **Usuario temporal**: Se crea un usuario "soporte-temporal" para el acceso

### 3. Log Transparente de Actividad

- **Registro completo**: TODO lo que hace el soporte queda registrado
- **Privacidad garantizada**: Logs enviados a admin de empresa + panel Aponnt
- **Datos detallados**: IP, user agent, módulo, acción, datos afectados (JSON)
- **Sesiones rastreables**: Cada sesión de soporte tiene un session_id único

### 4. Sistema de Evaluación

- **1 a 5 estrellas**: Cliente evalúa la atención recibida
- **Comentarios opcionales**: rating_comment para feedback adicional
- **Solo cliente puede evaluar**: NO el soporte
- **Evaluación al cerrar**: Se solicita automáticamente

### 5. Asignación Inteligente de Soporte

- **Vendedor original por defecto**: Quien hizo la venta es el soporte
- **Reasignación flexible**:
  - Otro vendedor puede tomar el soporte
  - Aponnt puede manejar el soporte directamente
- **Tabla de asignaciones**: `company_support_assignments`

### 6. Integración con Notificaciones

- **Notificación al crear ticket**: Va a vendedor asignado + admin Aponnt
- **Sistema de notificaciones existente**: Se integrará con el módulo de notificaciones global
- **Bandeja de notificaciones**: Visible para el vendedor y administrador

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### TABLA 1: `support_tickets`

Tickets de soporte multi-tenant.

```sql
ticket_id UUID PRIMARY KEY
ticket_number VARCHAR(50) UNIQUE -- "TICKET-2025-000001"
company_id INTEGER FK → companies
created_by_user_id UUID FK → users
module_name VARCHAR(100)
subject VARCHAR(500)
description TEXT
priority VARCHAR(20) -- low, medium, high, urgent
allow_support_access BOOLEAN
temp_support_user_id UUID FK → users
temp_password_hash VARCHAR(255)
temp_password_expires_at TIMESTAMP
assigned_to_vendor_id UUID FK → users
status VARCHAR(50) -- open, in_progress, waiting_customer, resolved, closed
closed_by_user_id UUID FK → users
closed_at TIMESTAMP
rating INTEGER CHECK (1-5)
rating_comment TEXT
rated_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

**Índices:**
- `idx_support_tickets_company` ON company_id
- `idx_support_tickets_created_by` ON created_by_user_id
- `idx_support_tickets_assigned_to` ON assigned_to_vendor_id
- `idx_support_tickets_status` ON status
- `idx_support_tickets_created_at` ON created_at DESC

### TABLA 2: `support_ticket_messages`

Conversación/mensajes dentro de cada ticket.

```sql
message_id UUID PRIMARY KEY
ticket_id UUID FK → support_tickets
user_id UUID FK → users
user_role VARCHAR(50) -- 'customer', 'support', 'admin'
message TEXT
attachments JSONB -- Array de URLs
is_internal BOOLEAN -- Notas internas (solo soporte/admin)
created_at TIMESTAMP
```

**Índices:**
- `idx_support_ticket_messages_ticket` ON ticket_id
- `idx_support_ticket_messages_created_at` ON created_at DESC

### TABLA 3: `support_activity_log`

Log transparente de actividad de soporte en empresa cliente.

```sql
log_id UUID PRIMARY KEY
ticket_id UUID FK → support_tickets
support_user_id UUID FK → users
company_id INTEGER FK → companies
session_id UUID
session_started_at TIMESTAMP
session_ended_at TIMESTAMP
activity_type VARCHAR(100) -- 'login', 'view_module', 'edit_record', etc.
module_name VARCHAR(100)
action_description TEXT
affected_data JSONB -- Datos JSON con detalles
ip_address VARCHAR(45)
user_agent TEXT
created_at TIMESTAMP
```

**Índices:**
- `idx_support_activity_log_ticket` ON ticket_id
- `idx_support_activity_log_support_user` ON support_user_id
- `idx_support_activity_log_company` ON company_id
- `idx_support_activity_log_session` ON session_id
- `idx_support_activity_log_created_at` ON created_at DESC

### TABLA 4: `company_support_assignments`

Asignación de soporte por empresa.

```sql
assignment_id UUID PRIMARY KEY
company_id INTEGER FK → companies
support_type VARCHAR(50) -- 'original_vendor', 'other_vendor', 'aponnt_support'
assigned_vendor_id UUID FK → users
original_vendor_id UUID FK → users
assigned_at TIMESTAMP
is_active BOOLEAN
notes TEXT
assigned_by_user_id UUID FK → users
created_at TIMESTAMP
```

**Índices:**
- `idx_company_support_assignments_company` ON company_id
- `idx_company_support_assignments_vendor` ON assigned_vendor_id
- `idx_company_support_assignments_active` ON is_active

### TABLA 5: `support_vendor_stats`

Estadísticas de performance de soporte por vendedor.

```sql
stat_id UUID PRIMARY KEY
vendor_id UUID FK → users
period_start DATE
period_end DATE
total_tickets INTEGER
tickets_resolved INTEGER
tickets_closed INTEGER
avg_resolution_time_hours DECIMAL
avg_rating DECIMAL(3,2) -- Promedio 1.00 a 5.00
calculated_at TIMESTAMP
UNIQUE(vendor_id, period_start, period_end)
```

**Índices:**
- `idx_support_vendor_stats_vendor` ON vendor_id
- `idx_support_vendor_stats_period` ON (period_start, period_end)

---

## 🔧 FUNCIONES POSTGRESQL CREADAS

### 1. `generate_ticket_number()`

Genera número de ticket único auto-incremental.

```sql
-- Retorna: "TICKET-2025-000001", "TICKET-2025-000002", etc.
```

**Uso:**
```sql
INSERT INTO support_tickets (ticket_number, ...)
VALUES (generate_ticket_number(), ...);
```

### 2. `get_company_support_vendor(company_id INTEGER)`

Obtiene el vendedor asignado para dar soporte a una empresa.

```sql
-- Retorna: UUID del vendedor, o NULL si es Aponnt directo
```

**Lógica:**
- Si `support_type = 'aponnt_support'` → Retorna NULL (Aponnt maneja)
- Si `support_type = 'other_vendor'` → Retorna `assigned_vendor_id`
- Si `support_type = 'original_vendor'` → Retorna `original_vendor_id`

**Uso:**
```sql
SELECT get_company_support_vendor(11); -- Retorna UUID del vendedor
```

### 3. `expire_temp_password_on_close()` (TRIGGER)

Expira automáticamente la contraseña temporal al cerrar el ticket.

**Qué hace:**
1. Detecta cuando un ticket cambia a status='closed'
2. Marca `temp_password_expires_at = CURRENT_TIMESTAMP`
3. Deshabilita el usuario temporal (`is_active = false`)

### 4. `get_vendor_pending_tickets(vendor_id UUID)`

Lista todos los tickets pendientes de un vendedor con prioridad.

**Retorna:**
- ticket_id, ticket_number, company_name, subject, priority, status, created_at, days_open

**Ordenamiento:**
1. Por prioridad (urgent → high → medium → low)
2. Por antigüedad (más antiguos primero)

**Uso:**
```sql
SELECT * FROM get_vendor_pending_tickets('uuid-del-vendedor');
```

---

## 📂 ARCHIVOS CREADOS

### 1. Migración SQL

**Archivo:** `backend/migrations/20251023_create_support_system.sql`

- 5 tablas completas
- Todos los índices optimizados
- 4 funciones PostgreSQL
- 1 trigger automático
- Comentarios y documentación completa

**Tamaño:** ~450 líneas de SQL

### 2. Script de Migración

**Archivo:** `backend/scripts/run-support-migration.js`

Script Node.js para ejecutar la migración con:
- Conexión a Render PostgreSQL
- Lectura y ejecución del SQL
- Verificación de tablas creadas
- Verificación de funciones creadas
- Logging completo

**Uso:**
```bash
cd backend
DATABASE_URL=postgresql://... node scripts/run-support-migration.js
```

### 3. Este README

**Archivo:** `backend/MODULO-SOPORTE-README.md`

Documentación completa del módulo de soporte.

---

## 🔄 FLUJO DE TRABAJO DEL MÓDULO

### 1. Usuario Crea Ticket

1. Usuario en empresa cliente abre formulario de soporte
2. Selecciona **módulo afectado** (desplegable con todos los módulos)
3. Escribe **subject** (título breve) y **description** (detalle del problema)
4. Selecciona **prioridad** (low, medium, high, urgent)
5. **Checkbox**: "¿Autoriza acceso temporal de soporte a su empresa?"
6. Click en **"Crear Ticket"**

**Backend:**
```javascript
const ticketNumber = await sequelize.query("SELECT generate_ticket_number()");
const vendorId = await sequelize.query("SELECT get_company_support_vendor(:companyId)");

const ticket = await SupportTicket.create({
  ticket_number: ticketNumber,
  company_id: req.user.company_id,
  created_by_user_id: req.user.user_id,
  module_name: req.body.module,
  subject: req.body.subject,
  description: req.body.description,
  priority: req.body.priority,
  allow_support_access: req.body.allowAccess,
  assigned_to_vendor_id: vendorId,
  status: 'open'
});

// Si autoriza acceso, generar contraseña temporal
if (req.body.allowAccess) {
  const tempPassword = generateRandomPassword(); // Ej: "Temp#2025!xYz9"
  const tempUser = await User.create({
    employeeId: `TEMP-SUPPORT-${ticket_id}`,
    usuario: `soporte-temp-${ticket_number}`,
    firstName: "Soporte",
    lastName: "Temporal",
    email: `soporte-${ticket_number}@sistema.local`,
    password: await bcrypt.hash(tempPassword, 12),
    role: 'support',
    company_id: req.user.company_id,
    is_active: true
  });

  await ticket.update({
    temp_support_user_id: tempUser.user_id,
    temp_password_hash: await bcrypt.hash(tempPassword, 12),
    temp_password_expires_at: null, // Expira al cerrar ticket
    temp_access_granted_at: new Date()
  });

  // Mostrar contraseña al usuario UNA VEZ
  res.json({ ticket, tempPassword });
}

// Crear notificación para vendedor + admin Aponnt
await Notification.create({
  company_id: 1, // Aponnt
  user_id: vendorId,
  type: 'new_support_ticket',
  title: `Nuevo ticket: ${ticket_number}`,
  message: `${req.user.firstName} creó ticket para módulo ${req.body.module}`,
  link: `/support/tickets/${ticket_id}`,
  priority: req.body.priority
});
```

### 2. Vendedor/Soporte Ve Notificación

1. Vendedor ve notificación en bandeja de Aponnt
2. Click en notificación → Abre detalles del ticket
3. Ve:
   - Empresa cliente
   - Módulo afectado
   - Descripción del problema
   - Prioridad
   - Si se autorizó acceso temporal
   - Contraseña temporal (si se generó)

### 3. Soporte Ingresa a Empresa Cliente (si se autorizó)

1. Soporte va a login normal de panel-empresa.html
2. Ingresa:
   - **Empresa**: api-test-company (slug de la empresa)
   - **Usuario**: soporte-temp-TICKET-2025-000001
   - **Contraseña**: Temp#2025!xYz9 (la que se generó)
3. Sistema valida credenciales
4. **INICIA LOG DE ACTIVIDAD:**

```javascript
const sessionId = uuid.v4();

// Registrar login
await SupportActivityLog.create({
  ticket_id: ticket.ticket_id,
  support_user_id: supportUser.user_id,
  company_id: company.company_id,
  session_id: sessionId,
  session_started_at: new Date(),
  activity_type: 'login',
  action_description: 'Soporte inició sesión en empresa cliente',
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
});

// Almacenar session_id en req.session
req.session.supportSessionId = sessionId;
```

### 4. Soporte Trabaja en la Empresa (TODO SE REGISTRA)

Cada acción de soporte se registra automáticamente:

```javascript
// Middleware que intercepta TODAS las acciones de soporte
async function logSupportActivity(req, res, next) {
  if (req.user.role === 'support' && req.user.usuario.startsWith('soporte-temp-')) {
    const ticket = await SupportTicket.findOne({
      where: { temp_support_user_id: req.user.user_id }
    });

    await SupportActivityLog.create({
      ticket_id: ticket.ticket_id,
      support_user_id: req.user.user_id,
      company_id: req.user.company_id,
      session_id: req.session.supportSessionId,
      activity_type: determineActivityType(req), // 'view_module', 'edit_record', etc.
      module_name: req.params.module || req.body.module,
      action_description: generateDescription(req),
      affected_data: extractAffectedData(req), // JSON con detalles
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Enviar notificación en tiempo real al admin de la empresa
    io.to(`company-${req.user.company_id}`).emit('support-activity', {
      activity: 'Soporte está editando un usuario',
      timestamp: new Date()
    });
  }
  next();
}

// Aplicar middleware a TODAS las rutas de API
app.use('/api/*', logSupportActivity);
```

**Ejemplos de actividades registradas:**

```javascript
// 1. Soporte ve módulo de usuarios
{
  activity_type: 'view_module',
  module_name: 'users',
  action_description: 'Soporte accedió al módulo de Gestión de Usuarios',
  affected_data: null
}

// 2. Soporte edita un usuario
{
  activity_type: 'edit_record',
  module_name: 'users',
  action_description: 'Soporte modificó usuario: Juan Pérez (ID: uuid-123)',
  affected_data: {
    table: 'users',
    record_id: 'uuid-123',
    changes: {
      email: { old: 'juan@old.com', new: 'juan@new.com' }
    }
  }
}

// 3. Soporte elimina un registro
{
  activity_type: 'delete_record',
  module_name: 'departments',
  action_description: 'Soporte eliminó departamento: IT (ID: 5)',
  affected_data: {
    table: 'departments',
    record_id: 5,
    deleted_record: { id: 5, name: 'IT', ... }
  }
}
```

### 5. Usuario o Admin Cierra el Ticket

**Solo el usuario que creó el ticket o un admin de la empresa pueden cerrar**:

```javascript
// Validación
if (req.user.user_id !== ticket.created_by_user_id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'No autorizado para cerrar este ticket' });
}

await ticket.update({
  status: 'closed',
  closed_by_user_id: req.user.user_id,
  closed_at: new Date(),
  close_reason: req.body.reason
});

// El trigger expire_temp_password_on_close() se ejecuta automáticamente:
// - temp_password_expires_at = NOW()
// - Usuario temporal → is_active = false
```

### 6. Usuario Evalúa el Soporte

Después de cerrar el ticket, se muestra modal de evaluación:

```javascript
await ticket.update({
  rating: req.body.rating, // 1-5 estrellas
  rating_comment: req.body.comment, // Opcional
  rated_at: new Date()
});

// Actualizar estadísticas del vendedor
await updateVendorStats(ticket.assigned_to_vendor_id);
```

---

## 🚀 PRÓXIMOS PASOS (PENDIENTES)

### 1. Crear Modelos Sequelize

Crear archivos en `src/models/`:

- `SupportTicket.js`
- `SupportTicketMessage.js`
- `SupportActivityLog.js`
- `CompanySupportAssignment.js`
- `SupportVendorStats.js`

Definir relaciones:
```javascript
// SupportTicket
SupportTicket.belongsTo(Company, { foreignKey: 'company_id' });
SupportTicket.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'creator' });
SupportTicket.belongsTo(User, { foreignKey: 'assigned_to_vendor_id', as: 'vendor' });
SupportTicket.belongsTo(User, { foreignKey: 'temp_support_user_id', as: 'tempUser' });
SupportTicket.hasMany(SupportTicketMessage, { foreignKey: 'ticket_id' });
SupportTicket.hasMany(SupportActivityLog, { foreignKey: 'ticket_id' });
```

### 2. Crear API REST

Crear archivo `src/routes/supportRoutes.js` con endpoints:

**Tickets:**
- `POST /api/support/tickets` - Crear ticket
- `GET /api/support/tickets` - Listar tickets (filtros: status, priority, company_id)
- `GET /api/support/tickets/:id` - Detalle de ticket
- `PATCH /api/support/tickets/:id` - Actualizar ticket (cambiar status, prioridad, etc.)
- `DELETE /api/support/tickets/:id/close` - Cerrar ticket
- `POST /api/support/tickets/:id/rate` - Evaluar soporte (1-5 estrellas)

**Mensajes:**
- `POST /api/support/tickets/:id/messages` - Enviar mensaje en ticket
- `GET /api/support/tickets/:id/messages` - Ver conversación

**Activity Log:**
- `GET /api/support/tickets/:id/activity` - Ver log de actividad de soporte
- `GET /api/support/activity` - Ver todo el log (admin Aponnt)

**Asignaciones:**
- `POST /api/support/assignments` - Asignar soporte a empresa
- `GET /api/support/assignments/:companyId` - Ver asignación actual
- `PATCH /api/support/assignments/:id` - Cambiar asignación

**Stats:**
- `GET /api/support/vendors/:vendorId/stats` - Estadísticas de un vendedor
- `GET /api/support/stats/leaderboard` - Ranking de vendedores (admin Aponnt)

### 3. Integrar con Sistema de Notificaciones

Modificar `src/services/NotificationService.js` para agregar tipos de notificación:

```javascript
NOTIFICATION_TYPES = {
  // ...existentes
  NEW_SUPPORT_TICKET: 'new_support_ticket',
  SUPPORT_TICKET_UPDATED: 'support_ticket_updated',
  SUPPORT_TICKET_CLOSED: 'support_ticket_closed',
  SUPPORT_ACTIVITY_ALERT: 'support_activity_alert'
};
```

Crear notificaciones automáticas:
- Al crear ticket → Notificar a vendedor + admin Aponnt
- Al cerrar ticket → Notificar a creador del ticket
- Al recibir mensaje → Notificar a la otra parte
- Al detectar actividad de soporte → Notificar a admin de empresa en tiempo real

### 4. Crear Frontend

Crear archivo `public/js/modules/support.js` con:

**Vista Cliente (Empresa):**
- Botón "Solicitar Soporte" en menú lateral
- Formulario de creación de ticket
- Lista de mis tickets (open, resolved, closed)
- Detalle de ticket con conversación
- Modal de evaluación (1-5 estrellas)

**Vista Soporte (Vendedor):**
- Bandeja de tickets asignados
- Vista kanban (open, in_progress, waiting_customer, resolved)
- Detalle de ticket con:
  - Info de empresa
  - Conversación
  - Acceso rápido a empresa (si se autorizó)
  - Botón "Marcar como resuelto"

**Vista Admin Aponnt:**
- Dashboard de todos los tickets
- Stats de vendedores
- Reasignación de soporte
- Log de actividad global

### 5. Agregar Módulo al Registry

Modificar `src/auditor/registry/modules-registry.json` para agregar:

```json
{
  "key": "support",
  "name": "Soporte Técnico",
  "display_name": "Soporte Técnico",
  "category": "system",
  "version": "1.0.0",
  "description": "Sistema multi-tenant de tickets de soporte con acceso temporal y log transparente",
  "is_core": true,
  "standalone": false,
  "dependencies": {
    "required": ["notifications"],
    "optional": [],
    "integrates_with": ["all_modules"]
  },
  "api_endpoints": [
    "POST /api/support/tickets",
    "GET /api/support/tickets",
    "GET /api/support/tickets/:id",
    "PATCH /api/support/tickets/:id",
    "POST /api/support/tickets/:id/messages"
  ],
  "database_tables": [
    "support_tickets",
    "support_ticket_messages",
    "support_activity_log",
    "company_support_assignments",
    "support_vendor_stats"
  ],
  "business_flows": [
    "Crear ticket",
    "Asignar soporte",
    "Acceso temporal",
    "Conversación",
    "Cerrar ticket",
    "Evaluar soporte"
  ]
}
```

---

## 💡 CONSIDERACIONES ADICIONALES

### Seguridad

1. **Contraseñas temporales**:
   - Mínimo 12 caracteres
   - Mezcla de mayúsculas, minúsculas, números y símbolos
   - Expiran automáticamente al cerrar ticket

2. **Permisos de soporte**:
   - Usuario temporal tiene role='support'
   - Permisos limitados (no puede crear/eliminar empresas, etc.)
   - TODO se registra en activity log

3. **Validaciones**:
   - Solo cliente o admin pueden cerrar ticket
   - Solo cliente puede evaluar
   - Soporte NO puede modificar su propia evaluación

### Performance

1. **Índices optimizados**:
   - Búsqueda rápida por company_id, status, priority
   - Ordenamiento eficiente por created_at

2. **Paginación**:
   - Implementar paginación en lista de tickets
   - Limit 20 tickets por página

3. **Caching**:
   - Cachear asignaciones de soporte (raramente cambian)
   - Cachear stats de vendedores (recalcular cada hora)

### UX/UI

1. **Notificaciones en tiempo real**:
   - Usar Socket.io para notificar nuevos mensajes
   - Alertas visuales cuando soporte está activo en la empresa

2. **Estados visuales**:
   - Badges de colores para prioridad (urgent=rojo, high=naranja, medium=amarillo, low=gris)
   - Indicadores de tiempo transcurrido (días abierto)

3. **Acceso rápido**:
   - Botón "Solicitar Soporte" siempre visible
   - Badge con número de tickets abiertos en menú

---

## 📊 ESTADÍSTICAS Y MÉTRICAS

El sistema calculará automáticamente:

1. **Por Vendedor**:
   - Total de tickets atendidos
   - Tasa de resolución (resueltos / total)
   - Tiempo promedio de resolución
   - Rating promedio (1-5 estrellas)

2. **Por Empresa**:
   - Total de tickets abiertos
   - Módulos con más problemas
   - Tiempo promedio de respuesta

3. **Global (Aponnt)**:
   - Total de tickets del mes
   - Vendedor con mejor rating
   - Módulo con más tickets (identificar problemas recurrentes)

---

## 🎉 CONCLUSIÓN

El schema de base de datos del Módulo de Soporte está **100% completo y operativo en producción (Render PostgreSQL)**.

Faltan únicamente los componentes de aplicación:
- Modelos Sequelize (2-3 horas)
- API REST (4-5 horas)
- Integración con notificaciones (1-2 horas)
- Frontend completo (6-8 horas)

**Estimación total:** 14-18 horas de desarrollo para completar el módulo funcional.

---

**Fecha de creación:** 2025-01-23
**Autor:** Claude Code
**Estado:** Schema completo ✅ | Backend pendiente ⏳ | Frontend pendiente ⏳
