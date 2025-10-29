# 🔁 AUDITOR ITERATIVO - Ciclos de Auto-Reparación

## ✅ QUÉ SE IMPLEMENTÓ

Sistema de **ciclos iterativos de auto-reparación** que ejecuta auditoría + diagnóstico + reparación múltiples veces hasta alcanzar el 100% de funcionalidad.

### Características:

- ✅ **Ciclos parametrizables** (1 a 500+ ciclos)
- ✅ **Objetivo configurable** (70%, 90%, 100% de éxito)
- ✅ **Navegador VISIBLE** en tiempo real (headless: false)
- ✅ **Logs detallados** en consola con colores y gráficos ASCII
- ✅ **Parada segura** con Ctrl+C (completa ciclo actual antes de salir)
- ✅ **Auto-aprendizaje** con ProductionErrorMonitor
- ✅ **Documentación automática** en Knowledge Base
- ✅ **Mejora incremental** en cada ciclo
- ✅ **Métricas en tiempo real** (tasa de éxito, errores, reparaciones)

---

## 🚀 CÓMO USAR

### **OPCIÓN 1: Ejecutar desde Terminal (Recomendado)**

```bash
cd C:\Bio\sistema_asistencia_biometrico\backend

# Ejecutar 10 ciclos (por defecto)
PORT=9999 node run-iterative-audit.js

# Ejecutar 500 ciclos hasta alcanzar 100%
PORT=9999 MAX_CYCLES=500 TARGET=100 node run-iterative-audit.js

# Ejecutar 50 ciclos hasta 90%
PORT=9999 MAX_CYCLES=50 TARGET=90 COMPANY_ID=11 node run-iterative-audit.js
```

**Variables de entorno:**
- `PORT` - Puerto del servidor (default: 9999)
- `MAX_CYCLES` - Número máximo de ciclos (default: 10)
- `TARGET` - Objetivo de tasa de éxito en % (default: 100)
- `COMPANY_ID` - ID de empresa a auditar (default: 11)

**Para DETENER de forma segura:**
- Presiona `Ctrl+C`
- El sistema completará el ciclo actual antes de salir
- Se guardarán todas las métricas y resultados

---

### **OPCIÓN 2: Ejecutar desde la API**

#### 2.1 **Iniciar Ciclos Iterativos**

```bash
# Obtener token
TOKEN=$(curl -s -X POST http://localhost:9999/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123","companyId":11}' \
  | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).token)")

# Iniciar 500 ciclos
curl -X POST http://localhost:9999/api/audit/iterative/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maxCycles": 500,
    "targetSuccessRate": 100,
    "companyId": 11
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Ciclos iterativos iniciados",
  "config": {
    "maxCycles": 500,
    "targetSuccessRate": 100,
    "companyId": 11
  }
}
```

#### 2.2 **Ver Estado en Tiempo Real**

```bash
# Consultar estado cada 10 segundos
while true; do
  curl -s http://localhost:9999/api/audit/iterative/status \
    -H "Authorization: Bearer $TOKEN" | jq
  sleep 10
done
```

**Respuesta:**
```json
{
  "success": true,
  "status": {
    "isRunning": true,
    "currentCycle": 15,
    "maxCycles": 500,
    "targetSuccessRate": 100,
    "currentSuccessRate": 67.3,
    "totalErrors": 45,
    "totalRepairs": 32,
    "successRateHistory": [45.2, 52.1, 58.9, 63.4, 67.3],
    "startTime": "2025-10-20T15:30:00.000Z",
    "cycleDetails": [ /* últimos 10 ciclos */ ]
  }
}
```

#### 2.3 **Detener Ciclos de Forma Segura**

```bash
curl -X POST http://localhost:9999/api/audit/iterative/stop \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Señal de parada enviada. El ciclo actual se completará antes de detenerse."
}
```

#### 2.4 **Ver Métricas Completas**

```bash
curl -X GET http://localhost:9999/api/audit/iterative/metrics \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "metrics": {
    "totalCycles": 15,
    "totalErrors": 45,
    "totalRepairs": 32,
    "successRateHistory": [45.2, 52.1, 58.9, 63.4, 67.3, ...],
    "currentSuccessRate": 67.3,
    "startTime": "2025-10-20T15:30:00.000Z",
    "endTime": null,
    "cycleDetails": [ /* todos los ciclos */ ]
  }
}
```

---

## 📊 QUÉ HACE EN CADA CICLO

