# 🧪 Sistema Unificado de Testing E2E

## 🎯 Visión General

**UN SOLO SISTEMA** que simula **UN HUMANO PROBANDO CADA RINCÓN** de tu aplicación:

✅ **Interacción UI Real** - Click, llenar forms, modals, tabs (como un humano)
✅ **Verificación en BD** - Cada acción se valida contra PostgreSQL
✅ **Performance** - Métricas de tiempo, memoria, API response
✅ **Screenshots/Videos** - Captura automática en cada paso
✅ **CI/CD** - GitHub Actions ejecuta tests en cada push
✅ **Reportes Unificados** - Dashboard único con todas las métricas

---

## 📁 Estructura del Sistema

```
backend/
├── tests/
│   ├── e2e/
│   │   ├── helpers/                    ← 🔧 HELPERS REUTILIZABLES
│   │   │   ├── auth.helper.js          Login automático
│   │   │   ├── db.helper.js            Queries BD (CRUD, verificación)
│   │   │   ├── ui.helper.js            Click, forms, modals, navegación
│   │   │   └── performance.helper.js   Métricas de tiempo/memoria
│   │   │
│   │   └── modules/                    ← 🧪 TESTS POR MÓDULO
│   │       ├── users.e2e.spec.js           CRUD básico + performance
│   │       └── users-modal-complete.e2e.spec.js  ← 10 SOLAPAS COMPLETAS
│   │
│   └── fixtures/                       ← 📦 Datos de prueba
│
├── playwright.config.js                ← ⚙️ Config unificada
│
├── test-results/                       ← 📸 Screenshots automáticos
│   ├── modal-00-users-list.png
│   ├── modal-01-opened.png
│   ├── modal-02-tab-admin.png
│   ├── modal-03-tab-personal.png
│   └── ...
│
└── playwright-report/                  ← 📊 Reportes HTML
    └── index.html
```

---

## 🎬 ¿Qué Hace el Sistema?

### 1️⃣ **Test Básico** (`users.e2e.spec.js`)

```
✅ LOGIN - Autenticación real
✅ CREATE - Crear usuario desde modal UI
✅ READ - Verificar en BD
✅ F5 - Persistencia después de reload
✅ UPDATE - Modificar usuario
✅ DELETE - Eliminar usuario
✅ PERFORMANCE - API endpoints (< 500ms)
✅ VALIDACIONES - Formulario vacío
```

**Duración**: ~2 minutos
**Screenshots**: 13 capturas automáticas

---

### 2️⃣ **Test Modal Completo** (`users-modal-complete.e2e.spec.js`)

**Recorre las 10 SOLAPAS del modal "Ver Usuario"** como un humano:

```
TEST 0: SETUP
   └─ Crear usuario de prueba en BD

TEST 1: Abrir modal Ver Usuario
   └─ Click en botón "Ver"
   └─ Screenshot del modal abierto

TEST 2: ⚙️ Tab Administración
   ├─ Click en tab
   ├─ Llenar 3 campos de ejemplo
   ├─ Guardar cambios
   ├─ Screenshot (antes/después)
   ├─ Medir tiempo de carga
   └─ Medir memoria

TEST 3: 👤 Tab Datos Personales
   ├─ Click en tab
   ├─ Llenar campos (nombre, email, DNI, etc.)
   ├─ Guardar
   ├─ Screenshot
   ├─ Verificar en BD (tabla users)
   └─ Performance

TEST 4: 💼 Tab Antecedentes Laborales
   ├─ Click en tab
   ├─ Llenar historial laboral
   ├─ Guardar
   ├─ Screenshot
   ├─ Verificar en BD (tabla user_work_history)
   └─ Performance

TEST 5: 👨‍👩‍👧‍👦 Tab Grupo Familiar
   ├─ Click en tab
   ├─ Agregar familiar
   ├─ Guardar
   ├─ Screenshot
   ├─ Verificar en BD (tabla user_family_members)
   └─ Performance

TEST 6: 🏥 Tab Antecedentes Médicos
   ├─ Click en tab
   ├─ Agregar registro médico
   ├─ Guardar
   ├─ Screenshot
   ├─ Verificar en BD (tabla user_medical_documents)
   └─ Performance

TEST 7: 📅 Tab Asistencias/Permisos
TEST 8: 📆 Tab Calendario
TEST 9: ⚖️ Tab Disciplinarios
TEST 10: 📸 Tab Registro Biométrico
TEST 11: 🔔 Tab Notificaciones

TEST 12: VERIFICACIÓN FINAL
   ├─ Usuario persiste en BD
   ├─ Todos los datos relacionados persisten
   └─ Reporte de performance completo
```

