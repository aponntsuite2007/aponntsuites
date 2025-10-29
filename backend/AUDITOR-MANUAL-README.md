# 🔍 AUDITOR - Sistema Completo de Auto-Diagnóstico y Auto-Reparación

## 📋 ÍNDICE

1. [Auditoría Manual](#auditoría-manual) - Detección de errores reales a demanda
2. [Auditor Iterativo](#auditor-iterativo) - Ciclos de auto-reparación (500+ ciclos)
3. [Production Error Monitor](#production-error-monitor) - Auto-aprendizaje continuo

---

# 🔍 AUDITORÍA MANUAL

## ✅ QUÉ SE IMPLEMENTÓ

Este sistema detecta **errores REALES** que aparecen al navegar el sistema, como:

```html
<div id="training-message">❌ Error cargando capacitaciones del servidor</div>
```

### Características:
- ✅ Detecta mensajes de error visibles (divs con fondo rojo, texto "error", etc.)
- ✅ Se ejecuta **A DEMANDA** (NO automático)
- ✅ Muestra resultados en consola con colores
- ✅ Testea todos los 44 módulos del sistema
- ✅ Identifica qué módulos tienen errores de navegación

---

## 🚀 CÓMO USAR

### **OPCIÓN 1: Ejecutar Auditoría Completa (Terminal)**

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
PORT=9999 node manual-audit-with-error-detection.js
```

**Qué hace:**
1. Se autentica automáticamente
2. Ejecuta auditoría de TODOS los módulos (44 módulos)
3. Navega cada módulo con Puppeteer
4. Detecta mensajes de error visibles
5. Muestra resultado en consola

**Duración:** ~3-5 minutos

---

### **OPCIÓN 2: Ejecutar desde la API (Más Control)**

#### 2.1 **Ejecutar Auditoría Completa**

```bash
curl -X POST http://localhost:9999/api/audit/run \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parallel": true, "autoHeal": false}'
```

Respuesta:
```json
{
  "success": true,
  "execution_id": "abc-123-def",
  "status": "running"
}
```

#### 2.2 **Consultar Estado**

```bash
curl -X GET "http://localhost:9999/api/audit/executions/abc-123-def" \
  -H "Authorization: Bearer TU_TOKEN"
```

Respuesta:
```json
{
  "execution_id": "abc-123-def",
  "status": "completed",
  "summary": {
    "total": 46,
    "passed": 1,
    "failed": 45
  },
  "logs": [...]
}
```

#### 2.3 **Auditar UN SOLO Módulo**

```bash
curl -X POST http://localhost:9999/api/audit/run/training-management \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## 📊 QUÉ DETECTA

El sistema busca errores basándose en:

1. **Texto de error**: "error", "falló", "problema", "❌", "no se pudo"
2. **Fondo rojo**: `rgb(220, 53, 69)`, `rgb(239, 68, 68)`, etc.
3. **IDs específicos**: `training-message`, `error-message`, etc.

### Ejemplo de Log:

```
🔴 [ERROR DETECTADO] 1 mensajes de error visibles:
   ❌ "Error cargando capacitaciones del servidor" (id: training-message)
```

---

## 🔧 CÓMO ACTIVAR/DESACTIVAR MONITOR EN TIEMPO REAL

### **Activar Monitor (cada 2 minutos)**

```bash
curl -X POST http://localhost:9999/api/audit/monitor/start \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interval": 120000}'
```

### **Desactivar Monitor**

```bash
curl -X POST http://localhost:9999/api/audit/monitor/stop \
  -H "Authorization: Bearer TU_TOKEN"
```

### **Ver Estado del Monitor**

```bash
curl -X GET http://localhost:9999/api/audit/monitor/status \
  -H "Authorization: Bearer TU_TOKEN"
```

Respuesta:
```json
{
  "status": "running",
  "metrics": {
    "totalChecks": 5,
    "failuresDetected": 3,
    "currentHealth": 70
  }
}
```

---

## 🛠️ ARCHIVOS MODIFICADOS

### **Backend:**

1. **`src/auditor/collectors/FrontendCollector.js`**
   - Agregado: `detectVisibleErrors()` (líneas 303-351)
   - Detecta mensajes de error en tiempo real

2. **`manual-audit-with-error-detection.js`**
   - Script standalone para ejecutar auditoría manual
   - Muestra resultados con colores en consola

### **API Endpoints:**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/audit/run` | POST | Ejecutar auditoría completa |
| `/api/audit/run/:module` | POST | Auditar módulo específico |
| `/api/audit/executions/:id` | GET | Ver resultado de ejecución |
| `/api/audit/monitor/start` | POST | Activar monitor en tiempo real |
| `/api/audit/monitor/stop` | POST | Desactivar monitor |
| `/api/audit/monitor/status` | GET | Ver estado del monitor |

---

## 📝 EJEMPLOS DE USO

### **Ejemplo 1: Testear módulo "training-management"**

```bash
# 1. Obtener token
TOKEN=$(curl -s -X POST http://localhost:9999/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123","companyId":11}' \
  | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).token)")

# 2. Ejecutar auditoría del módulo
curl -X POST http://localhost:9999/api/audit/run/training-management \
  -H "Authorization: Bearer $TOKEN"

# 3. Ver resultados (esperar ~30 segundos)
curl -X GET "http://localhost:9999/api/audit/executions/EXECUTION_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### **Ejemplo 2: Activar monitor por 5 minutos**

```bash
# 1. Activar monitor (intervalo de 5 minutos)
curl -X POST http://localhost:9999/api/audit/monitor/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interval": 300000}'

# 2. Ver estado cada minuto
while true; do
  curl -s http://localhost:9999/api/audit/monitor/status \
    -H "Authorization: Bearer $TOKEN" | jq
  sleep 60
done

# 3. Detener monitor
curl -X POST http://localhost:9999/api/audit/monitor/stop \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 PRÓXIMOS PASOS (OPCIONAL)

### **Integrar en el Frontend:**

Agregar botón en el módulo "Configuración del Sistema":

```javascript
// En settings.js
async function runSystemAudit() {
  showMessage('Ejecutando auditoría...', 'info');

  const response = await fetch('/api/audit/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ parallel: true, autoHeal: false })
  });

  const data = await response.json();
  showMessage(`Auditoría iniciada. ID: ${data.execution_id}`, 'success');
}
```

---

## ❓ FAQ

**P: ¿Se ejecuta automáticamente?**
R: NO. Solo se ejecuta cuando TÚ lo llamas manualmente.

**P: ¿Detecta errores que aparecen al usuario?**
R: SÍ. Detecta divs con mensajes de error visibles (como "Error cargando capacitaciones").

**P: ¿Puedo ver los resultados en tiempo real?**
R: SÍ. Ejecuta `node manual-audit-with-error-detection.js` y verás los logs en consola.

**P: ¿Cuánto tarda?**
R: ~3-5 minutos para 44 módulos. ~30 segundos para 1 módulo.

---

## 📞 SOPORTE

- **Logs del Servidor**: `BashOutput` del servidor en puerto 9999
- **Logs del Auditor**: Consola donde ejecutaste `manual-audit-with-error-detection.js`
- **Resultados en BD**: Tabla `audit_logs`

---

# 🔁 AUDITOR ITERATIVO

## ✅ NUEVO: Ciclos de Auto-Reparación (500+ ciclos)

Sistema de **ciclos iterativos** que ejecuta auditoría + reparación múltiples veces hasta alcanzar 100% de funcionalidad.

### 🚀 CÓMO USAR

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend

# Ejecutar 500 ciclos hasta alcanzar 100%
PORT=9999 MAX_CYCLES=500 TARGET=100 node run-iterative-audit.js

# Ver navegador en tiempo real + logs detallados en consola
# Parar de forma segura: Ctrl+C
```

### 📊 CARACTERÍSTICAS

- ✅ **Ciclos parametrizables** (1 a 500+ ciclos)
- ✅ **Navegador VISIBLE** en tiempo real (headless: false)
- ✅ **Parada segura** con Ctrl+C
- ✅ **Auto-aprendizaje** con ProductionErrorMonitor
- ✅ **Mejora incremental** en cada ciclo

### 📋 EJEMPLO DE SALIDA

```
╔════════════════════════════════════════════════════════════════╗
║  🔁 AUDITOR ITERATIVO - INICIO DE CICLOS                      ║
╚════════════════════════════════════════════════════════════════╝

📋 Configuración:
   • Ciclos máximos: 500
   • Objetivo de éxito: 100%
   • Navegador: VISIBLE

═══════════════════════════════════════════════════════════════
🔄 CICLO 1/500
═══════════════════════════════════════════════════════════════

  1️⃣ Ejecutando auditoría completa...
  2️⃣ Reparando errores detectados...
      🔧 Reparando: "Error cargando capacitaciones del servidor"
      ✅ Reparados: 2/3
  3️⃣ Documentando aprendizaje...

─────────────────────────────────────────────────────────────────
📊 RESUMEN DEL CICLO 1
─────────────────────────────────────────────────────────────────
   Tests totales:       46
   ✅ Pasados:          23
   ❌ Fallidos:         23
   🔧 Reparados:        2
   📈 Tasa de éxito:    50.0%
   ⏱️  Duración:         67.2s
─────────────────────────────────────────────────────────────────

[... ciclos 2-499 ...]

╔════════════════════════════════════════════════════════════════╗
║  🎉 ¡OBJETIVO ALCANZADO!                                      ║
╚════════════════════════════════════════════════════════════════╝

✅ Tasa de éxito: 100.0%
🔁 Ciclos completados: 123/500
📈 Mejora total: +50.0%
```

### 📖 DOCUMENTACIÓN COMPLETA

Ver: `ITERATIVE-AUDITOR-README.md`

---

# 🧠 PRODUCTION ERROR MONITOR

## ✅ Auto-Aprendizaje Continuo

Sistema que cierra el ciclo completo:

```
Error Real → Diagnóstico → Reparación → Documentación → Aprendizaje → Asistencia
```

### 🔄 CICLO COMPLETO

1. **Usuario navega** → Encuentra error visible
2. **Sistema detecta** → Error se captura automáticamente
3. **Auditor diagnostica** → Identifica causa raíz
4. **Healer repara** → Intenta solución automática
5. **Knowledge Base** → Documenta solución
6. **Ollama aprende** → Próximo usuario recibe la solución

### 📚 INTEGRACIÓN CON IA

Cada error detectado y reparado se documenta como:

```json
{
  "question": "¿Por qué no se cargan las capacitaciones?",
  "answer": "El error se debía a que el endpoint /api/training no existía. Se creó automáticamente y ahora funciona.",
  "source": "production-auto-learning",
  "confidence": 0.9
}
```

Cuando un usuario pregunta a Ollama, obtiene la solución **REAL** del error, no una respuesta genérica.

---

## 🎯 FLUJO RECOMENDADO

### **1. DESARROLLO (QA)**

```bash
# Ejecutar 500 ciclos iterativos para corregir todo
PORT=9999 MAX_CYCLES=500 TARGET=100 node run-iterative-audit.js

# Resultado: Sistema al 100% de funcionalidad
```

### **2. PRE-PRODUCCIÓN**

```bash
# Auditoría manual completa
PORT=9999 node manual-audit-with-error-detection.js

# Verificar: 0 errores detectados
```

### **3. PRODUCCIÓN**

```javascript
// ProductionErrorMonitor activo
// Reporta errores automáticamente
// NO ejecuta Puppeteer
// Solo diagnóstico + documentación
```

---

## 📁 ARCHIVOS DEL SISTEMA COMPLETO

### **Core:**
- `src/auditor/core/AuditorEngine.js` - Orchestrator principal
- `src/auditor/core/IterativeAuditor.js` - Ciclos iterativos
- `src/auditor/core/ProductionErrorMonitor.js` - Auto-aprendizaje
- `src/auditor/registry/SystemRegistry.js` - 45 módulos registrados

### **Collectors:**
- `src/auditor/collectors/FrontendCollector.js` - Tests E2E con Puppeteer
- `src/auditor/collectors/DatabaseCollector.js` - Tests de BD
- `src/auditor/collectors/EndpointCollector.js` - Tests de API
- `src/auditor/collectors/IntegrationCollector.js` - Tests de dependencias

### **Healers:**
- `src/auditor/healers/AdvancedHealer.js` - Auto-reparación avanzada
- `src/auditor/healers/HybridHealer.js` - Auto-reparación híbrida

### **Scripts:**
- `run-iterative-audit.js` - Ciclos iterativos desde terminal
- `manual-audit-with-error-detection.js` - Auditoría manual

### **API:**
- `src/routes/auditorRoutes.js` - 744 líneas, 18 endpoints

### **Documentación:**
- `AUDITOR-MANUAL-README.md` - Este archivo (overview completo)
- `ITERATIVE-AUDITOR-README.md` - Documentación de ciclos iterativos

---

**Última actualización:** Octubre 2025
**Versión:** 3.0.0 (Sistema completo: Manual + Iterativo + Auto-aprendizaje)
