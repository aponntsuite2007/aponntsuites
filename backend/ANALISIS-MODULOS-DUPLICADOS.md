# ANÁLISIS: MÓDULOS DUPLICADOS vs MÓDULOS CONTENEDORES

**Fecha**: 2025-12-29
**Analista**: Claude Code SYNAPSE
**Objetivo**: Identificar duplicación de módulos (departments, shifts) vs contenedor (organizational-structure)

---

## 🔍 HALLAZGOS

### 1. MÓDULOS EN BASE DE DATOS

Todos existen como entradas en `system_modules`:

| MODULE_KEY | NOMBRE | CORE | TIENE FRONTEND |
|------------|--------|------|----------------|
| `departments` | Gestión de Departamentos | ✅ | ❌ NO |
| `shifts` | Gestión de Turnos | ✅ | ❌ NO |
| `organizational-structure` | Estructura Organizacional | ✅ | ✅ SÍ |
| `roles-permissions` | Roles y Permisos | ✅ | ✅ SÍ |

### 2. ARCHIVOS FRONTEND ENCONTRADOS

```bash
✅ public/js/modules/organizational-structure.js  (1,500+ líneas)
✅ public/js/modules/roles-permissions.js          (módulo RBAC independiente)
❌ public/js/modules/departments.js                (NO EXISTE)
❌ public/js/modules/shifts.js                     (NO EXISTE)
```

### 3. CONTENIDO DE `organizational-structure.js`

**Líneas 5-11** (comentario del archivo):
```javascript
/**
 * Tabs:
 * 1. Departamentos (integrado) ← ✅ departments DENTRO
 * 2. Sectores (nuevo)
 * 3. Convenios/Acuerdos Laborales
 * 4. Categorías Salariales
 * 5. Turnos (integrado)        ← ✅ shifts DENTRO
 * 6. Roles Adicionales
 */
```

**Líneas 89-96** (API departments):
```javascript
async getDepartments() {
    const response = await fetch(`/api/v1/departments?company_id=${getCompanyId()}`, {
        headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    return result;
}
```

El módulo `organizational-structure` **SÍ consume** la API de departments y shifts, pero como **TABS internos**, no como módulos separados.

---

## 🚨 PROBLEMA IDENTIFICADO

**El dashboard de ISI muestra**:
- "Gestión de Departamentos" (tarjeta individual)
- "Gestión de Turnos" (tarjeta individual)
- "Roles y Permisos" (tarjeta individual)

**PERO**:
1. `departments` y `shifts` **NO tienen frontend** → Son **módulos fantasma**
2. Aparecen en BD porque alguien los registró, pero nunca tuvieron código .js
3. `organizational-structure` es el módulo REAL que contiene departments y shifts como tabs

---

## ✅ CASOS CONFIRMADOS

### CASO 1: `roles-permissions` → **MÓDULO INDEPENDIENTE (CORRECTO)**

- ✅ Tiene frontend propio (`roles-permissions.js`)
- ✅ API propia (`/api/v1/access-control`)
- ✅ Funcionalidad: RBAC, matriz de permisos
- ✅ **NO es duplicado** - Es un módulo CORE independiente

### CASO 2: `departments` y `shifts` → **DUPLICADOS OBSOLETOS (INCORRECTO)**

- ❌ NO tienen frontend
- ❌ Nunca se cargaron en panel-empresa.html
- ❌ NO aparecen con `loadModule('departments')` en ningún lado
- ✅ SUS APIs (`/api/v1/departments`, `/api/v1/shifts`) SÍ existen
- ✅ Sus datos están en `organizational-structure` como tabs

**CONCLUSIÓN**: Son **entradas huérfanas** en la BD que generan confusión.

---

## 📋 CLASIFICACIÓN DE MÓDULOS

### MÓDULO COMERCIAL (Contenedor)
- **Definición**: Lo que el usuario ve como "una tarjeta" o "un menú principal"
- **Ejemplo**: "Estructura Organizacional"
- **Contiene**: Múltiples tabs/vistas (departments, sectores, turnos, etc.)

### SUBMÓDULO TÉCNICO (Tab/Vista)
- **Definición**: Una sección DENTRO de un módulo comercial
- **Ejemplo**: "Departamentos" (tab dentro de Estructura Organizacional)
- **NO debería**: Aparecer como tarjeta separada en el dashboard

---

## 🛠️ RECOMENDACIONES

### OPCIÓN A: MARCAR COMO SUBMÓDULOS (Preferido)

1. Agregar columna `parent_module_key` a `system_modules`
2. Actualizar:
   ```sql
   UPDATE system_modules
   SET parent_module_key = 'organizational-structure',
       available_in = NULL  -- No mostrar en dashboard
   WHERE module_key IN ('departments', 'shifts');
   ```
3. Modificar dashboard para NO mostrar submódulos como tarjetas independientes

**Ventajas**:
- Mantiene historial
- APIs siguen funcionando
- Clara jerarquía

### OPCIÓN B: ELIMINAR DUPLICADOS OBSOLETOS (Más limpio)

**Solo si estamos 100% seguros que son duplicados sin uso**:

1. Verificar que NO haya referencias en:
   - `company_modules` (¿alguna empresa los tiene activos?)
   - Código backend (rutas, controladores)
   - Logs de uso

2. Si confirmamos que son obsoletos:
   ```sql
   -- Backup primero
   INSERT INTO system_modules_backup SELECT * FROM system_modules
   WHERE module_key IN ('departments', 'shifts');

   -- Eliminar
   DELETE FROM company_modules WHERE module_id IN
     (SELECT id FROM system_modules WHERE module_key IN ('departments', 'shifts'));
   DELETE FROM system_modules WHERE module_key IN ('departments', 'shifts');
   ```

**Ventajas**:
- Código más limpio
- Sin confusión
- Base de datos más pequeña

---

## ⚠️ ANTES DE BORRAR - VERIFICAR

```sql
-- ¿Alguna empresa tiene departments/shifts activos?
SELECT
  c.name as empresa,
  sm.module_key,
  cm.is_active
FROM company_modules cm
JOIN system_modules sm ON sm.id = cm.module_id
JOIN companies c ON c.id = cm.company_id
WHERE sm.module_key IN ('departments', 'shifts');
```

Si retorna **0 filas** → Seguro borrar
Si retorna filas → **NO borrar**, usar Opción A (marcar como submódulos)

---

## 📊 RESUMEN

| Módulo | ¿Duplicado? | Acción Recomendada |
|--------|-------------|--------------------|
| `departments` | ✅ Sí (sin frontend) | Marcar como submódulo de `organizational-structure` |
| `shifts` | ✅ Sí (sin frontend) | Marcar como submódulo de `organizational-structure` |
| `roles-permissions` | ❌ No (independiente) | **MANTENER** - Es módulo CORE válido |

---

**Próximo paso**: Ejecutar query de verificación y decidir Opción A o B.
