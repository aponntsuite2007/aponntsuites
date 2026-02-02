# 📚 ANÁLISIS INTEGRAL: Ecosistema de Capacitaciones

## Fecha: 2026-02-01
## Versión: 1.0.0

---

## 📋 RESUMEN EJECUTIVO

El módulo de **Gestión de Capacitaciones** es un **micro-ecosistema** que debería integrar:
- 🛡️ **HSE** (Seguridad e Higiene Laboral)
- 📋 **Mis Procedimientos**
- 📊 **Risk Intelligence Dashboard**
- 🏥 **Gestión de ART**
- ⚕️ **Gestión Médica**

Las capacitaciones pueden **originarse desde múltiples vías** (afluentes), y estos módulos son los **generadores de requerimientos de capacitación**.

---

## 🔍 ESTADO ACTUAL DE INTEGRACIONES

### ✅ INTEGRACIÓN CON HSE (PARCIAL - 60%)

| Componente | Estado | Ubicación | Notas |
|------------|--------|-----------|-------|
| Casos HSE → Capacitación | ⚠️ TODO | `HSECaseService.js:304` | Marcado como TODO |
| Violaciones → Training | ⚠️ TODO | `PPEDetectionService.js:378` | Solo marca flag, no crea inscripción |
| Catálogo Violaciones | ✅ OK | `HSEViolationCatalogService.js` | Tiene `default_training_template_id` |
| Notificación Capacitación Asignada | ✅ OK | `training-notifications.js` | NCE integrado |

**Código encontrado en HSECaseService.js:**
```javascript
// Línea 304: TODO - Integrar con training-management
async assignTraining(hseCase, violations, userId) {
  // Solo guarda IDs, NO crea inscripción real
  await pool.query(
    'UPDATE hse_cases SET training_assigned = true, training_ids = $1 WHERE id = $2',
    [trainingIds, hseCase.id]
  );
}
```

### ❌ INTEGRACIÓN CON MEDICAL (0%)

| Componente | Estado | Notas |
|------------|--------|-------|
| Examen Médico → Capacitación | ❌ NO EXISTE | Si examen detecta deficiencia, debería asignar capacitación |
| Aptitud Física → Restricción | ❌ NO EXISTE | Empleado no apto debería bloquearse de ciertas capacitaciones |
| Certificado Médico → Habilitación | ❌ NO EXISTE | Certificado vencido debería bloquear capacitaciones de riesgo |

**Lo que debería existir:**
- Examen psicotécnico vencido → Bloquear capacitación de conducción
- Examen audiometría deficiente → Asignar capacitación "Uso de protectores auditivos"
- Certificado de apto físico vencido → Notificar antes de capacitaciones presenciales

### ❌ INTEGRACIÓN CON RISK INTELLIGENCE (0%)

| Componente | Estado | Notas |
|------------|--------|-------|
| Score de Riesgo → Prioridad | ❌ NO EXISTE | Alto riesgo debería priorizar capacitaciones |
| Alertas → Auto-asignación | ❌ NO EXISTE | Alerta crítica debería asignar capacitación |
| Dashboard → Pendientes | ❌ NO EXISTE | No muestra capacitaciones pendientes por riesgo |

### ❌ INTEGRACIÓN CON ART (0%)

| Componente | Estado | Notas |
|------------|--------|-------|
| Accidente → Capacitación Preventiva | ❌ NO EXISTE | Post-accidente debería asignar capacitación obligatoria |
| Denuncia ART → Training Record | ❌ NO EXISTE | Historial de capacitación debería adjuntarse a denuncia |
| Investigación → Gap Analysis | ❌ NO EXISTE | Análisis de si la capacitación era adecuada |

### ❌ INTEGRACIÓN CON PROCEDURES (0%)

| Componente | Estado | Notas |
|------------|--------|-------|
| Procedimiento Nuevo → Capacitación | ❌ NO EXISTE | Nuevo SOW debería generar capacitación obligatoria |
| Actualización → Re-capacitación | ❌ NO EXISTE | Cambio de procedimiento debería re-capacitar afectados |
| Lectura Confirmada → Evaluación | ❌ NO EXISTE | Confirmar lectura no genera evaluación |

---

