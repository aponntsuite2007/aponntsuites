# 🐛 BUGS DOCUMENTADOS - TAB 1 ADMINISTRACIÓN

**Fecha**: 2025-01-12
**Reportado por**: Usuario
**Contexto**: Testing manual del modal "Ver Usuario" → TAB 1
**Empresa de prueba**: ISI (company_id=11)

---

## 📋 LISTADO DE BUGS ENCONTRADOS

### ✅ BUG 1: Botón "Activar/Desactivar" cambia el ROL en vez del ESTADO

**Síntoma**:
- Usuario tiene rol "employee" y estado "Desactivado"
- Click en botón "Activar Usuario"
- **Resultado erróneo**: El rol cambia a "supervisor" pero el estado NO cambia
- **Esperado**: El estado debe cambiar a "Activo", el rol NO debe cambiar

**Ubicación del código**:
- `backend/public/js/modules/users.js:7620-7648` - Función `toggleUserStatus()`

**Diagnóstico**:
- La función `toggleUserStatus()` envía correctamente `isActive: !currentStatus` al backend
- Posible problema en el backend (ruta PUT `/api/v1/users/:id`) que está cambiando el rol en vez del estado
- O problema en el `refreshTab1Data()` que está mostrando datos incorrectos

**Prioridad**: 🔴 CRÍTICA

---

### ✅ BUG 2: Botón GPS "Permitir fuera de área" NO cambia el estado

**Síntoma**:
- Usuario tiene GPS "Restringido"
- Click en botón "Permitir fuera de área"
- **Resultado erróneo**: El estado GPS NO cambia, sigue diciendo "Restringido"
- **Esperado**: Debe cambiar a "Sin restricción GPS"

**Ubicación del código**:
- `backend/public/js/modules/users.js:7651-7680` - Función `toggleGPSRadius()`

**Diagnóstico**:
- La función envía correctamente `allowOutsideRadius: !currentSetting` al backend
- Posible problema en el backend (ruta PUT) que no está actualizando el campo
- O problema en el `refreshTab1Data()` que no está obteniendo el valor actualizado

**Prioridad**: 🔴 CRÍTICA

---

### ✅ BUG 3: "Asignar Sucursal" lista DEPARTAMENTOS en vez de SUCURSALES

**Síntoma**:
- Click en botón "Configurar Sucursales"
- Modal se abre pero lista DEPARTAMENTOS en vez de SUCURSALES
- **Resultado erróneo**: Dropdown muestra "Ventas", "Recursos Humanos", etc. (departamentos)
- **Esperado**: Debe mostrar sucursales de la tabla `branches`

**Ubicación del código**:
- `backend/public/js/modules/users.js:7882-8027` - Función `manageBranches()`
- **Línea 7903**: `fetch('/api/v1/departments')` ← ❌ ERROR: Está obteniendo departments en vez de branches

**Diagnóstico**:
- La función `manageBranches()` hace fetch a `/api/v1/departments` (línea 7903)
- Debería hacer fetch a `/api/v1/branches` para obtener las sucursales reales
- La tabla `branches` existe en la BD y es multi-tenant

**Fix requerido**:
```javascript
// ANTES (línea 7903):
const branchesResponse = await fetch(window.progressiveAdmin.getApiUrl('/api/v1/departments'), {

// DESPUÉS:
const branchesResponse = await fetch(window.progressiveAdmin.getApiUrl('/api/v1/branches'), {
```

**Prioridad**: 🔴 CRÍTICA

---

### ✅ BUG 4: Falta asignación de sucursal por defecto (CENTRAL)

**Síntoma**:
- Usuarios nuevos no tienen sucursal asignada (`defaultBranchId = NULL`)
- Si la empresa no tiene sucursales creadas, debería auto-asignar "CENTRAL"

**Comportamiento esperado**:
1. Al crear un usuario, verificar si la empresa tiene sucursales
2. Si NO tiene sucursales:
   - Crear automáticamente una sucursal "CENTRAL"
   - Asignarla como `defaultBranchId` del usuario
3. Si SÍ tiene sucursales:
   - Permitir al admin elegir cuál asignar

**Ubicación del fix**:
- Backend: `src/routes/userRoutes.js` - Ruta POST `/api/v1/users`
- Agregar lógica de auto-creación de sucursal CENTRAL

**Prioridad**: 🟡 MEDIA

---

### ✅ BUG 5: "Cambiar Departamento" lista departamentos que NO incluyen el actual

**Síntoma**:
- Usuario tiene departamento asignado: "Marketing"
- Click en "Cambiar Departamento"
- Modal muestra solo 2 departamentos: "Ventas" y "Recursos Humanos"
- **Problema**: "Marketing" NO aparece en la lista, pero es el departamento actual del usuario
- **Incoherencia**: ¿Cómo tiene un departamento que no existe en la empresa?

**Ubicación del código**:
- `backend/public/js/modules/users.js:7751-7879` - Función `changeDepartment()`
- Línea 7762: `fetch('/api/v1/departments')` - Obtiene departamentos de la empresa

**Diagnóstico**:
- **Posibilidad 1**: El usuario tiene `departmentId` de una empresa diferente (error multi-tenant)
- **Posibilidad 2**: El departamento fue eliminado pero el usuario sigue teniéndolo asignado (falta ON DELETE SET NULL)
- **Posibilidad 3**: Hay departamentos en la BD que no se están listando (problema en el backend)

