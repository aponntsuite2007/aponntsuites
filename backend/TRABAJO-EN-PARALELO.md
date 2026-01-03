# 🔄 TRABAJO EN PARALELO - Discovery + Integración SYNAPSE

## ⏰ ESTADO ACTUAL

### 🔄 EN BACKGROUND (2-4 horas)
**Discovery Masivo**: 50 módulos
- Script: `run-discovery-all-modules.js`
- Progreso: Verificar con `ls tests/e2e/discovery-results/*.discovery.json | wc -l`
- Log: `discovery-all-modules.log`

### ✅ COMPLETADO MIENTRAS DISCOVERY CORRE

#### 1. Config Generator (`src/synapse/config-generator.js`)
**Qué hace**:
- Lee discovery JSON
- Genera config E2E con selectores REALES
- Mapea modales, tabs, campos
- Genera test values inteligentes

**Uso**:
```bash
# Generar config de un módulo
node src/synapse/config-generator.js users

# Generar todos los configs disponibles
node src/synapse/config-generator.js
```

**Output**: `tests/e2e/configs/<module>.json`

#### 2. Deadend Detector (`src/synapse/deadend-detector.js`) ⭐
**Qué hace** (LO QUE PEDISTE):
- ✅ Detecta **selects vacíos** (SSOT no configurado)
- ✅ Detecta **botones sin handler** (no responden)
- ✅ Detecta **dependencias rotas** entre módulos
- ✅ Detecta **circuitos de datos incompletos**
- ✅ Genera **orden correcto de ejecución** de tests

**Ejemplo de detección**:
```javascript
// Campo "Departamento" en modal CREATE
{
  type: 'BROKEN_DEPENDENCY',
  severity: 'HIGH',
  field: 'Departamento',
  dependsOn: 'departments',
  reason: 'Select vacío - módulo "departments" no configurado',
  suggestedFix: '1. Configurar módulo "departments" primero\n2. Agregar al menos 1 registro\n3. Verificar FK en DB',
  impact: 'Test fallará porque campo required está vacío',
  testOrder: 'Ejecutar "departments" ANTES de este módulo'
}
```

**Uso**:
```bash
# Analizar deadends de un módulo
node src/synapse/deadend-detector.js users
```

**Output**: `tests/e2e/discovery-results/<module>.deadends.json`

---

## 🎯 PRÓXIMOS PASOS (cuando discovery complete)

### 1. Generar Configs de 50 Módulos
```bash
node src/synapse/config-generator.js
# ✅ Genera 50 configs E2E con selectores reales
```

### 2. Detectar Deadends en Todos
```bash
for module in users attendance shifts departments...; do
  node src/synapse/deadend-detector.js $module
done
# ✅ Identifica módulos con problemas
# ✅ Genera orden de ejecución correcto
```

### 3. Integrar a SYNAPSE (próximo paso)
Modificar `SynapseOrchestrator.js`:
- Pre-check: Ejecutar deadend detector
- Si hay deadends HIGH → reportar y skip
- Si hay dependencias → ejecutar en orden correcto
- Auto-generar config si no existe
- Ejecutar test con config real

### 4. Ejecutar SYNAPSE Inteligente
```bash
npm run synapse:batch --intelligent
# ✅ Auto-descubre módulos nuevos
# ✅ Detecta y reporta deadends
# ✅ Ejecuta en orden de dependencias
# ✅ Usa configs reales
```

---

## 💡 EJEMPLO DE FLUJO COMPLETO

### Módulo: attendance

**1. Discovery** (corriendo ahora):
```json
{
  "module": "attendance",
  "modals": [{
    "type": "CREATE",
    "fields": [
      { "label": "Empleado", "tagName": "select" },
      { "label": "Departamento", "tagName": "select" }
    ]
  }]
}
```

**2. Deadend Detection**:
```json
{
  "deadends": [
    {
      "type": "BROKEN_DEPENDENCY",
      "field": "Empleado",
      "dependsOn": "users",
      "suggestedFix": "Ejecutar test de 'users' primero"
    },
    {
      "type": "BROKEN_DEPENDENCY",
      "field": "Departamento",
      "dependsOn": "departments",
      "suggestedFix": "Ejecutar test de 'departments' primero"
    }
  ],
  "testOrder": ["users", "departments", "attendance"]
}
```

**3. Config Generation**:
```json
{
  "moduleKey": "attendance",
  "actions": {
    "create": {
      "modal": {
        "fields": [
          {
            "label": "Empleado",
            "selector": "select[name='employee_id']",
            "dependsOn": "users"
          },
          {
            "label": "Departamento",
            "selector": "select[name='department_id']",
            "dependsOn": "departments"
          }
        ]
      }
    }
  }
}
```

**4. SYNAPSE Execution**:
```
1. Detecta dependencias: users, departments
2. Verifica que ambos existan y tengan datos
3. Si no existen → ejecuta tests de users y departments primero
4. Ejecuta test de attendance con config real
5. Si select vacío → reporta deadend específico
```

---

## 🚀 BENEFICIOS DE ESTA INTEGRACIÓN

### Antes (SYNAPSE sin Discovery):
- ❌ Configs genéricos (selectores hardcodeados)
- ❌ Tests fallan por selectores incorrectos
- ❌ No detecta dependencias rotas
- ❌ Orden de ejecución aleatorio
- ❌ Selects vacíos → test falla sin explicación

### Después (SYNAPSE + Discovery + Deadend):
- ✅ Configs reales (selectores descubiertos)
- ✅ Auto-detección de selectores cambiados
- ✅ Detecta y reporta dependencias rotas
- ✅ Orden de ejecución inteligente
- ✅ Selects vacíos → reporta "falta configurar SSOT X"

---

## 📊 MONITOREO

### Ver progreso del discovery:
```bash
# Cuántos módulos se han descubierto
ls tests/e2e/discovery-results/*.discovery.json | wc -l

# Ver log en tiempo real
tail -f discovery-all-modules.log
```

### Cuando discovery complete:
```bash
# Ver resumen
cat tests/e2e/discovery-results/discovery-summary.json

# Generar todos los configs
node src/synapse/config-generator.js

# Detectar deadends en todos
# (crear script batch próximamente)
```

---

## 🎯 OBJETIVO FINAL

**45+/50 módulos PASSED** con:
- ✅ Configs auto-generados desde discovery
- ✅ Deadends detectados y reportados
- ✅ Orden de ejecución correcto
- ✅ Tests inteligentes que detectan circuitos rotos

---

**Última actualización**: 2025-12-28 17:00
**Discovery status**: En progreso (background)
**Integración status**: Config Generator + Deadend Detector completados
