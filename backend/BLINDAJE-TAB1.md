# 🛡️ BLINDAJE TAB 1 - ADMINISTRACIÓN
## DOCUMENTACIÓN DE FUNCIONALIDAD EXISTENTE - NO TOCAR

**Fecha**: 2025-01-17
**Versión**: 12.0-WRAPPER-3CM-MAS
**Commits críticos**:
- `4c3535e` - FIX CRÍTICO: TAB 1 Ahora Actualiza Datos Visiblemente Después de Guardar
- `6845548` - FEAT COMPLETE: TAB 1 Administración - CRUD 100% Funcional

---

## ✅ FUNCIONES QUE FUNCIONAN 100% - NO MODIFICAR

### 1. **editUserRole(userId, currentRole)** - Línea 7717
**Propósito**: Cambiar el rol del usuario (admin, supervisor, medical, employee)

**Persistencia**: ✅ SI
- Guarda en BD: `PUT /api/v1/users/:id` con `{role: newRole}`
- Actualiza UI: Refresca el valor en pantalla
- Ubicación archivo: `users.js:7717-7805`

**Campos DB**:
- `users.role` (VARCHAR)

---

### 2. **toggleUserStatus(userId)** - Línea 7641
**Propósito**: Activar/Desactivar usuario

**Persistencia**: ✅ SI
- Guarda en BD: `PUT /api/v1/users/:id` con `{isActive: !currentStatus}`
- Actualiza UI: Cambia badge y botón
- Ubicación archivo: `users.js:7641-7714`

**Campos DB**:
- `users.is_active` (BOOLEAN)

---

### 3. **manageBranches(userId)** - Línea 7972
**Propósito**: Gestionar sucursales del usuario (default y autorizadas)

**Persistencia**: ✅ SI
- Guarda en BD: `PUT /api/v1/users/:id` con `{defaultBranchId, authorizedBranches}`
- Actualiza UI: Modal de gestión de sucursales
- Ubicación archivo: `users.js:7972-8116`

**Campos DB**:
- `users.default_branch_id` (UUID)
- `users.authorized_branches` (JSONB ARRAY)

**Dependencia**: Módulo `branches` del sistema

---

### 4. **changeDepartment(userId, currentDeptId)** - Línea 7837
**Propósito**: Cambiar departamento del usuario

**Persistencia**: ✅ SI
- Guarda en BD: `PUT /api/v1/users/:id` con `{departmentId: newDeptId}`
- Actualiza UI: Modal de selección de departamento
- Ubicación archivo: `users.js:7837-7970`

**Campos DB**:
- `users.department_id` (UUID)

**Dependencia**: Módulo `departments` del sistema

---

### 5. **updateUserTab1Data(userId, data)** - Línea 8239
**Propósito**: Función helper para actualizar datos del TAB 1 y refrescar UI

**Persistencia**: ✅ SI
- Backend: `PUT /api/v1/users/:id`
- Frontend: Refresca secciones específicas del TAB 1

**Ubicación**: `users.js:8239-8363`

---

## 🎯 SECCIONES DEL TAB 1

### Sección 1: Acceso y Seguridad
- **Rol del Usuario** → `editUserRole()`
- **Estado del Usuario** → `toggleUserStatus()`

### Sección 2: Organización y Ubicación
- **Sucursal por Defecto** → `manageBranches()`
- **Permisos de Acceso** → Pendiente implementar
- **GPS Opcional** → Checkbox (campo `gpsRequired`)

### Sección 3: Departamento y Organización
- **Departamento** → `changeDepartment()`
- **Autorizar Llegadas Tarde** → Checkbox
- **Departamentos Autorizados** → Multiselect

### Sección 4: Horarios y Turnos
- **Turno Asignado** → Dropdown (depende del módulo `shifts`)
- **Horarios Flexibles** → Checkbox

### Sección 5: Acceso Administrativo
- **Fecha de Alta** → Solo lectura
- **Último Acceso** → Solo lectura
- **Creado por** → Solo lectura

---

## ⚠️ DEPENDENCIAS EXTERNAS

1. **Módulo Shifts (Turnos)** - `src/routes/shiftRoutes.js`
   - El TAB 1 usa `GET /api/v1/shifts` para cargar turnos disponibles

2. **Módulo Departments** - `src/routes/departmentRoutes.js`
   - `GET /api/v1/departments` para cargar departamentos

3. **Módulo Branches (Sucursales)** - `src/routes/branchRoutes.js` (si existe)
   - `GET /api/v1/branches` para cargar sucursales

---

## 📊 CAMPOS EN LA BASE DE DATOS (Tabla `users`)

**Campos que TAB 1 MODIFICA**:
```sql
- role                    VARCHAR       ✅ Persistente
- is_active              BOOLEAN       ✅ Persistente
- default_branch_id      UUID          ✅ Persistente
- authorized_branches    JSONB ARRAY   ✅ Persistente
- department_id          UUID          ✅ Persistente
- can_authorize_late     BOOLEAN       ✅ Persistente (campo canAuthorizeLateArrivals)
- authorized_departments JSONB ARRAY   ✅ Persistente
- shift_id               UUID          ⚠️ Pendiente implementar
- gps_required          BOOLEAN       ⚠️ Pendiente implementar
- flexible_schedule      BOOLEAN       ⚠️ Pendiente implementar
```

**Campos SOLO LECTURA**:
```sql
- created_at             TIMESTAMP
- updated_at             TIMESTAMP
- last_login            TIMESTAMP
```

---

## 🔒 REGLAS DE BLINDAJE

1. **NUNCA modificar las funciones listadas arriba**
2. **NUNCA cambiar los nombres de las funciones**
3. **NUNCA modificar la estructura de los parámetros**
4. **SIEMPRE usar el mismo endpoint**: `PUT /api/v1/users/:id`
5. **SIEMPRE llamar a `loadUsers()` después de guardar** para refrescar la tabla

---

## 📝 PATRÓN DE PERSISTENCIA DEL TAB 1

```javascript
// 1. Obtener datos actuales
const response = await fetch(`/api/v1/users/${userId}`);
const user = await response.json();

// 2. Preparar datos a actualizar
const updateData = {
    [campo]: nuevoValor
};

// 3. Guardar en BD
await fetch(`/api/v1/users/${userId}`, {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
});

// 4. Actualizar UI
await updateUserTab1Data(userId, updateData);

// 5. Recargar tabla
await loadUsers();
```

---

## ✅ VERIFICACIÓN DE PERSISTENCIA

**Tests que DEBEN pasar**:
1. Cambiar rol → F5 → Rol persiste ✅
2. Desactivar usuario → F5 → Estado persiste ✅
3. Cambiar sucursal → F5 → Sucursal persiste ✅
4. Cambiar departamento → F5 → Departamento persiste ✅

---

## 🚨 ADVERTENCIAS

- **NO tocar el endpoint backend**: `/api/v1/users/:id` funciona perfectamente
- **NO modificar la estructura del objeto `user`** que retorna el GET
- **NO cambiar los IDs de los elementos HTML** del TAB 1:
  - `#admin-role`
  - `#admin-status`
  - `#admin-branch`
  - `#admin-department`

---

**Este documento es SAGRADO. Si rompes TAB 1, el proyecto retrocede 2 commits.**
