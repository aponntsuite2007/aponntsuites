# MULTI-TENANT ISOLATION TESTS - Arquitectura Completa

## 🎯 OBJETIVO

Sistema de pruebas de aislamiento multi-tenant que valida:
- **Data Isolation** - Empresa A NO puede ver/modificar datos de Empresa B
- **Performance Isolation** - 50 empresas concurrentes no degradan el sistema
- **Security Isolation** - Tokens, sessions, permisos segregados por empresa
- **Database Isolation** - Queries con WHERE company_id en TODAS las tablas
- **Auto-healing** cuando se detectan data leakages

## 🏢 ESCENARIOS DE MULTI-TENANT

### Arquitectura actual
```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE DATABASE                           │
│                      PostgreSQL                              │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ Empresa │        │ Empresa │   ...  │ Empresa │
   │   #11   │        │   #22   │        │   #N    │
   │  (ISI)  │        │ (ACME)  │        │         │
   └─────────┘        └─────────┘        └─────────┘
```

**Estrategia de aislamiento:**
- Columna `company_id` en TODAS las tablas
- Middleware `checkCompanyAccess()` en TODAS las rutas
- Token JWT contiene `company_id` del usuario logueado
- Queries SIEMPRE incluyen `WHERE company_id = ?`

## 🚨 VULNERABILIDADES CRÍTICAS A TESTEAR

### 1. SQL Injection para bypass de company_id
**Qué puede pasar:**
```javascript
// Código vulnerable
const users = await db.query(`
  SELECT * FROM users
  WHERE company_id = ${req.user.company_id} AND name LIKE '%${req.query.search}%'
`);
```

**Ataque:**
```http
GET /api/users?search=%' OR company_id != 11 OR '1'='1
```

**Resultado esperado (vulnerable):**
```javascript
// Query ejecutado:
SELECT * FROM users
WHERE company_id = 11 AND name LIKE '%%' OR company_id != 11 OR '1'='1%'
// ↑ Retorna usuarios de TODAS las empresas!
```

**Test:**
```javascript
test('SQL Injection para bypass company_id', async () => {
  const tokenCompany11 = await login({ companyId: 11 });

  const response = await api.get('/api/users?search=%27%20OR%20company_id%20!=%2011%20OR%20%271%27=%271', {
    headers: { Authorization: `Bearer ${tokenCompany11}` }
  });

  // DEBE retornar solo datos de company_id 11 (o error 400)
  if (response.status === 200) {
    expect(response.body.every(u => u.company_id === 11)).to.be.true;
    expect(response.body.some(u => u.company_id !== 11)).to.be.false;
  } else {
    expect(response.status).to.equal(400); // Bad Request (input sanitizado)
  }
});
```

---

### 2. JWT Tampering (modificar company_id en token)
**Qué puede pasar:**
```javascript
// Usuario de Empresa 11 recibe token:
{
  "userId": 123,
  "company_id": 11,
  "role": "admin",
  "exp": 1672531200
}

// Atacante modifica a company_id: 22 y re-firma con secret incorrecto
```

**Test:**
```javascript
test('JWT tampering - modificar company_id', async () => {
  // 1. Login legítimo con Empresa 11
  const realToken = await login({ companyId: 11 });
  const decoded = jwt.decode(realToken);

  // 2. Modificar company_id a 22
  decoded.company_id = 22;

  // 3. Re-firmar con secret INCORRECTO
  const tamperedToken = jwt.sign(decoded, 'wrong-secret');

  // 4. Intentar acceder a datos con token adulterado
  const response = await api.get('/api/attendance', {
    headers: { Authorization: `Bearer ${tamperedToken}` }
  });

  // DEBE rechazar (401 Unauthorized - signature inválido)
  expect(response.status).to.equal(401);
  expect(response.body.error).to.include('invalid signature');
});
```

