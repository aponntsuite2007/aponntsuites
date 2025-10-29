# 🔄 CICLO VIRTUOSO AUTOMÁTICO: Ollama + Claude Code

## 📋 CONCEPTO

Sistema completamente automático de test → diagnóstico → reparación → re-test que permite alcanzar 100% de éxito sin intervención manual.

## 🎯 CÓMO FUNCIONA

```
┌─────────────────────────────────────────────────────────────┐
│  1. TESTING AUTOMÁTICO (Puppeteer + PostgreSQL)            │
│     • FrontendCollector: Tests visuales de UI               │
│     • DatabaseCollector: Tests de integridad BD             │
│     • EndpointCollector: Tests de API                       │
│     • IntegrationCollector: Tests de flujos                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. GENERACIÓN DE REPORTE DETALLADO                         │
│     • AUDIT-REPORT.md con análisis de Ollama                │
│     • Categorización: Crítico/Alto/Medio/Bajo               │
│     • Snapshots MD5 de código                               │
│     • Sugerencias específicas de solución                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. NOTIFICACIÓN AUTOMÁTICA A CLAUDE CODE ⭐ NUEVO          │
│     • Escribe: .claude-notifications/latest-report.json     │
│     • Claude Code monitorea este archivo                    │
│     • Detecta cambios automáticamente                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. CLAUDE CODE LEE Y REPARA                                │
│     • Lee AUDIT-REPORT.md completo                          │
│     • Prioriza errores CRÍTICOS                             │
│     • Aplica fixes sistemáticamente                         │
│     • Documenta cada cambio                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. CONFIRMACIÓN DE FIXES APLICADOS                         │
│     POST /api/audit/reports/mark-reviewed                   │
│     • Claude Code indica: "Fixes aplicados"                 │
│     • Sistema registra cambios en log                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. RE-EJECUCIÓN AUTOMÁTICA                                 │
│     POST /api/audit/iterative/start                         │
│     • Sistema vuelve a testear TODO                         │
│     • Compara con reporte anterior                          │
│     • Genera nuevo reporte si hay errores                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                     REPETIR HASTA 100%
```

## 🚀 SETUP INICIAL

### 1. Activar Monitoreo de Notificaciones

Claude Code puede monitorear el archivo `.claude-notifications/latest-report.json` automáticamente.

**Archivo a vigilar**:
```
C:\Bio\sistema_asistencia_biometrico\backend\.claude-notifications\latest-report.json
```

**Estructura de notificación**:
```json
{
  "timestamp": "2025-10-21T01:38:34.708Z",
  "reportPath": "C:\\Bio\\...\\AUDIT-REPORT.md",
  "executionId": "abc-123-def-456",
  "summary": {
    "total": 46,
    "passed": 1,
    "failed": 45,
    "successRate": 2.2,
    "critical": 1,
    "high": 0,
    "medium": 44,
    "low": 0
  },
  "status": "pending_review",
  "message": "🔔 Nuevo reporte disponible",
  "actions": {
    "readReport": "Read C:\\Bio\\...\\AUDIT-REPORT.md",
    "markAsReviewed": "POST .../mark-reviewed",
    "startNextCycle": "POST .../iterative/start"
  }
}
```

### 2. Workflow de Claude Code (Manual)

Cuando detectes un nuevo reporte:

```bash
# 1. Leer el reporte
Read [reportPath del JSON]

# 2. Analizar errores CRÍTICOS
# (Claude Code hace esto automáticamente)

# 3. Aplicar fixes

# 4. Marcar como revisado
curl -X POST http://localhost:9998/api/audit/reports/mark-reviewed \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"executionId": "abc-123-def-456"}'

# 5. Re-ejecutar tests
curl -X POST http://localhost:9998/api/audit/iterative/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"maxCycles": 1, "targetSuccessRate": 100}'
```

## 🤖 MODO TOTALMENTE AUTOMÁTICO (Futuro)

Para hacer el ciclo completamente automático, se necesitaría:

### Opción A: Watcher de Archivo (Node.js)

```javascript
// watch-for-reports.js
const fs = require('fs');
const notificationFile = '.claude-notifications/latest-report.json';

fs.watch(notificationFile, (eventType) => {
  if (eventType === 'change') {
    const notification = JSON.parse(fs.readFileSync(notificationFile, 'utf8'));

    if (notification.status === 'pending_review') {
      console.log('🔔 Nuevo reporte detectado, iniciando Claude Code...');

      // Llamar a Claude Code vía API o CLI
      // exec('claude-code fix-from-report ' + notification.reportPath);
    }
  }
});
```

### Opción B: Polling Simple

```javascript
// auto-fix-loop.js
setInterval(async () => {
  const notification = JSON.parse(
    fs.readFileSync('.claude-notifications/latest-report.json', 'utf8')
  );

  if (notification.status === 'pending_review') {
    console.log('📝 Procesando reporte...');

    // 1. Leer reporte
    // 2. Aplicar fixes (requiere integración con Claude Code)
    // 3. Marcar como revisado
    // 4. Re-ejecutar tests
  }
}, 30000); // Cada 30 segundos
```

### Opción C: Webhook HTTP (Más robusto)

