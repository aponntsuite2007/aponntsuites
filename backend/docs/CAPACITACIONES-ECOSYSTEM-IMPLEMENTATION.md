# 📚 ECOSISTEMA DE CAPACITACIONES - IMPLEMENTACIÓN COMPLETA

## Fecha: 2026-02-01
## Estado: ✅ IMPLEMENTADO Y MIGRADO

---

## 📋 RESUMEN DE IMPLEMENTACIÓN

Se implementó el ecosistema completo de integraciones entre **Capacitaciones** y los módulos afluentes:
- ✅ HSE (Seguridad e Higiene)
- ✅ Medical (Exámenes Médicos)
- ✅ ART (Accidentes Laborales)
- ✅ Procedures (Procedimientos)
- ✅ Risk Intelligence

---

## 🗂️ ARCHIVOS CREADOS

### Base de Datos
```
backend/migrations/20260201_training_ecosystem_integration.sql  ✅ EJECUTADO
```

**Cambios en BD:**
- `training_assignments`: +6 columnas (source_module, source_entity_type, source_entity_id, auto_assigned, assignment_reason, priority)
- `trainings`: +6 columnas (requires_medical_clearance, required_medical_exams, linked_procedure_ids, hse_violation_codes, risk_categories, risk_level)
- Nueva tabla: `training_integration_log` (auditoría de integraciones)
- Nueva tabla: `training_eligibility_rules` (reglas de elegibilidad)
- Función: `get_training_assignments_by_source()` (estadísticas por origen)
- Función: `check_medical_eligibility()` (validación médica)

### Servicios de Integración
```
backend/src/services/integrations/
├── TrainingEcosystemHub.js          # Hub central (orquestador)
├── hse-training-integration.js       # Integración HSE → Training
├── medical-training-integration.js   # Integración Medical → Training
├── art-training-integration.js       # Integración ART → Training
├── procedures-training-integration.js # Integración Procedures → Training
├── risk-training-integration.js      # Integración Risk → Training
└── training-notifications.js         # NCE (ya existía)
```

### API REST
```
backend/src/routes/trainingEcosystemRoutes.js
```

**Endpoints:**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/training-ecosystem/stats` | Estadísticas por módulo origen |
| GET | `/api/v1/training-ecosystem/integration-log` | Historial de integraciones |
| GET | `/api/v1/training-ecosystem/circuits` | Info de circuitos |
| POST | `/api/v1/training-ecosystem/trigger/hse` | Disparar integración HSE |
| POST | `/api/v1/training-ecosystem/trigger/medical` | Disparar integración Medical |
| POST | `/api/v1/training-ecosystem/trigger/art` | Disparar integración ART |
| POST | `/api/v1/training-ecosystem/trigger/risk` | Disparar integración Risk |
| GET | `/api/v1/training-ecosystem/eligibility/:trainingId/:userId` | Verificar elegibilidad |
| GET | `/api/v1/training-ecosystem/recommendations/:userId` | Recomendaciones por riesgo |
| GET | `/api/v1/training-ecosystem/report/post-accident` | Reporte post-accidente |
| GET | `/api/v1/training-ecosystem/report/procedure-compliance` | Reporte compliance |
| GET | `/api/v1/training-ecosystem/report/expiring-medical` | Certificados por vencer |
| GET | `/api/v1/training-ecosystem/report/risk-dashboard` | Dashboard riesgo |
| POST | `/api/v1/training-ecosystem/reprioritize/:userId` | Re-priorizar por riesgo |
| POST | `/api/v1/training-ecosystem/notify-expiring` | Notificar certificados |

### Sistema de Ayuda Contextual
```
backend/public/js/modules/training-help-system.js
```

**Contenido de ayuda:**
- Dashboard: Explicación de KPIs y circuitos
- Trainings: Cómo crear y vincular capacitaciones
- Evaluations: Configuración de evaluaciones
- Employees: Significado de cada origen de asignación
- Reports: Interpretación de métricas
- Circuitos de integración: Diagramas y ejemplos para cada uno
- Fallback responses: Respuestas para preguntas comunes

### Documentación
```
backend/docs/
├── CAPACITACIONES-ECOSYSTEM-ANALYSIS.md       # Análisis inicial
└── CAPACITACIONES-ECOSYSTEM-IMPLEMENTATION.md # Este archivo
```

---

## 🔗 CIRCUITOS DE INTEGRACIÓN

### 1. HSE → Training
```
Violación EPP detectada
         │
         ▼
    Caso HSE creado
         │
         ▼
   Caso confirmado ────▶ TrainingEcosystemHub.onHSEViolation()
         │
         ▼
