# 🧠 SISTEMA DE AUTO-CONOCIMIENTO Y MÓDULOS PLUG & PLAY

## 📋 PROPÓSITO DE ESTA DOCUMENTACIÓN

**Para que el sistema sepa que tiene y que funciones dispone y puede usar (parte de su autoconocimiento)**

Esta documentación permite al sistema:
1. **Entender qué módulos están contratados** por cada empresa
2. **Adaptar la funcionalidad** según los módulos activos
3. **Mostrar ayuda contextual** correcta (no referenciar módulos no contratados)
4. **Detectar interrelaciones** entre módulos automáticamente
5. **Generar capacitaciones automáticas** basadas en auditorías

---

## 🎯 ARQUITECTURA PLUG & PLAY

### ✅ COMPONENTES EXISTENTES IMPLEMENTADOS

#### 1. **SystemRegistry (src/auditor/registry/SystemRegistry.js)**
**Cerebro del sistema** - Auto-conocimiento completo

**Funciones disponibles:**
- `canModuleWork(moduleId, companyId)` - Verifica si módulo puede funcionar
- `analyzeDeactivationImpact(moduleId)` - Analiza impacto de desactivar módulo
- `suggestBundles(companyId)` - Sugiere bundles comerciales inteligentes
- `validateCompanyModules(companyId)` - Valida coherencia de módulos activos
- `getModule(moduleId)` - Obtiene información completa del módulo
- `getCoreModules()` - Lista módulos CORE obligatorios
- `getStandaloneModules()` - Lista módulos que funcionan solos

**Registry JSON (modules-registry.json):**
- **45 módulos registrados** con dependencias completas
- **8 categorías:** core, rrhh, security, compliance, communication, analytics, finance, erp
- **Dependencias detalladas:** required, optional, integrates_with, provides_to

#### 2. **Database Models**

**SystemModule (src/models/SystemModule.js):**
- `module_key` - Identificador único
- `name` - Nombre descriptivo
- `category` - Categoría del módulo
- `is_core` - Si es módulo obligatorio
- `requirements` - JSON con módulos requeridos
- `features` - JSON con características incluidas

**CompanyModule (src/models/CompanyModule.js):**
- `isOperational()` - Verifica si módulo está activo y funcional
- `isExpired()` - Verifica si módulo venció
- `isSuspended()` - Verifica si módulo está suspendido
- `contracted_price` - Precio específico contratado
- `configuration` - JSON con configuración específica

#### 3. **AuditorKnowledgeBase (src/auditor/core/AuditorKnowledgeBase.js)**
**Sistema de aprendizaje automático**

**Funciones disponibles:**
- `getSuggestionForError(errorType, errorMessage, moduleName)` - Sugerencia inteligente
- `recordFix(errorType, fixStrategy, success, executionId)` - Registra aprendizaje
- `getStats()` - Estadísticas de conocimiento acumulado
- Pattern matching con algoritmo Levenshtein para similitud de errores

#### 4. **Training Management System (EXISTENTE)**
**Sistema de capacitaciones automáticas**

**Archivos existentes:**
- `src/models/Training-postgresql.js`
- `src/models/TrainingAssignment-postgresql.js`
- `src/models/TrainingProgress-postgresql.js`
- `src/routes/trainingRoutes.js`
- `public/js/modules/training-management.js`

---

## 🔗 INTERRELACIONES ENTRE MÓDULOS

### **DEPENDENCIAS CRÍTICAS**

#### **Módulos CORE (obligatorios):**
```
users → companies, database
attendance → users, companies, database
dashboard → users, companies
settings → companies
notifications → users, companies
```

#### **Módulos RRHH:**
```
medical → users, companies
  ↳ OPCIONAL: notifications-enterprise, document-management
  ↳ INTEGRA: attendance, vacation, dashboard
  ↳ PROVEE: reports-advanced, legal

vacation → users, companies
  ↳ OPCIONAL: notifications-enterprise, dashboard
  ↳ INTEGRA: attendance, medical
  ↳ PROVEE: reports-advanced

training-management → users, companies
  ↳ OPCIONAL: document-management
  ↳ INTEGRA: users
```

