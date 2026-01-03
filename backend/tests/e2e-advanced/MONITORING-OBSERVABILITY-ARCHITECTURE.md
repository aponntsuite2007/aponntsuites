# MONITORING & OBSERVABILITY DASHBOARD - Arquitectura Completa

## 🎯 OBJETIVO

Sistema de monitoreo y observabilidad completo que provee:
- **Real-Time APM** (Application Performance Monitoring)
- **Distributed Tracing** (seguimiento de requests end-to-end)
- **Error Tracking & Alerting** (detección proactiva de errores)
- **Business Metrics** (KPIs del negocio)
- **Logs Aggregation** (centralización de logs)
- **Auto-remediation** cuando se detectan anomalías

## 📊 LOS 3 PILARES DE OBSERVABILIDAD

### 1. METRICS (Métricas)
**Qué:**
- Datos numéricos agregados en el tiempo
- Ejemplos: requests/segundo, latency p95, error rate, CPU %

**Por qué:**
- Detectar tendencias y patrones
- Alertas basadas en thresholds
- Dashboards históricos

**Implementación:**
```javascript
// Prometheus-style metrics
const metrics = {
  http_requests_total: new Counter('http_requests_total', 'Total HTTP requests', ['method', 'route', 'status']),
  http_request_duration: new Histogram('http_request_duration_ms', 'HTTP request duration', ['method', 'route']),
  active_users: new Gauge('active_users', 'Currently active users'),
  db_connections: new Gauge('db_connections_active', 'Active database connections')
};

// Middleware para capturar métricas
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.http_requests_total.inc({ method: req.method, route: req.route?.path, status: res.statusCode });
    metrics.http_request_duration.observe({ method: req.method, route: req.route?.path }, duration);
  });

  next();
});
```

---

### 2. LOGS (Registros)
**Qué:**
- Eventos discretos con timestamp
- Ejemplos: "User logged in", "Payment failed", "DB query slow"

**Por qué:**
- Debugging de incidentes específicos
- Audit trail (compliance)
- Context-rich information

**Implementación:**
```javascript
// Structured logging con Winston
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Uso
logger.info('User login', {
  userId: 123,
  companyId: 11,
  ip: '192.168.1.1',
  userAgent: 'Chrome/96.0'
});

logger.error('Database query failed', {
  query: 'SELECT * FROM users WHERE...',
  error: error.message,
  stack: error.stack,
  duration: 5000
});
```

---

### 3. TRACES (Trazas)
**Qué:**
- Seguimiento completo de un request a través de múltiples servicios
- Spans (etapas) con timings

**Por qué:**
- Identificar bottlenecks en flujos complejos
- Debugging distribuido
- Performance optimization

**Implementación:**
```javascript
// OpenTelemetry para distributed tracing
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('biometric-system');

async function createAttendance(data) {
  const span = tracer.startSpan('createAttendance');
  span.setAttribute('user.id', data.userId);
  span.setAttribute('company.id', data.companyId);

  try {
    // Sub-span: Validación
    const validateSpan = tracer.startSpan('validateAttendance', { parent: span });
    await validateAttendanceData(data);
    validateSpan.end();

    // Sub-span: DB Insert
    const dbSpan = tracer.startSpan('db.insert', { parent: span });
    const result = await db.attendances.create(data);
    dbSpan.setAttribute('db.rows_affected', 1);
    dbSpan.end();

    // Sub-span: Send notification
    const notifSpan = tracer.startSpan('notification.send', { parent: span });
    await sendAttendanceNotification(result);
    notifSpan.end();

    span.setStatus({ code: SpanStatusCode.OK });
    return result;

  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

---

## 🎨 ARQUITECTURA DEL DASHBOARD

```
┌─────────────────────────────────────────────────────────────┐
│              MONITORING & OBSERVABILITY SYSTEM               │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► 1. METRICS COLLECTOR
             │   ├─ HTTP Metrics (requests, latency, errors)
             │   ├─ System Metrics (CPU, memory, disk)
             │   ├─ Database Metrics (connections, queries/s, slow queries)
             │   ├─ Business Metrics (users activos, logins/día, attendances/día)
             │   └─ Custom Metrics (por módulo)
             │
             ├─► 2. LOGS AGGREGATOR
             │   ├─ Winston logger (structured JSON logs)
             │   ├─ Log levels (error, warn, info, debug)
             │   ├─ Log rotation (max 100MB por archivo, 14 días retention)
             │   ├─ Correlation IDs (trace requests end-to-end)
             │   └─ ELK Stack integration (Elasticsearch, Logstash, Kibana)
             │
             ├─► 3. DISTRIBUTED TRACING
             │   ├─ OpenTelemetry SDK
             │   ├─ Automatic instrumentation (Express, Sequelize, pg)
             │   ├─ Custom spans (business logic)
             │   ├─ Trace context propagation
             │   └─ Jaeger UI para visualizar traces
             │
             ├─► 4. ERROR TRACKING
             │   ├─ Sentry integration (error aggregation)
             │   ├─ Source maps para stack traces
             │   ├─ Release tracking
             │   ├─ User context (quién tuvo el error)
             │   └─ Email/Slack alerts en errores críticos
             │
             ├─► 5. REAL-TIME DASHBOARD (Frontend)
             │   ├─ Panel 1: System Health (CPU, memory, DB)
             │   ├─ Panel 2: HTTP Metrics (req/s, latency, errors)
             │   ├─ Panel 3: Business KPIs (usuarios activos, revenue)
             │   ├─ Panel 4: Slow Queries (top 10 queries lentas)
             │   ├─ Panel 5: Error Rate (últimas 24h)
             │   ├─ Panel 6: Active Traces (requests en curso)
             │   └─ WebSocket live updates cada 2s
             │
             └─► 6. ALERTING & AUTO-REMEDIATION
                 ├─ Alertas críticas (error rate >5%, p95 >2s, DB down)
                 ├─ Auto-restart en crash
                 ├─ Auto-scaling DB connections en carga alta
                 ├─ Auto-clear cache en errores de memoria
                 └─ Notificaciones (email, Slack, SMS)

