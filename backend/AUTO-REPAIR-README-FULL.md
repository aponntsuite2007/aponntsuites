# 🤖 SISTEMA DE AUTO-REPARACIÓN AUTOMÁTICA

**Versión:** 1.0.0 | **Fecha:** 2025-01-23 | **Estado:** ✅ COMPLETAMENTE IMPLEMENTADO

---

## 🎯 RESUMEN EJECUTIVO

Sistema autónomo de detección, análisis y reparación de errores que combina Puppeteer (tests reales), Ollama (análisis IA) y Claude Code (reparaciones).

### Flujo Completo
```
Puppeteer → Detecta errores HTTP/Console/Network
     ↓
AutoAuditTicketSystem → Crea ticket AUDIT-2025-XXXXXX
     ↓
Ollama → Analiza error con IA local (Llama 3.1 8B)
     ↓
ClaudeCodeRepairAgent → Genera archivo .repair.md
     ↓
Claude Code → Lee .repair.md y aplica fixes
     ↓
Re-test automático → Valida reparación
     ↓
Cierra ticket si éxito | Reintenta (máx 3)
```

---

## 🧩 COMPONENTES IMPLEMENTADOS

### 1. AutoAuditTicketSystem.js (400+ líneas)
- Orchestrator principal
- Crea tickets AUDIT-2025-XXXXXX
- Coordina Ollama + Claude Code
- Maneja reintentos (máx 3)

### 2. OllamaAnalyzer.js (200+ líneas)
- Analiza errores con IA local
- Genera diagnóstico técnico
- Confidence score
- Fallback sin Ollama

### 3. ClaudeCodeRepairAgent.js (300+ líneas)
- Genera archivos .repair.md
- Identifica archivos afectados
- Instrucciones detalladas para Claude Code

### 4. FrontendCollector.js (MODIFICADO)
- Integración en líneas 443-469
- Crea tickets automáticos al detectar errores

---

## 📁 ARCHIVOS CLAVE

| Archivo | Descripción |
|---------|-------------|
| `src/auditor/core/AutoAuditTicketSystem.js` | Orchestrator |
| `src/auditor/core/OllamaAnalyzer.js` | Análisis IA |
| `src/auditor/core/ClaudeCodeRepairAgent.js` | Generador .repair.md |
| `src/auditor/collectors/FrontendCollector.js` | Integración Puppeteer |
| `.claude-repairs/` | Directorio de archivos .repair.md |

---

## 🚀 CÓMO USAR

### 1. Verificar Ollama
```bash
ollama --version
ollama pull llama3.1:8b
```

### 2. Ejecutar Auditoría
```bash
cd backend
PORT=9998 npm start  # Terminal 1
node autonomous-auditor.js  # Terminal 2
```

### 3. Leer .repair.md
```bash
ls .claude-repairs/
cat .claude-repairs/[archivo].repair.md
```

### 4. Aplicar Fixes
- Abrir archivos indicados
- Aplicar cambios sugeridos
- Reportar acciones en .repair.md

### 5. Sistema Re-testea Automáticamente

---

## 🎫 TICKETS AUTOMÁTICOS

### Formato
```
AUDIT-[YEAR]-[NUMBER]
Ejemplo: AUDIT-2025-000001
```

### Campos
- **ticket_number:** AUDIT-2025-XXXXXX
- **company_id:** Empresa afectada
- **module_name:** Módulo con errores
- **status:** in_progress → closed
- **close_reason:** ✅ Éxito o ⚠️ No reparado

---

## 🔧 TROUBLESHOOTING

### Ollama no disponible
```bash
curl http://localhost:11434/api/tags
ollama serve  # Si no está corriendo
```

### Tablas no existen
```bash
node check-support-tables.js
# Si falta alguna, ejecutar migraciones
```

### Módulos no se testean
```sql
-- Verificar active_modules en BD
SELECT active_modules FROM companies WHERE company_id = 11;
```

---

## 📊 ESTADÍSTICAS

```javascript
const AutoAuditTicketSystem = require('./src/auditor/core/AutoAuditTicketSystem');
const stats = await AutoAuditTicketSystem.getStats(11);
// { total: 10, resolved: 7, unresolved: 3, success_rate: 70.0 }
```

---

**Autor:** Claude Code + Ollama
**Documentación completa:** Ver AUTO-REPAIR-SYSTEM-README.md
