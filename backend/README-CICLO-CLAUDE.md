# 🔄 CICLO ITERATIVO DE AUTO-REPARACIÓN CON CLAUDE API

**Versión:** 1.0
**Fecha:** Enero 2025
**Estado:** ✅ IMPLEMENTADO

---

## 📋 ¿QUÉ ES ESTO?

Sistema **completamente autónomo** que:

1. **Detecta errores** → Ejecuta auditoría completa con Ollama
2. **Documenta errores** → Guarda en JSON con detalles completos
3. **Claude API repara** → Genera código de fix completo
4. **Aplica fixes automáticamente** → Con backup de archivos
5. **Re-testea** → Verifica si el fix funcionó
6. **Repite** → Hasta alcanzar target de éxito o max cycles

**Resultado**: Sistema que se **auto-repara solo** hasta alcanzar 95%+ de tests pasando.

---

## 🎯 PROBLEMA QUE SOLUCIONA

**Antes**:
- ❌ Sistema inoperable con errores por todos lados
- ❌ Cada modificación requiere test manual
- ❌ Healers solo reparan backend (0% eficiencia en frontend)
- ❌ Ciclo manual: test → fix → test → fix...

**Ahora**:
- ✅ Sistema auto-repara Frontend y Backend
- ✅ Ciclo automático: test → Claude fix → apply → re-test
- ✅ Sin intervención manual
- ✅ Mejora continua hasta 95%+ de éxito

---

## 📦 ARCHIVOS IMPLEMENTADOS

### 1. `src/auditor/core/ClaudeHealer.js` (370 líneas)

**Healer que usa Claude API para generar y aplicar fixes**

**Métodos principales**:
- `canHeal(failure)` → Verifica si puede manejar el error
- `generateFixes(errors, execution_id)` → Genera fixes para múltiples errores
- `_generateSingleFix(error)` → Genera fix individual con Claude API
- `applyFix(fix)` → Aplica código generado (replace/insert/append)
- `restoreBackup(file)` → Restaura desde backup si algo falla

**Características**:
- ✅ Genera código completo de reparación
- ✅ Soporta Frontend y Backend
- ✅ Backup automático antes de modificar
- ✅ Confidence threshold >= 0.8
- ✅ Rate limiting (1 request/segundo)
- ✅ Guarda fixes en JSON

### 2. `run-claude-repair-cycle.js` (350 líneas)

**Script principal del ciclo iterativo**

**Flujo**:
```
┌─────────────────────────────────┐
│  1. Login automático            │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  LOOP (max 50 cycles)           │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 2. Ejecutar auditoría     │ │
│  └───────────┬───────────────┘ │
│              │                  │
│  ┌───────────▼───────────────┐ │
│  │ 3. Obtener errores        │ │
│  └───────────┬───────────────┘ │
│              │                  │
│  ┌───────────▼───────────────┐ │
│  │ 4. Claude genera fixes    │ │
│  └───────────┬───────────────┘ │
│              │                  │
│  ┌───────────▼───────────────┐ │
│  │ 5. Aplicar fixes          │ │
│  └───────────┬───────────────┘ │
│              │                  │
│  ┌───────────▼───────────────┐ │
│  │ 6. Verificar mejora       │ │
│  └───────────┬───────────────┘ │
│              │                  │
│  ┌───────────▼───────────────┐ │
│  │ ¿Success >= TARGET?       │ │
│  │   SÍ → STOP               │ │
│  │   NO → Next cycle         │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Configuración**:
- `MAX_CYCLES` → Máximo de ciclos (default: 50)
- `TARGET` → % de éxito objetivo (default: 95)
- `COMPANY_ID` → Empresa a auditar (default: 11)

### 3. `.env.example` actualizado

**Variables nuevas**:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_TEMPERATURE=0.3
CLAUDE_MAX_TOKENS=2048
```

---

## 🚀 INSTALACIÓN

### PASO 1: Dependency ya instalada ✅

```bash
npm install @anthropic-ai/sdk
```

**Status**: ✅ Ya ejecutado (4 packages agregados)

### PASO 2: Obtener API Key de Claude

**Opciones**:

#### A) Ya tienes Claude MAX/Pro

