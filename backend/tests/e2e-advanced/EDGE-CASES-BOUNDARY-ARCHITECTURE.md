# EDGE CASES & BOUNDARY TESTING - Arquitectura Completa

## 🎯 OBJETIVO

Sistema de pruebas de casos extremos y límites que valida:
- **Unicode & Internationalization** (UTF-8, emojis, RTL, CJK)
- **Timezone Handling** (diferentes zonas horarias)
- **Extreme Values** (números muy grandes/pequeños, strings largos)
- **Null/Undefined Handling** (valores ausentes)
- **Concurrent Operations** (race conditions, simultaneidad)
- **Browser Compatibility** (Chrome, Firefox, Safari, Edge)
- **Network Conditions** (lento, offline, timeouts)
- **Auto-healing** cuando se detectan edge cases no manejados

## 🌍 EDGE CASES POR CATEGORÍA

### 1. UNICODE & INTERNATIONALIZATION

#### Escenario 1: Nombres con Unicode
**Qué testear:**
- Emojis en nombres: "Juan 😊"
- Caracteres especiales: "José María Ñoño"
- Alfabetos no latinos: "李明" (chino), "Мария" (ruso), "محمد" (árabe)
- Ligaduras: "ﬁle" (fi ligature)
- Zero-width characters: "John‌‌Doe" (con zero-width non-joiner)

**Test:**
```javascript
test('Unicode names - emojis and special characters', async () => {
  const unicodeNames = [
    'Juan 😊 Pérez',
    'José María Ñoño',
    '李明',
    'Мария Иванова',
    'محمد أحمد',
    'Café ☕ Manager',
    'Stra\u00DFe', // ß (German eszett)
    '\u202EgnitseT', // Right-to-left override
  ];

  for (const name of unicodeNames) {
    const user = await db.users.create({
      email: `${encodeURIComponent(name)}@test.com`,
      name: name,
      password: 'Test123!',
      company_id: 11
    });

    // Verificar que se guardó correctamente
    const retrieved = await db.users.findByPk(user.id);
    expect(retrieved.name).to.equal(name); // Exactamente igual

    // Cleanup
    await user.destroy();
  }
});
```

#### Escenario 2: Right-to-Left (RTL) Languages
**Qué testear:**
- Texto árabe/hebreo se renderiza correctamente
- Números en contexto RTL: "السعر 1,234 ريال"
- Mixing LTR + RTL: "Welcome مرحبا User"

**Test:**
```javascript
test('RTL languages render correctly', async ({ page }) => {
  await page.goto('http://localhost:9998/panel-empresa.html');
  await login(page);

  // Crear usuario con nombre árabe
  await page.click('#createUserButton');
  await page.fill('#nameInput', 'محمد أحمد');
  await page.click('#saveButton');

  // Verificar que se muestra correctamente (con dir=rtl)
  const userName = await page.textContent('.user-card:first-child .name');
  expect(userName).to.equal('محمد أحمد');

  // Verificar que tiene atributo dir="rtl"
  const dir = await page.getAttribute('.user-card:first-child .name', 'dir');
  expect(dir).to.equal('rtl');
});
```

---

### 2. TIMEZONE HANDLING

#### Escenario 1: Diferentes zonas horarias
**Qué testear:**
- Usuario en UTC-5 crea attendance a las 08:00
- Usuario en UTC+8 ve la misma attendance ¿a qué hora?
- Daylight Saving Time (DST) transitions

**Test:**
```javascript
test('Timezone: Attendance created in UTC-5, viewed in UTC+8', async () => {
  // 1. Crear attendance como si estuviera en New York (UTC-5)
  const nyTime = '2025-12-25T08:00:00-05:00'; // 08:00 AM en NY
  const utcTime = new Date(nyTime).toISOString(); // Convertir a UTC

  const attendance = await db.attendances.create({
    id: uuidv4(),
    user_id: 1,
    company_id: 11,
    date: '2025-12-25',
    checkInTime: utcTime,
    status: 'present'
  });

  // 2. Simular usuario en Hong Kong (UTC+8) viendo la attendance
  const hkTime = new Date(attendance.checkInTime).toLocaleString('en-US', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // 08:00 AM UTC-5 = 09:00 PM UTC+8 (mismo día)
  expect(hkTime).to.equal('21:00'); // 9 PM en HK

  // Cleanup
  await attendance.destroy();
});
```