**Test adicional: Re-firmar con secret CORRECTO (aún más peligroso)**
```javascript
test('JWT tampering - modificar company_id con secret correcto', async () => {
  const realToken = await login({ companyId: 11 });
  const decoded = jwt.decode(realToken);
  decoded.company_id = 22;

  // ⚠️ Asumimos que atacante NO tiene el secret (escenario real)
  // Pero SI lo tuviera (por leak), ¿hay validación adicional?
  const tamperedToken = jwt.sign(decoded, process.env.JWT_SECRET);

  const response = await api.get('/api/attendance', {
    headers: { Authorization: `Bearer ${tamperedToken}` }
  });

  // IDEALMENTE debería TAMBIÉN validar que user.company_id === token.company_id
  // (verificar en BD que el usuario pertenece a esa empresa)
  expect(response.status).to.equal(403); // Forbidden
});
```

---

### 3. Direct Object Reference (IDOR)
**Qué puede pasar:**
```http
# Usuario de Empresa 11 accede a:
GET /api/attendance/999
# ↑ ID 999 pertenece a Empresa 22
```

**Código vulnerable:**
```javascript
router.get('/attendance/:id', async (req, res) => {
  const attendance = await Attendance.findByPk(req.params.id);
  // ❌ NO valida company_id!
  res.json(attendance);
});
```

**Código seguro:**
```javascript
router.get('/attendance/:id', async (req, res) => {
  const attendance = await Attendance.findOne({
    where: {
      id: req.params.id,
      company_id: req.user.company_id // ✅ Validación
    }
  });

  if (!attendance) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(attendance);
});
```

**Test:**
```javascript
test('IDOR - acceder a attendance de otra empresa', async () => {
  // 1. Crear attendance en Empresa 22
  const tokenCompany22 = await login({ companyId: 22 });
  const createResponse = await api.post('/api/attendance', {
    user_id: 999,
    date: '2025-12-25',
    checkInTime: '08:00:00',
    status: 'present'
  }, {
    headers: { Authorization: `Bearer ${tokenCompany22}` }
  });
  const attendanceId = createResponse.body.id;

  // 2. Intentar acceder desde Empresa 11
  const tokenCompany11 = await login({ companyId: 11 });
  const response = await api.get(`/api/attendance/${attendanceId}`, {
    headers: { Authorization: `Bearer ${tokenCompany11}` }
  });

  // DEBE retornar 404 (no existe) o 403 (forbidden)
  expect([403, 404]).to.include(response.status);
  expect(response.body).to.not.have.property('id');
});
```

---

### 4. Mass Assignment (modificar company_id en POST/PUT)
**Qué puede pasar:**
```javascript
// Código vulnerable
router.post('/users', async (req, res) => {
  const user = await User.create(req.body); // ❌ Acepta TODOS los campos
  res.json(user);
});
```

**Ataque:**
```http
POST /api/users
Authorization: Bearer <token_empresa_11>
{
  "email": "hacker@evil.com",
  "password": "hack123",
  "company_id": 22  ← ATAQUE: Forzar company_id diferente
}
```

**Test:**
```javascript
test('Mass Assignment - forzar company_id en creación', async () => {
  const tokenCompany11 = await login({ companyId: 11 });

  const response = await api.post('/api/users', {
    email: 'test@test.com',
    password: 'Test123!',
    company_id: 22 // ← Intentar forzar otra empresa
  }, {
    headers: { Authorization: `Bearer ${tokenCompany11}` }
  });

  // DEBE crear usuario en company_id 11 (del token), NO 22
  expect(response.status).to.equal(201);
  expect(response.body.company_id).to.equal(11);
});

test('Mass Assignment - modificar company_id en actualización', async () => {
  const tokenCompany11 = await login({ companyId: 11 });

  // 1. Crear usuario en Empresa 11
  const createResponse = await api.post('/api/users', {
    email: 'test@test.com',
    password: 'Test123!'
  }, {
    headers: { Authorization: `Bearer ${tokenCompany11}` }
  });
  const userId = createResponse.body.id;

  // 2. Intentar cambiar company_id a 22
  const updateResponse = await api.put(`/api/users/${userId}`, {
    company_id: 22 // ← ATAQUE
  }, {
    headers: { Authorization: `Bearer ${tokenCompany11}` }
  });

  // DEBE rechazar o ignorar el cambio
  if (updateResponse.status === 200) {
    expect(updateResponse.body.company_id).to.equal(11); // NO cambió
  } else {
    expect([400, 403]).to.include(updateResponse.status);
  }
});
```

