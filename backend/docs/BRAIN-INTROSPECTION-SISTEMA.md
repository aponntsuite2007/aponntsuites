# 🧠 BRAIN INTROSPECTION - SISTEMA DE AUTO-CONOCIMIENTO

**Objetivo**: Brain conoce COMPLETAMENTE el sistema sin intervención manual
**Actualización**: Dinámica (automática cuando cambia código)
**Aplicación**: Capacitación, ayuda contextual, evaluaciones, onboarding

---

## 🎯 VISIÓN GENERAL

```
┌─────────────────────────────────────────────────────┐
│         CÓDIGO FUENTE DEL SISTEMA                   │
│  (Backend + Frontend + BD + APIs)                   │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│      EXTRACTORES AUTOMÁTICOS                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ AST      │ │ Sequelize│ │ JSDoc    │           │
│  │ Parser   │ │ Schema   │ │ Parser   │           │
│  └──────────┘ └──────────┘ └──────────┘           │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│      KNOWLEDGE BASE ESTRUCTURADA                    │
│                                                     │
│  • Reglas de negocio (1200+ reglas)                │
│  • Validaciones (800+ validaciones)                │
│  • Flujos complejos (50+ flujos)                   │
│  • Dependencias (200+ relaciones)                  │
│  • Permisos (300+ reglas RBAC)                     │
│                                                     │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│         APLICACIONES INTELIGENTES                   │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Ayuda        │  │ Capacitación │               │
│  │ Contextual   │  │ Auto-generada│               │
│  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Evaluaciones │  │ Onboarding   │               │
│  │ Staff        │  │ Automático   │               │
│  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────┘
```

---

## 📦 COMPONENTE 1: AST PARSER (Reglas de Negocio)

### ¿Qué extrae?

**De archivos JavaScript/TypeScript**:
- Condiciones if/else
- Validaciones
- Cálculos
- Transformaciones de datos
- Lógica de permisos

### Ejemplo Real del Sistema

**Código original** (`attendanceController.js`):
```javascript
// Línea 145-160
exports.createAttendance = async (req, res) => {
  const { userId, checkInTime, type } = req.body;

  // REGLA 1: Solo admin o supervisor puede crear asistencia manual
  if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  // REGLA 2: No puede haber asistencia duplicada en el mismo día
  const existingAttendance = await Attendance.findOne({
    where: {
      userId: userId,
      date: { [Op.eq]: new Date().toDateString() }
    }
  });

  if (existingAttendance) {
    return res.status(400).json({ error: 'Ya existe asistencia para hoy' });
  }

  // REGLA 3: Validar que usuario tenga turno activo
  const activeShift = await Shift.findOne({
    where: { userId: userId, isActive: true }
  });

  if (!activeShift) {
    return res.status(400).json({ error: 'Usuario no tiene turno activo' });
  }

  // REGLA 4: Calcular horas trabajadas
  const hoursWorked = calculateWorkingHours(checkInTime, checkOutTime, activeShift);

  // Crear asistencia...
};
```

**Brain extrae automáticamente**:
```json
{
  "module": "attendance",
  "function": "createAttendance",
  "file": "src/controllers/attendanceController.js",
  "line": 145,
  "businessRules": [
    {
      "id": "ATT_RULE_001",
      "name": "Permiso crear asistencia manual",
      "type": "PERMISSION",
      "condition": "user.role === 'admin' OR user.role === 'supervisor'",
      "action": "allow_create_manual_attendance",
      "failureMessage": "No autorizado",
      "httpStatus": 403,
      "severity": "HIGH"
    },
    {
      "id": "ATT_RULE_002",
      "name": "Prevenir asistencia duplicada",
      "type": "VALIDATION",
      "condition": "NOT EXISTS attendance WHERE userId = X AND date = TODAY",
      "action": "reject_duplicate",
      "failureMessage": "Ya existe asistencia para hoy",
      "httpStatus": 400,
      "severity": "MEDIUM"
    },
    {
      "id": "ATT_RULE_003",
      "name": "Validar turno activo",
      "type": "VALIDATION",
      "condition": "EXISTS shift WHERE userId = X AND isActive = true",
      "action": "require_active_shift",
      "failureMessage": "Usuario no tiene turno activo",
      "httpStatus": 400,
      "severity": "HIGH",
      "relatedModule": "shifts"
    },
    {
      "id": "ATT_RULE_004",
      "name": "Cálculo horas trabajadas",
      "type": "CALCULATION",
      "formula": "calculateWorkingHours(checkIn, checkOut, shift)",
      "dependencies": ["checkInTime", "checkOutTime", "activeShift"],
      "output": "hoursWorked"
    }
  ]
}
```

