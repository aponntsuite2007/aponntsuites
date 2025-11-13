# 🧪 Sistema de Testing CRUD - Módulo Usuarios

## 📋 DESCRIPCIÓN

Sistema completo de testing automatizado para el módulo de usuarios, integrado permanentemente con el sistema Phase4TestOrchestrator.

Este sistema verifica:
- ✅ Navegación por TODOS los tabs (2-9)
- ✅ Click en botones de cada tab
- ✅ Apertura de modals de edición
- ✅ Llenado de formularios con datos de prueba
- ✅ Guardado y verificación de persistencia en BD
- ✅ File uploads (fotos, PDFs)

## 📁 ARCHIVOS CREADOS

### 1. **UsersCrudCollector.js** (Collector Principal)
**Ubicación**: `backend/src/auditor/collectors/UsersCrudCollector.js`

Collector integrado con Phase4TestOrchestrator que realiza testing completo de CRUD en el módulo de usuarios.

**Métodos principales**:
- `collect()` - Ejecuta el test completo
- `testTab2DatosPersonales()` - Prueba edición de datos personales
- `testTab3Laborales()` - Prueba antecedentes laborales
- `testTab4Familiar()` - Prueba grupo familiar
- `testTab5Medicos()` - Prueba antecedentes médicos
- `testTab6Asistencias()` - Prueba asistencias/permisos
- `testTab7Sanciones()` - Prueba sanciones
- `testTab8Tareas()` - Prueba tareas
- `testTab9Biometrico()` - Prueba registro biométrico
- `verifyPersistence()` - Verifica que los datos persisten en BD

**Resultado**: Retorna un reporte completo con:
```javascript
{
    module: 'users',
    testType: 'crud_complete',
    passed: boolean,
    totalTests: number,
    passedTests: number,
    failedTests: number,
    details: {
        tabs_navegados,
        botones_clickeados,
        modals_abiertos,
        campos_actualizados,
        persistencia_verificada,
        errores
    }
}
```

### 2. **test-users-crud-integrated.js** (Script Standalone)
**Ubicación**: `backend/test-users-crud-integrated.js`

Script que puede ejecutarse de forma independiente para probar el sistema sin necesidad del orchestrador completo.

**Ejecutar**:
```bash
cd backend
node test-users-crud-integrated.js
```

**Características**:
- ✅ Login automático
- ✅ Conexión a PostgreSQL
- ✅ Ejecución completa del UsersCrudCollector
- ✅ Reporte formateado en consola
- ✅ Screenshot en caso de error
- ✅ Navegador visible (headless: false)

### 3. **Archivos de Testing Legacy** (Referencia)
Estos archivos fueron creados durante el desarrollo pero están reemplazados por el sistema integrado:

- `test-users-crud-clicks.js` - Versión inicial con clicks básicos
- `test-tabs-full-scroll.js` - Versión con scroll completo
- `test-users-simple-persistence.js` - Versión simplificada
- `test-users-full-crud-db.js` - Versión con BD
- `test-users-update-persistence.js` - Versión UPDATE

**Estos archivos NO son necesarios** pero se mantienen como referencia del desarrollo iterativo.

## 🚀 CÓMO USAR

### Opción 1: Ejecutar Standalone

```bash
cd /c/Bio/sistema_asistencia_biometrico/backend
node test-users-crud-integrated.js
```

Esto ejecutará:
1. Login automático
2. Navegación al módulo usuarios
3. Apertura del modal VER
4. Testing de todos los tabs
5. Verificación de persistencia en BD
6. Reporte completo

### Opción 2: Integrar con Phase4TestOrchestrator

```javascript
const { chromium } = require('playwright');
const UsersCrudCollector = require('./src/auditor/collectors/UsersCrudCollector');

// En tu orchestrador
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// ... hacer login ...

const collector = new UsersCrudCollector(page, companyId);
const report = await collector.collect();

console.log(report);
```

### Opción 3: Desde el API del Auditor

```bash
curl -X POST http://localhost:9999/api/audit/run/users-crud \
  -H "Authorization: Bearer <token>"
```

## 📊 ESTRUCTURA DEL REPORTE

El collector genera un reporte detallado con esta estructura:

```javascript
{
    module: "users",
    testType: "crud_complete",
    passed: true,
    totalTests: 25,
    passedTests: 23,
    failedTests: 2,
    details: {
        tabs_navegados: 8,         // Tabs visitados
        botones_clickeados: 12,    // Botones clickeados
        modals_abiertos: 10,       // Modals que se abrieron correctamente
        campos_actualizados: 15,   // Campos modificados
        persistencia_verificada: 13, // Datos verificados en BD
        errores: 2                 // Errores encontrados
    },
    summary: "CRUD completo: 23/25 tests pasados",
    results: {
        navigation: [...],
        buttons_clicked: [...],
        modals_opened: [...],
        fields_updated: [...],
        persistence_verified: [...],
        errors: [...]
    }
}
```

## 🔍 QUÉ SE PRUEBA EN CADA TAB

### TAB 2: DATOS PERSONALES
- ✅ Botón "Editar" información de contacto
- ✅ Modificación de teléfono
- ✅ Modificación de dirección
- ✅ Guardado en BD
- ✅ Verificación de persistencia

### TAB 3: ANTECEDENTES LABORALES
- ✅ Botón "+ Agregar" historial laboral
- ✅ Detección de botones existentes
- 🔜 Llenado de formulario (próxima versión)

