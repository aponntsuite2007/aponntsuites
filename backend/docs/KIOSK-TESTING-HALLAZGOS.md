# Hallazgos del Testing de Kiosk - Empresa ISI (ID=11)

## Resumen del Testing

**Fecha**: 2025-12-08
**Empresa**: ISI (company_id = 11)
**Scripts utilizados**:
- `scripts/setup-kiosk-testing-isi.js` - Configuracion inicial
- `scripts/test-kiosk-scenarios-isi.js` - Simulacion de escenarios

---

## 1. Configuracion Inicial Exitosa

### Datos Configurados:
- **Usuarios**: 1000 (generados con Faker.js)
- **Departamentos**: 13
  - Sistemas, RRHH, Operaciones (existentes)
  - Produccion, Ventas, Administracion, Logistica, Calidad, Mantenimiento, Compras, Contabilidad, Seguridad e Higiene, Atencion al Cliente (nuevos con sufijo ISI)
- **Kioscos activos**: 4
  - `principal`: TODOS los departamentos autorizados
  - `PRODUCCION`: 4 departamentos autorizados
  - `VENTAS`: 4 departamentos autorizados
  - `TEST_KIOSKO_AUTO`: 4 departamentos autorizados
- **Turnos**: 3
  - Turno Manana: 08:00-16:00 (tolerancia 15 min)
  - Turno Tarde: 14:00-22:00 (tolerancia 15 min)
  - Turno Noche: 22:00-06:00 (tolerancia 15 min)
- **Templates biometricos**: 1

---

## 2. Puntos de Fallo Identificados y Corregidos

### 2.1 Campo `dni` requerido en tabla `users`
**Problema**: La tabla `users` tiene `dni` como NOT NULL
**Solucion**: Agregado generacion de DNI unico al script de creacion de usuarios
**Archivo**: `scripts/setup-kiosk-testing-isi.js` linea 162-183

### 2.2 Timestamps requeridos en tabla `users`
**Problema**: Campos `createdAt` y `updatedAt` son NOT NULL
**Solucion**: Agregados timestamps al INSERT
**Archivo**: `scripts/setup-kiosk-testing-isi.js` linea 204-218

### 2.3 Columnas camelCase en tabla `shifts`
**Problema**: La tabla usa `startTime`, `endTime` (camelCase) no `start_time`, `end_time` (snake_case)
**Solucion**: Actualizado script para usar nombres correctos
**Archivo**: `scripts/setup-kiosk-testing-isi.js` linea 275-303

### 2.4 Columnas camelCase en tabla `attendances`
**Problema**: La tabla usa:
- `UserId` en lugar de `user_id`
- `checkInTime` en lugar de `check_in`
- `createdAt`, `updatedAt` (camelCase)

**Solucion**: Actualizado script de test
**Archivo**: `scripts/test-kiosk-scenarios-isi.js`

### 2.5 Constraint de `authorization_status`
**Problema**: El constraint solo permite: `pending`, `approved`, `rejected`
**Solucion**: Cambiar `authorized` por `approved` en script
**Archivo**: `scripts/test-kiosk-scenarios-isi.js` linea 273

### 2.6 Falta de supervisores configurados
**Problema**: Ningun usuario tenia `can_authorize_late_arrivals = true`
**Solucion**: Configurar admin ISI como supervisor:
```sql
UPDATE users
SET can_authorize_late_arrivals = true,
    authorized_departments = '[]'::jsonb
WHERE user_id = (
    SELECT user_id FROM users
    WHERE company_id = 11 AND role = 'admin' LIMIT 1
);
```

---

## 3. Estructura de Tablas Relevantes