### Implementación del Extractor

```javascript
// backend/src/brain/extractors/BusinessRulesExtractor.js
const babel = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const path = require('path');

class BusinessRulesExtractor {
  constructor() {
    this.rules = [];
  }

  /**
   * Extrae reglas de negocio de un archivo JavaScript
   */
  extractFromFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const ast = babel.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    traverse(ast, {
      // Detectar if statements (validaciones, permisos)
      IfStatement: (path) => {
        const condition = this.extractCondition(path.node.test);
        const errorMessage = this.findErrorMessage(path.node.consequent);

        if (errorMessage) {
          this.rules.push({
            type: this.detectRuleType(condition),
            condition: condition,
            failureMessage: errorMessage,
            file: filePath,
            line: path.node.loc.start.line
          });
        }
      },

      // Detectar llamadas a funciones de validación
      CallExpression: (path) => {
        if (path.node.callee.name?.includes('validate')) {
          this.rules.push({
            type: 'VALIDATION',
            validatorFunction: path.node.callee.name,
            arguments: path.node.arguments,
            file: filePath,
            line: path.node.loc.start.line
          });
        }
      },

      // Detectar assignments con cálculos
      AssignmentExpression: (path) => {
        if (this.isCalculation(path.node.right)) {
          this.rules.push({
            type: 'CALCULATION',
            variable: path.node.left.name,
            formula: this.extractFormula(path.node.right),
            file: filePath,
            line: path.node.loc.start.line
          });
        }
      }
    });

    return this.rules;
  }

  detectRuleType(condition) {
    if (condition.includes('role') || condition.includes('permission')) {
      return 'PERMISSION';
    }
    if (condition.includes('exists') || condition.includes('findOne')) {
      return 'VALIDATION';
    }
    return 'BUSINESS_LOGIC';
  }

  extractCondition(node) {
    // Convertir AST node a string legible
    // Ejemplo: BinaryExpression { left, operator, right }
    //       → "user.role === 'admin'"
    // ... implementación detallada
  }

  findErrorMessage(node) {
    // Buscar strings en return statements
    // Ejemplo: return res.status(403).json({ error: 'No autorizado' })
    //       → "No autorizado"
    // ... implementación detallada
  }
}

module.exports = BusinessRulesExtractor;
```

---

## 📦 COMPONENTE 2: SEQUELIZE SCHEMA EXTRACTOR

### ¿Qué extrae?

**De modelos Sequelize**:
- Campos y tipos de datos
- Validaciones (required, min, max, format)
- Relaciones (hasMany, belongsTo, belongsToMany)
- Hooks (beforeCreate, afterUpdate)
- Scopes y getters

### Ejemplo Real del Sistema

**Modelo** (`User.js`):
```javascript
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  rut: {
    type: DataTypes.STRING(12),
    allowNull: false,
    unique: true,
    validate: {
      isValidRUT(value) {
        if (!validateChileanRUT(value)) {
          throw new Error('RUT inválido');
        }
      }
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'supervisor', 'employee'),
    defaultValue: 'employee'
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    validate: {
      min: 0
    }
  }
});

User.hasMany(Attendance, { foreignKey: 'userId' });
User.belongsTo(Department, { foreignKey: 'departmentId' });

User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});
```

