# 📋 CONFIGURACIONES DE TESTING E2E - ESTADO ACTUAL

**Fecha**: 2025-01-22
**Sistema**: Universal E2E Testing System V2

---

## ✅ MÓDULOS CON CONFIGURACIÓN COMPLETA

### 🏢 Panel Empresa - Módulos CORE (5/7 completados)

| Módulo | Config | Tabs | Campos | Base de Datos | SSOT Map | Dependencies | Chaos | Brain |
|--------|--------|------|--------|---------------|----------|--------------|-------|-------|
| **Gestión de Usuarios** | ✅ `users.config.js` | 10 tabs | 45+ campos | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Departamentos** | ✅ `departments.config.js` | 2 tabs | 11 campos | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Asistencias** | ✅ `attendance.config.js` | 3 tabs | 16 campos | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Turnos** | ✅ `shifts.config.js` | 4 tabs | 18 campos | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Visitantes** | ✅ `visitors.config.js` | 4 tabs | 25 campos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notificaciones | ⏳ Pendiente | - | - | - | - | - | - | - |
| Configuración | ⏳ Pendiente | - | - | - | - | - | - | - |

**Progress**: 71% (5 de 7 módulos CORE completados)

---

## 📊 ESTADÍSTICAS GENERALES

### Por Categoría

| Categoría | Total Módulos | Con Config | Sin Config | Progress |
|-----------|---------------|------------|------------|----------|
| 📊 Panel Administrativo | 4 | 0 | 4 | 0% |
| 🏢 Panel Empresa - CORE | 7 | 5 | 2 | **71%** ⭐ |
| 💎 Panel Empresa - PREMIUM | 8 | 0 | 8 | 0% |
| 🤝 Panel Asociados | 2 | 0 | 2 | 0% |
| 🌐 Marketplace Externo | 2 | 0 | 2 | 0% |
| 📱 APKs Móviles | 4 | 0 | 4 | 0% |
| **TOTAL** | **37** | **5** | **32** | **13.5%** |

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

### Prioridad 1: COMPLETAR CORE (2 módulos restantes)

1. **`notifications.config.js`** (~60 líneas, 30 min)
   - 2 tabs esperados: "Notificación", "Destinatarios"
   - 8-10 campos estimados
   - Database: tabla `notifications`

2. **`settings.config.js`** (~50 líneas, 25 min)
   - 1-2 tabs esperados: "General", "Avanzado"
   - 6-8 campos estimados
   - Database: tabla `company_settings`

**Resultado**: 100% de módulos CORE testeables

---

### Prioridad 2: MÓDULOS PREMIUM MÁS USADOS (3 módulos)

3. **`payroll.config.js`** (~150 líneas, 2 horas)
   - Módulo complejo con muchos tabs y campos calculados
   - Database: múltiples tablas relacionadas
   - Alta prioridad comercial

4. **`hour-bank.config.js`** (~80 líneas, 1 hora)
   - 3-4 tabs esperados
   - Database: tabla `hour_bank`

5. **`vacation-management.config.js`** (~70 líneas, 45 min)
   - 2-3 tabs esperados
   - Database: tabla `vacations`

**Resultado**: Cobertura de módulos premium más críticos

---

### Prioridad 3: MÓDULOS MÉDICOS (2 módulos)

6. **`medical-dashboard.config.js`** (~100 líneas, 1.5 horas)
   - Módulo especializado con muchos campos médicos
   - Database: múltiples tablas médicas

7. **`psychological-assessment.config.js`** (~80 líneas, 1 hora)
   - Tests psicológicos y evaluaciones
   - Database: tabla `psychological_assessments`

---

## 📝 ESTRUCTURA DE UN CONFIG

Cada archivo de configuración sigue este patrón (~80 líneas promedio):

```javascript
module.exports = {
  // IDENTIFICACIÓN
  moduleKey: 'module-name',
  moduleName: 'Nombre del Módulo',
  category: 'panel-empresa-core',

  // NAVEGACIÓN
  baseUrl: 'http://localhost:9998/panel-empresa.html#module',
  navigation: { /* selectores */ },

  // TABS Y CAMPOS (lo más extenso)
  tabs: [
    {
      key: 'tab1',
      label: 'Tab 1',
      fields: [
        {
          name: 'field1',
          selector: '#field1',
          type: 'text',
          required: true,
          validations: { /* ... */ },
          testValues: {
            valid: [/* ... */],
            invalid: [/* ... */]
          }
        }
      ]
    }
  ],

  // BASE DE DATOS
  database: {
    table: 'table_name',
    primaryKey: 'id',
    testDataFactory: async (db) => { /* create */ },
    testDataCleanup: async (db, id) => { /* delete */ }
  },

  // SSOT MAP
  ssotMap: { /* field sources */ },

  // DEPENDENCIAS CONOCIDAS
  knownDependencies: [/* triggers and effects */],

  // CHAOS CONFIG
  chaosConfig: {
    enabled: true,
    monkeyTest: { duration: 15000 },
    fuzzing: { enabled: true },
    raceConditions: { enabled: true }
  },

  // BRAIN INTEGRATION
  brainIntegration: {
    enabled: true,
    expectedIssues: [/* known issues */]
  }
};
```