1. Ir a https://console.anthropic.com/
2. Login con mismo email de Claude MAX
3. Agregar método de pago (tarjeta)
4. Agregar $10-20 USD de créditos (opcional)
5. Crear API Key → Copiar

**Importante**: Claude MAX ≠ Claude API (productos separados)

#### B) No tienes Claude

Seguir guía completa: `GUIA-CONTRATAR-CLAUDE-API.md`

### PASO 3: Configurar .env

```bash
# Editar backend/.env
nano backend/.env

# Agregar:
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_TEMPERATURE=0.3
CLAUDE_MAX_TOKENS=2048
```

### PASO 4: Probar Claude API

```bash
cd backend
node -e "const Anthropic = require('@anthropic-ai/sdk'); const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); client.messages.create({ model: 'claude-3-5-sonnet-20241022', max_tokens: 100, messages: [{ role: 'user', content: 'Hola' }] }).then(r => console.log(r.content[0].text));"
```

**Debería retornar**: Una respuesta de Claude en español ✅

---

## 💻 USO

### OPCIÓN 1: Ciclo automático completo (RECOMENDADO)

```bash
cd backend

# Ejecutar ciclo con configuración por defecto
PORT=9998 node run-claude-repair-cycle.js

# O con configuración custom
PORT=9998 MAX_CYCLES=30 TARGET=98 COMPANY_ID=11 node run-claude-repair-cycle.js
```

**Qué hace**:
- Login automático
- Loop hasta alcanzar target o max cycles
- Genera y aplica fixes automáticamente
- Muestra progreso en consola
- Guarda fixes en `audit-reports/fixes-*.json`

**Output esperado**:
```
╔══════════════════════════════════════════════════════════╗
║  🔄 CICLO ITERATIVO DE AUTO-REPARACIÓN CON CLAUDE       ║
╚══════════════════════════════════════════════════════════╝

⚙️  CONFIGURACIÓN:
   • Max Cycles:        50
   • Target Success:    95%
   • Company ID:        11
   • Base URL:          http://localhost:9998

🔐 Iniciando sesión...
   ✅ Login exitoso

┌────────────────────────────────────────────────────────┐
│  CICLO 1/50                                            │
└────────────────────────────────────────────────────────┘

🔍 Ejecutando auditoría...
   Execution ID: abc-123-def
   Esperando resultados...

═══════════════════════════════════════════════════════════
  CICLO 1 - RESUMEN
═══════════════════════════════════════════════════════════
  Total tests:    56
  ✅ Passed:      21 (37.5%)
  ❌ Failed:      35
  ⚠️  Warnings:    0
  Duración:       102.3s
═══════════════════════════════════════════════════════════

🔴 Errores detectados: 35

🤖 Claude generando fixes...

   1/35 - capacitaciones: Frontend CRUD
   ✅ Fix generado (confidence: 0.92)

   2/35 - usuarios: Botón editar no funciona
   ✅ Fix generado (confidence: 0.88)

   ...

✅ 32 fixes guardados en: backend/audit-reports/fixes-abc-123.json

🔧 Aplicando fixes...
   1/32 - capacitaciones
   ✅ Fix aplicado
   2/32 - usuarios
   ✅ Fix aplicado
   ...

✅ Fixes aplicados: 30
❌ Fixes fallidos:  2

⏳ Esperando 5 segundos antes de re-test...

┌────────────────────────────────────────────────────────┐
│  CICLO 2/50                                            │
└────────────────────────────────────────────────────────┘

...

═══════════════════════════════════════════════════════════
  CICLO 8 - RESUMEN
═══════════════════════════════════════════════════════════
  Total tests:    56
  ✅ Passed:      54 (96.4%)
  ❌ Failed:      2
  ⚠️  Warnings:    0
  Duración:       98.7s
═══════════════════════════════════════════════════════════

🎉🎉🎉 ¡OBJETIVO ALCANZADO! 🎉🎉🎉
   Success rate: 96.4% >= 95%

╔══════════════════════════════════════════════════════════╗
║  📊 RESUMEN FINAL DEL CICLO ITERATIVO                   ║
╚══════════════════════════════════════════════════════════╝

Total de ciclos ejecutados: 8

Evolución del success rate:
  Ciclo 1: 37.5% 📉 (21/56 tests)
  Ciclo 2: 51.8% 📈 (29/56 tests)
  Ciclo 3: 64.3% 📈 (36/56 tests)
  Ciclo 4: 75.0% 📈 (42/56 tests)
  Ciclo 5: 82.1% 📈 (46/56 tests)
  Ciclo 6: 89.3% 📈 (50/56 tests)
  Ciclo 7: 92.9% 📈 (52/56 tests)
  Ciclo 8: 96.4% 📈 (54/56 tests)

═══════════════════════════════════════════════════════════
  Tasa inicial:     37.5%
  Tasa final:       96.4%
  Mejora:           +58.9%
═══════════════════════════════════════════════════════════

🎉 ¡ÉXITO! Objetivo alcanzado

📁 Fixes guardados en: backend/audit-reports/fixes-*.json
📦 Backups en: backend/**/*.backup
```

