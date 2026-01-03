# MEJORA #25 - Fix Attendance SQL Errors (COMPLETE)

**Fecha**: 2025-12-24
**Problema**: Test SETUP de attendance falla con error SQL
**Archivos afectados**: `tests/e2e/configs/attendance.config.js`

---

## 🔴 ERROR IDENTIFICADO

```
error: no existe la columna «user_id» en la relación «attendances»
```

**Ubicación**: Línea 279 y otras SQL queries en attendance.config.js

---

## 🔍 ANÁLISIS

La tabla `attendances` usa nomenclatura **MIXTA** (Sequelize):
- Primary key: `id` (snake_case)
- Foreign keys: **`"UserId"`** (camelCase quoted)
- Timestamps: **`"createdAt"`**, **`"updatedAt"`** (camelCase quoted)
- Time fields: **`"checkInTime"`**, **`"checkOutTime"`** (camelCase quoted)
- Data fields: `company_id`, `date`, `status`, `origin_type` (snake_case)

**Tabla `users` (para SELECT)**:
- Primary key: `user_id` (snake_case) ✅
- Status: `is_active` (snake_case) ✅

---

## ✅ SOLUCIÓN APLICADA

Ya se aplicaron en MEJORA #23/#24:
- ✅ Línea 279: `SELECT user_id FROM users WHERE is_active = true`
- ✅ Línea 288: `userResult.rows[0].user_id`
- ✅ Línea 294: `"UserId", company_id, date, "checkInTime", "checkOutTime"`

**Verificado**: El INSERT ya está correcto usando:
```sql
INSERT INTO attendances (
  "UserId", company_id, date, "checkInTime", "checkOutTime",
  status, origin_type, "createdAt", "updatedAt"
)
```

---

## 🐛 ERROR REAL (Post-MEJORA #23/#24)

**Hipótesis**: El error podría venir de:
1. ❌ **ssotMap metadata** (líneas 333-342) - define `column: 'user_id'` pero debería ser `"UserId"`
2. ❌ **primaryKey config** (línea 268) - define `attendance_id` pero INSERT retorna `id`
3. ✅ El código del INSERT ya está correcto

---

## 🔧 FIX APLICADO (MEJORA #25)

### Fix 1: Actualizar ssotMap

**ANTES** (línea 333-342):
```javascript
user_id: {
  source: 'database',
  table: 'attendances',
  column: 'user_id',  // ❌ INCORRECTO
  type: 'foreign-key',
  references: {
    table: 'users',
    column: 'user_id'
  }
}
```

**DESPUÉS**:
```javascript
user_id: {
  source: 'database',
  table: 'attendances',
  column: '"UserId"',  // ✅ CORRECTO - quoted camelCase
  type: 'foreign-key',
  references: {
    table: 'users',
    column: 'user_id'  // ✅ users sí usa snake_case
  }
}
```

### Fix 2: Actualizar primaryKey

**ANTES** (línea 268):
```javascript
database: {
  table: 'attendances',
  primaryKey: 'attendance_id',  // ❌ NO EXISTE
```

**DESPUÉS**:
```javascript
database: {
  table: 'attendances',
  primaryKey: 'id',  // ✅ CORRECTO
```

### Fix 3: Actualizar resto de ssotMap

```javascript
ssotMap: {
  attendance_id: {  // Este es el field name lógico
    source: 'database',
    table: 'attendances',
    column: 'id',  // ✅ Columna real en DB
    type: 'primary'
  },
  // ... otros campos con nombres correctos
}
```

---

## 📊 RESULTADO ESPERADO

Con estos fixes:
- ✅ SETUP test debería pasar (crear registro de prueba)
- ✅ SSOT test debería validar correctamente las columnas
- ✅ DEPENDENCY test debería acceder a user_id sin errores

---

## 🧪 COMANDOS DE VERIFICACIÓN

```bash
# Ejecutar solo test de attendance
cd backend
npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js --grep="Asistencias"

# Ver resultado
cat tests/e2e/results/batch-test-results.json | grep -A 10 "attendance"
```

---

## 📝 NOTAS

- El schema de `attendances` es confuso porque mezcla snake_case y camelCase
- Sequelize fuerza camelCase en foreign keys y timestamps
- Los campos de datos usan snake_case
- **SIEMPRE** usar quoted strings para camelCase columns: `"UserId"`, `"checkInTime"`