#### Escenario 2: Daylight Saving Time (DST)
**Qué testear:**
- Attendance creada a las 02:30 AM el día del cambio de hora
- ¿Qué pasa con la hora "inexistente" (02:00-03:00 en spring forward)?
- ¿Qué pasa con la hora "duplicada" (01:00-02:00 en fall back)?

**Test:**
```javascript
test('DST: Spring forward - hora inexistente', async () => {
  // 14 marzo 2025, 02:30 AM NO EXISTE en US/Eastern (salta de 02:00 a 03:00)
  try {
    const invalidTime = '2025-03-14T02:30:00-05:00';

    const attendance = await db.attendances.create({
      id: uuidv4(),
      user_id: 1,
      company_id: 11,
      date: '2025-03-14',
      checkInTime: invalidTime,
      status: 'present'
    });

    // ¿Qué guardó? Debería ser 03:30 AM
    const saved = new Date(attendance.checkInTime);
    expect(saved.getHours()).to.equal(3); // Ajustado a 03:00

    await attendance.destroy();

  } catch (error) {
    // O podría rechazar la hora inválida
    expect(error.message).to.include('invalid time');
  }
});
```

---

### 3. EXTREME VALUES

#### Escenario 1: Números muy grandes
**Qué testear:**
- Max safe integer: 9007199254740991 (2^53 - 1)
- BigInt support
- Overflow en cálculos

**Test:**
```javascript
test('Extreme values: Max safe integer', async () => {
  const maxSafeInt = Number.MAX_SAFE_INTEGER; // 9007199254740991

  const user = await db.users.create({
    email: 'big@test.com',
    password: 'Test123!',
    company_id: 11,
    employee_number: maxSafeInt // ← Número muy grande
  });

  const retrieved = await db.users.findByPk(user.id);
  expect(retrieved.employee_number).to.equal(maxSafeInt);

  // Cleanup
  await user.destroy();
});

test('Extreme values: Overflow detection', async () => {
  const tooBig = Number.MAX_SAFE_INTEGER + 1;

  try {
    await db.users.create({
      email: 'overflow@test.com',
      password: 'Test123!',
      company_id: 11,
      employee_number: tooBig
    });

    // Si se guarda, verificar que NO perdió precisión
    const user = await db.users.findOne({ where: { email: 'overflow@test.com' } });
    expect(user.employee_number).to.equal(tooBig); // Debería ser igual

    await user.destroy();

  } catch (error) {
    // O podría rechazar el valor
    expect(error.message).to.include('out of range');
  }
});
```

#### Escenario 2: Strings muy largos
**Qué testear:**
- String de 1 MB en descripción
- String de 10 KB en nombre
- VARCHAR limits

**Test:**
```javascript
test('Extreme values: Very long strings', async () => {
  const longName = 'A'.repeat(1000); // 1000 caracteres
  const longDescription = 'B'.repeat(1000000); // 1 MB

  try {
    const dept = await db.departments.create({
      name: longName,
      description: longDescription,
      company_id: 11
    });

    // Verificar que se guardó
    const retrieved = await db.departments.findByPk(dept.id);
    expect(retrieved.name.length).to.equal(1000);
    expect(retrieved.description.length).to.equal(1000000);

    await dept.destroy();

  } catch (error) {
    // Si falla, debe ser por VARCHAR limit
    expect(error.message).to.include('value too long');
  }
});
```

#### Escenario 3: Números negativos
**Qué testear:**
- Salary negativo
- Edad negativa
- Horas trabajadas negativas

**Test:**
```javascript
test('Extreme values: Negative numbers', async () => {
  try {
    await db.users.create({
      email: 'negative@test.com',
      password: 'Test123!',
      company_id: 11,
      age: -5 // ← Negativo!
    });

    throw new Error('Should have rejected negative age');

  } catch (error) {
    // DEBE rechazar
    expect(error.message).to.include('check constraint') || expect(error.message).to.include('validation');
  }
});
```

---

### 4. NULL/UNDEFINED/EMPTY HANDLING

#### Escenario 1: Null vs Empty String vs Undefined
**Qué testear:**
- Campo opcional con null
- Campo opcional con ""
- Campo opcional sin proveer (undefined)

