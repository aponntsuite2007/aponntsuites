# 🔄 SISTEMA HÍBRIDO: AUDITOR + CLAUDE CODE

## 📋 CONCEPTO

Sistema de auto-diagnóstico y auto-reparación que combina:
- **Ollama (DeepSeek-R1)**: Detección y análisis de errores
- **Claude Code**: Reparación de código guiada por reportes

## 🎯 FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────┐
│  1. AUDITORÍA AUTOMATIZADA                              │
│     ├─ FrontendCollector (Puppeteer headless)          │
│     ├─ DatabaseCollector                               │
│     ├─ EndpointCollector                               │
│     └─ IntegrationCollector                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. DETECCIÓN DE ERRORES                                │
│     ├─ 45 errores detectados                           │
│     ├─ Categorización por severidad                    │
│     └─ Análisis de impacto                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. ANÁLISIS CON OLLAMA                                 │
│     ├─ Causa raíz                                       │
│     ├─ Impacto en funcionalidad                        │
│     ├─ Sugerencias de solución                         │
│     └─ Prioridad (Crítico/Alto/Medio/Bajo)             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. GENERACIÓN DE REPORTE MARKDOWN                      │
│     ├─ audit-reports/2025-01-20_21-30-00/              │
│     │   ├─ AUDIT-REPORT.md ⭐                          │
│     │   ├─ errors-by-severity.json                     │
│     │   ├─ frontend-snapshot.txt                       │
│     │   ├─ backend-snapshot.txt                        │
│     │   └─ ai-analysis.json                            │
│     └─ Versionado automático (timestamp)               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  5. CLAUDE CODE LEE Y REPARA                            │
│     ├─ Lee AUDIT-REPORT.md                             │
│     ├─ Prioriza errores CRÍTICOS                       │
│     ├─ Aplica fixes sistemáticamente                   │
│     └─ Documenta cambios                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  6. RE-EJECUCIÓN DE TESTS                               │
│     ├─ Ejecutar auditoría nuevamente                   │
│     ├─ Comparar con reporte anterior                   │
│     └─ Verificar mejoras                               │
└─────────────────────────────────────────────────────────┘
                        ↓
                   REPETIR HASTA 100%
```

## 🚀 CÓMO USAR

### Paso 1: Ejecutar Auditoría

```bash
curl -X POST http://localhost:9998/api/audit/iterative/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"maxCycles": 1, "targetSuccessRate": 50}'
```

### Paso 2: Esperar Generación de Reporte

El sistema automáticamente:
1. Ejecuta tests (3-4 minutos)
2. Analiza errores con Ollama (2-5 minutos)
3. Genera reporte en `audit-reports/[timestamp]/`

Verás en logs:
```
╔═══════════════════════════════════════════════════════════════╗
║  📄 REPORTE GENERADO PARA CLAUDE CODE                        ║
╚═══════════════════════════════════════════════════════════════╝

📁 Ubicación: C:\Bio\...\audit-reports\2025-01-20_21-30-00

📋 PRÓXIMOS PASOS PARA CLAUDE CODE:
1. Leer: ...\AUDIT-REPORT.md
2. Priorizar errores CRÍTICOS primero
3. Aplicar fixes sistemáticamente
4. Volver a ejecutar auditoría
```

### Paso 3: Claude Code Lee el Reporte

```
@Claude, lee el reporte en audit-reports/[última carpeta]/AUDIT-REPORT.md
y repara los errores CRÍTICOS primero.
```

Claude Code:
1. Leerá el reporte completo
2. Entenderá el contexto de cada error
3. Verá el análisis de Ollama
4. Aplicará fixes sistemáticamente

### Paso 4: Re-ejecutar Tests

```bash
# Ejecutar nuevamente
curl -X POST http://localhost:9998/api/audit/iterative/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"maxCycles": 1, "targetSuccessRate": 50}'
```

### Paso 5: Comparar Resultados

```
@Claude, compara el nuevo reporte con el anterior
y muéstrame las mejoras
```

## 📊 ESTRUCTURA DEL REPORTE

### AUDIT-REPORT.md

```markdown
# 🔍 AUDIT REPORT

**Generated**: 2025-01-20T21:30:00.000Z
**Execution ID**: abc-123-def-456

---

## 📊 EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total Tests | 46 |
| ✅ Passed | 1 |
| ❌ Failed | 45 |
| Success Rate | 2.2% |
| Duration | 205.0s |

