# SISTEMA DE COORDINACIÓN MULTI-CLAUDE
## Fecha: 2025-11-27 (ACTUALIZADO)
## Estado: ACTIVO - AUDITORÍA COMPLETA

---

## INSTRUCCIONES PARA SESIONES DE CLAUDE

### Cómo funciona:
1. **ANTES de empezar**: Lee este archivo Y `WORKFLOW-PLUG-AND-PLAY-COMPLETO.md`
2. **Busca una tarea** con status `AVAILABLE`
3. **Actualiza status** a `IN_PROGRESS` antes de empezar
4. **Al terminar**: Actualiza status a `COMPLETED` y agrega fecha
5. **Si te bloqueas**: Cambia status a `BLOCKED` y explica en notas

### Reglas de Asignación:
- **Claude-Session-Backend**: Tareas de API, BD, Services
- **Claude-Session-Frontend**: Tareas de UI, panel-administrativo, panel-empresa
- **Claude-Session-Audit**: Tareas de auditoría y documentación

---

## ESTADO ACTUAL DE LA AUDITORÍA PLUG & PLAY

### Auditoría de Cadena de Dependencias: 100% COMPLETA

| ID | Módulo | Completitud | Status |
|----|--------|-------------|--------|
| PP-1 | Creación Empresa | 50% | ✅ AUDITADO |
| PP-2 | Sucursales | 80% | ✅ AUDITADO |
| PP-3 | Turnos | 85% | ✅ AUDITADO |
| PP-4 | Ficha Usuario | 50% | ✅ AUDITADO |
| PP-5 | Asistencia | 65% | ✅ AUDITADO |
| PP-6 | Dashboard Médico | 60% | ✅ AUDITADO |
| PP-7 | Fallback Justificación | 35% | ✅ AUDITADO |
| PP-8 | Plantillas Liquidación | 95% | ✅ AUDITADO |
| PP-9 | Plantilla por ROL | 0% | ✅ AUDITADO |
| PP-10 | Convenios Colectivos | 65% | ✅ AUDITADO |
| PP-11 | Motor Liquidación | 72% | ✅ AUDITADO |
| PP-12 | Pre-Validación | 5% | ✅ AUDITADO |
| PP-13 | Integración Ollama | 5% | ✅ AUDITADO |
| PP-14 | Documentación | 92% | ✅ AUDITADO |
| PP-15 | Test E2E | 30% | ✅ AUDITADO |

---

## TAREAS DE IMPLEMENTACIÓN DISPONIBLES

### PRIORIDAD CRÍTICA - Backend (Bloquean liquidación)

| ID | Tarea | Status | Asignado | Esfuerzo |
|----|-------|--------|----------|----------|
| PP-7-IMPL-1 | [2025-11-27] Agregar campos justificación a attendance | AVAILABLE | Backend | 1-2h |
| PP-7-IMPL-2 | [2025-11-27] Endpoint PUT /attendance/:id/justify | AVAILABLE | Backend | 2-3h |
| PP-7-IMPL-4 | [2025-11-27] Modificar getJustifiedAbsences() | AVAILABLE | Backend | 2-3h |
| PP-11-IMPL-1 | [2025-11-27] Validación turno obligatorio | AVAILABLE | Backend | 1-2h |
| PP-11-IMPL-2 | [2025-11-27] Validación categoría obligatoria | AVAILABLE | Backend | 1-2h |
| PP-12-IMPL-1 | [2025-11-27] Crear validatePayrollData() | AVAILABLE | Backend | 3-4h |
| PP-12-IMPL-2 | [2025-11-27] Endpoint POST /payroll/validate | AVAILABLE | Backend | 2-3h |

### PRIORIDAD CRÍTICA - Frontend

| ID | Tarea | Status | Asignado | Esfuerzo |
|----|-------|--------|----------|----------|
| PP-7-IMPL-3 | [2025-11-27] Modal justificación ausencias | AVAILABLE | Frontend | 3-4h |
| PP-6-IMPL-3 | [2025-11-27] Botones aprobar/rechazar médico | AVAILABLE | Frontend | 3-4h |
| PP-12-IMPL-3 | [2025-11-27] UI checklist validación | AVAILABLE | Frontend | 4-5h |
| PP-12-IMPL-4 | [2025-11-27] Bloquear liquidar si errores | AVAILABLE | Frontend | 1-2h |

### PRIORIDAD ALTA - Backend

| ID | Tarea | Status | Asignado | Esfuerzo |
|----|-------|--------|----------|----------|
| PP-1-IMPL-3 | [2025-11-27] Crear tabla countries | AVAILABLE | Backend | 30min |
| PP-1-IMPL-2 | [2025-11-27] Migración FKs en companies | AVAILABLE | Backend | 2-3h |
| PP-3-IMPL-1 | [2025-11-27] Guardar night_hours en attendance | AVAILABLE | Backend | 1h |
| PP-6-IMPL-1 | [2025-11-27] company_id en MedicalCertificate | AVAILABLE | Backend | 1h |
| PP-6-IMPL-2 | [2025-11-27] Hook sync attendance al aprobar | AVAILABLE | Backend | 3-4h |
| PP-9-IMPL-1 | [2025-11-27] Tabla role_payroll_defaults | AVAILABLE | Backend | 2-3h |
| PP-9-IMPL-2 | [2025-11-27] Búsqueda plantilla por rol | AVAILABLE | Backend | 2-3h |
| PP-11-IMPL-3 | [2025-11-27] Reemplazar eval() | AVAILABLE | Backend | 3-4h |
| PP-11-IMPL-4 | [2025-11-27] SAC/Aguinaldo | AVAILABLE | Backend | 4-5h |

