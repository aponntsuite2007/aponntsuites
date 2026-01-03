# LOAD TESTING SYSTEM - Arquitectura Completa

## 🎯 OBJETIVO
Sistema de pruebas de carga integrado con e2e-testing-advanced que valida:
- Performance bajo 100-5000 usuarios concurrentes
- Tiempos de respuesta <2s (p95)
- CPU/Memory bajo carga
- Database connection pooling
- Auto-healing cuando se detectan degradaciones

## 📊 ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                    LOAD TESTING ORCHESTRATOR                 │
│  (backend/tests/e2e-advanced/load/LoadTestOrchestrator.js)  │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► 1. SCENARIO GENERATOR
             │   ├─ Real user flows (login → CRUD → logout)
             │   ├─ Multi-tenant (50 empresas paralelas)
             │   └─ Realistic delays (think time 1-5s)
             │
             ├─► 2. LOAD GENERATORS (Artillery.io)
             │   ├─ Ramp-up: 0→500 users en 2min
             │   ├─ Sustain: 500 users por 10min
             │   ├─ Spike: 500→2000 users en 30s
             │   └─ Soak: 200 users por 1 hora
             │
             ├─► 3. METRICS COLLECTOR
             │   ├─ Response times (p50, p95, p99)
             │   ├─ Throughput (req/s)
             │   ├─ Error rate (%)
             │   ├─ CPU/Memory (Node.js + PostgreSQL)
             │   └─ Database metrics (connections, queries/s)
             │
             ├─► 4. REAL-TIME DASHBOARD
             │   ├─ WebSocket streaming a frontend
             │   ├─ Grafana-style charts
             │   ├─ Auto-refresh cada 2s
             │   └─ Alertas en tiempo real
             │
             └─► 5. AUTO-HEALING ENGINE
                 ├─ Detecta degradación (p95 >2s)
                 ├─ Identifica bottleneck (CPU/DB/Network)
                 ├─ Aplica fix (increase pool, cache, index)
                 └─ Re-ejecuta test para validar

## 🔧 TECH STACK

### Load Generation
- **Artillery.io** (Node.js native)
  - YAML scenarios fáciles de mantener
  - Plugins para metrics custom
  - Integración con Express/PostgreSQL

### Metrics Storage
- **PostgreSQL** (tabla: load_test_metrics)
  - TimescaleDB extension (opcional)
  - Particionado por test_run_id
  - Retención 90 días

### Real-Time Streaming
- **WebSocket** (Socket.io)
  - Server: backend/tests/e2e-advanced/load/MetricsStreamServer.js
  - Client: public/js/modules/load-testing-dashboard.js
  - Broadcast cada 500ms

### Dashboard Frontend
- **Chart.js** (vanilla JS)
  - Line charts (response time over time)
  - Bar charts (throughput)
  - Gauge charts (CPU/Memory %)
  - Table (top 10 slowest endpoints)

## 📁 ESTRUCTURA DE ARCHIVOS

```
backend/tests/e2e-advanced/
├── load/
│   ├── LoadTestOrchestrator.js          # Orchestrator principal
│   ├── scenarios/
│   │   ├── attendance-crud.yml          # Artillery scenario: CRUD asistencias
│   │   ├── multi-tenant-isolation.yml   # 50 empresas simultáneas
│   │   ├── login-spike.yml              # Spike de logins
│   │   └── dashboard-soak.yml           # Soak test dashboard
│   ├── collectors/
│   │   ├── ResponseTimeCollector.js     # Mide latencias
│   │   ├── ResourceCollector.js         # CPU/Memory
│   │   └── DatabaseCollector.js         # PostgreSQL metrics
│   ├── healers/
│   │   ├── DatabaseIndexHealer.js       # Crea indexes faltantes
│   │   ├── CacheHealer.js               # Activa caching
│   │   └── PoolSizeHealer.js            # Ajusta connection pool
│   ├── MetricsStreamServer.js           # WebSocket server
│   └── load-testing-config.js           # Configuración
│
├── migrations/
│   └── 20251225_create_load_test_metrics.sql
│
└── routes/
    └── loadTestingRoutes.js             # API REST

public/js/modules/
└── load-testing-dashboard.js            # Frontend dashboard
```

## 🗄️ DATABASE SCHEMA

```sql
-- Tabla principal de métricas
CREATE TABLE load_test_metrics (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  test_type VARCHAR(50), -- 'ramp-up', 'spike', 'soak'
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Response time metrics
  response_time_p50 INTEGER, -- ms
  response_time_p95 INTEGER,
  response_time_p99 INTEGER,
  response_time_max INTEGER,

  -- Throughput metrics
  requests_per_second DECIMAL(10,2),
  total_requests INTEGER,
  successful_requests INTEGER,
  failed_requests INTEGER,
  error_rate DECIMAL(5,2), -- %

  -- Resource metrics
  cpu_usage DECIMAL(5,2), -- %
  memory_usage_mb INTEGER,
  memory_usage_percent DECIMAL(5,2),

  -- Database metrics
  db_connections_active INTEGER,
  db_connections_idle INTEGER,
  db_queries_per_second DECIMAL(10,2),
  db_slowest_query_ms INTEGER,

  -- Test context
  concurrent_users INTEGER,
  scenario_name VARCHAR(100),
  endpoint VARCHAR(255),

  -- Status
  status VARCHAR(20), -- 'running', 'passed', 'failed', 'degraded'
  bottleneck VARCHAR(100), -- 'database', 'cpu', 'memory', 'network', null
  auto_fix_applied BOOLEAN DEFAULT false,

  INDEX idx_test_run (test_run_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_status (status)
);

-- Tabla de fixes aplicados
CREATE TABLE load_test_fixes (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  bottleneck VARCHAR(100),
  fix_type VARCHAR(50), -- 'index_created', 'cache_enabled', 'pool_increased'
  fix_details JSONB,
  before_p95 INTEGER, -- ms
  after_p95 INTEGER,  -- ms
  improvement_percent DECIMAL(5,2)
);
```