**Test:**
```javascript
test('Null handling: null vs empty string', async () => {
  // 1. null explícito
  const user1 = await db.users.create({
    email: 'null@test.com',
    password: 'Test123!',
    company_id: 11,
    phone: null // ← null explícito
  });

  expect(user1.phone).to.be.null;

  // 2. Empty string
  const user2 = await db.users.create({
    email: 'empty@test.com',
    password: 'Test123!',
    company_id: 11,
    phone: '' // ← empty string
  });

  expect(user2.phone).to.equal('');

  // 3. Undefined (no proveer)
  const user3 = await db.users.create({
    email: 'undefined@test.com',
    password: 'Test123!',
    company_id: 11
    // phone no provisto
  });

  expect(user3.phone).to.be.null; // Default a null

  // Cleanup
  await db.users.destroy({ where: { id: [user1.id, user2.id, user3.id] } });
});
```

#### Escenario 2: Null in JSON fields
**Qué testear:**
- JSONB field con null
- JSONB field con { key: null }
- JSONB field con {}

**Test:**
```javascript
test('Null in JSON: JSONB field', async () => {
  const configs = [
    null, // null directo
    {}, // objeto vacío
    { key: null }, // key con valor null
    { key: undefined } // undefined (se elimina en JSON.stringify)
  ];

  for (const config of configs) {
    const company = await db.companies.create({
      name: 'Test Company',
      slug: `test-${Math.random()}`,
      modules_data: config
    });

    const retrieved = await db.companies.findByPk(company.id);

    if (config === null) {
      expect(retrieved.modules_data).to.be.null;
    } else if (Object.keys(config).length === 0) {
      expect(retrieved.modules_data).to.deep.equal({});
    } else {
      // { key: undefined } se convierte en {}
      const expected = JSON.parse(JSON.stringify(config));
      expect(retrieved.modules_data).to.deep.equal(expected);
    }

    await company.destroy();
  }
});
```

---

### 5. CONCURRENT OPERATIONS (Race Conditions)

#### Escenario 1: Doble click en "Guardar"
**Qué testear:**
- Usuario hace doble click → ¿Se crean 2 registros?
- ¿Hay debounce/throttle?

**Test:**
```javascript
test('Concurrent operations: Double click on save', async ({ page }) => {
  await page.goto('http://localhost:9998/panel-empresa.html');
  await login(page);

  // Abrir modal
  await page.click('#createUserButton');
  await page.fill('#nameInput', 'Double Click Test');
  await page.fill('#emailInput', 'double@test.com');
  await page.fill('#passwordInput', 'Test123!');

  // DOBLE CLICK en guardar (sin esperar)
  await Promise.all([
    page.click('#saveButton'),
    page.click('#saveButton')
  ]);

  await page.waitForTimeout(2000);

  // Verificar que se creó SOLO 1 usuario
  const count = await db.users.count({ where: { email: 'double@test.com' } });
  expect(count).to.equal(1); // NO 2!

  // Cleanup
  await db.users.destroy({ where: { email: 'double@test.com' } });
});
```

#### Escenario 2: Modificación simultánea (Last Write Wins)
**Qué testear:**
- Usuario A y B editan mismo registro simultáneamente
- ¿Quién gana? ¿Se pierden cambios?
- Optimistic locking?

**Test:**
```javascript
test('Concurrent modifications: Last write wins', async () => {
  // 1. Crear usuario
  const user = await db.users.create({
    email: 'concurrent@test.com',
    name: 'Original',
    password: 'Test123!',
    company_id: 11
  });

  const userId = user.id;

  // 2. Dos transacciones simultáneas
  const t1 = db.sequelize.transaction();
  const t2 = db.sequelize.transaction();

  try {
    // T1: Cambiar nombre a "Modified by T1"
    const user_t1 = await db.users.findByPk(userId, { transaction: await t1 });
    user_t1.name = 'Modified by T1';
    await user_t1.save({ transaction: await t1 });

    // T2: Cambiar nombre a "Modified by T2"
    const user_t2 = await db.users.findByPk(userId, { transaction: await t2 });
    user_t2.name = 'Modified by T2';
    await user_t2.save({ transaction: await t2 });

    // Commit en orden
    await (await t1).commit();
    await (await t2).commit(); // ← Last write wins

    // Verificar quién ganó
    const final = await db.users.findByPk(userId);
    expect(final.name).to.equal('Modified by T2'); // T2 ganó

    // PROBLEMA: Cambios de T1 se perdieron!
    console.log('⚠️  Lost update detected - no optimistic locking');

  } finally {
    await db.users.destroy({ where: { id: userId } });
  }
});
```