```
╔═══════════════════════════════════════════════════════════╗
║  CICLO 1/500                                              ║
╚═══════════════════════════════════════════════════════════╝

  1️⃣ Ejecutar auditoría completa (45 módulos)
     - FrontendCollector: Navega cada módulo en Puppeteer
     - DatabaseCollector: Tests de BD
     - EndpointCollector: Tests de API
     - IntegrationCollector: Tests de dependencias

  2️⃣ Detectar errores REALES
     - Mensajes de error visibles (ej: "❌ Error cargando capacitaciones")
     - Divs con fondo rojo
     - IDs específicos (#training-message, #error-message)

  3️⃣ Reparar errores automáticamente
     - Diagnóstico con AuditorEngine
     - Reparación con AdvancedHealer/HybridHealer
     - Documentación en Knowledge Base

  4️⃣ Documentar aprendizaje
     - Crear pregunta natural ("¿Por qué no cargan las capacitaciones?")
     - Crear respuesta detallada con diagnóstico + solución
     - Guardar en Knowledge Base GLOBAL (todas las empresas aprenden)

  5️⃣ Calcular métricas
     - Tasa de éxito: 45.2% → 52.1% (mejora: +6.9%)
     - Errores detectados: 12
     - Errores reparados: 8

  6️⃣ Mostrar resumen
─────────────────────────────────────────────────────────────────
📊 RESUMEN DEL CICLO 1
─────────────────────────────────────────────────────────────────
   Tests totales:       46
   ✅ Pasados:          24
   ❌ Fallidos:         22
   🔧 Reparados:        8
   📚 KB Entries:       8
   📈 Tasa de éxito:    52.1%
   ⏱️  Duración:         45.3s
─────────────────────────────────────────────────────────────────

  ⏸️  Pausa de 2 segundos antes del siguiente ciclo...
```

---

## 📈 EJEMPLO DE SALIDA COMPLETA

```
╔════════════════════════════════════════════════════════════════╗
║  🔁 AUDITOR ITERATIVO - INICIO DE CICLOS                      ║
╚════════════════════════════════════════════════════════════════╝

📋 Configuración:
   • Ciclos máximos: 10
   • Objetivo de éxito: 100%
   • Empresa: 11
   • Navegador: VISIBLE (headless: false)

🛑 Para DETENER de forma segura: Ctrl+C

═══════════════════════════════════════════════════════════════
🔄 CICLO 1/10
═══════════════════════════════════════════════════════════════

  1️⃣ Ejecutando auditoría completa...
  2️⃣ Reparando errores detectados...
      🔧 Reparando: "Error cargando capacitaciones del servidor"
      🔧 Reparando: "Error cargando datos de usuarios"
      ✅ Reparados: 2/3
  3️⃣ Documentando aprendizaje...
      📚 Aprendizaje documentado: 2 entradas

─────────────────────────────────────────────────────────────────
📊 RESUMEN DEL CICLO 1
─────────────────────────────────────────────────────────────────
   Tests totales:       46
   ✅ Pasados:          23
   ❌ Fallidos:         23
   🔧 Reparados:        2
   📚 KB Entries:       2
   📈 Tasa de éxito:    50.0%
   ⏱️  Duración:         67.2s
─────────────────────────────────────────────────────────────────

...

═══════════════════════════════════════════════════════════════
🔄 CICLO 10/10
═══════════════════════════════════════════════════════════════

  1️⃣ Ejecutando auditoría completa...
  2️⃣ Reparando errores detectados...
      ✅ Reparados: 0/0
  3️⃣ Documentando aprendizaje...
      📚 Aprendizaje documentado: 0 entradas

─────────────────────────────────────────────────────────────────
📊 RESUMEN DEL CICLO 10
─────────────────────────────────────────────────────────────────
   Tests totales:       46
   ✅ Pasados:          46
   ❌ Fallidos:         0
   🔧 Reparados:        0
   📚 KB Entries:       0
   📈 Tasa de éxito:    100.0%
   ⏱️  Duración:         42.1s
─────────────────────────────────────────────────────────────────

╔════════════════════════════════════════════════════════════════╗
║  🎉 ¡OBJETIVO ALCANZADO!                                      ║
╚════════════════════════════════════════════════════════════════╝

✅ Tasa de éxito: 100.0% (objetivo: 100.0%)
🔁 Ciclos completados: 10/10

╔════════════════════════════════════════════════════════════════╗
║  📊 RESUMEN FINAL - AUDITOR ITERATIVO                         ║
╚════════════════════════════════════════════════════════════════╝

🔁 Ciclos completados:           10/10
❌ Total de errores detectados:  23
🔧 Total de reparaciones:        15
📚 Entradas en Knowledge Base:   15

📈 Tasa de éxito inicial:        50.0%
📈 Tasa de éxito final:          100.0%
📈 Tasa de éxito promedio:       78.3%
📈 Mejora total:                 +50.0%

⏱️  Duración total:               8.5 minutos
⏱️  Tiempo promedio por ciclo:   51.2 segundos

📊 PROGRESO POR CICLO:

   Ciclo   1: ███████████████░░░░░░░░░░░░░░  50.0%
   Ciclo   2: ████████████████░░░░░░░░░░░░░░  54.3%
   Ciclo   3: ██████████████████░░░░░░░░░░░░  60.9%
   Ciclo   4: ████████████████████░░░░░░░░░░  67.4%
   Ciclo   5: ██████████████████████░░░░░░░░  73.9%
   Ciclo   6: ████████████████████████░░░░░░  80.4%
   Ciclo   7: ██████████████████████████░░░░  86.9%
   Ciclo   8: ████████████████████████████░░  93.5%
   Ciclo   9: ██████████████████████████████  100.0%
   Ciclo  10: ██████████████████████████████  100.0%
```