```

## 🗄️ DATABASE SCHEMA

```sql
-- Tabla de métricas de sistema
CREATE TABLE system_metrics (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- HTTP metrics
  http_requests_total BIGINT,
  http_requests_per_second DECIMAL(10,2),
  http_avg_latency_ms INTEGER,
  http_p50_latency_ms INTEGER,
  http_p95_latency_ms INTEGER,
  http_p99_latency_ms INTEGER,
  http_error_rate DECIMAL(5,2), -- %

  -- System metrics
  cpu_usage_percent DECIMAL(5,2),
  memory_used_mb INTEGER,
  memory_total_mb INTEGER,
  memory_usage_percent DECIMAL(5,2),
  disk_used_gb INTEGER,
  disk_total_gb INTEGER,

  -- Database metrics
  db_connections_active INTEGER,
  db_connections_idle INTEGER,
  db_queries_per_second DECIMAL(10,2),
  db_slow_queries_count INTEGER, -- queries >1s
  db_deadlocks_count INTEGER,

  -- Business metrics
  active_users INTEGER,
  logins_last_hour INTEGER,
  attendances_created_today INTEGER,
  companies_active INTEGER,

  INDEX idx_timestamp (timestamp DESC)
);

-- Particionado por fecha (1 partición por día)
CREATE TABLE system_metrics_2025_12_25 PARTITION OF system_metrics
FOR VALUES FROM ('2025-12-25') TO ('2025-12-26');

-- Tabla de logs centralizados
CREATE TABLE application_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level VARCHAR(10), -- 'error', 'warn', 'info', 'debug'
  message TEXT,
  correlation_id UUID, -- Trace ID
  user_id INTEGER,
  company_id INTEGER,
  request_method VARCHAR(10),
  request_url VARCHAR(255),
  response_status INTEGER,
  response_time_ms INTEGER,
  error_stack TEXT,
  context JSONB, -- Datos adicionales

  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_level (level),
  INDEX idx_correlation (correlation_id)
);

-- Tabla de traces (distributed tracing)
CREATE TABLE distributed_traces (
  id BIGSERIAL PRIMARY KEY,
  trace_id UUID NOT NULL,
  span_id UUID NOT NULL,
  parent_span_id UUID,
  operation_name VARCHAR(100),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  status VARCHAR(20), -- 'OK', 'ERROR'
  attributes JSONB, -- Metadata del span

  INDEX idx_trace_id (trace_id),
  INDEX idx_span_id (span_id),
  INDEX idx_duration (duration_ms DESC)
);

