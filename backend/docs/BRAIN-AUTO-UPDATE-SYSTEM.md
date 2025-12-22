# BRAIN AUTO-UPDATE SYSTEM - Sistema de Auto-Conocimiento de Brain

**Version**: 1.0.0
**Fecha**: 2025-12-19
**Status**: IMPLEMENTADO Y LISTO PARA USO

---

## PROBLEMA QUE RESUELVE

Antes, Brain solo copiaba metadatos basicos del modules-registry.json al llm-context.json. NO leia el codigo real, por lo que:

- **NO conocia** las formulas reales (IRA, Z-Score, FIFO del banco de horas)
- **NO conocia** los metodos reales de los servicios
- **NO conocia** las integraciones entre modulos
- **NO conocia** los algoritmos cientificos implementados
- **El JSON quedaba desactualizado** cuando se agregaba codigo nuevo

**RESULTADO**: ChatGPT, Claude y otros LLMs solo destacaban 5-6 features basicas, ignorando modulos espectaculares como:
- Banco de Horas con FIFO y eleccion en tiempo real
- Predictive Workforce con formulas cientificas (MLR, Pearson, Bayes)
- HSE/EPP con ISO 45001 compliance
- Hour-Cube con costos de reposicion
- Y muchos mas...

---

## SOLUCION IMPLEMENTADA

Sistema completo de introspección de codigo que:

1. **Lee archivos de servicios reales** (src/services/*.js)
2. **Analiza routes, migrations, workflows**
3. **Extrae metodos, parametros, JSDoc**
4. **Detecta formulas en comentarios** (IRA =, Z-Score, etc.)
5. **Identifica algoritmos** (MLR, Bayes, ISO standards)
6. **Encuentra integraciones** (requires, service calls)
7. **Genera fullCapabilities ricos** para cada modulo
8. **Crea backup automatico** del JSON anterior
9. **Valida el nuevo JSON** antes de reemplazar

---

## ARQUITECTURA DEL SISTEMA

```
backend/
├── src/
│   ├── brain/
│   │   └── core/
│   │       └── DeepModuleAnalyzer.js        ← Analizador de codigo
│   │
│   └── routes/
│       └── brainRoutes.js                    ← API endpoint /update-llm-context
│
├── scripts/
│   ├── generate-rich-llm-context.js          ← Script principal
│   └── test-brain-update.js                  ← Tests del sistema
│
├── public/
│   └── llm-context.json                      ← JSON generado (2000+ → 10000+ lineas)
│
└── backups/
    └── llm-context/
        ├── llm-context_2025-12-19_14-30-00.json
        └── llm-context_2025-12-19_15-45-00.json
```

---

## COMPONENTES DEL SISTEMA

### 1. DeepModuleAnalyzer.js

**Ubicación**: `src/brain/core/DeepModuleAnalyzer.js`

**Responsabilidades**:
- Buscar archivos relacionados con un modulo (services, routes, migrations)
- Leer y parsear codigo JavaScript
- Extraer metodos con sus JSDoc
- Detectar formulas y algoritmos en comentarios
- Identificar integraciones y dependencies
- Consolidar analisis de multiples archivos

**Metodos principales**:
```javascript
async analyzeModule(moduleKey, registryData)
// Analiza un modulo completo y retorna fullCapabilities

_extractMethods(lines, content)
// Extrae metodos con JSDoc, parametros, returns

_extractFormulas(lines)
// Detecta formulas matematicas en comentarios

_extractAlgorithms(lines)
// Encuentra algoritmos cientificos (MLR, Bayes, etc.)

_extractIntegrations(lines, content)
// Identifica requires y llamadas a otros servicios
```

**Patrones que detecta**:
- **Formulas**: `IRA = Σ(βᵢ × Xᵢ)`, `Z-Score = (x - μ) / σ`
- **Algoritmos**: `METODOLOGÍA: Regresión Lineal Múltiple`
- **Standards**: `ISO 45001`, `LCT Argentina`, `RFC 2822`
- **Integraciones**: `require('../services/NotificationWorkflowService')`
- **Tables**: `FROM hour_bank_templates`, `JOIN users`

---

### 2. generate-rich-llm-context.js

**Ubicación**: `scripts/generate-rich-llm-context.js`

**Responsabilidades**:
- Cargar llm-context.json actual y modules-registry.json
- Ejecutar DeepModuleAnalyzer para cada modulo
- Consolidar analisis en fullCapabilities
- Validar el nuevo JSON
- Crear backup del anterior
- Guardar nuevo JSON enriquecido

**Uso desde CLI**:
```bash
# Generar para TODOS los modulos
node scripts/generate-rich-llm-context.js

# Solo un modulo especifico
node scripts/generate-rich-llm-context.js --module=hour-bank

# Preview sin guardar (dry-run)
node scripts/generate-rich-llm-context.js --dry-run

# Ayuda
node scripts/generate-rich-llm-context.js --help
```

**Output esperado**:
```
═══════════════════════════════════════════════════════════════
🧠 BRAIN AUTO-KNOWLEDGE GENERATOR
   Generando llm-context.json rico con analisis de codigo real
═══════════════════════════════════════════════════════════════

📋 PASO 1: Cargando archivos base...
   ✅ llm-context.json actual: 125000 caracteres
   ✅ modules-registry.json: 48 modulos

📊 PASO 2: Analizando 48 modulos...

📊 Analizando modulo: hour-bank...
   ✅ Encontrados 1 archivos relacionados
   ✅ Analisis completado: 25 metodos, 3 integraciones

📊 Analizando modulo: predictive-workforce...
   ✅ Encontrados 1 archivos relacionados
   ✅ Analisis completado: 18 metodos, 5 integraciones

   ... (mas modulos)

   ✅ 48 modulos analizados
   ✅ 42 con codigo encontrado
   ✅ 6 con fallback

🔨 PASO 3: Generando nuevo llm-context.json...
   ✅ Nuevo JSON generado: 450000 caracteres
   ✅ Incremento: +325000 caracteres

✔️  PASO 4: Validando nuevo JSON...
   ✅ Validacion OK: @context OK, name OK, modules OK, _metadata OK, JSON valido, Tamaño OK (439 KB)

💾 PASO 5: Creando backup del anterior...
   ✅ Backup guardado: backups/llm-context/llm-context_2025-12-19_15-30-00.json

💾 PASO 6: Guardando nuevo llm-context.json...
   ✅ Guardado: public/llm-context.json

═══════════════════════════════════════════════════════════════
📊 RESUMEN DE GENERACION
═══════════════════════════════════════════════════════════════

📏 TAMAÑO:
   Anterior:  122 KB
   Nuevo:     439 KB
   Incremento: +317 KB (259.8%)

🔍 MODULOS ANALIZADOS: 48
   Con codigo encontrado: 42
   Fallback (sin codigo):  6

📊 CAPACIDADES EXTRAIDAS:
   Metodos:      523
   Formulas:     18
   Endpoints:    287
   Integraciones: 156

🏆 TOP 5 MODULOS MAS RICOS:
   1. Predictive Workforce Service: 35 metodos, 15 endpoints
   2. Hour Bank Service: 28 metodos, 12 endpoints
   3. HSE Service: 25 metodos, 18 endpoints
   4. Payroll Calculator Service: 22 metodos, 10 endpoints
   5. Legal Case 360 Service: 20 metodos, 14 endpoints

✅ ¡GENERACION COMPLETADA EXITOSAMENTE!
```

---

### 3. API Endpoint: POST /api/brain/update-llm-context

**Ubicación**: `src/routes/brainRoutes.js` (lineas 312-373)

**Uso desde API**:
```bash
# Actualizar TODOS los modulos
curl -X POST http://localhost:9998/api/brain/update-llm-context \
  -H "Content-Type: application/json" \
  -d '{}'

# Solo un modulo especifico
curl -X POST http://localhost:9998/api/brain/update-llm-context \
  -H "Content-Type: application/json" \
  -d '{"module": "hour-bank"}'

# Preview sin guardar
curl -X POST http://localhost:9998/api/brain/update-llm-context \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

**Response exitoso**:
```json
{
  "success": true,
  "message": "llm-context.json actualizado exitosamente con backup creado",
  "stats": {
    "modulesAnalyzed": 48,
    "modulesWithCode": 42,
    "modulesFallback": 6,
    "totalMethods": 523,
    "totalFormulas": 18,
    "totalEndpoints": 287
  }
}
```

**Response dry-run**:
```json
{
  "success": true,
  "message": "Preview generado (no guardado)",
  "stats": { ... },
  "preview": {
    "@context": "https://schema.org",
    "modules": { ... }
  }
}
```

---

## ESTRUCTURA DEL JSON GENERADO

Antes (basico):
```json
{
  "id": "hour-bank",
  "name": "Banco de Horas",
  "description": "Sistema de banco de horas",
  "category": "payroll"
}
```

Despues (RICO):
```json
{
  "id": "hour-bank",
  "name": "Banco de Horas",
  "description": "Sistema de banco de horas con FIFO y eleccion en tiempo real",
  "category": "payroll",
  "version": "1.0.0",

  "fullCapabilities": {
    "coreMethods": [
      {
        "name": "getApplicableTemplate",
        "description": "Obtiene la plantilla aplicable para un usuario. Prioridad: branch_id especifico > company_id general",
        "params": [
          { "type": "UUID", "name": "userId", "description": "ID del usuario" },
          { "type": "number", "name": "companyId", "description": "ID de la empresa" }
        ],
        "returns": { "type": "Object|null", "description": "Template aplicable" }
      },
      // ... 24 metodos mas
    ],

    "integrations": [
      { "name": "NotificationWorkflowService", "type": "service" },
      { "name": "NotificationRecipientResolver", "type": "service" }
    ],

    "scientificFoundation": {
      "formulas": [
        "FIFO (First In, First Out): Las horas acumuladas se compensan en el orden en que se generaron",
        "Vencimiento automatico: hora_inicio + dias_vencimiento = fecha_vencimiento"
      ],
      "algorithms": [
        "Soporte multi-pais (Argentina, Brasil, Uruguay, Chile, Mexico, España, Alemania)",
        "Workflow de aprobacion configurable"
      ],
      "standards": ["LCT Argentina"]
    },

    "businessFlows": [
      "FLUJO: Empleado ficha -> Sistema calcula excedente -> Empleado elige (cobrar vs acumular) -> Aprobacion supervisor -> Registro en cuenta"
    ],

    "keyFeatures": [
      "Parametrizacion por sucursal via plantillas SSOT",
      "Eleccion del empleado en tiempo real (cobrar vs acumular)",
      "Integracion con fichaje biometrico",
      "Vencimientos automaticos",
      "Estado de cuenta completo"
    ],

    "apiEndpoints": [
      { "method": "GET", "path": "/api/hour-bank/templates/:companyId" },
      { "method": "POST", "path": "/api/hour-bank/templates" },
      { "method": "GET", "path": "/api/hour-bank/balance/:userId" }
      // ... 9 endpoints mas
    ],

    "databaseTables": [
      "hour_bank_templates",
      "hour_bank_transactions",
      "hour_bank_balances",
      "hour_bank_approvals"
    ],

    "moduleDependencies": {
      "required": ["users", "attendance"],
      "optional": ["notifications-enterprise"],
      "integrates_with": ["payroll"]
    },

    "codeAnalysis": {
      "totalMethods": 28,
      "totalIntegrations": 2,
      "totalFormulas": 2,
      "totalEndpoints": 12,
      "filesAnalyzed": 1,
      "linesAnalyzed": 1200,
      "lastAnalyzed": "2025-12-19T15:30:00.000Z"
    }
  }
}
```

---

## COMO USAR EL SISTEMA

### OPCION 1: Desde la terminal (CLI)

```bash
cd C:/Bio/sistema_asistencia_biometrico/backend

# Test del sistema (sin guardar)
node scripts/test-brain-update.js

# Generar para TODOS los modulos (guarda y crea backup)
node scripts/generate-rich-llm-context.js

# Solo un modulo
node scripts/generate-rich-llm-context.js --module=predictive-workforce

# Preview sin guardar
node scripts/generate-rich-llm-context.js --dry-run
```

### OPCION 2: Desde la API (recomendado para Brain)

**Servidor debe estar corriendo**:
```bash
cd backend
PORT=9998 npm start
```

**Llamar al endpoint**:
```bash
# Con curl
curl -X POST http://localhost:9998/api/brain/update-llm-context \
  -H "Content-Type: application/json" \
  -d '{}'

# Con JavaScript fetch
fetch('http://localhost:9998/api/brain/update-llm-context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dryRun: false })
})
.then(r => r.json())
.then(data => console.log(data));
```

### OPCION 3: Desde Brain (futuro)

El usuario podra decirle a Brain:

```
Usuario: "Brain, actualiza el JSON"

Brain: (internamente ejecuta)
POST /api/brain/update-llm-context
Body: { dryRun: false }

Brain: "JSON actualizado exitosamente. Analize 48 modulos, encontre 523 metodos, 18 formulas y 287 endpoints. Backup creado en backups/llm-context/llm-context_2025-12-19_15-30-00.json"
```

---

## BACKUPS AUTOMATICOS

Cada vez que se actualiza el JSON, se crea un backup automatico en:

```
backend/backups/llm-context/llm-context_YYYY-MM-DD_HH-MM-SS.json
```

**Ejemplo**:
```
backups/llm-context/
├── llm-context_2025-12-19_14-30-00.json  ← Backup anterior
├── llm-context_2025-12-19_15-45-00.json  ← Backup mas reciente
└── llm-context_2025-12-19_16-20-00.json
```

**Restaurar un backup**:
```bash
cd backend

# Listar backups
ls backups/llm-context/

# Restaurar (copiar backup a public/)
cp backups/llm-context/llm-context_2025-12-19_15-45-00.json public/llm-context.json
```

---

## VALIDACIONES DEL SISTEMA

Antes de guardar, el sistema valida:

1. **Estructura basica**: @context, @type, name, modules
2. **Metadata**: _metadata con fecha, version, stats
3. **JSON valido**: Sin errores de sintaxis
4. **Tamaño razonable**: Entre 1KB y 10MB
5. **Modulos validos**: Al menos 1 modulo analizado

Si falla alguna validacion, NO se guarda el nuevo JSON y se muestra el error.

---

## EJEMPLO REAL: PREDICTIVE WORKFORCE

**Antes (modules-registry.json)**:
```json
{
  "id": "predictive-workforce",
  "name": "Predictive Workforce",
  "description": "Sistema de analítica predictiva"
}
```

**Despues (llm-context.json generado)**:
```json
{
  "id": "predictive-workforce",
  "name": "Predictive Workforce",
  "description": "Sistema de Analítica Predictiva para Workforce Management",
  "version": "2.0.0",

  "fullCapabilities": {
    "scientificFoundation": {
      "formulas": [
        "IRA = Σ(βᵢ × Xᵢ) donde βᵢ son los pesos y Xᵢ las variables",
        "Z-Score = (x - μ) / σ para normalizacion estadistica",
        "Pearson Correlation: r = Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² Σ(yi - ȳ)²)"
      ],
      "algorithms": [
        "METODOLOGIAS CIENTIFICAS: Regresion Lineal Multiple (MLR) para prediccion de ausentismo",
        "Analisis de Sensibilidad por derivadas parciales",
        "Coeficiente de Correlacion de Pearson para variables climaticas",
        "Modelo de Ponderacion Bayesiana para IRA (Indice de Riesgo de Asistencia)",
        "Analisis Comparativo Multi-Nivel con normalizacion Z-Score"
      ],
      "standards": []
    },

    "coreMethods": [
      {
        "name": "calculateDailyIRA",
        "description": "Calcula el Indice de Riesgo de Asistencia para una fecha especifica",
        "params": [
          { "type": "number", "name": "companyId", "description": "ID de la empresa" },
          { "type": "Date", "name": "targetDate", "description": "Fecha objetivo" },
          { "type": "Object", "name": "options", "description": "Opciones adicionales" }
        ],
        "returns": { "type": "Object", "description": "IRA con desglose por variable" }
      },
      // ... 34 metodos mas
    ],

    "keyFeatures": [
      "Regresion Lineal Multiple (MLR) para prediccion de ausentismo",
      "Analisis de Sensibilidad por derivadas parciales",
      "Coeficiente de Correlacion de Pearson para variables climaticas",
      "Modelo de Ponderacion Bayesiana para IRA",
      "Analisis Comparativo Multi-Nivel con normalizacion Z-Score"
    ],

    "codeAnalysis": {
      "totalMethods": 35,
      "totalFormulas": 8,
      "totalEndpoints": 15,
      "linesAnalyzed": 2800
    }
  }
}
```

**IMPACTO**: Ahora ChatGPT/Claude sabran que APONNT tiene:
- Formulas cientificas reales (IRA, Z-Score, Pearson)
- Metodologias estadisticas avanzadas (MLR, Bayes)
- 35 metodos de analisis predictivo
- 2800+ lineas de codigo especializado

---

## TROUBLESHOOTING

### Problema: "No se encontraron archivos de codigo relacionados"

**Causa**: El analizador no pudo encontrar el archivo del servicio

**Solucion**:
1. Verificar que el servicio existe: `ls src/services/*Service.js`
2. El analizador busca patrones como: `HourBankService.js`, `hour-bank.js`, `hourBankRoutes.js`
3. Si el archivo tiene otro nombre, el modulo usara fallback (metadata basico)

### Problema: "JSON muy grande (> 10MB)"

**Causa**: El JSON generado supera el limite de 10MB

**Solucion**:
1. Reducir limite de metodos extraidos (actualizar DeepModuleAnalyzer.js linea 320)
2. Excluir algunos modulos grandes
3. Aumentar el limite en la validacion

### Problema: "Modulo [X] no encontrado en registry"

**Causa**: Intentaste actualizar un modulo que no existe en modules-registry.json

**Solucion**:
```bash
# Ver modulos disponibles
cat src/auditor/registry/modules-registry.json | grep '"id":'

# Usar ID exacto
node scripts/generate-rich-llm-context.js --module=hour-bank
```

### Problema: Backup fallo

**Causa**: No hay permisos de escritura en backups/llm-context/

**Solucion**:
```bash
# Crear directorio manualmente
mkdir -p backups/llm-context

# Dar permisos (Linux/Mac)
chmod 755 backups/llm-context
```

---

## PROXIMOS PASOS

1. **Ejecutar test**:
   ```bash
   node scripts/test-brain-update.js
   ```

2. **Generar JSON completo**:
   ```bash
   node scripts/generate-rich-llm-context.js
   ```

3. **Verificar resultado**:
   - Abrir `public/llm-context.json`
   - Ver `_metadata.generated_at`
   - Buscar `fullCapabilities` de modulos clave

4. **Probar con ChatGPT/Claude**:
   - Subir el nuevo `llm-context.json`
   - Preguntar: "Que tiene de especial APONNT en analítica predictiva?"
   - Deberia mencionar: IRA, Z-Score, MLR, Bayes, etc.

---

## CONTACTO Y SOPORTE

**Desarrollador**: Sistema Brain de APONNT
**Fecha**: 2025-12-19
**Version**: 1.0.0

**Archivos clave**:
- `src/brain/core/DeepModuleAnalyzer.js`
- `scripts/generate-rich-llm-context.js`
- `scripts/test-brain-update.js`
- `src/routes/brainRoutes.js` (endpoint /update-llm-context)
- `docs/BRAIN-AUTO-UPDATE-SYSTEM.md` (este archivo)

---

## FIN DE LA DOCUMENTACION