Busca training por código violación
         │
         ▼
Auto-asigna con prioridad HIGH
         │
         ▼
Notifica vía NCE
```

**Mapeos:**
- `NO_HELMET` → Capacitación "Protección cabeza"
- `NO_GLOVES` → Capacitación "Protección manos"
- `NO_HARNESS` → Capacitación "Trabajo en altura"

### 2. Medical → Training
```
Examen médico realizado
         │
         ▼
Deficiencia detectada ────▶ TrainingEcosystemHub.onMedicalDeficiency()
         │
         ▼
Busca training remedial
         │
         ▼
Auto-asigna con prioridad NORMAL
```

**También valida elegibilidad:**
```
Inscripción en training de riesgo
         │
         ▼
MedicalTrainingIntegration.validateEligibility()
         │
    ┌────┴────┐
    │         │
   OK      BLOQUEADO
    │         │
    ▼         ▼
Inscribir  Mensaje "Renovar certificado"
```

### 3. ART → Training
```
Accidente laboral
         │
         ▼
   Alta médica ────▶ TrainingEcosystemHub.onARTAccident()
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Víctima    Área
    │         │
    ▼         ▼
Reinserción Prevención
(CRITICAL)  (HIGH)
```

### 4. Procedures → Training
```
Procedimiento publicado
         │
         ▼
requires_training = true?
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
Obtener    (nada)
afectados
    │
    ▼
Auto-asignar a todos
```

### 5. Risk Intelligence → Training
```
Cálculo de score de riesgo
         │
         ▼
   Score ≥ 80? ────▶ TrainingEcosystemHub.onCriticalRiskScore()
         │
         ▼
Busca training por categoría
         │
         ▼
Auto-asigna con prioridad según score
```

---

## 📊 CÓMO USAR LOS CIRCUITOS

### Desde HSECaseService (al confirmar caso):
```javascript
const HSETrainingIntegration = require('./integrations/hse-training-integration');

// En confirmViolation():
await HSETrainingIntegration.onCaseConfirmed(hseCase, violations, userId);
```

### Desde userMedicalExamsRoutes (al crear examen):
```javascript
const MedicalTrainingIntegration = require('../services/integrations/medical-training-integration');

// Al detectar deficiencias:
await MedicalTrainingIntegration.onExamCompleted(exam, deficiencies);
```

### Desde artRoutes (al cerrar accidente):
```javascript
const ARTTrainingIntegration = require('../services/integrations/art-training-integration');

// Al dar alta médica:
await ARTTrainingIntegration.onAccidentClosed(accident, closedBy);
```

### Desde proceduresRoutes (al publicar):
```javascript
const ProceduresTrainingIntegration = require('../services/integrations/procedures-training-integration');

// Al publicar procedimiento:
await ProceduresTrainingIntegration.onProcedurePublished(procedure, publishedBy);
```

### Desde Risk Intelligence (al calcular score):
```javascript
const RiskTrainingIntegration = require('../services/integrations/risk-training-integration');

