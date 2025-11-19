# 🧪 GUÍA DE TEST DE PERSISTENCIA MANUAL - TAB 1 ADMINISTRACIÓN

**Objetivo**: Verificar que TODOS los campos del TAB 1 persisten correctamente después de guardar cambios.

**Duración estimada**: 10-15 minutos

---

## 📋 PREPARACIÓN

### 1. Abrir el navegador
- URL: http://localhost:9998/panel-empresa.html
- Navegador: Chrome/Edge (recomendado)

### 2. Login
- **Empresa**: ISI
- **Usuario**: soporte
- **Password**: admin123

---

## 🎯 FASE 1: CAPTURAR VALORES ORIGINALES

### Paso 1: Navegar al módulo de Usuarios
1. En el panel principal, buscar y hacer click en **"Gestión de Usuarios"**
2. Esperar a que cargue la tabla de usuarios

### Paso 2: Abrir modal de un usuario
1. Hacer click en el botón **"Ver"** (👁️) del **primer usuario** de la tabla
2. Esperar a que se abra el modal "Expediente del Empleado"

### Paso 3: Ir al TAB 1 "Administración"
1. Hacer click en la pestaña **"Administración"** (debe estar activa por defecto)
2. Capturar los valores actuales:

#### 📝 Valores Originales - Completar esta tabla:

| Campo | Valor Original | ✅ |
|-------|----------------|-----|
| **Rol** | _________________________ | ☐ |
| **Estado** | _________________________ | ☐ |
| **GPS** | _________________________ | ☐ |
| **Departamento** | _________________________ | ☐ |
| **Cargo** | _________________________ | ☐ |
| **Sucursal** | _________________________ | ☐ |
| **Turno** | _________________________ | ☐ |

**IMPORTANTE**: Tomar screenshot o anotar estos valores - los necesitaremos después.

---

## ✏️ FASE 2: MODIFICAR TODOS LOS CAMPOS

### 1. Cambiar ESTADO (Activar/Desactivar)

**Instrucciones**:
1. Buscar el botón que dice **"Activar Usuario"** o **"Desactivar Usuario"**
2. Hacer click en el botón
3. **Confirmar** el diálogo que aparece
4. **ESPERAR** 3-5 segundos a que se recargue el modal
5. El modal se cierra y reabre automáticamente

**Valor modificado**: ✅ (marcar cuando esté listo)

---

### 2. Cambiar GPS

**Instrucciones**:
1. Buscar el botón que dice **"Permitir fuera de área"** o **"Restringir a área"**
2. Hacer click en el botón
3. **Confirmar** el diálogo
4. **ESPERAR** 3-5 segundos a que se recargue el modal

**Valor modificado**: ✅ (marcar cuando esté listo)

---

### 3. Cambiar DEPARTAMENTO

**Instrucciones**:
1. Hacer click en el botón **"Cambiar Departamento"**
2. En el modal que se abre, seleccionar un **departamento DIFERENTE** al actual
3. Hacer click en **"Guardar"**
4. **ESPERAR** a que se cierre el modal secundario
5. Verificar que el departamento cambió en el TAB 1

**Departamento nuevo**: _________________________ ✅

---

### 4. Cambiar CARGO

**Instrucciones**:
1. Hacer click en el botón **"Editar Cargo"** o **"✏️"** al lado de "Cargo"
2. En el campo de texto, escribir: **"CARGO TEST PERSISTENCIA"**
3. Hacer click en **"Guardar"**
4. Verificar que el cargo cambió

**Cargo nuevo**: CARGO TEST PERSISTENCIA ✅

---

### 5. Cambiar SUCURSAL (si está disponible)

**Instrucciones**:
1. Hacer click en **"Configurar Sucursales"**
2. Seleccionar una sucursal diferente (o marcar "CENTRAL" si no hay ninguna)
3. Hacer click en **"Guardar"**
4. Cerrar el modal secundario

**Sucursal nueva**: _________________________ ✅

---

### 6. Cambiar TURNO (si está disponible)

**Instrucciones**:
1. Hacer click en **"Asignar Turno"**
2. Seleccionar un turno diferente al actual
3. Hacer click en **"Guardar"**
4. Cerrar el modal secundario

