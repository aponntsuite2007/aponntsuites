# FASE 0: ANÁLISIS EXHAUSTIVO DEL SISTEMA + BRAIN INTROSPECTION

**Prioridad**: DESPUÉS de alcanzar 100% E2E (29/29 PASSED)
**Objetivo**: Brain debe conocer TODA la arquitectura, flujos, APKs, y reglas de negocio
**Duración estimada**: 2-3 semanas

---

## 📋 SCOPE DEL ANÁLISIS EXHAUSTIVO

### 1️⃣ **BACKEND - ANÁLISIS COMPLETO**

#### A. Rutas y Endpoints
- ✅ Extraer TODOS los endpoints de `src/routes/*.js` (200+ endpoints)
- ✅ Documentar parámetros, responses, autenticación, permisos
- ✅ Mapear dependencias entre endpoints
- ✅ Identificar endpoints públicos vs privados
- ✅ Detectar endpoints sin validación

**Archivos a analizar**:
```
src/routes/
├── aponntDashboard.js
├── auth.js
├── companies.js
├── users.js
├── attendance.js
├── departments.js
├── kiosk.js
├── notifications.js
├── auditorRoutes.js
├── jobPostingsRoutes.js
├── voicePlatformRoutes.js
├── e2eTestingRoutes.js
└── ... (50+ archivos)
```

#### B. Modelos y Base de Datos
- ✅ Extraer TODAS las tablas de `src/models/*.js`
- ✅ Mapear relaciones (hasMany, belongsTo, etc.)
- ✅ Identificar campos calculados vs persistidos
- ✅ Detectar índices, constraints, triggers
- ✅ Validar integridad referencial

**Archivos a analizar**:
```
src/models/
├── User.js
├── Company.js
├── Attendance.js
├── Department.js
├── Kiosk.js
├── Notification.js
├── AuditLog.js
├── EmployeeExperience.js (Voice Platform)
└── ... (40+ modelos)
```

#### C. Servicios y Lógica de Negocio
- ✅ Extraer reglas de negocio de `src/services/*.js`
- ✅ Mapear flujos de datos (ej: crear attendance → notificar → calcular horas)
- ✅ Identificar validaciones custom
- ✅ Detectar side effects (emails, webhooks, etc.)

**Archivos a analizar**:
```
src/services/
├── AttendanceService.js
├── NotificationService.js
├── BiometricService.js
├── PayrollService.js
├── AMiMePasoService.js (Voice Platform)
├── VoiceGamificationService.js
├── EcosystemBrainService.js
└── ... (30+ servicios)
```

---

### 2️⃣ **FRONTEND - ANÁLISIS COMPLETO**

#### A. Módulos JavaScript
- ✅ Extraer TODOS los módulos de `public/js/modules/*.js` (50+ módulos)
- ✅ Mapear dependencias entre módulos
- ✅ Identificar eventos DOM y flujos de usuario
- ✅ Detectar llamadas AJAX y endpoints consumidos
- ✅ Validar consistencia con backend

**Archivos a analizar**:
```
public/js/modules/
├── attendance.js
├── users.js
├── departments.js
├── notifications.js
├── employee-voice-platform.js
├── job-postings.js
├── auditor-dashboard.js
├── e2e-testing-control-v2.js
└── ... (50+ módulos)
```

#### B. Páginas HTML
- ✅ Analizar `panel-empresa.html` (dashboard principal)
- ✅ Analizar `panel-administrativo.html` (admin dashboard)
- ✅ Analizar páginas públicas (careers.html, index.html)
- ✅ Mapear formularios y validaciones client-side
- ✅ Identificar todos los modales y sus flujos

**Archivos a analizar**:
```
public/
├── panel-empresa.html (principal - 7,000+ líneas)
├── panel-administrativo.html (admin - 5,000+ líneas)
├── careers.html
├── index.html
├── kiosk.html
└── ... (20+ páginas)
```

---

### 3️⃣ **APPS MÓVILES (APKs) - ANÁLISIS COMPLETO**

#### A. Flutter Apps - Estructura
- ✅ Analizar `flutter_apps/kiosk_app/` (Kiosk biométrico)
- ✅ Analizar `flutter_apps/employee_app/` (App empleados)
- ✅ Mapear screens y navegación
- ✅ Identificar llamadas API desde Flutter
- ✅ Detectar dependencias de backend