## 🎯 MATRIZ DE AFLUENTES → CAPACITACIONES

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GENERADORES DE CAPACITACIÓN                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │    HSE      │    │   MEDICAL   │    │    ART      │                 │
│  │  ⚠️ 60%     │    │   ❌ 0%     │    │   ❌ 0%     │                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                  │                         │
│         ▼                  ▼                  ▼                         │
│  • Violación EPP     • Examen no apto   • Post-accidente               │
│  • Detección cámara  • Restricción      • Reinserción                  │
│  • Caso confirmado   • Psicotécnico     • Investigación                │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            ▼                                            │
│              ┌─────────────────────────────┐                           │
│              │    CAPACITACIONES HUB       │                           │
│              │    📚 training-management   │                           │
│              │                             │                           │
│              │  • Auto-asignación          │                           │
│              │  • Priorización por origen  │                           │
│              │  • Tracking de fuente       │                           │
│              │  • Compliance reporting     │                           │
│              └─────────────────────────────┘                           │
│                            ▲                                            │
│         ┌──────────────────┼──────────────────┐                         │
│         │                  │                  │                         │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐                 │
│  │ PROCEDURES  │    │    RISK     │    │  ONBOARDING │                 │
│  │   ❌ 0%     │    │ INTELLIGENCE│    │   ❌ 0%     │                 │
│  │             │    │   ❌ 0%     │    │             │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│  • Nuevo SOP        • Score crítico    • Ingreso nuevo                 │
│  • Actualización    • Alerta activa    • Cambio de puesto              │
│  • Auditoría        • Trend negativo   • Promoción                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 LO QUE EXISTE (INVENTARIO ACTUAL)

### 1. MÓDULO TRAINING-MANAGEMENT

**Frontend**: `public/js/modules/training-management.js` (325KB)

| Tab | Funcionalidad | Estado |
|-----|---------------|--------|
| Dashboard | KPIs, estadísticas | ✅ Completo |
| Capacitaciones | CRUD completo | ✅ Completo |
| Evaluaciones (Capacitaciones) | Vinculadas a training | ✅ Completo |
| Evaluaciones Independientes | Sin training vinculado | ✅ Completo |
| Seguimiento Empleados | Progreso por usuario | ✅ Completo |
| Reportes | Estadísticas | ✅ Completo |
| Calendario | Vista temporal | ✅ Completo |

**Backend**: `src/routes/trainingRoutes.js` (926 líneas)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/trainings` | GET | Listar capacitaciones |
| `/api/v1/trainings` | POST | Crear capacitación |
| `/api/v1/trainings/:id` | PUT | Actualizar |
| `/api/v1/trainings/:id` | DELETE | Eliminar |
| `/api/v1/trainings/:id/assign` | POST | Asignar usuarios |
| `/api/v1/trainings/:id/assignments` | GET | Ver asignaciones |
| `/api/v1/trainings/my-assignments` | GET | Mis capacitaciones |
| `/api/v1/trainings/stats/dashboard` | GET | Estadísticas |

**Integraciones existentes:**
- ✅ NCE (NotificationCentralExchange) - Notificaciones
- ✅ DMS (TrainingDMSAdapter) - Documentos
- ✅ Users - Asignaciones

### 2. MÓDULO HSE-MANAGEMENT

**Frontend**: `public/js/modules/hse-management.js` (1,150+ líneas)

| Tab | Funcionalidad | Integración Training |
|-----|---------------|----------------------|
| Dashboard | KPIs EPP | ❌ No muestra trainings |
| Catálogo EPP | CRUD elementos | ❌ N/A |
| Matriz Rol-EPP | Asignación por puesto | ⚠️ Podría vincular training |
| Entregas | Registro y tracking | ❌ N/A |
| Inspecciones | Checklist y acciones | ⚠️ Debería asignar training |
| Configuración | Estándares y alertas | ❌ N/A |

**Servicios HSE con mención a Training:**
- `HSECaseService.js` - Tiene `assignTraining()` pero marcado TODO
- `PPEDetectionService.js` - Tiene `assignTraining()` pero marcado TODO
- `HSEViolationCatalogService.js` - Tiene `default_training_template_id`

### 3. MÓDULO MEDICAL

**Rutas**: `src/routes/userMedicalExamsRoutes.js`
- CRUD de exámenes médicos
- Sin ninguna referencia a training

### 4. MÓDULO RISK INTELLIGENCE

**Rutas**: `src/routes/riskIntelligenceRoutes.js`
- Dashboard de riesgos
- Sin ninguna referencia a training

### 5. MÓDULO ART

**Frontend**: `public/js/modules/art-management.js`
- 6 tabs de gestión ART
- Sin ninguna referencia a training

### 6. MÓDULO PROCEDURES

**Rutas**: `src/routes/proceduresRoutes.js`
- CRUD de procedimientos
- Sin ninguna referencia a training

---

## 🔧 RECOMENDACIONES DE INTEGRACIÓN

### PRIORIDAD 1: Completar HSE → Training (Ya tiene base)

```javascript
// En HSECaseService.js - Línea 293
async assignTraining(hseCase, violations, userId) {
  // ACTUAL: Solo guarda flag
  // PROPUESTO: Crear inscripción real

  const Training = require('../models/Training');
  const TrainingAssignment = require('../models/TrainingAssignment');

  for (const trainingId of trainingIds) {
    await TrainingAssignment.create({
      training_id: trainingId,
      user_id: hseCase.reported_user_id,
      company_id: hseCase.company_id,
      assigned_by: userId,
      source_module: 'hse',
      source_entity_type: 'hse_case',
      source_entity_id: hseCase.id,
      priority: 'high',
      mandatory: true,
      notes: `Asignada por caso HSE #${hseCase.case_number}`
    });
  }

  // Notificar vía NCE
  await TrainingNotifications.notifyTrainingAssigned({...});
}
```

### PRIORIDAD 2: Medical → Training

```javascript
// Crear: src/services/integrations/medical-training-integration.js

