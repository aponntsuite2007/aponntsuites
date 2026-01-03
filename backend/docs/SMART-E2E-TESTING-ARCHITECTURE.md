# 🧪 Smart E2E Testing System - Arquitectura Unificada

## 📋 Resumen Ejecutivo

Sistema completo de testing automatizado E2E que integra:
- **Smart E2E Testing Orchestrator**: "Ejército de testers" con capacidad de auto-descubrimiento de UI
- **Brain Orchestrator**: Motor de inteligencia para detección de inconsistencias SSOT
- **Phase4 Test Orchestrator**: Sistema de auto-reparación y reportes técnicos
- **Sistema Nervioso (Brain Nervous System)**: Canal unificado de reporte de errores

### ✅ Estado Actual

- **100% Implementado** ✅
- **11/11 tests pasando** (100% success rate)
- **4 módulos activos testeados**: users, attendance, kiosks, medical
- **7 módulos inactivos validados**: departments, shifts, vacations, payroll, biometric, reports, notifications

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                   SMART E2E TESTING SYSTEM                      │
│                    (Orchestrator Principal)                      │
└──────────┬────────────┬─────────────┬──────────────────────────┘
           │            │             │
    ┌──────▼───┐  ┌────▼─────┐  ┌───▼────────┐
    │  Brain   │  │ Phase4   │  │  Sistema   │
    │Orchestrat│  │   Test   │  │  Nervioso  │
    │   or     │  │Orchestrat│  │  (Report)  │
    └──────────┘  └──────────┘  └────────────┘
```

### 1. Smart E2E Testing Orchestrator

**Ubicación**: `backend/src/services/EcosystemBrainService.js`

**Responsabilidades**:
- Ejecutar tests E2E multi-nivel
- Auto-descubrimiento de UI elements
- Validación de contratos de módulos
- Detección de módulos visibles sin contrato
- Integración con Sistema Nervioso

**Métodos clave**:
```javascript
// Test de módulo específico
async testModuleE2E(moduleKey, companyId, options = {})

// Test comprehensivo de todos los módulos
async comprehensiveTest(companyId)

// Obtener módulos activos/contratados
async getActiveModulesForCompany(companyId)

// Descubrir elementos UI reales
async getModuleUIElements(moduleKey)
```

**Flujo de Testing**:
1. **Obtener módulos contratados** desde `company_modules`
2. **Escanear UI** para cada módulo (Puppeteer)
3. **Validar endpoints** según registry de módulos
4. **Detectar violaciones** (módulos visibles sin contrato)
5. **Reportar a Sistema Nervioso** todos los errores

### 2. Brain Orchestrator

**Ubicación**: `backend/src/brain/services/BrainOrchestrator.js`

**Responsabilidades**:
- Validación SSOT (Single Source of Truth)
- Detección de inconsistencias entre:
  - Registry estático
  - Código frontend
  - Configuración de base de datos
  - Estado runtime
- Generación de reportes de salud

**Integración**:
```javascript
// Validar SSOT de un módulo
const ssotValidation = await brainOrchestrator.validateModuleSSOT(moduleKey);