**Brain extrae**:
```json
{
  "model": "User",
  "table": "users",
  "fields": [
    {
      "name": "email",
      "type": "STRING",
      "required": true,
      "unique": true,
      "validations": [
        {
          "type": "format",
          "rule": "isEmail",
          "message": "Email debe ser válido"
        }
      ]
    },
    {
      "name": "rut",
      "type": "STRING(12)",
      "required": true,
      "unique": true,
      "validations": [
        {
          "type": "custom",
          "function": "isValidRUT",
          "rule": "validateChileanRUT(value)",
          "message": "RUT inválido"
        }
      ]
    },
    {
      "name": "role",
      "type": "ENUM",
      "allowedValues": ["admin", "supervisor", "employee"],
      "default": "employee",
      "businessRule": "Define permisos del usuario"
    },
    {
      "name": "salary",
      "type": "DECIMAL(10,2)",
      "validations": [
        {
          "type": "min",
          "value": 0,
          "message": "Salario no puede ser negativo"
        }
      ],
      "sensitive": true
    }
  ],
  "relationships": [
    {
      "type": "hasMany",
      "model": "Attendance",
      "foreignKey": "userId",
      "businessRule": "Un usuario tiene múltiples asistencias"
    },
    {
      "type": "belongsTo",
      "model": "Department",
      "foreignKey": "departmentId",
      "businessRule": "Un usuario pertenece a un departamento"
    }
  ],
  "hooks": [
    {
      "type": "beforeCreate",
      "action": "Hash password con bcrypt",
      "securityRule": "Passwords nunca se almacenan en plaintext"
    }
  ]
}
```

---

## 📦 COMPONENTE 3: FLOW TRACER (Circuitos Complejos)

### ¿Qué hace?

- Sigue el flujo de ejecución a través de múltiples archivos
- Identifica puntos de integración entre módulos
- Crea diagramas de secuencia automáticos

### Ejemplo: Flujo "Crear Asistencia"

**Brain traza automáticamente**:
```json
{
  "flowName": "Crear Asistencia",
  "trigger": "POST /api/attendance",
  "steps": [
    {
      "step": 1,
      "file": "src/routes/attendanceRoutes.js",
      "line": 45,
      "action": "Route handler recibe request"
    },
    {
      "step": 2,
      "file": "src/middleware/authMiddleware.js",
      "line": 12,
      "action": "Verificar JWT token",
      "canFail": true,
      "failureCode": 401
    },
    {
      "step": 3,
      "file": "src/controllers/attendanceController.js",
      "line": 145,
      "action": "Validar permisos (admin o supervisor)",
      "businessRule": "ATT_RULE_001"
    },
    {
      "step": 4,
      "file": "src/controllers/attendanceController.js",
      "line": 152,
      "action": "Verificar asistencia duplicada",
      "businessRule": "ATT_RULE_002",
      "databaseQuery": "SELECT * FROM attendances WHERE userId = ? AND date = ?"
    },
    {
      "step": 5,
      "file": "src/services/ShiftsService.js",
      "line": 78,
      "action": "Obtener turno activo del usuario",
      "businessRule": "ATT_RULE_003",
      "relatedModule": "shifts"
    },
    {
      "step": 6,
      "file": "src/utils/AttendanceCalculator.js",
      "line": 23,
      "action": "Calcular horas trabajadas",
      "businessRule": "ATT_RULE_004",
      "formula": "(checkOut - checkIn) - breakTime"
    },
    {
      "step": 7,
      "file": "src/models/Attendance.js",
      "line": 89,
      "action": "Crear registro en BD",
      "hook": "beforeCreate → validar datos"
    },
    {
      "step": 8,
      "file": "src/services/NotificationService.js",
      "line": 145,
      "action": "Notificar supervisor",
      "async": true,
      "relatedModule": "notifications"
    },
    {
      "step": 9,
      "file": "src/services/DashboardService.js",
      "line": 234,
      "action": "Actualizar estadísticas dashboard",
      "async": true,
      "relatedModule": "dashboard"
    },
    {
      "step": 10,
      "file": "src/controllers/attendanceController.js",
      "line": 167,
      "action": "Retornar respuesta exitosa",
      "response": { "status": 201, "data": "attendance" }
    }
  ],
  "totalDuration": "~150ms",
  "databaseQueries": 3,
  "externalAPIs": 0,
  "relatedModules": ["shifts", "notifications", "dashboard"],
  "criticalPoints": [
    { "step": 3, "reason": "Validación de permisos" },
    { "step": 4, "reason": "Prevenir duplicados" },
    { "step": 7, "reason": "Escritura en BD" }
  ]
}
```