## 🎯 ERRORS BY SEVERITY

**Total Errors**: 45

### 🔴 CRITICAL (2)

#### 1. Usuarios huérfanos (sin empresa)

**Module**: `users`

**Error**:
```
column c.id does not exist
```

**Context**: Database query error

---

### 🟠 HIGH (10)

...

### 🟡 MEDIUM (30)

...

### 🟢 LOW (3)

...

## 🧠 AI ANALYSIS (Ollama)

**Analyzed Errors**: 10 / 45

### Analysis 1: Usuarios huérfanos

**Module**: `users`

**AI Response**:

Este error se produce porque la consulta SQL está intentando acceder a...

**CAUSA RAÍZ**: ...
**IMPACTO**: ...
**SOLUCIÓN**: ...
**PRIORIDAD**: CRÍTICO
**TIEMPO ESTIMADO**: 15 minutos

**Confidence**: 85%

---

## 🤖 RECOMMENDATIONS FOR CLAUDE CODE

### Priority Order:

1. **CRITICAL** (2) - Fix immediately
2. **HIGH** (10) - Fix soon
3. **MEDIUM** (30) - Fix when possible
4. **LOW** (3) - Fix if time permits

### Next Steps:

1. Read this report carefully
2. Start with CRITICAL errors
3. Apply fixes systematically
4. Re-run audit after each fix
5. Compare results
```

## 📁 ARCHIVOS GENERADOS

### AUDIT-REPORT.md
Reporte principal en Markdown para Claude Code

### errors-by-severity.json
Datos estructurados de errores categorizados

### frontend-snapshot.txt
Hash MD5 de todos los archivos frontend

### backend-snapshot.txt
Hash MD5 de todos los archivos backend

### ai-analysis.json
Análisis completo generado por Ollama

## 🔧 VENTAJAS DEL SISTEMA HÍBRIDO

### 1. Lo Mejor de Dos Mundos
- **Ollama**: Análisis rápido, contexto técnico
- **Claude Code**: Reparación precisa, entendimiento profundo

### 2. Escalabilidad
- Ollama puede analizar 100s de errores
- Claude Code repara los más críticos primero

### 3. Aprendizaje Continuo
- Cada ciclo genera un reporte versionado
- Puedes comparar progreso entre ciclos
- Knowledge Base acumula soluciones

### 4. Transparencia Total
- Todo queda documentado en Markdown
- Fácil de revisar y auditar
- Git-friendly (versionable)

### 5. Automatización Inteligente
- Tests automáticos (Puppeteer headless)
- Análisis automático (Ollama)
- Reparación guiada (Claude Code)

## 📈 EJEMPLO DE USO REAL

```bash
# CICLO 1
$ npm run audit
→ 45 errores detectados
→ Reporte generado en audit-reports/2025-01-20_21-30-00/

@Claude: Lee el reporte y repara los 2 errores CRÍTICOS
→ Claude repara 2 errores

# CICLO 2
$ npm run audit
→ 43 errores detectados (2 menos!)
→ Tasa de éxito: 6.5% (↑ 4.3%)

@Claude: Ahora repara los 10 errores HIGH
→ Claude repara 10 errores

# CICLO 3
$ npm run audit
→ 33 errores detectados (10 menos!)
→ Tasa de éxito: 28.3% (↑ 21.8%)

... y así hasta 100%
```

## 🎓 TIPS PARA CLAUDE CODE

### 1. Prioriza Siempre
Lee el reporte completo pero empieza por CRÍTICOS

### 2. Un Error a la Vez
No intentes reparar todo de golpe, hazlo sistemáticamente

### 3. Verifica Antes de Continuar
Después de cada fix, re-ejecuta tests para confirmar

### 4. Lee el Análisis de Ollama
El contexto de IA te ahorrará tiempo

### 5. Compara Snapshots
Si un fix rompe algo, compara hashes de archivos

## 🔮 ROADMAP

- [ ] Integración con GitHub Actions
- [ ] Comparación automática entre reportes
- [ ] Gráficos de progreso (Chart.js)
- [ ] Sugerencias de refactoring
- [ ] Auto-merge de fixes simples

---

**Generado por**: Sistema Híbrido de Auditoría
**Versión**: 1.0.0
**Fecha**: 2025-01-20
