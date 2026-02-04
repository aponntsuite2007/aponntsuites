# Arquitectura de Módulos Comerciales

## Definición Fundamental

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   MÓDULOS COMERCIALES = SOLO los de panel-empresa                        ║
║                       = Los ÚNICOS que se venden a clientes              ║
║                                                                           ║
║   Todo lo demás es INTERNO de APONNT, NO comercializable                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Categorías Comerciales

| Categoría | Descripción | Cómo se vende |
|-----------|-------------|---------------|
| 🔵 **CORE** | Módulos esenciales | Incluidos en paquete base (precio fijo/empleado) |
| 🟢 **OPCIONAL** | Módulos adicionales | Venta individual (precio por módulo/empleado) |
| 📱 **APK** | Aplicaciones móviles | Incluidas con CORE |

## Catálogo Actual (36 productos)

### 🔵 CORE (9 módulos) - Paquete Base

| module_key | Nombre | Descripción |
|------------|--------|-------------|
| `attendance` | Control de Asistencia | Registro de marcaciones, horas trabajadas |
| `users` | Gestión de Usuarios | CRUD empleados, roles, permisos |
| `kiosks` | Gestión de Kioscos | Administración de terminales |
| `organizational-structure` | Estructura Organizacional | Organigrama, departamentos |
| `dms-dashboard` | Gestión Documental | Sistema de documentos |
| `mi-espacio` | Mi Espacio | Portal del empleado |
| `notification-center` | Centro de Notificaciones | Sistema de alertas |
| `biometric-consent` | Consentimientos | GDPR y privacidad |
| `user-support` | Soporte / Tickets | Sistema de tickets |

### 🟢 OPCIONALES (27 módulos) - Venta Individual

| module_key | Nombre | Precio/emp |
|------------|--------|------------|
| `vacation-management` | Gestión de Vacaciones | $5.00 |
| `payroll-liquidation` | Liquidación de Sueldos | $3.00 |
| `medical` | Gestión Médica | (sin precio) |
| `legal-dashboard` | Gestión Legal | $15.00 |
| `employee-360` | Expediente 360° | $20.00 |
| `training-management` | Gestión de Capacitaciones | $1.50 |
| `hour-bank` | Banco de Horas | $2.50 |
| `art-management` | Gestión de ART | $2.00 |
| `sanctions-management` | Gestión de Sanciones | $1.00 |
| `job-postings` | Búsquedas Laborales | $1.00 |
| `visitors` | Control de Visitantes | $1.00 |
| `hse-management` | Seguridad e Higiene (HSE) | $99.00 |
| `compliance-dashboard` | Risk Intelligence | $2.00 |
| `audit-reports` | Reportes de Auditoría | $2.00 |
| `emotional-analysis` | Análisis Emocional | $2.00 |
| `employee-map` | Mapa de Empleados | $1.50 |
| `sla-tracking` | Seguimiento de SLA | $1.50 |
| `benefits-management` | Beneficios Laborales | $1500.00 |
| `finance-dashboard` | Finanzas | $5.00 |
| `marketplace` | Marketplace | $50.00 |
| `my-procedures` | Mis Procedimientos | $3.00 |
| `procedures-manual` | Manual de Procedimientos | (sin precio) |
| `voice-platform` | Voice Platform | $29.99 |
| `warehouse-management` | Gestión de Almacenes | (sin precio) |
| `procurement-management` | Compras y Proveedores | (sin precio) |
| `logistics-dashboard` | Logística Avanzada | (sin precio) |
| `siac-commercial-dashboard` | SIAC Comercial | (sin precio) |

## NO Comercializables (Internos APONNT)

Estos módulos **NO se venden**. Son herramientas de gestión interna:

| Panel | Propósito | Ejemplos |
|-------|-----------|----------|
| `panel-administrativo` | Gestión APONNT | companies, engineering-dashboard, auditor |
| `panel-proveedores` | Gestión proveedores | vendors |
| `panel-asociados` | Gestión asociados | partners, associate-marketplace |
| Técnicos | Infraestructura | database-sync, deploy-manager |

## Fuente Única de Verdad

### Base de Datos

```sql
-- CONSULTA OFICIAL para obtener módulos comerciales
SELECT module_key, name, commercial_type, base_price
FROM v_modules_by_panel
WHERE target_panel = 'panel-empresa'
  AND show_as_card = true
ORDER BY commercial_type, name;
```

### Tablas Involucradas

```
┌─────────────────────────────────────────────────────────────────┐
│                    system_modules                               │
│                 (FUENTE DE VERDAD)                              │
│                                                                 │
│  • module_key (PK)                                              │
│  • is_core = true/false                                         │
│  • is_active = true/false                                       │
│  • available_in = 'company'/'admin'/'both'                     │
│  • parent_module_key = NULL (tarjeta) / 'parent' (submódulo)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  v_modules_by_panel                             │
│               (VISTA - deriva automáticamente)                  │
│                                                                 │
│  • target_panel = 'panel-empresa' / 'panel-administrativo'     │
│  • commercial_type = 'core' / 'opcional' / 'apk-complementaria'│
│  • show_as_card = true/false                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   company_modules                               │
│              (Qué tiene CADA empresa)                           │
│                                                                 │
│  • company_id + system_module_id (FK)                          │
│  • activo = true/false                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Activación de Empresa

```
1. Se crea quote con módulos seleccionados
                    │
                    ▼
2. Quote se acepta (status = 'accepted')
                    │
                    ▼
3. Se activa empresa (POST /companies/:id/onboarding/activate)
                    │
                    ▼
4. Se insertan en company_modules:
   • Todos los is_core = true de system_modules
   • Todos los módulos del quote (modules_data)
                    │
                    ▼
5. Empresa ve en panel-empresa:
   • Los 9 módulos CORE
   • Los módulos opcionales contratados
```

## Scripts de Verificación

```bash
# Ver catálogo comercial completo
node scripts/verify-commercial-modules.js

# Ver consistencia general (incluye internos)
node scripts/verify-module-consistency.js
```

## Cómo Modificar el Catálogo

### Agregar módulo al CORE

```sql
UPDATE system_modules
SET is_core = true
WHERE module_key = 'nombre-modulo';
```

### Quitar módulo del CORE (hacerlo opcional)

```sql
UPDATE system_modules
SET is_core = false
WHERE module_key = 'nombre-modulo';
```

### Cambiar precio de módulo opcional

```sql
UPDATE system_modules
SET base_price = 5.00
WHERE module_key = 'nombre-modulo';
```

## API Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/engineering/commercial-modules` | Catálogo completo |
| `PUT /api/engineering/commercial-modules/core-price` | Cambiar precio CORE |
| `PUT /api/engineering/commercial-modules/:key/price` | Cambiar precio módulo |

---

**Última actualización:** 2026-02-04
**Versión:** 1.0
