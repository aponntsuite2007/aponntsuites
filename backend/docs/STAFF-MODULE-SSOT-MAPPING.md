# STAFF MODULE - SSOT (Single Source of Truth) Mapping

**Fecha**: 2026-02-01
**Módulo**: Staff APONNT (panel-administrativo.html)
**Versión**: 1.0

---

## ARQUITECTURA SSOT

### Fuente Única de Verdad (SSOT)

| Tabla | Descripción | Modelo Sequelize |
|-------|-------------|------------------|
| `aponnt_staff` | Personal de APONNT | `AponntStaff` |
| `aponnt_staff_roles` | Roles y niveles jerárquicos | `AponntStaffRole` |

### API Principal

**Base Path**: `/api/aponnt/staff-data`

| Endpoint | Método | Descripción | SSOT |
|----------|--------|-------------|------|
| `/` | GET | Listar todo el staff | `aponnt_staff` + `aponnt_staff_roles` |
| `/roles` | GET | Listar todos los roles | `aponnt_staff_roles` |
| `/vendors` | GET | Listar vendedores (área ventas) | `aponnt_staff` WHERE role_area='ventas' |
| `/:id` | GET | Obtener staff específico | `aponnt_staff` |
| `/` | POST | Crear nuevo staff | INSERT `aponnt_staff` |
| `/:id` | PUT | Actualizar staff | UPDATE `aponnt_staff` |
| `/:id` | DELETE | Desactivar staff | UPDATE is_active=false |
| `/organigrama/data` | GET | Datos para organigrama | `aponnt_staff` + `aponnt_staff_roles` |

---

## SUBMÓDULOS Y SU SSOT

### 1. Gestión Staff (`gestion-staff`)

**Archivo Frontend**: `admin-panel-controller.js` → `_loadGestionStaff()`

**Flujo de datos**:
```
Frontend                    API                         Base de Datos
─────────────────────────────────────────────────────────────────────
_loadGestionStaffTable() → GET /api/aponnt/staff-data/ → aponnt_staff
                                                        + JOIN aponnt_staff_roles
```

**Campos mostrados**:
- `first_name`, `last_name` → Nombre
- `email` → Email
- `role.role_name`, `role.role_code` → Rol
- `role.role_area` → Área
- `country` → País
- `is_active` → Estado

**Filtros disponibles**:
- Por área (role_area)
- Por estado (is_active)
- Por búsqueda (nombre/email)

---

### 2. Vendedores (`vendedores`)

**Archivo Frontend**: `admin-panel-controller.js` → `_loadVendedoresList()`

**Flujo de datos**:
```
Frontend                    API                         Base de Datos
─────────────────────────────────────────────────────────────────────
_loadVendedoresList()    → GET /api/aponnt/staff-data/vendors → aponnt_staff
                                                        WHERE role.role_area = 'ventas'
```

**Campos mostrados**:
- `first_name`, `last_name` → Nombre
- `email` → Email
- `country` → Región
- `companies_count` → Empresas asignadas
- `pending_commission` → Comisión pendiente
- `is_active` → Estado

---

### 3. Staff Aponnt (`staff-aponnt`)

**Archivo Frontend**: `admin-panel-controller.js` → `_loadStaffAponntList()`

**Flujo de datos**:
```
Frontend                    API                         Base de Datos
─────────────────────────────────────────────────────────────────────
_loadStaffAponntList()   → GET /api/aponnt/staff-data/ → aponnt_staff
                                                        + JOIN aponnt_staff_roles
```

**Vista**: Grid de cards con filtros por área
- Todos
- Administración (role_area='admin')
- Soporte (role_area='soporte')
- Desarrollo (role_area='desarrollo')

---

### 4. Roles de Staff (`staff-roles`)

**Archivo Frontend**: `admin-panel-controller.js` → `_loadStaffRolesList()`

**Flujo de datos**:
```
Frontend                    API                         Base de Datos
─────────────────────────────────────────────────────────────────────
_loadStaffRolesList()    → GET /api/aponnt/staff-data/roles → aponnt_staff_roles
```

**Campos mostrados**:
- `role_name` → Nombre del rol
- `role_code` → Código
- `role_area` → Área
- `level` → Nivel jerárquico
- `description` → Descripción
- `reports_to_role_code` → Reporta a

---

### 5. Organigrama (`organigrama`)

**Archivo Frontend**: `OrgChartIntelligent.js` → `loadData()`

**Flujo de datos**:
```
Frontend                    API                         Servicio                  Base de Datos
──────────────────────────────────────────────────────────────────────────────────────────────────
OrgChartIntelligent      → GET /api/brain/orgchart/aponnt → EcosystemBrainService → aponnt_staff
  .loadData()                                              .getOrgChartAponnt()    + aponnt_staff_roles
```