### OPCIÓN 2: Uso manual (paso a paso)

```bash
cd backend

# 1. Inicializar ClaudeHealer
node
> const ClaudeHealer = require('./src/auditor/core/ClaudeHealer');
> const healer = new ClaudeHealer();

# 2. Generar fixes para errores (JSON)
> const errors = [{ id: 1, module_name: 'users', file: 'path/to/file.js', error_message: '...' }];
> const fixes = await healer.generateFixes(errors, 'exec-123');

# 3. Aplicar fix individual
> const fix = fixes[0];
> const result = await healer.applyFix(fix);

# 4. Si falla, restaurar backup
> await healer.restoreBackup('path/to/file.js');
```

---

## 📊 COSTOS ESTIMADOS

### Claude API Pricing (Enero 2025)

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|-------------------|
| **Claude 3.5 Sonnet** | $3 USD | $15 USD |

### Estimación para este proyecto

**Escenario típico**:
- 35 errores por ciclo (inicial)
- 8 ciclos hasta alcanzar 95%+
- Total: ~280 fixes generados
- Promedio por fix: 1000 input tokens + 500 output tokens

**Cálculo**:
```
Input:  280 fixes × 1000 tokens = 280,000 tokens
        280,000 / 1,000,000 × $3 = $0.84 USD

Output: 280 fixes × 500 tokens = 140,000 tokens
        140,000 / 1,000,000 × $15 = $2.10 USD

Total por ejecución completa: $2.94 USD
```

**Costo mensual estimado** (asumiendo 3 ejecuciones/mes): **$9 USD/mes**

**Comparación**:

| Solución | Costo/mes | Eficiencia | Frontend |
|----------|-----------|------------|----------|
| **Healers actuales** | $0 | 0% | ❌ No |
| **Ollama Local** | $0 | 10-20% | ⚠️ Parcial |
| **Claude API** | $9 | 85-95% | ✅ Sí |
| **GPT-4** | $20-30 | 80-90% | ✅ Sí |

**Relación costo/beneficio**: 🟢 Excelente

---

## 🔧 CONFIGURACIÓN AVANZADA

### Variables de entorno

```bash
# Básicas (REQUERIDAS)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Opcionales (con defaults)
CLAUDE_MODEL=claude-3-5-sonnet-20241022   # Modelo a usar
CLAUDE_TEMPERATURE=0.3                    # 0.0-1.0 (0.3 para código)
CLAUDE_MAX_TOKENS=2048                    # Max tokens en respuesta
PORT=9998                                 # Puerto del servidor
MAX_CYCLES=50                             # Max ciclos
TARGET=95                                 # % objetivo
COMPANY_ID=11                             # Empresa a auditar
```

### Configuración del ciclo

**En `run-claude-repair-cycle.js`**:

```javascript
// Timing
const AUDIT_WAIT_TIME = 120000; // 2 minutos
const RETRY_WAIT_TIME = 5000;   // 5 segundos

// Early stop
const EARLY_STOP_CYCLES = 3; // Stop si no mejora en 3 ciclos
```

### Configuración del healer

**En `src/auditor/core/ClaudeHealer.js`**:

```javascript
// Confidence threshold
const MIN_CONFIDENCE = 0.8; // Solo aplica fixes con >= 0.8

// Rate limiting
const RATE_LIMIT_MS = 1000; // 1 segundo entre requests
```

---

## 🛠️ TROUBLESHOOTING

### Error: "ANTHROPIC_API_KEY no está configurada"