**Test: Con Optimistic Locking (versión)**
```javascript
test('Concurrent modifications: Optimistic locking prevents lost updates', async () => {
  // Requiere columna "version" en tabla users

  const user = await db.users.create({
    email: 'optimistic@test.com',
    name: 'Original',
    password: 'Test123!',
    company_id: 11,
    version: 1 // ← Version inicial
  });

  const userId = user.id;

  try {
    // T1: Leer versión 1
    const user_t1 = await db.users.findByPk(userId);
    expect(user_t1.version).to.equal(1);

    // T2: Leer versión 1
    const user_t2 = await db.users.findByPk(userId);
    expect(user_t2.version).to.equal(1);

    // T1: Update con versión 1 → 2
    user_t1.name = 'Modified by T1';
    await db.users.update(
      { name: 'Modified by T1', version: 2 },
      { where: { id: userId, version: 1 } } // ← WHERE version = 1
    );

    // T2: Intentar update con versión 1 (ya es 2!) → FALLA
    const result = await db.users.update(
      { name: 'Modified by T2', version: 2 },
      { where: { id: userId, version: 1 } }
    );

    expect(result[0]).to.equal(0); // 0 rows affected (version mismatch)

    // T2 debe re-intentar con versión actualizada
    const user_t2_refreshed = await db.users.findByPk(userId);
    expect(user_t2_refreshed.version).to.equal(2);

  } finally {
    await db.users.destroy({ where: { id: userId } });
  }
});
```

---

### 6. BROWSER COMPATIBILITY

#### Escenario 1: Cross-browser rendering
**Qué testear:**
- Chrome, Firefox, Safari, Edge
- Layouts, CSS Grid, Flexbox
- JavaScript APIs (localStorage, IndexedDB, etc.)

**Test (Playwright multi-browser):**
```javascript
test.describe('Cross-browser compatibility', () => {
  const browsers = ['chromium', 'firefox', 'webkit']; // Chrome, Firefox, Safari

  for (const browserType of browsers) {
    test(`Renders correctly in ${browserType}`, async () => {
      const browser = await playwright[browserType].launch();
      const page = await browser.newPage();

      await page.goto('http://localhost:9998/panel-empresa.html');
      await login(page);

      // Verificar que layout es correcto
      const header = await page.locator('header').boundingBox();
      expect(header.height).to.be.greaterThan(50);

      // Verificar que JavaScript funciona
      await page.click('#createUserButton');
      const modal = await page.locator('#userModal').isVisible();
      expect(modal).to.be.true;

      await browser.close();
    });
  }
});
```

---

### 7. NETWORK CONDITIONS

#### Escenario 1: Slow 3G
**Qué testear:**
- App funciona en conexión lenta
- Timeouts adecuados
- Loading states visibles

**Test:**
```javascript
test('Slow 3G network simulation', async ({ page, context }) => {
  // Simular Slow 3G (download: 500 Kbps, upload: 500 Kbps, latency: 400ms)
  await context.route('**/*', route => {
    setTimeout(() => route.continue(), 400); // 400ms latency
  });

  await page.goto('http://localhost:9998/panel-empresa.html', { timeout: 60000 });

  // Verificar que muestra loading state
  const loader = await page.locator('.loading-spinner').isVisible();
  expect(loader).to.be.true;

  await page.waitForLoadState('networkidle', { timeout: 60000 });

  // App debe cargar eventualmente
  const content = await page.locator('#mainContent').isVisible();
  expect(content).to.be.true;
});
```

#### Escenario 2: Offline mode
**Qué testear:**
- ¿Qué pasa si se pierde conexión?
- ¿Hay fallback offline?
- ¿Se muestran mensajes de error?

**Test:**
```javascript
test('Offline mode handling', async ({ page, context }) => {
  await page.goto('http://localhost:9998/panel-empresa.html');
  await login(page);

  // Simular offline
  await context.setOffline(true);

  // Intentar crear usuario
  await page.click('#createUserButton');
  await page.fill('#nameInput', 'Offline Test');
  await page.click('#saveButton');

  // DEBE mostrar error de conexión
  const errorMessage = await page.locator('.error-message').textContent();
  expect(errorMessage).to.include('network') || expect(errorMessage).to.include('connection');

  // Restaurar online
  await context.setOffline(false);

  // Retry debe funcionar
  await page.click('#retryButton');
  await page.waitForTimeout(2000);

  const success = await page.locator('.success-message').isVisible();
  expect(success).to.be.true;
});
```

---