---

## 📦 COMPONENTE 4: FILE WATCHER (Actualización Dinámica)

### ¿Qué hace?

Monitorea archivos y re-extrae cuando hay cambios

```javascript
// backend/src/brain/watchers/CodeWatcher.js
const chokidar = require('chokidar');

class CodeWatcher {
  constructor(brainService) {
    this.brain = brainService;
    this.watcher = null;
  }

  start() {
    this.watcher = chokidar.watch([
      'src/controllers/**/*.js',
      'src/models/**/*.js',
      'src/services/**/*.js',
      'src/routes/**/*.js',
      'public/js/modules/**/*.js'
    ], {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    this.watcher
      .on('change', (path) => {
        console.log(`📝 Archivo modificado: ${path}`);
        this.reExtractFile(path);
      })
      .on('add', (path) => {
        console.log(`➕ Nuevo archivo: ${path}`);
        this.reExtractFile(path);
      });
  }

  async reExtractFile(filePath) {
    try {
      // Re-extraer reglas de negocio
      const rules = await this.brain.extractBusinessRules(filePath);

      // Actualizar knowledge base
      await this.brain.updateKnowledgeBase({
        file: filePath,
        rules: rules,
        timestamp: new Date()
      });

      console.log(`✅ Knowledge base actualizada para: ${filePath}`);
    } catch (err) {
      console.error(`❌ Error re-extrayendo: ${err.message}`);
    }
  }
}

module.exports = CodeWatcher;
```

---

## 📦 COMPONENTE 5: KNOWLEDGE BASE CONSOLIDADA

### Estructura de Datos

```json
{
  "version": "1.0.0",
  "lastUpdate": "2025-12-24T15:30:00Z",
  "modules": {
    "attendance": {
      "name": "Gestión de Asistencia",
      "description": "Control de entrada/salida de empleados",
      "mainController": "src/controllers/attendanceController.js",
      "model": "src/models/Attendance.js",
      "routes": "src/routes/attendanceRoutes.js",
      "frontend": "public/js/modules/attendance.js",

      "businessRules": [
        { "id": "ATT_RULE_001", ... },
        { "id": "ATT_RULE_002", ... }
      ],

      "validations": [
        {
          "field": "checkInTime",
          "type": "required",
          "message": "Hora entrada requerida"
        },
        {
          "field": "userId",
          "type": "foreign_key",
          "references": "users.id",
          "onDelete": "CASCADE"
        }
      ],

      "permissions": [
        {
          "action": "create_manual",
          "allowedRoles": ["admin", "supervisor"]
        },
        {
          "action": "view_all",
          "allowedRoles": ["admin", "supervisor"]
        },
        {
          "action": "view_own",
          "allowedRoles": ["employee"]
        }
      ],

      "dependencies": {
        "required": ["users", "shifts"],
        "optional": ["departments"],
        "provides_to": ["dashboard", "payroll", "reports"]
      },

      "complexFlows": [
        {
          "name": "Crear Asistencia",
          "steps": [...],
          "diagram": "mermaid://..."
        }
      ],

      "calculations": [
        {
          "name": "Horas trabajadas",
          "formula": "(checkOut - checkIn) - breakTime",
          "unit": "hours"
        },
        {
          "name": "Horas extras",
          "formula": "IF (hoursWorked > shift.normalHours) THEN (hoursWorked - shift.normalHours) ELSE 0"
        }
      ]
    },

    "users": { ... },
    "departments": { ... }
    // ... 45 módulos más
  },

  "globalRules": [
    {
      "id": "GLOBAL_001",
      "name": "Multi-tenancy",
      "rule": "TODOS los queries deben filtrar por companyId",
      "severity": "CRITICAL"
    },
    {
      "id": "GLOBAL_002",
      "name": "Soft delete",
      "rule": "NO eliminar registros físicamente, usar isActive=false"
    }
  ],

  "statistics": {
    "totalModules": 45,
    "totalBusinessRules": 1247,
    "totalValidations": 823,
    "totalPermissionRules": 342,
    "totalFlows": 67,
    "lastFullScan": "2025-12-24T10:00:00Z"
  }
}
```

