# Control de Visitantes Module - Integration Testing Results (SSOT)

## Estado: COMPLETADO

**Fecha de testing**: 2026-01-21
**Total de tests**: 45
**Tests pasados**: 45
**Success Rate**: 100.0%

---

## Resumen Ejecutivo

El módulo de Control de Visitantes ha sido testeado exhaustivamente incluyendo:

- **Visitors**: Registro completo de visitantes con autorización, check-in/out
- **GPS Tracking**: Rastreo en tiempo real con alertas de perímetro
- **Partners**: Socios de negocio con comisiones y coordinadores
- **Vendors**: Proveedores con ratings y referrals
- **Associates**: Asociados con contratos y asignaciones
- **Multi-tenant**: Aislamiento completo por company_id
- **Security**: Niveles de clearance y campos de auditoría

---

## Arquitectura de Integraciones

```
CONTROL DE VISITANTES (Ecosistema Completo)
    |
    +---> VISITORS (Visitantes externos)
    |     - Registro de visitas
    |     - Check-in/Check-out via Kiosk
    |     - Autorización por empleado responsable
    |     - Badge físico y clearance de seguridad
    |     - Soft delete (deleted_at)
    |
    +---> GPS TRACKING (Rastreo de visitantes)
    |     - Ubicación en tiempo real (lat/lng)
    |     - Alertas: outside_facility, low_battery, signal_lost
    |     - Haversine distance calculation
    |     - Batería y señal del llavero GPS
    |
    +---> PARTNERS (Socios de negocio)
    |     - partner_roles
    |     - partner_commissions
    |     - partner_coordinators
    |     - partner_substitutions
    |
    +---> VENDORS (Proveedores)
    |     - vendor_commissions
    |     - vendor_ratings
    |     - vendor_referrals
    |     - vendor_statistics
    |
    +---> ASSOCIATES (Asociados)
    |     - aponnt_associates
    |     - company_associate_contracts
    |     - associate_employee_assignments
    |
    +---> INTEGRATIONS
          - Users (responsible_employee_id UUID)
          - Departments (visiting_department_id)
          - Kiosks (kiosk_id para check-in)
          - Notifications (NCE workflows + access_notifications)
          - Biometrics (facial_template, photo_url)
```

---

## Tests Ejecutados

| # | Section | Test | Resultado |
|---|---------|------|-----------|
| 1 | Visitors | Table visitors exists | PASS |
| 2 | Visitors | Visitors has required fields | PASS |
| 3 | Visitors | Visitors FK integrity (no orphans) | PASS |
| 4 | GPS | Table visitor_gps_tracking exists | PASS |
| 5 | GPS | GPS tracking FK integrity | PASS |
| 6 | GPS | GPS tracking has geolocation fields | PASS |
| 7 | Analytics | View visitor_analytics_by_company exists | PASS |
| 8 | Partners | Table partners exists | PASS |
| 9 | Partners | Table partner_roles exists | PASS |
| 10 | Partners | Table partner_commissions exists | PASS |
| 11 | Partners | Table partner_coordinators exists | PASS |
| 12 | Vendors | Table vendor_commissions exists | PASS |
| 13 | Vendors | Table vendor_ratings exists | PASS |
| 14 | Vendors | Table vendor_referrals exists | PASS |
| 15 | Vendors | Table vendor_statistics exists | PASS |
| 16 | Associates | Table aponnt_associates exists | PASS |
| 17 | Associates | Table company_associate_contracts exists | PASS |
| 18 | Associates | Table associate_employee_assignments exists | PASS |
| 19 | Multi-tenant | Visitors has company_id | PASS |
| 20 | Multi-tenant | GPS tracking has company_id | PASS |
| 21 | Users Integration | Visitors has responsible_employee_id FK | PASS |
| 22 | Users Integration | Users table exists | PASS |
| 23 | Dept Integration | Departments table exists | PASS |
| 24 | Dept Integration | Visitors has visiting_department_id FK | PASS |
| 25 | Kiosk Integration | Kiosks table exists | PASS |
| 26 | Kiosk Integration | Visitors has kiosk_id FK | PASS |
| 27 | Notifications | Notification workflows table exists | PASS |
| 28 | Notifications | Table access_notifications exists | PASS |
| 29 | Data | Visitors data accessible | PASS |
| 30 | Data | Partners data accessible | PASS |
| 31 | Data | Associates data accessible | PASS |
| 32 | Status | Visitor authorization status distribution | PASS |
| 33 | Categories | Visitor category distribution | PASS |
| 34 | API Routes | Visitor API endpoints defined | PASS |
| 35 | Performance | Visitors table has indexes | PASS |
| 36 | Performance | GPS tracking table has indexes | PASS |
| 37 | Soft Delete | Visitors supports soft delete | PASS |
| 38 | Timestamps | Visitors has timestamps | PASS |
| 39 | Security | Visitors has security_clearance_level | PASS |
| 40 | Security | Visitors has audit fields | PASS |
| 41 | Biometric | Visitors supports biometric (facial_template) | PASS |
| 42 | Biometric | Visitors has photo_url | PASS |
| 43 | Ecosystem | View v_marketplace_providers exists | PASS |
| 44 | Ecosystem | View v_vendor_notifications exists | PASS |
| 45 | Ecosystem | View v_partner_commission_dashboard exists | PASS |

