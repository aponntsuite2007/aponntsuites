# 📋 ENGINEERING DASHBOARD - TAREAS PENDIENTES

**Fecha**: 2026-01-07
**Última actualización**: Sesión actual
**Estado**: Frontend 90% completo, Backend 40% completo

---

## ✅ COMPLETADO (Lo que ya funciona)

### 1. Frontend - Engineering Dashboard
- ✅ **Archivo**: `public/js/modules/engineering-dashboard.js` (2,880 líneas)
- ✅ **Integrado en**: `backend/public/panel-empresa.html`
- ✅ **5 Tabs implementados**:
  - Overview
  - Processes
  - Tickets (con filtros, stats, timeline)
  - Executions
  - Scheduler
- ✅ **CSS completo**: ~680 líneas de estilos
- ✅ **Event handlers**: Todos implementados
- ✅ **WebSocket client-side**: Setup completo (esperando servidor)

### 2. Backend - Brain Tickets API
- ✅ **Archivo**: `backend/src/routes/brainTicketsRoutes.js` (600+ líneas)
- ✅ **Integrado en**: `backend/server.js` (línea ~3200)
- ✅ **6 Endpoints operativos**:
  - `GET /api/brain/tickets` - Lista con filtros
  - `GET /api/brain/tickets/:id` - Detalles
  - `PATCH /api/brain/tickets/:id` - Actualizar
  - `POST /api/brain/tickets/:id/retry-repair` - Reintentar
  - `GET /api/brain/stats/summary` - Estadísticas
  - `POST /api/brain/tickets/:id/export-claude-code` - Exportar
- ✅ **Datos**: 20,973 tickets JSON existentes
- ✅ **Autenticación**: Middleware `auth` en todos los endpoints

### 3. Documentación
- ✅ **ENGINEERING-DASHBOARD-SYSTEM.md**: 500+ líneas (descripción completa)
- ✅ **EVALUACION-SISTEMA-DIAGNOSTICO.md**: Evaluación Brain + Tickets
- ✅ **PLAN-HIBRIDO-OPTIMO.md**: Plan de integración con herramientas

---

## ⏳ PENDIENTE (Lo que falta implementar)

### 🔴 PRIORIDAD ALTA - Backend APIs Críticas

#### 1. API de Ejecución de Procesos E2E
**Estado**: ❌ No implementado
**Endpoint**: `POST /api/e2e-advanced/run`

**¿Qué hace?**
Ejecuta uno o más procesos de testing (E2E, Load, Security, etc.) según la selección del usuario.

**Request Body Example**:
```json
{
  "processes": ["e2e-functional", "load-testing"],
  "modules": ["users", "attendance"],
  "config": {
    "headless": false,
    "timeout": 300000,
    "parallel": true,
    "generateReport": true
  }
}
```

**Response Example**:
```json
{
  "success": true,
  "executionId": "exec-1736294400000-ABC123",
  "status": "running",
  "startedAt": "2026-01-07T20:00:00.000Z",
  "processes": [
    {
      "id": "e2e-functional",
      "status": "running",
      "progress": 0
    },
    {
      "id": "load-testing",
      "status": "queued",
      "progress": 0
    }
  ]
}
```

**Implementación requerida**:
```javascript
// Archivo: backend/src/routes/e2eAdvancedRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const MasterTestOrchestrator = require('../testing/e2e-advanced/MasterTestOrchestrator');

router.post('/run', auth, async (req, res) => {
    try {
        const { processes, modules, config } = req.body;

        // Validaciones
        if (!processes || !Array.isArray(processes) || processes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Debes seleccionar al menos un proceso'
            });
        }

        // Crear instancia del orchestrator
        const orchestrator = new MasterTestOrchestrator();

        // Iniciar ejecución (en background)
        const execution = await orchestrator.run({
            processes,
            modules: modules || ['all'],
            config: {
                headless: config?.headless !== false,
                timeout: config?.timeout || 300000,
                parallel: config?.parallel !== false,
                generateReport: config?.generateReport !== false,
                companyId: req.user.companyId
            }
        });

        res.json({
            success: true,
            executionId: execution.id,
            status: execution.status,
            startedAt: execution.startedAt,
            processes: execution.processes
        });
    } catch (error) {
        console.error('❌ [E2E-ADVANCED] Error en /run:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
```

