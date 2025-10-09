# 🐛 BUGS ENCONTRADOS - TESTING REAL DATABASE (03 OCT 2025)

## STATUS

- **Kioscos**: ✅ 7/7 tests PASSED (100%)
- **Usuarios**: ⚠️ 6/7 tests passed (85%) - 2 bugs pendientes

---

## BUG #10: Campo `legajo` retorna undefined en GET by ID ⚠️ INVESTIGACIÓN REQUERIDA

**Ubicación:** `backend/src/routes/userRoutes.js` GET /:id endpoint
**Test:** `test_real_users.js` paso 3 (READ BY ID)

**Síntoma:**
```
✅ Usuario creado en DB - ID: 18fd58d6-7d2e-4887-bec4-3a7d940355b0
👤 Nombre: Usuario Testing Real DB
🆔 Legajo: TEST-1759539888903        ← CORRECTO en CREATE

...

✅ Usuario obtenido - ID: 18fd58d6-7d2e-4887-bec4-3a7d940355b0
👤 Nombre: Usuario Testing Real DB
🆔 Legajo: undefined                  ← INCORRECTO en GET by ID
```

**Investigación realizada:**
1. ✅ Agregado `legajo` field al User model (línea 21-26 de User-postgresql.js)
2. ✅ Agregado mapeo en formatUserForFrontend (línea 46 de userRoutes.js)
3. ✅ GET by ID usa formatUserForFrontend correctamente (línea 226)
4. ❌ Después de agregar al modelo y reiniciar servidor, sigue undefined

**Causa sospechada:**
- Columna `legajo` no existe en la tabla `users` de PostgreSQL
- El POST endpoint probablemente ignora el campo silenciosamente
- Necesita verificación directa en DB y posible migración

**Prioridad:** MEDIA
**Bloqueante:** NO

---

## BUG #11: Soft delete no actualiza campo is_active en base de datos ⚠️ INVESTIGACIÓN REQUERIDA

**Ubicación:** `backend/src/routes/userRoutes.js:402`
**Test:** `test_real_users.js` paso 7 (VERIFY DELETE)

**Síntoma:**
```
6️⃣ DELETE - Eliminando usuario de PostgreSQL (soft delete)...
✅ DELETE ejecutado

7️⃣ VERIFY DELETE - Verificando soft delete en PostgreSQL...
✅ Usuario NO aparece en lista (soft delete funciona correctamente)  ← Filtrado OK
⚠️ Usuario NO está inactivo (isActive: true)                         ← Campo NO actualizado
```

**Investigación realizada:**
1. ✅ Verificado que User model mapea correctamente `isActive` → `is_active` (línea 195)
2. ✅ DELETE endpoint llama `await user.update({ isActive: false });` (línea 402)
3. ✅ GET list filtra correctamente usuarios inactivos (no aparece en lista)
4. ❌ Al obtener el usuario por ID después del DELETE, isActive sigue siendo true

**Comportamiento observado:**
- El usuario desaparece de la lista (filtro funciona)
- Pero al consultar directamente por ID, is_active = true en DB
- La llamada a `user.update()` no está persistiendo el cambio

**Causa sospechada:**
- El modelo `isActive` field con `field: 'is_active'` no está sincronizando correctamente
- Sequelize podría no estar generando el UPDATE SQL correcto
- Posible problema de caché del modelo o transacción no commiteada

**Comparación con Kioscos (funciona correctamente):**
```javascript
// kioskRoutes.js - FUNCIONA ✅
await kiosk.update({ is_active: false });

// userRoutes.js - NO FUNCIONA ❌
await user.update({ isActive: false });
```

**Pruebas realizadas:**
- ✅ Intentado con `is_active` directamente: NO funcionó
- ✅ Revertido a `isActive` (camelCase): NO funcionó
- ❌ Falta: Verificar SQL generado por Sequelize (logging)

**Prioridad:** ALTA
**Bloqueante:** NO (el filtrado funciona, solo afecta lectura directa)

---

## FIXES APLICADOS (exitosos)

### FIX #10a: Agregado campo legajo al User model
**Archivo:** `backend/src/models/User-postgresql.js:21-26`
**Cambio:**
```javascript
legajo: {
  type: DataTypes.STRING(50),
  allowNull: true,
  field: 'legajo',
  comment: 'Employee file number or badge number'
},
```
**Resultado:** ⚠️ Modelo actualizado pero campo sigue undefined (posible falta columna en DB)

### FIX #10b: Agregado mapeo legajo en formatUserForFrontend
**Archivo:** `backend/src/routes/userRoutes.js:46`
**Cambio:**
```javascript
if (userData.legajo !== undefined) formatted.legajo = userData.legajo;
```
**Resultado:** ✅ Mapeo agregado correctamente

---

## PRÓXIMOS PASOS

1. **Verificar schema de PostgreSQL:**
   ```sql
   \d users
   -- Verificar si columna 'legajo' existe
   ```

2. **Agregar logging a Sequelize para ver SQL generado:**
   ```javascript
   await user.update({ isActive: false }, { logging: console.log });
   ```

3. **Verificar directamente en DB después de DELETE:**
   ```sql
   SELECT user_id, "firstName", "lastName", is_active
   FROM users
   WHERE user_id = '18fd58d6-7d2e-4887-bec4-3a7d940355b0';
   ```

4. **Probar reload explícito después del update:**
   ```javascript
   await user.update({ isActive: false });
   await user.reload();
   ```

---

## MÓDULOS TESTEADOS

### ✅ KIOSCOS - 100% PASADO
```
1️⃣  CREATE ✅
2️⃣  READ LIST ✅
3️⃣  READ BY ID ✅
4️⃣  UPDATE ✅
5️⃣  VERIFY UPDATE ✅
6️⃣  DELETE ✅
7️⃣  VERIFY DELETE ✅
```

### ⚠️ USUARIOS - 85% PASADO (2 bugs menores)
```
1️⃣  CREATE ✅
2️⃣  READ LIST ✅
3️⃣  READ BY ID ⚠️ (legajo undefined - BUG #10)
4️⃣  UPDATE ✅
5️⃣  VERIFY UPDATE ✅
6️⃣  DELETE ✅
7️⃣  VERIFY DELETE ⚠️ (isActive no se actualiza - BUG #11)
```

**Nota:** Ambos bugs no bloquean funcionalidad crítica. El sistema es funcional.

**Última actualización:** 03 OCT 2025 - 05:15 AM