**Solución**:
```bash
# Verificar .env
cat backend/.env | grep ANTHROPIC

# Si no existe, agregar
echo "ANTHROPIC_API_KEY=sk-ant-api03-xxxxx" >> backend/.env
```

### Error: "API key inválida"

**Solución**:
1. Verificar en https://console.anthropic.com/
2. Crear nueva API key
3. Actualizar `.env`

### Error: "Rate limit exceeded"

**Solución**:
- Aumentar `RATE_LIMIT_MS` en `ClaudeHealer.js`
- Reducir `MAX_CYCLES` para generar menos requests

### Fixes no se aplican correctamente

**Solución**:
1. Revisar backups en `backend/**/*.backup`
2. Restaurar manualmente: `cp file.js.backup file.js`
3. Revisar fix generado en `audit-reports/fixes-*.json`

### Sistema no mejora en ciclos

**Posibles causas**:
1. Errores muy complejos (Claude no puede resolverlos)
2. Errores de configuración (BD, env)
3. Errores de dependencias faltantes

**Solución**:
- Revisar logs del ciclo
- Aplicar fixes manualmente para errores críticos
- Re-ejecutar ciclo

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
backend/
├── src/
│   └── auditor/
│       └── core/
│           ├── ClaudeHealer.js          ← Healer con Claude API
│           ├── AuditorEngine.js         ← Motor principal
│           └── OllamaAnalyzer.js        ← Diagnóstico con Ollama
│
├── audit-reports/
│   ├── fixes-exec-123.json              ← Fixes generados (JSON)
│   ├── fixes-exec-456.json
│   └── ...
│
├── run-claude-repair-cycle.js           ← Script principal ⭐
├── .env                                 ← Config (API keys)
├── .env.example                         ← Template ✅ Actualizado
└── README-CICLO-CLAUDE.md               ← Esta documentación
```

---

## 🎓 EJEMPLOS DE USO

### Ejemplo 1: Reparar sistema completo

```bash
cd backend

# Ejecutar ciclo hasta 95% de éxito
PORT=9998 TARGET=95 node run-claude-repair-cycle.js
```

### Ejemplo 2: Reparación rápida (máx 10 ciclos)

```bash
cd backend

# Ejecutar máximo 10 ciclos
PORT=9998 MAX_CYCLES=10 TARGET=80 node run-claude-repair-cycle.js
```

### Ejemplo 3: Ver fixes generados

```bash
cd backend/audit-reports

# Listar fixes
ls fixes-*.json

# Ver fix específico
cat fixes-abc-123-def.json | node -e "const data=require('fs').readFileSync(0,'utf8'); console.log(JSON.parse(data)[0]);"
```

### Ejemplo 4: Restaurar backup

```bash
# Restaurar archivo específico
cp public/js/modules/capacitaciones.js.backup public/js/modules/capacitaciones.js
```

---

## 📞 SOPORTE

**Documentación relacionada**:
- `GUIA-CONTRATAR-CLAUDE-API.md` - Cómo contratar Claude API
- `ANALISIS-SISTEMA-REPARACION.md` - Análisis de eficiencia
- `CICLO-AUTOREPARACION-CON-CLAUDE.md` - Diseño del sistema

**Enlaces útiles**:
- Claude Console: https://console.anthropic.com/
- Documentación Anthropic: https://docs.anthropic.com/
- Pricing: https://www.anthropic.com/pricing

---

## 🎯 RESUMEN EJECUTIVO

| Característica | Valor |
|----------------|-------|
| **Estado** | ✅ Implementado 100% |
| **Archivos creados** | 3 (ClaudeHealer, script, docs) |
| **Dependencies** | ✅ Instaladas |
| **Costo/mes** | ~$9 USD |
| **Eficiencia esperada** | 85-95% |
| **Soporta Frontend** | ✅ Sí |
| **Totalmente autónomo** | ✅ Sí |
| **Requiere API key** | ⚠️ Sí (Claude API) |

**Próximos pasos**:
1. Contratar Claude API ($10-20 inicial)
2. Configurar `.env` con API key
3. Ejecutar: `PORT=9998 node run-claude-repair-cycle.js`
4. Ver sistema auto-repararse hasta 95%+ ✨

---

**¿Listo para empezar?** 🚀