**Fix requerido**:
1. Verificar integridad referencial: `users.departmentId` → `departments.id`
2. Agregar restricción `ON DELETE SET NULL` si no existe
3. Listar TODOS los departamentos de la empresa, incluyendo inactivos
4. Si el departamento del usuario no existe, marcarlo como "⚠️ Departamento eliminado" en el dropdown

**Prioridad**: 🟡 MEDIA

---

### ✅ BUG 6: Historial de Cambios NO registra ningún cambio

**Síntoma**:
- Se realizan cambios en TAB 1 (departamento, rol, estado, GPS)
- Click en "Guardar" → Éxito ✅
- Click en TAB "Historial de Cambios"
- **Resultado**: Está vacío, no muestra ningún registro

**Comportamiento esperado**:
- Cada cambio en ANY TAB debe registrarse en una tabla de auditoría
- Formato:
  ```
  Fecha         | Usuario      | Campo           | Valor Anterior | Valor Nuevo
  2025-01-12    | admin        | departmentId    | 3             | 5
  2025-01-12    | admin        | isActive        | false         | true
  ```

**Ubicación del fix**:
- Backend: Todas las rutas PUT que modifican usuarios
- Crear tabla `user_change_logs` (si no existe)
- Agregar trigger o middleware que registre cambios automáticamente

**Prioridad**: 🟡 MEDIA

---

### ✅ BUG 7: "Asignar Turno" se queda cargando infinitamente

**Síntoma**:
- Click en botón "Asignar Turno" en TAB 1
- Aparece modal de carga (spinner)
- Dropdown de turnos nunca se carga, se queda girando infinitamente
- No hay mensaje de error

**Ubicación del código**:
- `backend/public/js/modules/users.js:3445-3525` - Función `performUserShiftAssignment()`

**Diagnóstico**:
- Posible error en la ruta `/api/v1/shifts` del backend
- Posible error en la query SQL (tabla `shifts` es multi-tenant, necesita `company_id`)
- Falta manejo de errores en el frontend

**Fix requerido**:
1. Verificar que la ruta GET `/api/v1/shifts` funciona correctamente
2. Agregar filtro `WHERE company_id = :companyId` en la query
3. Agregar `try/catch` y mensaje de error en el frontend
4. Verificar que la tabla `shifts` tiene datos para ISI (company_id=11)

**Prioridad**: 🔴 CRÍTICA

---

## 📊 RESUMEN DE PRIORIDADES

| Prioridad | Cantidad | Bugs |
|-----------|----------|------|
| 🔴 CRÍTICA | 4 | #1, #2, #3, #7 |
| 🟡 MEDIA   | 3 | #4, #5, #6 |

---

## 🔧 PLAN DE CORRECCIÓN

### Fase 1: Bugs Críticos (Orden de corrección)
1. **BUG #3** - Asignar Sucursal lista departamentos
   - Fix más simple: cambiar endpoint de `/departments` a `/branches`

2. **BUG #7** - Asignar Turno carga infinita
   - Verificar query multi-tenant en backend

3. **BUG #1** - Activar/Desactivar cambia rol
   - Revisar ruta PUT backend y refreshTab1Data()

4. **BUG #2** - GPS no cambia
   - Revisar ruta PUT backend y refreshTab1Data()

### Fase 2: Bugs Medios
5. **BUG #4** - Auto-asignar sucursal CENTRAL
6. **BUG #5** - Incoherencia en departamentos
7. **BUG #6** - Historial de cambios vacío

---

## ✅ CHECKLIST DE VALIDACIONES (Para replicar en TODOS los módulos)

Este checklist debe aplicarse a CUALQUIER modal CRUD del sistema:

### 1. Coherencia de Datos
- [ ] Dropdown muestra SOLO datos de la empresa actual (multi-tenant)
- [ ] Si un campo hace referencia a otra tabla, verificar que el registro existe
- [ ] Si un registro referenciado fue eliminado, mostrar "⚠️ Registro eliminado"

### 2. Valores por Defecto
- [ ] Campos obligatorios tienen valores por defecto razonables
- [ ] Si una tabla relacionada está vacía, auto-crear registro "CENTRAL" o "POR DEFECTO"

### 3. Actualización de UI
- [ ] Después de guardar, la UI se actualiza INMEDIATAMENTE (sin F5)
- [ ] Los cambios se reflejan en TODOS los lugares donde se muestra ese dato

### 4. Manejo de Errores
- [ ] Carga infinita → timeout de 30seg + mensaje de error
- [ ] Errores de API → mensaje claro al usuario
- [ ] Validaciones del lado del cliente ANTES de enviar al backend

### 5. Auditoría
- [ ] TODOS los cambios se registran en tabla de auditoría
- [ ] Registro incluye: usuario que hizo el cambio, fecha, campo, valor anterior, valor nuevo

### 6. Pruebas Automatizadas
- [ ] Test E2E verifica que el modal se abre
- [ ] Test E2E verifica que dropdowns se cargan
- [ ] Test E2E verifica que guardar actualiza la UI
- [ ] Test E2E verifica que los cambios persisten en BD

---

## 📝 NOTAS IMPORTANTES

> **PRESERVAR LO LOGRADO**: No romper funcionalidad existente al corregir bugs
> **INTEGRACIÓN**: Mantener la lógica del orquestador, no crear procesos aislados
> **TESTING**: Usar tests AUTOMATIZADOS, no pruebas manuales
> **MULTI-TENANT**: Verificar SIEMPRE que las queries filtran por `company_id`

---

**Fin del documento**