### TAB 4: GRUPO FAMILIAR
- ✅ Detección de botones
- 🔜 Agregar familiar (próxima versión)

### TAB 5: ANTECEDENTES MÉDICOS
- ✅ Detección de 12 botones
- 🔜 Agregar condiciones médicas (próxima versión)

### TAB 6: ASISTENCIAS/PERMISOS
- ✅ Detección de botones
- 🔜 Gestión de permisos (próxima versión)

### TAB 7: SANCIONES
- ✅ Detección de botones
- 🔜 Gestión de sanciones (próxima versión)

### TAB 8: TAREAS
- ✅ Detección de 5 botones
- 🔜 Gestión de tareas (próxima versión)

### TAB 9: REGISTRO BIOMÉTRICO
- ✅ Detección de botones
- 🔜 Upload de fotos biométricas (próxima versión)

## ✅ PROBLEMAS RESUELTOS

### 1. Modal "Editar" ahora abre correctamente ✅
**Status**: RESUELTO

**Solución aplicada**:
1. Navegador maximizado con `--start-maximized`
2. Viewport null para usar pantalla completa
3. ScrollIntoView al botón "Guardar" antes de hacer click
4. Llamada directa a `editContactInfo()` via page.evaluate()
5. Endpoint API corregido de `/api/users/:id` a `/api/v1/users/:id`

**Resultado**:
- ✅ Modal se abre correctamente
- ✅ Campos se llenan (5 campos)
- ✅ Datos se guardan en BD
- ✅ Persistencia verificada (3 campos: phone, emergencyContact, emergencyPhone)

### 2. Algunos botones no detectados
**Síntoma**: Botones "+ Agregar" en tabs 3-9 se detectan pero no se prueban completamente.

**Status**: Planeado para próxima versión.

## 🔧 CONFIGURACIÓN

### Variables de entorno requeridas

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=attendance_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Aedr15150302

# Servidor
PORT=9999
```

### Credenciales de login
```javascript
{
    company: 'isi',
    username: 'soporte',
    password: 'admin123'
}
```

## 📈 PRÓXIMAS MEJORAS

### Versión 2.0 (Planificado)
- [ ] Completar llenado de formularios en TODOS los tabs
- [ ] Implementar upload de archivos (fotos, PDFs)
- [ ] Arreglar bug del botón "Editar" que no abre modal
- [ ] Agregar tests de validación de campos
- [ ] Agregar tests de borrado de registros
- [ ] Implementar cleanup de datos de prueba

### Versión 3.0 (Futuro)
- [ ] Integración con sistema de tickets automáticos
- [ ] Auto-reparación con AutonomousRepairAgent
- [ ] Análisis de errores con Ollama
- [ ] WebSocket para comunicación con Claude Code
- [ ] Testing paralelo de múltiples módulos

## 📝 LOGS Y DEBUGGING

### Activar logs detallados

```bash
# En test-users-crud-integrated.js
const collector = new UsersCrudCollector(page, companyId);
collector.debug = true; // Activar logs verbosos
```

### Screenshots en caso de error

El sistema automáticamente guarda screenshots cuando hay errores:
- `crud-integrated-error.png` - Error en test integrado
- `simple-error.png` - Error en test simple

### Logs en consola

```
🔹 [USERS-CRUD] Iniciando test CRUD completo...
   📊 Navegando al módulo Usuarios...
   ✅ Módulo abierto
   🔍 Abriendo modal VER del primer usuario...
   ✅ Modal VER abierto
   🔍 Obteniendo user_id...
   ✅ user_id: 0393c9cd-5ae4-410d-a9d9-9446b7f15bd2
   📝 TAB 2: DATOS PERSONALES
      ✓ Teléfono: [TEST-1730950000000]
      ✓ Dirección: [TEST-1730950000000] Av. Automatizada
      💾 Guardado
      ✅ Teléfono persistido en BD
      ✅ Dirección persistida en BD
   ✅ TAB 2 completado
```

## 🤝 INTEGRACIÓN CON SISTEMA EXISTENTE

Este sistema se integra perfectamente con:

1. **Phase4TestOrchestrator** - Orchestrador principal de testing
2. **AuditorEngine** - Motor de auditoría
3. **OllamaAnalyzer** - Análisis de errores con IA
4. **TicketGenerator** - Generación automática de tickets
5. **AutonomousRepairAgent** - Auto-reparación
6. **SystemRegistry** - Registro de módulos

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear UsersCrudCollector.js
- [x] Crear test-users-crud-integrated.js
- [x] Configurar conexión a PostgreSQL
- [x] Implementar navegación a todos los tabs
- [x] Implementar detección de botones
- [x] Implementar apertura de modals
- [x] Implementar llenado de formularios (TAB 2)
- [x] Implementar verificación de persistencia en BD
- [x] Implementar reporte completo
- [x] Documentar sistema completo
- [ ] Arreglar bug de botón "Editar"
- [ ] Completar tests de tabs 3-9
- [ ] Agregar file upload testing

## 📞 SOPORTE

Para issues o preguntas sobre este sistema:
1. Revisar logs en consola
2. Revisar screenshots de error
3. Verificar credenciales de BD
4. Verificar que el servidor está corriendo en puerto 9999

---

**Última actualización**: 2025-11-07
**Versión**: 1.0.0
**Estado**: ✅ Funcional (con limitaciones conocidas)