---

### 5. Query Parameter Injection
**Qué puede pasar:**
```http
GET /api/users?company_id=22
# ↑ Forzar company_id en query params
```

**Código vulnerable:**
```javascript
router.get('/users', async (req, res) => {
  const users = await User.findAll({
    where: {
      company_id: req.query.company_id || req.user.company_id // ❌ Acepta query param!
    }
  });
  res.json(users);
});
```

**Test:**
```javascript
test('Query Parameter Injection - forzar company_id', async () => {
  const tokenCompany11 = await login({ companyId: 11 });

  const response = await api.get('/api/users?company_id=22', {
    headers: { Authorization: `Bearer ${tokenCompany11}` }
  });

  // DEBE ignorar query param y usar company_id del token (11)
  expect(response.status).to.equal(200);
  expect(response.body.every(u => u.company_id === 11)).to.be.true;
});
```

---

### 6. GraphQL/API Batching (bypass via múltiples requests)
**Qué puede pasar:**
```http
POST /api/batch
[
  { "method": "GET", "url": "/api/users?company_id=11" },
  { "method": "GET", "url": "/api/users?company_id=22" },
  { "method": "GET", "url": "/api/users?company_id=33" }
]
# ↑ Intentar obtener datos de múltiples empresas en un solo request
```

**Test:**
```javascript
test('Batch API - bypass company_id via batching', async () => {
  const tokenCompany11 = await login({ companyId: 11 });

  const response = await api.post('/api/batch', [
    { method: 'GET', url: '/api/users?company_id=11' },
    { method: 'GET', url: '/api/users?company_id=22' },
    { method: 'GET', url: '/api/users?company_id=33' }
  ], {
    headers: { Authorization: `Bearer ${tokenCompany11}` }
  });

  // TODAS las respuestas DEBEN ser de company_id 11
  if (response.status === 200 && Array.isArray(response.body)) {
    for (const batchResponse of response.body) {
      if (batchResponse.data) {
        expect(batchResponse.data.every(u => u.company_id === 11)).to.be.true;
      }
    }
  } else {
    expect([400, 404]).to.include(response.status); // Batch API no existe o rechaza
  }
});
```

---

## 🧪 PERFORMANCE ISOLATION TESTS

### Escenario: 50 empresas concurrentes
**Objetivo:** Verificar que actividad masiva en Empresa A no afecta a Empresa B.

**Test:**
```javascript
test('50 empresas concurrentes - performance isolation', async () => {
  // 1. Crear 50 empresas y tokens
  const companies = await Promise.all(
    Array(50).fill().map((_, i) => createCompany({ name: `Company-${i}` }))
  );
  const tokens = await Promise.all(
    companies.map(c => login({ companyId: c.id }))
  );

  // 2. Empresa 1: Actividad normal (baseline)
  const company1Start = Date.now();
  const company1Response = await api.get('/api/users', {
    headers: { Authorization: `Bearer ${tokens[0]}` }
  });
  const company1Duration = Date.now() - company1Start;

  // 3. Empresas 2-50: Actividad masiva (1000 requests/empresa simultáneos)
  const massiveLoad = tokens.slice(1).flatMap(token =>
    Array(1000).fill().map(() =>
      api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } })
    )
  );

  // 4. Ejecutar load en background
  const loadPromise = Promise.all(massiveLoad);

  // 5. Mientras corre el load, medir performance de Empresa 1
  await sleep(2000); // Esperar que el load arranque
  const company1UnderLoadStart = Date.now();
  const company1UnderLoadResponse = await api.get('/api/users', {
    headers: { Authorization: `Bearer ${tokens[0]}` }
  });
  const company1UnderLoadDuration = Date.now() - company1UnderLoadStart;

  await loadPromise; // Esperar que termine el load

  // 6. Validar que performance de Empresa 1 NO degradó significativamente
  const degradationPercent = ((company1UnderLoadDuration - company1Duration) / company1Duration) * 100;

  console.log(`Baseline: ${company1Duration}ms`);
  console.log(`Under load: ${company1UnderLoadDuration}ms`);
  console.log(`Degradation: ${degradationPercent.toFixed(2)}%`);

  expect(degradationPercent).to.be.lessThan(50); // <50% degradación aceptable
});
```