### PRIORIDAD ALTA - Frontend

| ID | Tarea | Status | Asignado | Esfuerzo |
|----|-------|--------|----------|----------|
| PP-1-IMPL-1 | [2025-11-27] Sección Configuración Liquidación | AVAILABLE | Frontend | 2h |
| PP-1-IMPL-4 | [2025-11-27] Cargar países dinámicamente | AVAILABLE | Frontend | 1h |

---

## DETALLE DE TAREAS CRÍTICAS

### PP-7-IMPL-1: Agregar campos justificación a attendance
```
ARCHIVOS:
- migrations/20251127_add_attendance_justification_fields.sql
- src/models/Attendance-postgresql.js

CAMPOS A AGREGAR:
- is_justified BOOLEAN DEFAULT false
- absence_type ENUM('medical','vacation','suspension','personal','other')
- absence_reason TEXT
- justified_by UUID FK users
- justified_at TIMESTAMP

INSTRUCCIONES DETALLADAS:
1. Crear migración SQL con ALTER TABLE attendance ADD COLUMN...
2. Agregar campos al modelo Sequelize
3. Ejecutar migración en BD local
4. Verificar que campos existen con SELECT
```

### PP-7-IMPL-2: Endpoint PUT /attendance/:id/justify
```
ARCHIVO: src/routes/attendanceRoutes.js

ENDPOINT:
PUT /api/v1/attendance/:id/justify

BODY:
{
  "absence_type": "medical",
  "absence_reason": "Certificado médico presentado el día...",
  "is_justified": true
}

VALIDACIONES:
- Solo roles 'admin' y 'hr' pueden justificar
- absence_type debe ser valor válido del ENUM
- absence_reason requerido si is_justified = true

RESPUESTA:
{
  "success": true,
  "message": "Ausencia justificada correctamente",
  "data": { ...attendance_actualizado }
}
```

### PP-11-IMPL-1: Validación turno obligatorio
```
ARCHIVO: src/services/PayrollCalculatorService.js

UBICACIÓN: Método calculatePayroll() o similar

LÓGICA:
1. Antes de calcular, verificar que usuario tiene turno:
   - user_shift_assignments WHERE user_id = :userId
   - O users.shift_id (si existe FK directo)
2. Si NO tiene turno:
   - NO calcular
   - Retornar error específico:
     { valid: false, error: 'MISSING_SHIFT', userId: ... }

CÓDIGO EJEMPLO:
async validateUserForPayroll(userId, period) {
  const shiftAssignment = await UserShiftAssignment.findOne({
    where: { user_id: userId, /* período activo */ }
  });
  if (!shiftAssignment) {
    return { valid: false, error: 'MISSING_SHIFT' };
  }
  return { valid: true };
}
```

---

## LOG DE COORDINACIÓN

| Fecha | Sesión | Tarea | Acción |
|-------|--------|-------|--------|
| 2025-11-27 | Claude-Audit | PP-1 a PP-6 | COMPLETADAS - Auditoría |
| 2025-11-27 | Claude-Audit | PP-7 a PP-15 | COMPLETADAS - Auditoría |
| 2025-11-27 | Claude-Audit | WORKFLOW | CREADO - 35 tareas de implementación |

---

## PRÓXIMA SESIÓN DE CLAUDE DEBE:

### Si trabajas en BACKEND:
1. **PRIMERO**: Leer `WORKFLOW-PLUG-AND-PLAY-COMPLETO.md`
2. Tomar PP-1-IMPL-3 (tabla countries) - 30 min
3. Tomar PP-7-IMPL-1 (campos justificación) - 1-2h
4. Actualizar este archivo con tu progreso

### Si trabajas en FRONTEND:
1. **PRIMERO**: Leer `WORKFLOW-PLUG-AND-PLAY-COMPLETO.md`
2. Tomar PP-1-IMPL-1 (sección configuración) - 2h
3. Tomar PP-7-IMPL-3 (modal justificación) - 3-4h
4. Actualizar este archivo con tu progreso

### Si trabajas en AUDIT/DOCS:
1. Verificar tareas completadas realmente funcionan
2. Ejecutar tests E2E si hay
3. Documentar issues encontrados

---

## ARCHIVOS DE REFERENCIA

- `.coordination/WORKFLOW-PLUG-AND-PLAY-COMPLETO.md` - **WORKFLOW DETALLADO**
- `engineering-metadata.js` - Metadata del proyecto
- `docs/VISION-SISTEMA-INTELIGENTE-PLUG-AND-PLAY.md` - Visión del sistema
- `docs/ANALISIS-LIQUIDACION-INTEGRAL.md` - Análisis detallado

---

**ESTE ARCHIVO ES LA FUENTE ÚNICA DE VERDAD PARA COORDINACIÓN**
**SIEMPRE LEE WORKFLOW-PLUG-AND-PLAY-COMPLETO.md ANTES DE EMPEZAR**