-- Tabla de alertas
CREATE TABLE monitoring_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type VARCHAR(50), -- 'error_rate_high', 'latency_high', 'db_down', etc.
  severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  status VARCHAR(20), -- 'active', 'resolved', 'acknowledged'
  message TEXT,
  context JSONB,
  auto_remediation_applied BOOLEAN DEFAULT false,
  remediation_action TEXT,

  INDEX idx_status (status),
  INDEX idx_triggered_at (triggered_at DESC)
);
```

## 📡 REAL-TIME METRICS API

### GET /api/monitoring/metrics/current
Retorna métricas del último minuto:

```javascript
{
  "timestamp": "2025-12-25T10:30:00Z",
  "http": {
    "requestsPerSecond": 156.7,
    "avgLatencyMs": 45,
    "p95LatencyMs": 178,
    "p99LatencyMs": 523,
    "errorRate": 0.19 // %
  },
  "system": {
    "cpuUsage": 67.3,
    "memoryUsageMb": 1247,
    "memoryUsagePercent": 45.2,
    "diskUsageGb": 23
  },
  "database": {
    "activeConnections": 23,
    "idleConnections": 7,
    "queriesPerSecond": 234.5,
    "slowQueriesCount": 3
  },
  "business": {
    "activeUsers": 147,
    "loginsLastHour": 89,
    "attendancesCreatedToday": 523
  }
}
```

### GET /api/monitoring/traces/active
Retorna traces activos (requests en curso):

```javascript
{
  "activeTraces": [
    {
      "traceId": "abc-123",
      "startTime": "2025-12-25T10:29:55Z",
      "duration": 5000, // ms (5s en curso)
      "operation": "POST /api/attendance",
      "userId": 123,
      "companyId": 11,
      "spans": [
        { "name": "validateAttendance", "duration": 50, "status": "OK" },
        { "name": "db.insert", "duration": 200, "status": "OK" },
        { "name": "notification.send", "duration": 4750, "status": "IN_PROGRESS" } // ← Bottleneck!
      ]
    }
  ]
}
```

### GET /api/monitoring/slow-queries
Top 10 queries más lentas (últimas 24h):

```javascript
{
  "slowQueries": [
    {
      "query": "SELECT * FROM users WHERE company_id = 11 AND active = true",
      "avgDuration": 2345, // ms
      "maxDuration": 5600,
      "executionCount": 147,
      "lastExecuted": "2025-12-25T10:25:00Z",
      "suggestion": "Add index on (company_id, active)"
    },
    {
      "query": "SELECT a.*, u.name FROM attendances a JOIN users u ON a.user_id = u.id",
      "avgDuration": 1890,
      "maxDuration": 3200,
      "executionCount": 523,
      "lastExecuted": "2025-12-25T10:29:45Z",
      "suggestion": "Consider materialized view or caching"
    }
  ]
}
```

### GET /api/monitoring/alerts/active
Alertas activas:

```javascript
{
  "activeAlerts": [
    {
      "id": 1,
      "type": "latency_high",
      "severity": "high",
      "triggeredAt": "2025-12-25T10:20:00Z",
      "message": "p95 latency exceeded 2s threshold (2345ms)",
      "context": {
        "endpoint": "/api/attendance",
        "currentLatency": 2345,
        "threshold": 2000
      },
      "autoRemediationApplied": true,
      "remediationAction": "Increased DB connection pool from 20 to 30"
    }
  ]
}
```

## 📊 DASHBOARD FRONTEND COMPONENTS

### Panel 1: System Health
```javascript
// public/js/modules/monitoring-dashboard.js

class MonitoringDashboard {
  renderSystemHealth(metrics) {
    return `
      <div class="health-panel">
        <h3>System Health</h3>

        <!-- CPU Gauge -->
        <div class="gauge">
          <canvas id="cpuGauge"></canvas>
          <span class="gauge-label">CPU: ${metrics.system.cpuUsage}%</span>
        </div>

        <!-- Memory Gauge -->
        <div class="gauge">
          <canvas id="memoryGauge"></canvas>
          <span class="gauge-label">Memory: ${metrics.system.memoryUsagePercent}%</span>
        </div>

        <!-- DB Connections Gauge -->
        <div class="gauge">
          <canvas id="dbGauge"></canvas>
          <span class="gauge-label">DB: ${metrics.database.activeConnections}/50</span>
        </div>

        <!-- Status Indicator -->
        <div class="status-indicator ${this.getHealthStatus(metrics)}">
          ${this.getHealthStatus(metrics) === 'healthy' ? '✅ Healthy' : '⚠️ Degraded'}
        </div>
      </div>
    `;
  }

  getHealthStatus(metrics) {
    if (metrics.system.cpuUsage > 80 || metrics.system.memoryUsagePercent > 90) {
      return 'degraded';
    }
    if (metrics.http.errorRate > 5) {
      return 'unhealthy';
    }
    return 'healthy';
  }