**Archivos a analizar**:
```
flutter_apps/
├── kiosk_app/
│   ├── lib/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── models/
│   │   └── main.dart
│   └── pubspec.yaml
└── employee_app/
    ├── lib/
    │   ├── screens/
    │   ├── services/
    │   └── main.dart
    └── pubspec.yaml
```

#### B. Comunicación Backend ↔ APKs
- ✅ Identificar endpoints consumidos por APKs
- ✅ Validar autenticación en APKs (JWT)
- ✅ Mapear flujo completo de fichaje biométrico
- ✅ Verificar sincronización offline/online
- ✅ Detectar vulnerabilidades (tokens hardcodeados, etc.)

**Flujos críticos a mapear**:
1. **Fichaje biométrico**:
   - Kiosk captura huella → Backend valida → DB inserta → Notificación
2. **Consulta de asistencias**:
   - Employee app → API attendance → BD → Response con datos
3. **Notificaciones push**:
   - Backend evento → Firebase/OneSignal → APK recibe push

---

### 4️⃣ **BRAIN - VALIDACIÓN DE CONOCIMIENTO**

#### A. Comparar conocimiento actual vs real
- ✅ Revisar `src/brain/knowledge/` (flows, UI, etc.)
- ✅ Comparar con código real (¿Brain sabe TODO?)
- ✅ Identificar gaps (código que Brain no conoce)
- ✅ Detectar conocimiento obsoleto (código que cambió)

**Archivos a comparar**:
```
src/brain/knowledge/
├── flows/
│   ├── attendance-create.json
│   ├── attendance-edit.json
│   ├── user-create.json
│   └── ... (50+ flows)
├── ui/
│   ├── modules-summary.json
│   └── static-analysis.json
└── dependencies/
    └── module-dependencies.json
```

#### B. Actualizar Brain con análisis exhaustivo
- ✅ Crear `flows/` automático desde código real (AST parsing)
- ✅ Crear `ui/` automático desde HTML real
- ✅ Crear `api/` automático desde routes real
- ✅ Crear `database/` automático desde models real
- ✅ Crear `apks/` con análisis de Flutter apps

**Resultado esperado**:
```
src/brain/knowledge/
├── flows/ (AUTO-GENERADO desde código)
├── ui/ (AUTO-GENERADO desde HTML)
├── api/ (AUTO-GENERADO desde routes)
├── database/ (AUTO-GENERADO desde models)
├── apks/ (AUTO-GENERADO desde Flutter) ← NUEVO
├── business-rules/ (AUTO-GENERADO desde services) ← NUEVO
└── dependencies/ (AUTO-GENERADO desde imports)
```

---

## 🔍 METODOLOGÍA DE ANÁLISIS

### **FASE 0.1: Inventario Completo** (Semana 1)

1. **Escaneo de archivos**:
   ```javascript
   const inventory = {
     backend: {
       routes: glob('src/routes/**/*.js'),      // 50+ archivos
       models: glob('src/models/**/*.js'),      // 40+ archivos
       services: glob('src/services/**/*.js'),  // 30+ archivos
       middlewares: glob('src/middleware/**/*.js')
     },
     frontend: {
       modules: glob('public/js/modules/**/*.js'), // 50+ archivos
       pages: glob('public/**/*.html'),            // 20+ archivos
       core: glob('public/js/core/**/*.js')        // 10+ archivos
     },
     apks: {
       kiosk: glob('flutter_apps/kiosk_app/lib/**/*.dart'),
       employee: glob('flutter_apps/employee_app/lib/**/*.dart')
     }
   };
   ```

2. **AST Parsing de cada archivo**:
   ```javascript
   const { parse } = require('@babel/parser');
   const traverse = require('@babel/traverse').default;

   function extractBusinessRules(filePath) {
     const ast = parse(fs.readFileSync(filePath, 'utf8'));
     const rules = [];

     traverse(ast, {
       // Detectar validaciones
       IfStatement(path) {
         if (isBusinessRule(path.node)) {
           rules.push(extractRule(path.node));
         }
       },
       // Detectar cálculos
       AssignmentExpression(path) {
         if (isCalculation(path.node)) {
           rules.push(extractCalculation(path.node));
         }
       }
     });

     return rules;
   }
   ```