**Archivo a crear**: `backend/src/testing/e2e-advanced/MasterTestOrchestrator.js`
**Referencia**: Ver `backend/PLAN-HIBRIDO-OPTIMO.md` líneas 113-146

---

#### 2. API de Estado de Ejecución
**Estado**: ❌ No implementado
**Endpoint**: `GET /api/e2e-advanced/status/:executionId`

**Response Example**:
```json
{
  "success": true,
  "execution": {
    "id": "exec-1736294400000-ABC123",
    "status": "running",
    "progress": 45,
    "startedAt": "2026-01-07T20:00:00.000Z",
    "processes": [
      {
        "id": "e2e-functional",
        "name": "E2E Functional Testing",
        "status": "completed",
        "progress": 100,
        "score": 98,
        "duration": 120000,
        "results": {
          "total": 50,
          "passed": 49,
          "failed": 1
        }
      },
      {
        "id": "load-testing",
        "name": "Load & Performance Testing",
        "status": "running",
        "progress": 60,
        "currentPhase": "stress-test"
      }
    ]
  }
}
```

---

#### 3. API de Historial de Ejecuciones
**Estado**: ❌ No implementado
**Endpoint**: `GET /api/e2e-advanced/executions`

**Query params**:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `status` (all, running, completed, failed)

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "exec-1736294400000-ABC123",
      "status": "completed",
      "overallScore": 92,
      "startedAt": "2026-01-07T20:00:00.000Z",
      "completedAt": "2026-01-07T20:15:30.000Z",
      "duration": 930000,
      "processesRun": ["e2e-functional", "load-testing", "security"],
      "modulesRun": ["users", "attendance"]
    }
  ],
  "pagination": {
    "total": 245,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### 4. API de Listado de Procesos
**Estado**: ❌ No implementado
**Endpoint**: `GET /api/e2e-advanced/processes`

**Response Example**:
```json
{
  "success": true,
  "processes": [
    {
      "id": "e2e-functional",
      "name": "E2E Functional Testing",
      "weight": 0.25,
      "canRunAlone": true,
      "dependencies": [],
      "estimatedDuration": 120000,
      "phases": [
        {
          "id": "e2e-setup",
          "name": "Setup del ambiente",
          "brainVerify": true
        }
      ]
    }
  ]
}
```

**Implementación**: Retornar `getDefaultProcesses()` desde el frontend (ya definido en líneas 97-564 de engineering-dashboard.js)

---

### 🟡 PRIORIDAD MEDIA - WebSocket Server

#### 5. WebSocket Server para Updates en Tiempo Real
**Estado**: ❌ No implementado
**Path**: `/ws/engineering`

**¿Qué hace?**
Envía updates en tiempo real sobre:
- Estado de ejecuciones de tests
- Nuevos tickets generados
- Cambios de status en tickets
- Progress de procesos en ejecución

**Eventos que debe emitir**:

```javascript
// Conexión establecida
ws.send({
    type: 'connected',
    message: 'WebSocket Engineering conectado'
});

// Update de ejecución
ws.send({
    type: 'execution_update',
    executionId: 'exec-123',
    status: 'running',
    progress: 65,
    currentPhase: 'security-scan'
});

// Nuevo ticket creado
ws.send({
    type: 'ticket_created',
    ticket: {
        id: 'TKT-123',
        priority: 'high',
        module: 'users',
        title: '...'
    }
});

// Ticket actualizado
ws.send({
    type: 'ticket_updated',
    ticketId: 'TKT-123',
    changes: {
        status: 'in_progress',
        autoRepairAttempts: 2
    }
});
```

**Implementación**:
```javascript
// Archivo: backend/src/websocket/engineeringSocket.js

const { Server } = require('socket.io');

function setupEngineeringWebSocket(httpServer) {
    const io = new Server(httpServer, {
        path: '/ws/engineering',
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 [ENGINEERING-WS] Cliente conectado:', socket.id);

        socket.emit('connected', {
            message: 'WebSocket Engineering conectado',
            timestamp: new Date().toISOString()
        });

        // Escuchar solicitud de suscripción
        socket.on('subscribe', (data) => {
            const { executionId, companyId } = data;

            if (executionId) {
                socket.join(`execution:${executionId}`);
                console.log(`📡 Cliente ${socket.id} suscrito a execution:${executionId}`);
            }

            if (companyId) {
                socket.join(`company:${companyId}`);
                console.log(`📡 Cliente ${socket.id} suscrito a company:${companyId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 [ENGINEERING-WS] Cliente desconectado:', socket.id);
        });
    });

    return io;
}

