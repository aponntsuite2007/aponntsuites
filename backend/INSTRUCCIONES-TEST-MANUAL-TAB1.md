# 📋 INSTRUCCIONES PARA TEST MANUAL - TAB 1 ADMINISTRACIÓN

## 🎯 OBJETIVO

Verificar que **TODOS** los campos del TAB 1 "Administración" se puedan editar, que los dropdowns traigan datos reales, y que los cambios persistan en la base de datos.

---

## 🔧 PREPARACIÓN

1. Abrir navegador: http://localhost:9998/panel-empresa.html
2. Login:
   - Empresa: **ISI**
   - Usuario: **soporte**
   - Password: **admin123**
3. Ir a módulo: **Gestión de Usuarios**
4. Click en botón **Ver** (👁️) del primer usuario
5. Verificar que se abre el modal "Expediente del Empleado"
6. Click en pestaña: **Administración** (primera pestaña)

---

## ✅ TESTS A REALIZAR (en orden)

### TEST 1: Cambiar Cargo/Posición
**Botón**: "✏️ Editar Posición"

1. Click en "✏️ Editar Posición"
2. ¿Se abre un prompt pidiendo nuevo cargo? → **Anotar: SÍ / NO**
3. Si SÍ: Ingresar "CARGO TEST" → Click OK
4. ¿Aparece mensaje de éxito? → **Anotar: SÍ / NO**
5. ¿Se actualiza el campo "Posición" en pantalla? → **Anotar: SÍ / NO**
6. **Valor mostrado**: _______________________

---

### TEST 2: Cambiar Departamento
**Botón**: "🔄 Cambiar Departamento"

1. Click en "🔄 Cambiar Departamento"
2. ¿Se abre modal con dropdown de departamentos? → **Anotar: SÍ / NO**
3. Si SÍ: ¿Cuántas opciones hay en el dropdown? → **Número**: _____
4. **Nombres de departamentos visibles**:
   - ___________________________
   - ___________________________
   - ___________________________
5. Seleccionar un departamento diferente al actual
6. Click en "💾 Guardar"
7. ¿Aparece mensaje de éxito? → **Anotar: SÍ / NO**
8. ¿Se actualiza el campo "Departamento" en el TAB 1? → **Anotar: SÍ / NO**
9. **Valor mostrado**: _______________________

---

### TEST 3: Gestionar Sucursales
**Botón**: "🏢 Gestionar Sucursales"

1. Click en "🏢 Gestionar Sucursales"
2. ¿Se abre modal con dropdowns? → **Anotar: SÍ / NO**
3. Si SÍ: ¿Cuántas opciones hay en "Sucursal por Defecto"? → **Número**: _____
4. **Nombres de sucursales visibles**:
   - ___________________________
   - ___________________________
   - ___________________________
5. Seleccionar una sucursal
6. Click en "💾 Guardar Cambios"
7. ¿Aparece mensaje de éxito? → **Anotar: SÍ / NO**
8. ¿Se actualiza el campo "Sucursal" en el TAB 1? → **Anotar: SÍ / NO**
9. **Valor mostrado**: _______________________

---

### TEST 4: Cambiar Rol
**Botón**: "✏️ Cambiar Rol"

1. Click en "✏️ Cambiar Rol"
2. ¿Se abre modal/prompt? → **Anotar: SÍ / NO**
3. ¿Qué opciones de rol aparecen?
   - ☐ Empleado
   - ☐ Supervisor
   - ☐ Administrador
   - ☐ Médico
4. **NO cambiar el rol** (cancelar el modal)

---

### TEST 5: Toggle GPS
**Botón**: "📍 Restringir GPS" o "🌍 Permitir fuera de área"

1. Anotar valor ACTUAL mostrado en pantalla: _______________________
2. Click en el botón GPS
3. ¿Aparece confirmación? → **Anotar: SÍ / NO**
4. Confirmar el cambio
5. ¿Aparece mensaje de éxito? → **Anotar: SÍ / NO**
6. ¿Se cierra y reabre el modal automáticamente? → **Anotar: SÍ / NO**
7. ¿El valor GPS cambió en pantalla? → **Anotar: SÍ / NO**
8. **Valor NUEVO mostrado**: _______________________

---

### TEST 6: Toggle Estado (Activar/Desactivar)
**Botón**: "✅ Activar Usuario" o "🔒 Desactivar"