**Duración**: ~8-10 minutos
**Screenshots**: **25+ capturas** (una por cada tab + filled)
**Performance Metrics**: 30+ métricas

---

## 📊 Reporte de Performance

Al finalizar los tests, se genera un reporte JSON:

```json
{
  "testName": "Users Modal Complete",
  "timestamp": "2025-12-22T22:00:00.000Z",
  "metrics": [
    { "action": "login", "duration": 4346 },
    { "action": "module-load-users", "duration": 1234 },
    { "action": "tab-click-admin", "duration": 87 },
    { "action": "tab-save-admin", "duration": 456 },
    { "action": "memory-tab-admin", "value": 12 },
    { "action": "tab-click-personal", "duration": 92 },
    { "action": "tab-save-personal", "duration": 423 },
    { "action": "memory-tab-personal", "value": 14 },
    ... // 30+ métricas
  ],
  "summary": {
    "totalDuration": 45678,
    "avgDuration": 456,
    "slowest": { "action": "tab-save-medical", "duration": 1234 },
    "fastest": { "action": "tab-click-calendar", "duration": 67 }
  }
}
```

**Umbrales validados**:
- ✅ Page Load < 3s
- ✅ API Response < 500ms
- ✅ Module Load < 2s
- ✅ Memory < 50MB
- ✅ Tab Click < 200ms

---

## 🚀 Cómo Ejecutar

### Ejecutar TODOS los tests

```bash
cd backend

# Tests completos con reporte HTML
npx playwright test

# Solo tests de users
npx playwright test users.e2e.spec.js

# Test de 10 solapas
npx playwright test users-modal-complete.e2e.spec.js

# Con UI visible (headful mode)
npx playwright test --headed

# Debug mode (paso a paso)
npx playwright test --debug
```

### Ver Reportes

```bash
# Abrir reporte HTML
npx playwright show-report

# Ver trace de un test específico
npx playwright show-trace test-results/[test-name]/trace.zip
```

---

## 🎨 Screenshots Generados

Cada test genera screenshots automáticos:

### Test Básico
```
01-after-login.png
02-before-create.png
03-modal-opened.png
04-form-filled.png
05-after-save.png
06-before-f5.png
07-after-f5.png
08-before-update.png
09-after-update.png
10-before-delete.png
11-after-delete.png
12-modal-empty.png
13-validation-error.png
```

### Test Modal Completo
```
modal-00-users-list.png
modal-01-opened.png
modal-02-tab-admin.png
modal-02-tab-admin-filled.png
modal-03-tab-personal.png
modal-03-tab-personal-filled.png
modal-04-tab-work.png
modal-04-tab-work-filled.png
modal-05-tab-family.png
modal-05-tab-family-filled.png
modal-06-tab-medical.png
modal-06-tab-medical-filled.png
modal-07-tab-attendance.png
modal-08-tab-calendar.png
modal-09-tab-disciplinary.png
modal-10-tab-biometric.png
modal-11-tab-notifications.png
```

**Total**: **25+ screenshots** capturados automáticamente

---

## 🤖 CI/CD - GitHub Actions

Archivo: `.github/workflows/e2e-tests.yml`

**Se ejecuta automáticamente en**:
- ✅ Cada `git push` a `master`/`main`
- ✅ Cada Pull Request
- ✅ Manualmente desde GitHub UI

**Qué hace**:
1. Levanta PostgreSQL en contenedor
2. Instala Node.js + dependencias
3. Ejecuta migraciones de BD
4. Inicia servidor backend
5. Ejecuta TODOS los tests Playwright
6. Genera reportes HTML
7. Sube screenshots/videos si algo falla
8. Comenta en el PR con resultados