---

## 🗄️ DATABASE QUERY AUDIT

**Objetivo:** Verificar que TODAS las queries incluyen `WHERE company_id = ?`

### Técnica: PostgreSQL Query Logging
```sql
-- Habilitar query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 0; -- Log TODAS las queries
SELECT pg_reload_conf();

-- Luego ejecutar tests y analizar logs
```

**Test automatizado:**
```javascript
test('Audit de queries - todas incluyen company_id', async () => {
  // 1. Habilitar query logging (requiere permisos SUPERUSER)
  await db.query("SELECT pg_reload_conf()");

  // 2. Limpiar logs anteriores
  await db.query("SELECT pg_rotate_logfile()");

  // 3. Ejecutar operaciones comunes
  const token = await login({ companyId: 11 });
  await api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } });
  await api.get('/api/attendance', { headers: { Authorization: `Bearer ${token}` } });
  await api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } });

  // 4. Obtener queries ejecutadas
  const logs = await db.query(`
    SELECT query FROM pg_stat_statements
    WHERE query LIKE '%FROM users%'
       OR query LIKE '%FROM attendances%'
       OR query LIKE '%FROM departments%'
  `);

  // 5. Verificar que TODAS las queries SELECT incluyen company_id
  const selectQueries = logs.rows.filter(r => r.query.includes('SELECT'));
  for (const row of selectQueries) {
    if (!row.query.includes('company_id')) {
      throw new Error(`Query sin company_id: ${row.query}`);
    }
  }

  console.log(`✅ ${selectQueries.length} queries auditadas - todas incluyen company_id`);
});
```

---

## 📊 ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│         MULTI-TENANT ISOLATION ORCHESTRATOR                  │
│  (backend/tests/e2e-advanced/multi-tenant/MTOrchestrator.js) │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► 1. DATA ISOLATION TESTERS
             │   ├─ SQLInjectionBypass.js (company_id bypass)
             │   ├─ JWTTampering.js (token modification)
             │   ├─ IDORTester.js (direct object reference)
             │   ├─ MassAssignmentTester.js (force company_id)
             │   └─ QueryInjectionTester.js (query params)
             │
             ├─► 2. PERFORMANCE ISOLATION TESTERS
             │   ├─ ConcurrentCompanies.js (50 empresas paralelas)
             │   ├─ NoiseNeighbor.js (carga masiva en Empresa A → medir Empresa B)
             │   ├─ ResourceExhaustion.js (DB connections, memory)
             │   └─ ThrottlingIsolation.js (rate limits por empresa)
             │
             ├─► 3. SECURITY ISOLATION TESTERS
             │   ├─ SessionIsolation.js (tokens no cruzados)
             │   ├─ PermissionIsolation.js (roles por empresa)
             │   ├─ FileUploadIsolation.js (archivos por empresa)
             │   └─ WebSocketIsolation.js (real-time events)
             │
             ├─► 4. DATABASE QUERY AUDITOR
             │   ├─ Query logging analysis
             │   ├─ Detecta SELECTs sin WHERE company_id
             │   ├─ Detecta UPDATEs/DELETEs sin company_id
             │   └─ Genera reporte de queries vulnerables
             │
             ├─► 5. REAL-TIME ISOLATION MONITOR
             │   ├─ Dashboard con 50 empresas simuladas
             │   ├─ Mapa de calor (qué empresa ve qué datos)
             │   ├─ Alertas cuando se detecta data leakage
             │   └─ Gráficos de performance por empresa
             │
             └─► 6. AUTO-HEALING ENGINE
                 ├─ Detecta query sin company_id
                 ├─ Agrega WHERE company_id = ? automáticamente
                 ├─ Agrega middleware checkCompanyAccess()
                 ├─ Valida JWT company_id vs user.company_id
                 └─ Re-ejecuta test para validar