1. Anotar valor ACTUAL mostrado: _______________________
2. Click en el botón Estado
3. ¿Aparece confirmación? → **Anotar: SÍ / NO**
4. Confirmar el cambio
5. ¿Aparece mensaje de éxito? → **Anotar: SÍ / NO**
6. ¿Se cierra y reabre el modal automáticamente? → **Anotar: SÍ / NO**
7. ¿El valor Estado cambió en pantalla? → **Anotar: SÍ / NO**
8. **Valor NUEVO mostrado**: _______________________

---

## 🔄 TEST DE PERSISTENCIA

### Paso 1: Cerrar sistema
1. Cerrar el modal del usuario
2. Hacer logout o cerrar el navegador completamente

### Paso 2: Esperar 5 segundos

### Paso 3: Reabrir sistema
1. Abrir navegador nuevamente
2. Login con las mismas credenciales
3. Ir a **Gestión de Usuarios**
4. Click en **Ver** del **MISMO usuario** que modificamos
5. Ir al TAB **Administración**

### Paso 4: Verificar valores

| Campo | Valor ANTES del cambio | Valor DESPUÉS del cambio | Valor AL REABRIR | ¿Persistió? |
|-------|------------------------|--------------------------|------------------|-------------|
| Cargo | _________________ | CARGO TEST | _________________ | ☐ SÍ ☐ NO |
| Departamento | _________________ | _________________ | _________________ | ☐ SÍ ☐ NO |
| Sucursal | _________________ | _________________ | _________________ | ☐ SÍ ☐ NO |
| GPS | _________________ | _________________ | _________________ | ☐ SÍ ☐ NO |
| Estado | _________________ | _________________ | _________________ | ☐ SÍ ☐ NO |

---

## 📊 RESUMEN DE RESULTADOS

### Funcionalidad de Botones
- ✅ = Funciona correctamente
- ⚠️ = Funciona parcialmente
- ❌ = No funciona

| Botón/Campo | Estado | Observaciones |
|-------------|--------|---------------|
| Editar Posición | ☐ ✅ ☐ ⚠️ ☐ ❌ | _________________________ |
| Cambiar Departamento | ☐ ✅ ☐ ⚠️ ☐ ❌ | _________________________ |
| Gestionar Sucursales | ☐ ✅ ☐ ⚠️ ☐ ❌ | _________________________ |
| Cambiar Rol | ☐ ✅ ☐ ⚠️ ☐ ❌ | _________________________ |
| Toggle GPS | ☐ ✅ ☐ ⚠️ ☐ ❌ | _________________________ |
| Toggle Estado | ☐ ✅ ☐ ⚠️ ☐ ❌ | _________________________ |

### Dropdowns con Datos Reales
- Departamentos: ☐ Carga datos reales ☐ Vacío ☐ Error
- Sucursales: ☐ Carga datos reales ☐ Vacío ☐ Error
- Roles: ☐ Carga datos reales ☐ Vacío ☐ Error

### Persistencia
- Total de cambios realizados: _____
- Total de cambios que persistieron: _____
- **Tasa de éxito**: _____%

---

## 🐛 PROBLEMAS ENCONTRADOS

### Problema 1:
- **Botón/Campo**: _______________________
- **Error observado**: _______________________
- **Mensaje de error (si hay)**: _______________________
- **Screenshot**: (tomar F12 console si hay error)

### Problema 2:
- **Botón/Campo**: _______________________
- **Error observado**: _______________________
- **Mensaje de error (si hay)**: _______________________

### Problema 3:
- **Botón/Campo**: _______________________
- **Error observado**: _______________________
- **Mensaje de error (si hay)**: _______________________

---

## 📸 EVIDENCIA

**Screenshots recomendados**:
1. TAB 1 con valores originales (antes de modificar)
2. Modal de Cambiar Departamento (con opciones visibles)
3. Modal de Gestionar Sucursales (con opciones visibles)
4. TAB 1 después de modificar todos los campos
5. TAB 1 después de reabrir sistema (verificación de persistencia)
6. Consola F12 si hay algún error

---

**IMPORTANTE**: Abrir la consola del navegador (F12) ANTES de empezar y dejarla abierta durante todo el test. Si algo falla, copiar los errores que aparezcan.

---

**Fecha del test**: _______________________
**Testeado por**: _______________________
**Navegador**: _______________________