module.exports = { setupEngineeringWebSocket };
```

**Integración en server.js**:
```javascript
// En backend/server.js, después de crear el servidor HTTP

const { setupEngineeringWebSocket } = require('./src/websocket/engineeringSocket');
const engineeringWS = setupEngineeringWebSocket(httpServer);

// Hacer disponible globalmente para que otros módulos puedan emitir eventos
app.set('engineeringWS', engineeringWS);
```

**Uso desde MasterTestOrchestrator**:
```javascript
// En backend/src/testing/e2e-advanced/MasterTestOrchestrator.js

const app = require('../../server'); // o pasar como parámetro

async updateProgress(executionId, progress, currentPhase) {
    const engineeringWS = app.get('engineeringWS');

    if (engineeringWS) {
        engineeringWS.to(`execution:${executionId}`).emit('execution_update', {
            type: 'execution_update',
            executionId,
            progress,
            currentPhase,
            timestamp: new Date().toISOString()
        });
    }
}
```

---

### 🟢 PRIORIDAD BAJA - Mejoras y Optimizaciones

#### 6. Integración con AutonomousRepairAgent
**Estado**: ⚠️ Parcial (endpoint existe pero no ejecuta)
**Archivo**: `backend/src/routes/brainTicketsRoutes.js` línea 303

**Qué falta**:
```javascript
// En POST /api/brain/tickets/:id/retry-repair

// ACTUALMENTE (línea 346):
// TODO: Aquí se debe ejecutar el AutonomousRepairAgent
console.log(`🤖 Iniciando AutonomousRepairAgent para ticket ${id}...`);

// DEBE SER:
const AutonomousRepairAgent = require('../brain/agents/AutonomousRepairAgent');
const agent = new AutonomousRepairAgent();

const repairResult = await agent.attemptRepair({
    ticketId: id,
    ticket: ticket,
    mode: 'automatic'
});

// Actualizar ticket con resultado
if (repairResult.success) {
    ticket.status = 'resolved';
    ticket.resolution = repairResult.resolution;
} else {
    ticket.technical.autoRepairAttempts++;
}

await fs.writeFile(filePath, JSON.stringify(ticket, null, 2));
```

**Archivo necesario**: `backend/src/brain/agents/AutonomousRepairAgent.js`
**Referencia**: Ver sistema Brain existente

---

#### 7. Scheduler de Ejecuciones Automáticas
**Estado**: ❌ No implementado (solo UI en frontend)
**Funcionalidad**: Programar ejecuciones periódicas de tests

**Implementación con cron**:
```javascript
// Archivo: backend/src/cron/engineeringScheduler.js

const cron = require('node-cron');
const MasterTestOrchestrator = require('../testing/e2e-advanced/MasterTestOrchestrator');

const scheduledJobs = new Map();

function scheduleJob(jobConfig) {
    const { id, schedule, processes, modules, config } = jobConfig;

    // Crear cron job
    const job = cron.schedule(schedule, async () => {
        console.log(`⏰ [SCHEDULER] Ejecutando job programado: ${id}`);

        const orchestrator = new MasterTestOrchestrator();
        await orchestrator.run({
            processes,
            modules,
            config
        });
    });

    scheduledJobs.set(id, { job, config: jobConfig });

    console.log(`✅ [SCHEDULER] Job ${id} programado: ${schedule}`);
}

function stopJob(jobId) {
    const scheduled = scheduledJobs.get(jobId);

    if (scheduled) {
        scheduled.job.stop();
        scheduledJobs.delete(jobId);
        console.log(`🛑 [SCHEDULER] Job ${jobId} detenido`);
    }
}