3. **Crear mapa de dependencias**:
   ```javascript
   // Ejemplo: attendance.js depende de:
   {
     "module": "attendance",
     "dependencies": {
       "backend": {
         "routes": ["/api/attendance/*"],
         "services": ["AttendanceService", "NotificationService"],
         "models": ["Attendance", "User", "Company"]
       },
       "frontend": {
         "modules": ["notifications", "users"],
         "core": ["BaseModule", "AuthHelper"]
       },
       "apks": {
         "kiosk": ["AttendanceService", "BiometricScanner"],
         "employee": ["AttendanceHistoryScreen"]
       }
     }
   }
   ```

---

### **FASE 0.2: Extracción de Reglas de Negocio** (Semana 2)

#### **Ejemplo: AttendanceService.js**

**Código actual**:
```javascript
// src/services/AttendanceService.js
async createAttendance(userId, companyId, date, checkInTime) {
  // REGLA 1: No permitir duplicados
  const existing = await Attendance.findOne({
    where: { UserId: userId, date: date }
  });
  if (existing) {
    throw new Error('Ya existe una asistencia para este día');
  }

  // REGLA 2: No permitir fechas futuras
  if (new Date(date) > new Date()) {
    throw new Error('No se puede registrar asistencia futura');
  }

  // REGLA 3: Calcular si es tardanza
  const shift = await getShiftForUser(userId);
  const isLate = checkInTime > (shift.startTime + shift.gracePeriod);

  // REGLA 4: Auto-calcular status
  const status = isLate ? 'late' : 'present';

  // REGLA 5: Enviar notificación si es tardanza
  if (isLate) {
    await NotificationService.send({
      userId,
      type: 'late_arrival',
      message: `Llegaste tarde (${checkInTime} vs ${shift.startTime})`
    });
  }

  // Crear registro
  const attendance = await Attendance.create({
    UserId: userId,
    company_id: companyId,
    date,
    checkInTime,
    status
  });

  return attendance;
}
```

**Brain debe extraer automáticamente**:
```json
{
  "module": "attendance",
  "flow": "create",
  "business_rules": [
    {
      "id": "ATT-R1",
      "name": "No duplicados por día",
      "type": "validation",
      "condition": "Ya existe attendance para mismo user + date",
      "action": "Rechazar con error",
      "priority": "HIGH",
      "source_file": "src/services/AttendanceService.js:125",
      "source_code": "if (existing) throw new Error(...)"
    },
    {
      "id": "ATT-R2",
      "name": "No fechas futuras",
      "type": "validation",
      "condition": "date > today",
      "action": "Rechazar con error",
      "priority": "HIGH",
      "source_file": "src/services/AttendanceService.js:132"
    },
    {
      "id": "ATT-R3",
      "name": "Cálculo de tardanza",
      "type": "calculation",
      "formula": "checkInTime > (shift.startTime + shift.gracePeriod)",
      "result": "isLate = true/false",
      "dependencies": ["shift"],
      "source_file": "src/services/AttendanceService.js:138"
    },
    {
      "id": "ATT-R4",
      "name": "Status auto-calculado",
      "type": "calculation",
      "formula": "isLate ? 'late' : 'present'",
      "dependencies": ["ATT-R3"],
      "source_file": "src/services/AttendanceService.js:141"
    },
    {
      "id": "ATT-R5",
      "name": "Notificación por tardanza",
      "type": "side_effect",
      "condition": "isLate === true",
      "action": "NotificationService.send(late_arrival)",
      "dependencies": ["ATT-R3", "NotificationService"],
      "source_file": "src/services/AttendanceService.js:145"
    }
  ],
  "flow_diagram": "User → Validate duplicado → Validate fecha → Get shift → Calc isLate → Calc status → Send notif → DB insert → Return"
}
```

---

### **FASE 0.3: Análisis de APKs Flutter** (Semana 2)

#### **Kiosk App - Ejemplo de análisis**

**Archivo**: `flutter_apps/kiosk_app/lib/screens/biometric_scanner.dart`

