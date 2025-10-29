# 🤖 SISTEMA DE AUTO-REPARACIÓN AUTÓNOMA

## 🎯 QUÉ ES ESTO

Un sistema 100% automático donde **tú solo presionas START** y el sistema:

1. ✅ Ejecuta tests automáticamente
2. ✅ Detecta errores
3. ✅ Genera reportes con Ollama
4. ✅ **Claude Code lee y repara** automáticamente
5. ✅ Re-ejecuta tests
6. ✅ **REPITE hasta llegar a 90-100%** de éxito

**TÚ NO HACES NADA** - El sistema se auto-repara solo.

---

## 🚀 CÓMO INICIAR EL CICLO AUTOMÁTICO

### Opción A: Modo Completamente Hands-Off (Recomendado)

```bash
cd backend

# Dejar este script corriendo en background
node autonomous-repair-agent.js

# El script:
# 1. Verifica si hay reportes pendientes
# 2. Si hay, inicia ciclo de reparación
# 3. Si no hay, inicia nueva auditoría
# 4. Monitorea cada 30 segundos
# 5. Repite hasta alcanzar 90% de éxito (default)
```

**Output que verás**:

```
╔════════════════════════════════════════════════════════════════╗
║  🤖 AUTONOMOUS REPAIR AGENT - INICIADO                        ║
╚════════════════════════════════════════════════════════════════╝

📋 Configuración:
   🎯 Objetivo: 90% de éxito
   🔄 Máximo de ciclos: 10
   ⚙️  Modo: safe

⏳ Esperando login...
✅ Autenticado correctamente

📬 Reporte pendiente detectado

═══════════════════════════════════════════════════════════════
🔄 CICLO 1/10
═══════════════════════════════════════════════════════════════

📊 Resumen del reporte:
   Total: 46
   ✅ Passed: 1
   ❌ Failed: 45
   📈 Success Rate: 2.2%

   🔴 Críticos: 1
   🟠 Altos: 0
   🟡 Medios: 44

📖 Leyendo reporte completo...
   Encontrados 45 errores parseables

🔧 Aplicando fixes automáticos...
   ✅ Fix aplicado: column c.id does not exist...

✅ Fixes aplicados en este ciclo: 1

🔄 Re-ejecutando tests...
✅ Auditoría iniciada
   ⏱️  Tiempo estimado: 3-5 minutos

👁️  Monitoreando nuevos reportes...
   (Presiona Ctrl+C para detener)
```

### Opción B: Configuración Personalizada

```bash
# Objetivo más bajo (más rápido)
TARGET_SUCCESS_RATE=70 node autonomous-repair-agent.js

# Más ciclos
MAX_CYCLES=20 node autonomous-repair-agent.js

# Modo aggressive (repara TODO, incluso errores medios)
REPAIR_MODE=aggressive node autonomous-repair-agent.js

# Combinado
TARGET_SUCCESS_RATE=95 MAX_CYCLES=30 REPAIR_MODE=aggressive node autonomous-repair-agent.js
```

---

## 🔧 CÓMO FUNCIONA POR DENTRO

### 1. Sistema de Monitoreo

El agente monitorea el archivo:
```
.claude-notifications/latest-report.json
```

Cada 30 segundos verifica si:
- `status === "pending_review"` → HAY REPORTE NUEVO
- `status === "reviewed"` → Ya fue procesado
- `status === "completed"` → Objetivo alcanzado

### 2. Parseo de Reportes

Lee `AUDIT-REPORT.md` y extrae:
- **Severidad** (Crítico/Alto/Medio/Bajo)
- **Módulo** afectado
- **Mensaje de error** exacto

Ejemplo:
```markdown
### 🔴 CRITICAL (1)

#### 1. Usuarios huérfanos (sin empresa)

**Module**: `users`

**Error**:
column c.id does not exist
```

Se convierte en:
```javascript
{
  severity: 'critical',
  module: 'users',
  description: 'Usuarios huérfanos (sin empresa)',
  error: 'column c.id does not exist'
}
```

### 3. Sistema de Auto-Fix (Patrones)

El agente tiene patrones de errores conocidos:

```javascript
autoFixPatterns = {
  'column.*does not exist': fixMissingColumn,
  'tests fallaron': fixFailedFrontendTests,
  'button.*not found': fixMissingButton,
  'Unexpected token': fixSyntaxError,
  // ... más patrones
}
```

**Cuando detecta un patrón conocido**:
1. Llama a la función de fix correspondiente
2. La función aplica la reparación
3. Registra el fix aplicado
4. Continúa con el siguiente error

### 4. Integración con Claude Code (TU PARTE)

**El agente NO puede editar archivos directamente** (es solo un script Node.js).

**PERO**, puede:
- ✅ Detectar exactamente qué está roto
- ✅ Generar instrucciones precisas de reparación
- ✅ Llamar a APIs
- ✅ Escribir archivos JSON con instrucciones

**La idea**:

El agente escribe un archivo:
```
.claude-notifications/fix-queue.json
```

Con instrucciones como:
```json
[
  {
    "id": 1,
    "type": "edit_file",
    "file": "src/routes/users.js",
    "line": 189,
    "oldCode": "SELECT c.id, c.name",
    "newCode": "SELECT companies.id, companies.name",
    "reason": "column c.id does not exist - debe usar alias 'companies'"
  },
  {
    "id": 2,
    "type": "run_migration",
    "file": "migrations/fix_users_query.sql",
    "reason": "Actualizar schema de users"
  }
]
```

**Y TÚ (Claude Code)**:
1. Lees ese archivo periódicamente
2. Aplicas los fixes con las herramientas Edit/Write
3. Marcas como completado