// Detectar inconsistencias
if (ssotValidation.inconsistencies.length > 0) {
  // Reportar al Sistema Nervioso
  await brainNervousSystem.reportError({
    category: 'SSOT_MISMATCH',
    details: ssotValidation.inconsistencies
  });
}
```

### 3. Phase4 Test Orchestrator

**Ubicación**: `backend/src/auditor/core/IntelligentTestingOrchestrator.js`

**Responsabilidades**:
- Auto-reparación de errores detectados
- Generación de reportes técnicos (7 secciones)
- Análisis inteligente con Ollama
- Gestión de tickets para Claude Code

**Componentes**:
- **AutonomousRepairAgent**: Ciclo completo de auto-fix
- **TechnicalReportGenerator**: Reportes detallados
- **OllamaAnalyzer**: Análisis con IA (fallback pattern-based)
- **TicketGenerator**: Generación de tickets

### 4. Sistema Nervioso (Brain Nervous System)

**Ubicación**: `backend/src/brain/services/BrainNervousSystem.js`

**Responsabilidades**:
- Canal unificado de reporte de errores
- Clasificación de severidad (INFO, WARNING, ERROR, CRITICAL)
- Escalamiento automático de errores críticos
- Persistencia en base de datos
- Notificaciones en tiempo real

**Categorías de Errores**:
```javascript
CATEGORIES = {
  'SSOT_MISMATCH',           // Inconsistencia SSOT
  'MODULE_CONTRACT_VIOLATION', // Módulo visible sin contrato
  'UI_ELEMENT_MISSING',       // Elemento UI esperado no encontrado
  'ENDPOINT_FAILURE',         // Endpoint no responde
  'DATABASE_ERROR',           // Error de BD
  'INTEGRATION_ERROR'         // Error de integración
}
```

---

## 🔄 Flujo Completo de Testing

### Test Comprensivo (11 Módulos)

```javascript
POST /api/audit/phase4/comprehensive-test
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "companyId": 11
}
```

**Respuesta**:
```json
{
  "success": true,
  "results": {
    "companyId": 11,
    "totalTests": 11,
    "passed": 11,
    "failed": 0,
    "critical": 0,
    "moduleResults": [
      {
        "module": "users",
        "isActive": true,
        "expectedUI": 584,
        "expectedEndpoints": 38,
        "passed": true
      },
      {
        "module": "medical",
        "isActive": true,
        "expectedUI": 0,
        "expectedEndpoints": 24,
        "passed": true
      }
      // ... más módulos
    ]
  },
  "summary": {
    "passRate": "100.0%"
  },
  "integration": "🧬 Todos los errores reportados al Sistema Nervioso"
}
```

### Test de Módulo No Contratado

```javascript
POST /api/audit/phase4/test-uncontracted
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "companyId": 11,
  "moduleKey": "vacation-management"
}
```

**Detección de Violación**:
- Si el módulo está visible en UI pero NO contratado → **CONTRACT_VIOLATION**
- Reporte automático al Sistema Nervioso
- Escalamiento a CRITICAL si afecta múltiples empresas

---

## 🧠 Integración con Brain

### SSOT Validation

Todos los tests ejecutan validación SSOT en paralelo:

```javascript
const brainValidation = await brainOrchestrator.validateModuleSSOT(moduleKey);

if (brainValidation.status === 'inconsistent') {
  // Reportar al Sistema Nervioso
  await nervousSystem.reportError({
    category: 'SSOT_MISMATCH',
    severity: 'WARNING',
    module: moduleKey,
    details: {
      registry: brainValidation.sources.registry,
      frontend: brainValidation.sources.frontend,
      database: brainValidation.sources.database,
      inconsistencies: brainValidation.inconsistencies
    }
  });
}
```

### Auto-Discovery de UI

Usa Puppeteer para escanear elementos reales:

```javascript
async getModuleUIElements(moduleKey) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`http://localhost:9998/panel-empresa.html`);

  // Login automático
  await this.performLogin(page, companyId);

  // Navegar al módulo
  await this.navigateToModule(page, moduleKey);

  // Contar elementos UI
  const uiElements = await page.evaluate(() => {
    return {
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input').length,
      tables: document.querySelectorAll('table').length,
      modals: document.querySelectorAll('.modal').length
    };
  });

  await browser.close();
  return uiElements;
}
```

---

## 📊 Módulos Testeados

### Módulos Activos (Company 11 - ISI)

| Módulo | UI Elements | Endpoints | Estado |
|--------|------------|-----------|--------|
| **users** | 584 | 38 | ✅ PASSED |
| **attendance** | 45 | 1 | ✅ PASSED |
| **kiosks** | 10 | 0 | ✅ PASSED |
| **medical** | 0 | 24 | ✅ PASSED |

### Módulos Inactivos (Validados)

| Módulo | Endpoints | Estado |
|--------|-----------|--------|
| departments | 0 | ✅ PASSED |
| shifts | 4 | ✅ PASSED |
| vacations | 0 | ✅ PASSED |
| payroll | 7 | ✅ PASSED |
| biometric | 5 | ✅ PASSED |
| reports | 5 | ✅ PASSED |
| notifications | 6 | ✅ PASSED |

**Total**: 11 tests, 100% pass rate

---

## 🔧 Configuración y Uso

### Requisitos

- Node.js 16+
- PostgreSQL 12+
- Puppeteer (instalado con `npm install`)
- Token de admin válido

### Variables de Entorno

```bash
# .env
OLLAMA_BASE_URL=http://localhost:11434  # Para análisis con IA
OLLAMA_MODEL=llama3.1:8b
BRAIN_NERVOUS_SYSTEM_ENABLED=true      # Activar Sistema Nervioso
```

### Endpoints Disponibles

#### 1. Test Comprensivo
```bash
POST /api/audit/phase4/comprehensive-test
Body: { "companyId": 11 }
```

#### 2. Test de Módulo Específico
```bash
POST /api/audit/phase4/test-module
Body: { "companyId": 11, "moduleKey": "users" }
```

#### 3. Test de Módulo No Contratado
```bash
POST /api/audit/phase4/test-uncontracted
Body: { "companyId": 11, "moduleKey": "vacation-management" }
```

#### 4. Ver Errores del Sistema Nervioso
```bash
GET /api/brain/nervous-system/errors
Query: ?severity=CRITICAL&limit=50
```

---

## 📝 Ejemplo de Sesión de Testing

### 1. Login como Admin

```bash
curl -X POST http://localhost:9998/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "rrhh1_1765854889484@isi.test",
    "password": "test123",
    "companyId": 11
  }'