#### **Módulos BIOMÉTRICOS:**
```
biometric → users, companies
  ↳ OPCIONAL: kiosks
  ↳ INTEGRA: attendance, access-control
  ↳ PROVEE: attendance

real-biometric-enterprise → users, companies
  ↳ OPCIONAL: kiosks
  ↳ INTEGRA: attendance, access-control
  ↳ PROVEE: attendance
```

#### **Módulos de NOTIFICACIONES:**
```
notifications-enterprise → users, companies
  ↳ INTEGRA: ALL (todos los módulos)
  ↳ PROVEE: ALL (mejora todos los módulos)
```

---

## 💡 LÓGICA DE FUNCIONAMIENTO INTELIGENTE

### **1. DETECCIÓN AUTOMÁTICA DE MÓDULOS CONTRATADOS**

```javascript
// Ejemplo de uso en el sistema:
const systemRegistry = new SystemRegistry(database);
await systemRegistry.initialize();

// Para una empresa específica
const companyModules = await systemRegistry._getCompanyActiveModules(companyId);
console.log('Módulos contratados:', companyModules);
// Resultado: ['users', 'attendance', 'medical', 'vacation', 'notifications-enterprise']
```

### **2. VERIFICACIÓN DE FUNCIONALIDAD**

```javascript
// ¿Puede el módulo 'medical' funcionar?
const canWork = await systemRegistry.canModuleWork('medical', companyId);

if (canWork.can_work) {
  console.log('✅ Módulo medical puede funcionar');
  console.log('Features completas:', canWork.with_full_features);
  console.log('Opcionales disponibles:', canWork.available_optional);
} else {
  console.log('❌ Módulo medical NO puede funcionar');
  console.log('Falta:', canWork.missing);
  console.log('Sugerencia:', canWork.suggestion);
}
```

### **3. ANÁLISIS DE IMPACTO**

```javascript
// ¿Qué pasa si desactivo 'users'?
const impact = systemRegistry.analyzeDeactivationImpact('users');

console.log('Es seguro desactivar:', impact.safe);
console.log('Módulos afectados críticamente:', impact.critical_affected);
console.log('Módulos con features reducidas:', impact.degraded_affected);

// Resultado típico:
// safe: false
// critical_affected: 5 (attendance, medical, vacation, legal, reports)
// affected: [
//   { module: 'attendance', impact: 'critical', reason: 'attendance NO PUEDE funcionar sin users' }
// ]
```

### **4. SUGERENCIAS COMERCIALES INTELIGENTES**

```javascript
// ¿Qué bundles puedo sugerir?
const bundles = await systemRegistry.suggestBundles(companyId);

// Resultado típico:
// [
//   {
//     type: 'bundle',
//     name: 'Bundle RRHH Completo',
//     current_modules: ['medical', 'vacation'],
//     missing_modules: ['notifications-enterprise'],
//     benefit: 'Gestión integral de RRHH con notificaciones automáticas'
//   }
// ]
```

---

## 🎓 SISTEMA DE CAPACITACIONES AUTOMÁTICAS

### **CÓMO FUNCIONA EL AUTO-APRENDIZAJE EXISTENTE**

#### **1. Recolección de Información (durante auditorías)**
```javascript
// El AdvancedUserSimulationCollector registra:
- Qué acciones realiza el usuario
- Qué errores encuentra
- Qué módulos usa más frecuentemente
- Qué workflows son más comunes
```

#### **2. Almacenamiento en Knowledge Base**
```javascript
// AuditorKnowledgeBase guarda:
- Patrones de error por módulo
- Soluciones exitosas aplicadas
- Tasa de éxito de cada fix
- Health trend de cada módulo
```

#### **3. Generación Automática de Capacitaciones**
```javascript
// Sistema existente de Training Management:
- Detecta usuario nuevo en módulo X
- Busca en knowledge base errores comunes de módulo X
- Genera tutorial automático con:
  * Pasos principales del módulo
  * Errores más frecuentes y cómo evitarlos
  * Workflows optimizados basados en auditorías
```

### **EJEMPLO PRÁCTICO**

**Escenario:** Usuario nuevo asignado al módulo "sanciones"