**Datos generados**:
- `nodes[]` → Personal con jerarquía
- `edges[]` → Conexiones supervisor-subordinado
- `tree[]` → Árbol jerárquico
- `insights{}` → Análisis inteligente (vacantes, bottlenecks)
- `stats{}` → Estadísticas

---

## INTEGRACIONES ENTRE MÓDULOS

### Organigrama ↔ Staff

El organigrama se alimenta directamente de `aponnt_staff`:

```javascript
// EcosystemBrainService.js - getOrgChartAponnt()
const [staff] = await sequelize.query(`
  SELECT
    s.staff_id, s.first_name, s.last_name, s.email,
    r.role_name, r.role_code, r.level, r.role_area
  FROM aponnt_staff s
  LEFT JOIN aponnt_staff_roles r ON s.role_id = r.role_id
  WHERE s.is_active = true
  ORDER BY r.level
`);
```

### Vendedores ↔ Staff

Los vendedores son un subconjunto del staff:

```javascript
// aponntStaffRoutes.js - GET /vendors
const vendors = await AponntStaff.findAll({
  include: [{
    model: AponntStaffRole,
    as: 'role',
    where: { role_area: 'ventas' }
  }]
});
```

---

## ESQUEMA DE BASE DE DATOS

### aponnt_staff

| Campo | Tipo | Descripción |
|-------|------|-------------|
| staff_id | UUID | PK |
| first_name | VARCHAR(100) | Nombre |
| last_name | VARCHAR(100) | Apellido |
| email | VARCHAR(255) | Email único |
| password_hash | VARCHAR(255) | Password hasheado |
| role_id | INTEGER | FK → aponnt_staff_roles |
| area | VARCHAR(50) | Área (legacy, usar role.role_area) |
| country | VARCHAR(3) | País (AR, CL, etc.) |
| phone | VARCHAR(50) | Teléfono |
| is_active | BOOLEAN | Activo/Inactivo |
| supervisor_id | UUID | FK → aponnt_staff (auto-ref) |
| created_at | TIMESTAMP | Fecha creación |
| updated_at | TIMESTAMP | Última actualización |

### aponnt_staff_roles

| Campo | Tipo | Descripción |
|-------|------|-------------|
| role_id | SERIAL | PK |
| role_code | VARCHAR(10) | Código único (GG, GR, GA, etc.) |
| role_name | VARCHAR(100) | Nombre del rol |
| role_area | VARCHAR(50) | Área (direccion, admin, ventas, desarrollo, soporte) |
| level | INTEGER | Nivel jerárquico (0-4) |
| description | TEXT | Descripción |
| reports_to_role_code | VARCHAR(10) | Código del rol superior |

---

## NIVELES JERÁRQUICOS

| Nivel | Nombre | Roles |
|-------|--------|-------|
| 0 | Dirección | GG (Gerente General) |
| 1 | Gerencia | GR, GA, GD |
| 2 | Jefatura | JFC, JCI, JA, JI, JS |
| 3 | Supervisión | SV, LV |
| 4 | Operativo | VEND, DEV-FE, DEV-BE, TS, ADM |

---

## VALIDACIONES SSOT

### Al crear/editar staff:

1. `role_id` debe existir en `aponnt_staff_roles`
2. `supervisor_id` (si existe) debe ser staff activo de nivel superior
3. `email` debe ser único
4. `country` debe ser código ISO válido

### Al eliminar staff:

1. Soft delete (is_active = false)
2. Verificar que no tenga subordinados activos
3. Actualizar organigrama automáticamente

---

## ARCHIVOS RELACIONADOS

**Backend**:
- `src/routes/aponntStaffRoutes.js` - API CRUD
- `src/routes/aponntStaffAuthRoutes.js` - Autenticación staff
- `src/models/AponntStaff.js` - Modelo Sequelize
- `src/models/AponntStaffRole.js` - Modelo Sequelize
- `src/services/EcosystemBrainService.js` - getOrgChartAponnt()

**Frontend**:
- `public/js/modules/admin-panel-controller.js` - Controlador principal
- `public/js/modules/OrgChartIntelligent.js` - Componente organigrama
- `public/js/modules/role-permissions.js` - Permisos por rol

---

## CHANGELOG

| Fecha | Cambio |
|-------|--------|
| 2026-02-01 | Creación del documento SSOT |
| 2026-02-01 | Corrección de Staff Aponnt (datos hardcoded → API) |
| 2026-02-01 | Corrección de Roles de Staff (HTML estático → API) |
| 2026-02-01 | Corrección de Vendedores (eliminado fallback mock) |
| 2026-02-01 | Implementación de Gestión Staff con tabla y filtros |