## 📊 ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│           EDGE CASES & BOUNDARY ORCHESTRATOR                 │
│  (backend/tests/e2e-advanced/edge/EdgeCaseOrchestrator.js)   │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► 1. UNICODE & I18N TESTERS
             │   ├─ UnicodeNameTester.js (emojis, special chars)
             │   ├─ RTLTester.js (Arabic, Hebrew)
             │   ├─ CJKTester.js (Chinese, Japanese, Korean)
             │   └─ LocaleTester.js (date/number formatting)
             │
             ├─► 2. TIMEZONE TESTERS
             │   ├─ TimezoneConversionTester.js
             │   ├─ DSTTester.js (daylight saving)
             │   └─ UTCHandlingTester.js
             │
             ├─► 3. EXTREME VALUES TESTERS
             │   ├─ MaxIntTester.js (Number.MAX_SAFE_INTEGER)
             │   ├─ LongStringTester.js (1MB strings)
             │   ├─ NegativeNumberTester.js
             │   └─ FloatingPointTester.js (0.1 + 0.2 != 0.3)
             │
             ├─► 4. NULL/UNDEFINED TESTERS
             │   ├─ NullVsEmptyTester.js
             │   ├─ UndefinedFieldTester.js
             │   └─ JSONNullTester.js
             │
             ├─► 5. CONCURRENT OPERATIONS TESTERS
             │   ├─ DoubleClickTester.js
             │   ├─ RaceConditionTester.js
             │   ├─ OptimisticLockingTester.js
             │   └─ DeadlockSimulator.js
             │
             ├─► 6. BROWSER COMPATIBILITY TESTERS
             │   ├─ ChromeTester.js
             │   ├─ FirefoxTester.js
             │   ├─ SafariTester.js
             │   └─ EdgeTester.js
             │
             ├─► 7. NETWORK CONDITIONS TESTERS
             │   ├─ Slow3GTester.js
             │   ├─ OfflineModeTester.js
             │   ├─ TimeoutTester.js
             │   └─ PacketLossTester.js
             │
             └─► 8. AUTO-HEALING ENGINE
                 ├─ Detecta Unicode no soportado → Normalizar
                 ├─ Detecta timezone incorrecta → Convertir a UTC
                 ├─ Detecta valor out of range → Truncar/Validar
                 ├─ Detecta race condition → Implementar lock
                 └─ Re-ejecuta test para validar

```

## 🗄️ DATABASE SCHEMA

```sql
-- Tabla de logs de edge cases
CREATE TABLE edge_case_logs (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Test context
  edge_case_type VARCHAR(50), -- 'unicode', 'timezone', 'extreme_value', 'null_handling', 'concurrent', 'browser', 'network'
  test_name VARCHAR(100),

  -- Input/Output
  input_value TEXT,
  expected_output TEXT,
  actual_output TEXT,

  -- Results
  status VARCHAR(20), -- 'passed', 'failed', 'edge_case_detected'
  issue_detected TEXT,

  -- Severity
  severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'

  -- Auto-fix
  auto_fix_suggested TEXT,
  auto_fix_applied BOOLEAN DEFAULT false,

  INDEX idx_test_run (test_run_id),
  INDEX idx_edge_type (edge_case_type),
  INDEX idx_status (status)
);
```

## 🎯 SUCCESS CRITERIA

| Métrica | Target | Descripción |
|---------|--------|-------------|
| Unicode Support | 100% | Todos los caracteres UTF-8 soportados |
| Timezone Accuracy | 100% | Conversiones correctas en todas las TZ |
| Extreme Values Handled | 100% | No crashes en valores extremos |
| Null Handling | 100% | null/undefined/empty manejados correctamente |
| Race Conditions Detected | 100% | Todos los race conditions detectados |
| Cross-Browser Pass Rate | >95% | Tests pasan en Chrome, FF, Safari, Edge |
| Network Resilience | >90% | App funciona en Slow 3G/Offline con fallbacks |

## 🚀 NEXT STEPS

1. ✅ Crear EdgeCaseOrchestrator.js
2. ✅ Implementar 7 categorías de testers
3. ✅ Crear tabla edge_case_logs
4. ✅ Implementar Unicode normalization
5. ✅ Implementar timezone conversion helpers
6. ✅ Implementar optimistic locking
7. ✅ Configurar Playwright multi-browser
8. ✅ Implementar network throttling tests
9. ✅ Implementar auto-healing engine
10. ✅ Integrar con e2e-testing-advanced

**ESTIMACIÓN**: 4-5 días de desarrollo + 1 día de tuning