```javascript
// 1. Sistema detecta asignación nueva
const newUserModules = await detectNewUserAssignments(userId);

// 2. Genera capacitación automática
const training = await generateAutoTraining({
  userId: userId,
  moduleKey: 'sanctions-management',
  companyId: companyId
});

// 3. Contenido generado automáticamente:
training = {
  title: "Capacitación: Gestión de Sanciones",
  sections: [
    {
      title: "Introducción al Módulo",
      content: "El módulo de sanciones permite...",
      videoUrl: "/videos/sanctions-intro.mp4" // Auto-generado
    },
    {
      title: "Errores Comunes y Cómo Evitarlos",
      content: [
        "Error más frecuente: 'No se puede enviar sanción sin justificación'",
        "Solución: Siempre completar campo 'Motivo' antes de enviar"
      ]
    },
    {
      title: "Workflow Optimizado",
      content: "Basado en 50+ auditorías, el proceso más eficiente es..."
    }
  ]
}

// 4. Envío automático
await sendTrainingToUser(userId, training);
```

---

## 🔧 FUNCIONES DISPONIBLES PARA EL SISTEMA

### **SystemRegistry Functions**

```javascript
// DETECCIÓN DE MÓDULOS
await systemRegistry.canModuleWork(moduleId, companyId)
await systemRegistry._getCompanyActiveModules(companyId)
await systemRegistry.validateCompanyModules(companyId)

// ANÁLISIS DE DEPENDENCIAS
systemRegistry.analyzeDeactivationImpact(moduleId)
await systemRegistry.suggestBundles(companyId)

// OBTENCIÓN DE INFORMACIÓN
systemRegistry.getModule(moduleId)
systemRegistry.getAllModules()
systemRegistry.getCoreModules()
systemRegistry.getStandaloneModules()
systemRegistry.getModulesByCategory(category)
```

### **CompanyModule Methods**

```javascript
// VERIFICACIÓN DE ESTADO
companyModule.isOperational() // ¿Está activo, no expirado, no suspendido?
companyModule.isExpired() // ¿Venció la licencia?
companyModule.isSuspended() // ¿Está suspendido?

// INFORMACIÓN COMERCIAL
companyModule.getDaysUntilExpiration()
companyModule.getDaysUntilNextBilling()

// GESTIÓN
companyModule.suspend(reason)
companyModule.reactivate()
```

### **AuditorKnowledgeBase Functions**

```javascript
// APRENDIZAJE AUTOMÁTICO
await knowledgeBase.initialize()
knowledgeBase.getSuggestionForError(errorType, errorMessage, moduleName)
await knowledgeBase.recordFix(errorType, fixStrategy, success, executionId)

// ESTADÍSTICAS
knowledgeBase.getStats() // Returns: error patterns, successful fixes, module health
```

---

## 📊 EJEMPLOS DE USO REAL

### **Ejemplo 1: Ayuda Contextual Inteligente**

```javascript
// Usuario pregunta: "¿Cómo gestiono vacaciones?"
const companyModules = await getCompanyActiveModules(user.company_id);

if (companyModules.includes('vacation')) {
  // Mostrar ayuda completa del módulo vacation
  response = "Para gestionar vacaciones: 1. Ve a módulo Vacaciones...";
} else {
  // No mostrar funcionalidad no disponible
  response = "Tu empresa no tiene contratado el módulo de vacaciones. Contacta al administrador.";
}
```

### **Ejemplo 2: Auto-reparación Inteligente**

```javascript
// Durante auditoría, se encuentra error en módulo 'medical'
const suggestion = knowledgeBase.getSuggestionForError(
  'database_constraint_error',
  'FK constraint violation on medical_certificates',
  'medical'
);

// Resultado:
{
  strategy: 'check-user-medical-relationship',
  confidence: 'high',
  successRate: 0.85,
  reason: 'Esta estrategia ha sido aplicada 12 veces para database_constraint_error',
  source: 'knowledge-base'
}

// Sistema aplica fix automáticamente con alta confianza
await applyAutomaticFix(suggestion);
```

### **Ejemplo 3: Capacitación Automática Contextual**

```javascript
// Usuario nuevo en departamento que usa 'medical' + 'vacation'
const userModules = await getUserAvailableModules(userId, companyId);
// Resultado: ['users', 'attendance', 'medical', 'vacation', 'notifications-enterprise']

// Sistema genera capacitación automática que incluye SOLO módulos contratados
const training = await generateContextualTraining({
  userId,
  availableModules: userModules,
  learningFromAudits: true
});

// Contenido incluye:
// ✅ Cómo usar módulo medical (porque está contratado)
// ✅ Integración medical-vacation (porque ambos están)
// ✅ Notificaciones automáticas (porque notifications-enterprise está)
// ❌ NO menciona 'legal' (porque no está contratado)
```