**Análisis esperado**:
```json
{
  "app": "kiosk",
  "screen": "BiometricScanner",
  "flow": "Fichaje biométrico completo",
  "steps": [
    {
      "step": 1,
      "action": "Escanear huella dactilar",
      "widget": "BiometricScanner()",
      "local_validation": "Huella debe tener >= 12 puntos característicos",
      "fallback": "Si falla 3 veces → Mostrar teclado manual"
    },
    {
      "step": 2,
      "action": "Buscar usuario en BD local",
      "method": "BiometricService.matchFingerprint()",
      "offline_support": true,
      "cache": "SQLite local con últimos 500 usuarios"
    },
    {
      "step": 3,
      "action": "Enviar a backend",
      "endpoint": "POST /api/attendance/check-in",
      "payload": {
        "userId": "uuid",
        "timestamp": "ISO 8601",
        "biometricData": "encrypted base64",
        "deviceId": "kiosk_001"
      },
      "retry_policy": "3 intentos con exponential backoff",
      "offline_queue": "Si no hay internet, guardar en cola local"
    },
    {
      "step": 4,
      "action": "Mostrar confirmación",
      "success_screen": "Bienvenido {name}, fichaje registrado",
      "error_screen": "Error: {message}",
      "timeout": "Volver a home en 3s"
    }
  ],
  "dependencies": {
    "backend_endpoints": [
      "/api/attendance/check-in",
      "/api/users/by-biometric",
      "/api/kiosk/sync"
    ],
    "services": [
      "BiometricService",
      "AttendanceService",
      "SyncService"
    ],
    "permissions": [
      "CAMERA (para foto)",
      "BIOMETRIC (huella)",
      "INTERNET (sync)"
    ]
  },
  "security_checks": {
    "encryption": "Biometric data encrypted con AES-256",
    "token_storage": "JWT en secure storage (FlutterSecureStorage)",
    "certificate_pinning": "HTTPS con certificate pinning enabled"
  }
}
```

---

### **FASE 0.4: Consolidación en Brain** (Semana 3)

#### **Auto-generar knowledge base completa**

**Script**: `src/brain/extractors/SystemKnowledgeExtractor.js`

```javascript
class SystemKnowledgeExtractor {
  async extractAll() {
    console.log('🧠 Extrayendo conocimiento del sistema completo...');

    // 1. Backend
    const backendKnowledge = {
      routes: await this.extractRoutes(),
      models: await this.extractModels(),
      services: await this.extractServices(),
      businessRules: await this.extractBusinessRules()
    };

    // 2. Frontend
    const frontendKnowledge = {
      modules: await this.extractModules(),
      pages: await this.extractPages(),
      events: await this.extractDOMEvents(),
      apiCalls: await this.extractAPICallsFromFrontend()
    };

    // 3. APKs
    const apkKnowledge = {
      kiosk: await this.extractFlutterApp('kiosk_app'),
      employee: await this.extractFlutterApp('employee_app'),
      backendIntegration: await this.mapAPKToBackend()
    };

    // 4. Mapear todo
    const fullMap = await this.createFullDependencyMap({
      backend: backendKnowledge,
      frontend: frontendKnowledge,
      apks: apkKnowledge
    });

    // 5. Guardar en Brain knowledge base
    await this.saveToBrain(fullMap);

    console.log('✅ Brain actualizado con conocimiento completo del sistema');
  }

  async extractBusinessRules() {
    const services = glob.sync('src/services/**/*.js');
    const allRules = [];

    for (const file of services) {
      const ast = parse(fs.readFileSync(file, 'utf8'));
      const rules = [];

      traverse(ast, {
        // Detectar validaciones (if con throw/reject)
        IfStatement(path) {
          if (this.isValidationRule(path.node)) {
            rules.push({
              type: 'validation',
              condition: this.extractCondition(path.node.test),
              action: this.extractAction(path.node.consequent),
              sourceFile: file,
              sourceLine: path.node.loc.start.line
            });
          }
        },

        // Detectar cálculos
        AssignmentExpression(path) {
          if (this.isCalculation(path.node)) {
            rules.push({
              type: 'calculation',
              variable: path.node.left.name,
              formula: this.extractFormula(path.node.right),
              dependencies: this.extractDependencies(path.node.right),
              sourceFile: file,
              sourceLine: path.node.loc.start.line
            });
          }
        },

        // Detectar side effects (llamadas a otros servicios)
        CallExpression(path) {
          if (this.isSideEffect(path.node)) {
            rules.push({
              type: 'side_effect',
              service: this.extractServiceName(path.node.callee),
              method: this.extractMethodName(path.node.callee),
              params: this.extractParams(path.node.arguments),
              sourceFile: file,
              sourceLine: path.node.loc.start.line
            });
          }
        }
      });

      allRules.push({
        file,
        module: path.basename(file, '.js'),
        rules
      });
    }

    return allRules;
  }

  async mapAPKToBackend() {
    // Escanear archivos Dart buscando llamadas HTTP
    const dartFiles = glob.sync('flutter_apps/**/lib/**/*.dart');
    const apiCalls = [];

    for (const file of dartFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Regex para detectar http.post(), http.get(), etc.
      const httpRegex = /http\.(get|post|put|delete)\(['"]([^'"]+)['"]/g;
      let match;

      while ((match = httpRegex.exec(content)) !== null) {
        const [_, method, endpoint] = match;
        apiCalls.push({
          app: file.includes('kiosk_app') ? 'kiosk' : 'employee',
          file,
          method: method.toUpperCase(),
          endpoint,
          // Buscar en backend si existe ese endpoint
          backendExists: await this.endpointExists(endpoint)
        });
      }
    }

    return apiCalls;
  }
}
```

