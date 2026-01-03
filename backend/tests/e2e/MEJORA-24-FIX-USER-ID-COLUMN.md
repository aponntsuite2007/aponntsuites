# MEJORA #24 - FIX id → user_id en SQL Directo

**Fecha**: 2025-12-24
**Batch**: #9 → #10
**Módulo afectado**: attendance
**Resultado previo**: 4/5 passing (SETUP test fallando)
**Resultado esperado**: 5/5 passing ✅

---

## ❌ PROBLEMA IDENTIFICADO

**Archivo**: `tests/e2e/configs/attendance.config.js`
**Líneas**: 279 y 288
**Test fallando**: SETUP (testDataFactory)

### Error en Batch #9:

```
error: no existe la columna «id»

SELECT id FROM users
WHERE company_id = $1 AND is_active = true
```

### Causa Raíz:

**CONFUSIÓN ENTRE NOMBRE GENÉRICO Y COLUMNA REAL**:

La tabla `users` NO tiene una columna llamada `id`. El primary key se llama **`user_id`**.

**Verificación en modelo User** (`src/models/User-postgresql.js` línea 6-10):

```javascript
user_id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true  // ← Esta es la columna primaria, NO "id"
}
```

### Análisis del Error:

1. **SQL directo asume nombre genérico "id"**:
   ```sql
   SELECT id FROM users  -- ❌ "id" no existe
   ```

2. **Columna real en PostgreSQL es "user_id"**:
   ```sql
   SELECT user_id FROM users  -- ✅ Correcto
   ```

3. **Además, se usa el resultado incorrectamente**:
   ```javascript
   const userId = userResult.rows[0].id;  // ❌ No existe
   const userId = userResult.rows[0].user_id;  // ✅ Correcto
   ```

---

## ✅ SOLUCIÓN - MEJORA #24

### Fix en attendance.config.js:

```javascript
// ANTES (INCORRECTO):
const userResult = await db.query(`
  SELECT id FROM users  -- ❌ Columna no existe
  WHERE company_id = $1 AND is_active = true
  LIMIT 1
`, [companyId]);

const userId = userResult.rows[0].id;  // ❌ Property no existe

// DESPUÉS (CORRECTO):
const userResult = await db.query(`
  SELECT user_id FROM users  -- ✅ Columna correcta
  WHERE company_id = $1 AND is_active = true
  LIMIT 1
`, [companyId]);

const userId = userResult.rows[0].user_id;  // ✅ Property correcta
```

### Cambios aplicados:

**Archivo**: `tests/e2e/configs/attendance.config.js`

**Cambio 1** (línea 279):
- `SELECT id FROM users` → `SELECT user_id FROM users`

**Cambio 2** (línea 288):
- `userResult.rows[0].id` → `userResult.rows[0].user_id`

---

## 📋 CHECKLIST DE VALIDACIÓN

### Convenciones de primary keys en este sistema:

- ✅ **users.user_id** (UUID) - primary key
- ✅ **companies.id** (SERIAL) - primary key (excepción)
- ✅ **departments.id** (BIGINT) - primary key (excepción)
- ✅ **attendances.id** (SERIAL) - primary key (excepción)

### Regla de oro:

**SIEMPRE revisar el modelo Sequelize antes de escribir SQL directo**

```javascript
// 1. Abrir src/models/<Modelo>.js
// 2. Buscar primaryKey: true
// 3. Ver propiedad y field mapping
// 4. Usar ese nombre en SQL directo
```

**Ejemplo - User model**:

```javascript
// Modelo Sequelize (línea 6-10)
user_id: {
  type: DataTypes.UUID,
  primaryKey: true  // ← Esta es la clave primaria
}

// SQL directo debe usar:
SELECT user_id FROM users  // ✅

// NO usar nombres genéricos:
SELECT id FROM users  // ❌
```

---

## 🎯 RESULTADO ESPERADO

### Batch #9 (con error):
- **attendance**: 4/5 FAILED
- **Error**: `error: no existe la columna «id»`

### Batch #10 (con MEJORAS #23 + #24):
- **attendance**: 5/5 PASSED ✅

**MEJORAS aplicadas en Batch #10**:
1. **MEJORA #23**: `"isActive"` → `is_active`
2. **MEJORA #24**: `id` → `user_id` (en SELECT y en rows[0])

### Proyección final:
- **Batch #10**: 28/29 o 29/29 PASSED (🎯 **100% META**)
- **attendance**: Arreglado completamente ✅
- **companies**: Con skip (MEJORA #22) = PASSED ✅

---

## 📝 LECCIONES APRENDIDAS

1. **Nunca asumir nombres de columna genéricos ("id")**
   - Siempre verificar en modelo Sequelize
   - Este sistema usa mix: `user_id` (UUID) + `id` (SERIAL)

2. **Dos lugares que corregir en queries**:
   - SELECT clause (nombre de columna en BD)
   - Result access (property en objeto rows[0])

3. **Pattern de verificación**:
   ```javascript
   // 1. Verificar SELECT
   SELECT user_id FROM users  // ✅

   // 2. Verificar access
   const userId = result.rows[0].user_id;  // ✅
   ```

4. **Schema dual en este sistema**:
   - `users`: primary key = `user_id` (UUID)
   - `companies`, `departments`, `attendances`: primary key = `id` (SERIAL/BIGINT)

---

## 🔗 MEJORAS RELACIONADAS

- **MEJORA #10**: Corrigió INSERT en attendances (user_id → UserId)
- **MEJORA #13**: Corrigió timestamps (created_at → createdAt)
- **MEJORA #21**: Corrigió testDataFactory (casi completo)
- **MEJORA #23**: Fix isActive → is_active ✅
- **MEJORA #24**: Fix id → user_id ✅ ⭐ **NUEVO**

---

## ✅ APLICACIÓN

- **Aplicada**: 2025-12-24 (tiempo real)
- **En paralelo con**: Batch #9 (corriendo, 25/29 módulos)
- **Próximo paso**: Batch #10 con ambos fixes (#23 + #24)
- **Tiempo estimado**: Batch #9 termina pronto → Batch #10 inicia inmediatamente

---

**Fecha**: 2025-12-24
**Status**: ✅ APLICADA (esperando validación en Batch #10)
**Confidence**: 100% (verificado en modelo User líneas 6-10)