**Si falla un test**:
- ❌ El PR se bloquea (no se puede mergear)
- 📧 Recibes notificación por email
- 📸 Screenshots disponibles en "Artifacts"
- 📹 Videos disponibles en "Artifacts"

---

## 📈 Métricas Medidas

| Categoría | Métrica | Umbral | Ejemplo |
|-----------|---------|--------|---------|
| **Page Load** | Tiempo de carga completa | < 3s | 2.1s ✅ |
| **API** | Response time | < 500ms | 234ms ✅ |
| **Module** | Tiempo de carga módulo | < 2s | 1.2s ✅ |
| **Tab** | Tiempo click tab | < 200ms | 87ms ✅ |
| **Save** | Tiempo guardar datos | < 1s | 456ms ✅ |
| **Memory** | Uso de heap JS | < 50MB | 14MB ✅ |
| **FCP** | First Contentful Paint | < 2s | 1.3s ✅ |

---

## 🎯 Próximos Módulos a Testear

Usando el MISMO sistema, podemos crear tests para:

```
tests/e2e/modules/
├── users.e2e.spec.js              ✅ HECHO
├── users-modal-complete.e2e.spec.js  ✅ HECHO
│
├── medical.e2e.spec.js            ⏳ PRÓXIMO
├── attendance.e2e.spec.js         ⏳ PRÓXIMO
├── kiosks.e2e.spec.js             ⏳ PRÓXIMO
├── job-postings.e2e.spec.js       ⏳ PRÓXIMO
├── payroll.e2e.spec.js            ⏳ PRÓXIMO
└── ... (27 módulos totales)
```

**Cada módulo** tendrá:
- CRUD completo desde UI
- Verificación en BD
- Performance metrics
- Screenshots automáticos
- Mismo sistema de helpers

---

## 🔧 Helpers Disponibles

### `auth.helper.js`

```javascript
// Login automático
const { token, user } = await authHelper.login(page);

// Logout
await authHelper.logout(page);

// Verificar sesión
const isLogged = await authHelper.isLoggedIn(page);
```

### `db.helper.js`

```javascript
// Crear usuario
const userId = await dbHelper.createTestUser(dbClient, { email: '...' });

// Obtener usuario
const user = await dbHelper.getUserByEmail(dbClient, 'test@demo.com');

// Actualizar
await dbHelper.updateUser(dbClient, userId, { firstName: 'Nuevo' });

// Eliminar
await dbHelper.deleteUser(dbClient, userId);

// Verificar existencia
const exists = await dbHelper.recordExists(dbClient, 'users', 'email', 'test@demo.com');
```

### `ui.helper.js`

```javascript
// Navegar a módulo
await uiHelper.navigateToModule(page, 'users');

// Abrir modal
await uiHelper.openAddModal(page, 'User');

// Llenar form
await uiHelper.fillUserForm(page, { name: '...', email: '...' });

// Guardar
await uiHelper.clickSaveButton(page);

// Screenshot
await uiHelper.takeScreenshot(page, 'paso-1');

// Esperar elemento
await uiHelper.waitForElementWithText(page, 'Usuario creado');
```

### `performance.helper.js`

```javascript
// Medir página
const metrics = await perfHelper.measurePageLoad(page, 'http://...');

// Medir API
const { responseTime } = await perfHelper.measureAPIResponse(page, 'GET', '/api/users');

// Medir acción
const { duration } = await perfHelper.measureAction(
  async () => await doSomething(),
  'Nombre de la acción'
);

// Validar umbrales
const validation = perfHelper.validateThresholds(metrics, {
  pageLoad: 3000,
  apiResponse: 500
});
```

---

## 🏆 Resumen

Este es el **ÚNICO SISTEMA DE TESTING** que necesitas:

✅ **100% integrado** - Helpers, tests, CI/CD, reportes
✅ **Simula humanos** - Cada test es como un QA manual
✅ **Verificación real** - Cada acción se valida en BD
✅ **Performance** - Métricas en cada paso
✅ **Auto-documenta** - Screenshots + videos + reportes
✅ **CI/CD ready** - GitHub Actions configurado
✅ **Escalable** - Agregar módulos es copiar/pegar estructura

**Un humano probando cada rincón del sistema** 🎯