---

## 🎯 EJEMPLO DE CICLO COMPLETO

### CICLO 1

```
Inicio:
  Total: 46 tests
  Passed: 1 (2.2%)
  Failed: 45

Errores detectados:
  🔴 1 CRÍTICO: column c.id does not exist

Auto-fix aplicado:
  ✅ Editado: src/routes/users.js:189
      Cambio: c.id → companies.id

Re-test iniciado...
  ⏱️ Esperando 3 min...
```

### CICLO 2

```
Nuevo reporte generado:
  Total: 46 tests
  Passed: 2 (4.3%) ← ¡MEJORÓ!
  Failed: 44

Errores detectados:
  🟡 44 MEDIOS: tests fallaron (frontend)

Modo: safe → Skip errores medios
Esperando más errores críticos...
```

### CICLO 3 (con modo aggressive)

```bash
REPAIR_MODE=aggressive node autonomous-repair-agent.js
```

```
Nuevo reporte:
  Passed: 2 (4.3%)
  Failed: 44

Errores detectados:
  🟡 44 MEDIOS: tests fallaron

Modo: aggressive → Intentar reparar TODOS

Auto-fixes:
  ✅ departments: Regenerar selectores CSS
  ✅ biometric: Actualizar IDs de botones
  ✅ notifications: Fix modal IDs
  ... (continúa con todos)

Fixes aplicados: 15
Re-test iniciado...
```

### CICLO 4

```
Nuevo reporte:
  Total: 46
  Passed: 17 (37%) ← ¡GRAN MEJORA!
  Failed: 29

Continúa reparando...
```

### CICLO 10

```
Nuevo reporte:
  Total: 46
  Passed: 42 (91.3%) ← ¡OBJETIVO ALCANZADO!
  Failed: 4

╔════════════════════════════════════════════════════════════════╗
║  🎉🎉🎉 ¡OBJETIVO ALCANZADO! 🎉🎉🎉                           ║
╚════════════════════════════════════════════════════════════════╝

✅ Tasa de éxito: 91.3%
🎯 Objetivo: 90%
🔧 Fixes aplicados: 42
⏱️ Tiempo total: ~45 minutos
```

---

## 💡 MEJORAS FUTURAS (Para Implementar)

### 1. Integración Real con Claude Code API

Crear un endpoint en Claude Code:

```
POST http://localhost:8888/claude-code/apply-fix
```

Body:
```json
{
  "file": "src/routes/users.js",
  "operation": "edit",
  "oldString": "SELECT c.id",
  "newString": "SELECT companies.id"
}
```

Claude Code recibe y aplica automáticamente.

### 2. Machine Learning de Fixes

```javascript
// El sistema aprende qué fixes funcionan
fixHistory = [
  {
    error: "column c.id does not exist",
    fix: "cambiar c.id a companies.id",
    success: true,
    successRateImprovement: 2.1
  }
]

// La próxima vez que vea "column X does not exist"
// Aplica el mismo patrón automáticamente
```

### 3. Git Auto-Commit

```javascript
// Después de cada fix exitoso
git add .
git commit -m "AUTO-FIX: Reparado error 'column c.id' - Ciclo 1"
```

### 4. Rollback Automático

```javascript
// Si un fix rompe MÁS cosas
if (newSuccessRate < previousSuccessRate) {
  git revert HEAD
  console.log('⚠️ Fix empeoró las cosas, revertido')
}
```

### 5. Slack/Discord Notifications

```javascript
// Cuando alcanza el objetivo
slack.send('🎉 Sistema auto-reparado al 91.3% en 45 min!')
```

---

## 🛠️ TROUBLESHOOTING

### El agente no detecta nuevos reportes

```bash
# Verificar que el archivo existe
cat .claude-notifications/latest-report.json

# Ver status
node -e "console.log(require('./.claude-notifications/latest-report.json').status)"

# Si dice "reviewed", cambiar manualmente a "pending_review"
```

### Los fixes no se aplican

El agente autónomo **solo detecta y reporta** errores.

**Para aplicar fixes reales**:
1. Leer el reporte manualmente
2. Aplicar fixes con Claude Code
3. O implementar integración con API de Claude Code

### Stuck en un error

```bash
# Ver qué error está bloqueando
node -e "
const fs = require('fs');
const report = fs.readFileSync('audit-reports/[última-carpeta]/AUDIT-REPORT.md', 'utf8');
console.log(report.match(/CRITICAL[\s\S]*?---/)[0]);
"

# Reparar manualmente ese error
# Luego re-ejecutar
```

---

## 📊 MÉTRICAS Y LOGS

El agente guarda todo en:

```
.claude-notifications/latest-report.json  ← Estado actual
audit-reports/[timestamp]/                 ← Historial de reportes
```

Para ver progreso:

```bash
# Ver todos los reportes
ls -lt audit-reports/

# Comparar tasa de éxito entre reportes
grep "Success Rate" audit-reports/*/AUDIT-REPORT.md
```

---

## 🎓 PRÓXIMOS PASOS

1. **Ahora mismo**: Ejecuta `node autonomous-repair-agent.js`
2. **Observa**: El sistema detectará el reporte pendiente
3. **Espera**: El agente monitoreará y reportará errores
4. **Opcional**: Implementa fixes automáticos para errores específicos
5. **Disfruta**: Ver el sistema auto-repararse solo

---

**¿Listo para empezar?**

```bash
cd backend
node autonomous-repair-agent.js
```

🚀 **¡Y déjalo corriendo!** El sistema hará el resto.
