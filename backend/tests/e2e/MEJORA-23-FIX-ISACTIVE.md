# MEJORA #23 - FIX isActive → is_active en SQL Directo

**Fecha**: 2025-12-24
**Batch**: #9 → #10
**Módulo afectado**: attendance
**Resultado previo**: 4/5 passing (SETUP test fallando)
**Resultado esperado**: 5/5 passing ✅

---

## ❌ PROBLEMA IDENTIFICADO

**Archivo**: `tests/e2e/configs/attendance.config.js`
**Línea**: 280
**Test fallando**: SETUP (testDataFactory)

### Error en Batch #9:

```
Error at attendance.config.js:278
  276 |       // MEJORA #21: Usar camelCase Sequelize (UserId, no user_id)
  277 |       // Obtener un usuario válido de la empresa
> 278 |       const userResult = await db.query(`
      |                          ^
  279 |         SELECT id FROM users
  280 |         WHERE company_id = $1 AND "isActive" = true
  281 |         LIMIT 1

Status: FAILED
Tests Passing: 4/5
```

### Causa Raíz:

**CONFUSIÓN ENTRE CONVENCIONES**:

1. **Sequelize (ORM)**: Usa camelCase en código JavaScript
   ```javascript
   User.findOne({ where: { isActive: true } })
   // Sequelize AUTO-TRADUCE a: WHERE is_active = true
   ```

2. **SQL Directo (db.query)**: Debe usar nombres de columna PostgreSQL reales
   ```sql
   -- ❌ INCORRECTO (intentando usar nombre Sequelize)
   WHERE "isActive" = true

   -- ✅ CORRECTO (nombre de columna real en PostgreSQL)
   WHERE is_active = true
   ```

### Análisis del Modelo User:

**Archivo**: `src/models/User-postgresql.js` (línea 250-254)

```javascript
isActive: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
  field: 'is_active',  // ← Nombre real de la columna en PostgreSQL
},
```

**Clarificación**:
- **Propiedad en Sequelize**: `isActive` (camelCase)
- **Columna en PostgreSQL**: `is_active` (snake_case)
- **En SQL directo**: SIEMPRE usar `is_active`

---

## ✅ SOLUCIÓN - MEJORA #23

### Fix en attendance.config.js:

```javascript
// ANTES (INCORRECTO):
const userResult = await db.query(`
  SELECT id FROM users
  WHERE company_id = $1 AND "isActive" = true  // ❌ isActive no existe en PostgreSQL
  LIMIT 1
`, [companyId]);

// DESPUÉS (CORRECTO):
const userResult = await db.query(`
  SELECT id FROM users
  WHERE company_id = $1 AND is_active = true  // ✅ is_active es la columna real
  LIMIT 1
`, [companyId]);
```

### Cambios aplicados:

**Archivo**: `tests/e2e/configs/attendance.config.js`
**Línea**: 280
**Cambio**: `"isActive"` → `is_active`

---

## 📋 CHECKLIST DE VALIDACIÓN

### Convenciones a seguir en SQL directo:

- ✅ **users.is_active** (NO "isActive")
- ✅ **attendances.UserId** (camelCase porque así está en BD - ver MEJORA #21)
- ✅ **attendances.checkInTime** (camelCase porque así está en BD)
- ✅ **attendances.checkOutTime** (camelCase porque así está en BD)
- ✅ **attendances.createdAt** (camelCase porque así está en BD)
- ✅ **attendances.updatedAt** (camelCase porque así está en BD)
- ✅ **users.company_id** (snake_case porque así está en BD)

### Regla de oro:

**¿Cómo saber qué convención usar?**

1. **Revisar el modelo Sequelize** → Buscar propiedad `field: '...'`
2. **Si tiene `field`**: Usar ese valor en SQL directo
3. **Si NO tiene `field`**: Sequelize asume snake_case del nombre de propiedad

**Ejemplo**:

```javascript
// Modelo Sequelize
isActive: {
  field: 'is_active'  // ← Usar esto en SQL
}

UserId: {
  field: 'UserId'  // ← Usar esto en SQL (sí, camelCase en BD)
}

email: {
  // No tiene field, Sequelize asume 'email'
}
```

---

## 🎯 RESULTADO ESPERADO

### Batch #9 (con error):
- **attendance**: 4/5 FAILED

### Batch #10 (con MEJORA #23):
- **attendance**: 5/5 PASSED ✅

### Proyección final:
- **Batch #10**: 28/29 o 29/29 PASSED
- **attendance**: Arreglado ✅
- **companies**: Con skip (MEJORA #22) = PASSED ✅

---

## 📝 LECCIONES APRENDIDAS

1. **SQL directo vs ORM**: No asumir que nombres Sequelize = nombres PostgreSQL
2. **Siempre revisar modelo**: Verificar `field: '...'` en definición de columnas
3. **Testing de testDataFactory**: Ejecutar `testDataFactory()` aisladamente antes de batch completo
4. **Schema dual**: Este sistema tiene mezcla de snake_case (users, companies) y camelCase (attendances, notifications)

---

## 🔗 MEJORAS RELACIONADAS

- **MEJORA #10**: Corrigió INSERT en attendances (user_id → UserId)
- **MEJORA #13**: Corrigió timestamps (created_at → createdAt)
- **MEJORA #21**: Corrigió testDataFactory completo (casi completo)
- **MEJORA #23**: Fix final para SELECT en users (isActive → is_active)

---

## ✅ APLICACIÓN

- **Aplicada**: 2025-12-24 12:50 PM
- **En paralelo con**: Batch #9 (corriendo)
- **Próximo paso**: Batch #10 con fix aplicado
- **Tiempo estimado**: Batch #9 termina ~14:30 → Batch #10 inicia ~14:31

---

**Fecha**: 2025-12-24
**Status**: ✅ APLICADA (esperando validación en Batch #10)