---

## 📊 ENTREGABLES

### **1. Knowledge Base Completa en Brain**
```
src/brain/knowledge/
├── backend/
│   ├── routes.json (200+ endpoints documentados)
│   ├── models.json (40+ modelos con relaciones)
│   ├── services.json (30+ servicios con lógica)
│   └── business-rules.json (500+ reglas extraídas)
├── frontend/
│   ├── modules.json (50+ módulos documentados)
│   ├── pages.json (20+ páginas mapeadas)
│   └── events.json (DOM events mapeados)
├── apks/
│   ├── kiosk.json (screens, flows, API calls)
│   └── employee.json (screens, flows, API calls)
├── dependencies/
│   ├── backend-to-frontend.json
│   ├── frontend-to-backend.json
│   ├── apk-to-backend.json
│   └── full-dependency-graph.json
└── flows/
    ├── attendance-complete-flow.json (backend+frontend+apk)
    ├── user-complete-flow.json
    └── ... (50+ flows completos)
```

### **2. Dashboard de Introspección**
- **Ubicación**: panel-administrativo → Tab "Brain Introspection"
- **Features**:
  - Ver todos los módulos conocidos por Brain
  - Comparar conocimiento vs código real (% coverage)
  - Ver reglas de negocio de cualquier módulo
  - Ver dependencias en grafo interactivo
  - Ver flows completos (backend+frontend+apk)

### **3. Sistema de Auto-Actualización**
- **File watcher** que detecta cambios en código
- Al detectar cambio → Re-extraer reglas → Actualizar Brain
- Brain siempre actualizado (0 lag)

---

## 🎯 CRITERIOS DE ÉXITO

✅ **Brain conoce 100% del sistema**:
- 200+ endpoints documentados
- 40+ modelos mapeados
- 500+ reglas de negocio extraídas
- 50+ módulos frontend analizados
- 2 APKs Flutter completamente mapeadas

✅ **Comparación Brain vs Real**:
- Coverage >= 95% (Brain sabe >= 95% del código)
- 0 conocimiento obsoleto (todo actualizado)
- 0 gaps críticos (funcionalidades que Brain no conoce)

✅ **Capacitación auto-generada**:
- Docs de cada módulo generadas automáticamente
- Tutoriales interactivos desde reglas de negocio
- Certificaciones basadas en knowledge base real

---

## 📝 PLAN DE EJECUCIÓN

**PRIORIDAD**: DESPUÉS de alcanzar 100% E2E (29/29)

**Semana 1**: Inventario + AST parsing backend
**Semana 2**: AST parsing frontend + Análisis APKs
**Semana 3**: Consolidación en Brain + Dashboard

**Total**: 3 semanas → Brain con conocimiento 100% del sistema

---

**¿Iniciamos FASE 0 después del 100% E2E?**
