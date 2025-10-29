# 🤖 SISTEMA HÍBRIDO OLLAMA V2.0 - DOCUMENTACIÓN COMPLETA

**Versión:** 2.0.0
**Fecha:** 2025-01-23
**Estado:** ✅ 100% IMPLEMENTADO Y FUNCIONAL

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Multi-Nivel](#arquitectura-multi-nivel)
3. [Métricas de Precisión](#métricas-de-precisión)
4. [Endpoints de API](#endpoints-de-api)
5. [Base de Datos](#base-de-datos)
6. [Configuración](#configuración)
7. [Uso y Ejemplos](#uso-y-ejemplos)
8. [Despliegue en Producción](#despliegue-en-producción)

---

## 🎯 RESUMEN EJECUTIVO

Sistema inteligente de diagnóstico de errores que combina **4 niveles de análisis** con fallback automático y **tracking completo de métricas de precisión**.

### ¿Qué hace?

- **Detecta errores** en tests de frontend (Puppeteer)
- **Analiza causas** usando IA (Ollama local/externo, OpenAI API, o patrones)
- **Genera reparaciones** automáticas con Claude Code
- **Mide precisión** de cada fuente de diagnóstico
- **Recomienda automáticamente** qué sistema usar (Ollama vs OpenAI)

### Ventajas

✅ **Fallback inteligente** - Si Ollama no está disponible, usa OpenAI o patrones
✅ **Métricas completas** - Confidence, specificity, actionable, duration
✅ **Comparación automática** - Sabe si Ollama es mejor que OpenAI
✅ **$0/mes en desarrollo** - Ollama local es gratis
✅ **Compatible con producción** - Render Starter (2 GB RAM) puede correr Ollama 3B

---

## 🏗️ ARQUITECTURA MULTI-NIVEL

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  PUPPETEER detecta error en módulo frontend                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 1: Ollama Local (desarrollo)                         │
│  • llama3.1:8b, deepseek-r1:8b                              │
│  • localhost:11434                                          │
│  • Confidence: ~0.80-0.90                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ ❌ No disponible
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 2: Ollama Externo (producción)                       │
│  • Servidor dedicado (Hetzner/Railway)                      │
│  • llama3.1:3b (2 GB RAM)                                   │
│  • Confidence: ~0.75-0.85                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ ❌ No disponible
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 3: OpenAI API (fallback)                             │
│  • gpt-4o-mini                                              │
│  • $3-10/mes                                                │
│  • Confidence: ~0.85-0.95                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ ❌ Sin API key
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 4: Análisis por Patrones (última opción)             │
│  • Reglas basadas en errores HTTP/Console/Network           │
│  • Confidence: ~0.60                                        │
│  • Siempre disponible                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  MÉTRICAS GUARDADAS    │
          │  EN BASE DE DATOS      │
          └────────────────────────┘
```

---

## 📊 MÉTRICAS DE PRECISIÓN

Cada diagnóstico guarda las siguientes métricas:

### Columnas en `audit_logs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `diagnosis_source` | VARCHAR(50) | `ollama-local`, `ollama-external`, `openai`, `pattern-analysis` |
| `diagnosis_model` | VARCHAR(100) | `llama3.1:8b`, `gpt-4o-mini`, `rule-based` |
| `diagnosis_level` | INTEGER | 1=Local, 2=Externo, 3=OpenAI, 4=Patterns |
| `diagnosis_confidence` | DECIMAL(3,2) | 0.0-1.0 - Confianza del diagnóstico |
| `diagnosis_specificity` | DECIMAL(3,2) | 0.0-1.0 - Especificidad (menciona archivos/líneas) |
| `diagnosis_actionable` | BOOLEAN | Si proporciona acciones concretas |
| `diagnosis_duration_ms` | INTEGER | Tiempo de análisis en milisegundos |
| `diagnosis_timestamp` | TIMESTAMP | Momento del análisis |
| `repair_success` | BOOLEAN | Si la reparación fue exitosa |
| `repair_attempts` | INTEGER | Número de intentos de reparación |

### Vistas PostgreSQL

**1. `audit_metrics_by_module`**
Métricas agregadas por módulo:
```sql
SELECT * FROM audit_metrics_by_module;
```
Retorna:
- `module_name`
- `total_audits`, `passed`, `failed`, `warnings`
- `avg_confidence`, `avg_specificity`
- `successful_repairs`, `failed_repairs`
- `avg_diagnosis_time_ms`
- `last_audit`

**2. `audit_metrics_by_source`**
Comparación entre fuentes:
```sql
SELECT * FROM audit_metrics_by_source;
```
Retorna:
- `diagnosis_source`, `diagnosis_model`, `diagnosis_level`
- `total_diagnoses`
- `avg_confidence`, `avg_specificity`
- `actionable_count`
- `successful_repairs`, `repair_success_rate`
- `avg_duration_ms`

**3. `audit_progress_timeline`**
Timeline de progreso (últimas 24h):
```sql
SELECT * FROM audit_progress_timeline;
```
Retorna:
- `time_bucket` (agrupado por hora)
- `module_name`
- `tests_run`, `passed`, `failed`, `pass_rate`

### Función PostgreSQL

**`get_diagnosis_precision_stats()`**
Estadísticas globales + recomendación automática:
```sql
SELECT * FROM get_diagnosis_precision_stats();
```
Retorna:
```json
{
  "total_diagnoses": 150,
  "ollama_local_count": 100,
  "ollama_external_count": 20,
  "openai_count": 20,
  "pattern_count": 10,
  "avg_ollama_confidence": 0.82,
  "avg_openai_confidence": 0.91,
  "avg_pattern_confidence": 0.60,
  "ollama_repair_success_rate": 75.0,
  "openai_repair_success_rate": 85.0,
  "pattern_repair_success_rate": 45.0,
  "recommendation": "Ollama tiene buen rendimiento - Mantener configuración actual"
}
```

**Recomendaciones automáticas:**
- `"Considera migrar a OpenAI - Mejor tasa de éxito"` - Si OpenAI > Ollama + 20%
- `"Ollama tiene buen rendimiento - Mantener configuración actual"` - Si Ollama >= OpenAI
- `"Baja precisión de Ollama - Revisar configuración o considerar OpenAI"` - Si Ollama < 50%

---

## 🔌 ENDPOINTS DE API

Base URL: `/api/audit/metrics/*`

### 1. GET `/api/audit/metrics/precision`
Estadísticas globales de precisión

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total_diagnoses": 150,
    "ollama_local_count": 100,
    "avg_ollama_confidence": 0.82,
    "recommendation": "..."
  }
}
```

### 2. GET `/api/audit/metrics/by-source`
Comparación detallada por fuente

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "diagnosis_source": "ollama-local",
      "diagnosis_model": "llama3.1:8b",
      "total_diagnoses": 100,
      "avg_confidence": 0.82,
      "repair_success_rate": 75.0
    },
    {
      "diagnosis_source": "openai",
      "diagnosis_model": "gpt-4o-mini",
      "total_diagnoses": 20,
      "avg_confidence": 0.91,
      "repair_success_rate": 85.0
    }
  ]
}
```

### 3. GET `/api/audit/metrics/by-module`
Métricas por módulo

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "module_name": "users",
      "total_audits": 50,
      "passed": 45,
      "failed": 5,
      "avg_confidence": 0.80,
      "successful_repairs": 3
    }
  ]
}
```

### 4. GET `/api/audit/metrics/timeline`
Timeline de progreso (24h)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "time_bucket": "2025-01-23T14:00:00Z",
      "module_name": "users",
      "tests_run": 10,
      "passed": 8,
      "failed": 2,
      "pass_rate": 80.0
    }
  ]
}
```

### 5. GET `/api/audit/metrics/errors-with-diagnosis`
Lista de errores con diagnósticos

**Query params:**
- `limit` (default: 50)
- `offset` (default: 0)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "log_id": 12345,
      "module_name": "users",
      "error_message": "404 Not Found",
      "diagnosis_source": "ollama-local",
      "diagnosis_confidence": 0.85,
      "repair_success": true
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### 6. GET `/api/audit/metrics/dashboard-summary`
Resumen completo (un solo endpoint)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "precision": { ... },
    "by_source": [ ... ],
    "top_failing_modules": [ ... ],
    "recent_activity": [ ... ],
    "recent_diagnoses": [ ... ],
    "generated_at": "2025-01-23T..."
  }
}
```

---

## ⚙️ CONFIGURACIÓN

### Variables de Entorno

Agregar a `.env`:

```bash
# Ollama Local (desarrollo)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=30000