### 3.1 Tabla `attendances`
```
id                         | uuid
date                       | date (NOT NULL)
checkInTime                | timestamp
checkOutTime               | timestamp
UserId                     | uuid (NOT NULL, FK users)
company_id                 | integer
kiosk_id                   | integer
origin_type                | varchar ('kiosk', 'mobile', 'manual')
status                     | enum ('present', 'absent', 'late', etc)
authorization_status       | varchar ('pending', 'approved', 'rejected')
authorized_by_user_id      | uuid
authorized_at              | timestamp
authorization_notes        | text
createdAt                  | timestamp (NOT NULL)
updatedAt                  | timestamp (NOT NULL)
```

### 3.2 Tabla `notifications`
```
id                         | bigint (auto-increment)
uuid                       | uuid (auto-generated)
company_id                 | integer (NOT NULL)
module                     | varchar (NOT NULL)
category                   | varchar (default 'info')
notification_type          | varchar (NOT NULL)
priority                   | varchar (default 'medium')
recipient_user_id          | uuid
title                      | varchar (NOT NULL)
message                    | text (NOT NULL)
related_attendance_id      | uuid
metadata                   | jsonb
is_read                    | boolean (default false)
read_at                    | timestamp
read_by                    | uuid
created_at                 | timestamp
```

### 3.3 Tabla `kiosks`
```
id                         | integer
name                       | varchar
company_id                 | integer
is_active                  | boolean
authorized_departments     | jsonb (array de department_id)
has_external_reader        | boolean
reader_model               | varchar
gps_lat, gps_lng           | decimal
device_id                  | varchar
last_seen                  | timestamp
```

---

## 4. Flujo de Llegada Tarde Verificado

1. **Registro de entrada tarde** (via kiosk)
   - Se crea registro en `attendances` con `authorization_status = 'pending'`

2. **Generacion de notificacion**
   - Se crea registro en `notifications` con:
     - `notification_type = 'late_arrival_pending'`
     - `module = 'attendance'`
     - `category = 'warning'`
     - `priority = 'high'`
     - `related_attendance_id` = ID de la asistencia

3. **Autorizacion por supervisor**
   - Se actualiza `attendances.authorization_status` a `approved`
   - Se registra `authorized_by_user_id` y `authorized_at`
   - Se marca notificacion como leida

---

## 5. Escenarios de Testing Exitosos

| Escenario | Resultado |
|-----------|-----------|
| Llegada a tiempo (5 usuarios) | OK - Registros creados |
| Llegada tarde sin autorizacion (5 usuarios) | OK - 5 pendientes |
| Generacion de notificaciones | OK - 5 notificaciones creadas |
| Autorizacion de llegada tarde | OK - Estado actualizado |
| Notificacion marcada como leida | OK |

---

## 6. Recomendaciones para Produccion

### 6.1 Supervisores
- Asegurar que al menos 1 usuario por empresa tenga `can_authorize_late_arrivals = true`
- Configurar `authorized_departments` segun estructura organizacional

### 6.2 Kioscos
- Configurar `authorized_departments` para cada kiosko
- El kiosko "principal" puede tener todos los departamentos

### 6.3 Turnos
- Verificar que `toleranceMinutesEntry` este configurado
- Valor recomendado: 10-15 minutos

### 6.4 Templates Biometricos
- Actualmente solo hay 1 template biometrico para ISI
- Para testing real del APK, se necesitan mas templates

---

## 7. Scripts de Utilidad

### Limpiar asistencias de prueba:
```sql
DELETE FROM attendances
WHERE company_id = 11
  AND date = CURRENT_DATE
  AND notes LIKE '%script de testing%';
```

### Ver estadisticas:
```sql
SELECT
    COUNT(*) as total_asistencias,
    COUNT(*) FILTER (WHERE authorization_status = 'pending') as pendientes,
    COUNT(*) FILTER (WHERE authorization_status = 'approved') as aprobadas
FROM attendances
WHERE company_id = 11 AND date = CURRENT_DATE;
```

### Ver notificaciones sin leer:
```sql
SELECT title, message, notification_type, created_at
FROM notifications
WHERE company_id = 11 AND is_read = false
ORDER BY created_at DESC;
```