class MedicalTrainingIntegration {

  // Cuando examen detecta deficiencia
  async onExamDeficiency(exam, deficiencyType) {
    const trainingMapping = {
      'audiometry_deficient': 'uso-protectores-auditivos',
      'visual_impaired': 'seguridad-visual-trabajo',
      'respiratory_issues': 'uso-correcto-epp-respiratorio',
      'ergonomic_problems': 'ergonomia-puesto-trabajo'
    };

    const trainingCode = trainingMapping[deficiencyType];
    if (trainingCode) {
      await this.assignRemedialTraining(exam.user_id, trainingCode, {
        source_module: 'medical',
        source_entity_type: 'medical_exam',
        source_entity_id: exam.id,
        mandatory: true,
        deadline: addDays(new Date(), 30)
      });
    }
  }

  // Bloquear capacitaciones si certificado vencido
  async validateTrainingEligibility(userId, trainingId) {
    const training = await Training.findByPk(trainingId);

    if (training.requires_medical_clearance) {
      const latestCert = await this.getLatestMedicalCertificate(userId);
      if (!latestCert || latestCert.expires_at < new Date()) {
        throw new Error('Certificado médico vencido - no puede inscribirse');
      }
    }

    return true;
  }
}
```

### PRIORIDAD 3: ART → Training

```javascript
// Crear: src/services/integrations/art-training-integration.js

class ARTTrainingIntegration {

  // Post-accidente: Capacitación obligatoria
  async onAccidentClosed(accident) {
    // Capacitación para el accidentado
    await this.assignTraining(accident.employee_id, 'reinsercion-laboral', {
      source_module: 'art',
      source_entity_type: 'art_accident',
      source_entity_id: accident.id,
      mandatory: true
    });

    // Capacitación preventiva para el área
    const areaEmployees = await this.getAreaEmployees(accident.area_id);
    for (const emp of areaEmployees) {
      await this.assignTraining(emp.id, accident.preventive_training_id, {
        source_module: 'art',
        source_entity_type: 'art_accident_prevention',
        source_entity_id: accident.id,
        mandatory: true,
        notes: `Prevención post-accidente #${accident.denuncia_number}`
      });
    }
  }

  // Adjuntar historial de capacitación a denuncia
  async attachTrainingHistory(denunciaId, employeeId) {
    const trainings = await TrainingAssignment.findAll({
      where: { user_id: employeeId, status: 'completed' }
    });

    await ARTDenuncia.update(
      { training_history: JSON.stringify(trainings) },
      { where: { id: denunciaId } }
    );
  }
}
```

### PRIORIDAD 4: Procedures → Training

```javascript
// Crear: src/services/integrations/procedures-training-integration.js

class ProceduresTrainingIntegration {

  // Nuevo procedimiento requiere capacitación
  async onProcedurePublished(procedure) {
    if (procedure.requires_training) {
      // Obtener afectados por el procedimiento
      const affectedUsers = await this.getAffectedUsers(procedure);

      for (const user of affectedUsers) {
        await this.assignTraining(user.id, procedure.linked_training_id, {
          source_module: 'procedures',
          source_entity_type: 'procedure',
          source_entity_id: procedure.id,
          mandatory: true,
          deadline: procedure.mandatory_completion_date
        });
      }
    }
  }