```

## 🗄️ DATABASE SCHEMA

```sql
-- Tabla de logs de aislamiento
CREATE TABLE multi_tenant_isolation_logs (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Test context
  test_type VARCHAR(50), -- 'data_isolation', 'performance_isolation', 'security_isolation'
  attack_vector VARCHAR(100), -- 'sql_injection', 'jwt_tampering', 'idor', etc.

  -- Companies involved
  attacker_company_id INTEGER,
  target_company_id INTEGER,

  -- Attack details
  endpoint VARCHAR(255),
  http_method VARCHAR(10),
  payload JSONB,
  expected_behavior TEXT,
  actual_behavior TEXT,

  -- Results
  status VARCHAR(20), -- 'passed', 'failed', 'data_leaked'
  data_leaked BOOLEAN DEFAULT false,
  leaked_records INTEGER DEFAULT 0,
  leaked_data JSONB, -- Sample de datos filtrados

  -- Severity
  severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
  impact_score INTEGER, -- 0-100

  -- Auto-fix
  fix_suggested TEXT,
  fix_applied BOOLEAN DEFAULT false,
  fix_code TEXT,

  INDEX idx_test_run (test_run_id),
  INDEX idx_data_leaked (data_leaked),
  INDEX idx_severity (severity)
);

-- Tabla de queries auditadas
CREATE TABLE query_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  query_text TEXT,
  has_company_id_filter BOOLEAN,
  table_name VARCHAR(100),
  operation VARCHAR(10), -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  executed_by_user_id INTEGER,
  executed_by_company_id INTEGER,
  vulnerability_detected BOOLEAN DEFAULT false,
  vulnerability_type VARCHAR(100)
);

-- Tabla de performance por empresa
CREATE TABLE company_performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  company_id INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Metrics
  avg_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,
  requests_per_second DECIMAL(10,2),
  error_rate DECIMAL(5,2),

  -- Resource usage
  db_connections_active INTEGER,
  memory_mb INTEGER,

  -- Isolation score
  isolation_score INTEGER, -- 0-100 (100 = perfecto aislamiento)
  noisy_neighbor_detected BOOLEAN DEFAULT false,

  INDEX idx_company (company_id),
  INDEX idx_test_run (test_run_id)
);
```

## 🚀 MULTI-TENANT TEST SCENARIOS

### Scenario 1: Data Leakage via SQL Injection
```javascript
// backend/tests/e2e-advanced/multi-tenant/scenarios/data-leakage.spec.js