**Turno nuevo**: _________________________ ✅

---

### 7. Cambiar ROL (OPCIONAL - solo si quieres probarlo)

**Instrucciones**:
1. Hacer click en **"Cambiar Rol"**
2. Seleccionar un rol diferente
3. Hacer click en **"Guardar"**

**Rol nuevo**: _________________________ ✅

---

## 💾 FASE 3: VERIFICAR QUE LOS CAMBIOS SE VEN

**Antes de cerrar**:
1. Revisar que TODOS los campos modificados muestren los valores NUEVOS en el TAB 1
2. Tomar screenshot de la pantalla
3. Si algún campo NO cambió, anotarlo aquí:

**Campos que NO cambiaron**:
- _______________________________________________
- _______________________________________________

---

## 🔄 FASE 4: CERRAR Y REABRIR SISTEMA

### Paso 1: Cerrar modal
1. Hacer click en la **X** o en **"Cerrar"** para cerrar el modal

### Paso 2: Cerrar sesión
1. Hacer click en el botón de **Logout** o **"Cerrar Sesión"**
2. Alternativamente, cerrar completamente el navegador

### Paso 3: Esperar 5 segundos
- ⏰ 1... 2... 3... 4... 5...

### Paso 4: Reabrir sistema
1. Abrir navegador nuevamente
2. Ir a: http://localhost:9998/panel-empresa.html
3. Hacer login con las mismas credenciales:
   - Empresa: **ISI**
   - Usuario: **soporte**
   - Password: **admin123**

---

## ✅ FASE 5: VERIFICAR PERSISTENCIA

### Paso 1: Volver al mismo usuario
1. Click en **"Gestión de Usuarios"**
2. Buscar el **MISMO USUARIO** que modificamos antes
3. Click en **"Ver"** (👁️)

### Paso 2: Ir al TAB 1
1. Click en pestaña **"Administración"**

### Paso 3: Comparar valores

#### 📊 Tabla de Verificación de Persistencia:

| Campo | Valor Original | Valor Nuevo Esperado | Valor Después de Reabrir | ✅ Persistió |
|-------|----------------|---------------------|-------------------------|--------------|
| **Rol** | ______________ | _________________ | _____________________ | ☐ |
| **Estado** | ______________ | _________________ | _____________________ | ☐ |
| **GPS** | ______________ | _________________ | _____________________ | ☐ |
| **Departamento** | ______________ | _________________ | _____________________ | ☐ |
| **Cargo** | ______________ | CARGO TEST PERSISTENCIA | _____________________ | ☐ |
| **Sucursal** | ______________ | _________________ | _____________________ | ☐ |
| **Turno** | ______________ | _________________ | _____________________ | ☐ |

---

## 📊 RESULTADOS

### Resumen:
- **Total de campos modificados**: _______
- **Total de campos que persistieron**: _______
- **Tasa de éxito**: _______%

### Campos que NO persistieron (si hay alguno):
1. _______________________________________________
   - Valor esperado: _________________________________
   - Valor obtenido: _________________________________

2. _______________________________________________
   - Valor esperado: _________________________________
   - Valor obtenido: _________________________________

---

## 🎯 CONCLUSIÓN

### Si TODOS los campos persistieron:
✅ **TAB 1 ADMINISTRACIÓN - PERSISTENCIA 100% FUNCIONAL**

El TAB 1 está guardando correctamente todos los cambios y los datos persisten después de cerrar y reabrir el sistema.

### Si algún campo NO persistió:
⚠️ **BUG DETECTADO EN PERSISTENCIA**

Reportar los campos que no persistieron y sus valores para investigación adicional.

---

## 📸 EVIDENCIA

**Screenshots recomendados**:
1. ✅ TAB 1 con valores ORIGINALES (antes de modificar)
2. ✅ TAB 1 con valores MODIFICADOS (después de guardar)
3. ✅ TAB 1 con valores después de REABRIR (verificación de persistencia)

---

**Fecha de test**: _______________________
**Testeado por**: _______________________
**Navegador**: _______________________
**Resultado**: ☐ Éxito   ☐ Con errores

---

**Generado por**: Claude Code
**Versión**: 1.0