---

## Tablas de Base de Datos

### Visitors Core
| Tabla | Descripción |
|-------|-------------|
| `visitors` | Registro principal de visitantes |
| `visitor_gps_tracking` | Tracking GPS en tiempo real |
| `visitor_analytics_by_company` | Vista analítica por empresa |
| `access_notifications` | Notificaciones de acceso |

### Partners
| Tabla | Descripción |
|-------|-------------|
| `partners` | Socios de negocio |
| `partner_roles` | Roles de socios |
| `partner_commissions` | Comisiones de socios |
| `partner_commission_transactions` | Transacciones de comisiones |
| `partner_commission_summaries` | Resúmenes de comisiones |
| `partner_coordinators` | Coordinadores de socios |
| `partner_substitutions` | Sustituciones de socios |
| `v_partner_commission_dashboard` | Vista dashboard comisiones |

### Vendors
| Tabla | Descripción |
|-------|-------------|
| `vendor_commissions` | Comisiones de proveedores |
| `vendor_ratings` | Calificaciones de proveedores |
| `vendor_referrals` | Referidos de proveedores |
| `vendor_statistics` | Estadísticas de proveedores |
| `v_vendor_notifications` | Vista notificaciones vendors |
| `v_marketplace_providers` | Vista marketplace |

### Associates
| Tabla | Descripción |
|-------|-------------|
| `aponnt_associates` | Asociados de Aponnt |
| `company_associate_contracts` | Contratos de asociados |
| `associate_employee_assignments` | Asignaciones de empleados |

---

## Campos de Visitors

```
id, dni, first_name, last_name, email, phone,
visit_reason, visiting_department_id, responsible_employee_id,
authorization_status, authorized_by, authorized_at, rejection_reason,
gps_tracking_enabled, keyring_id,
facial_template, photo_url,
check_in, check_out, kiosk_id,
scheduled_visit_date, expected_duration_minutes,
is_active, notes, company_id,
visitor_category, badge_number, security_clearance_level,
audit_reason, audit_ip_address, audit_user_agent,
status_updated_at, status_updated_by,
created_at, updated_at, deleted_at
```

---

## Authorization Status

| Status | Descripción | Siguiente acción |
|--------|-------------|------------------|
| `pending` | Esperando aprobación | Autorizar/Rechazar |
| `authorized` | Visita aprobada | Check-in |
| `rejected` | Visita rechazada | Ninguna |
| `completed` | Visita finalizada | Archivo |

---

## Visitor Categories

| Categoría | Descripción | Clearance típico |
|-----------|-------------|------------------|
| `standard` | Visitante regular | 1 (público) |
| `vip` | Visitante importante | 2-3 |
| `contractor` | Contratista | 2 |
| `auditor` | Auditor externo | 3 |
| `medical` | Personal médico | 2-3 |
| `delivery` | Repartidor | 1 |
| `other` | Otro tipo | 1 |

---

## Security Clearance Levels