---

## 🎯 CICLO COMPLETO DE AUTO-APRENDIZAJE

```
Usuario navega → Encuentra error "❌ Error cargando capacitaciones"
    ↓
FrontendCollector detecta error en navegación real
    ↓
IterativeAuditor dispara reparación
    ↓
ProductionErrorMonitor.diagnoseError() ejecuta AuditorEngine
    ↓
Identifica causa: API endpoint /api/training no existe
    ↓
ProductionErrorMonitor.attemptRepair() usa AdvancedHealer
    ↓
Healer crea endpoint faltante automáticamente
    ↓
ProductionErrorMonitor.documentLearning() guarda en Knowledge Base:
    Pregunta: "¿Por qué no se cargan las capacitaciones?"
    Respuesta: "El error se debía a que el endpoint /api/training
                no existía. Se creó automáticamente y ahora funciona."
    ↓
Próximo ciclo: Auditoría pasa al 100%
    ↓
Próximo usuario pregunta a Ollama: "¿Por qué no cargan las capacitaciones?"
    ↓
Ollama busca en Knowledge Base y retorna la solución REAL
    ↓
Sistema aprende de cada error y mejora continuamente
```

---

## 🛠️ ARCHIVOS DEL SISTEMA

### **Core:**
- `src/auditor/core/IterativeAuditor.js` - Motor de ciclos iterativos (451 líneas)
- `src/auditor/core/ProductionErrorMonitor.js` - Auto-aprendizaje (473 líneas)
- `src/auditor/core/AuditorEngine.js` - Orchestrator de auditoría

### **API:**
- `src/routes/auditorRoutes.js` - Endpoints REST (744 líneas)
  - POST `/api/audit/iterative/start` - Iniciar ciclos
  - POST `/api/audit/iterative/stop` - Detener ciclos
  - GET `/api/audit/iterative/status` - Ver estado
  - GET `/api/audit/iterative/metrics` - Ver métricas

### **Scripts Standalone:**
- `run-iterative-audit.js` - Ejecutar ciclos desde terminal
- `manual-audit-with-error-detection.js` - Auditoría manual

### **Documentación:**
- `ITERATIVE-AUDITOR-README.md` - Este archivo
- `AUDITOR-MANUAL-README.md` - Auditoría manual
- `backend/docs/AI-ASSISTANT-SYSTEM.md` - Sistema de IA

---

## ❓ FAQ

**P: ¿Cuántos ciclos debería ejecutar?**
R: Depende del estado del sistema:
- Sistema nuevo/roto: 500 ciclos
- Sistema semi-funcional: 50-100 ciclos
- Mantenimiento regular: 10-20 ciclos

**P: ¿Se puede parar en cualquier momento?**
R: SÍ. Presiona Ctrl+C y el sistema completará el ciclo actual antes de salir de forma segura.

**P: ¿Puedo ver el navegador en tiempo real?**
R: SÍ. El navegador se abre en modo VISIBLE (headless: false). Podrás ver cómo navega cada módulo.

**P: ¿Los logs se guardan?**
R: SÍ. Todos los resultados se guardan en la tabla `audit_logs` de PostgreSQL.

**P: ¿El aprendizaje es compartido entre empresas?**
R: SÍ. La Knowledge Base es GLOBAL (company_id = NULL). Si Empresa A encuentra un error, Empresa B aprende de la solución automáticamente.

**P: ¿Cuánto tarda cada ciclo?**
R: Entre 30-90 segundos dependiendo del número de módulos y la velocidad de la máquina.

**P: ¿Se puede ejecutar en producción?**
R: NO. Este sistema es para DESARROLLO y QA. En producción usa ProductionErrorMonitor que solo reporta errores sin ejecutar Puppeteer.

**P: ¿Qué pasa si alcanza el 100% antes de completar todos los ciclos?**
R: Se detiene automáticamente y muestra el mensaje "🎉 ¡OBJETIVO ALCANZADO!".

---

## 📞 SOPORTE

- **Logs del servidor**: BashOutput del servidor en puerto 9999
- **Logs de ciclos**: Consola donde ejecutaste `run-iterative-audit.js`
- **Resultados en BD**: Tabla `audit_logs` y `assistant_knowledge_base`
- **Métricas**: GET `/api/audit/iterative/metrics`

---

**Última actualización:** Octubre 2025
**Versión:** 1.0.0
