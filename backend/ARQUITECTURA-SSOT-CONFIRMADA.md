# ARQUITECTURA SSOT - CONFIRMACIÓN

**Fecha**: 2025-12-29
**Verificación**: Departments y Shifts

---

## ✅ CONFIRMADO: ES SSOT (Single Source of Truth)

### BACKEND - APIs SSOT
```
/api/v1/departments  → CRUD completo (SSOT)
/api/v1/shifts       → CRUD completo (SSOT)
```

### FRONTEND - ÚNICO CONSUMIDOR
```javascript
// organizational-structure.js (2,845 líneas)

// Líneas 90-130: Departments CRUD
async getDepartments()           → fetch('/api/v1/departments')
async createDepartment(data)     → POST '/api/v1/departments'
async updateDepartment(id, data) → PUT '/api/v1/departments/:id'
async deleteDepartment(id)       → DELETE '/api/v1/departments/:id'

// Líneas 154-161: Shifts GET
async getShifts()                → fetch('/api/v1/shifts')
```

**NO hay duplicación de código** - Todo usa las mismas APIs.

---

## ❌ PROBLEMA: Entradas Huérfanas en BD

### En `system_modules`:
- ✅ `organizational-structure` → Tiene frontend (2,845 líneas)
- ❌ `departments` → SIN frontend, pero aparece en dashboard ISI
- ❌ `shifts` → SIN frontend, pero aparece en dashboard ISI

### Archivos físicos:
```bash
✅ public/js/modules/organizational-structure.js  (EXISTE)
❌ public/js/modules/departments.js               (NO EXISTE)
❌ public/js/modules/shifts.js                    (NO EXISTE)
```

---

## 🎯 SOLUCIÓN: Sistema de Jerarquías en BD

### Agregar columnas a `system_modules`:
```sql
ALTER TABLE system_modules
ADD COLUMN parent_module_key VARCHAR(100),
ADD COLUMN module_type VARCHAR(20) DEFAULT 'standalone';

-- Tipos válidos:
-- 'standalone' = Módulo independiente (ej: roles-permissions)
-- 'container'  = Módulo contenedor con tabs (ej: organizational-structure)
-- 'submodule'  = Tab/vista dentro de container (ej: departments, shifts)
```

### Clasificar módulos correctamente:
```sql
-- Marcar organizational-structure como CONTAINER
UPDATE system_modules
SET module_type = 'container'
WHERE module_key = 'organizational-structure';

-- Marcar departments y shifts como SUBMODULES
UPDATE system_modules
SET parent_module_key = 'organizational-structure',
    module_type = 'submodule'
WHERE module_key IN ('departments', 'shifts');
```

### Filtrar en dashboard:
```javascript
// En panel-empresa.html o donde se renderizan las tarjetas
modules
  .filter(m => m.module_type !== 'submodule')  // Ocultar submódulos
  .map(m => renderModuleCard(m))
```

---

## 📋 RESULTADO ESPERADO

**ANTES** (Dashboard ISI muestra):
- ❌ Gestión de Departamentos (tarjeta individual - INCORRECTO)
- ❌ Gestión de Turnos (tarjeta individual - INCORRECTO)
- ✅ Estructura Organizacional (tarjeta con tabs)

**DESPUÉS** (Dashboard ISI muestra):
- ✅ Estructura Organizacional (tarjeta única)
  - Tab: Departamentos
  - Tab: Sectores
  - Tab: Turnos
  - Tab: Convenios
  - Tab: Categorías
  - Tab: Roles

---

## ✅ VENTAJAS

1. **SSOT preservado** - APIs siguen siendo únicas
2. **Dashboard limpio** - Sin tarjetas duplicadas
3. **Jerarquía clara** - Módulos padre-hijo en BD
4. **Backward compatible** - APIs no cambian
5. **Escalable** - Fácil agregar más submódulos

---

**Próximo paso**: Implementar migración SQL + actualizar lógica de renderizado dashboard.