## 🚀 LOAD TEST SCENARIOS

### Scenario 1: Ramp-Up (Baseline)
```yaml
# scenarios/attendance-crud.yml
config:
  target: "http://localhost:9998"
  phases:
    - duration: 120  # 2 minutos
      arrivalRate: 1
      rampTo: 10     # 0 → 10 users/s
    - duration: 300  # 5 minutos
      arrivalRate: 10 # Sostenido
  plugins:
    metrics-by-endpoint:
      stripQueryString: true

scenarios:
  - name: "Attendance CRUD Flow"
    weight: 100
    flow:
      - post:
          url: "/api/auth/login"
          json:
            companySlug: "isi"
            username: "admin"
            password: "admin123"
          capture:
            - json: "$.token"
              as: "authToken"

      - think: 2 # Pause 2s (realistic user)

      - get:
          url: "/api/attendance"
          headers:
            Authorization: "Bearer {{ authToken }}"

      - think: 1

      - post:
          url: "/api/attendance"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            user_id: "{{ $randomUUID }}"
            date: "2025-12-25"
            checkInTime: "08:00:00"
            status: "present"

      - think: 1

      - get:
          url: "/api/attendance/{{ $randomUUID }}"
          headers:
            Authorization: "Bearer {{ authToken }}"
```

### Scenario 2: Multi-Tenant Spike
```yaml
# scenarios/multi-tenant-isolation.yml
config:
  target: "http://localhost:9998"
  phases:
    - duration: 60
      arrivalRate: 50  # 50 empresas simultáneas

scenarios:
  - name: "Multi-Tenant Isolation"
    weight: 100
    flow:
      - function: "selectRandomCompany" # Custom JS
      - post:
          url: "/api/auth/login"
          json:
            companySlug: "{{ companySlug }}"
            username: "admin"
            password: "admin123"
      - get:
          url: "/api/attendance"
          afterResponse: "validateNoDataLeakage" # Custom validator
```

## 📡 REAL-TIME METRICS API

### GET /api/load-testing/stream
WebSocket endpoint que emite métricas cada 500ms:

```javascript
{
  "test_run_id": "abc-123",
  "timestamp": "2025-12-25T10:30:00Z",
  "currentUsers": 347,
  "metrics": {
    "responseTime": {
      "p50": 45,
      "p95": 178,
      "p99": 523,
      "max": 1205
    },
    "throughput": {
      "rps": 156.7,
      "total": 94020,
      "successful": 93845,
      "failed": 175,
      "errorRate": 0.19
    },
    "resources": {
      "cpu": 67.3,
      "memory": {
        "used": 1247,
        "percent": 45.2
      }
    },
    "database": {
      "activeConnections": 23,
      "idleConnections": 7,
      "qps": 234.5,
      "slowestQueryMs": 892
    }
  },
  "status": "degraded",
  "bottleneck": "database",
  "alert": {
    "level": "warning",
    "message": "p95 response time exceeded 2s threshold (2345ms)"
  }
}
```

## 🔄 AUTO-HEALING WORKFLOW

```javascript
// Pseudo-código del auto-healing
class LoadTestAutoHealer {
  async analyze(metrics) {
    if (metrics.responseTime.p95 > 2000) {
      const bottleneck = await this.identifyBottleneck(metrics);

      switch(bottleneck) {
        case 'database':
          // Query analysis
          const slowQueries = await this.getSlowQueries();
          for (const query of slowQueries) {
            if (this.isMissingIndex(query)) {
              await this.createIndex(query);
              await this.rerunTest();
            }
          }
          break;

        case 'cpu':
          // Check for inefficient loops
          await this.profileCPU();
          // Suggest caching
          await this.enableResponseCache();
          break;

        case 'memory':
          // Memory leak detection
          const leaks = await this.detectMemoryLeaks();
          await this.reportLeaks(leaks);
          break;
      }
    }
  }

  async identifyBottleneck(metrics) {
    if (metrics.database.slowestQueryMs > 1000) return 'database';
    if (metrics.resources.cpu > 80) return 'cpu';
    if (metrics.resources.memory.percent > 90) return 'memory';
    return 'network';
  }
}
```

## 🎯 SUCCESS CRITERIA

| Métrica | Target | Actual | Status |
|---------|--------|--------|--------|
| p95 Response Time | <2000ms | ? | Pending |
| p99 Response Time | <5000ms | ? | Pending |
| Error Rate | <1% | ? | Pending |
| Throughput | >100 req/s | ? | Pending |
| CPU Usage (sustained) | <70% | ? | Pending |
| Memory Growth | <5% per hour | ? | Pending |
| DB Connections | <80% pool | ? | Pending |

## 🚀 NEXT STEPS

1. ✅ Crear estructura de archivos
2. ✅ Implementar LoadTestOrchestrator.js
3. ✅ Crear scenarios Artillery
4. ✅ Implementar collectors (ResponseTime, Resource, Database)
5. ✅ Crear tabla load_test_metrics
6. ✅ Implementar WebSocket streaming
7. ✅ Crear dashboard frontend
8. ✅ Implementar auto-healing engine
9. ✅ Integrar con e2e-testing-control-v3.js
10. ✅ Ejecutar primer load test completo

**ESTIMACIÓN**: 3-4 días de desarrollo + 1 día de tuning