  // Actualización de procedimiento = re-capacitación
  async onProcedureUpdated(procedure, changes) {
    if (changes.includes('critical_steps')) {
      // Re-capacitar a quienes ya completaron
      const previouslyTrained = await this.getPreviouslyTrainedUsers(procedure);

      for (const user of previouslyTrained) {
        await this.assignTraining(user.id, procedure.linked_training_id, {
          source_module: 'procedures',
          source_entity_type: 'procedure_update',
          source_entity_id: procedure.id,
          notes: `Re-capacitación por actualización v${procedure.version}`
        });
      }
    }
  }
}
```

### PRIORIDAD 5: Risk Intelligence → Training

```javascript
// Crear: src/services/integrations/risk-training-integration.js

class RiskTrainingIntegration {

  // Score crítico dispara capacitación
  async onCriticalRiskScore(employee, riskData) {
    const riskCategory = this.categorizeRisk(riskData);

    const trainingMapping = {
      'attendance_risk': 'gestion-tiempo-asistencia',
      'safety_risk': 'seguridad-laboral-basica',
      'performance_risk': 'mejora-desempeno',
      'compliance_risk': 'cumplimiento-normativo'
    };

    await this.assignTraining(employee.id, trainingMapping[riskCategory], {
      source_module: 'risk_intelligence',
      source_entity_type: 'risk_alert',
      source_entity_id: riskData.alert_id,
      priority: 'critical',
      mandatory: true
    });
  }
}
```

---

## 📐 CAMBIOS EN BASE DE DATOS REQUERIDOS

### Tabla: training_assignments (MODIFICAR)

```sql
-- Agregar columnas para tracking de origen
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS source_module VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_entity_id INTEGER,
ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assignment_reason TEXT;

-- Índice para queries por origen
CREATE INDEX IF NOT EXISTS idx_training_assignments_source
ON training_assignments(source_module, source_entity_type, source_entity_id);

COMMENT ON COLUMN training_assignments.source_module IS
  'Módulo que generó la asignación: hse, medical, art, procedures, risk_intelligence';
```

### Tabla: trainings (MODIFICAR)

```sql
-- Agregar columnas para requisitos médicos y vinculación
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS requires_medical_clearance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS medical_exam_types TEXT[], -- Tipos de examen requeridos
ADD COLUMN IF NOT EXISTS linked_procedure_ids INTEGER[],
ADD COLUMN IF NOT EXISTS hse_violation_codes TEXT[],
ADD COLUMN IF NOT EXISTS risk_categories TEXT[];

COMMENT ON COLUMN trainings.requires_medical_clearance IS
  'Si true, valida certificado médico vigente antes de inscribir';
```

---

## 📈 MÉTRICAS DE ÉXITO POST-INTEGRACIÓN

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Capacitaciones auto-asignadas desde HSE | 0 | 100% de casos |
| Tiempo promedio entre violación y capacitación | N/A | < 24 horas |
| Cobertura de training post-accidente ART | 0% | 100% |
| Procedimientos con capacitación vinculada | 0% | 80% |
| Validación médica en trainings de riesgo | 0% | 100% |

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### Fase 1: HSE → Training (2-3 días)
- [ ] Completar `HSECaseService.assignTraining()`
- [ ] Completar `PPEDetectionService.assignTraining()`
- [ ] Agregar columnas source_* a training_assignments
- [ ] Test E2E del flujo completo

### Fase 2: ART → Training (2-3 días)
- [ ] Crear `art-training-integration.js`
- [ ] Hook en cierre de accidente
- [ ] Adjuntar historial a denuncia
- [ ] Test E2E del flujo

### Fase 3: Medical → Training (2-3 días)
- [ ] Crear `medical-training-integration.js`
- [ ] Mapeo deficiencia → training
- [ ] Validación de elegibilidad
- [ ] Test E2E del flujo

### Fase 4: Procedures → Training (2 días)
- [ ] Crear `procedures-training-integration.js`
- [ ] Vinculación procedimiento-training
- [ ] Re-capacitación automática
- [ ] Test E2E del flujo

### Fase 5: Risk Intelligence → Training (2 días)
- [ ] Crear `risk-training-integration.js`
- [ ] Mapeo riesgo → training
- [ ] Priorización automática
- [ ] Test E2E del flujo

---

## 📝 CONCLUSIÓN

El ecosistema de Capacitaciones tiene una **base sólida** en el módulo principal, pero las **integraciones con módulos afluentes están incompletas o inexistentes**.

**Estado actual:**
- HSE: 60% (tiene código base pero TODO)
- Medical: 0%
- ART: 0%
- Procedures: 0%
- Risk Intelligence: 0%

**Esfuerzo estimado total:** 10-14 días de desarrollo

**Impacto esperado:**
- Reducción 70% en asignaciones manuales
- Compliance automático post-incidente
- Trazabilidad completa de origen de capacitaciones
- Dashboard unificado de requerimientos por fuente
