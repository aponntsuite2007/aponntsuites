# 🎯 PLAN DE IMPLEMENTACIÓN - Sistema de Testing COMPLETO

## OBJETIVO
Sistema que prueba CRUD completo + verificación de persistencia en BD para los 36 módulos comerciales.

---

## ❌ LO QUE NO SIRVE (Lo anterior)
- Solo escanear elementos de UI ❌
- Solo contar botones/inputs ❌
- No verificar BD ❌
- Solo 1 módulo ❌

## ✅ LO QUE SÍ NECESITAMOS
- CRUD real: Click botones, llenar forms, submit ✅
- Verificar persistencia en PostgreSQL después de cada operación ✅
- Los 36 módulos comerciales ✅
- Reporte completo de qué funciona y qué no ✅

---

## 📋 FASES DE IMPLEMENTACIÓN

### FASE 1: CRUD Completo para Users (PoC)
**Tiempo estimado**: 1-2 horas

**Pasos**:
1. **CREATE**:
   - Click en "Agregar Usuario"
   - Esperar modal
   - Llenar formulario (nombre, email, rol, etc.)
   - Click "Guardar"
   - Esperar confirmación
   - **Query PostgreSQL**: `SELECT * FROM users WHERE email='test@test.com'`
   - Verificar que existe

2. **READ**:
   - Verificar que el usuario aparece en la lista/tabla
   - Click en el usuario para ver detalles

3. **UPDATE**:
   - Click "Editar" en el usuario creado
   - Cambiar nombre (ej: "Test User" → "Test User Updated")
   - Click "Guardar"
   - Esperar confirmación
   - **Query PostgreSQL**: `SELECT name FROM users WHERE id=123`
   - Verificar que el nombre cambió

4. **DELETE**:
   - Click "Eliminar" en el usuario
   - Confirmar en modal de confirmación
   - Esperar confirmación
   - **Query PostgreSQL**: `SELECT * FROM users WHERE id=123`
   - Verificar que retorna 0 filas (fue borrado)

**Archivo**: `backend/tests/e2e/contract-test.spec.js` - Actualizar funciones

---

### FASE 2: Configurar 36 Módulos Comerciales
**Tiempo estimado**: 30 min

**Obtener lista de módulos**:
```sql
SELECT * FROM v_modules_by_panel
WHERE target_panel = 'panel-empresa'
  AND show_as_card = true;
```

**O desde**: `backend/src/auditor/registry/modules-registry.json`

**Para cada módulo, configurar**:
```javascript
{
  key: 'module-key',
  name: 'Nombre del Módulo',
  routeFile: 'moduleName.js', // en src/routes/
  modelFile: 'ModelName.js',  // en src/models/
  tableName: 'table_name',    // tabla PostgreSQL
  menuText: 'Texto del menú',
  createButtonText: 'Crear/Nuevo/Agregar',

  // Campos del formulario para CREATE
  formFields: {
    nombre: 'Test Name',
    email: 'test@test.com',
    // ... más campos
  },

  // Campos para UPDATE (qué cambiar)
  updateFields: {
    nombre: 'Updated Name'
  },

  // Campo único para identificar el registro en BD
  uniqueField: 'email', // o 'id', 'slug', etc.
}
```

**Archivo**: Crear `backend/tests/e2e/modules-config.js` con array de 36 módulos

---

### FASE 3: Replicar CRUD para 35 Módulos Restantes
**Tiempo estimado**: 2-3 horas

**Estrategia**:
1. Crear función genérica `testModuleCRUD(moduleConfig)`
2. Loop sobre los 36 módulos
3. Ejecutar CRUD completo para cada uno
4. Capturar errores y continuar (no detener si 1 falla)
5. Acumular resultados

**Pseudo-código**:
```javascript
const results = [];

for (const module of modules) {
  try {
    const result = await testModuleCRUD(module);
    results.push({
      module: module.key,
      status: result.success ? 'PASS' : 'FAIL',
      create: result.create,
      read: result.read,
      update: result.update,
      delete: result.delete,
      errors: result.errors
    });
  } catch (error) {
    results.push({
      module: module.key,
      status: 'ERROR',
      error: error.message
    });
  }
}
```

---

### FASE 4: Reporte Final
**Tiempo estimado**: 30 min

**Generar HTML con**:
- Resumen: X/36 módulos funcionan 100%
- Desglose por módulo:
  - ✅ CRUD completo funciona
  - ⚠️ CREATE funciona, UPDATE falla
  - ❌ Módulo completamente roto
- Detalles de cada error
- Screenshots de cada módulo

**Archivo**: `backend/test-results/contract-report-complete.html`

---

## 🔧 FUNCIONES PRINCIPALES A IMPLEMENTAR