  // Chart.js gauges
  renderCPUGauge(cpuUsage) {
    new Chart(document.getElementById('cpuGauge'), {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [cpuUsage, 100 - cpuUsage],
          backgroundColor: [
            cpuUsage > 80 ? '#ff4444' : cpuUsage > 60 ? '#ffaa00' : '#44ff44',
            '#e0e0e0'
          ],
          borderWidth: 0
        }]
      },
      options: {
        circumference: 180,
        rotation: 270,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }
}
```

### Panel 2: Request Timeline (Distributed Tracing Visualization)
```javascript
renderTraceTimeline(trace) {
  return `
    <div class="trace-timeline">
      <h4>Trace: ${trace.traceId}</h4>
      <div class="timeline">
        ${trace.spans.map(span => `
          <div class="span" style="
            left: ${(span.startOffset / trace.totalDuration) * 100}%;
            width: ${(span.duration / trace.totalDuration) * 100}%;
            background: ${span.status === 'ERROR' ? 'red' : 'green'};
          ">
            <span class="span-label">${span.name} (${span.duration}ms)</span>
          </div>
        `).join('')}
      </div>
      <div class="trace-summary">
        Total: ${trace.totalDuration}ms
        | Spans: ${trace.spans.length}
        | Status: ${trace.status}
      </div>
    </div>
  `;
}
```

### Panel 3: Error Rate Chart (Time Series)
```javascript
renderErrorRateChart(data) {
  // data = [{ timestamp, errorRate }, ...]
  new Chart(document.getElementById('errorRateChart'), {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
      datasets: [{
        label: 'Error Rate (%)',
        data: data.map(d => d.errorRate),
        borderColor: '#ff4444',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          title: { display: true, text: 'Error Rate (%)' }
        }
      },
      plugins: {
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              yMin: 5,
              yMax: 5,
              borderColor: 'red',
              borderWidth: 2,
              label: {
                content: 'Threshold: 5%',
                enabled: true
              }
            }
          }
        }
      }
    }
  });
}
```

## 🔔 ALERTING RULES

### Rule 1: Error Rate High
```javascript
// Trigger: Error rate > 5% por más de 5 minutos
{
  name: 'error_rate_high',
  condition: (metrics) => metrics.http.errorRate > 5,
  duration: 300000, // 5 min
  severity: 'critical',
  actions: [
    'sendEmail',
    'sendSlack',
    'autoRestart' // Si error rate > 20%
  ]
}
```

### Rule 2: Latency High
```javascript
{
  name: 'latency_high',
  condition: (metrics) => metrics.http.p95LatencyMs > 2000,
  duration: 120000, // 2 min
  severity: 'high',
  actions: [
    'sendSlack',
    'increasDBConnectionPool',
    'enableCaching'
  ]
}
```

### Rule 3: Database Down
```javascript
{
  name: 'database_down',
  condition: (metrics) => metrics.database.activeConnections === 0,
  duration: 0, // Inmediato
  severity: 'critical',
  actions: [
    'sendEmail',
    'sendSMS',
    'sendSlack',
    'attemptDBReconnect',
    'failoverToReplica' // Si disponible
  ]
}
```

### Rule 4: Memory Leak Detected
```javascript
{
  name: 'memory_leak',
  condition: (metrics, history) => {
    // Memoria crece >5% por hora consistentemente
    const last6Hours = history.slice(-360); // 6h * 60min
    const growthRate = (last6Hours[last6Hours.length - 1].memoryUsageMb - last6Hours[0].memoryUsageMb) / 6;
    return growthRate > 50; // >50MB/hora
  },
  duration: 0,
  severity: 'high',
  actions: [
    'sendSlack',
    'logMemorySnapshot',
    'scheduleRestart' // Restart en ventana de mantenimiento
  ]
}
```

## 🔄 AUTO-REMEDIATION ACTIONS

```javascript
class AutoRemediator {
  async handleHighLatency(alert) {
    // 1. Identificar bottleneck
    const slowQueries = await this.getSlowQueries();

    if (slowQueries.length > 0) {
      // Bottleneck: Database
      console.log('🔧 Increasing DB connection pool...');
      await this.increaseDBPool(currentSize => currentSize + 10);
      return { action: 'increased_db_pool', success: true };
    }

    // 2. Verificar cache hit rate
    const cacheHitRate = await this.getCacheHitRate();
    if (cacheHitRate < 50) {
      // Cache ineficiente
      console.log('🔧 Enabling aggressive caching...');
      await this.enableAggressiveCaching();
      return { action: 'enabled_caching', success: true };
    }

    // 3. CPU-bound?
    const cpuUsage = await this.getCPUUsage();
    if (cpuUsage > 80) {
      console.log('🔧 CPU-bound - scaling horizontally...');
      await this.scaleHorizontally();
      return { action: 'horizontal_scaling', success: true };
    }

    return { action: 'none', reason: 'bottleneck not identified' };
  }