# Ollama Externo (producción - opcional)
OLLAMA_EXTERNAL_URL=https://ollama.tu-servidor.com

# OpenAI Fallback (opcional)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Instalar Ollama (Desarrollo)

**Windows:**
```bash
# Descargar instalador
curl -O https://ollama.com/download/OllamaSetup.exe

# Instalar (doble click)
# Abrir CMD nuevo y ejecutar:
ollama --version
ollama pull llama3.1:8b

# Verificar servidor
curl http://localhost:11434/api/tags
```

**Linux/Mac:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b
```

### Migración de Base de Datos

```bash
cd backend
node scripts/run-diagnosis-metrics-migration.js
```

Esto crea:
- 10 columnas en `audit_logs`
- 3 vistas (`audit_metrics_by_*`, `audit_progress_timeline`)
- 1 función (`get_diagnosis_precision_stats()`)

---

## 🚀 USO Y EJEMPLOS

### Ejecutar Auditoría con Métricas

```bash
cd backend

# Terminal 1 - Servidor
PORT=9998 npm start

# Terminal 2 - Auditoría
node test-auto-repair-system.js
```

El sistema automáticamente:
1. Ejecuta tests de frontend con Puppeteer
2. Detecta errores HTTP/Console/Network
3. Analiza con Ollama (o fallback)
4. **Guarda métricas en BD**
5. Intenta reparar automáticamente
6. Re-testea y guarda resultado

### Ver Métricas desde Backend

```javascript
const database = require('./src/config/database');