```javascript
// En el AuditReportGenerator, después de generar el reporte:
axios.post('http://localhost:8000/claude-code-webhook', {
  reportPath: reportInfo.files.markdown,
  summary: summary
});
```

Claude Code escucha en puerto 8000 y procesa automáticamente.

## 📊 ENDPOINTS DISPONIBLES

### POST `/api/audit/reports/mark-reviewed`

Marca un reporte como revisado después de aplicar fixes.

**Request**:
```json
{
  "executionId": "acd370bd-a8fb-41f1-b32c-a0147b22848c",
  "fixesApplied": 5,
  "notes": "Reparados errores CRÍTICOS: column c.id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Reporte marcado como revisado",
  "nextAction": "start_new_cycle"
}
```

### POST `/api/audit/iterative/start`

Inicia un nuevo ciclo de auditoría.

**Request**:
```json
{
  "maxCycles": 1,
  "targetSuccessRate": 100,
  "companyId": 11
}
```

**Response**:
```json
{
  "status": "started",
  "executionId": "new-uuid",
  "estimatedTime": "3-5 minutes"
}
```

### GET `/api/audit/reports/latest`

Obtiene el último reporte generado.

**Response**:
```json
{
  "timestamp": "2025-10-21T01:38:34.708Z",
  "reportPath": "C:\\Bio\\...\\AUDIT-REPORT.md",
  "summary": { ... },
  "status": "pending_review"
}
```

## 🎓 EJEMPLO DE USO COMPLETO

### Ciclo Manual (Control Total)

```bash
# CICLO 1
1. Sistema genera reporte automáticamente
   → audit-reports/2025-10-21_22-38-34/

2. Claude Code lee notificación
   → Read .claude-notifications/latest-report.json

3. Claude Code lee reporte completo
   → Read audit-reports/2025-10-21_22-38-34/AUDIT-REPORT.md

4. Claude Code repara 1 error CRÍTICO
   → Fix: column c.id does not exist

5. Claude Code marca como revisado
   → POST /api/audit/reports/mark-reviewed

6. Usuario reinicia test
   → POST /api/audit/iterative/start

# CICLO 2 (automático)
Sistema detecta 1 menos error (44 en vez de 45)
→ Tasa de éxito: 4.3% (↑ 2.1%)
→ Genera nuevo reporte...
```

### Ciclo Semi-Automático (Con Polling)

```javascript
// auto-repair-assistant.js
const checkAndRepair = async () => {
  const notification = JSON.parse(
    fs.readFileSync('.claude-notifications/latest-report.json')
  );

  if (notification.status !== 'pending_review') return;

  console.log('📋 Nuevo reporte detectado');
  console.log(`   Errores: ${notification.summary.failed}`);
  console.log(`   Críticos: ${notification.summary.critical}`);

  // Llamar a Claude Code para revisar
  console.log('\n🤖 Claude Code, por favor revisa:');
  console.log(`   ${notification.reportPath}`);

  // Esperar confirmación manual del usuario
  // O implementar lógica de fixes automáticos para errores simples
};

setInterval(checkAndRepair, 60000); // Cada minuto
```

## 💡 VENTAJAS DEL SISTEMA

### 1. Transparencia Total
- Cada ciclo genera un reporte versionado
- Puedes comparar progreso entre ciclos
- Todo queda documentado en Markdown

### 2. Control Granular
- Decide cuándo aplicar fixes
- Revisa cambios antes de commitear
- Rollback fácil con Git

### 3. Aprendizaje Acumulativo
- Knowledge Base crece con cada ciclo
- Ollama aprende de fixes previos
- Mejora continua de sugerencias

### 4. Escalable
- Puede procesar 100s de errores
- Prioriza automáticamente (crítico → bajo)
- Paraliza tests (4 collectors simultáneos)

### 5. Cero Dependencias Cloud
- Todo local (Ollama + PostgreSQL)
- $0/mes de costo operativo
- 100% privado

## 🔮 ROADMAP

- [ ] **Webhook HTTP** para notificar a Claude Code en tiempo real
- [ ] **API de fixes automáticos** para errores simples (typos, imports)
- [ ] **Comparación visual** de reportes (Ciclo 1 vs Ciclo 2)
- [ ] **Gráficos de progreso** (Chart.js)
- [ ] **Integración con Git** (auto-commit después de cada fix)
- [ ] **Slack/Discord notifications** cuando un ciclo termina
- [ ] **Dashboard web** para ver progreso en vivo

## 📝 NOTAS IMPORTANTES

### Para Claude Code:

1. **Siempre lee el reporte completo** antes de aplicar fixes
2. **Prioriza errores CRÍTICOS** (estabilidad del sistema)
3. **Un error a la vez** (verifica después de cada fix)
4. **Compara snapshots** si un fix rompe algo
5. **Marca como revisado** después de aplicar fixes

### Para Desarrolladores:

1. **No edites archivos en audit-reports/** (son históricos)
2. **Revisa .claude-notifications/latest-report.json** para ver estado
3. **Commits frecuentes** después de cada ciclo exitoso
4. **Backups antes de ciclos largos** (seguridad)

---

**Generado por**: Sistema Híbrido de Auditoría
**Versión**: 2.0.0 (Ciclo Virtuoso)
**Fecha**: 2025-10-21