```

**Respuesta**:
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "role": "admin",
    "company_id": 11
  }
}
```

### 2. Ejecutar Test Comprensivo

```bash
curl -X POST http://localhost:9998/api/audit/phase4/comprehensive-test \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "companyId": 11 }'
```

**Resultado**: 11/11 tests pasados ✅

### 3. Ver Errores Reportados

```bash
curl http://localhost:9998/api/brain/nervous-system/errors?severity=WARNING \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🔍 Detalles Técnicos

### Corrección Crítica: Column Name Fix

**Problema detectado**:
```sql
-- ❌ Incorrecto (columna no existe)
SELECT module_key, module_name FROM system_modules

-- ✅ Correcto (columna real)
SELECT module_key, name FROM system_modules
```

**Archivo corregido**: `EcosystemBrainService.js` líneas 4241, 4251

**Cambio aplicado**:
```javascript
// ANTES
attributes: ['module_key', 'module_name', 'category']

// DESPUÉS
attributes: ['module_key', 'name', 'category']
```

### Estructura de Datos

#### CompanyModule (company_modules table)
```javascript
{
  company_id: 11,
  module_key: 'medical',
  is_active: true,
  contracted_at: '2025-01-15',
  config: { features: [...] }
}
```

#### SystemModule (system_modules table)
```javascript
{
  module_key: 'medical',
  name: 'Gestión Médica',          // ← Columna correcta
  category: 'RRHH',
  version: '1.0.0',
  endpoints: ['GET /api/medical/...']
}
```

---

## 🎯 Próximos Pasos

### Mejoras Planificadas

1. **Cobertura Visual de Tests**
   - Screenshots automáticos de errores UI
   - Comparación visual con versiones anteriores
   - Detección de regresiones visuales

2. **Performance Testing**
   - Medición de tiempo de carga por módulo
   - Detección de memory leaks
   - Profiling de queries lentas

3. **Security Testing**
   - Validación de permisos por rol
   - Test de inyección SQL
   - Validación de tokens JWT

4. **Integration con CI/CD**
   - GitHub Actions workflow
   - Tests automáticos en PRs
   - Reportes de cobertura

5. **Dashboard de Testing**
   - Panel visual en panel-administrativo
   - Gráficos de tendencias de tests
   - Alertas en tiempo real

---

## 📚 Referencias

### Archivos Clave

- `backend/src/services/EcosystemBrainService.js` - Smart E2E Orchestrator
- `backend/src/brain/services/BrainOrchestrator.js` - Brain Orchestrator
- `backend/src/brain/services/BrainNervousSystem.js` - Sistema Nervioso
- `backend/src/auditor/core/IntelligentTestingOrchestrator.js` - Phase4 Orchestrator
- `backend/src/routes/auditorPhase4Routes.js` - API endpoints

### Documentación Relacionada

- `BRAIN-ORCHESTRATOR-INTEGRATION.md` - Integración con Brain
- `AI-ASSISTANT-SYSTEM.md` - Sistema de Asistente IA
- `TESTING-MODULOS.md` - Testing manual de módulos

---

## 📞 Soporte

Para dudas o issues:
1. Revisar logs del Sistema Nervioso
2. Ejecutar test específico del módulo afectado
3. Revisar reportes técnicos de Phase4
4. Consultar con el Asistente IA (si Ollama está disponible)

**Última actualización**: 2025-12-22
**Versión**: 1.0.0
**Estado**: Producción ✅