module.exports = { scheduleJob, stopJob };
```

**API requerida**:
- `POST /api/e2e-advanced/scheduler/jobs` - Crear job programado
- `GET /api/e2e-advanced/scheduler/jobs` - Listar jobs
- `DELETE /api/e2e-advanced/scheduler/jobs/:id` - Eliminar job
- `POST /api/e2e-advanced/scheduler/jobs/:id/toggle` - Activar/desactivar

---

#### 8. Base de Datos para Persistencia
**Estado**: ❌ No implementado
**Necesidad**: Guardar ejecuciones, resultados, configuración

**Tablas requeridas**:

```sql
-- Tabla de ejecuciones
CREATE TABLE e2e_advanced_executions (
    id VARCHAR(100) PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    status VARCHAR(50) NOT NULL, -- running, completed, failed, cancelled
    overall_score INTEGER,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration INTEGER, -- en milisegundos
    config JSONB,
    processes_run TEXT[],
    modules_run TEXT[],
    created_by INTEGER REFERENCES users(id)
);

-- Tabla de resultados por proceso
CREATE TABLE e2e_test_results_detailed (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(100) REFERENCES e2e_advanced_executions(id),
    process_id VARCHAR(50) NOT NULL,
    process_name VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL,
    score INTEGER,
    duration INTEGER,
    results JSONB, -- { total, passed, failed, details }
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de confidence scores
CREATE TABLE e2e_confidence_scores (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(100) REFERENCES e2e_advanced_executions(id),
    process_id VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    weight DECIMAL(3,2) NOT NULL,
    contribution DECIMAL(5,2), -- score * weight
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de jobs programados
CREATE TABLE e2e_scheduled_jobs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(200) NOT NULL,
    schedule VARCHAR(100) NOT NULL, -- cron expression
    processes TEXT[] NOT NULL,
    modules TEXT[],
    config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);
```

**Migración**: `backend/migrations/20260107_create_e2e_advanced_tables.sql`

---

#### 9. Dashboard de Estadísticas
**Estado**: ⚠️ Frontend existe, falta backend
**Endpoint**: `GET /api/e2e-advanced/stats`

**Response Example**:
```json
{
  "success": true,
  "stats": {
    "totalExecutions": 245,
    "last30Days": {
      "executions": 45,
      "avgScore": 92.5,
      "successRate": 0.95
    },
    "byProcess": {
      "e2e-functional": {
        "executions": 120,
        "avgScore": 98,
        "avgDuration": 125000
      }
    },
    "trends": {
      "scoreImprovement": 2.5, // +2.5% vs mes anterior
      "failureRate": 0.05
    }
  }
}
```

---

### 📦 DEPENDENCIAS NECESARIAS

**Backend**:
```bash
npm install --save socket.io  # WebSocket
npm install --save node-cron  # Scheduler
npm install --save playwright  # E2E testing (ya instalado)
```

**Frontend**: Ya tiene todo lo necesario

---

## 📂 ESTRUCTURA DE ARCHIVOS FINAL

```
backend/
├── src/
│   ├── routes/
│   │   ├── brainTicketsRoutes.js ✅ COMPLETADO
│   │   └── e2eAdvancedRoutes.js ❌ PENDIENTE
│   │
│   ├── testing/e2e-advanced/
│   │   ├── MasterTestOrchestrator.js ❌ PENDIENTE
│   │   ├── phases/
│   │   │   ├── PhaseInterface.js ❌ PENDIENTE
│   │   │   ├── E2EPhase.js ❌ PENDIENTE
│   │   │   ├── LoadPhase.js ❌ PENDIENTE
│   │   │   ├── SecurityPhase.js ❌ PENDIENTE
│   │   │   ├── MultiTenantPhase.js ❌ PENDIENTE
│   │   │   ├── DatabasePhase.js ❌ PENDIENTE
│   │   │   ├── MonitoringPhase.js ❌ PENDIENTE
│   │   │   └── EdgeCasesPhase.js ❌ PENDIENTE
│   │   │
│   │   ├── core/
│   │   │   ├── DependencyManager.js ❌ PENDIENTE
│   │   │   ├── ResultsAggregator.js ❌ PENDIENTE
│   │   │   ├── ConfidenceCalculator.js ❌ PENDIENTE
│   │   │   └── WebSocketManager.js ❌ PENDIENTE
│   │   │
│   │   └── wrappers/
│   │       ├── PlaywrightWrapper.js ❌ PENDIENTE
│   │       ├── K6Wrapper.js ❌ PENDIENTE
│   │       ├── ZAPWrapper.js ❌ PENDIENTE
│   │       └── PgTAPWrapper.js ❌ PENDIENTE
│   │
│   ├── websocket/
│   │   └── engineeringSocket.js ❌ PENDIENTE
│   │
│   └── cron/
│       └── engineeringScheduler.js ❌ PENDIENTE
│
├── migrations/
│   └── 20260107_create_e2e_advanced_tables.sql ❌ PENDIENTE
│
└── public/js/modules/
    └── engineering-dashboard.js ✅ COMPLETADO

```

---

## 🎯 ROADMAP DE IMPLEMENTACIÓN

### Sprint 1 (5-7 días) - MVP Backend
**Objetivo**: Sistema funcional mínimo

1. **Día 1-2**: Crear `MasterTestOrchestrator.js` básico
2. **Día 3**: Crear `e2eAdvancedRoutes.js` con endpoints básicos
3. **Día 4**: Implementar `E2EPhase.js` con Playwright wrapper
4. **Día 5-6**: Implementar WebSocket server
5. **Día 7**: Testing E2E del flujo completo

### Sprint 2 (5-7 días) - Processes Completos
**Objetivo**: 7 procesos de testing funcionando

1. **Día 1**: LoadPhase (k6 wrapper)
2. **Día 2**: SecurityPhase (ZAP wrapper)
3. **Día 3**: MultiTenantPhase
4. **Día 4**: DatabasePhase (pgTAP wrapper)
5. **Día 5**: MonitoringPhase
6. **Día 6**: EdgeCasesPhase
7. **Día 7**: Testing completo de todos los procesos

### Sprint 3 (3-4 días) - Base de Datos y Scheduler
**Objetivo**: Persistencia y programación

1. **Día 1**: Crear migraciones de BD
2. **Día 2**: Implementar scheduler de jobs
3. **Día 3**: API de scheduler
4. **Día 4**: Testing y ajustes

### Sprint 4 (2-3 días) - Integración y Polish
**Objetivo**: Sistema production-ready

1. **Día 1**: Integración con AutonomousRepairAgent
2. **Día 2**: Dashboard de estadísticas
3. **Día 3**: Testing final y documentación

---

## 📝 NOTAS IMPORTANTES

### Para la Próxima Sesión de Claude Code

1. **Frontend está 90% listo**: Solo necesita que el backend responda correctamente
2. **Brain Tickets API funciona**: Puede testear con 20,973 tickets existentes
3. **Prioridad #1**: Implementar `MasterTestOrchestrator.js` y `e2eAdvancedRoutes.js`
4. **Referencia clave**: Archivo `PLAN-HIBRIDO-OPTIMO.md` tiene toda la arquitectura definida
5. **No reinventar la rueda**: Usar wrappers de herramientas (Playwright, k6, ZAP) en vez de código custom

### Testing Rápido

```bash
# Verificar que Brain Tickets API funciona
curl http://localhost:9998/api/brain/stats/summary -H "Authorization: Bearer <token>"

# Ver tickets filtrados
curl "http://localhost:9998/api/brain/tickets?status=open&priority=critical" -H "Authorization: Bearer <token>"
```

### Comandos Útiles

```bash
# Reiniciar servidor
cd backend && PORT=9998 npm start

# Ver logs en tiempo real
tail -f backend/logs/server.log

# Ejecutar migración de BD (cuando esté lista)
psql -U postgres -d attendance_system -f backend/migrations/20260107_create_e2e_advanced_tables.sql
```

---

## 🔥 RESUMEN EJECUTIVO

**Completado (40%)**:
- ✅ Frontend Engineering Dashboard (2,880 líneas)
- ✅ Brain Tickets API (6 endpoints, 20,973 tickets)
- ✅ Documentación completa
- ✅ Integración en panel-empresa.html

**Falta implementar (60%)**:
- ❌ E2E Advanced Run API (4 endpoints críticos)
- ❌ MasterTestOrchestrator + 7 Phases
- ❌ WebSocket server (/ws/engineering)
- ❌ Base de datos (4 tablas)
- ❌ Scheduler de jobs
- ❌ Integración con AutonomousRepairAgent

**Tiempo estimado restante**: 15-21 días de trabajo

**Confidence actual**: 40% production-ready
**Confidence al completar**: 95% production-ready

---

**FIN DEL DOCUMENTO DE PENDIENTES**
**Archivo generado**: 2026-01-07
**Por**: Claude Code Assistant