---

## 🔍 VALIDACIÓN DE COHERENCIA

### **Verificación Automática de Módulos**

```javascript
// El sistema puede auto-validarse
const validation = await systemRegistry.validateCompanyModules(companyId);

if (!validation.valid) {
  console.log('⚠️ Problemas detectados:');
  validation.issues.forEach(issue => {
    console.log(`${issue.severity}: ${issue.message}`);
    if (issue.fix) {
      console.log(`Solución sugerida: ${issue.fix}`);
    }
  });
}

// Resultado típico:
// critical: medical requiere users pero no está activo
// Solución sugerida: Activar módulo users
```

---

## 📁 ARCHIVOS CLAVE DEL SISTEMA

### **Registry y Auto-conocimiento:**
- `src/auditor/registry/SystemRegistry.js` - Cerebro del sistema
- `src/auditor/registry/modules-registry.json` - 45 módulos con dependencias
- `src/auditor/core/AuditorKnowledgeBase.js` - Sistema de aprendizaje

### **Database Models:**
- `src/models/SystemModule.js` - Módulos disponibles
- `src/models/CompanyModule.js` - Módulos contratados por empresa

### **Training System (EXISTENTE):**
- `src/models/Training-postgresql.js`
- `src/models/TrainingAssignment-postgresql.js`
- `src/models/TrainingProgress-postgresql.js`
- `src/routes/trainingRoutes.js`

### **AI Assistant Integration:**
- `src/models/AssistantKnowledgeBase.js` - Knowledge base global
- `src/services/AssistantService.js` - Contexto basado en módulos

---

## 🎯 ESTADO ACTUAL Y CAPACIDADES

### ✅ **LO QUE YA FUNCIONA:**

1. **Auto-detección de módulos contratados** ✅
2. **Validación de dependencias** ✅
3. **Análisis de impacto de desactivación** ✅
4. **Sugerencias comerciales inteligentes** ✅
5. **Sistema de aprendizaje automático** ✅
6. **Knowledge base con patrones de error** ✅
7. **Sistema de capacitaciones** ✅ (existente)
8. **Integración con AI Assistant** ✅

### 🎯 **CAPACIDADES INMEDIATAS:**

El sistema **YA PUEDE**:
- Adaptar ayuda según módulos contratados
- Generar sugerencias de bundles comerciales
- Auto-reparar errores usando knowledge base
- Validar coherencia de configuración
- Generar capacitaciones contextuales
- Detectar módulos faltantes para funcionalidades

### 💡 **USO RECOMENDADO:**

**Para cualquier funcionalidad nueva que implemente:**
1. Usar `systemRegistry.canModuleWork()` antes de mostrar opciones
2. Usar `getCompanyActiveModules()` para contextualizar ayuda
3. Usar `knowledgeBase.getSuggestionForError()` para auto-reparación
4. Usar training system para capacitar usuarios automáticamente

**El sistema se conoce a sí mismo y puede adaptar su comportamiento según los módulos contratados por cada empresa. Esta documentación permite que el sistema entienda qué funciones tiene disponibles y cómo usarlas para brindar la mejor experiencia a cada cliente.**

---

## 📊 MÉTRICAS Y ESTADÍSTICAS DISPONIBLES

### **Registry Stats:**
- 45 módulos registrados
- 8 categorías de módulos
- 100% de módulos con dependencias mapeadas

### **Knowledge Base Stats:**
- Patrones de error aprendidos automáticamente
- Tasa de éxito de fixes aplicados
- Health score por módulo (últimos 30 días)
- Similitud de errores con algoritmo Levenshtein

### **Training Stats:**
- Capacitaciones generadas automáticamente
- Progress tracking por usuario
- Asignaciones automáticas basadas en roles

---

**El sistema está completamente preparado para funcionar de manera inteligente y contextual según los módulos contratados por cada empresa. Esta documentación sirve como referencia para que el sistema "sepa lo que tiene" y pueda usar estas capacidades de manera óptima.**