---

## 🚀 CÓMO AGREGAR UN NUEVO CONFIG

### Paso 1: Crear el archivo
```bash
cd backend/tests/e2e/configs
touch module-name.config.js
```

### Paso 2: Copiar template de un config existente
```bash
# Usar users.config.js como base para módulos complejos
# Usar departments.config.js como base para módulos simples
cp users.config.js new-module.config.js
```

### Paso 3: Adaptar el config
1. Cambiar `moduleKey`, `moduleName`, `category`
2. Definir `tabs` y sus `fields`
3. Configurar `database.table` y factories
4. Mapear `ssotMap` según campos
5. Definir `knownDependencies` si existen
6. Agregar `expectedIssues` del Brain si se conocen

### Paso 4: Actualizar registry
```json
// En modules-registry.json, cambiar:
{
  "key": "new-module",
  "name": "Nuevo Módulo",
  "hasConfig": true,  // ← cambiar de false a true
  "estimatedTime": "60s"
}
```

### Paso 5: Probar el config
```bash
# Backend debe estar corriendo en puerto 9998
cd backend

# Ejecutar test para el nuevo módulo
MODULE_TO_TEST=new-module npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js
```

---

## 🧠 INTEGRACIÓN CON BRAIN

Todos los configs tienen `brainIntegration.enabled: true`. Esto significa:

1. **PRE-TEST**: El test consulta Brain para ver problemas detectados en el módulo
2. **TESTING**: Ejecuta todos los tests (CRUD, Chaos, Dependencies, SSOT)
3. **POST-TEST**: Compara resultados vs problemas detectados por Brain
4. **VERIFICATION**: Reporta qué problemas se arreglaron y cuáles siguen pendientes

**Ejemplo de output**:
```
🧠 BRAIN VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Brain detectó 5 problemas en módulo "users"

✅ ARREGLADOS (3):
  - users_validation_email_missing
  - users_modal_tabs_not_persist
  - users_list_filter_broken

⏳ PENDIENTES (2):
  - users_performance_slow_query
  - users_password_reset_bug

🔄 Sugerencia: Ejecutar nuevamente el test para intentar arreglar los 2 pendientes
```

---

## 📈 MÉTRICAS DE CALIDAD

Cada config debe incluir:

- ✅ **Mínimo 2 tabs** (mayoría tiene 3-4)
- ✅ **Mínimo 5 campos por tab**
- ✅ **Test values**: valid + invalid para cada campo
- ✅ **Validations**: regex, min, max según tipo
- ✅ **SSOT Map**: mapeo completo de fuentes de datos
- ✅ **Dependencies**: al menos 1-2 dependencias conocidas
- ✅ **Chaos enabled**: monkey + fuzzing + race conditions
- ✅ **Brain integration**: con lista de expected issues

---

## 🎓 LECCIONES APRENDIDAS

### ✅ LO QUE FUNCIONA BIEN

1. **Template-driven approach**: Copiar de users.config.js ahorra tiempo
2. **Test values explícitos**: Tener valid/invalid predefinidos mejora cobertura
3. **SSOT Map detallado**: Facilita debug de discrepancias UI vs DB
4. **Brain integration**: Cierre de feedback loop es CRÍTICO
5. **Chaos testing**: Encuentra bugs que testing manual nunca detectaría

### ⚠️ PUNTOS DE ATENCIÓN

1. **Campos calculados**: Marcar con `calculated: true` para no fuzzearlos
2. **Foreign keys**: Verificar que existan datos relacionados antes de testear
3. **Tabs dinámicos**: Algunos módulos tienen tabs que aparecen condicionalmente
4. **Selectores frágiles**: Preferir IDs sobre clases CSS

---

## 🔗 ARCHIVOS RELACIONADOS

- **Test Universal**: `backend/tests/e2e/modules/universal-modal-advanced.e2e.spec.js`
- **Registry**: `backend/tests/e2e/configs/modules-registry.json`
- **Backend API**: `backend/src/routes/testingRoutes.js`
- **Frontend UI**: `backend/public/js/modules/e2e-testing-control-v2.js`
- **Documentación**: `backend/docs/E2E-TESTING-UNIVERSAL-COMPLETE.md`

---

## 📞 SOPORTE

Si tienes dudas sobre cómo crear un config:

1. **Ver ejemplos**: Lee `users.config.js` (complejo) o `departments.config.js` (simple)
2. **Documentación**: Lee `E2E-TESTING-UNIVERSAL-COMPLETE.md`
3. **Brain**: Pregunta al asistente IA del sistema (integrado en panel-empresa)

---

**Última actualización**: 2025-01-22 (Sesión de implementación V2)