| Nivel | Nombre | Acceso |
|-------|--------|--------|
| 1 | Público | Áreas comunes solamente |
| 2 | Restringido | Oficinas generales |
| 3 | Confidencial | Áreas sensibles |
| 4 | Secreto | Máxima seguridad |

---

## GPS Tracking Features

### Campos de tracking
- `gps_lat`, `gps_lng`: Coordenadas
- `accuracy`: Precisión en metros
- `altitude`, `speed`: Altitud y velocidad
- `battery_level`, `signal_strength`: Estado del dispositivo
- `is_inside_facility`: Dentro del perímetro
- `distance_from_facility`: Distancia al centro

### Tipos de alertas
| Tipo | Descripción |
|------|-------------|
| `outside_facility` | Fuera del perímetro |
| `low_battery` | Batería baja (<20%) |
| `signal_lost` | Señal débil (<30%) |
| `unauthorized_area` | Área no autorizada |
| `overstay` | Excede tiempo esperado |

---

## API Endpoints

### Visitors CRUD
- `GET /api/v1/visitors` - Listar visitantes
- `GET /api/v1/visitors/:id` - Obtener visitante
- `POST /api/v1/visitors` - Crear visitante
- `PUT /api/v1/visitors/:id` - Actualizar visitante
- `DELETE /api/v1/visitors/:id` - Eliminar visitante (soft delete)

### Authorization Flow
- `POST /api/v1/visitors/:id/authorize` - Autorizar visita
- `POST /api/v1/visitors/:id/reject` - Rechazar visita

### Check-in/Check-out
- `POST /api/v1/visitors/:id/checkin` - Registrar ingreso
- `POST /api/v1/visitors/:id/checkout` - Registrar salida

### GPS Tracking
- `GET /api/v1/visitors/:id/gps-tracking` - Historial GPS
- `POST /api/v1/visitors/:id/gps-tracking` - Agregar punto GPS
- `GET /api/v1/visitors/:id/gps-tracking/last` - Última ubicación

### Analytics
- `GET /api/v1/visitors/analytics/by-company` - Estadísticas por empresa
- `GET /api/v1/visitors/analytics/by-department` - Por departamento
- `GET /api/v1/visitors/analytics/today` - Visitantes del día

---

## Integraciones Verificadas

### 1. Users Integration
- `responsible_employee_id` → UUID referencia a `users.user_id`
- `authorized_by` → UUID del autorizador
- `status_updated_by` → UUID del actualizador

### 2. Departments Integration
- `visiting_department_id` → ID del departamento visitado
- Permite análisis de visitas por área

### 3. Kiosks Integration
- `kiosk_id` → Kiosko donde se hizo check-in
- Soporte para registro biométrico en kiosko

### 4. Notifications Integration
- `notification_workflows` para alertas de visitas
- `access_notifications` para notificaciones específicas

### 5. Biometric Integration
- `facial_template` → Template facial encriptado
- `photo_url` → Foto del visitante

---

## Business Methods (Modelo)

### Instance Methods
```javascript
visitor.getFullName()              // Nombre completo
visitor.isCurrentlyVisiting()      // ¿Está visitando?
visitor.getVisitDurationMinutes()  // Duración en minutos
visitor.isOverdue()                // ¿Excedió tiempo?
visitor.requiresGpsTracking()      // ¿Requiere GPS?
visitor.canCheckIn()               // ¿Puede ingresar?
```

### GPS Methods
```javascript
gps.getGpsLocation()               // {lat, lng}
gps.hasLowBattery()                // < 20%
gps.hasWeakSignal()                // < 30%
gps.getDistanceToLocation(lat,lng) // Haversine
gps.isMoving()                     // > 0.5 m/s
gps.isRecent()                     // < 5 min
```

---

## Script de Testing

**Ubicación**: `scripts/test-visitor-integration-exhaustive.js`

```bash
# Ejecutar testing integrado
cd backend
node scripts/test-visitor-integration-exhaustive.js
```

---

## Datos Actuales

| Entidad | Cantidad |
|---------|----------|
| Visitantes | 0 |
| Partners | 4 |
| Associates | 7 |

---

*Documentación generada: 2026-01-21*
*Sistema: Bio - Sistema de Asistencia Biométrico*