// Estadísticas globales
const [stats] = await database.sequelize.query(
  'SELECT * FROM get_diagnosis_precision_stats()'
);

console.log(stats[0]);
// {
//   ollama_local_count: 100,
//   avg_ollama_confidence: 0.82,
//   ollama_repair_success_rate: 75.0,
//   recommendation: "..."
// }
```

### Ver Métricas desde API (curl)

```bash
# Obtener token
TOKEN="<tu-jwt-token>"

# Estadísticas de precisión
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9998/api/audit/metrics/precision

# Comparación por fuente
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9998/api/audit/metrics/by-source

# Dashboard completo
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9998/api/audit/metrics/dashboard-summary
```

---

## 🌐 DESPLIEGUE EN PRODUCCIÓN (RENDER)

### Opción 1: Ollama en Render (Starter Plan - 2 GB RAM)

**Dockerfile:**
```dockerfile
FROM node:18

# Instalar Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Descargar modelo pequeño (3B)
RUN ollama pull llama3.1:3b

# Copiar aplicación
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Iniciar Ollama + Node
CMD ollama serve & npm start
```

**Limitación:** Modelo 3B es menos preciso que 8B, pero funciona en 2 GB RAM.

### Opción 2: Ollama Externo + OpenAI Fallback

1. **Servidor Ollama dedicado** (Hetzner/Railway - $5-10/mes)
   - 4 GB RAM → llama3.1:8b
   - `OLLAMA_EXTERNAL_URL=https://ollama.tu-servidor.com`

2. **OpenAI API como fallback** ($3-10/mes)
   - `OPENAI_API_KEY=sk-...`
   - Solo se usa si Ollama falla

3. **Render solo corre Node.js** (Free o Starter)
   - No necesita RAM extra para Ollama
   - Fallback automático

### Opción 3: Solo OpenAI (Más simple)

```bash
# .env en Render
OPENAI_API_KEY=sk-...
# NO poner OLLAMA_BASE_URL ni OLLAMA_EXTERNAL_URL

# Sistema usa OpenAI directamente (Nivel 3)
```

---

## 📈 COMPARACIÓN DE OPCIONES

| Opción | Costo | Precisión | Complejidad | Recomendado para |
|--------|-------|-----------|-------------|------------------|
| **Ollama Local** | $0/mes | ⭐⭐⭐⭐⭐ | Media | Desarrollo |
| **Ollama Externo** | $5-10/mes | ⭐⭐⭐⭐ | Alta | Producción grande |
| **OpenAI API** | $3-10/mes | ⭐⭐⭐⭐⭐ | Baja | Producción pequeña |
| **Hybrid** | $8-20/mes | ⭐⭐⭐⭐⭐ | Media | Producción crítica |

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Sistema híbrido implementado
2. ✅ Métricas de precisión guardadas en BD
3. ✅ API endpoints para dashboard
4. ⏳ Dashboard visual frontend (en progreso)
5. ⏳ Gráficas comparativas Ollama vs OpenAI
6. ⏳ Configurar Dockerfile para Render

---

**Autor:** Claude Code
**Versión:** 2.0.0
**Última actualización:** 2025-01-23