---

## 🎯 APLICACIONES DE LA KNOWLEDGE BASE

### 1. Ayuda Contextual Inteligente

```javascript
// En cada módulo del frontend
function showContextualHelp(moduleName, currentScreen) {
  const moduleInfo = BrainKnowledge.getModule(moduleName);

  const help = `
    <h3>${moduleInfo.name}</h3>
    <p>${moduleInfo.description}</p>

    <h4>Permisos requeridos:</h4>
    <ul>
      ${moduleInfo.permissions.map(p =>
        `<li>${p.action}: ${p.allowedRoles.join(', ')}</li>`
      ).join('')}
    </ul>

    <h4>Reglas de negocio:</h4>
    ${moduleInfo.businessRules.map(rule =>
      `<div class="rule">
        <strong>${rule.name}</strong>
        <p>${rule.condition}</p>
      </div>`
    ).join('')}
  `;

  Modal.show(help);
}
```

### 2. Capacitación Auto-Generada

```javascript
// Generar tutorial interactivo
function generateTutorial(moduleName) {
  const module = BrainKnowledge.getModule(moduleName);
  const flow = module.complexFlows.find(f => f.name.includes('Crear'));

  const tutorial = {
    title: `Cómo crear ${module.name}`,
    steps: flow.steps.map((step, i) => ({
      number: i + 1,
      title: step.action,
      description: getHumanReadableDescription(step),
      screenshot: generateScreenshot(step.file, step.line),
      businessRule: step.businessRule ?
        module.businessRules.find(r => r.id === step.businessRule) : null
    }))
  };

  return tutorial;
}
```

### 3. Evaluación de Staff

```javascript
// Generar quiz basado en reglas de negocio
function generateQuiz(modules) {
  const questions = [];

  modules.forEach(moduleName => {
    const module = BrainKnowledge.getModule(moduleName);

    module.businessRules.forEach(rule => {
      questions.push({
        type: 'multiple_choice',
        question: `¿Qué pasa si ${rule.condition}?`,
        options: [
          rule.action, // Respuesta correcta
          'Se permite siempre',
          'Se rechaza siempre',
          'Depende del usuario'
        ],
        correctAnswer: rule.action,
        explanation: rule.failureMessage
      });
    });

    module.validations.forEach(val => {
      questions.push({
        type: 'true_false',
        question: `¿El campo ${val.field} es obligatorio?`,
        correctAnswer: val.type === 'required',
        explanation: val.message
      });
    });
  });

  return shuffle(questions);
}
```

### 4. Onboarding Automático para Nuevos Devs

```javascript
// Generar roadmap de aprendizaje
function generateLearningPath(role) {
  if (role === 'backend_dev') {
    return {
      week1: {
        title: 'Arquitectura General',
        modules: ['users', 'authentication', 'companies'],
        tasks: [
          'Entender multi-tenancy',
          'Estudiar modelos Sequelize',
          'Revisar middleware de auth'
        ]
      },
      week2: {
        title: 'Módulos de Negocio',
        modules: ['attendance', 'shifts', 'departments'],
        tasks: [
          'Implementar CRUD de prueba',
          'Estudiar flujos complejos',
          'Hacer PR con tests'
        ]
      }
      // ...
    };
  }
}
```

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs de la Knowledge Base

1. **Cobertura**:
   - % de código con reglas extraídas: > 95%
   - % de módulos documentados: 100%
   - % de flujos mapeados: > 90%

2. **Actualización**:
   - Tiempo de re-extracción: < 5 segundos
   - Cambios detectados: 100%
   - Errores en extracción: < 0.1%

3. **Utilidad**:
   - Tiempo capacitación nuevo staff: -80%
   - Consultas a documentación manual: -90%
   - Bugs por falta de conocimiento: -70%

---

**Próximo paso**: ¿Implementamos el extractor de reglas de negocio ahora o primero terminamos E2E al 100%?