// Si score >= 80:
await RiskTrainingIntegration.onCriticalRiskScore({ userId, companyId, riskCategory, riskScore, alertId });
```

---

## 🎨 SISTEMA DE AYUDA CONTEXTUAL

El módulo de capacitaciones ahora tiene ayuda contextual completa registrada en `ModuleHelpSystem`.

### Contextos disponibles:
- `dashboard`: Dashboard principal con circuitos
- `trainings`: Gestión de capacitaciones
- `evaluations`: Evaluaciones vinculadas
- `independent-evaluations`: Evaluaciones independientes
- `employees`: Seguimiento de empleados
- `reports`: Reportes y métricas
- `calendar`: Calendario
- `integration_hse`: Circuito HSE
- `integration_medical`: Circuito Medical
- `integration_art`: Circuito ART
- `integration_procedures`: Circuito Procedures
- `integration_risk`: Circuito Risk

### Tooltips de origen:
```javascript
// En el frontend, mostrar tooltip al pasar sobre badge de origen:
TrainingHelp.showSourceTooltip(element, 'hse', 'hse_case', 123);
```

### Panel de circuitos:
```javascript
// Mostrar modal con todos los circuitos:
TrainingHelp.showCircuitsHelpPanel();
```

---

## 📈 TESTING

### Test visual del ecosistema:
```bash
cd backend
npx playwright test tests/e2e/modules/visual-capacitaciones-ecosystem.e2e.spec.js
```

### Probar integraciones via API:
```bash
# Trigger HSE
curl -X POST http://localhost:9998/api/v1/training-ecosystem/trigger/hse \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 123, "violationCode": "NO_HELMET", "caseNumber": "HSE-001"}'

# Ver estadísticas
curl http://localhost:9998/api/v1/training-ecosystem/stats \
  -H "Authorization: Bearer $TOKEN"

# Ver circuitos
curl http://localhost:9998/api/v1/training-ecosystem/circuits \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Migración de BD ejecutada
- [x] Servicios de integración creados
- [x] Rutas API registradas en server.js
- [x] Sistema de ayuda contextual creado
- [x] Script de ayuda incluido en panel-empresa.html
- [x] Documentación creada
- [ ] Tests E2E ejecutados (servidor debe estar corriendo)
- [x] Hooks integrados en módulos existentes (HSE, Medical, ART, Procedures, Risk) ✅ COMPLETADO

---

## ✅ HOOKS INTEGRADOS EN MÓDULOS EXISTENTES

**FECHA: 2026-02-01 - COMPLETADO**

Todos los hooks de integración han sido implementados:

1. **HSECaseService.js** (método `assignTraining`): ✅
   - Hook llama a `HSETrainingIntegration.onCaseConfirmed()`
   - Se dispara al confirmar caso HSE con violaciones
   - Auto-asigna capacitaciones de seguridad según código de violación

2. **userMedicalExamsRoutes.js** (POST /medical-exams): ✅
   - Hook detecta deficiencias desde `exam_result` y `restrictions`
   - Mapea restricciones a tipos de deficiencia (auditiva, visual, ergonómica, etc.)
   - Llama a `MedicalTrainingIntegration.onExamCompleted()`

3. **artRoutes.js** (PUT /accidents/:id): ✅
   - Hook detecta cuando `status` cambia a `closed` o `alta_medica`
   - Llama a `ARTTrainingIntegration.onAccidentClosed()`
   - Asigna capacitación de reinserción (víctima) y prevención (área)

4. **ProceduresService.js** (método `publish`): ✅
   - Hook verifica `requires_training` flag del procedimiento
   - Llama a `ProceduresTrainingIntegration.onProcedurePublished()`
   - Auto-asigna a empleados afectados por el procedimiento

5. **riskIntelligenceRoutes.js** (POST /analyze/:id y /analyze-all): ✅
   - Hook detecta empleados con `risk_score >= 80` (crítico)
   - Determina categoría de riesgo dominante (fatigue, accident, legal_claim, etc.)
   - Llama a `RiskTrainingIntegration.onCriticalRiskScore()`
   - En `/analyze-all`, procesa batch de empleados críticos

---

## 📝 NOTAS FINALES

- El ecosistema está diseñado para ser **no-bloqueante**: si falla una integración, no afecta el módulo origen
- Todos los eventos se registran en `training_integration_log` para auditoría
- Las prioridades siguen la regla: CRITICAL (3 días), HIGH (7 días), NORMAL (30 días), LOW (60 días)
- La validación médica solo bloquea si `training.requires_medical_clearance = true`
- Los mapeos de violaciones/deficiencias se pueden personalizar por empresa