describe('Multi-Tenant Data Isolation', () => {
  test('SQL Injection para acceder a datos de 50 empresas', async () => {
    // 1. Crear 50 empresas con datos
    const companies = await createMultipleCompanies(50);

    // 2. Login como Empresa 1
    const token = await login({ companyId: companies[0].id });

    // 3. Payloads para bypass company_id
    const payloads = [
      "' OR '1'='1",
      "' OR company_id != " + companies[0].id + " OR '1'='1",
      "' UNION SELECT * FROM users WHERE company_id = " + companies[10].id + " --",
      "'; DROP TABLE users; --"
    ];

    // 4. Ejecutar todos los payloads
    for (const payload of payloads) {
      const response = await api.get(`/api/users?search=${encodeURIComponent(payload)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // DEBE retornar solo datos de Empresa 1
      if (response.status === 200) {
        expect(response.body.every(u => u.company_id === companies[0].id)).to.be.true;
        expect(response.body.some(u => u.company_id !== companies[0].id)).to.be.false;
      } else {
        expect([400, 403]).to.include(response.status);
      }
    }
  });

  test('Verificar que NO hay data leakage en 10000 requests', async () => {
    const companies = await createMultipleCompanies(10);
    let dataLeakageDetected = false;
    let leakedRecords = [];

    for (let i = 0; i < 10000; i++) {
      const randomCompany = companies[Math.floor(Math.random() * companies.length)];
      const token = await login({ companyId: randomCompany.id });

      const response = await api.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        const leaked = response.body.filter(u => u.company_id !== randomCompany.id);
        if (leaked.length > 0) {
          dataLeakageDetected = true;
          leakedRecords.push(...leaked);
        }
      }

      if (i % 1000 === 0) {
        console.log(`✅ ${i}/10000 requests - no leakage`);
      }
    }

    expect(dataLeakageDetected).to.be.false;
    expect(leakedRecords.length).to.equal(0);
  });
});
```

### Scenario 2: Performance Isolation (Noisy Neighbor)
```javascript
describe('Multi-Tenant Performance Isolation', () => {
  test('Empresa ruidosa NO afecta a empresas vecinas', async () => {
    // 1. Crear 3 empresas: A (normal), B (ruidosa), C (normal)
    const companyA = await createCompany({ name: 'Company-A' });
    const companyB = await createCompany({ name: 'Company-B-Noisy' });
    const companyC = await createCompany({ name: 'Company-C' });

    const tokenA = await login({ companyId: companyA.id });
    const tokenB = await login({ companyId: companyB.id });
    const tokenC = await login({ companyId: companyC.id });

    // 2. Baseline performance (sin carga)
    const baselineA = await measureResponseTime(() =>
      api.get('/api/users', { headers: { Authorization: `Bearer ${tokenA}` } })
    );
    const baselineC = await measureResponseTime(() =>
      api.get('/api/users', { headers: { Authorization: `Bearer ${tokenC}` } })
    );

    console.log(`Baseline A: ${baselineA}ms, C: ${baselineC}ms`);

    // 3. Empresa B: Generar CARGA MASIVA (10000 requests en 10 segundos)
    const noisyLoad = Array(10000).fill().map(() =>
      api.get('/api/users', { headers: { Authorization: `Bearer ${tokenB}` } })
    );

    const loadPromise = Promise.all(noisyLoad);

    // 4. Mientras corre la carga, medir performance de A y C
    await sleep(2000); // Esperar que arranque la carga

    const underLoadA = await measureResponseTime(() =>
      api.get('/api/users', { headers: { Authorization: `Bearer ${tokenA}` } })
    );
    const underLoadC = await measureResponseTime(() =>
      api.get('/api/users', { headers: { Authorization: `Bearer ${tokenC}` } })
    );

    console.log(`Under load A: ${underLoadA}ms, C: ${underLoadC}ms`);

    await loadPromise;

    // 5. Validar que degradación es mínima (<30%)
    const degradationA = ((underLoadA - baselineA) / baselineA) * 100;
    const degradationC = ((underLoadC - baselineC) / baselineC) * 100;

    console.log(`Degradation A: ${degradationA.toFixed(2)}%, C: ${degradationC.toFixed(2)}%`);

    expect(degradationA).to.be.lessThan(30);
    expect(degradationC).to.be.lessThan(30);
  });
});
```

## 🔄 AUTO-HEALING WORKFLOW

```javascript
class MultiTenantAutoHealer {
  async analyzeDataLeakage(leak) {
    // 1. Identificar query vulnerable
    const queryLog = await this.getQueryLog(leak.timestamp);
    const vulnerableQuery = queryLog.find(q => !q.includes('company_id'));

    if (!vulnerableQuery) {
      return { autoFixable: false, reason: 'Query not found in logs' };
    }

    // 2. Analizar tipo de vulnerabilidad
    if (this.isMissingSQLFilter(vulnerableQuery)) {
      return await this.addCompanyIdFilter(vulnerableQuery, leak);
    }

    if (this.isIDORVulnerability(leak)) {
      return await this.addIDORProtection(leak);
    }

    if (this.isMassAssignment(leak)) {
      return await this.protectCompanyIdField(leak);
    }

    return { autoFixable: false };
  }

  async addCompanyIdFilter(query, leak) {
    // 1. Encontrar archivo que ejecutó la query
    const stackTrace = leak.stack_trace;
    const file = this.extractFileFromStack(stackTrace);

    // 2. Leer código
    const code = await fs.readFile(file, 'utf-8');

    // 3. Encontrar línea con query
    const lines = code.split('\n');
    const queryLine = lines.findIndex(l => l.includes(query.substring(0, 50)));

    if (queryLine === -1) {
      return { autoFixable: false, reason: 'Query not found in code' };
    }

    // 4. Analizar si usa Sequelize o raw SQL
    if (code.includes('db.query(') || code.includes('sequelize.query(')) {
      // Raw SQL - agregar WHERE company_id = ?
      const fixedCode = this.addWhereCompanyId(code, queryLine);
      await fs.writeFile(file, fixedCode);

      return {
        applied: true,
        file,
        before: lines[queryLine],
        after: fixedCode.split('\n')[queryLine]
      };
    } else {
      // Sequelize ORM - agregar where: { company_id: ... }
      const fixedCode = this.addSequelizeCompanyId(code, queryLine);
      await fs.writeFile(file, fixedCode);

      return { applied: true, file };
    }
  }

  addWhereCompanyId(code, lineIndex) {
    const lines = code.split('\n');
    const queryLine = lines[lineIndex];

    // Pattern: SELECT ... FROM table
    const match = queryLine.match(/SELECT.*FROM\s+(\w+)/i);
    if (!match) return code;

    const tableName = match[1];

    // Agregar WHERE company_id = ?
    const fixed = queryLine.replace(
      /FROM\s+(\w+)/i,
      `FROM $1 WHERE $1.company_id = $\{req.user.company_id\}`
    );

    lines[lineIndex] = fixed;
    return lines.join('\n');
  }

  async addIDORProtection(leak) {
    // Agregar validación de company_id en endpoints de detalle
    const route = leak.endpoint; // Ej: /api/users/:id
    const routeFile = this.findRouteFile(route);

    const code = await fs.readFile(routeFile, 'utf-8');

    // Buscar router.get('/:id', ...)
    const idRouteMatch = code.match(/(router\.get\(['"`]\/:\w+['"`],.*?\{)/s);
    if (!idRouteMatch) return { autoFixable: false };

    // Agregar validación después del opening brace
    const protection = `
  // IDOR Protection: Validate company_id
  const resource = await Model.findOne({
    where: {
      id: req.params.id,
      company_id: req.user.company_id
    }
  });

  if (!resource) {
    return res.status(404).json({ error: 'Not found' });
  }
    `;

    const fixed = code.replace(idRouteMatch[0], idRouteMatch[0] + protection);
    await fs.writeFile(routeFile, fixed);

    return { applied: true, file: routeFile };
  }
}
```

## 🎯 SUCCESS CRITERIA

| Métrica | Target | Descripción |
|---------|--------|-------------|
| Data Leakage Rate | 0% | 0 registros filtrados entre empresas |
| Query Audit Score | 100% | Todas las queries incluyen company_id |
| IDOR Vulnerabilities | 0 | Todos los endpoints :id validados |
| JWT Tampering Blocked | 100% | Tokens modificados rechazados |
| Performance Degradation | <30% | Noisy neighbor no afecta >30% |
| Isolation Score | >95/100 | Score global de aislamiento |

## 🚀 NEXT STEPS

1. ✅ Crear MTOrchestrator.js
2. ✅ Implementar 6 testers de data isolation
3. ✅ Implementar 4 testers de performance isolation
4. ✅ Implementar DatabaseQueryAuditor
5. ✅ Crear tablas de logs multi-tenant
6. ✅ Crear dashboard de aislamiento real-time
7. ✅ Implementar auto-healing engine
8. ✅ Integrar con e2e-testing-advanced
9. ✅ Ejecutar primer test completo (50 empresas)
10. ✅ Generar reporte de aislamiento

**ESTIMACIÓN**: 3-4 días de desarrollo + 1 día de tuning