### 1. `testModuleCRUD(moduleConfig)`
```javascript
async function testModuleCRUD(moduleConfig) {
  const results = {
    create: { success: false, data: null, error: null },
    read: { success: false, data: null, error: null },
    update: { success: false, data: null, error: null },
    delete: { success: false, data: null, error: null }
  };

  try {
    // CREATE
    const createdId = await createRecord(moduleConfig);
    const existsInDB = await verifyInDatabase(moduleConfig, createdId);
    results.create = { success: existsInDB, data: { id: createdId } };

    // READ
    const readSuccess = await verifyRecordInUI(moduleConfig, createdId);
    results.read = { success: readSuccess };

    // UPDATE
    await updateRecord(moduleConfig, createdId);
    const updateVerified = await verifyUpdateInDatabase(moduleConfig, createdId);
    results.update = { success: updateVerified };

    // DELETE
    await deleteRecord(moduleConfig, createdId);
    const deletedFromDB = await verifyDeletedFromDatabase(moduleConfig, createdId);
    results.delete = { success: deletedFromDB };

  } catch (error) {
    results.error = error.message;
  }

  return results;
}
```

### 2. `createRecord(moduleConfig)`
```javascript
async function createRecord(moduleConfig) {
  // 1. Click botón crear
  await page.click(`button:has-text("${moduleConfig.createButtonText}")`);

  // 2. Esperar modal
  await page.waitForSelector('.modal, [role="dialog"]');

  // 3. Llenar formulario
  for (const [field, value] of Object.entries(moduleConfig.formFields)) {
    await page.fill(`[name="${field}"]`, value);
  }

  // 4. Submit
  await page.click('button:has-text("Guardar"), button[type="submit"]');

  // 5. Esperar confirmación
  await page.waitForTimeout(2000);

  // 6. Retornar ID del registro creado (extraer de UI o BD)
  return extractCreatedRecordId();
}
```

### 3. `verifyInDatabase(moduleConfig, recordId)`
```javascript
async function verifyInDatabase(moduleConfig, recordId) {
  const query = `
    SELECT * FROM ${moduleConfig.tableName}
    WHERE ${moduleConfig.uniqueField} = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [recordId]);
  return result.rows.length > 0;
}
```

### 4. `updateRecord(moduleConfig, recordId)` - Similar a createRecord
### 5. `deleteRecord(moduleConfig, recordId)` - Click eliminar + confirmar

---

## 📊 CRITERIOS DE ÉXITO

### Módulo PASA si:
- ✅ CREATE: Registro se crea en BD
- ✅ READ: Registro aparece en UI
- ✅ UPDATE: Cambios se guardan en BD
- ✅ DELETE: Registro se elimina de BD

### Módulo FALLA si:
- ❌ Cualquiera de las 4 operaciones falla

### Módulo PARCIAL si:
- ⚠️ Algunas operaciones funcionan, otras no

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

```
backend/tests/
├── e2e/
│   ├── contract-test.spec.js          # Test principal (ACTUALIZAR)
│   ├── modules-config.js              # Config de 36 módulos (CREAR)
│   └── helpers/
│       ├── crud-helpers.js            # Funciones CRUD genéricas (CREAR)
│       └── db-helpers.js              # Funciones de BD (CREAR)
├── test-results/
│   └── contract-report-complete.html  # Reporte final (GENERAR)
└── PLAN-IMPLEMENTACION-COMPLETA.md    # Este archivo
```

---

## 🚀 EJECUCIÓN

```bash
cd backend
npx playwright test tests/e2e/contract-test.spec.js
```

**Resultado esperado**:
```
Testing 36 modules...
✅ Users: PASS (CREATE ✅ READ ✅ UPDATE ✅ DELETE ✅)
✅ Attendance: PASS (CREATE ✅ READ ✅ UPDATE ✅ DELETE ✅)
❌ DMS: FAIL (CREATE ✅ READ ✅ UPDATE ❌ DELETE ✅)
...
⏱️ Total time: 45 min
📊 Results: 32/36 PASS (89%)
```

---

## 📝 NOTAS IMPORTANTES

1. **Timeouts**: Aumentar a 60s por módulo (CRUD puede ser lento)
2. **Cleanup**: Borrar datos de test después de cada módulo
3. **Parallelization**: NO ejecutar en paralelo (conflictos de BD)
4. **Screenshots**: Capturar en cada paso para debugging
5. **Retry**: Si un módulo falla, retry 1 vez antes de marcar como FAIL

---

## 🔄 PRÓXIMOS PASOS

1. [ ] Implementar funciones helpers (crud-helpers.js, db-helpers.js)
2. [ ] Crear modules-config.js con 36 módulos
3. [ ] Actualizar contract-test.spec.js con loop de módulos
4. [ ] Ejecutar y debuggear módulo por módulo
5. [ ] Generar reporte final
6. [ ] Documentar resultados

---

**Fecha de creación**: 2026-02-04
**Última actualización**: 2026-02-04
**Estado**: EN PROGRESO