  async handleHighErrorRate(alert) {
    // 1. Analizar tipo de errores
    const errorTypes = await this.getErrorBreakdown();

    if (errorTypes['DatabaseError'] > 50) {
      // Mayoría son errores de DB
      console.log('🔧 DB errors detected - checking connection...');
      await this.reconnectDatabase();
      return { action: 'db_reconnect', success: true };
    }

    if (errorTypes['ValidationError'] > 50) {
      // Errores de validación (posible ataque)
      console.log('🔧 Validation errors spike - enabling rate limiting...');
      await this.enableStrictRateLimiting();
      return { action: 'rate_limiting_enabled', success: true };
    }

    if (errorTypes['TimeoutError'] > 50) {
      // Timeouts (carga alta)
      console.log('🔧 Timeouts detected - increasing timeouts + scaling...');
      await this.increaseTimeouts();
      await this.scaleHorizontally();
      return { action: 'increased_timeouts_and_scaled', success: true };
    }

    // Error rate alto pero no claro por qué → restart
    if (alert.context.errorRate > 20) {
      console.log('🔧 Critical error rate - scheduling restart...');
      await this.scheduleGracefulRestart(60000); // En 1 min
      return { action: 'scheduled_restart', success: true };
    }

    return { action: 'none', reason: 'error type unclear' };
  }

  async handleMemoryLeak(alert) {
    // 1. Capturar heap snapshot
    const heapDump = await this.captureHeapSnapshot();
    console.log(`🔧 Heap dump saved: ${heapDump.path}`);

    // 2. Analizar objetos grandes
    const leaks = await this.analyzeHeapDump(heapDump);
    console.log('Potential leaks:', leaks);

    // 3. Clear caches si están muy grandes
    const cacheSize = await this.getCacheSize();
    if (cacheSize > 500 * 1024 * 1024) { // >500MB
      console.log('🔧 Cache too large - clearing...');
      await this.clearCache();
    }

    // 4. Restart programado (ventana mantenimiento)
    const nextMaintenanceWindow = this.getNextMaintenanceWindow();
    console.log(`🔧 Restart scheduled for ${nextMaintenanceWindow}`);
    await this.scheduleRestart(nextMaintenanceWindow);

    return { action: 'memory_leak_mitigated', heapDump: heapDump.path };
  }
}
```

## 🎯 SUCCESS CRITERIA

| Métrica | Target | Descripción |
|---------|--------|-------------|
| Monitoring Coverage | 100% | Todas las rutas instrumentadas |
| Alert Response Time | <1 min | Alertas enviadas en <1 min |
| Dashboard Load Time | <2s | Dashboard carga en <2s |
| Logs Retention | 30 días | Logs guardados por 30 días |
| Trace Sampling | 10% | 10% de requests traced |
| Auto-Remediation Success | >70% | >70% de alertas auto-resueltas |
| Dashboard Uptime | >99.9% | Dashboard disponible 99.9% |

## 🚀 NEXT STEPS

1. ✅ Instalar dependencias (winston, opentelemetry, sentry)
2. ✅ Configurar Winston logger (structured logging)
3. ✅ Configurar OpenTelemetry (auto-instrumentation)
4. ✅ Integrar Sentry (error tracking)
5. ✅ Crear tablas de métricas y logs
6. ✅ Implementar MetricsCollector
7. ✅ Implementar LogsAggregator
8. ✅ Implementar DistributedTracing
9. ✅ Crear dashboard frontend (6 paneles)
10. ✅ Implementar alerting rules
11. ✅ Implementar auto-remediation engine
12. ✅ Integrar con e2e-testing-advanced

**ESTIMACIÓN**: 5-6 días de desarrollo + 2 días de tuning

## 📚 STACK TECNOLÓGICO

| Componente | Tecnología | Por qué |
|------------|------------|---------|
| Logs | Winston | Structured logging, rotación automática |
| Metrics | prom-client | Prometheus-style metrics, compatible con Grafana |
| Tracing | OpenTelemetry | Standard industry, auto-instrumentation |
| Error Tracking | Sentry | Agregación, source maps, alertas |
| Time-Series DB | PostgreSQL + TimescaleDB | Almacenar métricas históricas |
| Dashboard | Chart.js + WebSocket | Real-time updates, gráficos interactivos |
| Alerting | Nodemailer + Slack SDK | Email y Slack notifications |
